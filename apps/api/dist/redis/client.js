import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
class MemoryClient {
    store = new Map();
    isOpen = true;
    async connect() { return; }
    async get(key) { return this.store.get(key) || null; }
    async set(key, value, options) {
        this.store.set(key, value);
        return 'OK';
    }
    async sIsMember(key, value) {
        const set = this.store.get(key);
        return set ? set.has(value) : false;
    }
    async sAdd(key, value) {
        let set = this.store.get(key);
        if (!set) {
            set = new Set();
            this.store.set(key, set);
        }
        set.add(value);
        return 1;
    }
    async lPush(key, value) {
        let list = this.store.get(key);
        if (!list) {
            list = [];
            this.store.set(key, list);
        }
        list.unshift(value);
        return list.length;
    }
    async lRange(key, start, end) {
        const list = this.store.get(key);
        if (!list)
            return [];
        if (end === -1)
            return list.slice(start);
        return list.slice(start, end + 1);
    }
    async lTrim(key, start, end) {
        let list = this.store.get(key);
        if (list) {
            this.store.set(key, list.slice(start, end + 1));
        }
        return 'OK';
    }
    async expire(key, seconds) { return 1; }
    async exists(key) { return this.store.has(key) ? 1 : 0; }
    on(event, cb) { return this; }
}
let activeClient = createClient({
    url: redisUrl,
    socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
    }
});
activeClient.on('error', (err) => {
    console.error('[Redis] Client error:', err?.message || err);
});
export const redisClient = new Proxy({}, {
    get: (target, prop) => {
        const val = activeClient[prop];
        return typeof val === 'function' ? val.bind(activeClient) : val;
    }
});
export async function connectRedis() {
    if (activeClient.isOpen) {
        return;
    }
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 5000));
    try {
        await Promise.race([activeClient.connect(), timeout]);
        console.log('Connected to Redis');
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('already open')) {
            return;
        }
        console.error('Failed to connect to Redis or connection timed out. Switching to in-memory fallback.', error);
        activeClient = new MemoryClient();
    }
}
