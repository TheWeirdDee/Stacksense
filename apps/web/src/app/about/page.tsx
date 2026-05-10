'use client'

import dynamic from 'next/dynamic'
const Nav = dynamic(() => import('@/components/Nav'), { ssr: false })
import SignalTag from '@/components/SignalTag'
import { useWindowSize } from '@/hooks/useWindowSize'

const SIGNALS = [
  { signal: 'bullish', def: 'Large liquidity provision, significant swaps into STX, or sBTC bridge inflows above 10,000 STX.', ex: 'Whale LP entry on Velar' },
  { signal: 'neutral', def: 'Standard protocol interaction within 1σ of the 30-day mean volume. Routine utility events.', ex: 'Standard STX transfer' },
  { signal: 'risk',    def: 'Large liquidity withdrawals, vault paydowns indicating potential STX unlocks, or significant outflows.', ex: 'Large USDA burn detected' },
  { signal: 'anomaly', def: 'Statistical outliers exceeding 2σ from the 30-day baseline, or patterns not seen in the prior 90 days.', ex: 'Arkadiko vault liquidated' },
]

const PROTOCOLS = [
  { name: 'ALEX', coverage: 'DEX swaps, liquidity add/remove, bridge interactions' },
  { name: 'Arkadiko', coverage: 'Vault creation, USDA mint/burn, collateral liquidations' },
  { name: 'Velar', coverage: 'Liquidity provision, whale LP entries' },
  { name: 'sBTC Bridge', coverage: 'Large BTC migration deposits' },
  { name: 'Native STX', coverage: 'Whale transfers, transfers to new wallets' },
]

export default function MethodologyPage() {
  const { isMobile } = useWindowSize()

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Nav />

      <div style={{ 
        maxWidth: 700, 
        margin: '0 auto', 
        padding: isMobile ? '32px 16px 60px' : '56px 24px 80px' 
      }}>

        <div style={{ fontSize: 11, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
          The Methodology
        </div>
        <h1 style={{ fontSize: isMobile ? 28 : 34, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 16, lineHeight: 1.15 }}>
          How StackSense Works
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 40 }}>
          StackSense is a real-time intelligence layer for the Stacks blockchain. Instead of showing raw hashes and hex data, we translate on-chain activity into plain-English signals anyone can understand.
        </p>

        <div style={{ height: 1, background: 'var(--bg-border)', marginBottom: 36 }} />

        {/* Pipeline */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, letterSpacing: '-0.01em' }}>The Ingestion Pipeline</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
          gap: 12, 
          marginBottom: 40 
        }}>
          {[
            { n: '01', t: 'Capture', d: 'Hiro Stacks API polled every 10 seconds. Confirmed blocks only — no mempool noise.' },
            { n: '02', t: 'Interpret', d: 'Transactions matched against protocol-specific rules. Anomaly detection flags statistical outliers above 2σ.' },
            { n: '03', t: 'Signal', d: 'Tagged Bullish, Neutral, Risk, or Anomaly — then broadcast via WebSocket within seconds.' },
          ].map(s => (
            <div key={s.n} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: '20px 18px' }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--brand)', marginBottom: 10, letterSpacing: '0.06em' }}>{s.n}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{s.t}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.d}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--bg-border)', marginBottom: 36 }} />

        {/* Signal definitions */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.01em' }}>Signal Definitions</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
          Every event receives exactly one signal tag, assigned by the rule engine — not manually.
        </p>
        <div style={{ border: '1px solid var(--bg-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 40 }}>
          {SIGNALS.map((s, i) => (
            <div key={s.signal} style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '90px 1fr',
              gap: isMobile ? 8 : 16,
              padding: isMobile ? '16px' : '16px 20px',
              borderBottom: i < SIGNALS.length - 1 ? '1px solid var(--bg-border)' : 'none',
              alignItems: 'start',
            }}>
              <SignalTag signal={s.signal} />
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55, marginBottom: 4 }}>{s.def}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>e.g. "{s.ex}"</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--bg-border)', marginBottom: 36 }} />

        {/* Protocol coverage */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, letterSpacing: '-0.01em' }}>Protocol Coverage</h2>
        <div style={{ border: '1px solid var(--bg-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 40 }}>
          {PROTOCOLS.map((p, i) => (
            <div key={p.name} style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              padding: isMobile ? '16px' : '14px 20px',
              borderBottom: i < PROTOCOLS.length - 1 ? '1px solid var(--bg-border)' : 'none',
              gap: isMobile ? 4 : 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', minWidth: 120 }}>{p.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.coverage}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--bg-border)', marginBottom: 36 }} />

        {/* What it is not */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, letterSpacing: '-0.01em' }}>What StackSense Is Not</h2>
        {[
          ['Not financial advice', 'All signals are observations about on-chain activity — they describe what happened, not what will happen.'],
          ['Not a trading platform', 'StackSense surfaces information. Execution happens elsewhere.'],
          ['Not a general explorer', 'Opinionated and Stacks-specific by design. For raw data, use the Stacks Explorer.'],
        ].map(([title, desc]) => (
          <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--bg-border)', flexShrink: 0, marginTop: 7 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
