import express from 'express';
import axios from 'axios';
const router = express.Router();
const SUB_CONTRACT_ADDRESS = process.env.SUBSCRIPTION_CONTRACT_ADDRESS || '0xaf1b3de05434025fb9b17edd08f8015fc44d6d580ef25f378377b618ebd581d0';
const SUB_CONTRACT_NAME = process.env.SUBSCRIPTION_CONTRACT_NAME || 'stacksense-subscriptions';
// Example: Get tier limits for a given tier (uint)
router.get('/tier-limits/:tier', async (req, res) => {
    try {
        const { tier } = req.params;
        if (!tier || !/^[0-9]+$/.test(tier)) {
            return res.status(400).json({ error: 'Tier must be a valid unsigned integer' });
        }
        const url = `https://api.hiro.so/v2/contracts/call-read/${SUB_CONTRACT_ADDRESS}/${SUB_CONTRACT_NAME}/get-tier-limits`;
        const response = await axios.post(url, { arguments: [`u${tier}`] });
        res.json(response.data);
    }
    catch (e) {
        console.error('[SubscriptionContract] error', e);
        res.status(500).json({ error: 'Failed to fetch tier limits' });
    }
});
export default router;
