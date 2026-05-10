'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { AppConfig, UserSession, showConnect } from '@stacks/connect'
import { StacksMainnet } from '@stacks/network'

interface WalletContextType {
  address: string | null
  connected: boolean
  connect: () => void
  disconnect: () => void
}

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData()
      setAddress(userData.profile.stxAddress.mainnet)
    } else {
      const saved = localStorage.getItem('stacks-address-mainnet')
      if (saved) setAddress(saved)
    }
  }, [])

  const connect = useCallback(async () => {
    const connectOptions: any = {
      appDetails: {
        name: 'StackSense',
        icon: 'https://stacksense.app/logo.png',
      },
      userSession,
      onFinish: (payload: any) => {
        let addr = null
        
        if (payload?.userSession) {
          const userData = payload.userSession.loadUserData()
          addr = userData?.profile?.stxAddress?.mainnet
        }
        
        if (!addr && payload?.authResponse) {
           const userData = userSession.loadUserData()
           addr = userData?.profile?.stxAddress?.mainnet
        }

        if (!addr) {
           const userData = userSession.loadUserData()
           addr = userData?.profile?.stxAddress?.mainnet
        }

        if (!addr) {
          try {
            const ls = localStorage.getItem('blockstack-session')
            if (ls) {
              const data = JSON.parse(ls)
              addr = data?.userData?.profile?.stxAddress?.mainnet
            }
          } catch {}
        }

        if (addr) {
          setAddress(addr)
          localStorage.setItem('stacks-address-mainnet', addr)
        }
        window.location.reload()
      },
      onCancel: () => {},
    }

    try {
      const connectModule = await import('@stacks/connect')
      const connectFn = connectModule.showConnect || (connectModule as any).default?.showConnect
      
      if (connectFn) {
        connectFn(connectOptions)
      } else {
        showConnect(connectOptions)
      }
    } catch {
      showConnect(connectOptions)
    }
  }, [])

  const disconnect = useCallback(() => {
    userSession.signUserOut()
    setAddress(null)
    
    const keysToRemove = [
      'stacks-address-mainnet',
      'blockstack-session',
      'stacks-wallet-config',
      'leather-wallet-config'
    ]
    keysToRemove.forEach(k => localStorage.removeItem(k))
    
    Object.keys(localStorage).forEach(key => {
      if (key.includes('blockstack') || key.includes('stacks')) {
        localStorage.removeItem(key)
      }
    })

    window.location.reload()
  }, [])

  return (
    <WalletContext.Provider value={{ address, connected: !!address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
