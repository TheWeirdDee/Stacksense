export interface FeedEvent {
  id: string
  tx_id: string
  timestamp: string
  signal: string
  protocol: string
  title: string
  description: string
  context?: string
  stx_amount: number
  usd_amount: number
  wallet_address: string
  wallet_archetype: string
  explorer_url: string
  rule_id: string
  multiplier?: number
  is_anomaly?: boolean
}
