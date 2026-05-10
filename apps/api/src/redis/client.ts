import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

class MemoryClient {
  private store: Map<string, any> = new Map();
  public isOpen = true;

  async connect() { return; }
  async get(key: string) { return this.store.get(key) || null; }
  async set(key: string, value: string, options?: any) { 
    this.store.set(key, value); 
    return 'OK'; 
  }
  async sIsMember(key: string, value: string) {
    const set = this.store.get(key) as Set<string>;
    return set ? set.has(value) : false;
  }
  async sAdd(key: string, value: string) {
    let set = this.store.get(key) as Set<string>;
    if (!set) {
      set = new Set();
      this.store.set(key, set);
    }
    set.add(value);
    return 1;
  }
  async lPush(key: string, value: string) {
    let list = this.store.get(key) as string[];
    if (!list) {
      list = [];
      this.store.set(key, list);
    }
    list.unshift(value);
    return list.length;
  }
  async lRange(key: string, start: number, end: number) {
    const list = this.store.get(key) as string[];
    if (!list) return [];
    if (end === -1) return list.slice(start);
    return list.slice(start, end + 1);
  }
  async lTrim(key: string, start: number, end: number) {
    let list = this.store.get(key) as string[];
    if (list) {
      this.store.set(key, list.slice(start, end + 1));
    }
    return 'OK';
  }
  async expire(key: string, seconds: number) { return 1; }
  async exists(key: string) { return this.store.has(key) ? 1 : 0; }
  on(event: string, cb: any) { return this; }
}

let activeClient: any = createClient({ 
  url: redisUrl,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
  }
});

activeClient.on('error', (err: any) => {
});

export const redisClient = new Proxy({} as any, {
  get: (target, prop) => activeClient[prop].bind(activeClient)
});

export async function connectRedis() {
  if (activeClient.isOpen) {
    return;
  }

  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
  );

  try {
    await Promise.race([activeClient.connect(), timeout]);
    console.log('Connected to Redis');
  } catch (error) {
    if (error instanceof Error && error.message.includes('already open')) {
      return;
    }
    console.error('Failed to connect to Redis or connection timed out. Switching to in-memory fallback.');
    activeClient = new MemoryClient();
  }
}
