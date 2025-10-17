/**
 * Redis Session Store
 *
 * Manages user sessions with Redis for distributed storage across multiple instances
 */

import Redis from 'ioredis';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export interface Session {
  id: string;
  userId?: string;
  source: 'desktop' | 'web' | 'chatgpt' | 'iphone';
  data: Record<string, any>;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
}

export class SessionStore {
  private redis: Redis;
  private readonly prefix = 'session:';
  private readonly defaultTTL = 3600; // 1 hour

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);

    this.redis.on('error', (error) => {
      logger.error('Session store Redis error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('✅ Session store connected to Redis');
    });
  }

  /**
   * Create or update session
   */
  async saveSession(session: Session, ttl: number = this.defaultTTL): Promise<void> {
    const key = this.prefix + session.id;

    try {
      await this.redis.setex(
        key,
        ttl,
        JSON.stringify({
          ...session,
          lastAccessedAt: Date.now(),
        })
      );

      logger.debug(`Session saved: ${session.id}`);
    } catch (error) {
      logger.error(`Failed to save session ${session.id}:`, error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const key = this.prefix + sessionId;

    try {
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      const session: Session = JSON.parse(data);

      // Update last accessed time
      session.lastAccessedAt = Date.now();
      await this.saveSession(session);

      return session;
    } catch (error) {
      logger.error(`Failed to get session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = this.prefix + sessionId;

    try {
      await this.redis.del(key);
      logger.debug(`Session deleted: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to delete session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string, ttl: number = this.defaultTTL): Promise<void> {
    const key = this.prefix + sessionId;

    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      logger.error(`Failed to extend session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      const sessions: Session[] = [];

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const session: Session = JSON.parse(data);
          if (session.userId === userId) {
            sessions.push(session);
          }
        }
      }

      return sessions;
    } catch (error) {
      logger.error(`Failed to get user sessions for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Clear all sessions for a user
   */
  async clearUserSessions(userId: string): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId);

      for (const session of sessions) {
        await this.deleteSession(session.id);
      }

      logger.info(`Cleared ${sessions.length} sessions for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to clear user sessions for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get session count
   */
  async getSessionCount(): Promise<number> {
    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      return keys.length;
    } catch (error) {
      logger.error('Failed to get session count:', error);
      return 0;
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
export const sessionStore = new SessionStore(config.redisUrl);
