'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useWallet } from '@/lib/wallet';
import axios from 'axios';
import { Key, Copy, Check, ShieldCheck, Loader2, X, AlertCircle, AlertTriangle, Terminal, HelpCircle } from 'lucide-react';
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

interface ApiKeyInfo {
  maskedKey: string;
  tier: string;
  createdAt: string;
  expiresAt: string;
  requestsUsed: number;
  requestsLimit: number;
}

interface UsageStats {
  tier: string;
  requestsUsed: number;
  requestsLimit: number;
  percentUsed: number;
  expiresAt: string;
  daysRemaining: number;
  isActive: boolean;
  webhookEnabled: boolean;
  customFiltersEnabled: boolean;
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

export default function ApiHubPage() {
  const { address, connected, connect } = useWallet();
  
  // Dashboard Metrics & State
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [newKeyAfterRegen, setNewKeyAfterRegen] = useState('');

  // Payment / Upgrade Flow State
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [activePlan, setActivePlan] = useState<SubscriptionTier | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState('');
  const [upgradedTier, setUpgradedTier] = useState('');
  const [txId, setTxId] = useState('');

  const storedApiKey = typeof window !== 'undefined' && address
    ? localStorage.getItem(`stacksense-api-key:${address}`)
    : null;

  // Initial data loading
  useEffect(() => {
    if (address) {
      fetchSubscription();
      if (storedApiKey) {
        fetchApiKeyInfo();
        fetchUsageStats();
      }
    } else {
      // Clear data if logged out
      setApiKeyInfo(null);
      setUsageStats(null);
      setSubscription(null);
    }
  }, [address]);

  const fetchSubscription = async () => {
    if (!address) return;
    try {
      const response = await axios.get(`${API}/api/v1/subscriptions/subscription/${address}`);
      setSubscription(response.data);
    } catch (err) {
      console.error('Error fetching subscription status:', err);
    }
  };

  const fetchApiKeyInfo = async () => {
    if (!address || !storedApiKey) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/v1/subscriptions/api-key/${address}`, {
        headers: { 'x-api-key': storedApiKey },
      });
      setApiKeyInfo(response.data);
    } catch (err: any) {
      console.error('Error fetching API key info:', err);
      // If unauthorized, credentials stored might be invalid/rotated
      if (err.response?.status === 401) {
        setError('Saved API key is invalid or has expired. Please regenerate your key.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    if (!address || !storedApiKey) return;
    try {
      const response = await axios.get(`${API}/api/v1/subscriptions/usage/${address}`, {
        headers: { 'x-api-key': storedApiKey },
      });
      setUsageStats(response.data);
    } catch (err) {
      console.error('Error fetching usage stats:', err);
    }
  };

  const handleCopyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!address || !storedApiKey) return;
    setRegenerating(true);
    setError('');
    try {
      const response = await axios.post(
        `${API}/api/v1/subscriptions/api-key/regenerate`,
        { subscriberAddress: address },
        { headers: { 'x-api-key': storedApiKey } }
      );
      localStorage.setItem(`stacksense-api-key:${address}`, response.data.newApiKey);
      setNewKeyAfterRegen(response.data.newApiKey);
      setShowRegenerateConfirm(false);
      
      // Refresh details
      await fetchSubscription();
      await fetchApiKeyInfo();
      await fetchUsageStats();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
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

        localStorage.setItem(`stacksense-api-key:${address}`, response.data.apiKey);

        setSubscription({
          tier: 'free',
          tierInfo: response.data.tierInfo,
          isActive: true,
          expiresAt: response.data.expiresAt,
          requestsLimit: response.data.requestsLimit,
        });

        setGeneratedApiKey(response.data.apiKey);
        setUpgradedTier('FREE');
        setShowKeyModal(true);
        setPaymentStep('done');
        
        // Reload details
        fetchApiKeyInfo();
        fetchUsageStats();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to initialize free tier key.');
        setPaymentStep('idle');
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

              localStorage.setItem(`stacksense-api-key:${address}`, response.data.apiKey);

              setSubscription({
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
              
              // Reload details
              fetchApiKeyInfo();
              fetchUsageStats();
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

            localStorage.setItem(`stacksense-api-key:${address}`, response.data.apiKey);

            setSubscription({
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

            // Reload details
            fetchApiKeyInfo();
            fetchUsageStats();
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
      setError('Failed to open wallet. Make sure Leather or Xverse is installed.');
    }
  };

  const tiers: Record<SubscriptionTier, Tier> = {
    free: { tier: 'Free', monthlyRequests: 1000, webhookEnabled: false, prioritySupport: false, customRules: false, monthlyCost: 0 },
    pro: { tier: 'Pro', monthlyRequests: 100000, webhookEnabled: true, prioritySupport: false, customRules: false, monthlyCost: 1 },
    enterprise: { tier: 'Enterprise', monthlyRequests: 1000000, webhookEnabled: true, prioritySupport: true, customRules: true, monthlyCost: 10 },
  };

  const spinner = <Loader2 size={14} className="animate-spin" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />;
  const getButtonLabel = (tierName: SubscriptionTier): ReactNode => {
    const isActive = activePlan === tierName;
    if (loading && isActive && paymentStep === 'wallet') return <>{spinner}Confirm in Wallet…</>;
    if (loading && isActive && paymentStep === 'generating') return <>{spinner}Generating Key…</>;
    if (tierName === 'free') return 'Get Free Key';
    return `Subscribe — ${tiers[tierName].monthlyCost} STX/mo`;
  };

  const usagePercentClass = (percent: number) => {
    if (percent >= 90) return '#EF4444';
    if (percent >= 70) return '#F59E0B';
    return '#22C55E';
  };

  const hasActiveSubscription = subscription && subscription.isActive;

  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header Info */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
          Developer Platform
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
          API Console
        </h1>
        <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, maxWidth: 650 }}>
          Consume real-time anomaly feeds, query classified whale profiles, and integrate Stacks network intelligence directly into your app.
        </p>
      </div>

      {/* Global Errors */}
      {error && (
        <div style={{ background: '#2E0F0F', border: '1px solid #EF4444', borderRadius: 8, padding: 16, color: '#EF4444', marginBottom: 32, fontSize: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Payment Loading State Banner */}
      {paymentStep !== 'idle' && paymentStep !== 'done' && (
        <div style={{ background: '#0C1A2E', border: '1px solid #3B82F6', borderRadius: 8, padding: 16, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Loader2 size={20} style={{ color: '#3B82F6', animation: 'spin 1s linear infinite' }} />
          <div>
            <p style={{ color: '#93C5FD', fontWeight: 600, fontSize: 14, margin: 0 }}>
              {paymentStep === 'wallet' && 'Waiting for wallet confirmation…'}
              {paymentStep === 'generating' && 'Payment received! Generating your secure API key…'}
            </p>
            <p style={{ color: '#64748B', fontSize: 12, margin: '4px 0 0' }}>
              {paymentStep === 'wallet' && 'Confirm the subscription contract call/transfer popup.'}
              {paymentStep === 'generating' && 'Updating subscription state across the Stacks indexer.'}
            </p>
          </div>
        </div>
      )}

      {/* Connected Dashboard State */}
      {connected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* Active Credentials & Usage Grid (Only visible if subscribed) */}
          {hasActiveSubscription ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
              {/* API Key management Card */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Key size={18} style={{ color: '#22C55E' }} />
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Your Access Token</h2>
                  {subscription?.tier && (
                    <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', border: '1px solid rgba(34,197,94,0.2)' }}>
                      {subscription.tier}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 6, padding: '10px 14px', marginBottom: 20 }}>
                  <code style={{ flex: 1, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#22C55E', wordBreak: 'break-all' }}>
                    {storedApiKey || apiKeyInfo?.maskedKey || 'No API key generated'}
                  </code>
                  {storedApiKey && (
                    <button
                      onClick={() => handleCopyKey(storedApiKey)}
                      style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', color: copied ? '#22C55E' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, fontSize: 12 }}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Created</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {apiKeyInfo ? new Date(apiKeyInfo.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Expires</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {apiKeyInfo ? new Date(apiKeyInfo.expiresAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowRegenerateConfirm(true)}
                  disabled={regenerating}
                  style={{ width: '100%', background: 'transparent', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', padding: '10px', borderRadius: 6, cursor: regenerating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}
                >
                  {regenerating ? 'Regenerating…' : 'Rotate API Key'}
                </button>
              </div>

              {/* API Usage Metrics Card */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Usage Status</h2>
                  {usageStats ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Requests (this period)</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {usageStats.requestsUsed.toLocaleString()} / {usageStats.requestsLimit.toLocaleString()}
                        </span>
                      </div>
                      
                      <div style={{ height: 8, background: 'var(--bg-base)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ width: `${Math.min(usageStats.percentUsed, 100)}%`, background: usagePercentClass(usageStats.percentUsed), height: '100%' }} />
                      </div>

                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>
                        {usageStats.percentUsed}% exhausted · {usageStats.daysRemaining} days remaining in cycle.
                      </p>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Loading real-time API quota metrics…</span>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: 16, marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
                    <ShieldCheck size={14} style={{ color: '#22C55E' }} />
                    <span>Webhook triggers active</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Connected but not subscribed State
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
              <Key size={32} style={{ color: 'var(--text-muted)', marginBottom: 12, marginInline: 'auto' }} />
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Unlock API Keys
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto 20px', lineHeight: 1.6 }}>
                Your address doesn't hold an active Developer Plan. Select one of the options below to generate an API key and connect.
              </p>
            </div>
          )}

          {/* Regenerate Confirmation UI */}
          {showRegenerateConfirm && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid #EF444433', borderRadius: 8, padding: 20 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#EF4444', fontWeight: 600 }}>Rotate Security Credentials</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Regenerating your key immediately invalidates your current credentials. Any integrations currently querying StackSense endpoints using this key will fail with a 401 error code.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: regenerating ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  {regenerating ? 'Rotating…' : 'Confirm Rotation'}
                </button>
                <button
                  onClick={() => setShowRegenerateConfirm(false)}
                  style={{ background: 'transparent', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Regenerated Key Display */}
          {newKeyAfterRegen && (
            <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: 18 }}>
              <p style={{ margin: '0 0 8px', color: '#22C55E', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> Save your new key</p>
              <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: 13 }}>
                This is the only time your full token will be shown. Keep it safe:
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 6, padding: 10 }}>
                <code style={{ flex: 1, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#22C55E', wordBreak: 'break-all' }}>{newKeyAfterRegen}</code>
                <button onClick={() => handleCopyKey(newKeyAfterRegen)} style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 4, padding: '5px 8px', cursor: 'pointer', color: copied ? '#22C55E' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Console Management / Subscriptions list */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
              Developer Plan Tiers
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              {(['free', 'pro', 'enterprise'] as SubscriptionTier[]).map((tierName) => {
                const tier = tiers[tierName];
                const isCurrent = subscription?.tier === tierName && subscription.isActive;

                return (
                  <div key={tierName} style={{ background: 'var(--bg-surface)', border: isCurrent ? '2px solid #22C55E' : '1px solid var(--bg-border)', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tier.tier}</h3>
                    <div style={{ marginBottom: 20 }}>
                      <span style={{ fontSize: 28, fontWeight: 700 }}>{tier.monthlyCost > 0 ? `${tier.monthlyCost} STX` : 'Free'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/mo</span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <li style={{ fontSize: 13, color: 'var(--text-secondary)' }}>✓ {tier.monthlyRequests.toLocaleString()} requests/month</li>
                      <li style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tier.webhookEnabled ? '✓ Real-time webhooks' : '✗ No webhook access'}</li>
                      <li style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tier.customRules ? '✓ Advanced anomaly rules' : '✗ Standard filters only'}</li>
                    </ul>

                    {isCurrent ? (
                      <button disabled style={{ background: 'var(--bg-border)', color: 'var(--text-muted)', border: 'none', padding: '10px', borderRadius: 6, cursor: 'not-allowed', fontSize: 13, fontWeight: 600 }}>
                        Active Plan
                      </button>
                    ) : (
                      <button onClick={() => handleUpgrade(tierName)} disabled={loading} style={{ background: tierName === 'free' ? 'transparent' : 'var(--brand)', border: tierName === 'free' ? '1px solid var(--bg-border)' : 'none', color: '#fff', padding: '10px', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                        {getButtonLabel(tierName)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        // Logged Out Overview & Features Marketing view
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          
          {/* Feature Highlights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            {[
              {
                title: 'Live WebSocket Stream',
                desc: 'Open real-time connections to receive parsed, rule-matched anomaly signals block-by-block.',
                icon: <Terminal size={20} style={{ color: '#7C3AED' }} />,
              },
              {
                title: 'Behavioral Archetypes API',
                desc: 'Query behavioral wallet profiles instantly to inspect historical whale operations and distributions.',
                icon: <Key size={20} style={{ color: '#3B82F6' }} />,
              },
              {
                title: 'Structured clarity analytics',
                desc: 'Detailed contract analytics reporting callers, fees, and diagnostic debugging telemetry.',
                icon: <HelpCircle size={20} style={{ color: '#22C55E' }} />,
              },
            ].map((f, i) => (
              <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 20 }}>
                <div style={{ marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Pricing cards grid */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Pricing &amp; Plans Tiers
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Select a tier that scales with your integration requirements. Connect your wallet to subscribe.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              {(['free', 'pro', 'enterprise'] as SubscriptionTier[]).map((tierName) => {
                const tier = tiers[tierName];

                return (
                  <div key={tierName} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tier.tier}</h3>
                    <div style={{ marginBottom: 20 }}>
                      <span style={{ fontSize: 28, fontWeight: 700 }}>{tier.monthlyCost > 0 ? `${tier.monthlyCost} STX` : 'Free'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/mo</span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <li style={{ fontSize: 13, color: 'var(--text-secondary)' }}>✓ {tier.monthlyRequests.toLocaleString()} requests/month</li>
                      <li style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tier.webhookEnabled ? '✓ Real-time webhooks' : '✗ No webhook access'}</li>
                      <li style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tier.customRules ? '✓ Advanced anomaly rules' : '✗ Standard filters only'}</li>
                    </ul>

                    <button
                      onClick={connect}
                      style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', padding: '10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      Connect Wallet to Subscribe
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Subscription Key Modal Dialog popup */}
      {showKeyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 32, maxWidth: 500, width: '100%', position: 'relative' }}>
            <button onClick={() => { setShowKeyModal(false); setPaymentStep('idle'); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid #22C55E', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px' }}>
                <ShieldCheck size={24} style={{ color: '#22C55E' }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Plan Upgraded to {upgradedTier}!</h2>
              {txId && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  Tx:{' '}
                  <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none' }}>
                    {txId.slice(0, 10)}…{txId.slice(-6)}
                  </a>
                </p>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                API Access Key
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 6, padding: '10px 12px' }}>
                <code style={{ flex: 1, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#22C55E', wordBreak: 'break-all' }}>{generatedApiKey}</code>
                <button onClick={() => handleCopyKey(generatedApiKey)} style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 4, padding: '5px 8px', cursor: 'pointer', color: copied ? '#22C55E' : 'var(--text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ background: '#1A120C', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} /> Store key securely</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                This is the only time your unmasked token is displayed. If lost, you must rotate security credentials via the console dashboard.
              </p>
            </div>

            <button onClick={() => { setShowKeyModal(false); setPaymentStep('idle'); }} style={{ width: '100%', background: '#22C55E', color: '#000', border: 'none', padding: '12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              Done
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
