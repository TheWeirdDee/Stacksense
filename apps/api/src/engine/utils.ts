export function toSTX(microSTX: string | number): number {
  return Math.round(Number(microSTX) / 1_000_000)
}

export function formatSTX(amount: number): string {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
