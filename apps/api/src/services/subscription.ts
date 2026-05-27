/**
 * API Services - Subscription Service
 * Subscription management business logic
 */

import { cacheGet, cacheSet, cacheDelete } from './cache';
import { logger } from './logger';
import { REDIS_TTL } from '../constants';

export interface SubscriptionData {
  tier: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
  txId?: string;
}

export class SubscriptionService {
  static async getSubscription(address: string): Promise<SubscriptionData | null> {
    try {
      const cacheKey = `subscription:${address}`;
      const cached = await cacheGet<SubscriptionData>(cacheKey);

      if (cached) {
        logger.debug('Subscription cache hit', { address });
        return cached;
      }

      logger.debug('Subscription cache miss', { address });
      return null;
    } catch (error) {
      logger.error('Failed to get subscription', error, { address });
      return null;
    }
  }

  static async createSubscription(
    address: string,
    tier: string,
    txId?: string
  ): Promise<boolean> {
    try {
      const data: SubscriptionData = {
        tier: tier as SubscriptionData['tier'],
        isActive: true,
        createdAt: new Date().toISOString(),
        expiresAt: null,
        txId,
      };

      const cacheKey = `subscription:${address}`;
      await cacheSet(cacheKey, data, REDIS_TTL.API_KEY);

      logger.info('Subscription created', { address, tier });
      return true;
    } catch (error) {
      logger.error('Failed to create subscription', error, { address });
      return false;
    }
  }

  static async updateSubscription(address: string, updates: Partial<SubscriptionData>): Promise<boolean> {
    try {
      const cacheKey = `subscription:${address}`;
      const existing = await cacheGet<SubscriptionData>(cacheKey);

      if (!existing) {
        logger.warn('Subscription not found for update', { address });
        return false;
      }

      const updated = { ...existing, ...updates };
      await cacheSet(cacheKey, updated, REDIS_TTL.API_KEY);

      logger.info('Subscription updated', { address });
      return true;
    } catch (error) {
      logger.error('Failed to update subscription', error, { address });
      return false;
    }
  }

  static async deleteSubscription(address: string): Promise<boolean> {
    try {
      const cacheKey = `subscription:${address}`;
      await cacheDelete(cacheKey);

      logger.info('Subscription deleted', { address });
      return true;
    } catch (error) {
      logger.error('Failed to delete subscription', error, { address });
      return false;
    }
  }
}
