import express from 'express';
import axios from 'axios';
import { redisClient } from '../redis/client.js';
import crypto from 'crypto';

const router = express.Router();

interface WebhookAlert {
  id: string;
  subscriberAddress: string;
  webhookUrl: string;
  filters: {
    minStxAmount?: number;
    signals?: string[];
    protocols?: string[];
  };
  active: boolean;
  createdAt: string;
}

// Create a new webhook alert
router.post('/create', async (req, res) => {
  try {
    const { subscriberAddress, webhookUrl, filters } = req.body;

    if (!subscriberAddress || !webhookUrl) {
      return res.status(400).json({ error: 'subscriberAddress and webhookUrl are required' });
    }

    const webhookId = crypto.randomBytes(16).toString('hex');
    const alert: WebhookAlert = {
      id: webhookId,
      subscriberAddress,
      webhookUrl,
      filters: filters || {},
      active: true,
      createdAt: new Date().toISOString(),
    };

    await redisClient.set(
      `webhook:${webhookId}`,
      JSON.stringify(alert),
      { EX: 31536000 } // 1 year
    );

    await redisClient.sAdd(`subscriber:${subscriberAddress}:webhooks`, webhookId);

    res.json({
      webhookId,
      message: 'Webhook alert created successfully',
      alert,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create webhook alert' });
  }
});

// List webhooks for subscriber
router.get('/list/:subscriberAddress', async (req, res) => {
  try {
    const { subscriberAddress } = req.params;
    const webhookIds = await redisClient.sMembers(`subscriber:${subscriberAddress}:webhooks`);

    const webhooks: WebhookAlert[] = [];
    if (webhookIds && webhookIds.length > 0) {
      for (const id of webhookIds) {
        const data = await redisClient.get(`webhook:${id}`);
        if (data) {
          webhooks.push(JSON.parse(data));
        }
      }
    }

    res.json({ webhooks });
  } catch (error: any) {
    console.error('[Alerts] List fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks', details: error.message });
  }
});

// Disable webhook
router.post('/disable/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const data = await redisClient.get(`webhook:${webhookId}`);

    if (!data) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const alert = JSON.parse(data);
    alert.active = false;

    await redisClient.set(`webhook:${webhookId}`, JSON.stringify(alert), { EX: 31536000 });

    res.json({ message: 'Webhook disabled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable webhook' });
  }
});

// Internal: Broadcast alert to matching webhooks
export async function broadcastToWebhooks(event: any) {
  try {
    // Get all webhooks from Redis
    const keys = await redisClient.keys('webhook:*');

    for (const key of keys) {
      const webhookData = await redisClient.get(key);
      if (!webhookData) continue;

      const alert: WebhookAlert = JSON.parse(webhookData);

      if (!alert.active) continue;

      // Check if event matches filters
      const matches = checkFilters(event, alert.filters);
      if (!matches) continue;

      // Send webhook (fire and forget)
      sendWebhook(alert.webhookUrl, event).catch((err) => {
        console.error(`[Webhook] Failed to send to ${alert.webhookUrl}:`, err.message);
      });

      // Log the webhook delivery for audit/charging purposes
      await logWebhookDelivery(alert.subscriberAddress);
    }
  } catch (error) {
    console.error('[Webhooks] Error broadcasting:', error);
  }
}

function checkFilters(event: any, filters: any): boolean {
  if (filters.minStxAmount && event.stx_amount < filters.minStxAmount) {
    return false;
  }

  if (filters.signals && filters.signals.length > 0) {
    if (!filters.signals.includes(event.signal)) {
      return false;
    }
  }

  if (filters.protocols && filters.protocols.length > 0) {
    if (!filters.protocols.includes(event.protocol)) {
      return false;
    }
  }

  return true;
}

async function sendWebhook(url: string, payload: any) {
  return axios.post(url, payload, {
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
      'X-StackSense-Event': 'signal-detected',
    },
  });
}

async function logWebhookDelivery(subscriberAddress: string) {
  const key = `webhook-deliveries:${subscriberAddress}:${new Date().toISOString().split('T')[0]}`;
  await redisClient.incr(key);
  await redisClient.expire(key, 604800); // 7 days
}

export async function getWebhookUsage(subscriberAddress: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const count = await redisClient.get(`webhook-deliveries:${subscriberAddress}:${today}`);
  return parseInt(count || '0', 10);
}

export default router;
// PR: auto-generated branch pr/alerts-webhooks
