import Redis from 'ioredis';
import { env } from './env.js';

/**
 * Singleton Redis Client instance.
 *
 * Connects to Redis using `env.REDIS_URL` with automatic reconnection strategy.
 */
const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
    },
});

redis.on('connect', () => {
    console.log('✅ Redis client connected successfully.');
});

redis.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err.message);
});

export default redis;
