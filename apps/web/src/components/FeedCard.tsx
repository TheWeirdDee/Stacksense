'use client'

import { useState } from 'react'
import SignalTag from './SignalTag'
import { getSignal, timeAgo } from '@/lib/signals'
import { fmtSTX, fmtUSD } from '@/lib/stx'
import { 
  contractTipSignal, 
  contractVoteBullish, 
  contractVoteBearish 
} from '@/lib/contract'
import type { FeedEvent } from '@/lib/types'

interface Props {
  event: FeedEvent
  showActions: boolean  // true when wallet is connected
  onVote?: (direction: 'bull' | 'bear') => void
  onTip?: () => void
  localStats?: { bull: number, bear: number, tips: number }
}

type ActionState = 'idle' | 'pending' | 'done'

export default function FeedCard({ 
  event, 
  showActions = false,
  onVote,
  onTip,
  localStats = { bull: 0, bear: 0, tips: 0 }
}: Props) {
  const sig = getSignal(event.signal)
  const [tipState, setTipState] = useState<ActionState>('idle')
  const [voteState, setVoteState] = useState<'idle' | 'bullish' | 'bearish'>('idle')

  const handleTip = () => {
    if (tipState !== 'idle') return
    setTipState('pending')
    contractTipSignal(event.id, (txId) => {
      console.log('Tip confirmed:', txId)
      setTipState('done')
      onTip?.()
    })
    setTimeout(() => setTipState(s => s === 'pending' ? 'idle' : s), 15_000)
  }

  const handleVote = (direction: 'bullish' | 'bearish') => {
    if (voteState !== 'idle') return
    setVoteState(direction)
    const fn = direction === 'bullish' ? contractVoteBullish : contractVoteBearish
    fn(event.id, (txId: string) => {
      console.log('Vote confirmed:', txId)
      onVote?.(direction === 'bullish' ? 'bull' : 'bear')
    })
  }

  // Use only session-local stats for the main feed to avoid API flooding
  const displayTips = localStats.tips || 0
  const displayBull = localStats.bull || 0
  const displayBear = localStats.bear || 0

  return (
    <div
      style={{
        borderLeft: `3px solid ${sig.border}`,
        borderBottom: '1px solid var(--bg-border)',
        padding: '18px 24px',
        background: 'var(--bg-base)',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-base)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <SignalTag signal={event.signal} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {event.wallet_archetype}
          </span>
          <span style={{ fontSize: 11, color: 'var(--bg-border)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {timeAgo(event.timestamp)}
          </span>
        </div>
        <a
          href={event.explorer_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: 'var(--brand-text)', textDecoration: 'none', flexShrink: 0 }}
        >
          Explorer ↗
        </a>
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        {event.title}
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>
        {event.description}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: showActions ? 12 : 0 }}>
        <span style={{ fontSize: 13, color: 'var(--text-mono)', fontFamily: 'JetBrains Mono, monospace' }}>
          {fmtSTX(event.stx_amount)} STX
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {fmtUSD(event.usd_amount)}
        </span>
        {event.context && (
          <>
            <span style={{ color: 'var(--bg-border)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {event.context}
            </span>
          </>
        )}
      </div>

      {showActions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid var(--bg-border)', marginTop: 8 }}>
          <button
            onClick={handleTip}
            disabled={tipState !== 'idle'}
            style={{
              background: tipState === 'done' ? 'var(--bull-bg)' : 'transparent',
              color: tipState === 'done' ? 'var(--bull)' : 'var(--text-muted)',
              border: `1px solid ${tipState === 'done' ? 'var(--bull)' : 'var(--bg-border)'}`,
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              cursor: tipState === 'idle' ? 'pointer' : 'default',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {tipState === 'done' ? '✓ Tipped' : tipState === 'pending' ? '...' : `↑ Tip (${displayTips})`}
          </button>

          <button
            onClick={() => handleVote('bullish')}
            disabled={voteState !== 'idle'}
            style={{
              background: voteState === 'bullish' ? 'var(--bull-bg)' : 'transparent',
              color: voteState === 'bullish' ? 'var(--bull)' : 'var(--text-muted)',
              border: `1px solid ${voteState === 'bullish' ? 'var(--bull)' : 'var(--bg-border)'}`,
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              cursor: voteState === 'idle' ? 'pointer' : 'default',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {voteState === 'bullish' ? '✓ Bull' : `▲ Bull (${displayBull})`}
          </button>

          <button
            onClick={() => handleVote('bearish')}
            disabled={voteState !== 'idle'}
            style={{
              background: voteState === 'bearish' ? 'var(--anom-bg)' : 'transparent',
              color: voteState === 'bearish' ? 'var(--anom)' : 'var(--text-muted)',
              border: `1px solid ${voteState === 'bearish' ? 'var(--anom)' : 'var(--bg-border)'}`,
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              cursor: voteState === 'idle' ? 'pointer' : 'default',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {voteState === 'bearish' ? '✓ Bear' : `▼ Bear (${displayBear})`}
          </button>

          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Live Feed
          </span>
        </div>
      )}
    </div>
  )
}
