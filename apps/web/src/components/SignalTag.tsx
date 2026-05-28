const MAP = {
  bullish: { label: 'Bullish', color: '#22C55E', bg: '#0F2E1A' },
  neutral: { label: 'Neutral', color: '#94A3B8', bg: '#1A1F2E' },
  risk:    { label: 'Risk',    color: '#F59E0B', bg: '#2E220A' },
  anomaly: { label: 'Anomaly', color: '#EF4444', bg: '#2E0F0F' },
}

export default function SignalTag({ signal, size = 'md' }: { signal?: string; size?: 'sm' | 'md' }) {
  if (!signal || typeof signal !== 'string') signal = 'neutral'
  const s = MAP[signal as keyof typeof MAP] ?? MAP.neutral
  const fs = size === 'sm' ? 10 : 11
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: s.bg,
      color: s.color,
      padding: size === 'sm' ? '2px 8px' : '3px 10px',
      borderRadius: 999,
      fontSize: fs,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5, height: 5,
        borderRadius: '50%',
        background: s.color,
        display: 'inline-block',
        flexShrink: 0,
      }} />
      {s.label}
    </span>
  )
}
