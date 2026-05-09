import { openSTXTransfer, AppConfig, UserSession } from '@stacks/connect'
import { StacksMainnet } from '@stacks/network'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

export const TREASURY_ADDRESS = 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV'

export function toSTX(microSTX: string | number): number {
  return Math.round(Number(microSTX) / 1_000_000)
}

export function fmtSTX(n: number): string {
  return Math.round(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function fmtUSD(n: number): string {
  return Math.round(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function sendTip(memo: string, onFinish?: (txId: string) => void) {
  openSTXTransfer({
    network: new StacksMainnet(),
    recipient: TREASURY_ADDRESS,
    amount: '1000000',
    memo: memo.slice(0, 34),
    appDetails: { name: 'StackSense', icon: '' },
    userSession,
    onFinish: (data: any) => onFinish?.(data.txId),
    onCancel: () => {},
  })
}
