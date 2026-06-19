import { openSTXTransfer, AppConfig, UserSession } from '@stacks/connect'
import { StacksMainnet } from '@stacks/network'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

export const TREASURY_ADDRESS = 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV'

export function toSTX(microSTX: string | number): number {
  const n = Number(microSTX);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 1_000_000);
}

export function fmtSTX(n: number): string {
  if (!Number.isFinite(n)) return '--'
  return Math.round(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function fmtUSD(n: number): string {
  if (!Number.isFinite(n)) return '--'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export const ONE_STX = '1000000'

export function sendTip(amount: string, memo: string, onFinish?: (txId: string) => void, onCancel?: () => void) {
  try {
    openSTXTransfer({
      network: new StacksMainnet(),
      recipient: TREASURY_ADDRESS,
      amount,
      memo: String(memo || '').slice(0, 34),
      appDetails: { name: 'StackSense', icon: '' },
      userSession,
      onFinish: (data: any) => onFinish?.(data.txId),
      onCancel: () => onCancel?.(),
    })
  } catch (err) {
    console.error('sendTip failed:', err)
    onCancel?.()
  }
}
