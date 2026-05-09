'use client'

import {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode
} from 'react'

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

  useEffect(() => {
    // Restore saved address on page load
    try {
      const saved = localStorage.getItem('ss_stx_address')
      if (saved?.startsWith('SP')) setAddress(saved)
    } catch {}
  }, [])

  const connect = useCallback(async () => {
    try {
      // Import the whole module and find whatever export works
      const mod = await import('@stacks/connect')

      const { AppConfig, UserSession } = mod
      const appConfig = new AppConfig(['store_write', 'publish_data'])
      const userSession = new UserSession({ appConfig })

      // Find the connect function — different versions export it differently
      const connectFn =
        mod.showConnect ??
        mod.connect ??
        (mod as any).default?.showConnect ??
        (mod as any).default?.connect

      if (typeof connectFn !== 'function') {
        console.error('[Wallet] No connect function found in @stacks/connect. Exports:', Object.keys(mod))
        alert('Wallet library error. Check browser console.')
        return
      }

      connectFn({
        appDetails: {
          name: 'StackSense',
          icon: `${window.location.origin}/favicon.ico`,
        },
        userSession,
        onFinish: (payload: any) => {
          console.log('[Wallet] onFinish payload:', payload)

          // Try multiple ways to get the address
          let addr: string | null = null

          // Method 1: address comes directly in payload (newer versions)
          if (payload?.profile?.stxAddress?.mainnet) {
            addr = payload.profile.stxAddress.mainnet
          }

          // Method 2: address in authResponse
          if (!addr && payload?.authResponse) {
            try {
              const decoded = JSON.parse(atob(payload.authResponse.split('.')[1]))
              addr = decoded?.profile?.stxAddress?.mainnet
            } catch {}
          }

          // Method 3: load from userSession (classic method)
          if (!addr) {
            try {
              const userData = userSession.loadUserData()
              addr = userData?.profile?.stxAddress?.mainnet
            } catch (e) {
              console.warn('[Wallet] userSession.loadUserData() failed:', e)
            }
          }

          // Method 4: check localStorage directly — @stacks/connect writes here
          if (!addr) {
            try {
              const keys = Object.keys(localStorage)
              const authKey = keys.find(k =>
                k.includes('blockstack') || k.includes('stacks') || k.includes('userData')
              )
              if (authKey) {
                const raw = JSON.parse(localStorage.getItem(authKey) || '{}')
                addr = raw?.profile?.stxAddress?.mainnet
                  || raw?.stxAddress?.mainnet
                  || raw?.mainnet
              }
            } catch {}
          }

          console.log('[Wallet] Resolved address:', addr)

          if (addr && addr.startsWith('SP')) {
            setAddress(addr)
            localStorage.setItem('ss_stx_address', addr)
          } else {
            console.error('[Wallet] Could not extract SP address from any method')
            alert('Connected but could not read address. Open console for details.')
          }
        },
        onCancel: () => {
          console.log('[Wallet] User cancelled')
        },
      })
    } catch (e) {
      console.error('[Wallet] Import or connect failed:', e)
      alert('Failed to load wallet library. Try refreshing the page.')
    }
  }, [])

  const disconnect = useCallback(async () => {
    setAddress(null)
    try {
      localStorage.removeItem('ss_stx_address')
      
      const mod = await import('@stacks/connect')
      const appConfig = new mod.AppConfig(['store_write', 'publish_data'])
      const userSession = new mod.UserSession({ appConfig })
      
      if (userSession.isUserSignedIn()) {
        userSession.signUserOut()
      }

      // Aggressively clear all possible Stacks/Blockstack keys
      const keys = Object.keys(localStorage)
      keys.forEach(k => {
        if (k.toLowerCase().includes('blockstack') || k.toLowerCase().includes('stacks')) {
          localStorage.removeItem(k)
        }
      })

      // Refresh to ensure all memory states are wiped
      window.location.href = window.location.origin
    } catch {
      window.location.reload()
    }
  }, [])

  return (
    <WalletContext.Provider value={{ address, connected: !!address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
