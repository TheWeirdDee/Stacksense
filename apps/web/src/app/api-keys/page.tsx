'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, Key, RefreshCw, AlertCircle, Code2, ExternalLink, Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

const Nav = dynamic(() => import('@/components/Nav'), { ssr: false });

const API = getApiUrl();

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

export default function ApiKeysPage() {
  const { address, connected, connect } = useWallet();
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [newKeyAfterRegen, setNewKeyAfterRegen] = useState('');

  useEffect(() => {
    if (address) {
      fetchApiKeyInfo();
      fetchUsageStats();
    }
  }, [address]);

  const storedApiKey = typeof window !== 'undefined' && address
    ? localStorage.getItem(`stacksense-api-key:${address}`)
    : null;

  const fetchApiKeyInfo = async () => {
    if (!address || !storedApiKey) return;
    try {
      const response = await axios.get(`${API}/api/v1/subscriptions/api-key/${address}`, {
        headers: { 'x-api-key': storedApiKey },
      });
      setApiKeyInfo(response.data);
    } catch (err: any) {
      console.error('Error fetching API key info:', err);
    }
  };

  const fetchUsageStats = async () => {
    if (!address || !storedApiKey) return;
    try {
      const response = await axios.get(`${API}/api/v1/subscriptions/usage/${address}`, {
        headers: { 'x-api-key': storedApiKey },
      });
      setUsageStats(response.data);
    } catch (err: any) {
      console.error('Error fetching usage stats:', err);
    }
  };

  const handleCopyKey = () => {
    if (storedApiKey) {
      navigator.clipboard.writeText(storedApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

      // Save new API key to localStorage
      localStorage.setItem(`stacksense-api-key:${address}`, response.data.newApiKey);
      setNewKeyAfterRegen(response.data.newApiKey);
      setShowRegenerateConfirm(false);

      // Refresh info and stats
      await fetchApiKeyInfo();
      await fetchUsageStats();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
  };

  const usagePercentClass = (percent: number) => {
    if (percent >= 90) return '#EF4444';
    if (percent >= 70) return '#F59E0B';
    return '#22C55E';
  };

  if (!connected) {
    return (
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 16 }}>API Keys</h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Connect your wallet to view and manage your API keys.
          </p>
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
            }}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Nav />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Back Link */}
        <Link
          href="/subscriptions"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-secondary)',
            fontSize: 13,
            textDecoration: 'none',
            marginBottom: 24,
          }}
          className="hover:text-primary"
        >
          <ArrowLeft size={16} /> Back to Subscriptions
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
          API Keys & Usage
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40 }}>
          Manage your API credentials and monitor real-time usage.
        </p>

        {error && (
          <div
            style={{
              background: '#2E0F0F',
              border: '1px solid #EF4444',
              borderRadius: 8,
              padding: 16,
              color: '#EF4444',
              marginBottom: 24,
              fontSize: 14,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {/* API Key Section */}
        {apiKeyInfo && (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--bg-border)',
              borderRadius: 8,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <Key size={20} style={{ color: '#22C55E' }} />
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                Your API Key
              </h2>
              <span
                style={{
                  background: '#0F2E1A',
                  color: '#22C55E',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}
              >
                {apiKeyInfo.tier}
              </span>
            </div>

            {/* Key Display */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: 'var(--bg-base)',
                border: '1px solid var(--bg-border)',
                borderRadius: 6,
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              <code
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#22C55E',
                  wordBreak: 'break-all',
                  letterSpacing: '0.05em',
                }}
              >
                {storedApiKey || apiKeyInfo.maskedKey}
              </code>
              <button
                onClick={handleCopyKey}
                style={{
                  background: 'none',
                  border: '1px solid var(--bg-border)',
                  borderRadius: 4,
                  padding: '6px 8px',
                  cursor: 'pointer',
                  color: copied ? '#22C55E' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  transition: 'color 0.2s',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Key Info */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Created
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {new Date(apiKeyInfo.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Expires
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {new Date(apiKeyInfo.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Warning */}
            <div
              style={{
                background: '#1A1520',
                border: '1px solid #F59E0B44',
                borderRadius: 6,
                padding: 12,
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600, marginBottom: 4 }}>
                ⚠️ Keep this key secure
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Treat your API key like a password. Anyone with this key can use your quota and trigger webhooks.
                Regenerate it if you believe it has been compromised.
              </p>
            </div>

            {/* Regenerate Button */}
            {!showRegenerateConfirm ? (
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                style={{
                  background: 'none',
                  border: '1px solid #EF4444',
                  color: '#EF4444',
                  borderRadius: 6,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2E0F0F';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                }}
              >
                <RefreshCw size={16} />
                Regenerate API Key
              </button>
            ) : (
              <div
                style={{
                  background: '#2E0F0F',
                  border: '1px solid #EF4444',
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 12, fontWeight: 600 }}>
                  Regenerate API Key?
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  This will invalidate your current key. You'll need to update any integrations using the old key.
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    style={{
                      background: '#EF4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 16px',
                      cursor: regenerating ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      opacity: regenerating ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {regenerating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    {regenerating ? 'Regenerating…' : 'Yes, Regenerate'}
                  </button>
                  <button
                    onClick={() => setShowRegenerateConfirm(false)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--bg-border)',
                      color: 'var(--text-secondary)',
                      borderRadius: 6,
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* New Key Display (after regeneration) */}
        {newKeyAfterRegen && (
          <div
            style={{
              background: '#0F2E1A',
              border: '1px solid #22C55E',
              borderRadius: 8,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <h3 style={{ color: '#22C55E', marginBottom: 16, fontWeight: 600 }}>
              ✓ New API Key Generated
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Your old key has been invalidated. Copy your new key below — it will not be shown again.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: 'var(--bg-base)',
                border: '1px solid #22C55E',
                borderRadius: 6,
                padding: '12px 16px',
              }}
            >
              <code
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#22C55E',
                  wordBreak: 'break-all',
                  letterSpacing: '0.05em',
                }}
              >
                {newKeyAfterRegen}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newKeyAfterRegen);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{
                  background: 'none',
                  border: '1px solid #22C55E',
                  borderRadius: 4,
                  padding: '6px 8px',
                  cursor: 'pointer',
                  color: copied ? '#22C55E' : '#22C55E',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Usage Stats */}
        {usageStats && (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--bg-border)',
              borderRadius: 8,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, color: 'var(--text-primary)' }}>
              Monthly Usage
            </h2>

            {/* Progress Bar */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Requests
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: usagePercentClass(usageStats.percentUsed),
                  }}
                >
                  {usageStats.requestsUsed.toLocaleString()} / {usageStats.requestsLimit.toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 8,
                  background: 'var(--bg-base)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(usageStats.percentUsed, 100)}%`,
                    background: usagePercentClass(usageStats.percentUsed),
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                {usageStats.percentUsed}% used
              </div>
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
              }}
            >
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Expires In
                </p>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {usageStats.daysRemaining} days
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Webhooks
                </p>
                <p style={{ fontSize: 16, fontWeight: 600, color: usageStats.webhookEnabled ? '#22C55E' : '#6B7280' }}>
                  {usageStats.webhookEnabled ? '✓ Enabled' : '✗ Not included'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Custom Filters
                </p>
                <p style={{ fontSize: 16, fontWeight: 600, color: usageStats.customFiltersEnabled ? '#22C55E' : '#6B7280' }}>
                  {usageStats.customFiltersEnabled ? '✓ Available' : '✗ Not included'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Documentation */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            borderRadius: 8,
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Code2 size={20} style={{ color: '#3B82F6' }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
              Quick Start
            </h2>
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Add your API key to the <code style={{ background: 'var(--bg-base)', padding: '2px 6px', borderRadius: 3 }}>x-api-key</code> header:
            </p>
            <div
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--bg-border)',
                borderRadius: 6,
                padding: 12,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                color: '#60A5FA',
                lineHeight: 1.6,
                overflowX: 'auto',
              }}
            >
              <div>curl -H &quot;x-api-key: YOUR_API_KEY&quot; \</div>
              <div>  https://api.stacksense.app/api/v1/feed</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Or use it in your HTTP client:
            </p>
            <div
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--bg-border)',
                borderRadius: 6,
                padding: 12,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                color: '#60A5FA',
                lineHeight: 1.6,
                overflowX: 'auto',
              }}
            >
              <div>fetch(&#39;https://api.stacksense.app/api/v1/feed&#39;, &#123;</div>
              <div>  headers: &#123; &#39;x-api-key&#39;: &#39;YOUR_API_KEY&#39; &#125;</div>
              <div>&#125;)</div>
            </div>
          </div>

          <Link
            href="/developers"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#3B82F6',
              fontSize: 14,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            View Full API Documentation <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
