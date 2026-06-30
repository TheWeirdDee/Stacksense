import express from 'express';
import { redisClient } from '../redis/client.js';

const router = express.Router();
const STACKS_ADDR_RE = /^(SP|SM)[A-Z0-9]{28,40}$/;
const EVENT_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;
const STACKS_ADDR_RE = /^(SP|SM)[A-Z0-9]{28,40}$/;
const EVENT_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;

router.get('/:eventId', async (req, res) => {
  const { eventId } = req.params;
  if (!EVENT_ID_RE.test(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }
// GET /api/v1/votes/:eventId
router.get('/:eventId', async (req, res) => {
  const { eventId } = req.params;
  if (!EVENT_ID_RE.test(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }
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
router.post('/:eventId/vote', async (req, res) => {
  const { eventId } = req.params;
  const { direction, wallet } = req.body;

  if (!EVENT_ID_RE.test(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }
router.post('/:eventId/vote', async (req, res) => {
  const { eventId } = req.params;
  const { direction, wallet } = req.body;
  if (!EVENT_ID_RE.test(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }
  if (direction !== 'bull' && direction !== 'bear') {
    return res.status(400).json({ error: 'direction must be bull or bear' });
  }
  if (!wallet || typeof wallet !== 'string' || !STACKS_ADDR_RE.test(wallet)) {
    return res.status(400).json({ error: 'Valid Stacks wallet address required' });
  if (direction !== 'bull' && direction !== 'bear') {
    return res.status(400).json({ error: 'direction must be bull or bear' });
  }
  if (!wallet || typeof wallet !== 'string' || !STACKS_ADDR_RE.test(wallet)) {
    return res.status(400).json({ error: 'Valid Stacks wallet address required' });
  }

  const dedupKey = `vote:${eventId}:wallet:${wallet}`;
  try {
    const already = await redisClient.get(dedupKey);
    if (already) {
      return res.status(409).json({ error: 'Already voted on this event' });
    }

    await Promise.all([
      redisClient.incr(`vote:${eventId}:${direction}`),
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
router.post('/:eventId/tip', async (req, res) => {
  const { eventId } = req.params;
  const { wallet } = req.body;

  if (!EVENT_ID_RE.test(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }
  if (!wallet || typeof wallet !== 'string' || !STACKS_ADDR_RE.test(wallet)) {
    return res.status(400).json({ error: 'Valid Stacks wallet address required' });
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
router.get('/', async (req, res) => {
  const idsParam = req.query.ids as string;
  if (!idsParam) return res.json([]);

  const ids = idsParam.split(',').slice(0, 50).filter(id => EVENT_ID_RE.test(id));
router.get('/', async (req, res) => {
  const idsParam = req.query.ids as string;
  if (!idsParam) return res.json([]);
  const ids = idsParam.split(',').slice(0, 50).filter(id => EVENT_ID_RE.test(id));
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
