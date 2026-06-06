import { Metadata } from 'next'
import { headers } from 'next/headers'
import WalletClient from './WalletClient'
import { getApiUrl } from '@/lib/config'

const API = getApiUrl()

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function fetchWalletData(address: string) {
  if (!address || (!address.startsWith('SP') && !address.startsWith('ST'))) {
    return null
  }
  try {
    const r = await fetch(`${API}/api/v1/wallet/${address}`, { cache: 'no-store' })
    if (!r.ok) return null
    return await r.json()
  } catch (err) {
    console.error('Error fetching wallet metadata:', err)
    return null
  }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await searchParams
  const address = typeof resolvedParams.address === 'string' ? resolvedParams.address : ''
  
  if (!address) {
    return {
      title: 'StackSense Wallet Intelligence',
      description: 'Reconstruct on-chain behavior — archetype classification, protocol usage, and behavioral scores.'
    }
  }

  const data = await fetchWalletData(address)
  if (!data || !data.wallet) {
    return {
      title: `StackSense Wallet Intelligence: ${address.slice(0, 8)}...`,
      description: `Analyzing on-chain behavior for ${address}.`
    }
  }

  const archetype = data.wallet.archetype || 'Active Wallet'
  const diamondHands = data.wallet.scores?.diamond_hands ?? 50
  const defiDegens = data.wallet.scores?.defi_degens ?? 50
  
  const title = `StackSense Wallet Intelligence: ${address.slice(0, 8)}...`
  const description = `Archetype: ${archetype} | DeFi Index: ${defiDegens}% | HODL Rating: ${diamondHands}%. Live on-chain analysis.`
  
  // Dynamic OG image endpoint link pointing to /api/og/wallet
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
  const ogImageUrl = `${protocol}://${host}/api/og/wallet?address=${address}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `StackSense Wallet Profile for ${address}`
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl]
    }
  }
}

export default async function WalletPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const address = typeof resolvedParams.address === 'string' ? resolvedParams.address : ''
  const initialData = address ? await fetchWalletData(address) : null

  return (
    <WalletClient initialData={initialData} initialAddress={address} />
  )
}
