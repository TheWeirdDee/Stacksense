import axios from 'axios';
import { redisClient } from '../redis/client.js';
import { toSTX } from './utils.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const HIRO_API_BASE = process.env.HIRO_API_BASE || 'https://api.hiro.so';

export type Archetype = 'Whale Wallet' | 'LP Farmer' | 'New Wallet' | 'DeFi User' | 'Unclassified Wallet';

export interface WalletDetails {
  archetype: Archetype;
  scores: {
    diamond_hands: number;
    defi_degens: number;
  };
  protocols: { name: string; value: number }[];
  activity_summary: string;
}

export async function getArchetype(address: string): Promise<Archetype> {
  const cacheKey = `archetype:${address}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return cached as Archetype;
  
  const details = await analyzeWallet(address);
  await redisClient.set(cacheKey, details.archetype, { EX: 21600 });
  return details.archetype;
}

export async function getDetailedArchetype(address: string): Promise<WalletDetails> {
  const cacheKey = `details:${address}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const details = await analyzeWallet(address);
  await redisClient.set(cacheKey, JSON.stringify(details), { EX: 3600 });
  return details;
}

async function analyzeWallet(address: string): Promise<WalletDetails> {
  try {
    const url = `${HIRO_API_BASE}/extended/v1/address/${address}/transactions`;
    const response = await axios.get(url, { params: { limit: 50 } });
    const transactions = response.data.results;
    
    if (transactions.length === 0) {
      return {
        archetype: 'New Wallet',
        scores: { diamond_hands: 50, defi_degens: 0 },
        protocols: [],
        activity_summary: 'No activity found.'
      };
    }
    
    let totalSent = 0;
    let totalReceived = 0;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    let liquidityCalls = 0;
    const protocolMap: Record<string, number> = {};
    
    for (const tx of transactions) {
      const txTime = new Date(tx.burn_block_time_iso).getTime();
      
      if (tx.tx_type === 'token_transfer' && txTime > thirtyDaysAgo) {
        const amount = toSTX(tx.token_transfer.amount);
        if (tx.sender_address === address) totalSent += amount;
        if (tx.recipient_address === address) totalReceived += amount;
      }
      
      if (tx.tx_type === 'contract_call') {
        const contract = tx.contract_call.contract_id;
        const protocol = contract.split('.')[0].split('-')[0]; // Extract base protocol name
        protocolMap[protocol] = (protocolMap[protocol] || 0) + 1;
        
        if (contract.includes('pool') || contract.includes('lp') || contract.includes('swap') || contract.includes('alex')) {
          liquidityCalls++;
        }
      }
    }
    
    // Scoring Logic
    const dhScore = totalReceived > 0 ? Math.min(100, Math.round((totalReceived / (totalSent + 1)) * 50) + 50) : 30;
    const degenScore = Math.min(100, (Object.keys(protocolMap).length * 15) + (liquidityCalls * 5));
    
    // Archetype Classification
    let archetype: Archetype = 'Unclassified Wallet';
    if (totalSent > 500000) archetype = 'Whale Wallet';
    else if ((liquidityCalls / transactions.length) > 0.4) archetype = 'LP Farmer';
    else if (Object.keys(protocolMap).length >= 3) archetype = 'DeFi User';
    
    const oldestTxTime = new Date(transactions[transactions.length - 1].burn_block_time_iso).getTime();
    if (oldestTxTime > thirtyDaysAgo || response.data.total < 10) archetype = 'New Wallet';

    return {
      archetype,
      scores: {
        diamond_hands: dhScore,
        defi_degens: degenScore
      },
      protocols: Object.entries(protocolMap).map(([name, value]) => ({ name, value })),
      activity_summary: `${transactions.length} txs processed. ${Object.keys(protocolMap).length} protocols used.`
    };
  } catch (error) {
    console.error(`Error analyzing wallet ${address}:`, error);
    return {
      archetype: 'Unclassified Wallet',
      scores: { diamond_hands: 0, defi_degens: 0 },
      protocols: [],
      activity_summary: 'Analysis failed.'
    };
  }
}
