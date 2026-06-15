import axios from 'axios';
/**
 * Verifies that a paid-tier API key request is backed by a real, successful
 * on-chain subscription payment.
 *
 * A confirmed contract-call whose `sender_address` equals the claimed
 * subscriber address proves BOTH that they paid AND that they control the
 * wallet (only the key holder could have signed it) — so a separate
 * message-signature ownership check is unnecessary.
 */
const HIRO_API_BASE = (process.env.HIRO_API_BASE || 'https://api.hiro.so').replace(/\/+$/, '');
const HIRO_API_KEY = process.env.HIRO_API_KEY || '';
const SUB_ADDRESS = process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || '';
const SUB_NAME = process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_NAME || 'stacksense-subscriptions';
export async function verifySubscriptionPayment(txId, expectedSender) {
    if (!txId || typeof txId !== 'string' || !/^0x[0-9a-f]{64}$/i.test(txId)) {
        return { ok: false, reason: 'A valid on-chain payment txId is required for paid tiers' };
    }
    try {
        const headers = {};
        if (HIRO_API_KEY)
            headers['x-api-key'] = HIRO_API_KEY;
        const { data } = await axios.get(`${HIRO_API_BASE}/extended/v1/tx/${txId}`, { headers, timeout: 7000 });
        if (data.tx_status !== 'success') {
            return { ok: false, reason: `Payment tx is not confirmed (status: ${data.tx_status})` };
        }
        if (data.tx_type !== 'contract_call') {
            return { ok: false, reason: 'Payment tx is not a subscription contract call' };
        }
        if (data.sender_address !== expectedSender) {
            return { ok: false, reason: 'Payment tx sender does not match the subscriber address' };
        }
        // If a subscription contract is configured, require the call to target it.
        if (SUB_ADDRESS) {
            const expectedContract = `${SUB_ADDRESS}.${SUB_NAME}`;
            if (data.contract_call?.contract_id !== expectedContract) {
                return { ok: false, reason: 'Payment tx does not call the StackSense subscription contract' };
            }
        }
        return { ok: true };
    }
    catch (err) {
        if (err.response?.status === 404) {
            return { ok: false, reason: 'Payment tx not found on-chain' };
        }
        return { ok: false, reason: 'Could not verify payment tx' };
    }
}
