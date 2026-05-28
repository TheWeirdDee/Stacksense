'use client'
import { useState } from 'react'
import { sendTip, ONE_STX } from '@/lib/stx'

export default function TipButton({ eventId, title }: { eventId: string, title: string }) {
  const [state, setState] = useState<'idle' | 'sent'>('idle')

  const handleTip = () => {
    try {
      sendTip(ONE_STX, `StackSense signal tip: ${String(title || '').slice(0, 30)}`, () => {
        setState('sent')
        setTimeout(() => setState('idle'), 3000)
      })
    } catch (err) {
      console.error('Tip failed:', err)
    }
  }

  return (
    <button
      onClick={handleTip}
      disabled={state === 'sent'}
      style={{
        background: state === 'sent' ? 'var(--bull-bg)' : 'transparent',
        color: state === 'sent' ? 'var(--bull)' : 'var(--text-muted)',
        border: `1px solid ${state === 'sent' ? 'var(--bull)' : 'var(--bg-border)'}`,
        padding: '5px 12px', borderRadius: 6, fontSize: 11,
        cursor: state === 'sent' ? 'default' : 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (state === 'idle') e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand-text)' }}
      onMouseLeave={e => { if (state === 'idle') e.currentTarget.style.borderColor = 'var(--bg-border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      {state === 'sent' ? '✓ Tipped 1 STX' : '↑ Tip 1 STX'}
    </button>
  )
}
