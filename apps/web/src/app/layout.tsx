import type { Metadata } from 'next'
import './globals.css'
import { WalletProvider } from '@/lib/wallet'
import { QueryProvider } from '@/components/providers'

export const metadata: Metadata = {
  title: 'StackSense — On-chain Intelligence for Stacks',
  description: 'Real-time blockchain signals for the Stacks network. Translated into plain English.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </WalletProvider>
      </body>
    </html>
  )
}
