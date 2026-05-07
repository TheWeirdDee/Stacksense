'use client'
import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { connect, isConnected, disconnect, getLocalStorage, AppConfig, UserSession } from '@stacks/connect'
import { STACKS_MAINNET } from '@stacks/network'

export const network = STACKS_MAINNET

const appConfig = typeof window !== 'undefined' ? new AppConfig(['store_write', 'publish_data']) : null
export const userSession = typeof window !== 'undefined' ? new UserSession({ appConfig: appConfig! }) : null as any

interface WalletCtx {
  address: string | null
  connected: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletCtx>({
  address: null, 
  connected: false,
  connect: async () => {}, 
  disconnect: () => {}
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const updateState = useCallback(() => {
    const connectedStatus = isConnected()
    setConnected(connectedStatus)
    if (connectedStatus) {
      const storage = getLocalStorage()
      if (storage?.addresses) {
        // v8 structure: storage.addresses.stx is an array of objects
        const addr = storage.addresses.stx[0]?.address || null
        setAddress(addr)
      }
    } else {
      setAddress(null)
    }
  }, [])

  useEffect(() => {
    updateState()
    // Listen for storage changes (optional but good for multi-tab)
    window.addEventListener('storage', updateState)
    return () => window.removeEventListener('storage', updateState)
  }, [updateState])

  const handleConnect = useCallback(async () => {
    console.log('WalletProvider: Initiating connect flow (v8 API)')
    try {
      const response = await connect()
      console.log('WalletProvider: Connect response', response)
      
      const addr = response.addresses.find(a => a.symbol === 'STX')?.address 
                   || response.addresses[0]?.address
      
      setAddress(addr)
      setConnected(true)
    } catch (err) {
      console.error('WalletProvider: connect error', err)
    }
  }, [])

  const handleDisconnect = useCallback(() => {
    console.log('WalletProvider: Disconnecting')
    disconnect()
    setAddress(null)
    setConnected(false)
  }, [])

  return (
    <WalletContext.Provider value={{ address, connected, connect: handleConnect, disconnect: handleDisconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
