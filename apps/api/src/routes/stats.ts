import express from 'express';
import { redisClient } from '../redis/client.js';
import axios from 'axios';
import { stringAsciiCV, cvToJSON } from '@stacks/transactions';

const router = express.Router();
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV';
const CONTRACT_NAME = process.env.CONTRACT_NAME || 'signal-tips';

async function getRecentEvents(n: number): Promise<any[]> {
  try {
    if (!redisClient.isOpen) return [];
    const events = await redisClient.lRange('events:recent', 0, n - 1);
    if (events && events.length > 0) {
      return events.map((e: string) => JSON.parse(e));
    }
  } catch (err) {
    console.error('[Stats] Redis error in getRecentEvents:', err);
  }
  return [];
}

async function getOnChainStats(signalId: string) {
  try {
    const url = `https://api.hiro.so/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-signal-stats`;
    const response = await axios.post(url, {
      sender: CONTRACT_ADDRESS,
      arguments: [stringAsciiCV(signalId.slice(0, 64)).toString()]
    });
    
    const statsResult = cvToJSON(response.data.result);
    const stats = statsResult?.value || {};
    
    return {
      tips: parseInt(stats['tip-count']?.value || '0', 10),
      bullish: parseInt(stats['bullish-votes']?.value || '0', 10),
      bearish: parseInt(stats['bearish-votes']?.value || '0', 10)
    };
  } catch (err: any) {
    if (!err.response || err.response.status !== 404) {
      console.error('[Stats] On-chain error for', signalId, err.message);
    }
    return { tips: 0, bullish: 0, bearish: 0 };
  }
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

    const uniqueSignals = Array.from(new Set(events.map(e => e.id))).slice(0, 5);
    const trending = await Promise.all(uniqueSignals.map(async (id) => {
      const event = events.find(e => e.id === id);
      const onChain = await getOnChainStats(id);
      return {
        id,
        title: event?.title || 'Unknown Signal',
        signal: event?.signal || 'neutral',
        ...onChain
      };
    }));

    const stats = {
      events_last_10m: eventsLast10m,
      stx_moved_today: stxMovedToday,
      most_active_protocol_today: mostActive,
      total_events_today: todayEvents.length,
      trending_signals: trending,
      last_updated: new Date().toISOString(),
    }

    await redisClient.set('stats:current', JSON.stringify(stats), { EX: 300 })
    return stats
  } catch (err) {
    console.error('[Stats] Failed to refresh:', err)
    return null
  }
}

refreshStats();
setInterval(refreshStats, 60_000);

router.get('/', async (req, res) => {
  try {
    const statsStr = await redisClient.get('stats:current');
    if (!statsStr) {
      return res.json({
        events_last_10m: "--",
        stx_moved_today: "--",
        most_active_protocol_today: "N/A",
        total_events_today: "--",
        trending_signals: [],
        last_updated: new Date().toISOString()
      });
    }
    res.json(JSON.parse(statsStr));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
