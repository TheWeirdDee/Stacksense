import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address') || ''

    let archetype = 'Active Wallet'
    let diamondHands = 50
    let defiDegens = 50
    let summary = 'Classified Wallet'

    if (address && (address.startsWith('SP') || address.startsWith('ST'))) {
      const defaultVal = 'https://stacksense-production-7a6f.up.railway.app'
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || defaultVal
      try {
        const res = await fetch(`${apiBase}/api/v1/wallet/${address}`)
        if (res.ok) {
          const data = await res.json()
          if (data.wallet) {
            archetype = data.wallet.archetype || archetype
            diamondHands = data.wallet.scores?.diamond_hands ?? diamondHands
            defiDegens = data.wallet.scores?.defi_degens ?? defiDegens
            summary = data.wallet.activity_summary || summary
          }
        }
      } catch (err) {
        console.error('OG Image fetch error:', err)
      }
    }

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
            border: '8px solid #E85D04',
            boxSizing: 'border-box',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#E85D04', fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                StackSense Analytics
              </span>
              <span style={{ color: '#FFFFFF', fontSize: '42px', fontWeight: 800, marginTop: '8px', letterSpacing: '-0.02em' }}>
                Wallet Intelligence
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(232, 93, 4, 0.1)',
                border: '1px solid #E85D04',
                borderRadius: '8px',
                padding: '8px 16px',
              }}
            >
              <span style={{ color: '#E85D04', fontSize: '18px', fontWeight: 600, fontFamily: 'monospace' }}>
                LIVE FEED
              </span>
            </div>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#7C3AED',
                  marginRight: '12px',
                }}
              />
              <span style={{ color: '#8A8A8A', fontSize: '20px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {address ? `${address.slice(0, 16)}...${address.slice(-16)}` : 'No Address Specified'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '32px' }}>
              {/* Archetype Card */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#141414',
                  border: '1px solid #272727',
                  borderRadius: '12px',
                  padding: '24px',
                  flex: 1.2,
                }}
              >
                <span style={{ color: '#8A8A8A', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Wallet Archetype
                </span>
                <span style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                  {archetype}
                </span>
                <span style={{ color: '#8A8A8A', fontSize: '14px', marginTop: '12px', lineHeight: 1.4 }}>
                  {summary}
                </span>
              </div>

              {/* Index Cards */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#141414',
                  border: '1px solid #272727',
                  borderRadius: '12px',
                  padding: '24px',
                  flex: 1,
                  gap: '16px',
                  justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#FFFFFF', fontSize: '14px' }}>Diamond Hands</span>
                    <span style={{ color: '#22C55E', fontSize: '14px', fontWeight: 'bold' }}>{diamondHands}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#272727', borderRadius: '3px', display: 'flex' }}>
                    <div style={{ width: `${diamondHands}%`, height: '100%', backgroundColor: '#22C55E', borderRadius: '3px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#FFFFFF', fontSize: '14px' }}>DeFi Degeneracy</span>
                    <span style={{ color: '#E85D04', fontSize: '14px', fontWeight: 'bold' }}>{defiDegens}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#272727', borderRadius: '3px', display: 'flex' }}>
                    <div style={{ width: `${defiDegens}%`, height: '100%', backgroundColor: '#E85D04', borderRadius: '3px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Watermark */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1C1C1C', paddingTop: '20px' }}>
            <span style={{ color: '#4A4A4A', fontSize: '12px' }}>
              SECURE DEFI ORCHESTRATION & ANALYSIS
            </span>
            <span style={{ color: '#8A8A8A', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              stacksense.io
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.error('Failed to generate OG image:', e)
    return new Response(`Failed to generate image`, { status: 500 })
  }
}
