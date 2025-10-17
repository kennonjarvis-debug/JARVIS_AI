/**
 * Redis Cache Layer
 *
 * High-performance caching for frequently accessed data
 */

import Redis from 'ioredis';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class Cache {
  private redis: Redis;
  private readonly defaultTTL = 300; // 5 minutes

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);

    this.redis.on('error', (error) => {
      logger.error('Cache Redis error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('✅ Cache connected to Redis');
    });
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Cache invalidated: ${keys.length} keys matching ${pattern}`);
      }
    } catch (error) {
      logger.error(`Cache invalidate error for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple values
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(...keys);

      return values.map((value) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values
   */
  async mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const entry of entries) {
        const ttl = entry.ttl || this.defaultTTL;
        pipeline.setex(entry.key, ttl, JSON.stringify(entry.value));
      }

      await pipeline.exec();
      logger.debug(`Cache mset: ${entries.length} keys`);
    } catch (error) {
      logger.error('Cache mset error:', error);
      throw error;
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const value = await this.redis.incr(key);

      if (ttl && value === 1) {
        // Set TTL only on first increment
        await this.redis.expire(key, ttl);
      }

      return value;
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    keys: number;
    memory: string;
    hits: number;
    misses: number;
  }> {
    try {
      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');

      // Parse info strings
      const getStatValue = (info: string, key: string): string => {
        const match = info.match(new RegExp(`${key}:([^\\r\\n]+)`));
        return match ? match[1] : '0';
      };

      return {
        keys: await this.redis.dbsize(),
        memory: getStatValue(memory, 'used_memory_human'),
        hits: parseInt(getStatValue(info, 'keyspace_hits')),
        misses: parseInt(getStatValue(info, 'keyspace_misses')),
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { keys: 0, memory: '0B', hits: 0, misses: 0 };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
export const cache = new Cache(config.redisUrl);
