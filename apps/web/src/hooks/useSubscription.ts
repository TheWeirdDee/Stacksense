/**
 * Custom Hook - useSubscription
 * Manages subscription tier and related data
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { logger } from '@/lib/logger';
import type { SubscriptionStatus } from '@/types/subscription';

export function useSubscription(address?: string) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!address) {
      setSubscription(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<SubscriptionStatus>(
        `/api/v1/subscriptions/${address}`
      );
      setSubscription(response);
      logger.info('Subscription fetched', { address, tier: response.tier });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription';
      setError(errorMessage);
      logger.error('Failed to fetch subscription', err, { address });
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const upgrade = useCallback(
    async (newTier: 'pro' | 'enterprise') => {
      if (!address) return false;

      try {
        await apiClient.post('/api/v1/subscriptions/upgrade', {
          address,
          tier: newTier,
        });

        // Refresh subscription data
        await fetchSubscription();
        logger.info('Subscription upgraded', { address, newTier });
        return true;
      } catch (err) {
        logger.error('Upgrade failed', err, { address, newTier });
        return false;
      }
    },
    [address, fetchSubscription]
  );

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    upgrade,
    isActive: subscription?.isActive ?? false,
    tier: subscription?.tier ?? 'free',
  };
}
