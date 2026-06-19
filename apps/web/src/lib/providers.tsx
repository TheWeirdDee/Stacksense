'use client'
import { ReactNode } from 'react'
import { WalletProvider } from './wallet'
import { QueryProvider } from '@/components/providers'
import { ToastProvider } from '@/components/Toast'

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <QueryProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </QueryProvider>
    </WalletProvider>
  )
}
