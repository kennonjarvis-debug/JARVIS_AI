/**
 * Multi-Tier Caching Service
 *
 * Implements a comprehensive caching strategy:
 * - L1: In-memory cache (node-cache) for hot data
 * - L2: Redis for shared cache across instances
 * - L3: Database (fallback)
 *
 * Features:
 * - Cache-aside pattern
 * - Automatic TTL management
 * - Cache invalidation
 * - Cache warming
 * - Hit/miss metrics
 */

import NodeCache from 'node-cache';
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tier?: 'l1' | 'l2' | 'all'; // Which cache tier to use
  warmup?: boolean; // Pre-warm cache on startup
}

export interface CacheMetrics {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
}

export class CacheService {
  private l1Cache: NodeCache;
  private l2Cache: Redis | null = null;
  private metrics: CacheMetrics;
  private defaultTTL: number = 3600; // 1 hour

  constructor() {
    // L1 Cache: In-memory (fast, local to instance)
    this.l1Cache = new NodeCache({
      stdTTL: this.defaultTTL,
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // Better performance, but be careful with object mutation
      maxKeys: 10000, // Limit memory usage
    });

    // L2 Cache: Redis (shared across instances)
    this.initRedisCache();

    // Metrics tracking
    this.metrics = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
    };

    // Setup cache event listeners
    this.setupEventListeners();
  }

  private initRedisCache(): void {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.l2Cache = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      this.l2Cache.on('connect', () => {
        console.log('Redis L2 cache connected');
      });

      this.l2Cache.on('error', (err) => {
        console.error('Redis L2 cache error:', err);
      });

      // Connect lazily
      this.l2Cache.connect().catch(console.error);
    } catch (error) {
      console.error('Failed to initialize Redis L2 cache:', error);
      this.l2Cache = null;
    }
  }

  private setupEventListeners(): void {
    // Monitor L1 cache events
    this.l1Cache.on('expired', (key, value) => {
      console.log(`L1 cache key expired: ${key}`);
    });

    this.l1Cache.on('del', (key, value) => {
      // Invalidate L2 cache as well
      this.invalidateL2(key);
    });
  }

  /**
   * Get value from cache (checks L1 -> L2 -> null)
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const tier = options.tier || 'all';

    // Try L1 cache first
    if (tier === 'l1' || tier === 'all') {
      const l1Value = this.l1Cache.get<T>(key);
      if (l1Value !== undefined) {
        this.metrics.l1Hits++;
        this.metrics.totalHits++;
        this.updateHitRate();
        return l1Value;
      }
      this.metrics.l1Misses++;
    }

    // Try L2 cache (Redis)
    if ((tier === 'l2' || tier === 'all') && this.l2Cache) {
      try {
        const l2Value = await this.l2Cache.get(key);
        if (l2Value !== null) {
          const parsed = JSON.parse(l2Value) as T;

          // Promote to L1 cache
          this.l1Cache.set(key, parsed, options.ttl || this.defaultTTL);

          this.metrics.l2Hits++;
          this.metrics.totalHits++;
          this.updateHitRate();
          return parsed;
        }
        this.metrics.l2Misses++;
      } catch (error) {
        console.error('L2 cache get error:', error);
      }
    }

    this.metrics.totalMisses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.defaultTTL;
    const tier = options.tier || 'all';

    // Set in L1 cache
    if (tier === 'l1' || tier === 'all') {
      this.l1Cache.set(key, value, ttl);
    }

    // Set in L2 cache (Redis)
    if ((tier === 'l2' || tier === 'all') && this.l2Cache) {
      try {
        await this.l2Cache.setex(key, ttl, JSON.stringify(value));
      } catch (error) {
        console.error('L2 cache set error:', error);
      }
    }
  }

  /**
   * Delete key from all cache tiers
   */
  async delete(key: string): Promise<void> {
    this.l1Cache.del(key);
    await this.invalidateL2(key);
  }

  /**
   * Invalidate L2 cache key
   */
  private async invalidateL2(key: string): Promise<void> {
    if (this.l2Cache) {
      try {
        await this.l2Cache.del(key);
      } catch (error) {
        console.error('L2 cache delete error:', error);
      }
    }
  }

  /**
   * Clear all cache tiers
   */
  async clear(): Promise<void> {
    this.l1Cache.flushAll();
    if (this.l2Cache) {
      try {
        await this.l2Cache.flushall();
      } catch (error) {
        console.error('L2 cache clear error:', error);
      }
    }
  }

  /**
   * Cache-aside pattern: get from cache or fetch from function
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await fetchFn();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    // Try L1 first
    const l1Misses: string[] = [];
    for (const key of keys) {
      const value = this.l1Cache.get<T>(key);
      if (value !== undefined) {
        results.set(key, value);
        this.metrics.l1Hits++;
      } else {
        l1Misses.push(key);
        this.metrics.l1Misses++;
      }
    }

    // Try L2 for misses
    if (l1Misses.length > 0 && this.l2Cache) {
      try {
        const l2Values = await this.l2Cache.mget(...l1Misses);
        l2Values.forEach((value, index) => {
          if (value !== null) {
            const parsed = JSON.parse(value) as T;
            const key = l1Misses[index];
            results.set(key, parsed);
            // Promote to L1
            this.l1Cache.set(key, parsed);
            this.metrics.l2Hits++;
          } else {
            this.metrics.l2Misses++;
          }
        });
      } catch (error) {
        console.error('L2 cache mget error:', error);
      }
    }

    this.metrics.totalHits += results.size;
    this.metrics.totalMisses += keys.length - results.size;
    this.updateHitRate();

    return results;
  }

  /**
   * Batch set multiple keys
   */
  async mset<T>(entries: Map<string, T>, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.defaultTTL;

    // Set in L1
    for (const [key, value] of entries) {
      this.l1Cache.set(key, value, ttl);
    }

    // Set in L2 (Redis pipeline for performance)
    if (this.l2Cache) {
      try {
        const pipeline = this.l2Cache.pipeline();
        for (const [key, value] of entries) {
          pipeline.setex(key, ttl, JSON.stringify(value));
        }
        await pipeline.exec();
      } catch (error) {
        console.error('L2 cache mset error:', error);
      }
    }
  }

  /**
   * Invalidate cache by pattern (e.g., "user:*")
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // L1: Get all keys and filter
    const l1Keys = this.l1Cache.keys();
    const matchingKeys = l1Keys.filter(key => this.matchPattern(key, pattern));
    matchingKeys.forEach(key => this.l1Cache.del(key));

    // L2: Use Redis SCAN for pattern matching
    if (this.l2Cache) {
      try {
        const stream = this.l2Cache.scanStream({ match: pattern, count: 100 });
        stream.on('data', (keys: string[]) => {
          if (keys.length) {
            const pipeline = this.l2Cache!.pipeline();
            keys.forEach(key => pipeline.del(key));
            pipeline.exec().catch(console.error);
          }
        });
        stream.on('end', () => {
          console.log(`Invalidated pattern: ${pattern}`);
        });
      } catch (error) {
        console.error('L2 cache pattern invalidation error:', error);
      }
    }
  }

  /**
   * Simple pattern matching (supports * wildcard)
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }

  /**
   * Warm up cache with common queries
   */
  async warmup(warmupFn: () => Promise<Map<string, any>>): Promise<void> {
    console.log('Warming up cache...');
    try {
      const entries = await warmupFn();
      await this.mset(entries, { ttl: this.defaultTTL * 2 }); // Longer TTL for warmup
      console.log(`Cache warmed up with ${entries.size} entries`);
    } catch (error) {
      console.error('Cache warmup error:', error);
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.metrics.totalHits + this.metrics.totalMisses;
    this.metrics.hitRate = total > 0 ? this.metrics.totalHits / total : 0;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      l1: {
        keys: this.l1Cache.keys().length,
        stats: this.l1Cache.getStats(),
      },
      l2: {
        connected: this.l2Cache?.status === 'ready',
      },
      metrics: this.getMetrics(),
    };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    this.l1Cache.flushAll();
    this.l1Cache.close();
    if (this.l2Cache) {
      await this.l2Cache.quit();
    }
  }
}

// Singleton instance
let cacheService: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheService) {
    cacheService = new CacheService();
  }
  return cacheService;
}

export default getCacheService;
