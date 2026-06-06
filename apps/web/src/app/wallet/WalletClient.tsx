'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
const Nav = dynamic(() => import('@/components/Nav'), { ssr: false })
import FeedCard from '@/components/FeedCard'
import { getApiUrl } from '@/lib/config'
import { useWindowSize } from '@/hooks/useWindowSize'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const API = getApiUrl()
const COLORS = ['#7C3AED', '#EC4899', '#3B82F6', '#10B981', '#F59E0B']

interface WalletClientProps {
  initialData?: {
    wallet: any;
    events: any[];
  } | null;
  initialAddress?: string;
}

function ActivityGrid({ events }: { events: any[] }) {
  const totalDays = 182; // 26 weeks * 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - totalDays + 1);

  // Group events by date string
  const counts: Record<string, number> = {};
  if (events && Array.isArray(events)) {
    events.forEach(e => {
      if (e.timestamp) {
        const d = new Date(e.timestamp);
        const dateStr = d.toDateString();
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      }
    });
  }

  // Create an array of 182 days
  const days: { date: Date; count: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push({
      date: d,
      count: counts[d.toDateString()] || 0
    });
  }

  // Group into 26 columns of 7 days
  const grid: { date: Date; count: number }[][] = [];
  for (let col = 0; col < 26; col++) {
    const week: { date: Date; count: number }[] = [];
    for (let row = 0; row < 7; row++) {
      const idx = col * 7 + row;
      if (idx < days.length) {
        week.push(days[idx]);
      }
    }
    grid.push(week);
  }

  // Labels for days of the week (rendered on the left)
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Month labels: find the column indices where months change
  const monthLabels: { label: string; colIdx: number }[] = [];
  let lastMonth = -1;
  grid.forEach((week, colIdx) => {
    const firstDayOfWeek = week[0]?.date;
    if (firstDayOfWeek) {
      const month = firstDayOfWeek.getMonth();
      if (month !== lastMonth) {
        const label = firstDayOfWeek.toLocaleString('default', { month: 'short' });
        monthLabels.push({ label, colIdx });
        lastMonth = month;
      }
    }
  });

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--bg-border)',
      borderRadius: 12,
      padding: 24,
      marginBottom: 32
    }}>
      <h3 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
        Whale Activity Grid (180 Days)
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Month headers */}
        <div style={{ display: 'flex', position: 'relative', height: 16, marginLeft: 32, marginBottom: 4 }}>
          {monthLabels.map(({ label, colIdx }, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${(colIdx / 26) * 100}%`,
                fontSize: 10,
                color: 'var(--text-secondary)',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid and side labels */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Day of week labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'space-between', height: 88, width: 24 }}>
            {dayLabels.map((lbl, idx) => (
              <span key={idx} style={{ fontSize: 9, color: idx % 2 === 1 ? 'var(--text-secondary)' : 'transparent', textAlign: 'right', lineHeight: '10px' }}>
                {lbl}
              </span>
            ))}
          </div>

          {/* Grid columns */}
          <div style={{ display: 'flex', gap: 3, overflowX: 'auto', flex: 1, paddingBottom: 6 }}>
            {grid.map((week, colIdx) => (
              <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {week.map((day, rowIdx) => {
                  const count = day.count;
                  let color = 'var(--bg-elevated)'; // 0 txs
                  let border = '1px solid var(--bg-border)';
                  let glow = 'none';
                  
                  if (count > 0 && count <= 2) {
                    color = 'rgba(232, 93, 4, 0.15)'; // light brand orange
                    border = '1px solid rgba(232, 93, 4, 0.3)';
                  } else if (count > 2 && count <= 5) {
                    color = 'rgba(232, 93, 4, 0.45)'; // medium brand orange
                    border = '1px solid rgba(232, 93, 4, 0.6)';
                  } else if (count > 5) {
                    color = 'var(--brand)'; // bright brand orange
                    border = '1px solid var(--brand-text)';
                    glow = '0 0 8px rgba(232, 93, 4, 0.5)';
                  }
                  
                  const dateStr = day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                  const tooltipText = `${count} transaction${count === 1 ? '' : 's'} on ${dateStr}`;
                  
                  return (
                    <div
                      key={rowIdx}
                      title={tooltipText}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: color,
                        border: border,
                        boxShadow: glow,
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center', marginTop: 12, fontSize: 10, color: 'var(--text-muted)' }}>
          <span>Less</span>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }} />
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(232, 93, 4, 0.15)', border: '1px solid rgba(232, 93, 4, 0.3)' }} />
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(232, 93, 4, 0.45)', border: '1px solid rgba(232, 93, 4, 0.6)' }} />
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--brand)', border: '1px solid var(--brand-text)' }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export default function WalletClient({ initialData, initialAddress }: WalletClientProps) {
  const { isMobile } = useWindowSize()
  const searchParams = useSearchParams()
  const [address, setAddress] = useState(initialAddress || searchParams?.get('address') || '')
  const [input, setInput] = useState(initialAddress || searchParams?.get('address') || '')
  const [result, setResult] = useState<any>(initialData || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (addr: string) => {
    if (!addr.startsWith('SP') && !addr.startsWith('ST')) {
      setError('Address must start with SP (mainnet) or ST (testnet)')
      return
    }
    setError(null)
    setLoading(true)
    setResult(null)
    try {
      const r = await fetch(`${API}/api/v1/wallet/${addr}`)
      if (!r.ok) throw new Error('Not found')
      const data = await r.json()
      setResult(data)
      setAddress(addr)
      const nextUrl = `${window.location.pathname}?address=${addr}`;
      window.history.pushState({ path: nextUrl }, '', nextUrl);
    } catch {
      setError('No data found for this address, or the API is not running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const a = searchParams?.get('address')
    if (a && a !== address) {
      setInput(a)
      run(a)
    }
  }, [searchParams])

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Nav />

      <div style={{ 
        maxWidth: isMobile ? '100%' : 800, 
        margin: '0 auto', 
        padding: isMobile ? '32px 16px 60px' : '60px 24px' 
      }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
            Analyze
          </div>
          <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Wallet Intelligence
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Reconstruct on-chain behavior — archetype classification, protocol usage, and behavioral scores.
          </p>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 8, 
          marginBottom: error ? 8 : 32 
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run(input.trim())}
            placeholder="Enter Stacks address (SP...)"
            className="mono"
            style={{
              flex: 1,
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid var(--bg-border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
          <button
            onClick={() => run(input.trim())}
            disabled={loading}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--brand)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              cursor: loading ? 'wait' : 'pointer',
              flexShrink: 0,
              width: isMobile ? '100%' : 'auto',
            }}
          >
            {loading ? '...' : 'Analyze →'}
          </button>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: 'var(--anom)', marginBottom: 24, padding: '8px 12px', background: 'var(--anom-bg, #2E0F0F)', borderRadius: 6 }}>
            {error}
          </div>
        )}

        {loading && (
          <div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', 
              gap: 12, 
              marginBottom: 24 
            }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '18px 20px', height: 72 }} />
              ))}
            </div>
            {[1,2,3].map(i => (
              <div key={i} style={{ borderLeft: '3px solid var(--bg-elevated)', borderBottom: '1px solid var(--bg-border)', padding: '18px 24px' }}>
                <div style={{ width: '60%', height: 14, borderRadius: 4, background: 'var(--bg-elevated)', marginBottom: 8 }} />
                <div style={{ width: '85%', height: 13, borderRadius: 4, background: 'var(--bg-elevated)' }} />
              </div>
            ))}
          </div>
        )}

        {result && (
          <div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', 
              gap: 12, 
              marginBottom: 24 
            }}>
              {[
                { label: 'Archetype', value: result.wallet?.archetype ?? '—' },
                { label: 'Activity Score', value: result.wallet?.scores?.defi_degens ?? 0 },
                { label: 'HODL Rating', value: result.wallet?.scores?.diamond_hands ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '16px 18px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                  <div className="mono" style={{ fontSize: isMobile ? 14 : 16, fontWeight: 500, color: label.includes('Score') || label.includes('Rating') ? (Number(value) > 70 ? 'var(--bull)' : 'var(--text-primary)') : 'var(--text-primary)' }}>
                    {value}{typeof value === 'number' ? '%' : ''}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', 
              gap: 16, 
              marginBottom: 32 
            }}>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Protocol Distribution</h3>
                <div style={{ height: 200 }}>
                  {result.wallet?.protocols?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={result.wallet.protocols}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {result.wallet.protocols.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', fontSize: 12 }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
                      No protocol data found.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Behavioral Index</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {[
                    { label: 'Diamond Hands', score: result.wallet?.scores?.diamond_hands ?? 0, color: 'var(--bull)' },
                    { label: 'DeFi Degeneracy', score: result.wallet?.scores?.defi_degens ?? 0, color: 'var(--brand)' }
                  ].map(score => (
                    <div key={score.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{score.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: score.color }}>{score.score}%</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-border)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${score.score}%`, background: score.color, borderRadius: 2, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8 }}>
                    {result.wallet?.activity_summary}
                  </div>
                </div>
              </div>
            </div>

            {/* Whale Activity Grid Component */}
            <ActivityGrid events={result.events} />

            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Transaction History
            </div>
            <div style={{ border: '1px solid var(--bg-border)', borderRadius: 8, overflow: 'hidden' }}>
              {result.events?.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                  No transactions above the StackSense threshold in the last 30 days.
                </div>
              ) : (
                result.events?.map((e: any) => <FeedCard key={e.id} event={e} showActions={false} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
