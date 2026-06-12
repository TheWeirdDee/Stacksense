import axios from 'axios';
const HIRO_API = (process.env.HIRO_API_BASE || 'https://api.hiro.so').replace(/\/+$/, '');
const HIRO_API_KEY = process.env.HIRO_API_KEY || '';
function hirojHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (HIRO_API_KEY)
        h['x-api-key'] = HIRO_API_KEY;
    return h;
}
/**
 * Fetch transaction stats for a single contract (address.name).
 * Pages through up to 500 transactions to count unique callers + fees.
 */
export async function getContractStats(address, name) {
    const contractId = `${address}.${name}`;
    let offset = 0;
    const limit = 50;
    let totalTxs = 0;
    let totalFees = 0;
    const callerSet = new Set();
    try {
        while (offset < 500) {
            const url = `${HIRO_API}/extended/v1/address/${contractId}/transactions`;
            const { data } = await axios.get(url, {
                headers: hirojHeaders(),
                params: { limit, offset },
                timeout: 8000,
            });
            const results = data?.results || [];
            if (results.length === 0)
                break;
            for (const tx of results) {
                totalTxs++;
                const fee = parseInt(tx.fee_rate || tx.fee || '0', 10);
                totalFees += fee;
                const sender = tx.sender_address || tx.tx?.sender_address;
                if (sender)
                    callerSet.add(sender);
            }
            if (results.length < limit)
                break;
            offset += limit;
        }
    }
    catch (err) {
        console.error(`[Onchain] Failed to fetch txs for ${contractId}:`, err?.message || err);
    }
    return {
        contractId,
        totalTransactions: totalTxs,
        uniqueCallers: callerSet.size,
        totalFeesUstx: totalFees,
    };
}
/**
 * Count how many contracts were deployed by a given wallet address.
 */
export async function getWalletDeployments(address) {
    try {
        let offset = 0;
        const limit = 50;
        let deployCount = 0;
        while (offset < 200) {
            const url = `${HIRO_API}/extended/v1/address/${address}/transactions`;
            const { data } = await axios.get(url, {
                headers: hirojHeaders(),
                params: { limit, offset },
                timeout: 8000,
            });
            const results = data?.results || [];
            if (results.length === 0)
                break;
            for (const tx of results) {
                if (tx.tx_type === 'smart_contract' || tx.tx?.tx_type === 'smart_contract') {
                    deployCount++;
                }
            }
            if (results.length < limit)
                break;
            offset += limit;
        }
        return deployCount;
    }
    catch (err) {
        console.error(`[Onchain] Failed to fetch deployments for ${address}:`, err?.message || err);
        return 0;
    }
}
/**
 * Aggregate onchain stats for a wallet + its list of contracts.
 */
export async function getWalletOnchainStats(ownerAddress, contracts) {
    const [deployments, ...contractStats] = await Promise.all([
        getWalletDeployments(ownerAddress),
        ...contracts.map((c) => getContractStats(c.address, c.name)),
    ]);
    const totalTransactions = contractStats.reduce((s, c) => s + c.totalTransactions, 0);
    const totalFeesUstx = contractStats.reduce((s, c) => s + c.totalFeesUstx, 0);
    // Merge unique callers across contracts
    const callerUnion = new Set();
    // We can't re-merge sets here without re-fetching, so sum as proxy
    const totalUniqueCallers = contractStats.reduce((s, c) => s + c.uniqueCallers, 0);
    return {
        contractDeployments: deployments,
        contracts: contractStats,
        totalTransactions,
        totalUniqueCallers,
        totalFeesUstx,
    };
}
