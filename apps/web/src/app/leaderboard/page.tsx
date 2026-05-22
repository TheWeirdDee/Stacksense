'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3002';

interface ContractStat {
  contractId: string;
  transactions: number;
  uniqueCallers: number;
  feesUstx: number;
}

interface DailyDownload {
  day: string;
  downloads: number;
}

interface ProjectScore {
  project: {
    githubOwner: string;
    githubRepo: string;
    npmPackage: string;
    stacksAddress: string;
  };
  github: {
    totalCommits: number;
    ecosystemCommits: number;
    ecosystemRatio: number;
    contributors: number;
    stars: number;
    lastPushedAt: string;
  };
  onchain: {
    totalTransactions: number;
    uniqueCallers: number;
    feesGeneratedUstx: number;
    feesGeneratedStx: string;
    contractDeployments: number;
    contracts: ContractStat[];
  };
  npm: {
    package: string;
    monthlyDownloads: number;
    weeklyDownloads: number;
    averageDailyDownloads: number;
    peakDailyDownloads: number;
    dailyBreakdown: DailyDownload[];
  };
  scoring: {
    onchainScore: number;
    githubScore: number;
    npmScore: number;
    totalScore: number;
    estimatedTier: string;
    thresholds: { top10: number; top25: number; top50: number };
  };
  lastUpdated: string;
}

const TIER_COLOR: Record<string, string> = {
  'Top 10': '#22C55E',
  'Top 25': '#3B82F6',
  'Top 50': '#F59E0B',
  Unranked: '#6B7280',
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div style={{ background: '#1a1a2e', borderRadius: 6, height: 8, overflow: 'hidden' }}>
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 6,
          transition: 'width 0.6s ease',
        }}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: 'var(--bg-base)', borderRadius: 8, padding: '14px 18px' }}>
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 700, color: '#22C55E', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

export default function LeaderboardPage() {
  const [score, setScore] = useState<ProjectScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const fetchScore = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await axios.get(`${API}/api/v1/project/score`);
      setScore(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load ranking data');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await axios.post(`${API}/api/v1/project/sync`);
      await fetchScore();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  const tierColor = score ? TIER_COLOR[score.scoring.estimatedTier] ?? '#6B7280' : '#6B7280';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              🏆 Stacks Builder Rewards Ranking
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Live scoring across GitHub, Onchain, and NPM signals for{' '}
              <span style={{ color: '#22C55E', fontFamily: 'JetBrains Mono, monospace' }}>
                StackSense
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a
              href="https://talent.app/~/earn/stacks-builder-rewards-may"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'transparent',
                border: '1px solid #22C55E',
                color: '#22C55E',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              View on talent.app ↗
            </a>
            <button
              onClick={handleSync}
              disabled={syncing || loading}
              style={{
                background: '#22C55E',
                color: '#000',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: syncing || loading ? 'not-allowed' : 'pointer',
                opacity: syncing || loading ? 0.7 : 1,
              }}
            >
              {syncing ? 'Syncing…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#2E0F0F', border: '1px solid #EF4444', borderRadius: 8, padding: 16, color: '#EF4444', marginBottom: 24 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-secondary)' }}>
            Loading ranking data…
          </div>
        )}

        {score && !loading && (
          <>
            {/* Tier Badge */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: `2px solid ${tierColor}`,
                borderRadius: 12,
                padding: '24px 32px',
                marginBottom: 32,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 24,
              }}
            >
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 4 }}>
                  ESTIMATED TIER
                </p>
                <p style={{ fontSize: 40, fontWeight: 800, color: tierColor, lineHeight: 1 }}>
                  {score.scoring.estimatedTier}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                  Combined score:{' '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {score.scoring.totalScore.toLocaleString()}
                  </span>
                </p>
              </div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Top 50 threshold</span>
                    <span style={{ fontSize: 12, color: '#F59E0B' }}>500</span>
                  </div>
                  <ProgressBar value={score.scoring.totalScore} max={500} color="#F59E0B" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Top 25 threshold</span>
                    <span style={{ fontSize: 12, color: '#3B82F6' }}>2,000</span>
                  </div>
                  <ProgressBar value={score.scoring.totalScore} max={2000} color="#3B82F6" />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Top 10 threshold</span>
                    <span style={{ fontSize: 12, color: '#22C55E' }}>5,000</span>
                  </div>
                  <ProgressBar value={score.scoring.totalScore} max={5000} color="#22C55E" />
                </div>
              </div>
            </div>

            {/* 3 Pillars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>

              {/* Onchain */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid #F59E0B33', borderRadius: 10, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700 }}>🟡 Onchain</h2>
                  <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>
                    Score: {score.scoring.onchainScore.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <Stat label="MAINNET TXS" value={score.onchain.totalTransactions.toLocaleString()} />
                  <Stat label="UNIQUE CALLERS" value={score.onchain.uniqueCallers.toLocaleString()} />
                  <Stat
                    label="FEES GENERATED"
                    value={`${score.onchain.feesGeneratedStx} STX`}
                    sub={`${score.onchain.feesGeneratedUstx.toLocaleString()} µSTX`}
                  />
                  <Stat label="CONTRACT DEPLOYS" value={score.onchain.contractDeployments} />
                </div>
                {score.onchain.contracts.map((c) => (
                  <div
                    key={c.contractId}
                    style={{
                      borderTop: '1px solid var(--bg-border)',
                      paddingTop: 10,
                      marginTop: 10,
                    }}
                  >
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
                      {c.contractId.split('.')[1]}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                      {c.transactions} txs · {c.uniqueCallers} callers
                    </p>
                  </div>
                ))}
              </div>

              {/* GitHub */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid #22C55E33', borderRadius: 10, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700 }}>🟢 GitHub</h2>
                  <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>
                    Score: {score.scoring.githubScore.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Stat label="ECOSYSTEM COMMITS" value={score.github.ecosystemCommits.toLocaleString()} />
                  <Stat label="TOTAL COMMITS" value={score.github.totalCommits.toLocaleString()} />
                  <Stat label="CONTRIBUTORS" value={score.github.contributors} />
                  <Stat label="STARS" value={score.github.stars} />
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--bg-border)' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Repo:{' '}
                    <a
                      href={`https://github.com/${score.project.githubOwner}/${score.project.githubRepo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#22C55E', textDecoration: 'none' }}
                    >
                      {score.project.githubOwner}/{score.project.githubRepo} ↗
                    </a>
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Ecosystem ratio:{' '}
                    <span style={{ color: 'var(--text-primary)' }}>
                      {(score.github.ecosystemRatio * 100).toFixed(1)}%
                    </span>
                  </p>
                </div>
              </div>

              {/* NPM */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid #3B82F633', borderRadius: 10, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700 }}>🔵 NPM</h2>
                  <span style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>
                    Score: {score.scoring.npmScore.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Stat label="MONTHLY DLS" value={score.npm.monthlyDownloads.toLocaleString()} />
                  <Stat label="WEEKLY DLS" value={score.npm.weeklyDownloads.toLocaleString()} />
                  <Stat label="AVG DAILY" value={score.npm.averageDailyDownloads.toLocaleString()} />
                  <Stat label="PEAK DAY" value={score.npm.peakDailyDownloads.toLocaleString()} />
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--bg-border)' }}>
                  <a
                    href={`https://www.npmjs.com/package/${score.npm.package}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}
                  >
                    {score.npm.package} ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Action Checklist */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>⚡ How to improve your rank</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  {
                    done: score.onchain.totalTransactions > 0,
                    text: `Generate mainnet transactions on your contracts (currently ${score.onchain.totalTransactions})`,
                    tip: 'Keep running divine.ts — each tx adds to your onchain score',
                  },
                  {
                    done: score.onchain.uniqueCallers > 5,
                    text: `Grow unique wallet callers (currently ${score.onchain.uniqueCallers})`,
                    tip: 'More diverse wallet addresses calling your contract = higher unique caller score',
                  },
                  {
                    done: score.github.ecosystemCommits > 10,
                    text: `Commit to Stacks ecosystem repos (currently ${score.github.ecosystemCommits} ecosystem commits)`,
                    tip: 'PRs to stacks-blockchain, clarinet, stacks.js count as ecosystem commits',
                  },
                  {
                    done: score.npm.monthlyDownloads > 100,
                    text: `Grow organic NPM downloads (currently ${score.npm.monthlyDownloads}/month)`,
                    tip: 'Distribute installs across more IPs/machines to avoid concentration penalty',
                  },
                  {
                    done: score.onchain.contractDeployments >= 2,
                    text: `Deploy more contracts (currently ${score.onchain.contractDeployments})`,
                    tip: 'Each mainnet contract deployment adds to your deployment count',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 16px',
                      background: 'var(--bg-base)',
                      borderRadius: 8,
                      borderLeft: `3px solid ${item.done ? '#22C55E' : '#F59E0B'}`,
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{item.done ? '✅' : '⚠️'}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{item.text}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{item.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 24 }}>
              Last updated: {new Date(score.lastUpdated).toLocaleString()} · Leaderboard updates on talent.app every 24h
            </p>
          </>
        )}
      </div>
    </div>
  );
}
