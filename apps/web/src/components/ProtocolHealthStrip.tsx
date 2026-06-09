'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getApiUrl } from '@/lib/config'

const API = getApiUrl()

interface ProtocolStat {
  protocol: string
  calls: number
  callers: number
}

interface Props {
  selectedProtocol: string | null
  onSelect: (protocol: string | null) => void
}

export default function ProtocolHealthStrip({ selectedProtocol, onSelect }: Props) {
  const [protocols, setProtocols] = useState<ProtocolStat[]>([])

  useEffect(() => {
    const load = () =>
      fetch(`${API}/api/v1/stats/leaderboard`)
        .then(r => r.json())
        .then(data => {
          const contracts: any[] = data.contracts ?? []
          const map: Record<string, ProtocolStat> = {}
          for (const c of contracts) {
            const name: string = c.protocol ?? 'Unknown'
            if (!map[name]) map[name] = { protocol: name, calls: 0, callers: 0 }
            map[name].calls += c.calls ?? 0
            map[name].callers += c.callers ?? 0
          }
          const sorted = Object.values(map).sort((a, b) => b.calls - a.calls)
          setProtocols(sorted)
        })
        .catch(() => {})

    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  if (protocols.length === 0) return null

  return (
    <div style={{
      padding: '10px 20px',
      borderBottom: '1px solid var(--bg-border)',
      background: 'var(--bg-surface)',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        Protocol Activity
      </div>
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 2,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      } as React.CSSProperties}>
        {protocols.map((p, i) => {
          const active = selectedProtocol === p.protocol
          return (
            <motion.button
              key={p.protocol}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelect(active ? null : p.protocol)}
              style={{
                flexShrink: 0,
                padding: '7px 12px',
                borderRadius: 8,
                border: `1px solid ${active ? 'var(--brand)' : 'var(--bg-border)'}`,
                background: active ? 'var(--brand)' : 'var(--bg-elevated)',
                color: active ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                minWidth: 110,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: active ? '#fff' : 'var(--text-primary)', marginBottom: 2 }}>
                {p.protocol}
              </div>
              <div style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {p.calls.toLocaleString()} calls · {p.callers} wallets
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
