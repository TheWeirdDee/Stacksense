import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import axios from 'axios';
import cors from 'cors';
import { connectRedis, redisClient } from './redis/client.js';
import { startPoller } from './ingestion/poller.js';
import { setupWebSocket } from './ws/server.js';
import feedRoutes from './routes/feed.js';
import walletRoutes from './routes/wallet.js';
import statsRoutes from './routes/stats.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import alertsRoutes from './routes/alerts.js';
import developersRoutes from './routes/developers.js';

dotenv.config({ path: '../../.env' });
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin || allowed.some(o => origin.startsWith(o!))) {
      callback(null, true);
    } else if (origin.includes('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/subscriptions', subscriptionsRoutes);
app.use('/api/v1/alerts', alertsRoutes);
app.use('/api/v1/developers', developersRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/stats', statsRoutes);

async function updateSTXPrice() {
  try {
    const baseUrl = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    const response = await axios.get(`${baseUrl}/simple/price`, {
      params: {
        ids: 'blockstack',
        vs_currencies: 'usd'
      },
      timeout: 5000
    });
    const price = response.data?.blockstack?.usd;
    if (price) {
      await redisClient.set('stx:price:usd', price.toString(), { EX: 300 });
      console.log(`[Price] Updated STX price: $${price}`);
    }
  } catch (error: any) {
    console.error('[Price] Error fetching STX price:', error.message);
  }
}

async function start() {
  await connectRedis();
  
  const wss = setupWebSocket(server);
  
  server.on('upgrade', (request, socket, head) => {
    if (wss && request.url?.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  startPoller();
  await updateSTXPrice();
  setInterval(updateSTXPrice, 5 * 60 * 1000);
  
  server.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
  });
}

start().catch(console.error);
// PR: auto-generated branch pr/api-integration
