'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet';
import axios from 'axios';

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

export default function SubscriptionsPage() {
  const { address, connected, connect } = useWallet();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState<'pro' | 'enterprise'>('pro');

  useEffect(() => {
    if (address) {
      fetchSubscription();
    }
  }, [address]);

  const fetchSubscription = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/subscriptions/subscription/${address}`);
      setSubscription(response.data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!address) {
      connect();
      return;
    }

    try {
      setLoading(true);
      setError('');

      // In production, this would call a backend endpoint that integrates with the Clarity contract
      // For now, showing the flow
      const response = await axios.post('/api/v1/subscriptions/api-keys/generate', {
        tier: selectedTier,
        subscriberAddress: address,
      });

      setSubscription({
        ...subscription!,
        tier: selectedTier,
        tierInfo: response.data.tierInfo,
        isActive: true,
        expiresAt: response.data.expiresAt,
        requestsLimit: response.data.requestsLimit,
      });

      alert(`Successfully upgraded to ${selectedTier.toUpperCase()}!\n\nAPI Key: ${response.data.apiKey}\n\nStore this securely!`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upgrade subscription');
    } finally {
      setLoading(false);
    }
  };

  const tiers: Record<string, Tier> = {
    free: { tier: 'free', monthlyRequests: 1000, webhookEnabled: false, prioritySupport: false, customRules: false, monthlyCost: 0 },
    pro: { tier: 'pro', monthlyRequests: 100000, webhookEnabled: true, prioritySupport: false, customRules: false, monthlyCost: 1 },
    enterprise: { tier: 'enterprise', monthlyRequests: 1000000, webhookEnabled: true, prioritySupport: true, customRules: true, monthlyCost: 10 },
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
          API Subscriptions
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40 }}>
          Choose a tier that fits your needs. Unlock webhooks, priority support, and more.
        </p>

        {subscription && subscription.isActive && (
          <div style={{
            background: '#0F2E1A',
            border: '1px solid #22C55E',
            borderRadius: 8,
            padding: 16,
            marginBottom: 40,
          }}>
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

        {!connected ? (
          <button
            onClick={connect}
            style={{
              background: '#22C55E',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              marginBottom: 40,
            }}
          >
            Connect Wallet to View Plans
          </button>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            marginBottom: 40,
          }}>
            {['free', 'pro', 'enterprise'].map((tierName) => {
              const tier = tiers[tierName];
              const isCurrent = subscription?.tier === tierName;

              return (
                <div
                  key={tierName}
                  style={{
                    background: 'var(--bg-surface)',
                    border: isCurrent ? '2px solid #22C55E' : '1px solid var(--bg-border)',
                    borderRadius: 8,
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
                    {tier.tier}
                  </h3>

                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
                      {tier.monthlyCost > 0 ? `${tier.monthlyCost} STX` : 'Free'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/month</p>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24, flex: 1 }}>
                    <li style={{ marginBottom: 12, fontSize: 14 }}>
                      ✓ {tier.monthlyRequests.toLocaleString()} requests/month
                    </li>
                    {tier.webhookEnabled && (
                      <li style={{ marginBottom: 12, fontSize: 14 }}>
                        ✓ Webhook support
                      </li>
                    )}
                    {tier.prioritySupport && (
                      <li style={{ marginBottom: 12, fontSize: 14 }}>
                        ✓ Priority support
                      </li>
                    )}
                    {tier.customRules && (
                      <li style={{ marginBottom: 12, fontSize: 14 }}>
                        ✓ Custom rules
                      </li>
                    )}
                  </ul>

                  {isCurrent ? (
                    <button
                      disabled
                      style={{
                        background: 'var(--bg-border)',
                        color: 'var(--text-secondary)',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: 6,
                        cursor: 'not-allowed',
                        fontWeight: 600,
                      }}
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedTier(tierName as 'pro' | 'enterprise');
                        handleUpgrade();
                      }}
                      disabled={loading}
                      style={{
                        background: '#22C55E',
                        color: '#000',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: 6,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      {loading ? 'Processing...' : tierName === 'free' ? 'Continue with Free' : 'Upgrade'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div style={{
            background: '#2E0F0F',
            border: '1px solid #EF4444',
            borderRadius: 8,
            padding: 16,
            color: '#EF4444',
            marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 60 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: 'var(--text-primary)' }}>
            Features Comparison
          </h2>
          <div style={{
            overflowX: 'auto',
            background: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--bg-border)',
          }}>
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
    </div>
  );
}
