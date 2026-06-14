import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const SIGNAL_COLORS: Record<string, string> = {
  bullish: '#22C55E',
  anomaly: '#7C3AED',
  risk: '#EF4444',
  neutral: '#8A8A8A',
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const title = (searchParams.get('title') || 'Live Stacks Signal').slice(0, 120)
    const signal = (searchParams.get('signal') || 'neutral').toLowerCase()
    const stx = searchParams.get('stx') || ''
    const usd = searchParams.get('usd') || ''
    const archetype = searchParams.get('archetype') || ''
    const protocol = searchParams.get('protocol') || ''
    const accent = SIGNAL_COLORS[signal] || SIGNAL_COLORS.neutral

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0D0D0D',
            padding: '60px 80px',
            borderLeft: `16px solid ${accent}`,
            boxSizing: 'border-box',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: accent, fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              StackSense Signal
            </span>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: `${accent}22`, border: `1px solid ${accent}`, borderRadius: '8px', padding: '8px 16px' }}>
              <span style={{ color: accent, fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {signal}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#FFFFFF', fontSize: '52px', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              {title}
            </span>
            <div style={{ display: 'flex', gap: '40px', marginTop: '32px' }}>
              {stx && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#8A8A8A', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Amount</span>
                  <span style={{ color: '#FFFFFF', fontSize: '34px', fontWeight: 700, fontFamily: 'monospace' }}>{stx} STX</span>
                  {usd && <span style={{ color: '#8A8A8A', fontSize: '18px' }}>{usd}</span>}
                </div>
              )}
              {archetype && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#8A8A8A', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wallet</span>
                  <span style={{ color: '#FFFFFF', fontSize: '34px', fontWeight: 700 }}>{archetype}</span>
                </div>
              )}
              {protocol && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#8A8A8A', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Protocol</span>
                  <span style={{ color: '#FFFFFF', fontSize: '34px', fontWeight: 700 }}>{protocol}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1C1C1C', paddingTop: '20px' }}>
            <span style={{ color: '#4A4A4A', fontSize: '12px', letterSpacing: '0.05em' }}>
              REAL-TIME STACKS BLOCKCHAIN INTELLIGENCE
            </span>
            <span style={{ color: '#8A8A8A', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              stacksense.io
            </span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  } catch (e: any) {
    console.error('Failed to generate event OG image:', e)
    return new Response('Failed to generate image', { status: 500 })
  }
}
