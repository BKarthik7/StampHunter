import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) return null; // stop retrying, don't crash server
    return Math.min(times * 200, 1000);
  },
});

redis.on('error', (err) => {
  // Log but don't crash — Redis is for caching, not critical path
  console.warn('Redis connection error (non-fatal):', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});
