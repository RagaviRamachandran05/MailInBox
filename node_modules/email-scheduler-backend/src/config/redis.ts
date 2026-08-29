import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    logger.warn(`Redis connection retry attempt #${times}, delay: ${delay}ms`);
    return delay;
  },
};

// Singleton instance for general application caching & distributed rate-limiting
export const redis = new Redis(redisConnectionOptions);

redis.on('connect', () => {
  logger.info(`✅ Connected to Redis at ${env.REDIS_HOST}:${env.REDIS_PORT}`);
});

redis.on('error', (err) => {
  logger.error('❌ Redis connection error:', { error: err.message });
});
