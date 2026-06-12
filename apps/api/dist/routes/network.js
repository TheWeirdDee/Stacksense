import express from 'express';
import axios from 'axios';
const router = express.Router();
const HIRO_API_BASE = (process.env.HIRO_API_BASE || 'https://api.hiro.so').replace(/\/+$/, '');
const HIRO_API_KEY = process.env.HIRO_API_KEY || '';
function hiroHeaders() {
    const h = {};
    if (HIRO_API_KEY)
        h['x-api-key'] = HIRO_API_KEY;
    return h;
}
// Tiny in-memory TTL cache so the UI can poll without hammering Hiro.
const cache = new Map();
async function cached(key, ttlMs, fetcher) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttlMs)
        return hit.data;
    const data = await fetcher();
    cache.set(key, { at: Date.now(), data });
    return data;
}
// GET /api/v1/network/blocks — recent block metrics (times, tx counts).
router.get('/blocks', async (req, res) => {
    try {
        const data = await cached('blocks', 8_000, async () => {
            const url = `${HIRO_API_BASE}/extended/v2/blocks?limit=20`;
            const response = await axios.get(url, { headers: hiroHeaders(), timeout: 7000 });
            const results = response.data?.results || [];
            // Newest first from Hiro; compute inter-block times in chronological order.
            const ordered = [...results].reverse();
            const blocks = ordered.map((b, i) => {
                const prev = ordered[i - 1];
                const blockTimeSec = prev && b.block_time && prev.block_time ? b.block_time - prev.block_time : null;
                return {
                    height: b.height,
                    hash: b.hash,
                    txCount: b.tx_count ?? 0,
                    blockTime: b.block_time ?? null,
                    secondsSincePrev: blockTimeSec,
                };
            });
            const intervals = blocks.map((b) => b.secondsSincePrev).filter((n) => n != null && n > 0);
            const avgBlockTime = intervals.length
                ? Math.round(intervals.reduce((a, c) => a + c, 0) / intervals.length)
                : null;
            const txCounts = blocks.map((b) => b.txCount);
            const avgTxPerBlock = txCounts.length
                ? Math.round(txCounts.reduce((a, c) => a + c, 0) / txCounts.length)
                : 0;
            return {
                blocks: blocks.reverse(), // newest first for display
                avgBlockTime,
                avgTxPerBlock,
                totalTx: txCounts.reduce((a, c) => a + c, 0),
                latestHeight: blocks.length ? Math.max(...blocks.map((b) => b.height)) : null,
            };
        });
        res.json(data);
    }
    catch (error) {
        console.error('[Network] blocks error:', error?.message || error);
        res.status(502).json({ error: 'Failed to fetch block metrics from Hiro' });
    }
});
// GET /api/v1/network/mempool — pending transactions for the gravity canvas.
router.get('/mempool', async (req, res) => {
    try {
        const data = await cached('mempool', 6_000, async () => {
            const url = `${HIRO_API_BASE}/extended/v1/tx/mempool?limit=50`;
            const response = await axios.get(url, { headers: hiroHeaders(), timeout: 7000 });
            const results = response.data?.results || [];
            const txs = results.map((t) => {
                const feeRate = Number(t.fee_rate ?? 0); // microSTX
                const amount = t.tx_type === 'token_transfer'
                    ? Number(t.token_transfer?.amount ?? 0) / 1_000_000
                    : 0;
                return {
                    txId: t.tx_id,
                    type: t.tx_type,
                    feeRate,
                    feeStx: feeRate / 1_000_000,
                    amountStx: amount,
                    sender: t.sender_address,
                    receiptTime: t.receipt_time,
                };
            });
            const fees = txs.map((t) => t.feeRate).filter((n) => n > 0);
            const avgFeeRate = fees.length ? Math.round(fees.reduce((a, c) => a + c, 0) / fees.length) : 0;
            return {
                count: response.data?.total ?? txs.length,
                sampled: txs.length,
                avgFeeRate,
                txs,
            };
        });
        res.json(data);
    }
    catch (error) {
        console.error('[Network] mempool error:', error?.message || error);
        res.status(502).json({ error: 'Failed to fetch mempool from Hiro' });
    }
});
export default router;
