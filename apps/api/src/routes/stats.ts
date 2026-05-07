import express from 'express';
import { redisClient } from '../redis/client.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const statsStr = await redisClient.get('stats:current');
    if (!statsStr) {
      return res.json({
        events_last_10m: 0,
        stx_moved_today: 0,
        most_active_protocol_today: 'None',
        total_events_today: 0,
        last_updated: new Date().toISOString()
      });
    }
    res.json(JSON.parse(statsStr));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
