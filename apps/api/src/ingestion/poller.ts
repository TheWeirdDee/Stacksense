import axios from 'axios';
import { redisClient, connectRedis } from '../redis/client.js';
import { matchTransaction } from '../engine/matcher.js';
import { broadcastEvent } from '../ws/server.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const HIRO_API_BASE = process.env.HIRO_API_BASE || 'https://api.hiro.so';
const HIRO_API_KEY = process.env.HIRO_API_KEY;

if (!HIRO_API_KEY) {
  console.warn('[Poller] WARNING: HIRO_API_KEY not set. Requests may be rate-limited.');
}

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
  
  const response = await axios.get(url, { params, headers });
  const transactions = response.data.results;
  
  let newCount = 0;
  let skippedCount = 0;

  console.log(`[Poller] Fetching transactions from Hiro API...`);
  console.log(`[Poller] Fetched ${transactions.length} transactions.`);

  for (const tx of transactions) {
    const isSeen = await redisClient.sIsMember('seen:txids', tx.tx_id);
    if (isSeen) {
      skippedCount++;
      continue;
    }
    newCount++;
    
    // Process new transaction
    await processTransaction(tx);
    
    // Mark as seen with 48h TTL (Redis sets don't support per-item TTL easily, 
    // but we can use a separate key or just accept the set grows and we clean it up.
    // The prompt says "Add tx_id to seen:txids with 48h TTL".
    // Since it's a Set, I'll use a separate key for TTL tracking or just use a String key for each tx_id if we want strict TTL.
    // However, "seen:txids" as a Set is better for sIsMember.
    // I'll use a string key for the TTL and the Set for membership if I must, 
    // but usually we just expire the whole set or use a Sorted Set.
    // Actually, I'll just use a String key `seen:txid:${tx.tx_id}` for simplicity and exact 48h TTL.
    
    await redisClient.set(`seen:txid:${tx.tx_id}`, '1', { EX: 172800 }); // 48h
    await redisClient.sAdd('seen:txids', tx.tx_id);
  }

  console.log(`[Poller] New: ${newCount}, Skipped: ${skippedCount}`);
}

async function processTransaction(tx: any) {
  try {
    const event = await matchTransaction(tx);
    if (event) {
      console.log(`[Poller] Rule matched: ${event.rule_id} → ${event.signal} (${event.stx_amount} STX)`);
      
      // Store in recent events list
      await redisClient.lPush('events:recent', JSON.stringify(event));
      await redisClient.lTrim('events:recent', 0, 499);
      
      // Broadcast logic
      broadcastEvent(event);
      console.log(`[Poller] Broadcasting to WebSocket clients`);
    }
  } catch (error) {
    console.error(`Error processing tx ${tx.tx_id}:`, error);
  }
}
