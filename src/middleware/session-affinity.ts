/**
 * Session Affinity Middleware for Jarvis AI Platform
 *
 * Implements sticky sessions for load-balanced instances.
 * Ensures that requests from the same client are routed to the same instance.
 *
 * Features:
 * - Consistent routing keys
 * - WebSocket connection handling
 * - Session migration on instance shutdown
 * - Redis-backed session tracking
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { redisClient } from '../db/redis';

export interface SessionAffinityConfig {
  headerName: string;
  cookieName: string;
  ttl: number; // Time to live in seconds
  useIpHash: boolean;
}

const defaultConfig: SessionAffinityConfig = {
  headerName: 'X-Instance-ID',
  cookieName: 'jarvis_instance',
  ttl: 3600, // 1 hour
  useIpHash: false,
};

class SessionAffinityManager {
  private config: SessionAffinityConfig;
  private instanceId: string;

  constructor() {
    this.config = { ...defaultConfig };
    this.instanceId = this.generateInstanceId();
  }

  /**
   * Configure session affinity
   */
  configure(config: Partial<SessionAffinityConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Session affinity configured', { config: this.config });
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(): string {
    const hostname = process.env.HOSTNAME || 'unknown';
    const pid = process.pid;
    const timestamp = Date.now();
    return crypto
      .createHash('sha256')
      .update(`${hostname}-${pid}-${timestamp}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get the current instance ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Generate routing key from request
   */
  private generateRoutingKey(req: Request): string {
    // Priority 1: Existing session cookie
    if (req.cookies && req.cookies[this.config.cookieName]) {
      return req.cookies[this.config.cookieName];
    }

    // Priority 2: Existing header
    const headerValue = req.get(this.config.headerName);
    if (headerValue) {
      return headerValue;
    }

    // Priority 3: IP-based hash (for sticky sessions)
    if (this.config.useIpHash) {
      const clientIp = this.getClientIp(req);
      return crypto
        .createHash('sha256')
        .update(clientIp)
        .digest('hex')
        .substring(0, 16);
    }

    // Default: Use current instance
    return this.instanceId;
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    // Check X-Forwarded-For header (from load balancer)
    const forwardedFor = req.get('X-Forwarded-For');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    // Check X-Real-IP header
    const realIp = req.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }

    // Fall back to connection IP
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Middleware to handle session affinity
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const routingKey = this.generateRoutingKey(req);

        // Set routing key in response headers
        res.setHeader(this.config.headerName, this.instanceId);

        // Set cookie for sticky sessions
        res.cookie(this.config.cookieName, routingKey, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: this.config.ttl * 1000,
          sameSite: 'lax',
        });

        // Store session-instance mapping in Redis
        await this.trackSession(routingKey, req);

        // Attach routing info to request
        (req as any).routingKey = routingKey;
        (req as any).instanceId = this.instanceId;

        next();
      } catch (error) {
        logger.error('Session affinity middleware error', { error });
        // Don't block request on affinity errors
        next();
      }
    };
  }

  /**
   * Track session in Redis
   */
  private async trackSession(routingKey: string, req: Request): Promise<void> {
    const sessionKey = `session:affinity:${routingKey}`;
    const sessionData = {
      instanceId: this.instanceId,
      clientIp: this.getClientIp(req),
      userAgent: req.get('User-Agent') || 'unknown',
      lastSeen: new Date().toISOString(),
      path: req.path,
    };

    try {
      await redisClient.setex(
        sessionKey,
        this.config.ttl,
        JSON.stringify(sessionData)
      );
    } catch (error) {
      logger.error('Failed to track session in Redis', { error, routingKey });
    }
  }

  /**
   * Get session instance mapping
   */
  async getSessionInstance(routingKey: string): Promise<string | null> {
    const sessionKey = `session:affinity:${routingKey}`;

    try {
      const data = await redisClient.get(sessionKey);
      if (data) {
        const sessionData = JSON.parse(data);
        return sessionData.instanceId;
      }
    } catch (error) {
      logger.error('Failed to get session instance', { error, routingKey });
    }

    return null;
  }

  /**
   * Migrate sessions from one instance to another
   * Called during graceful shutdown
   */
  async migrateSessions(fromInstanceId: string, toInstanceId: string): Promise<number> {
    let migratedCount = 0;

    try {
      // Find all sessions for the source instance
      const pattern = 'session:affinity:*';
      const keys = await this.scanKeys(pattern);

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const sessionData = JSON.parse(data);
          if (sessionData.instanceId === fromInstanceId) {
            // Update to new instance
            sessionData.instanceId = toInstanceId;
            sessionData.migratedAt = new Date().toISOString();

            await redisClient.setex(
              key,
              this.config.ttl,
              JSON.stringify(sessionData)
            );
            migratedCount++;
          }
        }
      }

      logger.info('Sessions migrated', {
        from: fromInstanceId,
        to: toInstanceId,
        count: migratedCount,
      });
    } catch (error) {
      logger.error('Failed to migrate sessions', {
        error,
        from: fromInstanceId,
        to: toInstanceId,
      });
    }

    return migratedCount;
  }

  /**
   * Scan Redis keys with pattern
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      cursor = reply[0];
      keys.push(...reply[1]);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Clear all session affinity data
   */
  async clearAllSessions(): Promise<void> {
    try {
      const keys = await this.scanKeys('session:affinity:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info('All session affinity data cleared', { count: keys.length });
      }
    } catch (error) {
      logger.error('Failed to clear session affinity data', { error });
    }
  }

  /**
   * Get statistics about session affinity
   */
  async getStats(): Promise<{
    totalSessions: number;
    sessionsByInstance: Record<string, number>;
    oldestSession: Date | null;
    newestSession: Date | null;
  }> {
    const stats = {
      totalSessions: 0,
      sessionsByInstance: {} as Record<string, number>,
      oldestSession: null as Date | null,
      newestSession: null as Date | null,
    };

    try {
      const keys = await this.scanKeys('session:affinity:*');
      stats.totalSessions = keys.length;

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const sessionData = JSON.parse(data);
          const instanceId = sessionData.instanceId;

          // Count by instance
          stats.sessionsByInstance[instanceId] =
            (stats.sessionsByInstance[instanceId] || 0) + 1;

          // Track oldest/newest
          const lastSeen = new Date(sessionData.lastSeen);
          if (!stats.oldestSession || lastSeen < stats.oldestSession) {
            stats.oldestSession = lastSeen;
          }
          if (!stats.newestSession || lastSeen > stats.newestSession) {
            stats.newestSession = lastSeen;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to get session affinity stats', { error });
    }

    return stats;
  }
}

export const sessionAffinityManager = new SessionAffinityManager();

/**
 * Express middleware for session affinity
 */
export const sessionAffinityMiddleware = () => {
  return sessionAffinityManager.middleware();
};

/**
 * WebSocket upgrade handler for session affinity
 */
export const handleWebSocketAffinity = (
  req: any,
  socket: any,
  head: any
): void => {
  // Extract routing key from cookies or headers
  const cookies = req.headers.cookie?.split(';').reduce((acc: any, cookie: string) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  const routingKey =
    cookies?.[defaultConfig.cookieName] ||
    req.headers[defaultConfig.headerName.toLowerCase()] ||
    sessionAffinityManager.getInstanceId();

  // Attach routing info to socket
  (socket as any).routingKey = routingKey;
  (socket as any).instanceId = sessionAffinityManager.getInstanceId();

  logger.debug('WebSocket affinity applied', {
    routingKey,
    instanceId: sessionAffinityManager.getInstanceId(),
  });
};
