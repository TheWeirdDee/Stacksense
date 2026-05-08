import axios from 'axios';
import { redisClient, connectRedis } from '../redis/client.js';
import { matchTransaction } from '../engine/matcher.js';
import { broadcastEvent, getClientCount } from '../ws/server.js';
import { sendHighConvictionAlert } from '../integrations/telegram.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const HIRO_API_BASE = process.env.HIRO_API_BASE || 'https://api.hiro.so';
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
  
  try {
    const response = await axios.get(url, { params, headers });
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

    console.log(`[Poller] Fetched ${transactions.length} txs. New: ${newCount}, Skipped: ${skippedCount}`)
  } catch (error) {
    console.error('[Poller] Fetch error:', error);
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
      
      if ((event.is_anomaly && event.multiplier >= 5.0) || event.wallet_archetype === 'Whale Wallet') {
        sendHighConvictionAlert(event);
      }

      console.log(`[Poller] Broadcast to ${getClientCount()} WebSocket clients`)
    }
  } catch (error) {
    console.error(`Error processing tx ${tx.tx_id}:`, error);
  }
}
