import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import axios from 'axios';
import { connectRedis, redisClient } from './redis/client.js';
import { startPoller } from './ingestion/poller.js';
import { setupWebSocket } from './ws/server.js';
import feedRoutes from './routes/feed.js';
import walletRoutes from './routes/wallet.js';
import statsRoutes from './routes/stats.js';

import cors from 'cors';

dotenv.config({ path: '../../.env' });

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/stats', statsRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// STX Price Poller
async function updateSTXPrice() {
  try {
    const baseUrl = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    const response = await axios.get(`${baseUrl}/simple/price`, {
      params: {
        ids: 'blockstack',
        vs_currencies: 'usd'
      }
    });
    const price = response.data.blockstack.usd;
    await redisClient.set('stx:price:usd', price.toString(), { EX: 300 }); // 5 min TTL
    console.log(`Updated STX price: $${price}`);
  } catch (error) {
    console.error('Error fetching STX price:', error);
  }
}

// Stats aggregator (60s cycle)
async function updateStats() {
  try {
    const events = await redisClient.lRange('events:recent', 0, -1);
    const interpretedEvents: any[] = events.map((e: string) => JSON.parse(e));
    
    const now = new Date();
    const tenMinsAgo = now.getTime() - (10 * 60 * 1000);
    
    const events_last_10m = interpretedEvents.filter((e: any) => new Date(e.timestamp).getTime() > tenMinsAgo).length;
    
    const today = now.toISOString().split('T')[0];
    const events_today = interpretedEvents.filter((e: any) => e.timestamp.startsWith(today));
    
    const stx_moved_today = events_today.reduce((sum: number, e: any) => sum + e.stx_amount, 0);
    
    const protocolCounts: Record<string, number> = {};
    events_today.forEach((e: any) => {
      protocolCounts[e.protocol] = (protocolCounts[e.protocol] || 0) + 1;
    });
    
    let most_active_protocol_today = 'None';
    let maxCount = 0;
    for (const [p, count] of Object.entries(protocolCounts)) {
      if (count > maxCount) {
        maxCount = count;
        most_active_protocol_today = p;
      }
    }
    
    const stats = {
      events_last_10m,
      stx_moved_today,
      most_active_protocol_today,
      total_events_today: events_today.length,
      last_updated: now.toISOString()
    };
    
    await redisClient.set('stats:current', JSON.stringify(stats), { EX: 300 });
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

async function start() {
  await connectRedis();
  
  // Setup WebSocket
  setupWebSocket(server);
  
  // Start Hiro Poller
  startPoller();
  
  // Initial price and stats
  await updateSTXPrice();
  await updateStats();
  
  // Periodic updates
  setInterval(updateSTXPrice, 5 * 60 * 1000); // 5 mins
  setInterval(updateStats, 60 * 1000); // 60 seconds
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(console.error);
