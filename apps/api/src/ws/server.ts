import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { redisClient } from '../redis/client.js';

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
}

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', async (ws: ExtWebSocket) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Log connection
    console.log(`[WS] Client connected. Total: ${wss.clients.size}`);

    ws.on('close', () => {
      console.log(`[WS] Client disconnected. Total: ${wss.clients.size}`);
    });
    
    // Send last 10 events as history
    try {
      const recent = await redisClient.lRange('events:recent', 0, 9);
      const history = recent.map((s: string) => JSON.parse(s));
      ws.send(JSON.stringify({ type: 'history', data: history }));
    } catch (error) {
      console.error('[WS] Error sending history:', error);
    }

    // Heartbeat every 30s
    const hb = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
    }, 30_000)
    ws.on('close', () => clearInterval(hb))
  });
  
  // Also keep the server-wide interval for terminating dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtWebSocket;
      if (!extWs.isAlive) return ws.terminate();
      extWs.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(interval);
  });
}

export function broadcastEvent(event: any) {
  if (!wss) return;
  const message = JSON.stringify({ type: 'event', data: event });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
