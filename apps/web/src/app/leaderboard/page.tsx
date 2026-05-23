'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Cpu, Flame, Award, AlertCircle } from 'lucide-react';

const Nav = dynamic(() => import('@/components/Nav'), { ssr: false });
const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3002';

interface ContractStat {
  contractId: string;
  name: string;
  protocol: string;
  calls: number;
  callers: number;
  fees: number;
  type: string;
}

interface FeeSpender {
  address: string;
  txCount: number;
  totalFeeUstx: number;
  archetype: string;
}

interface Whale {
  address: string;
  balanceStx: number;
  activeTxCount: number;
  lastSeen: string;
}

interface LeaderboardData {
  contracts: ContractStat[];
  feeSpenders: FeeSpender[];
  whales: Whale[];
  lastUpdated: string;
}

type TabType = 'contracts' | 'spend' | 'whales';

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('contracts');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API}/api/v1/stats/leaderboard`);
      setData(res.data);
    } catch (err: any) {
      console.error('[Leaderboard] Fetch failed:', err);
      setError(err.response?.data?.error || 'Failed to load live Stacks on-chain analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-6);
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      {/* Back Button and Content Wrapper */}
      <div style={{ flex: 1, maxWidth: 1000, width: '100%', margin: '0 auto', padding: '24px 20px 60px' }}>
        
        {/* Back Link */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/feed" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-primary">
            <ArrowLeft size={16} /> Back to Feed
          </Link>
        </div>

        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
              🏆 Stacks On-Chain Leaderboard
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Real-time blockchain intelligence tracking smart contract metrics, gas spenders, and active whales.
            </p>
          </div>
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--bg-border)',
              color: 'var(--text-primary)',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Refreshing…' : '↻ Refresh Data'}
          </button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2E0F0F', border: '1px solid #EF4444', borderRadius: 8, padding: 16, color: '#EF4444', marginBottom: 24, fontSize: 14 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab switchers */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--bg-border)', marginBottom: 24, paddingBottom: 1 }}>
          {[
            { id: 'contracts', label: '🏆 Top Contracts', icon: Cpu },
            { id: 'spend', label: '🔥 Gas Spenders', icon: Flame },
            { id: 'whales', label: '🐋 Active Whales', icon: Award }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #22C55E' : '2px solid transparent',
                  color: isActive ? '#22C55E' : 'var(--text-secondary)',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: -2,
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Loading leaderboard statistics…
          </div>
        ) : data ? (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, overflow: 'hidden' }}>
            
            {/* TOP CONTRACTS TAB */}
            {activeTab === 'contracts' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--bg-border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Rank</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Contract / App</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Protocol</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>Category</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>Live Calls</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>Unique Callers</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>Fees Burned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.contracts.map((item, index) => (
                      <tr key={item.contractId} style={{ borderBottom: index < data.contracts.length - 1 ? '1px solid var(--bg-border)' : 'none', fontSize: 13 }}>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>#{index + 1}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <div>
                            <Link href={`/developers?contractId=${item.contractId}`} style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }} className="hover:underline">
                              {item.name}
                            </Link>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                              {formatAddress(item.contractId)}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{item.protocol}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-secondary)' }}>{item.type}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 500 }} className="mono">{item.calls}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-secondary)' }} className="mono">{item.callers}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', color: '#F59E0B', fontWeight: 600 }} className="mono">{item.fees.toFixed(2)} STX</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* GAS SPENDERS TAB */}
            {activeTab === 'spend' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--bg-border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Rank</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Sender Address</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Behavioral Heuristic</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>Tx Count</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>Total Fee Burned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.feeSpenders.map((item, index) => (
                      <tr key={item.address} style={{ borderBottom: index < data.feeSpenders.length - 1 ? '1px solid var(--bg-border)' : 'none', fontSize: 13 }}>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>#{index + 1}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <Link href={`/wallet?address=${item.address}`} style={{ color: '#22C55E', fontFamily: 'JetBrains Mono, monospace', textDecoration: 'none', fontWeight: 500 }} className="hover:underline">
                            {item.address}
                          </Link>
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{item.archetype}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 500 }} className="mono">{item.txCount}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', color: '#F59E0B', fontWeight: 600 }} className="mono">{(item.totalFeeUstx / 1_000_000).toFixed(4)} STX</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ACTIVE WHALES TAB */}
            {activeTab === 'whales' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--bg-border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Rank</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Whale Wallet Address</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>Wallet Balance</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>Recent Txs</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.whales.map((item, index) => (
                      <tr key={item.address} style={{ borderBottom: index < data.whales.length - 1 ? '1px solid var(--bg-border)' : 'none', fontSize: 13 }}>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>#{index + 1}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <Link href={`/wallet?address=${item.address}`} style={{ color: '#22C55E', fontFamily: 'JetBrains Mono, monospace', textDecoration: 'none', fontWeight: 500 }} className="hover:underline">
                            {item.address}
                          </Link>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', color: '#22C55E', fontWeight: 600 }} className="mono">{item.balanceStx.toLocaleString()} STX</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-secondary)' }} className="mono">{item.activeTxCount}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {new Date(item.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            No leaderboard statistics found.
          </div>
        )}

        {data && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 24 }}>
            Last updated: {new Date(data.lastUpdated).toLocaleString()} · Stacksense analytics update in real-time as transactions are matched.
          </p>
        )}

      </div>
    </div>
  );
}
