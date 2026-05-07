'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@/lib/wallet'

export default function Nav() {
  const { address, connected, connect, disconnect } = useWallet()
  const path = usePathname()
  const short = address ? address.slice(0, 6) + '...' + address.slice(-4) : null

  const links = [
    { label: 'Feed', href: '/feed' },
    { label: 'Analyze', href: '/wallet' },
    { label: 'Methodology', href: '/about' },
  ]

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      height: 56,
      borderBottom: '1px solid var(--bg-border)',
      background: 'var(--bg-base)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* LOGO — identical every page */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexShrink: 0 }}>
        <img src="/logo.png" alt="StackSense Logo" style={{ width: 28, height: 28, borderRadius: 4 }} />
      </Link>

      {/* NAV LINKS */}
      <div style={{ display: 'flex', gap: 4, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        {links.map(({ label, href }) => {
          const active = path === href || path?.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--bg-elevated)' : 'transparent',
                transition: 'all 0.15s',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* WALLET */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {connected && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            borderRadius: 6,
            padding: '5px 12px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bull)', display: 'inline-block' }} />
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{short}</span>
          </div>
        )}
        <button
          onClick={connected ? disconnect : connect}
          style={{
            padding: '7px 18px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            border: connected ? '1px solid var(--bg-border)' : 'none',
            background: connected ? 'transparent' : 'var(--brand)',
            color: connected ? 'var(--text-secondary)' : '#fff',
            transition: 'all 0.15s',
          }}
        >
          {connected ? 'Disconnect' : 'Connect Wallet'}
        </button>
      </div>
    </nav>
  )
}
