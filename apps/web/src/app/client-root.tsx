'use client'
import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

const ClientProviders = dynamic(() => import('@/lib/providers'), { ssr: false })

export default function ClientRoot({ children }: { children: ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>
}
