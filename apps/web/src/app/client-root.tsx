'use client'
import dynamic from 'next/dynamic'
import { ReactNode } from 'react'
import { ToastProvider } from '@/components/Toast'

const ClientProviders = dynamic(() => import('@/lib/providers'), { ssr: false })
const CommandPalette = dynamic(() => import('@/components/CommandPalette'), { ssr: false })

export default function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ClientProviders>{children}</ClientProviders>
      <CommandPalette />
    </ToastProvider>
  )
}
