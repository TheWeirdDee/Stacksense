'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@/lib/wallet';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Cpu, Flame, Terminal, Plus, Trash, Globe, ShieldCheck, AlertCircle } from 'lucide-react';

import { getApiUrl } from '@/lib/config';

const Nav = dynamic(() => import('@/components/Nav'), { ssr: false });
const API = getApiUrl();

const DEFAULT_CONTRACT = 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV.signal-tips';

interface InspectStats {
  totalTransactions: number;
  uniqueCallers: number;
  feesGeneratedStx: string;
  contractDeployer: string;
  deploymentDate: string;
  source: string;
}

interface InspectTx {
  txId: string;
  sender: string;
  timestamp: string;
  status: 'success' | 'failed';
  fee: number;
  functionCalled: string;
  explorerUrl: string;
}

interface WebhookAlert {
  id: string;
  subscriberAddress: string;
  webhookUrl: string;
  filters: {
    minStxAmount?: number;
    signals?: string[];
  };
  active: boolean;
  createdAt: string;
}

type TabType = 'inspect' | 'webhooks';

function DeveloperHubContent() {
  const { address, connected, connect } = useWallet();
  const searchParams = useSearchParams();
  const initialContract = searchParams.get('contractId') || DEFAULT_CONTRACT;

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-6);
  };

  const [activeTab, setActiveTab] = useState<TabType>('inspect');

  // Inspector State
  const [contractInput, setContractInput] = useState(initialContract);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectStats, setInspectStats] = useState<InspectStats | null>(null);
  const [inspectTxs, setInspectTxs] = useState<InspectTx[]>([]);
  const [inspectError, setInspectError] = useState('');

  // Webhooks State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookContract, setWebhookContract] = useState(initialContract);
  const [minStxFilter, setMinStxFilter] = useState('0');
  const [signalFilter, setSignalFilter] = useState<string>('All');
  const [webhooksList, setWebhooksList] = useState<WebhookAlert[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [webhookError, setWebhookError] = useState('');
  const [webhookSuccess, setWebhookSuccess] = useState('');

  // Auto-run inspector on mount if contractId param exists
  useEffect(() => {
    const cId = searchParams.get('contractId');
    if (cId) {
      setContractInput(cId);
      setWebhookContract(cId);
      handleInspect(cId);
    } else {
      handleInspect(DEFAULT_CONTRACT);
    }
  }, [searchParams]);

  // Load webhooks when wallet connects
  useEffect(() => {
    if (address) {
      fetchWebhooks();
    }
  }, [address]);

  // Inspect Contract Handler
  const handleInspect = async (cId: string = contractInput) => {
    if (!cId.trim()) {
      setInspectError('Please enter a valid contract ID (address.name)');
      return;
    }
    setInspectLoading(true);
    setInspectError('');
    try {
      const res = await axios.get(`${API}/api/v1/project/inspect`, {
        params: { contractId: cId.trim() }
      });
      setInspectStats(res.data.stats);
      setInspectTxs(res.data.recentTransactions);
      setWebhookContract(cId.trim());
    } catch (err: any) {
      console.error('[Inspect] Error:', err);
      setInspectError(err.response?.data?.error || 'Failed to inspect contract. Ensure address format is correct.');
    } finally {
      setInspectLoading(false);
    }
  };

  // Fetch Webhooks List
  const fetchWebhooks = async () => {
    if (!address) return;
    setWebhooksLoading(true);
    try {
      const res = await axios.get(`${API}/api/v1/alerts/list/${address}`);
      setWebhooksList(res.data.webhooks || []);
    } catch (err) {
      console.error('[Webhooks] List fetch failed:', err);
    } finally {
      setWebhooksLoading(false);
    }
  };

  // Register Webhook
  const handleRegisterWebhook = async () => {
    if (!address) {
      connect();
      return;
    }
    if (!webhookUrl.trim() || !webhookUrl.startsWith('http')) {
      setWebhookError('Please enter a valid Webhook URL starting with http:// or https://');
      return;
    }
    setWebhookError('');
    setWebhookSuccess('');
    try {
      const signals = signalFilter === 'All' ? [] : [signalFilter.toLowerCase()];
      const filters = {
        minStxAmount: parseFloat(minStxFilter) || 0,
        signals: signals.length > 0 ? signals : undefined,
        protocols: [webhookContract.split('.')[1] || 'Native STX']
      };

      await axios.post(`${API}/api/v1/alerts/create`, {
        subscriberAddress: address,
        webhookUrl: webhookUrl.trim(),
        filters
      });

      setWebhookSuccess('Webhook alert registered successfully!');
      setWebhookUrl('');
      fetchWebhooks();
    } catch (err: any) {
      console.error('[Webhooks] Registration failed:', err);
      setWebhookError(err.response?.data?.error || 'Failed to register webhook alert');
    }
  };

  // Disable Webhook
  const handleDeleteWebhook = async (id: string) => {
    try {
      await axios.post(`${API}/api/v1/alerts/disable/${id}`);
      fetchWebhooks();
    } catch (err) {
      console.error('[Webhooks] Disable failed:', err);
    }
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      {/* Main Container */}
      <div style={{ flex: 1, maxWidth: 900, width: '100%', margin: '0 auto', padding: '24px 20px 60px' }}>
        
        {/* Back Link */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/feed" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }} className="hover:text-primary">
            <ArrowLeft size={16} /> Back to Feed
          </Link>
        </div>

        {/* Header Title */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.025em' }}>
            🏗 Clarity Developer Hub
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Real-time diagnostics for Stacks smart contracts. Inspect contract metrics, trace caller history, and hook up live event notifications.
          </p>
        </div>

        {/* Tabs switcher */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--bg-border)', marginBottom: 28, paddingBottom: 1 }}>
          {[
            { id: 'inspect', label: '🏗 Smart Contract Inspector', icon: Cpu },
            { id: 'webhooks', label: '⚡ Live Webhooks & Streams', icon: Globe }
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

        {/* ─── TAB 1: Smart Contract Inspector ────────────────────────────────── */}
        {activeTab === 'inspect' && (
          <div>
            {/* Input Search Block */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 20, marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
                Stacks Clarity Contract ID (address.name)
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  value={contractInput}
                  onChange={(e) => setContractInput(e.target.value)}
                  placeholder="e.g. SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV.signal-tips"
                  onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid var(--bg-border)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                  }}
                />
                <button
                  onClick={() => handleInspect()}
                  disabled={inspectLoading}
                  style={{
                    background: '#22C55E',
                    color: '#000',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: inspectLoading ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    opacity: inspectLoading ? 0.7 : 1,
                  }}
                >
                  {inspectLoading ? 'Querying Hiro API…' : 'Inspect Contract'}
                </button>
              </div>
              {inspectError && (
                <div style={{ color: '#EF4444', fontSize: 12, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} /> {inspectError}
                </div>
              )}
            </div>

            {inspectStats && !inspectLoading && (
              <div>
                {/* Metrics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
                  {[
                    { label: 'Total Calls', value: inspectStats.totalTransactions.toLocaleString(), color: '#3B82F6' },
                    { label: 'Unique Callers', value: inspectStats.uniqueCallers.toLocaleString(), color: '#22C55E' },
                    { label: 'Fees Generated', value: `${parseFloat(inspectStats.feesGeneratedStx).toFixed(2)} STX`, color: '#F59E0B' },
                  ].map((stat) => (
                    <div key={stat.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '16px 20px' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{stat.label}</p>
                      <p style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</p>
                    </div>
                  ))}
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '16px 20px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Deployment Date</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>
                      {new Date(inspectStats.deploymentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Debugger log table */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', gap: 8, background: '#131322' }}>
                    <Terminal size={16} style={{ color: '#22C55E' }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Live Transaction Debugger Log</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-base)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', marginLeft: 'auto' }}>
                      {inspectStats.source === 'live_hiro_api' ? 'HIRO MAINNET LIVE' : 'SIMULATED DATA'}
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--bg-border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600 }}>Timestamp</th>
                          <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600 }}>Function Call</th>
                          <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600 }}>Caller Address</th>
                          <th style={{ padding: '12px 20px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600 }}>Tx Fee</th>
                          <th style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectTxs.map((tx) => (
                          <tr key={tx.txId} style={{ borderBottom: '1px solid var(--bg-border)', fontSize: 12 }}>
                            <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>
                              {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td style={{ padding: '12px 20px', fontWeight: 600, color: '#3B82F6', fontFamily: 'JetBrains Mono, monospace' }}>
                              {tx.functionCalled}()
                            </td>
                            <td style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                              {formatAddress(tx.sender)}
                            </td>
                            <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                background: tx.status === 'success' ? '#0F2E1A' : '#2E0F0F',
                                color: tx.status === 'success' ? '#22C55E' : '#EF4444',
                                border: tx.status === 'success' ? '1px solid #22C55E33' : '1px solid #EF444433'
                              }}>
                                {tx.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--text-secondary)' }} className="mono">
                              {tx.fee.toFixed(5)} STX
                            </td>
                            <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                              <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#22C55E', textDecoration: 'none', fontSize: 11 }} className="hover:underline">
                                Explorer ↗
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: Webhooks & Event Streams ────────────────────────────────── */}
        {activeTab === 'webhooks' && (
          <div>
            {!connected ? (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 32, textAlign: 'center' }}>
                <Globe size={36} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Wallet Connection Required</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Connect your Stacks wallet to register real-time event webhooks for your Clarity smart contracts.
                </p>
                <button
                  onClick={connect}
                  style={{ background: '#22C55E', color: '#000', border: 'none', padding: '12px 24px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                
                {/* Create Webhook Form */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={16} style={{ color: '#22C55E' }} /> Register New Webhook Alert
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Contract to Monitor
                      </label>
                      <input
                        value={webhookContract}
                        onChange={(e) => setWebhookContract(e.target.value)}
                        placeholder="e.g. SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV.signal-tips"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--bg-border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Webhook Destination URL (POST endpoint)
                      </label>
                      <input
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://api.yourdomain.com/webhooks/stacksense"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--bg-border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          Min Transfer Threshold (STX)
                        </label>
                        <input
                          type="number"
                          value={minStxFilter}
                          onChange={(e) => setMinStxFilter(e.target.value)}
                          placeholder="e.g. 50"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--bg-border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          Signal Severity Filter
                        </label>
                        <select
                          value={signalFilter}
                          onChange={(e) => setSignalFilter(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--bg-border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                        >
                          <option value="All">All Signals</option>
                          <option value="Bullish">Bullish Only</option>
                          <option value="Risk">Risk Only</option>
                          <option value="Anomaly">Anomaly Only</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleRegisterWebhook}
                      style={{
                        background: '#22C55E', color: '#000', border: 'none',
                        padding: '12px 24px', borderRadius: 6,
                        cursor: 'pointer', fontWeight: 700, fontSize: 13,
                        marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <Plus size={16} /> Register Alert Webhook
                    </button>
                  </div>

                  {webhookError && (
                    <div style={{ color: '#EF4444', fontSize: 12, marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={14} /> {webhookError}
                    </div>
                  )}
                  {webhookSuccess && (
                    <div style={{ color: '#22C55E', fontSize: 12, marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={14} /> {webhookSuccess}
                    </div>
                  )}
                </div>

                {/* Active Webhooks List */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>Active Webhook Stream Alert Rules</h3>

                  {webhooksLoading ? (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading configured alerts…</div>
                  ) : webhooksList.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No webhook streams configured yet. Create one above to receive Stacks event payloads.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {webhooksList.map((wh) => (
                        <div key={wh.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 6, padding: '14px 18px', flexWrap: 'wrap', gap: 14 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: wh.active ? '#22C55E' : 'var(--text-muted)' }} />
                              {wh.webhookUrl}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                              Filters: Min STX: {wh.filters.minStxAmount || 0} · Signals: {wh.filters.signals?.join(', ') || 'All'}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                              Registered on: {new Date(wh.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteWebhook(wh.id)}
                            style={{
                              background: 'transparent', border: '1px solid #EF444433',
                              color: '#EF4444', padding: '6px 12px', borderRadius: 4,
                              cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
                            }}
                            className="hover:bg-red-950"
                          >
                            <Trash size={12} /> Disable
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <Suspense fallback={
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
        Loading Developer Hub...
      </div>
    }>
      <DeveloperHubContent />
    </Suspense>
  );
}
