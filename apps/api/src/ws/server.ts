import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { redisClient } from '../redis/client.js';

let wss: WebSocketServer;
const inMemoryEvents: any[] = [];

async function getRecentEvents(n: number): Promise<any[]> {
  try {
    const events = await redisClient.lRange('events:recent', 0, n - 1);
    if (events && events.length > 0) {
      return events.map((e: string) => JSON.parse(e));
    }
  } catch (err) {
    console.error('[WS] Redis error in getRecentEvents:', err);
  }
  return inMemoryEvents.slice(0, n);
}

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ noServer: true, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected. Total:', wss.clients.size)

    getRecentEvents(10).then(events => {
      if (events.length > 0) {
        ws.send(JSON.stringify({ type: 'initial', data: events }))
        console.log(`[WS] Sent ${events.length} initial events to new client`)
      }
    }).catch(err => {
      console.error('[WS] Failed to send initial events:', err)
    })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type?: string }
        if (msg.type === 'pong') return
      } catch (err) {
        console.warn('[WS] Invalid client payload ignored:', err)
      }
    })

    ws.on('close', () => {
      console.log('[WS] Client disconnected. Total:', wss.clients.size)
    })

    ws.on('error', (err) => {
      console.error('[WS] Socket error:', err.message)
    })
  })

  setInterval(() => {
    if (!wss) return;
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'ping' }))
      }
    })
  }, 30_000)

  return wss;
}

export function broadcastEvent(event: any) {
  if (!wss) return;
  
  inMemoryEvents.unshift(event);
  if (inMemoryEvents.length > 100) inMemoryEvents.pop();

  const message = JSON.stringify({ type: 'event', data: event });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function getClientCount() {
  return wss ? wss.clients.size : 0;
}
