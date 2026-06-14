/**
 * API Services - Subscription Service
 * Subscription management business logic
 */
import { cacheGet, cacheSet, cacheDelete } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import { REDIS_TTL } from '../constants.js';
export class SubscriptionService {
    static async getSubscription(address) {
        try {
            const cacheKey = `subscription:${address}`;
            const cached = await cacheGet(cacheKey);
            if (cached) {
                logger.debug('Subscription cache hit', { address });
                return cached;
            }
            logger.debug('Subscription cache miss', { address });
            return null;
        }
        catch (error) {
            logger.error('Failed to get subscription', error, { address });
            return null;
        }
    }
    static async createSubscription(address, tier, txId) {
        try {
            const data = {
                tier: tier,
                isActive: true,
                createdAt: new Date().toISOString(),
                expiresAt: null,
                txId,
            };
            const cacheKey = `subscription:${address}`;
            await cacheSet(cacheKey, data, REDIS_TTL.API_KEY);
            logger.info('Subscription created', { address, tier });
            return true;
        }
        catch (error) {
            logger.error('Failed to create subscription', error, { address });
            return false;
        }
    }
    static async updateSubscription(address, updates) {
        try {
            const cacheKey = `subscription:${address}`;
            const existing = await cacheGet(cacheKey);
            if (!existing) {
                logger.warn('Subscription not found for update', { address });
                return false;
            }
            const updated = { ...existing, ...updates };
            await cacheSet(cacheKey, updated, REDIS_TTL.API_KEY);
            logger.info('Subscription updated', { address });
            return true;
        }
        catch (error) {
            logger.error('Failed to update subscription', error, { address });
            return false;
        }
    }
    static async deleteSubscription(address) {
        try {
            const cacheKey = `subscription:${address}`;
            await cacheDelete(cacheKey);
            logger.info('Subscription deleted', { address });
            return true;
        }
        catch (error) {
            logger.error('Failed to delete subscription', error, { address });
            return false;
        }
    }
}
