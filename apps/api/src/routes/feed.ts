import express from 'express';
import { redisClient } from '../redis/client.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const { signal, protocol, min_stx, max_stx } = req.query;
    
    const allEventsStr = await redisClient.lRange('events:recent', 0, -1);
    let events = allEventsStr.map((s: string) => JSON.parse(s));
    
    if (typeof signal === 'string') events = events.filter((e: any) => e.signal === signal);
    if (typeof protocol === 'string') events = events.filter((e: any) => e.protocol === protocol);
    if (typeof min_stx === 'string' && !Number.isNaN(Number(min_stx))) {
      events = events.filter((e: any) => e.stx_amount >= parseFloat(min_stx));
    }
    if (typeof max_stx === 'string' && !Number.isNaN(Number(max_stx))) {
      events = events.filter((e: any) => e.stx_amount <= parseFloat(max_stx));
    }
    
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

router.get('/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    if (!/^0x[a-f0-9]{64}$/i.test(txId)) {
      return res.status(400).json({ error: 'Invalid tx ID format' });
    }
    const allEventsStr = await redisClient.lRange('events:recent', 0, -1);
    const event = allEventsStr
      .map((s: string) => JSON.parse(s))
      .find((e: any) => e.tx_id === txId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

export default router;
