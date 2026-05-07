'use client'
import { useState } from 'react'

export default function WalletAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  const short = address.slice(0, 6) + '...' + address.slice(-4)

  const copy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={copy}
      title={copied ? 'Copied!' : address}
      className="mono"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: copied ? 'var(--bull)' : 'var(--text-mono)',
        fontSize: 12, padding: 0, fontFamily: 'JetBrains Mono, monospace'
      }}
    >
      {copied ? 'Copied!' : short}
    </button>
  )
}
