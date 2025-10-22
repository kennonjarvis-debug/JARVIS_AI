/**
 * Redis Optimization Service
 *
 * Features:
 * - Pipeline commands for batch operations
 * - Batch operations
 * - Pub/Sub optimization
 * - Connection pooling
 * - Command buffering
 * - Automatic reconnection
 */

import Redis, { Pipeline, RedisOptions } from 'ioredis';

export interface RedisOptimizerOptions extends RedisOptions {
  pipelineThreshold?: number; // Number of commands to trigger pipeline
  bufferWindow?: number; // Time window for buffering commands (ms)
  enableMetrics?: boolean; // Enable performance metrics
  poolSize?: number; // Connection pool size for pub/sub
}

export interface RedisMetrics {
  totalCommands: number;
  pipelinedCommands: number;
  batchedCommands: number;
  avgCommandTime: number;
  cacheHits: number;
  cacheMisses: number;
  pubsubMessages: number;
  connectionErrors: number;
}

export class RedisOptimizerService {
  private client: Redis;
  private options: Required<RedisOptimizerOptions>;
  private metrics: RedisMetrics;
  private commandBuffer: Array<{ command: string; args: any[]; resolve: Function; reject: Function }> = [];
  private bufferTimer?: NodeJS.Timeout;
  private pubsubClients: Map<string, Redis> = new Map();

  constructor(options: RedisOptimizerOptions = {}) {
    this.options = {
      host: options.host || process.env.REDIS_HOST || 'localhost',
      port: options.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: options.password || process.env.REDIS_PASSWORD,
      db: options.db || 0,
      pipelineThreshold: options.pipelineThreshold || 10,
      bufferWindow: options.bufferWindow || 10, // 10ms
      enableMetrics: options.enableMetrics !== false,
      poolSize: options.poolSize || 5,
      maxRetriesPerRequest: options.maxRetriesPerRequest || 3,
      enableReadyCheck: options.enableReadyCheck !== false,
      lazyConnect: options.lazyConnect || false,
      retryStrategy: options.retryStrategy || this.defaultRetryStrategy,
      ...options,
    } as Required<RedisOptimizerOptions>;

    // Initialize metrics
    this.metrics = {
      totalCommands: 0,
      pipelinedCommands: 0,
      batchedCommands: 0,
      avgCommandTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      pubsubMessages: 0,
      connectionErrors: 0,
    };

    // Create Redis client
    this.client = new Redis(this.options);

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Default retry strategy
   */
  private defaultRetryStrategy(times: number): number | null {
    if (times > 3) {
      console.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 200, 2000);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.client.on('connect', () => {
      console.log('Redis connected');
    });

    this.client.on('ready', () => {
      console.log('Redis ready');
    });

    this.client.on('error', (err) => {
      this.metrics.connectionErrors++;
      console.error('Redis error:', err);
    });

    this.client.on('close', () => {
      console.log('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }

  /**
   * Execute single command
   */
  async execute<T = any>(command: string, ...args: any[]): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalCommands++;

    try {
      const result = await (this.client as any)[command](...args);
      this.updateCommandMetrics(Date.now() - startTime);
      return result;
    } catch (error) {
      console.error(`Redis command error (${command}):`, error);
      throw error;
    }
  }

  /**
   * Execute commands in pipeline
   */
  async pipeline(commands: Array<[string, ...any[]]>): Promise<any[]> {
    this.metrics.pipelinedCommands += commands.length;

    const pipeline = this.client.pipeline();
    for (const [command, ...args] of commands) {
      (pipeline as any)[command](...args);
    }

    const results = await pipeline.exec();
    return results?.map(([err, result]) => {
      if (err) throw err;
      return result;
    }) || [];
  }

  /**
   * Batch execute commands (buffered)
   */
  async batchExecute<T = any>(command: string, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      this.commandBuffer.push({ command, args, resolve, reject });

      // If buffer reaches threshold, flush immediately
      if (this.commandBuffer.length >= this.options.pipelineThreshold) {
        this.flushBuffer();
      } else {
        // Otherwise, flush after buffer window
        if (!this.bufferTimer) {
          this.bufferTimer = setTimeout(() => {
            this.flushBuffer();
          }, this.options.bufferWindow);
        }
      }
    });
  }

  /**
   * Flush command buffer
   */
  private async flushBuffer(): Promise<void> {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = undefined;
    }

    if (this.commandBuffer.length === 0) {
      return;
    }

    const commands = [...this.commandBuffer];
    this.commandBuffer = [];

    this.metrics.batchedCommands += commands.length;

    try {
      const pipeline = this.client.pipeline();
      for (const { command, args } of commands) {
        (pipeline as any)[command](...args);
      }

      const results = await pipeline.exec();

      if (results) {
        results.forEach(([err, result], index) => {
          if (err) {
            commands[index].reject(err);
          } else {
            commands[index].resolve(result);
          }
        });
      }
    } catch (error) {
      console.error('Buffer flush error:', error);
      commands.forEach(({ reject }) => reject(error));
    }
  }

  /**
   * Multi-get with automatic pipelining
   */
  async mget(keys: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    if (keys.length === 0) return results;

    try {
      const values = await this.client.mget(...keys);
      keys.forEach((key, index) => {
        if (values[index] !== null) {
          try {
            results.set(key, JSON.parse(values[index]!));
            this.metrics.cacheHits++;
          } catch {
            results.set(key, values[index]);
            this.metrics.cacheHits++;
          }
        } else {
          this.metrics.cacheMisses++;
        }
      });
    } catch (error) {
      console.error('MGET error:', error);
      throw error;
    }

    return results;
  }

  /**
   * Multi-set with automatic pipelining
   */
  async mset(entries: Map<string, any>, ttl?: number): Promise<void> {
    if (entries.size === 0) return;

    try {
      const pipeline = this.client.pipeline();

      for (const [key, value] of entries) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await pipeline.exec();
    } catch (error) {
      console.error('MSET error:', error);
      throw error;
    }
  }

  /**
   * Delete multiple keys with pipelining
   */
  async mdel(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      if (keys.length === 1) {
        await this.client.del(keys[0]);
      } else {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('MDEL error:', error);
      throw error;
    }
  }

  /**
   * Optimized pub/sub: reuse connections
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    let subscriber = this.pubsubClients.get(channel);

    if (!subscriber) {
      subscriber = this.client.duplicate();
      this.pubsubClients.set(channel, subscriber);

      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          this.metrics.pubsubMessages++;
          callback(message);
        }
      });

      await subscriber.subscribe(channel);
      console.log(`Subscribed to channel: ${channel}`);
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: string): Promise<void> {
    const subscriber = this.pubsubClients.get(channel);
    if (subscriber) {
      await subscriber.unsubscribe(channel);
      subscriber.disconnect();
      this.pubsubClients.delete(channel);
      console.log(`Unsubscribed from channel: ${channel}`);
    }
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: string): Promise<number> {
    try {
      const receivers = await this.client.publish(channel, message);
      this.metrics.pubsubMessages++;
      return receivers;
    } catch (error) {
      console.error('Publish error:', error);
      throw error;
    }
  }

  /**
   * Scan keys with pattern (optimized)
   */
  async scanKeys(pattern: string, count: number = 100): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, foundKeys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count
      );
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Increment counter with expiry
   */
  async incrementWithExpiry(key: string, expiry: number = 60): Promise<number> {
    const pipeline = this.client.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, expiry);
    const results = await pipeline.exec();
    return results?.[0]?.[1] as number || 0;
  }

  /**
   * Rate limiting with sliding window
   */
  async rateLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - window * 1000;

    const pipeline = this.client.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);

    // Count current requests
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}`);

    // Set expiry
    pipeline.expire(key, window);

    const results = await pipeline.exec();
    const count = (results?.[1]?.[1] as number) || 0;

    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count - 1),
    };
  }

  /**
   * Atomic increment/decrement operations
   */
  async atomicIncrement(key: string, amount: number = 1): Promise<number> {
    return await this.client.incrby(key, amount);
  }

  async atomicDecrement(key: string, amount: number = 1): Promise<number> {
    return await this.client.decrby(key, amount);
  }

  /**
   * Get metrics
   */
  getMetrics(): RedisMetrics {
    return { ...this.metrics };
  }

  /**
   * Update command metrics
   */
  private updateCommandMetrics(executionTime: number): void {
    this.metrics.avgCommandTime =
      (this.metrics.avgCommandTime * (this.metrics.totalCommands - 1) + executionTime) /
      this.metrics.totalCommands;
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<any> {
    const info = await this.client.info();
    return this.parseInfo(info);
  }

  /**
   * Parse Redis INFO output
   */
  private parseInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};
    let section = '';

    for (const line of lines) {
      if (line.startsWith('#')) {
        section = line.substring(2).toLowerCase();
        result[section] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[section][key] = value;
      }
    }

    return result;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalCommands: 0,
      pipelinedCommands: 0,
      batchedCommands: 0,
      avgCommandTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      pubsubMessages: 0,
      connectionErrors: 0,
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    // Flush any pending commands
    await this.flushBuffer();

    // Close pub/sub connections
    for (const [channel, subscriber] of this.pubsubClients) {
      await subscriber.quit();
    }
    this.pubsubClients.clear();

    // Close main connection
    await this.client.quit();
    console.log('Redis connections closed');
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.client.status === 'ready';
  }

  /**
   * Ping Redis
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

// Singleton instance
let redisOptimizerService: RedisOptimizerService | null = null;

export function getRedisOptimizerService(options?: RedisOptimizerOptions): RedisOptimizerService {
  if (!redisOptimizerService) {
    redisOptimizerService = new RedisOptimizerService(options);
  }
  return redisOptimizerService;
}

export default RedisOptimizerService;
