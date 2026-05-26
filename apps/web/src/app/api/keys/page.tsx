'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import axios from 'axios';
import Link from 'next/link';
import { Copy, Check, Key, AlertCircle, Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

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
      setLoading(true);
      const response = await axios.get(`${API}/api/v1/subscriptions/api-key/${address}`, {
        headers: { 'x-api-key': storedApiKey },
      });
      setApiKeyInfo(response.data);
    } catch (err: any) {
      console.error('Error fetching API key info:', err);
      setError(err.response?.data?.error || 'Unable to load API key details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    if (!address || !storedApiKey) return;

    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/v1/subscriptions/usage/${address}`, {
        headers: { 'x-api-key': storedApiKey },
      });
      setUsageStats(response.data);
    } catch (err: any) {
      console.error('Error fetching usage stats:', err);
    } finally {
      setLoading(false);
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

      localStorage.setItem(`stacksense-api-key:${address}`, response.data.newApiKey);
      setNewKeyAfterRegen(response.data.newApiKey);
      setShowRegenerateConfirm(false);

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
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: '20px 0 60px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/api" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none', marginBottom: 24 }}>← Back to API Hub</Link>

        <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
          API Keys & Usage
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40 }}>
          Manage your credentials and keep track of your current plan usage.
        </p>

        {error && (
          <div style={{ background: '#2E0F0F', border: '1px solid #EF4444', borderRadius: 8, padding: 16, color: '#EF4444', marginBottom: 24, fontSize: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <Key size={20} style={{ color: '#22C55E' }} />
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Your API Key</h2>
              {apiKeyInfo?.tier && (
                <span style={{ background: '#0F172A', color: '#22C55E', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                  {apiKeyInfo.tier}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
              <code style={{ flex: 1, fontSize: 14, fontFamily: 'JetBrains Mono, monospace', color: '#22C55E', wordBreak: 'break-all', letterSpacing: '0.05em' }}>
                {storedApiKey || apiKeyInfo?.maskedKey || 'No API key found'}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Created</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{apiKeyInfo ? new Date(apiKeyInfo.createdAt).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Expires</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{apiKeyInfo ? new Date(apiKeyInfo.expiresAt).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Requests used</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{apiKeyInfo ? `${apiKeyInfo.requestsUsed.toLocaleString()} / ${apiKeyInfo.requestsLimit.toLocaleString()}` : '—'}</p>
              </div>
            </div>

            <button
              onClick={() => setShowRegenerateConfirm(true)}
              disabled={regenerating}
              style={{
                background: '#3B82F6',
                color: '#fff',
                border: 'none',
                padding: '12px 18px',
                borderRadius: 8,
                cursor: regenerating ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {regenerating ? 'Regenerating…' : 'Regenerate Key'}
            </button>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Usage & Quota</h2>
            {usageStats ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 20 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Requests this period</p>
                    <p style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{usageStats.requestsUsed.toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Quota</p>
                    <p style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{usageStats.requestsLimit.toLocaleString()}</p>
                  </div>
                </div>
                <div style={{ height: 10, background: 'var(--bg-base)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ width: `${usageStats.percentUsed}%`, background: usagePercentClass(usageStats.percentUsed), height: '100%' }} />
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
                  {usageStats.percentUsed}% used · {usageStats.daysRemaining} days remaining · {usageStats.isActive ? 'Active' : 'Expired'}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Connecting to your subscription usage.</p>
            )}
          </div>
        </div>

        {showRegenerateConfirm && (
          <div style={{ marginTop: 24, background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 20 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
              Regenerating your key will invalidate the current one. This is useful if you suspect your key was leaked.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                style={{ background: '#3B82F6', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: 8, cursor: regenerating ? 'not-allowed' : 'pointer', fontWeight: 600 }}
              >
                {regenerating ? 'Regenerating…' : 'Confirm Regenerate'}
              </button>
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                style={{ background: 'transparent', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', padding: '12px 18px', borderRadius: 8, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {newKeyAfterRegen && (
          <div style={{ marginTop: 20, background: 'rgba(34,197,94,0.08)', border: '1px solid #22C55E33', borderRadius: 8, padding: 18 }}>
            <p style={{ margin: 0, color: '#22C55E', fontWeight: 700 }}>New key generated.</p>
            <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{newKeyAfterRegen}</p>
          </div>
        )}
      </div>
    </div>
  );
}
