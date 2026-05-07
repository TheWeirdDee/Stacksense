import express from 'express';
import { redisClient } from '../redis/client.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const { signal, protocol, min_stx, max_stx } = req.query;
    
    // Get all recent events from Redis
    const allEventsStr = await redisClient.lRange('events:recent', 0, -1);
    let events = allEventsStr.map((s: string) => JSON.parse(s));
    
    // Apply filters in memory for v1 (Redis list isn't ideal for filtering, but fine for 500 items)
    if (signal) events = events.filter((e: any) => e.signal === signal);
    if (protocol) events = events.filter((e: any) => e.protocol === protocol);
    if (min_stx) events = events.filter((e: any) => e.stx_amount >= parseFloat(min_stx as string));
    if (max_stx) events = events.filter((e: any) => e.stx_amount <= parseFloat(max_stx as string));
    
    const total = events.length;
    const paginated = events.slice(offset, offset + limit);
    
    res.json({
      events: paginated,
      total,
      limit,
      offset
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

export default router;
