'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, Wallet, Activity, Trophy, Code2, BookOpen, Rss } from 'lucide-react'

interface Command {
  label: string
  hint?: string
  icon: any
  run: () => void
  keywords?: string
}

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const go = (href: string) => { setOpen(false); router.push(href) }

  const commands = useMemo<Command[]>(() => {
    const base: Command[] = [
      { label: 'Live Feed', hint: 'Real-time signals', icon: Rss, run: () => go('/feed'), keywords: 'feed signals events' },
      { label: 'Analyze a Wallet', hint: 'Behavioral history', icon: Wallet, run: () => go('/wallet'), keywords: 'wallet analyze address' },
      { label: 'Network Pulse', hint: 'Blocks & mempool', icon: Activity, run: () => go('/pulse'), keywords: 'pulse network blocks mempool' },
      { label: 'Leaderboard', hint: 'Top contracts & whales', icon: Trophy, run: () => go('/leaderboard'), keywords: 'leaderboard whales contracts' },
      { label: 'Developer Hub', hint: 'Contracts & webhooks', icon: Code2, run: () => go('/developers'), keywords: 'developers api contracts' },
      { label: 'API Console', hint: 'Keys & docs', icon: Code2, run: () => go('/api'), keywords: 'api keys docs console' },
      { label: 'Methodology', hint: 'How signals work', icon: BookOpen, run: () => go('/about'), keywords: 'about methodology signals' },
    ]
    const q = query.trim()
    // If the query looks like a Stacks address, offer to jump straight to it.
    if (/^S[PT][0-9A-Z]{6,}$/i.test(q)) {
      base.unshift({ label: `Analyze ${q.slice(0, 8)}…${q.slice(-4)}`, hint: 'Open wallet', icon: Wallet, run: () => go(`/wallet?address=${q}`), keywords: q })
    }
    if (!q) return base
    const lower = q.toLowerCase()
    return base.filter((c) => c.label.toLowerCase().includes(lower) || c.keywords?.toLowerCase().includes(lower))
  }, [query])

  if (typeof window === 'undefined' || !open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, calc(100vw - 32px))',
          background: 'var(--bg-base)',
          border: '1px solid var(--bg-border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--bg-border)' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, commands.length - 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
              else if (e.key === 'Enter') { e.preventDefault(); commands[active]?.run() }
            }}
            placeholder="Search or paste a wallet address…"
            aria-label="Command search"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 15, fontFamily: 'inherit',
            }}
          />
          <kbd style={{ fontSize: 10, color: 'var(--text-muted)', border: '1px solid var(--bg-border)', borderRadius: 4, padding: '2px 6px' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
          {commands.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No matches</div>
          )}
          {commands.map((c, i) => {
            const Icon = c.icon
            const isActive = i === active
            return (
              <button
                key={c.label}
                onMouseEnter={() => setActive(i)}
                onClick={c.run}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isActive ? 'var(--bg-surface)' : 'transparent',
                  color: 'var(--text-primary)', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <Icon size={16} color={isActive ? 'var(--brand-text, #22C55E)' : 'var(--text-muted)'} />
                <span style={{ flex: 1, fontSize: 14 }}>{c.label}</span>
                {c.hint && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.hint}</span>}
                <ArrowRight size={14} color="var(--text-muted)" style={{ opacity: isActive ? 1 : 0 }} />
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
