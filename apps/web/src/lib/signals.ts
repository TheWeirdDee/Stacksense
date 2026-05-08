export const BORDER: Record<string, string> = {
  bullish: 'var(--bull)',
  neutral: 'var(--text-muted)',
  risk: 'var(--risk)',
  anomaly: 'var(--anom)',
}

export function getSignal(signal: string) {
  return {
    border: BORDER[signal] || 'var(--bg-border)',
    signal: signal.charAt(0).toUpperCase() + signal.slice(1)
  }
}

export function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
