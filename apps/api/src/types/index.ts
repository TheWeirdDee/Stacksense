/**
 * Backend Types - API Responses
 * Type definitions for backend API responses
 */

export interface SubscriptionResponse {
  tier: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  txId?: string;
}

export interface ApiKeyResponse {
  key: string;
  maskedKey: string;
  tier: string;
  createdAt: string;
  expiresAt: string;
}

export interface UsageResponse {
  requestsUsed: number;
  requestsLimit: number;
  percentageUsed: number;
  daysRemaining: number;
  resetDate: string;
}

export interface PricingResponse {
  tiers: Array<{
    name: string;
    price: number;
    monthlyRequests: number;
    features: string[];
  }>;
}

export interface FeedEventResponse {
  id: string;
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface StatsResponse {
  totalEvents: number;
  totalWallets: number;
  activeNow: number;
  lastUpdated: string;
}

export interface WalletHistoryResponse {
  address: string;
  events: FeedEventResponse[];
  totalEvents: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
}
