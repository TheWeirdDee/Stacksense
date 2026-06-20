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
import { useWindowSize } from '@/hooks/useWindowSize'
import type { FeedEvent } from '@/lib/types'
import { Star, Eye, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/Toast'

interface Props {
  event: FeedEvent
  showActions: boolean
  onVote?: (direction: 'bull' | 'bear') => void
  onTip?: () => void
  localStats?: { bull: number, bear: number, tips: number }
  isBookmarked?: boolean
  isWatched?: boolean
  onToggleBookmark?: () => void
  onToggleWatch?: () => void
}

type ActionState = 'idle' | 'pending' | 'done'

export default function FeedCard({ 
  event, 
  showActions = false,
  onVote,
  onTip,
  localStats = { bull: 0, bear: 0, tips: 0 },
  isBookmarked = false,
  isWatched = false,
  onToggleBookmark,
  onToggleWatch,
}: Props) {
  if (!event) return null
  const { isMobile } = useWindowSize()
  const { toast } = useToast()
  const sig = getSignal(event.signal)
  const [tipState, setTipState] = useState<ActionState>('idle')
  const [voteState, setVoteState] = useState<'idle' | 'bullish' | 'bearish'>('idle')
  const [showFiat, setShowFiat] = useState(false)

  // Live fiat valuation derived from the event's CoinGecko-priced USD amount.
  const unitPrice = event.stx_amount > 0 && event.usd_amount ? event.usd_amount / event.stx_amount : null

  const handleTip = () => {
    if (tipState !== 'idle') return
    setTipState('pending')
    
    const loadingToastId = toast(
      `Broadcasting tip of 1 STX for "${event.title}"...`,
      'loading',
      undefined,
      0
    )

    contractTipSignal(
      event.id,
      (txId) => {
        setTipState('done')
        onTip?.()
        toast(
          `🎉 Tip transaction broadcasted successfully!`,
          'success',
          { label: 'View Tx', href: `https://explorer.stacks.co/txid/${txId}?chain=mainnet` },
          10000
        )
      },
      () => {
        setTipState('idle')
        toast('Tip cancelled by user', 'info', undefined, 4000)
      }
    )
    setTimeout(() => setTipState(s => s === 'pending' ? 'idle' : s), 20_000)
  }

  const handleVote = (direction: 'bullish' | 'bearish') => {
    if (voteState !== 'idle') return
    setVoteState(direction)
    const fn = direction === 'bullish' ? contractVoteBullish : contractVoteBearish

    const loadingToastId = toast(
      `Broadcasting ${direction === 'bullish' ? 'bull' : 'bear'} vote for "${event.title}"...`,
      'loading',
      undefined,
      0
    )

    fn(
      event.id,
      (txId: string) => {
        onVote?.(direction === 'bullish' ? 'bull' : 'bear')
        toast(
          `🎉 Vote transaction broadcasted successfully!`,
          'success',
          { label: 'View Tx', href: `https://explorer.stacks.co/txid/${txId}?chain=mainnet` },
          10000
        )
      },
      () => {
        setVoteState('idle')
        toast('Vote cancelled by user', 'info', undefined, 4000)
      }
    )
  }

  const displayTips = localStats.tips || 0
  const displayBull = localStats.bull || 0
  const displayBear = localStats.bear || 0

  return (
    <div
      style={{
        borderLeft: `3px solid ${sig.border}`,
        borderBottom: '1px solid var(--bg-border)',
        padding: isMobile ? '14px 16px' : '18px 24px',
        background: 'var(--bg-base)',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if(!isMobile) e.currentTarget.style.background = 'var(--bg-surface)' }}
      onMouseLeave={e => { if(!isMobile) e.currentTarget.style.background = 'var(--bg-base)' }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onToggleWatch && (
            <button
              onClick={onToggleWatch}
              title={isWatched ? 'Remove address from watchlist' : 'Add address to watchlist'}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isWatched ? '#3B82F6' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
                transition: 'color 0.15s, transform 0.1s',
              }}
            >
              <Eye size={14} style={{ fill: isWatched ? 'rgba(59, 130, 246, 0.2)' : 'none' }} />
            </button>
          )}
          
          {onToggleBookmark && (
            <button
              onClick={onToggleBookmark}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark transaction'}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isBookmarked ? '#F59E0B' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
                transition: 'color 0.15s, transform 0.1s',
              }}
            >
              <Star size={14} style={{ fill: isBookmarked ? 'rgba(245, 158, 11, 0.2)' : 'none' }} />
            </button>
          )}

          <Link
            href={`/event/${event.tx_id}`}
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}
            title="Permalink"
          >
            <Share2 size={11} />
          </Link>
          <a
            href={event.explorer_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 11, color: 'var(--brand-text)', textDecoration: 'none', flexShrink: 0 }}
          >
            Explorer ↗
          </a>
        </div>
      </div>

      <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        {event.title}
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>
        {event.description}
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isMobile ? 6 : 12, 
        flexWrap: 'wrap', 
        marginBottom: showActions ? 12 : 0 
      }}>
        <span
          style={{
            position: 'relative',
            fontSize: 13,
            color: 'var(--text-mono)',
            fontFamily: 'JetBrains Mono, monospace',
            cursor: unitPrice ? 'help' : 'default',
            borderBottom: unitPrice ? '1px dotted var(--bg-border)' : 'none',
          }}
          onMouseEnter={() => setShowFiat(true)}
          onMouseLeave={() => setShowFiat(false)}
        >
          {fmtSTX(event.stx_amount)} STX
          {showFiat && unitPrice && (
            <span
              role="tooltip"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                zIndex: 20,
                whiteSpace: 'nowrap',
                background: 'var(--bg-elevated, #1a1a1a)',
                border: '1px solid var(--bg-border)',
                borderRadius: 8,
                padding: '8px 10px',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
              }}
            >
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                ≈ {fmtUSD(event.usd_amount)}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                @ {fmtUSD(unitPrice)} / STX · live
              </span>
            </span>
          )}
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
        {event.is_anomaly && event.multiplier && event.multiplier > 1 && (
          <>
            <span style={{ color: 'var(--bg-border)' }}>·</span>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#EF4444',
              background: '#2E0F0F',
              border: '1px solid #EF444444',
              borderRadius: 4,
              padding: '1px 6px',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {event.multiplier.toFixed(1)}× above baseline
            </span>
          </>
        )}
      </div>

      {showActions && (
        <div style={{ 
          display: 'flex', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 8, 
          paddingTop: 12, 
          borderTop: '1px solid var(--bg-border)', 
          marginTop: 8 
        }}>
          <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
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
                flex: isMobile ? 1 : 'none',
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
                flex: isMobile ? 1 : 'none',
              }}
            >
              {voteState === 'bullish' ? '✓ Bull' : `▲ Bull (${displayBull})`}
            </button>
          </div>

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
              width: isMobile ? '100%' : 'auto',
            }}
          >
            {voteState === 'bearish' ? '✓ Bear' : `▼ Bear (${displayBear})`}
          </button>

          {!isMobile && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Live Feed
            </span>
          )}
        </div>
      )}
    </div>
  )
}
