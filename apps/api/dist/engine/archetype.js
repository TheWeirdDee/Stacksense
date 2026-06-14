import axios from 'axios';
import { redisClient } from '../redis/client.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
const HIRO_API_BASE = process.env.HIRO_API_BASE || 'https://api.hiro.so';
const HIRO_API_KEY = process.env.HIRO_API_KEY;
export async function getArchetype(address) {
    if (!address || typeof address !== 'string' || !address.startsWith('SP')) {
        return 'Unclassified Wallet';
    }
    const cacheKey = `archetype:${address}`;
    try {
        const cached = await redisClient.get(cacheKey);
        if (cached)
            return cached;
    }
    catch { }
    const archetype = await classifyWallet(address);
    try {
        await redisClient.set(cacheKey, archetype, { EX: 21600 });
    }
    catch { }
    return archetype;
}
async function getWalletHistory(address) {
    try {
        const url = `${HIRO_API_BASE}/extended/v1/address/${address}/transactions?limit=50&unanchored=false`;
        console.log(`[Archetype] Fetching history for ${address.slice(0, 8)}...`);
        const headers = {};
        if (HIRO_API_KEY)
            headers['x-api-key'] = HIRO_API_KEY;
        const response = await axios.get(url, { headers, timeout: 5000 });
        const results = response.data?.results || [];
        console.log(`[Archetype] ${address.slice(0, 8)} has ${results.length} recent txns`);
        return results;
    }
    catch (e) {
        console.error(`[Archetype] Failed to fetch history for ${address.slice(0, 8)}:`, e?.message || e);
        return [];
    }
}
async function classifyWallet(address) {
    try {
        const txns = await getWalletHistory(address);
        const txCount = txns.length;
        const contractCalls = txns.filter((tx) => tx.tx_type === 'contract_call');
        const lpInteractions = contractCalls.filter((tx) => tx.contract_call?.function_name?.includes('liquidity') ||
            tx.contract_call?.function_name?.includes('position') ||
            tx.contract_call?.function_name?.includes('pool') ||
            tx.contract_call?.function_name?.includes('swap')).length;
        let stxBalance = 0;
        try {
            const balanceUrl = `${HIRO_API_BASE}/extended/v1/address/${address}/balances`;
            const headers = {};
            if (HIRO_API_KEY)
                headers['x-api-key'] = HIRO_API_KEY;
            const balRes = await axios.get(balanceUrl, { headers, timeout: 3000 });
            stxBalance = parseInt(balRes.data?.stx?.balance || '0', 10) / 1_000_000;
        }
        catch { }
        let archetype = 'DeFi User';
        if (stxBalance > 100000 || txCount === 0) {
            archetype = txCount === 0 ? 'New Wallet' : 'Whale Wallet';
        }
        else if (txCount < 5) {
            archetype = 'New Wallet';
        }
        else if (lpInteractions > 0 && contractCalls.length > 0 && (lpInteractions / contractCalls.length) > 0.5) {
            archetype = 'LP Farmer';
        }
        else if (contractCalls.length > txCount * 0.7) {
            archetype = 'DeFi User';
        }
        else {
            archetype = 'Active Wallet';
        }
        console.log(`[Archetype] ${address.slice(0, 8)}... → ${archetype} (${txCount} txns, ${stxBalance.toLocaleString()} STX)`);
        return archetype;
    }
    catch (e) {
        console.error('[Archetype] Classification failed:', e);
        return 'Unclassified Wallet';
    }
}
export async function getDetailedArchetype(address) {
    const archetype = await getArchetype(address);
    return {
        archetype,
        scores: { diamond_hands: 50, defi_degens: 50 },
        protocols: [],
        activity_summary: `Classified as ${archetype}`
    };
}
