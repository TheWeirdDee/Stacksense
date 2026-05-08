import express from 'express';
import { redisClient } from '../redis/client.js';

const router = express.Router();

async function getRecentEvents(n: number): Promise<any[]> {
  try {
    const events = await redisClient.lRange('events:recent', 0, n - 1);
    if (events && events.length > 0) {
      return events.map((e: string) => JSON.parse(e));
    }
  } catch (err) {
    console.error('[Stats] Redis error in getRecentEvents:', err);
  }
  return [];
}

async function refreshStats() {
  try {
    const events = await getRecentEvents(500)
    const today = new Date().toDateString()
    const todayEvents = events.filter(e =>
      new Date(e.timestamp).toDateString() === today
    )

    const stxMovedToday = todayEvents.reduce((sum, e) => sum + (e.stx_amount || 0), 0)
    const eventsLast10m = events.filter(e =>
      Date.now() - new Date(e.timestamp).getTime() < 10 * 60 * 1000
    ).length

    const protocolCounts: Record<string, number> = {}
    todayEvents.forEach(e => {
      if (e.protocol) protocolCounts[e.protocol] = (protocolCounts[e.protocol] || 0) + 1
    })
    const mostActive = Object.entries(protocolCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    const stats = {
      events_last_10m: eventsLast10m,
      stx_moved_today: stxMovedToday,
      most_active_protocol_today: mostActive,
      total_events_today: todayEvents.length,
      last_updated: new Date().toISOString(),
    }

    await redisClient.set('stats:current', JSON.stringify(stats), { EX: 300 })
    return stats
  } catch (err) {
    console.error('[Stats] Failed to refresh:', err)
    return null
  }
}

// Run immediately and then every 60s
refreshStats();
setInterval(refreshStats, 60_000);

router.get('/', async (req, res) => {
  try {
    const statsStr = await redisClient.get('stats:current');
    if (!statsStr) {
      // Return placeholder values if no data
      return res.json({
        events_last_10m: "--",
        stx_moved_today: "--",
        most_active_protocol_today: "N/A",
        total_events_today: "--",
        last_updated: new Date().toISOString()
      });
    }
    res.json(JSON.parse(statsStr));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
