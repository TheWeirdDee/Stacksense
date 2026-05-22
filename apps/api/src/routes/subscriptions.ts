import express from 'express';
import { redisClient } from '../redis/client.js';
import crypto from 'crypto';

const router = express.Router();

interface SubscriptionTier {
  tier: 'free' | 'pro' | 'enterprise';
  monthlyRequests: number;
  webhookEnabled: boolean;
  prioritySupport: boolean;
  customRules: boolean;
  monthlyCost: number; // in STX
}

const TIERS: Record<string, SubscriptionTier> = {
  free: {
    tier: 'free',
    monthlyRequests: 1000,
    webhookEnabled: false,
    prioritySupport: false,
    customRules: false,
    monthlyCost: 0,
  },
  pro: {
    tier: 'pro',
    monthlyRequests: 100000,
    webhookEnabled: true,
    prioritySupport: false,
    customRules: false,
    monthlyCost: 1,
  },
  enterprise: {
    tier: 'enterprise',
    monthlyRequests: 1000000,
    webhookEnabled: true,
    prioritySupport: true,
    customRules: true,
    monthlyCost: 10,
  },
};

// Generate API key
router.post('/api-keys/generate', async (req, res) => {
  try {
    const { tier = 'free', subscriberAddress } = req.body;

    if (!subscriberAddress) {
      return res.status(400).json({ error: 'subscriberAddress is required' });
    }

    if (!TIERS[tier]) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const apiKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Store in Redis with tier info and expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    await redisClient.set(
      `api-key:${keyHash}`,
      JSON.stringify({
        tier,
        subscriberAddress,
        createdAt: new Date().toISOString(),
        expiresAt: expiryDate.toISOString(),
        requestsUsed: 0,
        webhookUrl: null,
      }),
      { EX: 2592000 } // 30 days
    );

    // Store mapping for subscriber to key
    await redisClient.sAdd(`subscriber:${subscriberAddress}:keys`, keyHash);

    res.json({
      apiKey, // Show full key only on creation
      tier,
      expiresAt: expiryDate.toISOString(),
      requestsLimit: TIERS[tier].monthlyRequests,
      tierInfo: TIERS[tier],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// Get subscription status
router.get('/subscription/:subscriberAddress', async (req, res) => {
  try {
    const { subscriberAddress } = req.params;
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      // Return free tier info without auth
      return res.json({
        tier: 'free',
        tierInfo: TIERS.free,
        requiresAuth: true,
      });
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyData = await redisClient.get(`api-key:${keyHash}`);

    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const parsed = JSON.parse(keyData);

    if (parsed.subscriberAddress !== subscriberAddress) {
      return res.status(403).json({ error: 'API key does not match subscriber' });
    }

    const expiresAt = new Date(parsed.expiresAt);
    const isActive = expiresAt > new Date();

    res.json({
      tier: parsed.tier,
      tierInfo: TIERS[parsed.tier],
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt,
      isActive,
      requestsUsed: parsed.requestsUsed,
      requestsLimit: TIERS[parsed.tier].monthlyRequests,
      webhookUrl: parsed.webhookUrl,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Check and increment request quota
export async function checkApiQuota(apiKey: string): Promise<boolean> {
  if (!apiKey) return true; // Allow free tier

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyData = await redisClient.get(`api-key:${keyHash}`);

  if (!keyData) {
    return false; // Invalid key
  }

  const parsed = JSON.parse(keyData);
  const expiresAt = new Date(parsed.expiresAt);

  if (expiresAt < new Date()) {
    return false; // Subscription expired
  }

  // Check request limit
  const tierInfo = TIERS[parsed.tier];
  if (parsed.requestsUsed >= tierInfo.monthlyRequests) {
    return false; // Over quota
  }

  // Increment usage
  parsed.requestsUsed += 1;
  await redisClient.set(`api-key:${keyHash}`, JSON.stringify(parsed), {
    EX: 2592000,
  });

  return true;
}

// Middleware for API key validation
export function apiKeyMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey && req.path !== '/public') {
    return res.status(401).json({ error: 'API key required' });
  }

  res.locals.apiKey = apiKey;
  next();
}

// Pricing info
router.get('/pricing', (req, res) => {
  res.json({
    tiers: TIERS,
    features: {
      free: ['1,000 requests/month', 'REST API only', 'Community support'],
      pro: ['100,000 requests/month', 'Webhook support', 'Custom filters', '5 STX/month'],
      enterprise: ['1M requests/month', 'All features', 'Priority support', 'Custom rules', '25 STX/month'],
    },
  });
});

export default router;
