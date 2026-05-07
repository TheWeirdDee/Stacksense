'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Nav from '@/components/Nav'
import FeedCard from '@/components/FeedCard'

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001'

export default function AnalyzePage() {
  const searchParams = useSearchParams()
  const [address, setAddress] = useState(searchParams?.get('address') ?? '')
  const [input, setInput] = useState(searchParams?.get('address') ?? '')
  const [result, setResult] = useState<any>(null)
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
    } catch {
      setError('No data found for this address, or the API is not running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const a = searchParams?.get('address')
    if (a) { setInput(a); run(a) }
  }, [])

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Nav />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
            Analyze
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Wallet Intelligence
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Reconstruct on-chain behavior for any Stacks address — archetype classification, protocol usage, and interpreted transaction history.
          </p>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: error ? 8 : 32 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run(input.trim())}
            placeholder="Enter Stacks address (SP...)"
            className="mono"
            style={{
              flex: 1,
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
            }}
          >
            {loading ? '...' : 'Analyze →'}
          </button>
        </div>

        {/* Inline error */}
        {error && (
          <div style={{ fontSize: 12, color: 'var(--anom)', marginBottom: 24, padding: '8px 12px', background: 'var(--anom-bg, #2E0F0F)', borderRadius: 6 }}>
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
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

        {/* Results */}
        {result && (
          <div>
            {/* Wallet summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Archetype', value: result.wallet?.archetype ?? '—' },
                { label: 'STX Moved (30d)', value: result.wallet?.total_stx_moved_30d ? `${Math.round(result.wallet.total_stx_moved_30d / 1000)}K STX` : '—' },
                { label: 'Top Protocol', value: result.wallet?.most_used_protocol ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '16px 18px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Events */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Transaction History
            </div>
            <div style={{ border: '1px solid var(--bg-border)', borderRadius: 8, overflow: 'hidden' }}>
              {result.events?.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                  No transactions above the StackSense threshold in the last 30 days.
                </div>
              ) : (
                result.events?.map((e: any) => <FeedCard key={e.id} event={e} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
