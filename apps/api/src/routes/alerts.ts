import express from 'express';
import axios from 'axios';
import { redisClient } from '../redis/client.js';
import crypto from 'crypto';
import { checkWebhookUrl } from '../utils/ssrf.js';
import { sendDirectAlert } from '../integrations/telegram.js';

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
  secret: string;
}

 
router.post('/create', async (req, res) => {
  try {
    const { subscriberAddress, webhookUrl, filters } = req.body;

    if (!subscriberAddress || !webhookUrl) {
      return res.status(400).json({ error: 'subscriberAddress and webhookUrl are required' });
    }

    const safety = await checkWebhookUrl(webhookUrl);
    if (!safety.ok) {
      return res.status(400).json({ error: `webhookUrl rejected: ${safety.reason}` });
    }

    const webhookId = crypto.randomBytes(16).toString('hex');
    const secret = crypto.randomBytes(24).toString('hex');
    const alert: WebhookAlert = {
      id: webhookId,
      subscriberAddress,
      webhookUrl,
      filters: filters || {},
      active: true,
      createdAt: new Date().toISOString(),
      secret,
    };

    await redisClient.set(
      `webhook:${webhookId}`,
      JSON.stringify(alert),
      { EX: 31536000 } // 1 year
    );

    await redisClient.sAdd(`subscriber:${subscriberAddress}:webhooks`, webhookId);

    res.json({
      webhookId,
      // Returned only once — receivers use it to verify payload signatures.
      signingSecret: secret,
      message: 'Webhook alert created successfully',
      alert: { ...alert, secret: undefined },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create webhook alert' });
  }
});

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

export async function broadcastToWebhooks(event: any) {
  try {
    const keys = await redisClient.keys('webhook:*');

    for (const key of keys) {
      const webhookData = await redisClient.get(key);
      if (!webhookData) continue;

      const alert: WebhookAlert = JSON.parse(webhookData);

      if (!alert.active) continue;

      if (!checkFilters(event, alert.filters)) continue;

      sendWebhook(alert.webhookUrl, event, alert.secret).catch((err) => {
        console.error(`[Webhook] Failed to send to ${alert.webhookUrl}:`, err.message);
      });

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

async function sendWebhook(url: string, payload: any, secret?: string) {
  // Re-validate immediately before sending to mitigate DNS-rebinding.
  const safety = await checkWebhookUrl(url);
  if (!safety.ok) {
    throw new Error(`blocked unsafe target: ${safety.reason}`);
  }

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-StackSense-Event': 'signal-detected',
  };
  if (secret) {
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    headers['X-StackSense-Signature'] = `sha256=${signature}`;
  }

  return axios.post(url, body, { timeout: 5000, headers, maxRedirects: 0 });
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

// ─── Telegram per-wallet subscriptions ─────────────────────────────────────

const STACKS_ADDR_RE = /^(SP|SM)[A-Z0-9]{28,40}$/;
const TELEGRAM_CHAT_ID_RE = /^-?\d{1,20}$/;

router.post('/telegram/subscribe', async (req, res) => {
  const { walletAddress, chatId, label } = req.body;
  if (!walletAddress || !chatId) {
    return res.status(400).json({ error: 'walletAddress and chatId are required' });
  }
  if (!STACKS_ADDR_RE.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid Stacks wallet address' });
  }
  if (!TELEGRAM_CHAT_ID_RE.test(String(chatId))) {
    return res.status(400).json({ error: 'Invalid Telegram chat ID' });
  }
  if (label && (typeof label !== 'string' || label.length > 100)) {
    return res.status(400).json({ error: 'label must be a string under 100 characters' });
  }

  const subId = crypto.randomBytes(12).toString('hex');
  const sub = {
    id: subId,
    walletAddress,
    chatId,
    label: label || `Wallet ${walletAddress.slice(0, 8)}`,
    active: true,
    createdAt: new Date().toISOString(),
  };

  try {
    await redisClient.set(`tg:sub:${subId}`, JSON.stringify(sub), { EX: 60 * 60 * 24 * 90 });
    await redisClient.sAdd(`tg:wallet:${walletAddress}:subs`, subId);
    await redisClient.sAdd(`tg:chat:${chatId}:subs`, subId);

    await sendDirectAlert(chatId, {
      title: 'Wallet Alert Activated',
      description: `You will now receive alerts when ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)} has significant activity on Stacks.`,
      stx_amount: 0,
      usd_amount: 0,
      wallet_address: walletAddress,
      wallet_archetype: 'Subscribed',
      signal: 'neutral',
      explorer_url: `https://explorer.stacks.co/address/${walletAddress}?chain=mainnet`,
    });

    res.json({ subId, message: 'Telegram alert subscription created' });
  } catch {
    res.status(500).json({ error: 'Failed to create Telegram subscription' });
  }
});

router.delete('/telegram/unsubscribe/:subId', async (req, res) => {
  const { subId } = req.params;
  try {
    const raw = await redisClient.get(`tg:sub:${subId}`);
    if (!raw) return res.status(404).json({ error: 'Subscription not found' });
    const sub = JSON.parse(raw);
    sub.active = false;
    await redisClient.set(`tg:sub:${subId}`, JSON.stringify(sub), { EX: 60 * 60 * 24 * 90 });
    res.json({ message: 'Unsubscribed' });
  } catch {
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

router.get('/telegram/list/:chatId', async (req, res) => {
  const { chatId } = req.params;
  try {
    const subIds = await redisClient.sMembers(`tg:chat:${chatId}:subs`);
    const subs = await Promise.all(
      subIds.map(async (id: string) => {
        const raw = await redisClient.get(`tg:sub:${id}`);
        return raw ? JSON.parse(raw) : null;
      })
    );
    res.json({ subscriptions: subs.filter(Boolean).filter((s: any) => s.active) });
  } catch {
    res.status(500).json({ error: 'Failed to list subscriptions' });
  }
});

export default router;
