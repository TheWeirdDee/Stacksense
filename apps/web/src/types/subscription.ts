/**
 * Subscription Types
 * Defines subscription tier and plan structures
 */

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface Tier {
  tier: SubscriptionTier;
  monthlyRequests: number;
  webhookEnabled: boolean;
  prioritySupport: boolean;
  customRules: boolean;
  monthlyCost: number;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  tierInfo: Tier;
  isActive: boolean;
  expiresAt?: string;
  requestsUsed?: number;
  requestsLimit?: number;
  createdAt?: string;
}

export interface ApiKey {
  id: string;
  maskedKey: string;
  tier: SubscriptionTier;
  createdAt: string;
  expiresAt: string;
  requestsUsed: number;
  requestsLimit: number;
  isActive: boolean;
}

export interface SubscriptionPayload {
  tier: SubscriptionTier;
  subscriberAddress: string;
  txId?: string;
  apiKey?: string;
}
