/**
 * Backend Constants
 * Centralized constants for backend operations
 */
export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    PRO: 'pro',
    ENTERPRISE: 'enterprise',
};
export const TIER_LIMITS = {
    free: {
        monthlyRequests: 1000,
        webhookEnabled: false,
        prioritySupport: false,
    },
    pro: {
        monthlyRequests: 50000,
        webhookEnabled: true,
        prioritySupport: false,
    },
    enterprise: {
        monthlyRequests: 1000000,
        webhookEnabled: true,
        prioritySupport: true,
    },
};
export const REDIS_KEYS = {
    API_KEY: 'api-key:',
    SUBSCRIBER: 'subscriber:',
    USAGE: 'usage:',
    PROCESSED_TX: 'processed-tx:',
    RATE_LIMIT: 'rate-limit:',
};
export const REDIS_TTL = {
    API_KEY: 30 * 24 * 60 * 60, // 30 days
    PROCESSED_TX: 48 * 60 * 60, // 48 hours
    USAGE: 24 * 60 * 60, // 24 hours
    RATE_LIMIT: 60, // 1 minute
};
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMIT: 429,
    SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};
export const ERROR_MESSAGES = {
    INVALID_API_KEY: 'Invalid API key',
    INVALID_ADDRESS: 'Invalid Stacks address',
    INVALID_TIER: 'Invalid subscription tier',
    KEY_NOT_FOUND: 'API key not found',
    SUBSCRIPTION_EXPIRED: 'Subscription has expired',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    INTERNAL_ERROR: 'Internal server error',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
};
export const POLLER_CONFIG = {
    POLL_INTERVAL: 10000, // 10 seconds
    BATCH_SIZE: 50,
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000, // 5 seconds
};
