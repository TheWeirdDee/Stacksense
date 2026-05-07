'use client'
import SignalTag from './SignalTag'
import { useWallet } from '@/lib/wallet'
import { useState } from 'react'
import { sendTip, ONE_STX } from '@/lib/stx'

interface FeedEvent {
  id: string
  tx_id: string
  timestamp: string
  signal: string
  protocol: string
  title: string
  description: string
  context?: string
  stx_amount: number
  usd_amount: number
  wallet_address: string
  wallet_archetype: string
  explorer_url: string
  rule_id: string
}

const BORDER: Record<string, string> = {
  bullish: '#22C55E',
  neutral: '#94A3B8',
  risk: '#F59E0B',
  anomaly: '#EF4444',
}

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ALWAYS round STX to whole numbers
function fmtSTX(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export default function FeedCard({ event, isNew = false }: { event: FeedEvent; isNew?: boolean }) {
  const border = BORDER[event.signal] ?? '#94A3B8'
  const { connected } = useWallet()
  const [tipState, setTipState] = useState<'idle' | 'pending' | 'done'>('idle')
  const [hovered, setHovered] = useState(false)

  const handleTip = () => {
    if (!connected || tipState !== 'idle') return
    setTipState('pending')
    sendTip(
      ONE_STX,
      `StackSense tip: ${event.title.slice(0, 34)}`,
      () => {
        setTipState('done')
        setTimeout(() => setTipState('idle'), 4000)
      }
    )
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderLeft: `3px solid ${border}`,
        borderBottom: '1px solid var(--bg-border)',
        padding: '18px 24px',
        background: hovered ? 'var(--bg-surface)' : 'var(--bg-base)',
        transition: 'background 0.15s',
        animation: isNew ? 'slideIn 0.2s ease-out' : 'none',
        cursor: 'default',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SignalTag signal={event.signal} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {event.wallet_archetype}
          </span>
          <span style={{ color: 'var(--bg-border)', fontSize: 11 }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {timeAgo(event.timestamp)}
          </span>
        </div>
        <a
          href={event.explorer_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: 'var(--brand-text)', flexShrink: 0, marginLeft: 12 }}
        >
          Explorer ↗
        </a>
      </div>

      {/* Title */}
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5, lineHeight: 1.3 }}>
        {event.title}
      </div>

      {/* Description */}
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>
        {event.description}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="mono" style={{ fontSize: 13, color: 'var(--text-mono)', fontWeight: 500 }}>
            {fmtSTX(event.stx_amount)} STX
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {fmtUSD(event.usd_amount)}
          </span>
          {event.context && (
            <>
              <span style={{ color: 'var(--bg-border)', fontSize: 11 }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {event.context}
              </span>
            </>
          )}
        </div>

        {/* Tip button — only shown when wallet connected */}
        {connected && (
          <button
            onClick={handleTip}
            disabled={tipState !== 'idle'}
            style={{
              background: tipState === 'done' ? 'var(--bull-bg, #0F2E1A)' : 'transparent',
              color: tipState === 'done' ? '#22C55E' : 'var(--text-muted)',
              border: `1px solid ${tipState === 'done' ? '#22C55E' : 'var(--bg-border)'}`,
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              cursor: tipState === 'idle' ? 'pointer' : 'default',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            {tipState === 'pending' ? '...' : tipState === 'done' ? '✓ Tipped 1 STX' : '↑ Tip 1 STX'}
          </button>
        )}
      </div>
    </div>
  )
}
