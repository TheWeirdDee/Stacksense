'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet';
import axios from 'axios';
import Link from 'next/link';
import { Key, Copy, Check, ShieldCheck, Loader2, X } from 'lucide-react';
import { getApiUrl } from '@/lib/config';
import { TREASURY_ADDRESS } from '@/lib/stx';

const API = getApiUrl();
const SUBSCRIPTION_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_ADDRESS || '';
const SUBSCRIPTION_CONTRACT_NAME = process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_NAME || 'stacksense-subscriptions';

interface Tier {
  tier: string;
  monthlyRequests: number;
  webhookEnabled: boolean;
  prioritySupport: boolean;
  customRules: boolean;
  monthlyCost: number;
}

interface SubscriptionStatus {
  tier: string;
  tierInfo: Tier;
  isActive: boolean;
  expiresAt?: string;
  requestsUsed?: number;
  requestsLimit?: number;
}

type PaymentStep = 'idle' | 'wallet' | 'generating' | 'done';

type SubscriptionTier = 'free' | 'pro' | 'enterprise';

function generateApiKeyHex() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string) {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((pair) => parseInt(pair, 16)));
}

export default function ApiPlansPage() {
  const { address, connected, connect } = useWallet();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [activePlan, setActivePlan] = useState<SubscriptionTier | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState('');
  const [upgradedTier, setUpgradedTier] = useState('');
  const [txId, setTxId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (address) {
      fetchSubscription();
    }
  }, [address]);

  const fetchSubscription = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/v1/subscriptions/subscription/${address}`);
      setSubscription(response.data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!address) {
      connect();
      return;
    }

    setError('');
    setActivePlan(tier);

    if (tier === 'free') {
      try {
        setLoading(true);
        setPaymentStep('generating');
        const apiKey = generateApiKeyHex();
        const response = await axios.post(`${API}/api/v1/subscriptions/api-keys/generate`, {
          tier: 'free',
          subscriberAddress: address,
          apiKey,
        });

        if (address) {
          localStorage.setItem(`stacksense-api-key:${address}`, response.data.apiKey);
        }

        setSubscription({
          ...(subscription ?? {}),
          tier: 'free',
          tierInfo: response.data.tierInfo,
          isActive: true,
          expiresAt: response.data.expiresAt,
          requestsLimit: response.data.requestsLimit,
        });

        setGeneratedApiKey(response.data.apiKey);
        setUpgradedTier('FREE');
        setTxId('');
        setShowKeyModal(true);
        setPaymentStep('done');
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to generate API key');
      } finally {
        setLoading(false);
        setActivePlan(null);
      }
      return;
    }

    const costMicroSTX = tier === 'pro' ? '1000000' : '10000000';
    const costDisplay = tier === 'pro' ? '1 STX' : '10 STX';
    const generatedKey = generateApiKeyHex();

    setLoading(true);
    setPaymentStep('wallet');

    try {
      const { openContractCall, AppConfig, UserSession } = await import('@stacks/connect');
      const { StacksMainnet } = await import('@stacks/network');
      const { bufferCV, stringUtf8CV, createSTXPostCondition, FungibleConditionCode } = await import('@stacks/transactions');
      type ClarityValue = ReturnType<typeof bufferCV> | ReturnType<typeof stringUtf8CV>;

      const appConfig = new AppConfig(['store_write', 'publish_data']);
      const userSession = new UserSession({ appConfig });
      const addressString = address;
      const apiKeyBytes = hexToBytes(generatedKey);
      const functionArgs: ClarityValue[] = [bufferCV(apiKeyBytes)];

      if (tier === 'enterprise') {
        functionArgs.push(stringUtf8CV(''));
      }

      const functionName = tier === 'pro' ? 'subscribe-pro' : 'subscribe-enterprise';
      const postCondition = createSTXPostCondition(addressString, FungibleConditionCode.Equal, costMicroSTX);

      if (!SUBSCRIPTION_CONTRACT_ADDRESS || !SUBSCRIPTION_CONTRACT_NAME) {
        const { openSTXTransfer } = await import('@stacks/connect');
        openSTXTransfer({
          network: new StacksMainnet(),
          recipient: TREASURY_ADDRESS,
          amount: costMicroSTX,
          memo: `stacksense-${tier}-sub`.slice(0, 34),
          appDetails: { name: 'StackSense', icon: 'https://stacksense-ruddy.vercel.app/icon.png' },
          userSession,
          onFinish: async (data: any) => {
            const confirmedTxId = data.txId;
            setTxId(confirmedTxId);
            setPaymentStep('generating');

            try {
              const response = await axios.post(`${API}/api/v1/subscriptions/api-keys/generate`, {
                tier,
                subscriberAddress: address,
                txId: confirmedTxId,
                apiKey: generatedKey,
              });

              if (address) {
                localStorage.setItem(`stacksense-api-key:${address}`, response.data.apiKey);
              }

              setSubscription({
                ...(subscription ?? {}),
                tier,
                tierInfo: response.data.tierInfo,
                isActive: true,
                expiresAt: response.data.expiresAt,
                requestsLimit: response.data.requestsLimit,
              });

              setGeneratedApiKey(response.data.apiKey);
              setUpgradedTier(tier.toUpperCase());
              setShowKeyModal(true);
              setPaymentStep('done');
            } catch (err: any) {
              setError(
                `Payment of ${costDisplay} was sent (tx: ${confirmedTxId.slice(0, 12)}…), but API key generation failed. ` +
                `Please contact support with your transaction ID: ${confirmedTxId}`
              );
              setPaymentStep('idle');
            } finally {
              setLoading(false);
              setActivePlan(null);
            }
          },
          onCancel: () => {
            setLoading(false);
            setPaymentStep('idle');
            setActivePlan(null);
            setError('Transaction was cancelled. No STX was sent.');
          },
        });
        return;
      }

      openContractCall({
        network: new StacksMainnet(),
        contractAddress: SUBSCRIPTION_CONTRACT_ADDRESS,
        contractName: SUBSCRIPTION_CONTRACT_NAME,
        functionName,
        functionArgs,
        postConditions: [postCondition],
        appDetails: { name: 'StackSense', icon: 'https://stacksense-ruddy.vercel.app/icon.png' },
        userSession,
        onFinish: async (data: any) => {
          const confirmedTxId = data.txId;
          setTxId(confirmedTxId);
          setPaymentStep('generating');

          try {
            const response = await axios.post(`${API}/api/v1/subscriptions/api-keys/generate`, {
              tier,
              subscriberAddress: address,
              txId: confirmedTxId,
              apiKey: generatedKey,
            });

            if (address) {
              localStorage.setItem(`stacksense-api-key:${address}`, response.data.apiKey);
            }

            setSubscription({
              ...(subscription ?? {}),
              tier,
              tierInfo: response.data.tierInfo,
              isActive: true,
              expiresAt: response.data.expiresAt,
              requestsLimit: response.data.requestsLimit,
            });

            setGeneratedApiKey(response.data.apiKey);
            setUpgradedTier(tier.toUpperCase());
            setShowKeyModal(true);
            setPaymentStep('done');
          } catch (err: any) {
            setError(
              `Payment of ${costDisplay} was sent (tx: ${confirmedTxId.slice(0, 12)}…), but API key generation failed. ` +
              `Please contact support with your transaction ID: ${confirmedTxId}`
            );
            setPaymentStep('idle');
          } finally {
            setLoading(false);
            setActivePlan(null);
          }
        },
        onCancel: () => {
          setLoading(false);
          setPaymentStep('idle');
          setActivePlan(null);
          setError('Transaction was cancelled. No STX was sent.');
        },
      });
    } catch (e: any) {
      console.error('Wallet interaction failed:', e);
      setLoading(false);
      setPaymentStep('idle');
      setActivePlan(null);
      setError('Failed to open wallet. Make sure the Leather or Xverse wallet extension is installed and connected.');
    }
  };

  const tiers: Record<SubscriptionTier, Tier> = {
    free: { tier: 'free', monthlyRequests: 1000, webhookEnabled: false, prioritySupport: false, customRules: false, monthlyCost: 0 },
    pro: { tier: 'pro', monthlyRequests: 100000, webhookEnabled: true, prioritySupport: false, customRules: false, monthlyCost: 1 },
    enterprise: { tier: 'enterprise', monthlyRequests: 1000000, webhookEnabled: true, prioritySupport: true, customRules: true, monthlyCost: 10 },
  };

  const getButtonLabel = (tierName: SubscriptionTier) => {
    const isActive = activePlan === tierName;
    if (loading && isActive && paymentStep === 'wallet') return '⏳ Confirm in Wallet…';
    if (loading && isActive && paymentStep === 'generating') return '⏳ Generating Key…';
    if (tierName === 'free') return 'Continue with Free';
    return `Subscribe — ${tiers[tierName].monthlyCost} STX/mo`;
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: '20px 0 40px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/api" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none', marginBottom: 24 }}>← Back to API Hub</Link>

        <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>API Subscriptions</h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40 }}>
          Choose a tier that fits your needs. Paid plans now execute a subscription contract call instead of a plain STX transfer.
        </p>

        {paymentStep !== 'idle' && paymentStep !== 'done' && (
          <div style={{ background: '#0C1A2E', border: '1px solid #3B82F6', borderRadius: 8, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Loader2 size={20} style={{ color: '#3B82F6', animation: 'spin 1s linear infinite' }} />
            <div>
              <p style={{ color: '#93C5FD', fontWeight: 600, fontSize: 14 }}>
                {paymentStep === 'wallet' && 'Waiting for wallet confirmation…'}
                {paymentStep === 'generating' && 'Payment received! Generating your API key…'}
              </p>
              <p style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
                {paymentStep === 'wallet' && 'Approve the subscription call in your wallet popup.'}
                {paymentStep === 'generating' && 'This will only take a moment.'}
              </p>
            </div>
          </div>
        )}

        {subscription && subscription.isActive && (
          <div style={{ background: '#0F2E1A', border: '1px solid #22C55E', borderRadius: 8, padding: 16, marginBottom: 40 }}>
            <h3 style={{ color: '#22C55E', marginBottom: 8 }}>Current Subscription</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {subscription.tier.toUpperCase()} • {subscription.requestsUsed}/{subscription.requestsLimit} requests used
            </p>
            {subscription.expiresAt && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 8 }}>
                Expires: {new Date(subscription.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 40 }}>
          {(['free', 'pro', 'enterprise'] as SubscriptionTier[]).map((tierName) => {
            const tier = tiers[tierName];
            const isCurrent = subscription?.tier === tierName;

            return (
              <div key={tierName} style={{ background: 'var(--bg-surface)', border: isCurrent ? '2px solid #22C55E' : tierName === 'pro' ? '1px solid #3B82F6' : '1px solid var(--bg-border)', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                {tierName === 'pro' && !isCurrent && (
                  <div style={{ position: 'absolute', top: 12, right: -28, background: '#3B82F6', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 32px', transform: 'rotate(45deg)', letterSpacing: '0.05em' }}>
                    POPULAR
                  </div>
                )}

                <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>{tier.tier}</h3>
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{tier.monthlyCost > 0 ? `${tier.monthlyCost} STX` : 'Free'}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/month</p>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24, flex: 1 }}>
                  <li style={{ marginBottom: 12, fontSize: 14 }}>✓ {tier.monthlyRequests.toLocaleString()} requests/month</li>
                  {tier.webhookEnabled && <li style={{ marginBottom: 12, fontSize: 14 }}>✓ Webhook support</li>}
                  {tier.prioritySupport && <li style={{ marginBottom: 12, fontSize: 14 }}>✓ Priority support</li>}
                  {tier.customRules && <li style={{ marginBottom: 12, fontSize: 14 }}>✓ Custom rules</li>}
                </ul>

                {!connected ? (
                  <button
                    onClick={connect}
                    style={{ background: 'var(--bg-elevated, #1e1e2e)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', padding: '12px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                  >
                    Connect wallet to subscribe
                  </button>
                ) : isCurrent ? (
                  <button disabled style={{ background: 'var(--bg-border)', color: 'var(--text-secondary)', border: 'none', padding: '12px 16px', borderRadius: 6, cursor: 'not-allowed', fontWeight: 600 }}>
                    Current Plan
                  </button>
                ) : (
                  <button onClick={() => handleUpgrade(tierName)} disabled={loading} style={{ background: tierName === 'pro' ? '#3B82F6' : '#22C55E', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading && activePlan !== tierName ? 0.7 : 1, transition: 'opacity 0.2s, transform 0.1s' }}>
                    {getButtonLabel(tierName)}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ background: '#2E0F0F', border: '1px solid #EF4444', borderRadius: 8, padding: 16, color: '#EF4444', marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 60 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: 'var(--text-primary)' }}>Features Comparison</h2>
          <div style={{ overflowX: 'auto', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--bg-border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Feature</th>
                  <th style={{ padding: 16, textAlign: 'center', fontWeight: 600 }}>Free</th>
                  <th style={{ padding: 16, textAlign: 'center', fontWeight: 600 }}>Pro</th>
                  <th style={{ padding: 16, textAlign: 'center', fontWeight: 600 }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <td style={{ padding: 16 }}>Requests/month</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>1,000</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>100,000</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>1,000,000</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <td style={{ padding: 16 }}>Webhooks</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>✗</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>✓</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>✓</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <td style={{ padding: 16 }}>Custom Filters</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>✗</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>✓</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>✓</td>
                </tr>
                <tr>
                  <td style={{ padding: 16 }}>Priority Support</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>✗</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>✗</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showKeyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 32, maxWidth: 520, width: '100%', position: 'relative' }}>
            <button onClick={() => { setShowKeyModal(false); setPaymentStep('idle'); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0F2E1A', border: '2px solid #22C55E', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px' }}>
                <ShieldCheck size={28} style={{ color: '#22C55E' }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Upgraded to {upgradedTier}!</h2>
              {txId && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Payment tx:{' '}
                  <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none' }}>
                    {txId.slice(0, 12)}…{txId.slice(-6)}
                  </a>
                </p>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
                <Key size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Your API Key
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 6, padding: '10px 12px' }}>
                <code style={{ flex: 1, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#22C55E', wordBreak: 'break-all' }}>{generatedApiKey}</code>
                <button onClick={handleCopyKey} style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 4, padding: '6px 8px', cursor: 'pointer', color: copied ? '#22C55E' : 'var(--text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ background: '#1A1520', border: '1px solid #F59E0B44', borderRadius: 6, padding: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600, marginBottom: 4 }}>⚠️ Store this key securely</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                This API key will not be shown again. Save it somewhere safe. If you lose it, you'll need to generate a new subscription.
              </p>
            </div>

            <button onClick={() => { setShowKeyModal(false); setPaymentStep('idle'); }} style={{ width: '100%', background: '#22C55E', color: '#000', border: 'none', padding: '12px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Done
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
