import { openSTXTransfer } from '@stacks/connect'
import { network, userSession } from './wallet'

// Treasury address — replace with your actual Stacks mainnet wallet address
export const TREASURY = 'SP1MQE0HMB765Z9EVF0CM6SPMMKW4VPDDSRKP54QX'

export function sendTip(microSTX: number, memo: string, onFinish?: () => void) {
  openSTXTransfer({
    network,
    recipient: TREASURY,
    amount: microSTX.toString(),
    memo,
    appDetails: { name: 'StackSense', icon: '/logo.png' },
    onFinish: (data) => {
      console.log('Tip sent:', data.txId)
      onFinish?.()
    },
    onCancel: () => console.log('Tip cancelled'),
    userSession,
  })
}

// 1 STX = 1,000,000 microSTX
export const ONE_STX = 1_000_000
export const FIVE_STX = 5_000_000
