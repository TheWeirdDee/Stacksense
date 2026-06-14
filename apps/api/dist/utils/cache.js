/**
 * Backend Utilities - Cache Management
 * Redis caching helpers and utilities
 */
import { redisClient as redis } from '../redis/client.js';
import { REDIS_TTL } from '../constants.js';
export async function cacheGet(key) {
    try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (error) {
        console.error(`Cache get error for key ${key}:`, error);
        return null;
    }
}
export async function cacheSet(key, value, ttl = REDIS_TTL.API_KEY) {
    try {
        await redis.setex(key, ttl, JSON.stringify(value));
        return true;
    }
    catch (error) {
        console.error(`Cache set error for key ${key}:`, error);
        return false;
    }
}
export async function cacheDelete(key) {
    try {
        await redis.del(key);
        return true;
    }
    catch (error) {
        console.error(`Cache delete error for key ${key}:`, error);
        return false;
    }
}
export async function cacheExists(key) {
    try {
        const exists = await redis.exists(key);
        return exists === 1;
    }
    catch (error) {
        console.error(`Cache exists error for key ${key}:`, error);
        return false;
    }
}
export async function cacheIncrement(key, amount = 1) {
    try {
        return await redis.incrby(key, amount);
    }
    catch (error) {
        console.error(`Cache increment error for key ${key}:`, error);
        return 0;
    }
}
export async function cacheGetAll(pattern) {
    try {
        const keys = await redis.keys(pattern);
        const result = {};
        for (const key of keys) {
            const data = await redis.get(key);
            if (data) {
                result[key] = JSON.parse(data);
            }
        }
        return result;
    }
    catch (error) {
        console.error(`Cache get all error for pattern ${pattern}:`, error);
        return {};
    }
}
export async function cacheClear(pattern) {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length === 0)
            return 0;
        return await redis.del(...keys);
    }
    catch (error) {
        console.error(`Cache clear error for pattern ${pattern}:`, error);
        return 0;
    }
}
