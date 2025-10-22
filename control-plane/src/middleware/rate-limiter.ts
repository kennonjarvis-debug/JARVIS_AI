/**
 * Core Rate Limiter Service
 *
 * Redis-backed rate limiting with multiple algorithms:
 * - Sliding window (default, most accurate)
 * - Token bucket (for burst allowance)
 * - Fixed window (simple, less accurate)
 *
 * Supports per-user, per-IP, and per-endpoint rate limiting
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';
import {
  REDIS_RATE_LIMIT_CONFIG,
  FALLBACK_CONFIG,
  VIOLATION_CONFIG,
} from '../config/rate-limits.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

export interface RateLimitOptions {
  identifier: string; // userId, IP, apiKeyId, etc.
  limit: number;
  windowMs: number;
  algorithm?: 'sliding-window' | 'token-bucket' | 'fixed-window';
  burstMultiplier?: number;
}

export interface ViolationRecord {
  timestamp: Date;
  identifier: string;
  endpoint: string;
  limit: number;
  attempted: number;
}

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

export class RateLimiter {
  private redis: Redis | null = null;
  private fallbackStore: Map<string, { count: number; resetAt: number }> = new Map();
  private connected: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.redis.on('connect', () => {
        this.connected = true;
        logger.info('Rate limiter Redis connected');
      });

      this.redis.on('error', (error) => {
        this.connected = false;
        if (FALLBACK_CONFIG.logRedisErrors) {
          logger.error('Rate limiter Redis error:', error);
        }
      });

      this.redis.on('close', () => {
        this.connected = false;
        logger.warn('Rate limiter Redis disconnected');
      });
    } catch (error: any) {
      logger.error('Failed to initialize Redis for rate limiting:', error);
      this.redis = null;
      this.connected = false;
    }
  }

  /**
   * Check rate limit using sliding window algorithm (default)
   */
  async checkLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    const { identifier, limit, windowMs, algorithm = 'sliding-window', burstMultiplier = 1.0 } = options;

    // Handle unlimited (-1)
    if (limit === -1) {
      return {
        allowed: true,
        limit: -1,
        remaining: -1,
        resetAt: new Date(Date.now() + windowMs),
      };
    }

    // Use fallback if Redis unavailable
    if (!this.connected || !this.redis) {
      return this.fallbackRateLimit(identifier, limit, windowMs);
    }

    try {
      switch (algorithm) {
        case 'sliding-window':
          return await this.slidingWindowRateLimit(identifier, limit, windowMs, burstMultiplier);
        case 'token-bucket':
          return await this.tokenBucketRateLimit(identifier, limit, windowMs, burstMultiplier);
        case 'fixed-window':
          return await this.fixedWindowRateLimit(identifier, limit, windowMs);
        default:
          return await this.slidingWindowRateLimit(identifier, limit, windowMs, burstMultiplier);
      }
    } catch (error: any) {
      logger.error('Rate limit check error:', error);
      // Graceful degradation
      if (FALLBACK_CONFIG.allowOnRedisFailure) {
        return this.fallbackRateLimit(identifier, limit, windowMs);
      } else {
        throw error;
      }
    }
  }

  /**
   * Sliding Window Rate Limiting (most accurate)
   * Uses Redis sorted sets with timestamps
   */
  private async slidingWindowRateLimit(
    identifier: string,
    limit: number,
    windowMs: number,
    burstMultiplier: number
  ): Promise<RateLimitResult> {
    if (!this.redis) throw new Error('Redis not connected');

    const key = `${REDIS_RATE_LIMIT_CONFIG.keyPrefix}sliding:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    const windowEnd = now;
    const resetAt = new Date(now + windowMs);

    // Effective limit with burst allowance
    const effectiveLimit = Math.floor(limit * burstMultiplier);

    // Redis transaction
    const multi = this.redis.multi();

    // Remove old entries outside the window
    multi.zremrangebyscore(key, '-inf', windowStart);

    // Count entries in current window
    multi.zcard(key);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry on key
    multi.expire(key, Math.ceil(windowMs / 1000));

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis transaction failed');
    }

    // Get count before adding current request
    const count = (results[1][1] as number) || 0;

    const allowed = count < effectiveLimit;
    const remaining = Math.max(0, effectiveLimit - count - 1);

    return {
      allowed,
      limit: effectiveLimit,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(windowMs / 1000),
    };
  }

  /**
   * Token Bucket Rate Limiting (supports bursts)
   */
  private async tokenBucketRateLimit(
    identifier: string,
    limit: number,
    windowMs: number,
    burstMultiplier: number
  ): Promise<RateLimitResult> {
    if (!this.redis) throw new Error('Redis not connected');

    const key = `${REDIS_RATE_LIMIT_CONFIG.keyPrefix}bucket:${identifier}`;
    const now = Date.now();

    // Bucket capacity with burst
    const capacity = Math.floor(limit * burstMultiplier);
    const refillRate = limit / (windowMs / 1000); // tokens per second

    // Get current bucket state
    const bucketData = await this.redis.get(key);
    let tokens = capacity;
    let lastRefill = now;

    if (bucketData) {
      const parsed = JSON.parse(bucketData);
      tokens = parsed.tokens;
      lastRefill = parsed.lastRefill;

      // Refill tokens based on time elapsed
      const elapsed = (now - lastRefill) / 1000;
      const refillAmount = elapsed * refillRate;
      tokens = Math.min(capacity, tokens + refillAmount);
    }

    const allowed = tokens >= 1;

    if (allowed) {
      tokens -= 1;
    }

    // Save updated bucket state
    await this.redis.set(
      key,
      JSON.stringify({ tokens, lastRefill: now }),
      'PX',
      windowMs
    );

    const resetAt = new Date(now + windowMs);

    return {
      allowed,
      limit: capacity,
      remaining: Math.floor(tokens),
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((1 - tokens) / refillRate),
    };
  }

  /**
   * Fixed Window Rate Limiting (simple, less accurate)
   */
  private async fixedWindowRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    if (!this.redis) throw new Error('Redis not connected');

    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const key = `${REDIS_RATE_LIMIT_CONFIG.keyPrefix}fixed:${identifier}:${windowStart}`;

    const count = await this.redis.incr(key);

    // Set expiry on first request in window
    if (count === 1) {
      await this.redis.pexpire(key, windowMs);
    }

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetAt = new Date(windowStart + windowMs);

    return {
      allowed,
      limit,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((resetAt.getTime() - now) / 1000),
    };
  }

  /**
   * In-memory fallback when Redis is unavailable
   */
  private fallbackRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): RateLimitResult {
    const now = Date.now();
    const key = identifier;

    let bucket = this.fallbackStore.get(key);

    // Create or reset bucket if expired
    if (!bucket || bucket.resetAt < now) {
      bucket = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    bucket.count += 1;
    this.fallbackStore.set(key, bucket);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanupFallbackStore();
    }

    const allowed = bucket.count <= limit;
    const remaining = Math.max(0, limit - bucket.count);

    return {
      allowed,
      limit: FALLBACK_CONFIG.fallbackLimits.requestsPerMinute,
      remaining,
      resetAt: new Date(bucket.resetAt),
      retryAfter: allowed ? undefined : Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  /**
   * Cleanup expired entries from fallback store
   */
  private cleanupFallbackStore(): void {
    const now = Date.now();
    for (const [key, bucket] of this.fallbackStore.entries()) {
      if (bucket.resetAt < now) {
        this.fallbackStore.delete(key);
      }
    }
  }

  /**
   * Record rate limit violation
   */
  async recordViolation(violation: ViolationRecord): Promise<void> {
    if (!this.redis) return;

    try {
      const key = REDIS_RATE_LIMIT_CONFIG.keys.violation(violation.identifier);
      const violationData = JSON.stringify(violation);

      // Add to violations list
      await this.redis.zadd(
        key,
        violation.timestamp.getTime(),
        violationData
      );

      // Keep only recent violations
      const cutoff = Date.now() - VIOLATION_CONFIG.violationWindowMs;
      await this.redis.zremrangebyscore(key, '-inf', cutoff);

      // Set expiry
      await this.redis.expire(
        key,
        VIOLATION_CONFIG.historyRetentionDays * 24 * 60 * 60
      );

      // Check if user should be temporarily banned
      const recentViolations = await this.redis.zcount(
        key,
        cutoff,
        '+inf'
      );

      if (recentViolations >= VIOLATION_CONFIG.maxViolationsBeforeBan) {
        await this.setBan(violation.identifier, VIOLATION_CONFIG.banDurationMs);
        logger.warn(`User temporarily banned due to rate limit violations: ${violation.identifier}`);
      }
    } catch (error: any) {
      logger.error('Failed to record violation:', error);
    }
  }

  /**
   * Check if identifier is banned
   */
  async isBanned(identifier: string): Promise<{ banned: boolean; until?: Date }> {
    if (!this.redis) return { banned: false };

    try {
      const key = `${REDIS_RATE_LIMIT_CONFIG.keyPrefix}ban:${identifier}`;
      const ttl = await this.redis.ttl(key);

      if (ttl > 0) {
        return {
          banned: true,
          until: new Date(Date.now() + ttl * 1000),
        };
      }

      return { banned: false };
    } catch (error: any) {
      logger.error('Failed to check ban status:', error);
      return { banned: false };
    }
  }

  /**
   * Temporarily ban an identifier
   */
  async setBan(identifier: string, durationMs: number): Promise<void> {
    if (!this.redis) return;

    try {
      const key = `${REDIS_RATE_LIMIT_CONFIG.keyPrefix}ban:${identifier}`;
      await this.redis.set(key, '1', 'PX', durationMs);
      logger.info(`Banned identifier: ${identifier} for ${durationMs}ms`);
    } catch (error: any) {
      logger.error('Failed to set ban:', error);
    }
  }

  /**
   * Remove ban from identifier
   */
  async removeBan(identifier: string): Promise<void> {
    if (!this.redis) return;

    try {
      const key = `${REDIS_RATE_LIMIT_CONFIG.keyPrefix}ban:${identifier}`;
      await this.redis.del(key);
      logger.info(`Removed ban for: ${identifier}`);
    } catch (error: any) {
      logger.error('Failed to remove ban:', error);
    }
  }

  /**
   * Get violation history for identifier
   */
  async getViolationHistory(identifier: string, limit: number = 100): Promise<ViolationRecord[]> {
    if (!this.redis) return [];

    try {
      const key = REDIS_RATE_LIMIT_CONFIG.keys.violation(identifier);
      const violations = await this.redis.zrevrange(key, 0, limit - 1);

      return violations.map((v) => {
        const parsed = JSON.parse(v);
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp),
        };
      });
    } catch (error: any) {
      logger.error('Failed to get violation history:', error);
      return [];
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    if (!this.redis) {
      this.fallbackStore.delete(identifier);
      return;
    }

    try {
      const patterns = [
        `${REDIS_RATE_LIMIT_CONFIG.keyPrefix}sliding:${identifier}`,
        `${REDIS_RATE_LIMIT_CONFIG.keyPrefix}bucket:${identifier}`,
        `${REDIS_RATE_LIMIT_CONFIG.keyPrefix}fixed:${identifier}:*`,
      ];

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          // Scan and delete matching keys
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          await this.redis.del(pattern);
        }
      }

      logger.info(`Reset rate limits for: ${identifier}`);
    } catch (error: any) {
      logger.error('Failed to reset rate limits:', error);
    }
  }

  /**
   * Get current usage stats
   */
  async getUsageStats(identifier: string): Promise<{
    hourly: number;
    daily: number;
  }> {
    if (!this.redis) return { hourly: 0, daily: 0 };

    try {
      const now = Date.now();
      const hourAgo = now - (60 * 60 * 1000);
      const dayAgo = now - (24 * 60 * 60 * 1000);

      const key = `${REDIS_RATE_LIMIT_CONFIG.keyPrefix}sliding:${identifier}`;

      const hourly = await this.redis.zcount(key, hourAgo, '+inf');
      const daily = await this.redis.zcount(key, dayAgo, '+inf');

      return { hourly, daily };
    } catch (error: any) {
      logger.error('Failed to get usage stats:', error);
      return { hourly: 0, daily: 0 };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.connected = false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const rateLimiter = new RateLimiter();
