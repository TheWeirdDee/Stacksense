'use client'
import { ReactNode } from 'react'
import { WalletProvider } from './wallet'
import { QueryProvider } from '@/components/providers'

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <QueryProvider>
        {children}
      </QueryProvider>
    </WalletProvider>
  )
}
