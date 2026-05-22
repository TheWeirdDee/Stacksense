'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/wallet';
import axios from 'axios';

interface DeveloperStats {
  username: string;
  stats: {
    totalCommits: number;
    ecosystemCommits: number;
    ecosystemRatio: number;
  };
}

export default function DevelopersPage() {
  const { address, connected, connect } = useWallet();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DeveloperStats | null>(null);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!address) {
      connect();
      return;
    }

    if (!username.trim()) {
      setError('Please enter your GitHub username');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.post('/api/v1/developers/register', {
        username: username.trim(),
        stacksAddress: address,
      });

      setStats(response.data);
      setUsername('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!stats) return;

    try {
      setLoading(true);
      const response = await axios.post(`/api/v1/developers/sync/${stats.username}`);
      setStats({
        ...stats,
        stats: response.data.result.stats,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
          Developer Ecosystem Ranking
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40 }}>
          Register your GitHub account and track your Stacks ecosystem contributions to boost your ranking in the Stacks Builder Rewards program.
        </p>

        {!stats ? (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            borderRadius: 8,
            padding: 32,
            marginBottom: 40,
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Register Your GitHub Account</h2>

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
                }}
              >
                Connect Wallet to Register
              </button>
            ) : (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 8,
                    color: 'var(--text-secondary)',
                  }}>
                    GitHub Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g., torvalds"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--bg-border)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      fontFamily: 'JetBrains Mono, monospace',
                      boxSizing: 'border-box',
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  />
                </div>

                <button
                  onClick={handleRegister}
                  disabled={loading || !username.trim()}
                  style={{
                    background: '#22C55E',
                    color: '#000',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: 6,
                    cursor: loading || !username.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: loading || !username.trim() ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Registering...' : 'Register & Scan'}
                </button>
              </div>
            )}

            {error && (
              <div style={{
                background: '#2E0F0F',
                border: '1px solid #EF4444',
                borderRadius: 6,
                padding: 12,
                color: '#EF4444',
                marginTop: 16,
                fontSize: 14,
              }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--bg-border)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>What We Track</h3>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
                <li style={{ marginBottom: 12 }}>
                  📊 <strong>Commits to Stacks Ecosystem</strong> - Contributions to core Stacks repos, Clarity, Clarinet, etc.
                </li>
                <li style={{ marginBottom: 12 }}>
                  🔗 <strong>Total Public Commits</strong> - Your overall development activity
                </li>
                <li style={{ marginBottom: 12 }}>
                  ⭐ <strong>Stacks Relevance Score</strong> - How much of your work is Bitcoin L2/Clarity focused
                </li>
                <li>
                  🏆 <strong>Leaderboard Impact</strong> - Your rank in the Stacks Builder Rewards program
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid #22C55E',
              borderRadius: 8,
              padding: 32,
              marginBottom: 32,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
                    @{stats.username}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.username} on Stacks Builder Rewards
                  </p>
                </div>
                <button
                  onClick={handleSync}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: '1px solid #22C55E',
                    color: '#22C55E',
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Syncing...' : 'Refresh Stats'}
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
              }}>
                <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    TOTAL COMMITS
                  </p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#22C55E' }}>
                    {stats.stats.totalCommits.toLocaleString()}
                  </p>
                </div>

                <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    STACKS ECOSYSTEM
                  </p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#22C55E' }}>
                    {stats.stats.ecosystemCommits.toLocaleString()}
                  </p>
                </div>

                <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    ECOSYSTEM RATIO
                  </p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#22C55E' }}>
                    {(stats.stats.ecosystemRatio * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStats(null)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-primary)',
                padding: '10px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Register Another Account
            </button>
          </div>
        )}

        <div style={{ marginTop: 60 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>How to Increase Your Ranking</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16,
          }}>
            {[
              {
                icon: '📝',
                title: 'Commit to Stacks Core',
                desc: 'Contribute to stacks-blockchain, clarity-lang, or related ecosystem repos',
              },
              {
                icon: '🛠️',
                title: 'Build Tools & Libraries',
                desc: 'Create SDKs, CLIs, or developer tools for the Stacks ecosystem',
              },
              {
                icon: '💡',
                title: 'Improve Documentation',
                desc: 'Help developers learn by contributing to guides and examples',
              },
              {
                icon: '🧪',
                title: 'Add Tests & Examples',
                desc: 'Strengthen the ecosystem with quality test coverage and samples',
              },
              {
                icon: '🔍',
                title: 'Security Audits',
                desc: 'Review smart contracts and report issues to improve safety',
              },
              {
                icon: '🌱',
                title: 'Build DeFi Apps',
                desc: 'Deploy contracts that generate mainnet transaction volume',
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <p style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</p>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{item.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
// PR: auto-generated branch pr/web-developers-page
