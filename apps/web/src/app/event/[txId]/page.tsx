'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Share2 } from 'lucide-react'
import SignalTag from '@/components/SignalTag'
import { getSignal, timeAgo } from '@/lib/signals'
import { fmtSTX, fmtUSD } from '@/lib/stx'
import { getApiUrl } from '@/lib/config'
import type { FeedEvent } from '@/lib/types'
import { useToast } from '@/components/Toast'

const Nav = dynamic(() => import('@/components/Nav'), { ssr: false })
const API = getApiUrl()

const SIG_BG: Record<string, string> = {
  bullish: '#0F2E1A', neutral: '#1A1F2E', risk: '#2E220A', anomaly: '#2E0F0F',
}

export default function EventDetailPage() {
  const params = useParams()
  const txId = params.txId as string
  const [event, setEvent] = useState<FeedEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!txId) return
    fetch(`${API}/api/v1/feed/${encodeURIComponent(txId)}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (data) setEvent(data)
        setLoading(false)
      })
      .catch(() => { setLoading(false); setNotFound(true) })
  }, [txId])

  const handleShare = () => {
    const url = window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast('Link copied to clipboard', 'success', undefined, 3000))
    } else {
      toast('Copy this URL: ' + url, 'info', undefined, 8000)
    }
  }

  const sig = event ? getSignal(event.signal) : null

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 20px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/feed" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>
            <ArrowLeft size={15} /> Back to Feed
          </Link>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Loading event…
          </div>
        )}

        {notFound && !loading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Event not found</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              This transaction may have aged out of the recent event window (200 events).
            </div>
            <Link href="/feed" style={{ color: 'var(--brand)', fontSize: 13 }}>Browse the live feed →</Link>
          </div>
        )}

        {event && sig && (
          <>
            <div style={{
              background: SIG_BG[event.signal] ?? 'var(--bg-surface)',
              border: `1px solid ${sig.border}`,
              borderLeft: `4px solid ${sig.border}`,
              borderRadius: 12,
              padding: '28px 32px',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SignalTag signal={event.signal} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleShare}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: '1px solid var(--bg-border)',
                      color: 'var(--text-secondary)', borderRadius: 6, padding: '6px 12px',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    <Share2 size={13} /> Share
                  </button>
                  <a
                    href={event.explorer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: '1px solid var(--bg-border)',
                      color: 'var(--text-secondary)', borderRadius: 6, padding: '6px 12px',
                      fontSize: 12, textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={13} /> Explorer
                  </a>
                </div>
              </div>

              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.015em', marginBottom: 10, lineHeight: 1.3 }}>
                {event.title}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
                {event.description}
              </p>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Amount</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                    {fmtSTX(event.stx_amount)} STX
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmtUSD(event.usd_amount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Protocol</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{event.protocol}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Wallet Archetype</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{event.wallet_archetype}</div>
                </div>
              </div>

              {event.context && (
                <div style={{
                  marginTop: 20, background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
                  borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic',
                }}>
                  {event.context}
                </div>
              )}
            </div>

            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
              borderRadius: 10, padding: '20px 24px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Transaction Details
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'TX ID', value: event.tx_id, mono: true },
                  { label: 'Wallet Address', value: event.wallet_address, mono: true },
                  { label: 'Timestamp', value: new Date(event.timestamp).toLocaleString(), mono: false },
                  { label: 'Rule ID', value: event.rule_id, mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 130, flexShrink: 0 }}>{label}</span>
                    <Link
                      href={label === 'Wallet Address' ? `/wallet?address=${value}` : '#'}
                      style={{
                        fontSize: 12,
                        color: label === 'Wallet Address' ? 'var(--brand)' : 'var(--text-secondary)',
                        fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
                        wordBreak: 'break-all',
                        textDecoration: 'none',
                      }}
                    >
                      {value}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
