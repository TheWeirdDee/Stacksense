'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Nav from '@/components/Nav';

const SECTIONS = [
  { label: 'Console', href: '/api' },
  { label: 'Documentation', href: '/api/docs' },
];

export default function ApiLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Nav />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          <aside style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 16, padding: 24, minHeight: 'calc(100vh - 96px)' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#7C3AED' }}>
              API Hub
            </p>
            <h2 style={{ margin: '12px 0 0', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              One place for API management
            </h2>
            <p style={{ margin: '12px 0 0', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.75 }}>
              Browse your active plan, manage credentials, and find integration docs without leaving the hub.
            </p>

            <nav style={{ display: 'grid', gap: 8, marginTop: 24 }}>
              {SECTIONS.map((section) => {
                const active = section.href === '/api'
                  ? pathname === '/api'
                  : pathname.startsWith(section.href);

                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    style={{
                      display: 'block',
                      padding: '12px 14px',
                      borderRadius: 10,
                      textDecoration: 'none',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: active ? 'rgba(59,130,246,0.08)' : 'transparent',
                      border: active ? '1px solid rgba(59,130,246,0.16)' : '1px solid transparent',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {section.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main style={{ minWidth: 0 }}>{children}</main>
        </div>
      </div>
    </div>
  );
}
