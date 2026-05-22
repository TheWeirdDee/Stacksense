'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/wallet';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3002';

const DEFAULT_OWNER = 'TheWeirdDee';
const DEFAULT_REPO = 'Stacksense';
const DEFAULT_NPM = 'stacksense-intel-divine';
const DEFAULT_CONTRACT = 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV.signal-tips';

interface DeveloperStats {
  username: string;
  stats: {
    totalCommits: number;
    ecosystemCommits: number;
    ecosystemRatio: number;
  };
}

interface ProjectScore {
  scoring: { estimatedTier: string; totalScore: number; onchainScore: number; githubScore: number; npmScore: number };
  github: { totalCommits: number; ecosystemCommits: number; contributors: number; ecosystemRatio: number };
  onchain: { totalTransactions: number; uniqueCallers: number; feesGeneratedStx: string; contractDeployments: number };
  npm: { monthlyDownloads: number; weeklyDownloads: number };
}

const TIER_COLOR: Record<string, string> = {
  'Top 10': '#22C55E', 'Top 25': '#3B82F6', 'Top 50': '#F59E0B', Unranked: '#6B7280',
};

type Tab = 'project' | 'github';

export default function DevelopersPage() {
  const { address, connected, connect } = useWallet();
  const [tab, setTab] = useState<Tab>('project');

  // Project tab state
  const [contractInput, setContractInput] = useState(DEFAULT_CONTRACT);
  const [githubOwner, setGithubOwner] = useState(DEFAULT_OWNER);
  const [githubRepo, setGithubRepo] = useState(DEFAULT_REPO);
  const [npmPackage, setNpmPackage] = useState(DEFAULT_NPM);
  const [projectScore, setProjectScore] = useState<ProjectScore | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState('');

  // GitHub individual tab state
  const [username, setUsername] = useState('');
  const [devLoading, setDevLoading] = useState(false);
  const [devStats, setDevStats] = useState<DeveloperStats | null>(null);
  const [devError, setDevError] = useState('');

  // ─── Project tab handlers ────────────────────────────────────────────────
  const handleRegisterProject = async () => {
    if (!address) { connect(); return; }
    setProjectLoading(true);
    setProjectError('');
    try {
      const [addr, name] = contractInput.split('.');
      const contracts = [
        { address: addr, name },
        { address: 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV', name: 'subcription-tips' },
      ];
      await axios.post(`${API}/api/v1/project/register`, {
        stacksAddress: address,
        githubOwner,
        githubRepo,
        npmPackage,
        contracts,
      });
      const { data } = await axios.get(`${API}/api/v1/project/score`);
      setProjectScore(data);
    } catch (e: any) {
      setProjectError(e.response?.data?.error || 'Failed to register project');
    } finally {
      setProjectLoading(false);
    }
  };

  const handleSyncProject = async () => {
    setProjectLoading(true);
    try {
      await axios.post(`${API}/api/v1/project/sync`);
      const { data } = await axios.get(`${API}/api/v1/project/score`);
      setProjectScore(data);
    } catch (e: any) {
      setProjectError(e.response?.data?.error || 'Failed to sync');
    } finally {
      setProjectLoading(false);
    }
  };

  // ─── GitHub individual tab handlers ──────────────────────────────────────
  const handleRegisterDev = async () => {
    if (!address) { connect(); return; }
    if (!username.trim()) { setDevError('Please enter your GitHub username'); return; }
    setDevLoading(true);
    setDevError('');
    try {
      const { data } = await axios.post(`${API}/api/v1/developers/register`, {
        username: username.trim(),
        stacksAddress: address,
      });
      setDevStats(data);
      setUsername('');
    } catch (e: any) {
      setDevError(e.response?.data?.error || 'Failed to register. Please try again.');
    } finally {
      setDevLoading(false);
    }
  };

  const handleSyncDev = async () => {
    if (!devStats) return;
    setDevLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/v1/developers/sync/${devStats.username}`);
      setDevStats({ ...devStats, stats: data.result.stats });
    } catch (e: any) {
      setDevError(e.response?.data?.error || 'Failed to sync activity');
    } finally {
      setDevLoading(false);
    }
  };

  const tierColor = projectScore ? (TIER_COLOR[projectScore.scoring.estimatedTier] ?? '#6B7280') : '#22C55E';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          Developer Hub
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
          Track project-level and individual developer contributions to the Stacks Builder Rewards leaderboard.
        </p>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--bg-border)', marginBottom: 32 }}>
          {(['project', 'github'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid #22C55E' : '2px solid transparent',
                color: tab === t ? '#22C55E' : 'var(--text-secondary)',
                padding: '10px 24px',
                cursor: 'pointer',
                fontWeight: tab === t ? 700 : 400,
                fontSize: 14,
                marginBottom: -1,
              }}
            >
              {t === 'project' ? '🏗 My Project' : '🧑‍💻 My GitHub'}
            </button>
          ))}
        </div>

        {/* ─── PROJECT TAB ─────────────────────────────────────────────── */}
        {tab === 'project' && (
          <div>
            {!projectScore ? (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Register Your Project</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                  Link your GitHub repo, NPM package, and contracts to see your combined Stacks Builder Rewards score.
                </p>

                {!connected ? (
                  <button
                    onClick={connect}
                    style={{ background: '#22C55E', color: '#000', border: 'none', padding: '12px 24px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Connect Wallet to Register
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { label: 'Primary Contract (address.name)', value: contractInput, setter: setContractInput, hint: 'SP3DBM7…signal-tips' },
                      { label: 'GitHub Org / Username', value: githubOwner, setter: setGithubOwner, hint: 'TheWeirdDee' },
                      { label: 'GitHub Repo', value: githubRepo, setter: setGithubRepo, hint: 'Stacksense' },
                      { label: 'NPM Package', value: npmPackage, setter: setNpmPackage, hint: 'stacksense-intel-divine' },
                    ].map(({ label, value, setter, hint }) => (
                      <div key={label}>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          {label}
                        </label>
                        <input
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          placeholder={hint}
                          style={{
                            width: '100%', padding: '10px 12px', borderRadius: 6,
                            border: '1px solid var(--bg-border)', background: 'var(--bg-base)',
                            color: 'var(--text-primary)', fontSize: 13,
                            fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}

                    <button
                      onClick={handleRegisterProject}
                      disabled={projectLoading}
                      style={{
                        background: '#22C55E', color: '#000', border: 'none',
                        padding: '12px 24px', borderRadius: 6,
                        cursor: projectLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 700, opacity: projectLoading ? 0.6 : 1, fontSize: 14,
                      }}
                    >
                      {projectLoading ? 'Scanning…' : 'Register & Scan Project'}
                    </button>
                  </div>
                )}

                {projectError && (
                  <div style={{ background: '#2E0F0F', border: '1px solid #EF4444', borderRadius: 6, padding: 12, color: '#EF4444', marginTop: 16, fontSize: 13 }}>
                    {projectError}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Tier banner */}
                <div style={{ background: 'var(--bg-surface)', border: `2px solid ${tierColor}`, borderRadius: 10, padding: 24, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 4 }}>ESTIMATED TIER</p>
                    <p style={{ fontSize: 36, fontWeight: 800, color: tierColor }}>{projectScore.scoring.estimatedTier}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Combined score: <strong style={{ color: 'var(--text-primary)' }}>{projectScore.scoring.totalScore.toLocaleString()}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <a
                      href="https://talent.app/~/earn/stacks-builder-rewards-may"
                      target="_blank" rel="noopener noreferrer"
                      style={{ background: 'transparent', border: '1px solid #22C55E', color: '#22C55E', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                    >
                      View on talent.app ↗
                    </a>
                    <button
                      onClick={handleSyncProject}
                      disabled={projectLoading}
                      style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: 6, cursor: projectLoading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: projectLoading ? 0.6 : 1 }}
                    >
                      {projectLoading ? 'Syncing…' : '↻ Refresh'}
                    </button>
                  </div>
                </div>

                {/* Score pills */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                  {[
                    { label: 'ONCHAIN SCORE', value: projectScore.scoring.onchainScore.toLocaleString(), color: '#F59E0B', icon: '🟡' },
                    { label: 'GITHUB SCORE', value: projectScore.scoring.githubScore.toLocaleString(), color: '#22C55E', icon: '🟢' },
                    { label: 'NPM SCORE', value: projectScore.scoring.npmScore.toLocaleString(), color: '#3B82F6', icon: '🔵' },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '16px 20px' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{icon} {label}</p>
                      <p style={{ fontSize: 24, fontWeight: 700, color }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Detail rows */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: '#22C55E' }}>🟢 GitHub</h3>
                    {[
                      ['Ecosystem commits', projectScore.github.ecosystemCommits],
                      ['Total commits', projectScore.github.totalCommits],
                      ['Contributors', projectScore.github.contributors],
                      ['Ecosystem ratio', `${(projectScore.github.ecosystemRatio * 100).toFixed(1)}%`],
                    ].map(([k, v]) => (
                      <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: '#F59E0B' }}>🟡 Onchain</h3>
                    {[
                      ['Mainnet transactions', projectScore.onchain.totalTransactions],
                      ['Unique callers', projectScore.onchain.uniqueCallers],
                      ['Fees generated', `${projectScore.onchain.feesGeneratedStx} STX`],
                      ['Contract deployments', projectScore.onchain.contractDeployments],
                    ].map(([k, v]) => (
                      <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: '#3B82F6' }}>🔵 NPM</h3>
                    {[
                      ['Monthly downloads', projectScore.npm.monthlyDownloads.toLocaleString()],
                      ['Weekly downloads', projectScore.npm.weeklyDownloads.toLocaleString()],
                    ].map(([k, v]) => (
                      <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bg-border)' }}>
                      <a href="https://www.npmjs.com/package/stacksense-intel-divine" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>
                        stacksense-intel-divine ↗
                      </a>
                    </div>
                  </div>
                </div>

                <button onClick={() => setProjectScore(null)} style={{ marginTop: 20, background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', padding: '10px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                  Re-register
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── GITHUB INDIVIDUAL TAB ──────────────────────────────────── */}
        {tab === 'github' && (
          <div>
            {!devStats ? (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Register Your GitHub Account</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                  Track your personal contributions to the Stacks ecosystem.
                </p>

                {!connected ? (
                  <button onClick={connect} style={{ background: '#22C55E', color: '#000', border: 'none', padding: '12px 24px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                    Connect Wallet to Register
                  </button>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>GitHub Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g., torvalds"
                      onKeyDown={(e) => e.key === 'Enter' && handleRegisterDev()}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--bg-border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box', marginBottom: 16 }}
                    />
                    <button
                      onClick={handleRegisterDev}
                      disabled={devLoading || !username.trim()}
                      style={{ background: '#22C55E', color: '#000', border: 'none', padding: '12px 24px', borderRadius: 6, cursor: devLoading || !username.trim() ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: devLoading || !username.trim() ? 0.6 : 1 }}
                    >
                      {devLoading ? 'Registering…' : 'Register & Scan'}
                    </button>
                  </div>
                )}

                {devError && (
                  <div style={{ background: '#2E0F0F', border: '1px solid #EF4444', borderRadius: 6, padding: 12, color: '#EF4444', marginTop: 16, fontSize: 13 }}>
                    {devError}
                  </div>
                )}

                <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--bg-border)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>What We Track</h3>
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                    {[
                      ['📊', 'Commits to Stacks Ecosystem', 'Contributions to stacks-blockchain, Clarity, Clarinet, etc.'],
                      ['🔗', 'Total Public Commits', 'Your overall development activity'],
                      ['⭐', 'Stacks Relevance Score', 'How much of your work is Bitcoin L2/Clarity focused'],
                      ['🏆', 'Leaderboard Impact', 'Your rank in the Stacks Builder Rewards program'],
                    ].map(([icon, title, desc]) => (
                      <li key={String(title)} style={{ marginBottom: 14 }}>
                        {icon} <strong>{title}</strong> — {desc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid #22C55E', borderRadius: 10, padding: 32, marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>@{devStats.username}</h2>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Stacks Builder Rewards contributor</p>
                    </div>
                    <button onClick={handleSyncDev} disabled={devLoading} style={{ background: 'transparent', border: '1px solid #22C55E', color: '#22C55E', padding: '8px 16px', borderRadius: 6, cursor: devLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: devLoading ? 0.6 : 1 }}>
                      {devLoading ? 'Syncing…' : 'Refresh Stats'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    {[
                      ['TOTAL COMMITS', devStats.stats.totalCommits.toLocaleString()],
                      ['STACKS ECOSYSTEM', devStats.stats.ecosystemCommits.toLocaleString()],
                      ['ECOSYSTEM RATIO', `${(devStats.stats.ecosystemRatio * 100).toFixed(1)}%`],
                    ].map(([label, value]) => (
                      <div key={String(label)} style={{ background: 'var(--bg-base)', borderRadius: 6, padding: 16 }}>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
                        <p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setDevStats(null)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', padding: '10px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                  Register Another Account
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
