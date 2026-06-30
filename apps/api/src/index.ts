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
import subscriptionContractRoutes from './routes/subscriptionContract.js';
import projectRoutes from './routes/project.js';
import { rateLimit } from './middleware/rateLimit.js';
import statusRoutes from './routes/status.js';
import networkRoutes from './routes/network.js';
import votesRoutes from './routes/votes.js';

dotenv.config({ path: '../../.env' });
dotenv.config();

export const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'signal-tips';
export const SUBSCRIPTION_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_ADDRESS || '';
export const SUBSCRIPTION_CONTRACT_NAME = process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_NAME || 'stacksense-subscriptions';

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

    if (!origin || allowed.some((o) => origin.startsWith(o!))) {
      return callback(null, true);
    }

    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }

    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));

app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Per-IP rate limiting across the public API surface.
app.use('/api/v1', rateLimit({ windowMs: 60_000, maxRequests: 120 }));

app.use('/api/v1/subscriptions', subscriptionsRoutes);
app.use('/api/v1/alerts', alertsRoutes);
app.use('/api/v1/developers', developersRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/subscription-contract', subscriptionContractRoutes);
app.use('/api/v1/project', projectRoutes);
app.use('/api/v1/status', statusRoutes);
app.use('/api/v1/network', networkRoutes);
app.use('/api/v1/votes', votesRoutes);

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
