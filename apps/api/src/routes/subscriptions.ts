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
    const { tier = 'free', subscriberAddress, apiKey: providedApiKey, txId } = req.body;

    if (!subscriberAddress) {
      return res.status(400).json({ error: 'subscriberAddress is required' });
    }

    if (!TIERS[tier]) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const apiKey = providedApiKey || crypto.randomBytes(32).toString('hex');

    if (!/^[0-9a-f]{64}$/i.test(apiKey)) {
      return res.status(400).json({ error: 'Invalid API key format' });
    }

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
        txId,
      }),
      { EX: 2592000 } // 30 days
    );

    // Store mapping for subscriber to key
    await redisClient.sAdd(`subscriber:${subscriberAddress}:keys`, keyHash);

    res.json({
      apiKey,
      tier,
      expiresAt: expiryDate.toISOString(),
      requestsLimit: TIERS[tier].monthlyRequests,
      tierInfo: TIERS[tier],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// Get API key metadata for a subscriber
router.get('/api-key/:subscriberAddress', async (req, res) => {
  try {
    const { subscriberAddress } = req.params;
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
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

    res.json({
      tier: parsed.tier,
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt,
      requestsUsed: parsed.requestsUsed,
      requestsLimit: TIERS[parsed.tier].monthlyRequests,
      webhookUrl: parsed.webhookUrl,
      maskedKey: `${apiKey.slice(0, 8)}...${apiKey.slice(-8)}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch API key data' });
  }
});

// Get usage stats for a subscriber
router.get('/usage/:subscriberAddress', async (req, res) => {
  try {
    const { subscriberAddress } = req.params;
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
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
    const now = new Date();
    const isActive = expiresAt > now;
    const requestsLimit = TIERS[parsed.tier].monthlyRequests;
    const requestsUsed = parsed.requestsUsed ?? 0;
    const percentUsed = Math.min(100, Math.round((requestsUsed / requestsLimit) * 100));

    res.json({
      tier: parsed.tier,
      requestsUsed,
      requestsLimit,
      percentUsed,
      expiresAt: parsed.expiresAt,
      daysRemaining: isActive ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0,
      isActive,
      webhookEnabled: TIERS[parsed.tier].webhookEnabled,
      customFiltersEnabled: TIERS[parsed.tier].customRules,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

// Regenerate API key for an existing subscription
router.post('/api-key/regenerate', async (req, res) => {
  try {
    const { subscriberAddress } = req.body;
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    if (!subscriberAddress) {
      return res.status(400).json({ error: 'subscriberAddress is required' });
    }

    const oldKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyData = await redisClient.get(`api-key:${oldKeyHash}`);

    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const parsed = JSON.parse(keyData);

    if (parsed.subscriberAddress !== subscriberAddress) {
      return res.status(403).json({ error: 'API key does not match subscriber' });
    }

    const newApiKey = crypto.randomBytes(32).toString('hex');
    const newKeyHash = crypto.createHash('sha256').update(newApiKey).digest('hex');

    await redisClient.del(`api-key:${oldKeyHash}`);
    await redisClient.set(
      `api-key:${newKeyHash}`,
      JSON.stringify({
        ...parsed,
        createdAt: new Date().toISOString(),
        requestsUsed: 0,
      }),
      { EX: 2592000 }
    );
    await redisClient.sRem(`subscriber:${subscriberAddress}:keys`, oldKeyHash);
    await redisClient.sAdd(`subscriber:${subscriberAddress}:keys`, newKeyHash);

    res.json({
      newApiKey,
      tier: parsed.tier,
      expiresAt: parsed.expiresAt,
      requestsLimit: TIERS[parsed.tier].monthlyRequests,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
});

// Get subscription status
router.get('/subscription/:subscriberAddress', async (req, res) => {
  try {
    const { subscriberAddress } = req.params;
    const apiKey = req.headers['x-api-key'] as string;

    let keyData = null;

    // If API key provided, use it for lookup (more direct)
    if (apiKey) {
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const data = await redisClient.get(`api-key:${keyHash}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.subscriberAddress !== subscriberAddress) {
          return res.status(403).json({ error: 'API key does not match subscriber' });
        }
        keyData = parsed;
      }
    } else {
      // If no API key, find most recent active subscription by address
      const keyHashes = await redisClient.sMembers(`subscriber:${subscriberAddress}:keys`);
      if (keyHashes && keyHashes.length > 0) {
        // Get all keys for this subscriber and find the most recent active one
        let mostRecent = null;
        for (const keyHash of keyHashes) {
          const data = await redisClient.get(`api-key:${keyHash}`);
          if (data) {
            const parsed = JSON.parse(data);
            const expiresAt = new Date(parsed.expiresAt);
            if (expiresAt > new Date()) {
              // This subscription is still active
              if (!mostRecent || new Date(parsed.createdAt) > new Date(mostRecent.createdAt)) {
                mostRecent = parsed;
              }
            }
          }
        }
        keyData = mostRecent;
      }
    }

    if (!keyData) {
      // Return free tier info if no active subscription found
      return res.json({
        tier: 'free',
        tierInfo: TIERS.free,
        isActive: false,
      });
    }

    const expiresAt = new Date(keyData.expiresAt);
    const isActive = expiresAt > new Date();

    res.json({
      tier: keyData.tier,
      tierInfo: TIERS[keyData.tier],
      createdAt: keyData.createdAt,
      expiresAt: keyData.expiresAt,
      isActive,
      requestsUsed: keyData.requestsUsed,
      requestsLimit: TIERS[keyData.tier].monthlyRequests,
      webhookUrl: keyData.webhookUrl,
    });
  } catch (error) {
    console.error('Subscription lookup error:', error);
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

// Get masked API key for subscriber
router.get('/api-key/:subscriberAddress', async (req, res) => {
  try {
    const { subscriberAddress } = req.params;
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required to view your key' });
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

    // Return masked key: show first 8 and last 6 chars, hide middle
    const masked = apiKey.slice(0, 8) + '…' + apiKey.slice(-6);

    res.json({
      maskedKey: masked,
      tier: parsed.tier,
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt,
      requestsUsed: parsed.requestsUsed,
      requestsLimit: TIERS[parsed.tier].monthlyRequests,
    });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({ error: 'Failed to retrieve API key' });
  }
});

// Regenerate API key for subscriber
router.post('/api-key/regenerate', async (req, res) => {
  try {
    const { subscriberAddress } = req.body;
    const oldApiKey = req.headers['x-api-key'] as string;

    if (!subscriberAddress || !oldApiKey) {
      return res.status(400).json({ error: 'subscriberAddress and API key required' });
    }

    const oldKeyHash = crypto.createHash('sha256').update(oldApiKey).digest('hex');
    const oldKeyData = await redisClient.get(`api-key:${oldKeyHash}`);

    if (!oldKeyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const oldParsed = JSON.parse(oldKeyData);

    if (oldParsed.subscriberAddress !== subscriberAddress) {
      return res.status(403).json({ error: 'API key does not match subscriber' });
    }

    // Generate new key
    const newApiKey = crypto.randomBytes(32).toString('hex');
    const newKeyHash = crypto.createHash('sha256').update(newApiKey).digest('hex');

    // Preserve tier, expiry, etc from old key
    const expiryDate = new Date(oldParsed.expiresAt);
    const newKeyData = {
      tier: oldParsed.tier,
      subscriberAddress,
      createdAt: new Date().toISOString(),
      expiresAt: expiryDate.toISOString(),
      requestsUsed: 0, // Reset usage counter on regenerate
      webhookUrl: oldParsed.webhookUrl,
    };

    // Store new key
    await redisClient.set(`api-key:${newKeyHash}`, JSON.stringify(newKeyData), { EX: 2592000 });

    // Add to subscriber keys
    await redisClient.sAdd(`subscriber:${subscriberAddress}:keys`, newKeyHash);

    // Remove old key
    await redisClient.del(`api-key:${oldKeyHash}`);
    await redisClient.sRem(`subscriber:${subscriberAddress}:keys`, oldKeyHash);

    res.json({
      newApiKey,
      tier: oldParsed.tier,
      expiresAt: expiryDate.toISOString(),
      requestsLimit: TIERS[oldParsed.tier].monthlyRequests,
      message: 'API key regenerated successfully. The old key has been invalidated.',
    });
  } catch (error) {
    console.error('Regenerate API key error:', error);
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
});

// Get usage stats for subscriber
router.get('/usage/:subscriberAddress', async (req, res) => {
  try {
    const { subscriberAddress } = req.params;
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
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

    const tier = TIERS[parsed.tier];
    const expiresAt = new Date(parsed.expiresAt);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const percentUsed = Math.round((parsed.requestsUsed / tier.monthlyRequests) * 100);

    res.json({
      tier: parsed.tier,
      requestsUsed: parsed.requestsUsed,
      requestsLimit: tier.monthlyRequests,
      percentUsed,
      expiresAt: parsed.expiresAt,
      daysRemaining: Math.max(0, daysRemaining),
      isActive: expiresAt > now,
      webhookEnabled: tier.webhookEnabled,
      customFiltersEnabled: tier.customRules,
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

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
// PR: auto-generated branch pr/subscriptions-api
