'use client';

import { useEffect, useState, useCallback } from 'react';
import { InterpretedEvent } from '@/types';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://stacksense-production-7a6f.up.railway.app';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://stacksense-production-7a6f.up.railway.app/ws';

export function useFeed() {
  const [events, setEvents] = useState<InterpretedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const fetchInitialEvents = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/v1/feed`, {
        params: { limit: 50 }
      });
      setEvents(response.data.events);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialEvents();

    let socket: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        console.log('WebSocket Connected');
        setConnected(true);
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'event') {
          setEvents((prev) => [message.data, ...prev].slice(0, 500));
        }
      };

      socket.onclose = () => {
        console.log('WebSocket Disconnected');
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        socket.close();
      };
    };

    connect();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, [fetchInitialEvents]);

  return { events, loading, connected };
}
