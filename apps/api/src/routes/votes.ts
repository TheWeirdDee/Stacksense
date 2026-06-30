import express from 'express';
import { redisClient } from '../redis/client.js';

const router = express.Router();

// GET /api/v1/votes/:eventId
router.get('/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    const [bull, bear, tips] = await Promise.all([
      redisClient.get(`vote:${eventId}:bull`),
      redisClient.get(`vote:${eventId}:bear`),
      redisClient.get(`vote:${eventId}:tips`),
    ]);
    res.json({
      eventId,
      bull: parseInt(bull ?? '0'),
      bear: parseInt(bear ?? '0'),
      tips: parseInt(tips ?? '0'),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// POST /api/v1/votes/:eventId/vote  { direction: 'bull' | 'bear', wallet: string }
router.post('/:eventId/vote', async (req, res) => {
  const { eventId } = req.params;
  const { direction, wallet } = req.body;

  if (direction !== 'bull' && direction !== 'bear') {
    return res.status(400).json({ error: 'direction must be bull or bear' });
  }
  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'wallet address required' });
  }

  const dedupKey = `vote:${eventId}:wallet:${wallet}`;
  try {
    const already = await redisClient.get(dedupKey);
    if (already) {
      return res.status(409).json({ error: 'Already voted on this event' });
    }

    await Promise.all([
      redisClient.incr(`vote:${eventId}:${direction}`),
      // wallet dedup key expires in 30 days
      redisClient.set(dedupKey, direction, { EX: 60 * 60 * 24 * 30 }),
    ]);

    const [bull, bear, tips] = await Promise.all([
      redisClient.get(`vote:${eventId}:bull`),
      redisClient.get(`vote:${eventId}:bear`),
      redisClient.get(`vote:${eventId}:tips`),
    ]);

    res.json({
      eventId,
      bull: parseInt(bull ?? '0'),
      bear: parseInt(bear ?? '0'),
      tips: parseInt(tips ?? '0'),
    });
  } catch {
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// POST /api/v1/votes/:eventId/tip  { wallet: string }
router.post('/:eventId/tip', async (req, res) => {
  const { eventId } = req.params;
  const { wallet } = req.body;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'wallet address required' });
  }

  try {
    await redisClient.incr(`vote:${eventId}:tips`);

    const [bull, bear, tips] = await Promise.all([
      redisClient.get(`vote:${eventId}:bull`),
      redisClient.get(`vote:${eventId}:bear`),
      redisClient.get(`vote:${eventId}:tips`),
    ]);

    res.json({
      eventId,
      bull: parseInt(bull ?? '0'),
      bear: parseInt(bear ?? '0'),
      tips: parseInt(tips ?? '0'),
    });
  } catch {
    res.status(500).json({ error: 'Failed to record tip' });
  }
});

// GET /api/v1/votes/batch?ids=id1,id2,...
router.get('/', async (req, res) => {
  const idsParam = req.query.ids as string;
  if (!idsParam) return res.json([]);

  const ids = idsParam.split(',').slice(0, 50);
  try {
    const results = await Promise.all(
      ids.map(async (eventId) => {
        const [bull, bear, tips] = await Promise.all([
          redisClient.get(`vote:${eventId}:bull`),
          redisClient.get(`vote:${eventId}:bear`),
          redisClient.get(`vote:${eventId}:tips`),
        ]);
        return {
          eventId,
          bull: parseInt(bull ?? '0'),
          bear: parseInt(bear ?? '0'),
          tips: parseInt(tips ?? '0'),
        };
      })
    );
    res.json(results);
  } catch {
    res.status(500).json({ error: 'Failed to fetch batch votes' });
  }
});

export default router;
