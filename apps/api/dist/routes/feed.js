import express from 'express';
import { redisClient } from '../redis/client.js';
const router = express.Router();
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);
        const { signal, protocol, min_stx, max_stx } = req.query;
        const allEventsStr = await redisClient.lRange('events:recent', 0, -1);
        let events = allEventsStr.map((s) => JSON.parse(s));
        if (typeof signal === 'string')
            events = events.filter((e) => e.signal === signal);
        if (typeof protocol === 'string')
            events = events.filter((e) => e.protocol === protocol);
        if (typeof min_stx === 'string' && !Number.isNaN(Number(min_stx))) {
            events = events.filter((e) => e.stx_amount >= parseFloat(min_stx));
        }
        if (typeof max_stx === 'string' && !Number.isNaN(Number(max_stx))) {
            events = events.filter((e) => e.stx_amount <= parseFloat(max_stx));
        }
        const total = events.length;
        const paginated = events.slice(offset, offset + limit);
        res.json({
            events: paginated,
            total,
            limit,
            offset
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
});
export default router;
