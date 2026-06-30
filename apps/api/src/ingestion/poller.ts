import axios from 'axios';
import { redisClient, connectRedis } from '../redis/client.js';
import { matchTransaction } from '../engine/matcher.js';
import { broadcastEvent, getClientCount } from '../ws/server.js';
import { broadcastToWebhooks } from '../routes/alerts.js';
import { sendHighConvictionAlert } from '../integrations/telegram.js';
import { recordPollCycle, recordPollError } from '../utils/metrics.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const HIRO_API_BASE = (process.env.HIRO_API_BASE || 'https://api.hiro.so').trim();
const HIRO_API_KEY = process.env.HIRO_API_KEY;

export async function startPoller() {
  await connectRedis();
  
  console.log('Starting Hiro API poller...');
  
  setInterval(async () => {
    try {
      await pollTransactions();
    } catch (error) {
      console.error('Error in poller:', error);
    }
  }, 10000);
}

async function pollTransactions() {
  if (!process.env.HIRO_API_KEY) {
    console.warn('[Poller] WARNING: HIRO_API_KEY is not set. API calls will be rate-limited.')
  }

  const url = `${HIRO_API_BASE}/extended/v1/tx`;
  const params = {
    limit: 50,
    type: ['contract_call', 'token_transfer'],
    unanchored: false,
  };
  const headers: Record<string, string> = {};
  if (HIRO_API_KEY) {
    headers['x-api-key'] = HIRO_API_KEY;
  }

  const requestOptions = { headers, timeout: 7000, params };

  const startedAt = Date.now();
  try {
    const response = await axios.get(url, requestOptions);
    const latencyMs = Date.now() - startedAt;
    const transactions = response.data.results;

    let newCount = 0;
    let skippedCount = 0;

    for (const tx of transactions) {
      const isSeen = await redisClient.exists(`seen:txid:${tx.tx_id}`);
      if (isSeen) {
        skippedCount++;
        continue;
      }
      newCount++;

      await processTransaction(tx);
      await redisClient.set(`seen:txid:${tx.tx_id}`, '1', { EX: 172800 });
    }

    recordPollCycle({ latencyMs, fetched: transactions.length, newCount, skippedCount });

    if (newCount > 0 || skippedCount > 0) {
      console.log(`[Poller] Cycle: ${transactions.length} fetched | ${newCount} new | ${skippedCount} skipped | ${latencyMs}ms`);
    }
  } catch (error: any) {
      recordPollError(error?.message || String(error));
      console.error('[Poller] Fetch error:', error?.message || error);
  }
}

async function processTransaction(tx: any) {
  try {
    const event = await matchTransaction(tx);
    if (event) {
      console.log(`[Poller] ✓ Matched "${event.rule_id}" → ${event.signal.toUpperCase()} | ${event.stx_amount.toLocaleString()} STX`)
      
      await redisClient.lPush('events:recent', JSON.stringify(event));
      await redisClient.lTrim('events:recent', 0, 499);
      
      broadcastEvent(event);
      
      // Broadcast to webhook subscribers
      await broadcastToWebhooks(event);
      
      if ((event.is_anomaly && (event.multiplier ?? 0) >= 5.0) || event.wallet_archetype === 'Whale Wallet') {
        sendHighConvictionAlert(event);
      }

      console.log(`[Poller] Broadcast to ${getClientCount()} WebSocket clients`)
    }
  } catch (error: any) {
    console.error(`Error processing tx ${tx.tx_id}:`, error.message || error);
  }
}