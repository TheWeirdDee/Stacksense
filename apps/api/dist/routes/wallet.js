import express from 'express';
import { getDetailedArchetype } from '../engine/archetype.js';
import { redisClient } from '../redis/client.js';
const router = express.Router();
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const details = await getDetailedArchetype(address);
        const allEventsStr = await redisClient.lRange('events:recent', 0, -1);
        const events = allEventsStr
            .map((s) => JSON.parse(s))
            .filter((e) => e.wallet_address === address);
        res.json({
            wallet: {
                address,
                ...details,
                tx_count: events.length,
                last_active: events[0]?.timestamp || null
            },
            events
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch wallet info' });
    }
});
export default router;
