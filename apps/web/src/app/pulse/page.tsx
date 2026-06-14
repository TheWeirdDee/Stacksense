'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Activity, Boxes, Gauge, Radio, AlertCircle } from 'lucide-react'
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

import { getApiUrl } from '@/lib/config'

const Nav = dynamic(() => import('@/components/Nav'), { ssr: false })
const MempoolCanvas = dynamic(() => import('@/components/MempoolCanvas'), { ssr: false })
const API = getApiUrl()

interface PulseBucket { label: string; count: number; volume: number; avgFee: number }
interface BlockMetrics {
  blocks: { height: number; txCount: number; secondsSincePrev: number | null }[]
  avgBlockTime: number | null
  avgTxPerBlock: number
  totalTx: number
  latestHeight: number | null
}
interface StatusData {
  status: string
  uptimeSeconds: number
  redis: { connected: boolean; latencyMs: number | null; cachedEvents: number }
  poller: { lastLatencyMs: number | null; cycles: number; errors: number; dedupHitRate: number; stale: boolean; lastPollAt: string | null }
  websocket: { connectedClients: number }
}

function fmtUptime(s: number): string {
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        <Icon size={14} color={color} /> {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }} className="mono">{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function PulsePage() {
  const [pulse, setPulse] = useState<PulseBucket[]>([])
  const [blocks, setBlocks] = useState<BlockMetrics | null>(null)
  const [status, setStatus] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    try {
      setError('')
      const [pulseRes, blocksRes, statusRes] = await Promise.allSettled([
        axios.get(`${API}/api/v1/stats/pulse`),
        axios.get(`${API}/api/v1/network/blocks`),
        axios.get(`${API}/api/v1/status`),
      ])
      if (pulseRes.status === 'fulfilled') setPulse(pulseRes.value.data || [])
      if (blocksRes.status === 'fulfilled') setBlocks(blocksRes.value.data)
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value.data)
      if (pulseRes.status === 'rejected' && blocksRes.status === 'rejected') {
        setError('Failed to load network telemetry')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load network telemetry')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 15000)
    return () => clearInterval(interval)
  }, [])

  const statusColor = status?.status === 'operational' ? '#22C55E' : status?.status === 'degraded' ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <div style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: '24px 20px 60px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/feed" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Back to Feed
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
              📡 Stacks Network Pulse
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Live block cadence, mempool pressure, and StackSense system diagnostics.
            </p>
          </div>
          {status && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: `1px solid ${statusColor}44`, borderRadius: 8, padding: '8px 14px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: statusColor, textTransform: 'capitalize' }}>{status.status}</span>
            </div>
          )}
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2E0F0F', border: '1px solid #EF4444', borderRadius: 8, padding: 16, color: '#EF4444', marginBottom: 24, fontSize: 14 }}>
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}

        {/* Top metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard icon={Boxes} label="Latest Block" value={blocks?.latestHeight ? `#${blocks.latestHeight.toLocaleString()}` : '—'} sub={`${blocks?.totalTx ?? 0} tx across recent blocks`} color="#A78BFA" />
          <StatCard icon={Gauge} label="Avg Block Time" value={blocks?.avgBlockTime != null ? `${blocks.avgBlockTime}s` : '—'} sub={`~${blocks?.avgTxPerBlock ?? 0} tx / block`} color="#67E8F9" />
          <StatCard icon={Activity} label="Poll Latency" value={status?.poller.lastLatencyMs != null ? `${status.poller.lastLatencyMs}ms` : '—'} sub={`Hiro API · ${status?.poller.cycles ?? 0} cycles`} color="#FCD34D" />
          <StatCard icon={Radio} label="Live Clients" value={status ? String(status.websocket.connectedClients) : '—'} sub={status ? `uptime ${fmtUptime(status.uptimeSeconds)}` : ''} color="#22C55E" />
        </div>

        {/* Activity chart */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Transfer Activity · last 24h</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Matched signal volume and event count in 2-hour buckets</div>
          {loading && pulse.length === 0 ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading telemetry…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={pulse} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--bg-border)" />
                <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--bg-border)" />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--bg-border)" />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar yAxisId="left" dataKey="count" name="Events" fill="#7C3AED" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Area yAxisId="right" type="monotone" dataKey="volume" name="STX Volume" stroke="#22C55E" fill="url(#volFill)" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Mempool canvas */}
        <div style={{ marginBottom: 24 }}>
          <MempoolCanvas />
        </div>

        {/* System diagnostics */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>System Diagnostics</div>
          {status ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {[
                { k: 'Redis', v: status.redis.connected ? `connected · ${status.redis.latencyMs}ms` : 'disconnected', ok: status.redis.connected },
                { k: 'Cached Events', v: status.redis.cachedEvents.toLocaleString(), ok: true },
                { k: 'Poller', v: status.poller.stale ? 'stale' : `healthy · ${status.poller.cycles} cycles`, ok: !status.poller.stale },
                { k: 'Dedup Hit Rate', v: `${(status.poller.dedupHitRate * 100).toFixed(1)}%`, ok: true },
                { k: 'Poll Errors', v: String(status.poller.errors), ok: status.poller.errors === 0 },
                { k: 'WebSocket Clients', v: String(status.websocket.connectedClients), ok: true },
              ].map((row) => (
                <div key={row.k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.k}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: row.ok ? 'var(--text-primary)' : '#F59E0B', fontFamily: 'JetBrains Mono, monospace' }}>{row.v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Diagnostics endpoint unreachable.</div>
          )}
          {status?.poller.lastPollAt && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
              Last poll: {new Date(status.poller.lastPollAt).toLocaleTimeString()} · GET /api/v1/status
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
