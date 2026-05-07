import axios from 'axios';
import { redisClient } from '../redis/client.js';
import { toSTX } from './utils.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const HIRO_API_BASE = process.env.HIRO_API_BASE || 'https://api.hiro.so';

export type Archetype = 'Whale Wallet' | 'LP Farmer' | 'New Wallet' | 'DeFi User' | 'Unclassified Wallet';

export async function getArchetype(address: string): Promise<Archetype> {
  const cacheKey = `archetype:${address}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return cached as Archetype;
  
  const archetype = await classifyWallet(address);
  await redisClient.set(cacheKey, archetype, { EX: 21600 }); // 6 hours
  return archetype;
}

async function classifyWallet(address: string): Promise<Archetype> {
  try {
    const url = `${HIRO_API_BASE}/extended/v1/address/${address}/transactions`;
    const response = await axios.get(url, { params: { limit: 50 } });
    const transactions = response.data.results;
    
    if (transactions.length === 0) return 'New Wallet';
    
    // 1. Whale check: Total STX sent in last 50 transactions (approximation for v1)
    // Actually the rule says "last 30 days". 
    // For v1 I'll just check the sum of the last 50 transactions if they are within 30 days.
    let totalSent = 0;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    let liquidityCalls = 0;
    const protocols = new Set<string>();
    
    for (const tx of transactions) {
      const txTime = new Date(tx.burn_block_time_iso).getTime();
      if (txTime > thirtyDaysAgo && tx.sender_address === address) {
        if (tx.tx_type === 'token_transfer') {
          totalSent += toSTX(tx.token_transfer.amount);
        }
      }
      
      if (tx.tx_type === 'contract_call') {
        const contract = tx.contract_call.contract_id;
        if (contract.includes('pool') || contract.includes('lp') || contract.includes('swap')) {
          liquidityCalls++;
        }
        protocols.add(contract.split('.')[0]); // Simple protocol grouping
      }
    }
    
    if (totalSent > 500000) return 'Whale Wallet';
    
    // 2. LP Farmer: > 60% of tx are liquidity calls
    if (transactions.length > 0 && (liquidityCalls / transactions.length) > 0.6) {
      return 'LP Farmer';
    }
    
    // 3. New Wallet: age < 30 days or count < 10
    // (Using account history for age is hard without fetching all tx, but we can check if the first tx in our list is recent)
    const oldestTxInList = transactions[transactions.length - 1];
    const oldestTxTime = new Date(oldestTxInList.burn_block_time_iso).getTime();
    if (oldestTxTime > thirtyDaysAgo || response.data.total < 10) {
      return 'New Wallet';
    }
    
    // 4. DeFi User: mix of protocol interactions
    if (protocols.size >= 3) {
      return 'DeFi User';
    }
    
    return 'Unclassified Wallet';
  } catch (error) {
    console.error(`Error classifying wallet ${address}:`, error);
    return 'Unclassified Wallet';
  }
}
