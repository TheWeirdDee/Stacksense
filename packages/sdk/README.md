# @stacksense/sdk

Official Node.js / browser client for the [StackSense](https://stacksense.app) agentic blockchain analytics API.

Zero runtime dependencies — uses the global `fetch` (Node 18+ / modern browsers).

## Install

```bash
npm install @stacksense/sdk
```

## Quick start

```ts
import { StackSense } from '@stacksense/sdk';

const client = new StackSense({
  apiKey: process.env.STACKSENSE_API_KEY, // optional for public endpoints
});

// Recent interpreted signals (filtered)
const feed = await client.getFeed({ signal: 'bullish', protocol: 'ALEX', limit: 20 });
console.log(feed.events);

// Wallet behavioral history + archetype
const wallet = await client.getWallet('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');

// Network telemetry
const blocks = await client.getNetworkBlocks();
const mempool = await client.getMempool();
const status = await client.getStatus();
```

## Live streaming

In the browser the global `WebSocket` is used automatically:

```ts
const stop = client.streamFeed((event) => console.log('new signal', event.title));
// later: stop();
```

In Node, inject the [`ws`](https://www.npmjs.com/package/ws) constructor:

```ts
import WebSocket from 'ws';

const stop = client.streamFeed(
  (event) => console.log(event.title),
  { WebSocketImpl: WebSocket, onError: console.error }
);
```

## Webhooks

```ts
await client.createAlert({
  subscriberAddress: 'SP…',
  webhookUrl: 'https://my-server.dev/hook',
  filters: { minStxAmount: 10000, protocols: ['ALEX', 'Velar'] },
});
```

## API

| Method | Endpoint |
| --- | --- |
| `getFeed(query?)` | `GET /api/v1/feed` |
| `getWallet(address)` | `GET /api/v1/wallet/:address` |
| `getStats()` | `GET /api/v1/stats` |
| `getPulse()` | `GET /api/v1/stats/pulse` |
| `getLeaderboard()` | `GET /api/v1/stats/leaderboard` |
| `getNetworkBlocks()` | `GET /api/v1/network/blocks` |
| `getMempool()` | `GET /api/v1/network/mempool` |
| `getStatus()` | `GET /api/v1/status` |
| `createAlert(input)` | `POST /api/v1/alerts/create` |
| `listAlerts(address)` | `GET /api/v1/alerts/list/:address` |
| `disableAlert(id)` | `POST /api/v1/alerts/disable/:id` |
| `streamFeed(cb, opts?)` | `WS /ws` |

## Configuration

```ts
new StackSense({
  baseUrl: 'https://your-deployment.up.railway.app',
  wsUrl: 'wss://your-deployment.up.railway.app/ws',
  apiKey: '…',
  timeoutMs: 10000,
  fetchImpl: customFetch, // for Node < 18
});
```

## License

MIT
