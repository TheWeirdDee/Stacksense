/**
 * Type Guards and Validators
 * Helper functions for runtime type checking
 */

import type { SubscriptionTier, ApiKey, SubscriptionStatus } from '@/types/subscription';
import type { WalletAddress, TransactionResponse } from '@/types/wallet';

export function isValidTier(tier: unknown): tier is SubscriptionTier {
  return typeof tier === 'string' && ['free', 'pro', 'enterprise'].includes(tier);
}

export function isApiKey(obj: unknown): obj is ApiKey {
  if (typeof obj !== 'object' || obj === null) return false;
  const key = obj as Record<string, unknown>;
  return (
    typeof key.id === 'string' &&
    typeof key.maskedKey === 'string' &&
    typeof key.tier === 'string' &&
    typeof key.createdAt === 'string'
  );
}

export function isSubscriptionStatus(obj: unknown): obj is SubscriptionStatus {
  if (typeof obj !== 'object' || obj === null) return false;
  const sub = obj as Record<string, unknown>;
  return (
    typeof sub.tier === 'string' &&
    typeof sub.isActive === 'boolean' &&
    (sub.expiresAt === null || typeof sub.expiresAt === 'string')
  );
}

export function isWalletAddress(obj: unknown): obj is WalletAddress {
  if (typeof obj !== 'object' || obj === null) return false;
  const wallet = obj as Record<string, unknown>;
  return typeof wallet.mainnet === 'string' && typeof wallet.testnet === 'string';
}

export function isTransactionResponse(obj: unknown): obj is TransactionResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const tx = obj as Record<string, unknown>;
  return (
    typeof tx.txId === 'string' &&
    typeof tx.status === 'string' &&
    typeof tx.amount === 'string' &&
    typeof tx.timestamp === 'number'
  );
}

export function isError(obj: unknown): obj is Error {
  return obj instanceof Error || (typeof obj === 'object' && obj !== null && 'message' in obj);
}

export function hasProperty<T extends Record<string, unknown>>(
  obj: unknown,
  key: string
): obj is T {
  return typeof obj === 'object' && obj !== null && key in obj;
}
