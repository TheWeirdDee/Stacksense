import type { Metadata } from 'next'
import './globals.css'
import ClientRoot from './client-root'

export const metadata: Metadata = {
  title: 'StackSense — On-chain Intelligence for Stacks',
  description: 'Real-time blockchain signals for the Stacks network. Translated into plain English.',
  other: {
    'talentapp:project_verification': 'e51dd31b3c2494c44c000037e9830a314c3a653ec7dc26cb6bd2126b4dca1585be23fc9bc4dff773072dcdeb5b6e4cd82e658acd4f15b23b1666044dfab536a3'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
