'use client'

import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { getApiUrl } from '@/lib/config'

const API = getApiUrl()

interface MempoolTx {
  txId: string
  type: string
  feeRate: number
  feeStx: number
  amountStx: number
  sender: string
}

interface Bubble {
  txId: string
  type: string
  feeStx: number
  amountStx: number
  r: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
}

// Color ramp from cool (cheap fee) to hot (expensive fee).
function feeColor(feeRate: number, maxFee: number): string {
  const t = maxFee > 0 ? Math.min(feeRate / maxFee, 1) : 0
  // Interpolate teal -> amber -> red.
  if (t < 0.5) {
    const k = t / 0.5
    const r = Math.round(34 + k * (245 - 34))
    const g = Math.round(197 + k * (158 - 197))
    const b = Math.round(94 + k * (11 - 94))
    return `rgb(${r}, ${g}, ${b})`
  }
  const k = (t - 0.5) / 0.5
  const r = Math.round(245 + k * (239 - 245))
  const g = Math.round(158 + k * (68 - 158))
  const b = Math.round(11 + k * (68 - 11))
  return `rgb(${r}, ${g}, ${b})`
}

export default function MempoolCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const bubblesRef = useRef<Bubble[]>([])
  const rafRef = useRef<number | null>(null)
  const [meta, setMeta] = useState<{ count: number; avgFeeRate: number; sampled: number } | null>(null)
  const [error, setError] = useState('')

  // Fetch + rebuild bubbles from the mempool snapshot.
  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/v1/network/mempool`)
        if (!active) return
        const txs: MempoolTx[] = res.data?.txs || []
        setMeta({ count: res.data?.count ?? txs.length, avgFeeRate: res.data?.avgFeeRate ?? 0, sampled: res.data?.sampled ?? txs.length })
        setError('')

        const maxFee = Math.max(1, ...txs.map((t) => t.feeRate))
        const maxAmt = Math.max(1, ...txs.map((t) => t.amountStx))
        const canvas = canvasRef.current
        const w = canvas?.clientWidth || 600
        const h = canvas?.clientHeight || 320

        bubblesRef.current = txs.map((t) => {
          // Size by volume; transfers with no amount fall back to a small base.
          const norm = t.amountStx > 0 ? Math.sqrt(t.amountStx / maxAmt) : 0.25
          const r = 6 + norm * 34
          return {
            txId: t.txId,
            type: t.type,
            feeStx: t.feeStx,
            amountStx: t.amountStx,
            r,
            x: Math.random() * (w - 2 * r) + r,
            y: Math.random() * (h - 2 * r) + r,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            color: feeColor(t.feeRate, maxFee),
          }
        })
      } catch (err: any) {
        if (active) setError(err?.response?.data?.error || 'Mempool feed unavailable')
      }
    }

    load()
    const interval = setInterval(load, 8000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  // Animation loop — gentle drift with soft wall bounce.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)

      for (const b of bubblesRef.current) {
        b.x += b.vx
        b.y += b.vy
        if (b.x - b.r < 0 || b.x + b.r > w) b.vx *= -1
        if (b.y - b.r < 0 || b.y + b.r > h) b.vy *= -1
        b.x = Math.max(b.r, Math.min(w - b.r, b.x))
        b.y = Math.max(b.r, Math.min(h - b.r, b.y))

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = b.color + ''
        ctx.globalAlpha = 0.18
        ctx.fill()
        ctx.globalAlpha = 0.9
        ctx.lineWidth = 1.5
        ctx.strokeStyle = b.color
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--bg-border)', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Mempool Gravity</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pending transactions · sized by STX volume · colored by fee rate</div>
        </div>
        {meta && (
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span><strong style={{ color: 'var(--text-primary)' }}>{meta.count.toLocaleString()}</strong> pending</span>
            <span><strong style={{ color: 'var(--text-primary)' }}>{meta.avgFeeRate.toLocaleString()}</strong> µSTX avg fee</span>
          </div>
        )}
      </div>
      <div style={{ position: 'relative', height: 320 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {error}
          </div>
        )}
        {!error && !meta && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading mempool…
          </div>
        )}
      </div>
      {/* Fee legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderTop: '1px solid var(--bg-border)', fontSize: 11, color: 'var(--text-muted)' }}>
        <span>Low fee</span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'linear-gradient(90deg, rgb(34,197,94), rgb(245,158,11), rgb(239,68,68))' }} />
        <span>High fee</span>
      </div>
    </div>
  )
}
