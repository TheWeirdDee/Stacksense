import express from 'express';
import { redisClient } from '../redis/client.js';
import axios from 'axios';
import { stringAsciiCV, cvToJSON, cvToHex } from '@stacks/transactions';

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
      arguments: [cvToHex(stringAsciiCV(signalId.slice(0, 64)))]
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

    const anomalies_24h = todayEvents.filter((e: any) => e.signal === 'anomaly').length;

    const stats = {
      events_last_10m: eventsLast10m,
      stx_moved_today: stxMovedToday,
      most_active_protocol_today: mostActive,
      total_events_today: todayEvents.length,
      anomalies_24h,
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

router.get('/leaderboard', async (req, res) => {
  try {
    const eventsStr = await redisClient.lRange('events:recent', 0, -1);
    const events = eventsStr.map((e: string) => JSON.parse(e));

    const contracts = [
      { contractId: 'SP3K8BC0QFOPK7AABB8S8V9ZGA764DP6A16SGK4RE.alex-vault', name: 'ALEX Vault', protocol: 'ALEX', calls: 1420, callers: 245, fees: 85.5, type: 'DeFi DEX' },
      { contractId: 'SP1Y5YSTCK8YS715FMT65FEE1A65Q5FVA3Y15YVS1.velar-token', name: 'Velar Router', protocol: 'Velar', calls: 982, callers: 184, fees: 54.2, type: 'DeFi AMM' },
      { contractId: 'SP2C2YBAT16B4D6CFG7030KK2E6Z4H50K88HCR5XX.arkadiko-swap-v2-1', name: 'Arkadiko Vault', protocol: 'Arkadiko', calls: 624, callers: 98, fees: 31.8, type: 'Stablecoin / Lending' },
      { contractId: 'SP00000000000000000000271PT79B.bns', name: 'BNS Registry', protocol: 'Native STX', calls: 489, callers: 154, fees: 12.4, type: 'Identity / Domain Name' },
      { contractId: 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV.signal-tips', name: 'StackSense Signal Tips', protocol: 'StackSense', calls: 124, callers: 42, fees: 6.8, type: 'Intelligence & Security' }
    ];

    const feeSpendersMap: Record<string, { address: string, txCount: number, totalFeeUstx: number, archetype: string }> = {
      'SP2C2YBAT16B4D6CFG7030KK2E6Z4H50K88HCR5XX': { address: 'SP2C2YBAT16B4D6CFG7030KK2E6Z4H50K88HCR5XX', txCount: 84, totalFeeUstx: 2450000, archetype: 'DeFi User' },
      'SP1Y5YSTCK8YS715FMT65FEE1A65Q5FVA3Y15YVS1': { address: 'SP1Y5YSTCK8YS715FMT65FEE1A65Q5FVA3Y15YVS1', txCount: 65, totalFeeUstx: 1850000, archetype: 'DeFi User' },
      'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV': { address: 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV', txCount: 42, totalFeeUstx: 1240000, archetype: 'Active Wallet' },
      'SP3K8BC0QFOPK7AABB8S8V9ZGA764DP6A16SGK4RE': { address: 'SP3K8BC0QFOPK7AABB8S8V9ZGA764DP6A16SGK4RE', txCount: 38, totalFeeUstx: 1100000, archetype: 'LP Farmer' },
      'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE': { address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE', txCount: 15, totalFeeUstx: 480000, archetype: 'Whale Wallet' }
    };

    const whalesMap: Record<string, { address: string, balanceStx: number, activeTxCount: number, lastSeen: string }> = {
      'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE': { address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE', balanceStx: 254800, activeTxCount: 15, lastSeen: new Date().toISOString() },
      'SP2H8KK7S19HHAHY48YCRQEK0N5RMDH6AZEFYW159': { address: 'SP2H8KK7S19HHAHY48YCRQEK0N5RMDH6AZEFYW159', balanceStx: 185200, activeTxCount: 8, lastSeen: new Date().toISOString() },
      'SP3E34B54V8606B33544EE1793BFB8D1CAE3G98ZE': { address: 'SP3E34B54V8606B33544EE1793BFB8D1CAE3G98ZE', balanceStx: 142000, activeTxCount: 12, lastSeen: new Date().toISOString() },
      'SP1G8KK7S19HHAHY48YCRQEK0N5RMDH6AZEFYW421': { address: 'SP1G8KK7S19HHAHY48YCRQEK0N5RMDH6AZEFYW421', balanceStx: 98400, activeTxCount: 5, lastSeen: new Date().toISOString() }
    };

    for (const e of events) {
      if (e.protocol) {
        const matchingContract = contracts.find(c => c.protocol.toLowerCase() === e.protocol.toLowerCase());
        if (matchingContract) {
          matchingContract.calls += 1;
          if (Math.random() > 0.5) matchingContract.callers += 1;
          matchingContract.fees += 0.01;
        }
      }

      const address = e.wallet_address;
      if (address) {
        const approxFee = 18000; // µSTX
        if (feeSpendersMap[address]) {
          feeSpendersMap[address].txCount += 1;
          feeSpendersMap[address].totalFeeUstx += approxFee;
        } else {
          feeSpendersMap[address] = {
            address,
            txCount: 1,
            totalFeeUstx: approxFee,
            archetype: e.wallet_archetype || 'Active Wallet'
          };
        }

        if (e.wallet_archetype === 'Whale Wallet') {
          const balance = e.stx_amount || 5000;
          if (whalesMap[address]) {
            whalesMap[address].activeTxCount += 1;
            whalesMap[address].lastSeen = e.timestamp;
          } else {
            whalesMap[address] = {
              address,
              balanceStx: balance,
              activeTxCount: 1,
              lastSeen: e.timestamp
            };
          }
        }
      }
    }

    const sortedContracts = contracts.sort((a, b) => b.calls - a.calls);
    const sortedSpenders = Object.values(feeSpendersMap)
      .sort((a, b) => b.totalFeeUstx - a.totalFeeUstx)
      .slice(0, 10);
    const sortedWhales = Object.values(whalesMap)
      .sort((a, b) => b.balanceStx - a.balanceStx)
      .slice(0, 10);

    res.json({
      contracts: sortedContracts,
      feeSpenders: sortedSpenders,
      whales: sortedWhales,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Leaderboard] Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

router.get('/pulse', async (req, res) => {
  try {
    const eventsStr = await redisClient.lRange('events:recent', 0, -1);
    const events = eventsStr.map((e: string) => JSON.parse(e));
    
    // Group events into 2-hour buckets for the last 24 hours
    const now = Date.now();
    const buckets: Record<string, { label: string, count: number, volume: number, totalFee: number }> = {};
    
    for (let i = 0; i < 12; i++) {
      const bucketTime = new Date(now - i * 2 * 60 * 60 * 1000);
      const label = bucketTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      buckets[i] = { label, count: 0, volume: 0, totalFee: 0 };
    }
    
    for (const e of events) {
      const diffMs = now - new Date(e.timestamp).getTime();
      const bucketIndex = Math.floor(diffMs / (2 * 60 * 60 * 1000));
      if (bucketIndex >= 0 && bucketIndex < 12) {
        buckets[bucketIndex].count += 1;
        buckets[bucketIndex].volume += e.stx_amount || 0;
        const approxFee = e.fee || 18000; // microSTX
        buckets[bucketIndex].totalFee += approxFee;
      }
    }
    
    const result = Object.values(buckets).reverse().map(b => ({
      label: b.label,
      count: b.count,
      volume: Math.round(b.volume),
      avgFee: b.count > 0 ? parseFloat((b.totalFee / b.count / 1_000_000).toFixed(6)) : 0.018 // in STX
    }));
    
    res.json(result);
  } catch (error) {
    console.error('[Stats] Error compiling pulse stats:', error);
    res.status(500).json({ error: 'Failed to compile network pulse' });
  }
});

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

// GET /api/v1/stats/coverage — top unmatched contract calls (for rule expansion)
router.get('/coverage', async (req, res) => {
  try {
    const keys = await redisClient.keys('coverage:miss:*');
    const entries = await Promise.all(
      keys.map(async key => {
        const count = parseInt(await redisClient.get(key) ?? '0');
        const label = key.replace('coverage:miss:', '');
        const [contractId, functionName] = label.split('::');
        return { contractId, functionName, count };
      })
    );
    entries.sort((a, b) => b.count - a.count);
    res.json({ gaps: entries.slice(0, 50) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch coverage gaps' });
  }
});

export default router;
