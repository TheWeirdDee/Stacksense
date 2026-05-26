'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@/lib/wallet'
import { useWindowSize } from '@/hooks/useWindowSize'
import { useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Feed', href: '/feed' },
  { label: 'My Activity', href: '/feed?my=true' },
  { label: 'Analyze', href: '/wallet' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Developers', href: '/developers' },
  { label: 'API', href: '/subscriptions' },
  { label: 'API Keys', href: '/api-keys' },
  { label: 'Methodology', href: '/about' },
]

export default function Nav() {
  const { address, connected, connect, disconnect } = useWallet()
  const pathname = usePathname()
  const { isMobile, isDesktop } = useWindowSize()
  const [menuOpen, setMenuOpen] = useState(false)

  const short = address ? address.slice(0, 4) + '...' + address.slice(-4) : null

  return (
    <>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 12px' : '0 32px',
        height: 56,
        borderBottom: '1px solid var(--bg-border)',
        background: 'var(--bg-base)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/logo.png" alt="StackSense" style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }} />
          {!isMobile && (
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, letterSpacing: '0.04em' }}>
              StackSense
            </span>
          )}
        </Link>

        {isDesktop && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            {NAV_LINKS.map(({ label, href }) => {
              const active = pathname === href || (href.includes('?my=true') && pathname === '/feed')
              return (
                <Link key={href} href={href} style={{
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: active ? 500 : 400,
                  textDecoration: 'none', padding: '6px 12px',
                  borderRadius: 6,
                  background: active ? 'var(--bg-surface)' : 'transparent',
                }}>
                  {label}
                </Link>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8 }}>
          {connected && short && !isMobile && (
            <span style={{
              fontSize: 12, color: 'var(--text-muted)',
              background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
              padding: '5px 10px', borderRadius: 6,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              ● {short}
            </span>
          )}

          {!isDesktop && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'transparent',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-primary)',
                padding: '6px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}

          {connected ? (
            <button
              onClick={disconnect}
              title="Disconnect Wallet"
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--bg-border)',
                padding: isMobile ? '6px' : '7px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {isMobile ? <LogOut size={16} /> : 'Disconnect'}
            </button>
          ) : (
            <button
              onClick={connect}
              style={{
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                padding: isMobile ? '6px 10px' : '7px 16px',
                borderRadius: 6,
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Connect
            </button>
          )}
        </div>
      </nav>

      {!isDesktop && menuOpen && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0,
          background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)',
          zIndex: 99, padding: '8px 0',
        }}>
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block', padding: '14px 24px',
                color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none',
                borderBottom: '1px solid var(--bg-border)',
              }}
            >
              {label}
            </Link>
          ))}
          {connected && (
            <div style={{ padding: '14px 24px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              Connected: {address?.slice(0, 12)}...{address?.slice(-6)}
            </div>
          )}
        </div>
      )}
    </>
  )
}
// PR: auto-generated branch pr/nav-api-link
