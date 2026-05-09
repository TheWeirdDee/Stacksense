'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { AppConfig, UserSession, showConnect } from '@stacks/connect'
import { STACKS_MAINNET } from '@stacks/network'

const appConfig = new AppConfig(['store_write', 'publish_data'])
export const userSession = new UserSession({ appConfig })
export const network = STACKS_MAINNET

interface WalletCtx {
  address: string | null
  connected: boolean
  connect: () => void
  disconnect: () => void
}

const WalletContext = createContext<WalletCtx>({
  address: null, connected: false,
  connect: () => {}, disconnect: () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('ss_stx_address')
      if (saved && saved.startsWith('SP')) {
        setAddress(saved)
      }
    } catch {}
  }, [])

  const connect = useCallback(async () => {
    try {
      showConnect({
        appDetails: {
          name: 'StackSense',
          icon: `${window.location.origin}/favicon.ico`,
        },
        onFinish: () => {
          try {
            const userData = userSession.loadUserData()
            const addr = userData?.profile?.stxAddress?.mainnet
            if (addr) {
              setAddress(addr)
              localStorage.setItem('ss_stx_address', addr)
            }
          } catch (e) {
            console.error('[Wallet] Failed to read user data:', e)
          }
        },
        onCancel: () => {
          console.log('[Wallet] User cancelled connection')
        },
        userSession,
      })
    } catch (e) {
      console.error('[Wallet] showConnect failed:', e)
      alert('Wallet connection failed. Make sure Leather or Xverse extension is installed.')
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    try { localStorage.removeItem('ss_stx_address') } catch {}
  }, [])

  if (!mounted) {
    return (
      <WalletContext.Provider value={{ address: null, connected: false, connect: () => {}, disconnect: () => {} }}>
        {children}
      </WalletContext.Provider>
    )
  }

  return (
    <WalletContext.Provider value={{ address, connected: !!address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
