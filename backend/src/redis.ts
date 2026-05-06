// src/redis.ts — Shared Redis connection for BullMQ
import { Redis } from 'ioredis';
import { logger } from './lib/logger';

const redisConfig = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
};

export const redisConnection = new Redis(redisConfig);

redisConnection.on('connect', () => {
  logger.info({ host: redisConfig.host, port: redisConfig.port }, 'Redis connected');
});

redisConnection.on('error', (err) => {
  logger.error({ err: err.message }, 'Redis connection error');
});
