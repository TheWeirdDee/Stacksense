'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { STACKS_MAINNET } from '@stacks/network'

// We will import these dynamically to avoid bundling issues
let AppConfig: any, UserSession: any, showConnect: any;

// Global session state
let userSession: any = null;
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

  useEffect(() => {
    setMounted(true)
    
    const loadStacks = async () => {
      try {
        const Connect = await import('@stacks/connect');
        // Robust discovery
        AppConfig = Connect.AppConfig || (Connect as any).default?.AppConfig;
        UserSession = Connect.UserSession || (Connect as any).default?.UserSession;
        showConnect = Connect.showConnect || (Connect as any).default?.showConnect;

        if (!AppConfig || !UserSession || !showConnect) {
           console.error('[Wallet] Could not find Stacks functions in module:', Connect);
        }

        if (!userSession && AppConfig && UserSession) {
          const config = new AppConfig(['store_write', 'publish_data']);
          userSession = new UserSession({ appConfig: config });
        }
      } catch (e) {
        console.error('[Wallet] Failed to dynamically load Stacks:', e);
      }

      try {
        const saved = localStorage.getItem('ss_stx_address')
        if (saved && saved.startsWith('SP')) {
          setAddress(saved)
        }
      } catch {}
    };

    loadStacks();
  }, [])

  const connect = useCallback(async () => {
    if (!showConnect || !userSession) {
      alert('Stacks library is still loading. Please wait a moment and try again.');
      return;
    }

    try {
      showConnect({
        appDetails: {
          name: 'StackSense',
          icon: `${window.location.origin}/favicon.ico`,
        },
        onFinish: () => {
          try {
            const userData = userSession.loadUserData()
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
        userSession,
      })
    } catch (e: any) {
      console.error('[Wallet] showConnect failed:', e)
      alert(`Wallet connection failed: ${e.message || 'Unknown error'}. Please refresh the page and try again.`)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    if (userSession) userSession.signUserOut();
    try { localStorage.removeItem('ss_stx_address') } catch {}
  }, [])

  if (!mounted) {
    return (
      <WalletContext.Provider value={{ address: null, connected: false, connect: () => {}, disconnect: () => {}, userSession: null }}>
        {children}
      </WalletContext.Provider>
    )
  }

  return (
    <WalletContext.Provider value={{ address, connected: !!address, connect, disconnect, userSession }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
