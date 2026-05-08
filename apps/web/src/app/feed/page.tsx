'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
const Nav = dynamic(() => import('@/components/Nav'), { ssr: false })
import FeedCard from '@/components/FeedCard'
import SignalTag from '@/components/SignalTag'
import { useWallet } from '@/lib/wallet'

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001/ws'

const SIGNALS = ['All', 'Bullish', 'Neutral', 'Risk', 'Anomaly']
const PROTOCOLS = ['ALEX', 'Arkadiko', 'Velar', 'sBTC Bridge', 'Native STX']

type WSStatus = 'connecting' | 'live' | 'disconnected'

export default function FeedPage() {
  const [events, setEvents] = useState<any[]>([])
  const searchParams = useSearchParams()
  const isMyActivity = searchParams.get('my') === 'true'
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [paused, setPaused] = useState(false)
  const [buffered, setBuffered] = useState<any[]>([])
  const [wsStatus, setWsStatus] = useState<WSStatus>('connecting')
  const [signalFilter, setSignalFilter] = useState('All')
  const [protocolFilter, setProtocolFilter] = useState<Set<string>>(new Set(PROTOCOLS))
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)
  const [whaleThreshold, setWhaleThreshold] = useState<number>(10000)
  const [whaleAlert, setWhaleAlert] = useState<any>(null)
  const { connected, address, connect } = useWallet()
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCount = useRef(0)

  // Fetch initial events
  useEffect(() => {
    fetch(`${API}/api/v1/feed?limit=50`)
      .then(r => r.json())
      .then(data => {
        setEvents(data.events ?? [])
        setLoading(false)
        setApiError(false)
      })
      .catch(() => {
        setLoading(false)
        setApiError(true)
      })
  }, [])

  // Fetch stats every 30s
  useEffect(() => {
    const load = () =>
      fetch(`${API}/api/v1/stats`)
        .then(r => r.json())
        .then(setStats)
        .catch(() => {})
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  // WebSocket with exponential backoff
  const connect_ws = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    setWsStatus('connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setWsStatus('live')
      retryCount.current = 0
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'history') {
          setEvents(prev => prev.length === 0 ? msg.data : prev)
        }
        if (msg.type === 'event') {
          if (paused) {
            setBuffered(b => [msg.data, ...b])
          } else {
            setNewIds(ids => new Set([msg.data.id, ...ids]))
            setEvents(ev => [msg.data, ...ev].slice(0, 200))
          }
        }
      } catch {}
    }

    ws.onclose = () => {
      if (retryCount.current < 5) {
        const delay = Math.min(1000 * 2 ** retryCount.current, 16000)
        retryCount.current++
        setWsStatus('connecting')
        retryRef.current = setTimeout(connect_ws, delay)
      } else {
        setWsStatus('disconnected')
      }
    }

    ws.onerror = () => ws.close()
  }, [paused])

  useEffect(() => {
    connect_ws()
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect_ws])

  // Whale alert banner logic
  useEffect(() => {
    if (!whaleThreshold || !connected) return
    const latestEvent = events[0]
    if (latestEvent && latestEvent.stx_amount >= whaleThreshold) {
      setWhaleAlert(latestEvent)
      // Auto-dismiss after 8 seconds
      setTimeout(() => setWhaleAlert(null), 8_000)
    }
  }, [events[0]?.id, whaleThreshold, connected])

  // Flush buffer on resume
  const resume = () => {
    setPaused(false)
    if (buffered.length > 0) {
      setNewIds(ids => new Set([...buffered.map((e: any) => e.id), ...ids]))
      setEvents(ev => [...buffered, ...ev].slice(0, 200))
      setBuffered([])
    }
  }

  // Filtered events
  const filtered = events.filter(e => {
    if (isMyActivity && connected && address) {
      if (e.wallet_address !== address) return false
    }
    const sigMatch = signalFilter === 'All' || e.signal === signalFilter.toLowerCase()
    const protoMatch = protocolFilter.size === 0 || protocolFilter.has(e.protocol)
    return sigMatch && protoMatch
  })

  const statusColor = wsStatus === 'live' ? '#22C55E' : wsStatus === 'connecting' ? '#F59E0B' : '#EF4444'
  const statusLabel = wsStatus === 'live' ? 'Live' : wsStatus === 'connecting' ? 'Syncing...' : 'Disconnected'

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Nav />
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr 240px',
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
      }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          borderRight: '1px solid var(--bg-border)',
          overflowY: 'auto',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}>

          {/* Signal filters */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Signal
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SIGNALS.map(s => {
                const active = signalFilter === s
                return (
                  <button
                    key={s}
                    onClick={() => setSignalFilter(s)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: active ? 'var(--bg-elevated)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 13,
                      fontFamily: 'Inter, sans-serif',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s !== 'All' && (
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: s === 'Bullish' ? '#22C55E' : s === 'Neutral' ? '#94A3B8' : s === 'Risk' ? '#F59E0B' : '#EF4444',
                          display: 'inline-block',
                        }} />
                      )}
                      {s}
                    </span>
                    {active && <span style={{ color: 'var(--brand)', fontSize: 10 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--bg-border)' }} />

          {/* Protocol filters */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Protocol
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {PROTOCOLS.map(p => {
                const checked = protocolFilter.has(p)
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setProtocolFilter(prev => {
                        const next = new Set(prev)
                        checked ? next.delete(p) : next.add(p)
                        return next
                      })
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      color: checked ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize: 13,
                      fontFamily: 'Inter, sans-serif',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {/* Custom checkbox — no browser default */}
                    <span style={{
                      width: 14, height: 14, borderRadius: 3,
                      border: `1px solid ${checked ? 'var(--brand)' : 'var(--bg-border)'}`,
                      background: checked ? 'var(--brand)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.1s',
                    }}>
                      {checked && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                    </span>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--bg-border)' }} />

          {/* Stats */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Today
            </div>
            {[
              { label: 'STX Moved', value: stats ? (stats.stx_moved_today >= 1_000_000 ? `${(stats.stx_moved_today / 1_000_000).toFixed(1)}M` : `${Math.round(stats.stx_moved_today / 1000)}K`) : '—' },
              { label: 'Events', value: stats?.total_events_today ?? '—' },
              { label: 'Top Protocol', value: stats?.most_active_protocol_today ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Version */}
          <div style={{ marginTop: 'auto', fontSize: 10, color: 'var(--text-muted)', paddingTop: 8 }}>
            StackSense v1.0 · Mainnet<br />
            <span style={{ color: 'var(--bg-border)' }}>Signals are observational.</span>
          </div>
        </div>

        {/* ── CENTER FEED ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Feed header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            borderBottom: '1px solid var(--bg-border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Live Feed</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: statusColor,
                  display: 'inline-block',
                  animation: wsStatus === 'connecting' ? 'pulse 1.2s infinite' : 'none',
                }} />
                <span style={{ fontSize: 11, color: statusColor, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
                  {statusLabel}
                </span>
              </div>
              {wsStatus === 'disconnected' && (
                <button
                  onClick={() => { retryCount.current = 0; connect_ws() }}
                  style={{ fontSize: 11, color: 'var(--brand-text)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  Reconnect
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {paused && buffered.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--brand-text)' }}>
                  {buffered.length} new
                </span>
              )}
              <button
                onClick={paused ? resume : () => setPaused(true)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--bg-border)',
                  background: 'transparent',
                  color: paused ? 'var(--brand-text)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {paused ? `Resume${buffered.length > 0 ? ` (${buffered.length})` : ''}` : 'Pause'}
              </button>
            </div>
          </div>

          {/* Feed list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Whale Alert Banner */}
            {whaleAlert && (
              <div style={{
                background: 'var(--risk-bg)',
                borderBottom: '1px solid var(--risk)',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'slideDown 0.3s ease-out'
              }}>
                <div style={{ fontSize: 13, color: 'var(--risk)', fontWeight: 500 }}>
                  🐋 Whale alert: {whaleAlert.title} — {Math.round(whaleAlert.stx_amount).toLocaleString()} STX
                </div>
                <button 
                  onClick={() => setWhaleAlert(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--risk)', cursor: 'pointer', fontSize: 16 }}
                >
                  ×
                </button>
              </div>
            )}

            {apiError && (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--anom)', marginBottom: 8 }}>Backend not connected</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Start the API server: <code style={{ fontFamily: 'JetBrains Mono, monospace', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4 }}>cd apps/api && npm run dev</code>
                </div>
                <button
                  onClick={() => { setLoading(true); setApiError(false); window.location.reload() }}
                  style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--brand)', color: '#fff', border: 'none', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                >
                  Retry
                </button>
              </div>
            )}

            {loading && !apiError && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                borderLeft: '3px solid var(--bg-elevated)',
                borderBottom: '1px solid var(--bg-border)',
                padding: '18px 24px',
              }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 60, height: 18, borderRadius: 999, background: 'var(--bg-elevated)' }} />
                  <div style={{ width: 80, height: 18, borderRadius: 4, background: 'var(--bg-elevated)' }} />
                </div>
                <div style={{ width: '70%', height: 16, borderRadius: 4, background: 'var(--bg-elevated)', marginBottom: 8 }} />
                <div style={{ width: '90%', height: 13, borderRadius: 4, background: 'var(--bg-elevated)' }} />
              </div>
            ))}

            {!loading && !apiError && filtered.length === 0 && (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>No events match your filters</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Try widening the signal or protocol selection</div>
                <button
                  onClick={() => { setSignalFilter('All'); setProtocolFilter(new Set(PROTOCOLS)) }}
                  style={{ marginTop: 16, padding: '6px 16px', borderRadius: 6, border: '1px solid var(--bg-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                >
                  Clear filters
                </button>
              </div>
            )}

            {!loading && filtered.map(event => (
              <FeedCard
                key={event.id}
                event={event}
                showActions={connected}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{
          borderLeft: '1px solid var(--bg-border)',
          overflowY: 'auto',
          padding: '20px 16px',
        }}>
          {/* Wallet Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
              Account
            </div>
            {connected ? (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--bg-border)',
                borderRadius: 8,
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Connected as</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {address?.slice(0, 8)}...{address?.slice(-6)}
                </div>
              </div>
            ) : (
              <button
                onClick={connect}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 7,
                  border: 'none',
                  background: 'var(--brand)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer',
                }}
              >
                Connect Wallet
              </button>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--bg-border)', marginBottom: 24 }} />

          {/* Trending Leaderboard */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
              On-Chain Sentiment
            </div>
            
            {!stats?.trending_signals || stats.trending_signals.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                No community signals yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.trending_signals.map((sig: any) => {
                  const totalVotes = sig.bullish + sig.bearish;
                  const bullPercent = totalVotes > 0 ? (sig.bullish / totalVotes) * 100 : 50;
                  
                  return (
                    <div key={sig.id} style={{ 
                      background: 'var(--bg-surface)', 
                      border: '1px solid var(--bg-border)', 
                      borderRadius: 10, 
                      padding: '14px',
                      transition: 'transform 0.15s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sig.title}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--bull)' }}>▲ {sig.bullish}</span>
                          <span style={{ fontSize: 11, color: 'var(--anom)' }}>▼ {sig.bearish}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          💎 <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sig.tips}</span> tips
                        </div>
                      </div>

                      {/* Sentiment bar */}
                      <div style={{ height: 3, background: 'var(--anom)', borderRadius: 1.5, display: 'flex', overflow: 'hidden' }}>
                        <div style={{ width: `${bullPercent}%`, background: 'var(--bull)', height: '100%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 24, fontStyle: 'italic' }}>
            Community sentiment is pulled directly from the Clarity contract. Tip 1 STX to boost a signal.
          </div>
        </div>

      </div>
    </div>
  )
}
