/**
 * Middleware - Rate Limiting
 * Basic rate limiting middleware
 */
import { cacheIncrement, cacheSet } from '../utils/cache.js';
const defaultConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => req.ip || 'unknown',
};
export function rateLimit(config = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    return async (req, res, next) => {
        try {
            const key = `rate-limit:${finalConfig.keyGenerator?.(req)}`;
            const windowKey = `${key}:${Math.floor(Date.now() / finalConfig.windowMs)}`;
            const current = await cacheIncrement(windowKey);
            if (current === 1) {
                await cacheSet(windowKey, 1, Math.ceil(finalConfig.windowMs / 1000));
            }
            res.set('X-RateLimit-Limit', finalConfig.maxRequests.toString());
            res.set('X-RateLimit-Remaining', Math.max(0, finalConfig.maxRequests - current).toString());
            res.set('X-RateLimit-Reset', new Date(Date.now() + finalConfig.windowMs).toISOString());
            if (current > finalConfig.maxRequests) {
                res.status(429).json({
                    success: false,
                    error: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests',
                    retryAfter: finalConfig.windowMs,
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Rate limit error:', error);
            next();
        }
    };
}
