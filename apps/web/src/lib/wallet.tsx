'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { STACKS_MAINNET } from '@stacks/network'

// Global session state (handled inside provider now)
const network = STACKS_MAINNET;

interface WalletCtx {
  address: string | null
  connected: boolean
  connect: () => void
  disconnect: () => void
  userSession: any
}

const WalletContext = createContext<WalletCtx>({
  address: null, connected: false,
  connect: () => {}, disconnect: () => {},
  userSession: null
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [lib, setLib] = useState<{ showConnect: any, userSession: any } | null>(null)
 
  useEffect(() => {
    setMounted(true)
    
    const loadStacks = async () => {
      try {
        const Connect = await import('@stacks/connect');
        const source = (Connect as any).default || Connect;
        const AppConfig = source.AppConfig;
        const UserSession = source.UserSession;
        const showConnect = source.showConnect || source.Connect?.showConnect || (Connect as any).showConnect;

        if (AppConfig && UserSession && showConnect) {
          const config = new AppConfig(['store_write', 'publish_data']);
          const session = new UserSession({ appConfig: config });
          setLib({ showConnect, userSession: session });

          try {
            const saved = localStorage.getItem('ss_stx_address')
            if (saved && saved.startsWith('SP')) {
              setAddress(saved)
            }
          } catch {}
        }
      } catch (e) {
        console.error('[Wallet] Failed to dynamically load Stacks:', e);
      }
    };

    loadStacks();
  }, [])

  const connect = useCallback(async () => {
    if (!lib?.showConnect || !lib?.userSession) {
      alert('Stacks library is still loading. Please wait a moment and try again.');
      return;
    }

    try {
      lib.showConnect({
        appDetails: {
          name: 'StackSense',
          icon: `${window.location.origin}/favicon.ico`,
        },
        onFinish: () => {
          try {
            const userData = lib.userSession.loadUserData()
            const addr = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet
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
        userSession: lib.userSession,
      })
    } catch (e: any) {
      console.error('[Wallet] showConnect failed:', e)
      alert(`Wallet connection failed: ${e.message || 'Unknown error'}. Please refresh the page and try again.`)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    if (lib?.userSession) lib.userSession.signUserOut();
    try { localStorage.removeItem('ss_stx_address') } catch {}
  }, [lib])

  if (!mounted) {
    return (
      <WalletContext.Provider value={{ address: null, connected: false, connect: () => {}, disconnect: () => {}, userSession: null }}>
        {children}
      </WalletContext.Provider>
    )
  }

  return (
    <WalletContext.Provider value={{ address, connected: !!address, connect, disconnect, userSession: lib?.userSession }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
