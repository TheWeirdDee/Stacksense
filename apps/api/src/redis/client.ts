import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Simple in-memory fallback for environments where Redis is not available
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
  on(event: string, cb: any) { return this; }
}

let activeClient: any = createClient({ url: redisUrl });

activeClient.on('error', (err: any) => {
  // Silence initial connection errors as we'll handle them in connectRedis
});

export const redisClient = new Proxy({} as any, {
  get: (target, prop) => activeClient[prop].bind(activeClient)
});

export async function connectRedis() {
  try {
    await activeClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis. Switching to in-memory fallback.');
    activeClient = new MemoryClient();
  }
}
