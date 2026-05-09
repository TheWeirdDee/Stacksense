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

dotenv.config({ path: '../../.env' });
dotenv.config(); // Also check local .env

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL || 'https://stacksense.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

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
    const price = response.data.blockstack.usd;
    await redisClient.set('stx:price:usd', price.toString(), { EX: 300 });
    console.log(`[Price] Updated STX price: $${price}`);
  } catch (error) {
    console.error('[Price] Error fetching STX price:', error);
  }
}

async function start() {
  await connectRedis();
  
    setupWebSocket(server);
  
    startPoller();
  
    await updateSTXPrice();
  
  setInterval(updateSTXPrice, 5 * 60 * 1000);
  
  server.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
  });
}

start().catch(console.error);
