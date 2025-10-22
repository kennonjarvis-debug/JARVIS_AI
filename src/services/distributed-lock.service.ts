/**
 * Distributed Lock Service for Jarvis AI Platform
 *
 * Redis-based distributed locking to prevent duplicate job execution
 * across multiple instances.
 *
 * Features:
 * - Redis-based locks with TTL
 * - Lock expiration and renewal
 * - Deadlock prevention
 * - Lock ownership verification
 * - Automatic cleanup
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { redisClient } from '../db/redis';

export interface LockOptions {
  ttl?: number; // Time to live in milliseconds
  retryCount?: number; // Number of retry attempts
  retryDelay?: number; // Delay between retries in milliseconds
  renewInterval?: number; // Auto-renew interval in milliseconds
}

export interface Lock {
  key: string;
  token: string;
  ttl: number;
  acquiredAt: Date;
  renewTimer?: NodeJS.Timeout;
}

class DistributedLockService extends EventEmitter {
  private locks: Map<string, Lock> = new Map();
  private readonly keyPrefix = 'lock:';

  constructor() {
    super();
  }

  /**
   * Acquire a distributed lock
   */
  async acquire(
    key: string,
    options: LockOptions = {}
  ): Promise<Lock | null> {
    const {
      ttl = 30000, // 30 seconds default
      retryCount = 3,
      retryDelay = 100,
      renewInterval,
    } = options;

    const token = this.generateToken();
    const lockKey = this.keyPrefix + key;

    // Try to acquire lock with retries
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const acquired = await this.tryAcquire(lockKey, token, ttl);

        if (acquired) {
          const lock: Lock = {
            key,
            token,
            ttl,
            acquiredAt: new Date(),
          };

          // Set up auto-renewal if requested
          if (renewInterval && renewInterval > 0) {
            lock.renewTimer = setInterval(
              () => this.renew(lock),
              renewInterval
            );
          }

          this.locks.set(key, lock);

          logger.debug('Lock acquired', {
            key,
            token,
            ttl,
            attempt,
          });

          this.emit('lock-acquired', lock);
          return lock;
        }

        // Wait before retry
        if (attempt < retryCount) {
          await this.delay(retryDelay);
        }
      } catch (error) {
        logger.error('Error acquiring lock', { error, key, attempt });
      }
    }

    logger.warn('Failed to acquire lock after retries', {
      key,
      retryCount,
    });

    return null;
  }

  /**
   * Try to acquire lock (single attempt)
   */
  private async tryAcquire(
    lockKey: string,
    token: string,
    ttl: number
  ): Promise<boolean> {
    // Use SET NX (set if not exists) with expiration
    const result = await redisClient.set(
      lockKey,
      token,
      'PX',
      ttl,
      'NX'
    );

    return result === 'OK';
  }

  /**
   * Release a lock
   */
  async release(lock: Lock): Promise<boolean> {
    const lockKey = this.keyPrefix + lock.key;

    try {
      // Stop auto-renewal
      if (lock.renewTimer) {
        clearInterval(lock.renewTimer);
        lock.renewTimer = undefined;
      }

      // Use Lua script to ensure we only delete our own lock
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await redisClient.eval(
        script,
        1,
        lockKey,
        lock.token
      );

      const released = result === 1;

      if (released) {
        this.locks.delete(lock.key);

        logger.debug('Lock released', {
          key: lock.key,
          token: lock.token,
        });

        this.emit('lock-released', lock);
      } else {
        logger.warn('Failed to release lock (not owner or expired)', {
          key: lock.key,
          token: lock.token,
        });
      }

      return released;
    } catch (error) {
      logger.error('Error releasing lock', { error, lock });
      return false;
    }
  }

  /**
   * Renew a lock's TTL
   */
  async renew(lock: Lock): Promise<boolean> {
    const lockKey = this.keyPrefix + lock.key;

    try {
      // Use Lua script to renew only if we own the lock
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await redisClient.eval(
        script,
        1,
        lockKey,
        lock.token,
        lock.ttl
      );

      const renewed = result === 1;

      if (renewed) {
        logger.debug('Lock renewed', {
          key: lock.key,
          token: lock.token,
          ttl: lock.ttl,
        });

        this.emit('lock-renewed', lock);
      } else {
        logger.warn('Failed to renew lock (not owner or expired)', {
          key: lock.key,
          token: lock.token,
        });

        // Stop auto-renewal if renewal failed
        if (lock.renewTimer) {
          clearInterval(lock.renewTimer);
          lock.renewTimer = undefined;
        }

        this.locks.delete(lock.key);
        this.emit('lock-lost', lock);
      }

      return renewed;
    } catch (error) {
      logger.error('Error renewing lock', { error, lock });
      return false;
    }
  }

  /**
   * Extend a lock's TTL by a specific amount
   */
  async extend(lock: Lock, additionalTtl: number): Promise<boolean> {
    const lockKey = this.keyPrefix + lock.key;

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          local current_ttl = redis.call("pttl", KEYS[1])
          local new_ttl = current_ttl + tonumber(ARGV[2])
          return redis.call("pexpire", KEYS[1], new_ttl)
        else
          return 0
        end
      `;

      const result = await redisClient.eval(
        script,
        1,
        lockKey,
        lock.token,
        additionalTtl
      );

      return result === 1;
    } catch (error) {
      logger.error('Error extending lock', { error, lock });
      return false;
    }
  }

  /**
   * Check if a lock is currently held
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = this.keyPrefix + key;

    try {
      const value = await redisClient.get(lockKey);
      return value !== null;
    } catch (error) {
      logger.error('Error checking lock status', { error, key });
      return false;
    }
  }

  /**
   * Check if we own a specific lock
   */
  async ownsLock(lock: Lock): Promise<boolean> {
    const lockKey = this.keyPrefix + lock.key;

    try {
      const value = await redisClient.get(lockKey);
      return value === lock.token;
    } catch (error) {
      logger.error('Error checking lock ownership', { error, lock });
      return false;
    }
  }

  /**
   * Execute a function with a lock
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const lock = await this.acquire(key, options);

    if (!lock) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      const result = await fn();
      return result;
    } finally {
      await this.release(lock);
    }
  }

  /**
   * Try to execute a function with a lock (don't throw if lock not acquired)
   */
  async tryWithLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T | null> {
    const lock = await this.acquire(key, options);

    if (!lock) {
      logger.warn('Could not acquire lock, skipping execution', { key });
      return null;
    }

    try {
      const result = await fn();
      return result;
    } finally {
      await this.release(lock);
    }
  }

  /**
   * Force release a lock (even if not owner)
   * Use with caution - only for cleanup/emergency
   */
  async forceRelease(key: string): Promise<void> {
    const lockKey = this.keyPrefix + key;

    try {
      await redisClient.del(lockKey);

      logger.warn('Lock force released', { key });
      this.emit('lock-force-released', key);
    } catch (error) {
      logger.error('Error force releasing lock', { error, key });
      throw error;
    }
  }

  /**
   * Clean up all locks held by this instance
   */
  async releaseAll(): Promise<void> {
    const locks = Array.from(this.locks.values());

    logger.info('Releasing all locks', { count: locks.length });

    for (const lock of locks) {
      await this.release(lock);
    }
  }

  /**
   * Get all locks held by this instance
   */
  getLocks(): Lock[] {
    return Array.from(this.locks.values());
  }

  /**
   * Get lock information
   */
  async getLockInfo(key: string): Promise<{
    locked: boolean;
    ttl: number;
    ownedByUs: boolean;
  } | null> {
    const lockKey = this.keyPrefix + key;
    const localLock = this.locks.get(key);

    try {
      const value = await redisClient.get(lockKey);
      if (!value) {
        return {
          locked: false,
          ttl: 0,
          ownedByUs: false,
        };
      }

      const ttl = await redisClient.pttl(lockKey);
      const ownedByUs = localLock ? value === localLock.token : false;

      return {
        locked: true,
        ttl,
        ownedByUs,
      };
    } catch (error) {
      logger.error('Error getting lock info', { error, key });
      return null;
    }
  }

  /**
   * Generate a unique lock token
   */
  private generateToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up expired locks (maintenance task)
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;

    for (const [key, lock] of this.locks.entries()) {
      const owns = await this.ownsLock(lock);
      if (!owns) {
        // Lock expired or lost
        if (lock.renewTimer) {
          clearInterval(lock.renewTimer);
        }
        this.locks.delete(key);
        cleaned++;

        logger.debug('Cleaned up expired lock', { key });
      }
    }

    if (cleaned > 0) {
      logger.info('Lock cleanup completed', { cleaned });
    }

    return cleaned;
  }

  /**
   * Get statistics about locks
   */
  getStats(): {
    activeLocks: number;
    locksWithRenewal: number;
  } {
    const locks = Array.from(this.locks.values());

    return {
      activeLocks: locks.length,
      locksWithRenewal: locks.filter(l => l.renewTimer !== undefined).length,
    };
  }
}

export const distributedLockService = new DistributedLockService();
