/**
 * Redis Client Configuration
 *
 * Centralized Redis client for the Jarvis platform
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

export const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (error) => {
  logger.error('Redis client error', error);
});

redisClient.on('close', () => {
  logger.warn('Redis client connection closed');
});

export default redisClient;
