import { openSTXTransfer } from '@stacks/connect'
import { STACKS_MAINNET } from '@stacks/network'

export const TREASURY = 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV'

export function sendTip(microSTX: number, memo: string, userSession: any, onFinish?: (txId: string) => void) {
  if (!userSession) return;
  openSTXTransfer({
    network: STACKS_MAINNET,
    recipient: TREASURY,
    amount: microSTX.toString(),
    memo: memo.slice(0, 34), // Memo is limited to 34 bytes
    appDetails: { name: 'StackSense', icon: '/logo.png' },
    onFinish: (data: any) => {
      console.log('Tip sent:', data.txId)
      onFinish?.(data.txId)
    },
    onCancel: () => console.log('Tip cancelled'),
    userSession,
  })
}

export const ONE_STX = 1_000_000
export const FIVE_STX = 5_000_000

// ALWAYS round STX to whole numbers
export function fmtSTX(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

export function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV'
export const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'signal-tips-v1'
