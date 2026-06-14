'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { FeedEvent } from '@/lib/types'
import ShareButton from './ShareButton'
import { useToast } from './Toast'

interface Props {
  event: FeedEvent | null
  onClose: () => void
}

function signalColor(signal: string): string {
  switch (signal?.toLowerCase()) {
    case 'bullish': return '#22C55E'
    case 'risk':    return '#F59E0B'
    case 'anomaly': return '#EF4444'
    default:        return '#94A3B8'
  }
}

function archetypeColor(archetype: string): string {
  if (archetype?.includes('Whale')) return '#7C3AED'
  if (archetype?.includes('LP'))    return '#06B6D4'
  if (archetype?.includes('DeFi'))  return '#F59E0B'
  if (archetype?.includes('New'))   return '#94A3B8'
  return '#64748B'
}

function fmtSTX(n: number): string {
  return n?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '0'
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n ?? 0)
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function EventDrawer({ event, onClose }: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const { success } = useToast()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const copyAddress = () => {
    if (!event) return
    navigator.clipboard.writeText(event.wallet_address).then(() => {
      setCopied(true)
      success('Wallet address copied')
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <AnimatePresence>
      {event && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 49,
            }}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 'min(380px, 100vw)',
              background: 'var(--bg-base)',
              borderLeft: '1px solid var(--bg-border)',
              zIndex: 50,
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--bg-border)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Signal Detail</span>
              <button
                onClick={onClose}
                aria-label="Close signal detail"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
              >✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: signalColor(event.signal) + '22',
                  color: signalColor(event.signal),
                  border: `1px solid ${signalColor(event.signal)}44`,
                  textTransform: 'capitalize',
                }}>{event.signal}</span>
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: archetypeColor(event.wallet_archetype) + '22',
                  color: archetypeColor(event.wallet_archetype),
                  border: `1px solid ${archetypeColor(event.wallet_archetype)}44`,
                }}>{event.wallet_archetype}</span>
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11,
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--bg-border)',
                }}>{event.protocol}</span>
              </div>

              {/* Title + Description */}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
                  {event.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {event.description}
                </div>
                {event.context && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                    {event.context}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Amount
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                  {fmtSTX(event.stx_amount)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>STX</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  {fmtUSD(event.usd_amount)}
                </div>
              </div>

              {/* Metadata */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Row label="Timestamp" value={fmtTime(event.timestamp)} mono />
                <Row label="TX ID" value={`${event.tx_id?.slice(0, 12)}…${event.tx_id?.slice(-8)}`} mono />

                {/* Wallet address with copy */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Wallet</span>
                  <button
                    onClick={copyAddress}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                      color: copied ? '#22C55E' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {event.wallet_address?.slice(0, 8)}…{event.wallet_address?.slice(-6)}
                    <span style={{ fontSize: 10, color: copied ? '#22C55E' : 'var(--text-muted)' }}>
                      {copied ? '✓ copied' : 'copy'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                <a
                  href={event.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block', textAlign: 'center', padding: '10px',
                    borderRadius: 8, border: '1px solid var(--bg-border)',
                    background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                    fontSize: 13, textDecoration: 'none', fontWeight: 500,
                  }}
                >
                  View on Explorer ↗
                </a>
                <button
                  onClick={() => { router.push(`/wallet?address=${event.wallet_address}`); onClose() }}
                  style={{
                    display: 'block', width: '100%', padding: '10px',
                    borderRadius: 8, border: 'none',
                    background: 'var(--brand)', color: '#fff',
                    fontSize: 13, cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  Analyze Wallet →
                </button>
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
                  <ShareButton event={event} />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{
        fontSize: 12, color: 'var(--text-secondary)',
        fontFamily: mono ? 'JetBrains Mono, monospace' : undefined,
      }}>{value}</span>
    </div>
  )
}
