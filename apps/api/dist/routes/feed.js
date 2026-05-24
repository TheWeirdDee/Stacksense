import express from 'express';
import { redisClient } from '../redis/client.js';
const router = express.Router();
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const { signal, protocol, min_stx, max_stx } = req.query;
        const allEventsStr = await redisClient.lRange('events:recent', 0, -1);
        let events = allEventsStr.map((s) => JSON.parse(s));
        if (signal)
            events = events.filter((e) => e.signal === signal);
        if (protocol)
            events = events.filter((e) => e.protocol === protocol);
        if (min_stx)
            events = events.filter((e) => e.stx_amount >= parseFloat(min_stx));
        if (max_stx)
            events = events.filter((e) => e.stx_amount <= parseFloat(max_stx));
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
