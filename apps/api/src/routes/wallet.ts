import express from 'express';
import { getArchetype } from '../engine/archetype.js';
import { redisClient } from '../redis/client.js';

const router = express.Router();

router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Get archetype
    const archetype = await getArchetype(address);
    
    // Get recent events for this wallet from the global list
    // In v1 we filter the recent list. In v2 we'd use a per-wallet list in Redis.
    const allEventsStr = await redisClient.lRange('events:recent', 0, -1);
    const events = allEventsStr
      .map((s: string) => JSON.parse(s))
      .filter((e: any) => e.wallet_address === address);
      
    res.json({
      wallet: {
        address,
        archetype,
        total_stx_sent_30d: 0, // Placeholder for v1 as we don't store full history yet
        tx_count: events.length,
        last_active: events[0]?.timestamp || null
      },
      events
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallet info' });
  }
});

export default router;
