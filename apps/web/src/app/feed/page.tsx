'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
const Nav = dynamic(() => import('@/components/Nav'), { ssr: false })
import FeedCard from '@/components/FeedCard'
import { useWallet } from '@/lib/wallet'
import { useWindowSize } from '@/hooks/useWindowSize'

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:3001'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://127.0.0.1:3001/ws'

const SIGNALS = ['All', 'Bullish', 'Neutral', 'Risk', 'Anomaly']
const PROTOCOLS = ['All', 'ALEX', 'Arkadiko', 'Velar', 'sBTC Bridge', 'Native STX', 'StackSense']

type WSStatus = 'connecting' | 'live' | 'disconnected'

export default function FeedPage() {
  const { isMobile, isTablet, isDesktop } = useWindowSize()
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSentiment, setShowSentiment] = useState(false)

  const [events, setEvents] = useState<any[]>([])
  const searchParams = useSearchParams()
  const isMyActivity = searchParams.get('my') === 'true'
  
  const [myEvents, setMyEvents] = useState<any[]>([])
  const [myLoading, setMyLoading] = useState(false)
  const [myError, setMyError] = useState<string | null>(null)

  const [paused, setPaused] = useState(false)
  const [buffered, setBuffered] = useState<any[]>([])
  const [wsStatus, setWsStatus] = useState<WSStatus>('connecting')
  const [signalFilter, setSignalFilter] = useState('All')
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null)
  
  const [localVotes, setLocalVotes] = useState<Record<string, { bull: number, bear: number, tips: number }>>({})
  
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)
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
      })
      .catch(() => {
        setLoading(false)
        setApiError(true)
      })
  }, [])

  // My Activity fetch
  useEffect(() => {
    if (!connected || !address || !isMyActivity) return
    
    setMyLoading(true)
    setMyError(null)
    
    fetch(`${API}/api/v1/wallet/${address}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setMyEvents(data.events || [])
        setMyLoading(false)
      })
      .catch(err => {
        console.error('[MyActivity] Failed:', err)
        setMyError('Could not load your activity. The API may be unavailable.')
        setMyLoading(false)
      })
  }, [connected, address, isMyActivity])

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

  // WebSocket connection
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
        if (msg.type === 'event') {
          if (paused) {
            setBuffered(b => [msg.data, ...b])
          } else {
            setEvents(ev => [msg.data, ...ev].slice(0, 200))
          }
        }
      } catch {}
    }

    ws.onclose = () => {
      if (retryCount.current < 5) {
        const delay = Math.min(1000 * 2 ** retryCount.current, 16000)
        retryCount.current++
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

  const resume = () => {
    setPaused(false)
    if (buffered.length > 0) {
      setEvents(ev => [...buffered, ...ev].slice(0, 200))
      setBuffered([])
    }
  }

  const handleLocalVote = (eventId: string, direction: 'bull' | 'bear') => {
    setLocalVotes(prev => ({
      ...prev,
      [eventId]: {
        bull: (prev[eventId]?.bull || 0) + (direction === 'bull' ? 1 : 0),
        bear: (prev[eventId]?.bear || 0) + (direction === 'bear' ? 1 : 0),
        tips: prev[eventId]?.tips || 0,
      }
    }))
  }

  const handleLocalTip = (eventId: string) => {
    setLocalVotes(prev => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        bull: prev[eventId]?.bull || 0,
        bear: prev[eventId]?.bear || 0,
        tips: (prev[eventId]?.tips || 0) + 1,
      }
    }))
  }

  const currentEvents = isMyActivity ? myEvents : events
  const filtered = currentEvents.filter(e => {
    const sigMatch = signalFilter === 'All' || e.signal === signalFilter.toLowerCase()
    const protoMatch = !selectedProtocol || e.protocol.toLowerCase() === selectedProtocol.toLowerCase()
    return sigMatch && protoMatch
  })

  const statusColor = wsStatus === 'live' ? '#22C55E' : wsStatus === 'connecting' ? '#F59E0B' : '#EF4444'
  const statusLabel = wsStatus === 'live' ? 'Live' : wsStatus === 'connecting' ? 'Syncing...' : 'Disconnected'

  const SidebarContent = () => (
    <>
      {isMobile && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Filters</span>
          <button
            onClick={() => setShowSidebar(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}
          >✕</button>
        </div>
      )}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
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
                  onClick={() => { setSignalFilter(s); if(isMobile) setShowSidebar(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', borderRadius: 6, border: 'none',
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 13, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s !== 'All' && (
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: s === 'Bullish' ? '#22C55E' : s === 'Neutral' ? '#94A3B8' : s === 'Risk' ? '#F59E0B' : '#EF4444',
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

        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Protocol
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {PROTOCOLS.map(p => (
              <button
                key={p}
                onClick={() => { setSelectedProtocol(p === 'All' ? null : p); if(isMobile) setShowSidebar(false); }}
                style={{
                  background: selectedProtocol === p || (p === 'All' && !selectedProtocol) ? 'var(--brand)' : 'var(--bg-elevated)',
                  color: selectedProtocol === p || (p === 'All' && !selectedProtocol) ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--bg-border)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--bg-border)' }} />

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
      </div>
    </>
  )

  const SentimentContent = () => (
    <div style={{ padding: isDesktop ? '20px 16px' : '0' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
        Community Sentiment
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.slice(0, 5).map(sig => {
          const l = localVotes[sig.id] || { bull: 0, bear: 0, tips: 0 };
          const bullPercent = (l.bull + l.bear) > 0 ? (l.bull / (l.bull + l.bear)) * 100 : 50;
          return (
            <div key={sig.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: '14px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{sig.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11 }}>▲ {l.bull} <span style={{ color: 'var(--text-muted)' }}>/</span> ▼ {l.bear}</div>
                <div style={{ fontSize: 11 }}>💎 {l.tips} tips</div>
              </div>
              <div style={{ height: 3, background: 'var(--anom)', borderRadius: 1.5, display: 'flex', overflow: 'hidden' }}>
                <div style={{ width: `${bullPercent}%`, background: 'var(--bull)', height: '100%' }} />
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 20, fontStyle: 'italic' }}>
        Community votes reset on page refresh — on-chain persistence coming soon.
      </div>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      
      {/* Mobile filter toggle bar */}
      {!isDesktop && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid var(--bg-border)',
          background: 'var(--bg-surface)',
          overflowX: 'auto',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              background: showSidebar ? 'var(--brand)' : 'var(--bg-elevated)',
              color: showSidebar ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--bg-border)',
              padding: '5px 12px', borderRadius: 6,
              fontSize: 12, cursor: 'pointer', flexShrink: 0,
            }}
          >
            ⚙ Filters
          </button>
          {isTablet && (
             <button
              onClick={() => setShowSentiment(!showSentiment)}
              style={{
                background: showSentiment ? 'var(--brand)' : 'var(--bg-elevated)',
                color: showSentiment ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--bg-border)',
                padding: '5px 12px', borderRadius: 6,
                fontSize: 12, cursor: 'pointer', flexShrink: 0,
              }}
            >
              📊 Sentiment
            </button>
          )}
          {SIGNALS.map(s => (
            <button
              key={s}
              onClick={() => setSignalFilter(s)}
              style={{
                background: signalFilter === s ? 'var(--brand)' : 'var(--bg-elevated)',
                color: signalFilter === s ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--bg-border)',
                padding: '4px 10px', borderRadius: 6,
                fontSize: 11, cursor: 'pointer', flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop
          ? '280px 1fr 300px'
          : isTablet
            ? '240px 1fr'
            : '1fr',
        flex: 1,
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
      }}>

        {/* Sidebar — hidden on mobile unless toggled */}
        {(isDesktop || isTablet || showSidebar) && (
          <div style={{
            width: isDesktop ? 280 : isTablet ? 240 : '100%',
            height: '100%',
            overflowY: 'auto',
            borderRight: '1px solid var(--bg-border)',
            background: 'var(--bg-base)',
            ...(isMobile && showSidebar ? {
              position: 'fixed',
              top: 56,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 98,
              background: 'var(--bg-base)',
            } : {}),
          }}>
            <SidebarContent />
          </div>
        )}

        {/* Main feed area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          <div style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid var(--bg-border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>{isMyActivity ? 'My Activity' : 'Live Feed'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
                <span style={{ fontSize: 11, color: statusColor, fontFamily: 'JetBrains Mono, monospace' }}>{statusLabel}</span>
              </div>
            </div>
            
            {!isMyActivity && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {paused && buffered.length > 0 && <span style={{ fontSize: 11, color: 'var(--brand-text)' }}>{buffered.length} new</span>}
                <button
                  onClick={paused ? resume : () => setPaused(true)}
                  style={{
                    padding: '5px 14px', borderRadius: 6, border: '1px solid var(--bg-border)',
                    background: 'transparent', color: paused ? 'var(--brand-text)' : 'var(--text-secondary)', fontSize: 12,
                  }}
                >
                  {paused ? `Resume${buffered.length > 0 ? ` (${buffered.length})` : ''}` : 'Pause'}
                </button>
              </div>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {apiError && <div style={{ padding: '40px 24px', textAlign: 'center' }}>Backend not connected.</div>}
            {isMyActivity && myLoading && <div style={{ padding: '40px 24px', textAlign: 'center' }}>Loading your activity...</div>}
            
            {isMyActivity && !myLoading && myEvents.length === 0 && (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>No on-chain activity found for your wallet in the last 30 days.</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>StackSense tracks significant transactions above 5,000 STX.</div>
              </div>
            )}

            {!loading && !myLoading && filtered.length === 0 && !isMyActivity && (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No events match your filters</div>
              </div>
            )}

            {filtered.map(event => (
              <FeedCard
                key={event.id}
                event={event}
                showActions={!!address}
                onVote={(dir) => handleLocalVote(event.id, dir)}
                onTip={() => handleLocalTip(event.id)}
                localStats={localVotes[event.id]}
              />
            ))}
          </div>
        </div>

        {/* Right panel — desktop only */}
        {isDesktop && (
          <div style={{
            width: 300,
            height: '100%',
            overflowY: 'auto',
            borderLeft: '1px solid var(--bg-border)',
          }}>
             <div style={{ padding: '20px 16px' }}>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Account
                </div>
                {connected ? (
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Connected as</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                      {address?.slice(0, 8)}...{address?.slice(-6)}
                    </div>
                  </div>
                ) : (
                  <button onClick={connect} style={{ width: '100%', padding: '11px', borderRadius: 7, border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
                    Connect Wallet
                  </button>
                )}
              </div>
              <div style={{ height: 1, background: 'var(--bg-border)', marginBottom: 24 }} />
              <SentimentContent />
            </div>
          </div>
        )}
      </div>

      {/* Bottom drawer for tablet sentiment */}
      {isTablet && showSentiment && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--bg-border)',
          borderRadius: '16px 16px 0 0',
          padding: '24px 20px',
          zIndex: 99,
          maxHeight: '60vh',
          overflowY: 'auto',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Community Sentiment</span>
            <button
              onClick={() => setShowSentiment(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}
            >✕</button>
          </div>
          <SentimentContent />
        </div>
      )}
    </div>
  )
}
