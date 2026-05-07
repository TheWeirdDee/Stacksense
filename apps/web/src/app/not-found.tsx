'use client'
import dynamic from 'next/dynamic'
const Nav = dynamic(() => import('@/components/Nav'), { ssr: false })
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Nav />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 'calc(100vh - 56px)',
        textAlign: 'center', padding: '40px 24px',
      }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
          404
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
          This page doesn't exist on-chain either.
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
          The URL may be wrong, or this page was removed.
        </p>
        <Link href="/feed" style={{
          background: 'var(--brand)', color: '#fff',
          padding: '11px 26px', borderRadius: 7,
          fontSize: 13, fontWeight: 500,
        }}>
          Back to Feed →
        </Link>
      </div>
    </div>
  )
}
