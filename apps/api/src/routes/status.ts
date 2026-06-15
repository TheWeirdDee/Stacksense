import express from 'express';
import { redisClient } from '../redis/client.js';
import { getClientCount } from '../ws/server.js';
import { getUptimeSeconds, getPollerMetrics } from '../utils/metrics.js';

const router = express.Router();

// System diagnostics: Hiro poll latency, Redis health, WebSocket connections.
router.get('/', async (req, res) => {
  // Measure live Redis round-trip latency with a PING.
  let redisConnected = false;
  let redisLatencyMs: number | null = null;
  let cachedEvents = 0;
  try {
    if (redisClient.isOpen) {
      const t0 = Date.now();
      await redisClient.ping();
      redisLatencyMs = Date.now() - t0;
      redisConnected = true;
      cachedEvents = await redisClient.lLen('events:recent');
    }
  } catch {
    redisConnected = false;
  }

  const poller = getPollerMetrics();
  const wsClients = getClientCount();

  // Derive an overall health verdict.
  const pollStale =
    poller.lastPollAt === null || Date.now() - poller.lastPollAt > 60_000;
  const healthy = redisConnected && !pollStale;
  const status = healthy ? 'operational' : redisConnected ? 'degraded' : 'down';

  res.json({
    status,
    uptimeSeconds: getUptimeSeconds(),
    timestamp: new Date().toISOString(),
    redis: {
      connected: redisConnected,
      latencyMs: redisLatencyMs,
      cachedEvents,
    },
    poller: {
      lastPollAt: poller.lastPollAt ? new Date(poller.lastPollAt).toISOString() : null,
      lastLatencyMs: poller.lastLatencyMs,
      cycles: poller.totalCycles,
      lastFetched: poller.lastFetched,
      errors: poller.totalErrors,
      lastError: poller.lastError,
      dedupHits: poller.totalSkipped,
      dedupMisses: poller.totalNew,
      dedupHitRate: poller.dedupHitRate,
      stale: pollStale,
    },
    websocket: {
      connectedClients: wsClients,
    },
  });
});

export default router;
