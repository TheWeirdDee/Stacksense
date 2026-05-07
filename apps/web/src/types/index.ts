export type SignalType = 'bullish' | 'neutral' | 'risk' | 'anomaly';

export type Archetype = 'Whale Wallet' | 'LP Farmer' | 'New Wallet' | 'DeFi User' | 'Simulated Agent' | 'Protocol Bot' | 'Unclassified Wallet';

export interface InterpretedEvent {
  id: string;
  tx_id: string;
  timestamp: string;
  signal: SignalType;
  protocol: string;
  title: string;
  description: string;
  context?: string;
  stx_amount: number;
  usd_amount: number;
  wallet_address: string;
  wallet_archetype: Archetype;
  explorer_url: string;
  rule_id: string;
}

export interface WalletSummary {
  address: string;
  archetype: Archetype;
  total_stx_sent_30d: number;
  tx_count: number;
  first_seen: string;
}

export interface GlobalStats {
  events_last_10m: number;
  stx_moved_today: number;
  most_active_protocol_today: string;
  total_events_today: number;
  last_updated: string;
}
