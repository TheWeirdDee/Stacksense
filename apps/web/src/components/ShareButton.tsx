'use client'

import { Share2 } from 'lucide-react'
import { useToast } from './Toast'
import { fmtSTX, fmtUSD } from '@/lib/stx'

interface ShareableEvent {
  title: string
  signal: string
  stx_amount?: number
  usd_amount?: number
  wallet_archetype?: string
  protocol?: string
}

export default function ShareButton({ event, compact = false }: { event: ShareableEvent; compact?: boolean }) {
  const { success, info } = useToast()

  const buildUrls = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://stacksense.io'
    const params = new URLSearchParams({
      title: event.title,
      signal: event.signal || 'neutral',
    })
    if (event.stx_amount) params.set('stx', fmtSTX(event.stx_amount))
    if (event.usd_amount) params.set('usd', fmtUSD(event.usd_amount))
    if (event.wallet_archetype) params.set('archetype', event.wallet_archetype)
    if (event.protocol) params.set('protocol', event.protocol)

    const ogUrl = `${origin}/api/og/event?${params.toString()}`
    const pageUrl = `${origin}/feed`
    const text = `${event.signal?.toUpperCase() || 'SIGNAL'}: ${event.title} — tracked live on StackSense`
    return { ogUrl, pageUrl, text }
  }

  const handleShare = async () => {
    const { pageUrl, ogUrl, text } = buildUrls()
    // Native share sheet (mobile / supported browsers).
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'StackSense Signal', text, url: pageUrl })
        return
      } catch {
        // user cancelled or unsupported — fall through to X intent
      }
    }
    // Copy the OG preview link, then open the X compose intent.
    try {
      await navigator.clipboard.writeText(ogUrl)
      success('Share image link copied')
    } catch {
      info('Opening share…')
    }
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Share this signal"
      title="Share signal"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        color: 'var(--text-muted)',
        border: '1px solid var(--bg-border)',
        borderRadius: 6,
        padding: compact ? '5px 8px' : '6px 12px',
        fontSize: compact ? 11 : 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <Share2 size={compact ? 12 : 14} />
      {!compact && 'Share'}
    </button>
  )
}
