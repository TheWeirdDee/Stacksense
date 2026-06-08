
export const API_ENDPOINTS = {
  // Subscriptions
  SUBSCRIBE: '/api/v1/subscriptions/subscribe',
  GET_SUBSCRIPTION: '/api/v1/subscriptions/:address',
  GENERATE_KEY: '/api/v1/subscriptions/api-keys/generate',
  GET_KEY: '/api/v1/subscriptions/api-key/:address',
  REGENERATE_KEY: '/api/v1/subscriptions/api-key/regenerate',
  GET_USAGE: '/api/v1/subscriptions/usage/:address',
  
  // Health & Stats
  HEALTH: '/health',
  STATS: '/api/v1/stats',
  PRICING: '/pricing',
  
  // Feed
  FEED: '/api/v1/feed',
  WALLET_HISTORY: '/api/v1/wallet/:address',
  
  // Alerts & Projects
  ALERTS: '/api/v1/alerts',
  PROJECTS: '/api/v1/projects',
  DEVELOPERS: '/api/v1/developers',
} as const;

export const TIER_FEATURES = {
  free: {
    monthlyRequests: 1000,
    webhookEnabled: false,
    prioritySupport: false,
    customRules: false,
  },
  pro: {
    monthlyRequests: 50000,
    webhookEnabled: true,
    prioritySupport: false,
    customRules: true,
  },
  enterprise: {
    monthlyRequests: 1000000,
    webhookEnabled: true,
    prioritySupport: true,
    customRules: true,
  },
} as const;

export const TIER_PRICING = {
  free: 0,
  pro: 99,
  enterprise: 999,
} as const;

export const API_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
} as const;

export const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 15 * 60 * 1000, // 15 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const TIMEOUT_MS = {
  FAST: 5000,
  NORMAL: 10000,
  SLOW: 30000,
} as const;
