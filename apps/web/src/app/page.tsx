'use client'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { useWallet } from '@/lib/wallet'

const TICKER = [
  { signal: 'bullish', label: 'Bullish', text: 'Whale Wallet added liquidity to ALEX', val: '142,000 STX' },
  { signal: 'anomaly', label: 'Anomaly', text: 'Arkadiko vault liquidated', val: '50,000 STX' },
  { signal: 'risk',    label: 'Risk',    text: 'Large USDA burn — vault paydown', val: '89,000 STX' },
  { signal: 'bullish', label: 'Bullish', text: 'sBTC bridge deposit detected', val: '200,000 STX' },
  { signal: 'bullish', label: 'Bullish', text: 'Whale LP entry on Velar', val: '67,000 STX' },
  { signal: 'anomaly', label: 'Anomaly', text: '3.8× spike — ALEX swap', val: '310,000 STX' },
]

const SIG_STYLES: Record<string, { color: string; bg: string }> = {
  bullish: { color: '#22C55E', bg: '#0F2E1A' },
  neutral: { color: '#94A3B8', bg: '#1A1F2E' },
  risk:    { color: '#F59E0B', bg: '#2E220A' },
  anomaly: { color: '#EF4444', bg: '#2E0F0F' },
}

const PREVIEW_EVENTS = [
  { signal: 'bullish', title: 'Whale Wallet added liquidity to ALEX', desc: 'A large liquidity provision of 142,000 STX ($189,260) was detected on ALEX AMM v2.', amount: '142,000 STX', usd: '$189,260', ctx: '3.2× larger than 7-day avg', time: '2m ago' },
  { signal: 'anomaly', title: 'Arkadiko Liquidation Event', desc: 'A vault was liquidated on Arkadiko. 50,000 STX of collateral was processed.', amount: '50,000 STX', usd: '$66,500', ctx: 'First liquidation in 4 days', time: '7m ago' },
  { signal: 'risk',    title: 'Large USDA Burn — Vault Paydown', desc: 'DeFi User burned 89,000 STX worth of USDA — potential STX unlock incoming.', amount: '89,000 STX', usd: '$118,370', ctx: '2.1× above 30-day avg', time: '14m ago' },
]

const SIG_BORDER: Record<string, string> = {
  bullish: '#22C55E', neutral: '#94A3B8', risk: '#F59E0B', anomaly: '#EF4444'
}

export default function LandingPage() {
  const { connected, connect } = useWallet()
  const doubled = [...TICKER, ...TICKER]

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Nav />

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '100px 40px 70px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
          borderRadius: 999, padding: '5px 16px', fontSize: 11,
          color: 'var(--text-secondary)', letterSpacing: '0.07em',
          textTransform: 'uppercase', marginBottom: 36,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          Live on Stacks Mainnet
        </div>

        <h1 style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.025em', marginBottom: 22 }}>
          On-chain intelligence<br />for <span style={{ color: 'var(--brand)' }}>Stacks</span>.
        </h1>

        <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 540, margin: '0 auto 40px' }}>
          Every significant Stacks transaction, translated into plain English. Connect your wallet to tip signals, vote on events, and unlock whale alerts.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!connected ? (
            <button
              onClick={connect}
              style={{
                background: 'var(--brand)', color: '#fff', padding: '13px 30px',
                borderRadius: 7, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer'
              }}
            >
              Connect Wallet →
            </button>
          ) : (
            <Link href="/feed" style={{
              background: 'var(--brand)', color: '#fff', padding: '13px 30px',
              borderRadius: 7, fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-block'
            }}>
              Go to Feed →
            </Link>
          )}
          <Link href="/about" style={{
            background: 'transparent', color: 'var(--text-primary)',
            border: '1px solid var(--bg-border)', padding: '13px 30px',
            borderRadius: 7, fontSize: 14, textDecoration: 'none', display: 'inline-block'
          }}>
            How It Works
          </Link>
        </div>
      </section>

      {/* TICKER */}
      <div style={{ borderTop: '1px solid var(--bg-border)', borderBottom: '1px solid var(--bg-border)', overflow: 'hidden', padding: '12px 0' }}>
        <div style={{ display: 'flex', gap: 56, animation: 'ticker 28s linear infinite', width: 'max-content' }}>
          {doubled.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
              <span style={{
                background: SIG_STYLES[item.signal].bg,
                color: SIG_STYLES[item.signal].color,
                padding: '2px 9px', borderRadius: 999,
                fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase'
              }}>
                {item.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.text}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FEED PREVIEW */}
      <section style={{ maxWidth: 900, margin: '80px auto', padding: '0 40px' }}>
        <div style={{ fontSize: 11, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
          Live Feed Preview
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>What's happening right now</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>Real interpretations. Updated every 10 seconds from Stacks mainnet.</p>

        <div style={{ border: '1px solid var(--bg-border)', borderRadius: 12, overflow: 'hidden' }}>
          {PREVIEW_EVENTS.map((e, i) => (
            <div key={i} style={{
              borderLeft: `3px solid ${SIG_BORDER[e.signal]}`,
              borderBottom: i < PREVIEW_EVENTS.length - 1 ? '1px solid var(--bg-border)' : 'none',
              padding: '20px 24px', background: 'var(--bg-base)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  background: SIG_STYLES[e.signal].bg, color: SIG_STYLES[e.signal].color,
                  padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  display: 'inline-flex', alignItems: 'center', gap: 5
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: SIG_STYLES[e.signal].color, display: 'inline-block' }} />
                  {e.signal.charAt(0).toUpperCase() + e.signal.slice(1)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{e.time}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{e.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>{e.desc}</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-mono)' }}>{e.amount}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.usd}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{e.ctx}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/feed" style={{ color: 'var(--brand-text)', fontSize: 13, textDecoration: 'none' }}>
            See the full live feed →
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section style={{ maxWidth: 1100, margin: '0 auto 80px', padding: '0 40px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'STX moved today', val: '4.2M', sub: 'across all protocols' },
          { label: 'Most active protocol', val: 'ALEX', sub: '48% of today\'s volume' },
          { label: 'Anomalies detected', val: '7', sub: 'in the last 24 hours' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: '24px 28px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{s.label}</div>
            <div className="mono" style={{ fontSize: 32, fontWeight: 600, color: 'var(--text-primary)' }}>{s.val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </section>

      {/* WALLET CTA */}
      <section style={{ maxWidth: 1100, margin: '0 auto 80px', padding: '0 40px' }}>
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
          borderRadius: 16, padding: '52px 56px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>
              Wallet Integration
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}>
              Connect to unlock<br />the full experience
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              Browse the feed for free. Connect your Stacks wallet to send STX tips on signals you agree with, vote on live events, and unlock whale alerts — all directly on-chain.
            </p>
            {[
              'Send 1 STX tips to signal the market',
              'Vote Bullish or Bearish on live events',
              'Unlock whale-only alerts and filters',
              'Your keys, your wallet — always',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0, display: 'inline-block' }} />
                {f}
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              {connected ? 'Wallet connected' : 'Choose your wallet'}
            </div>
            {connected ? (
              <div style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>You are ready to go</div>
                <Link href="/feed" style={{
                  display: 'inline-block', background: 'var(--brand)', color: '#fff',
                  padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 500
                }}>
                  Explore the Feed →
                </Link>
              </div>
            ) : (
              [
                { name: 'Leather', tag: 'Recommended · Browser extension', icon: '🔥', bg: '#1a0a00' },
                { name: 'Xverse',  tag: 'Mobile & browser',                 icon: '✦', bg: '#0a0a1a' },
              ].map(w => (
                <div key={w.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--bg-base)', border: '1px solid var(--bg-border)',
                  borderRadius: 10, padding: '16px 20px', cursor: 'pointer',
                  marginBottom: 10, transition: 'border-color 0.15s'
                }}
                onClick={connect}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bg-border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: w.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {w.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.tag}</div>
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>→</span>
                </div>
              ))
            )}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.6 }}>
              StackSense never holds your keys or signs transactions without your explicit approval.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: 1100, margin: '0 auto 100px', padding: '0 40px' }}>
        <div style={{ fontSize: 11, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
          How It Works
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 36 }}>From raw chain to readable signal</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { n: '01', title: 'Ingest', desc: 'StackSense polls the Hiro Stacks API every 10 seconds for confirmed transactions. No mempool noise — confirmed blocks only.' },
            { n: '02', title: 'Interpret', desc: 'Each transaction is matched against protocol-specific rules for ALEX, Arkadiko, Velar, and sBTC. Statistical anomaly detection flags outliers above 2σ from the 30-day baseline.' },
            { n: '03', title: 'Signal', desc: 'Interpreted events are tagged Bullish, Neutral, Risk, or Anomaly — then pushed to your feed via WebSocket within seconds of confirmation.' },
          ].map(s => (
            <div key={s.n} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: '28px 26px' }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--brand)', marginBottom: 16, letterSpacing: '0.06em' }}>
                {s.n} —
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--bg-border)', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          StackSense · Built on <span style={{ color: 'var(--brand)' }}>Stacks</span> (Bitcoin L2) · v1.0
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Signals are observational, not financial advice.
        </span>
      </footer>
    </div>
  )
}
