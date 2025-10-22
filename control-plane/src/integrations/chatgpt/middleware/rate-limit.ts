/**
 * ChatGPT Rate Limiting Middleware
 *
 * Implements intelligent rate limiting for ChatGPT Custom GPT Actions.
 * Different limits for different action types and users.
 *
 * Limits:
 * - Music generation: 10 per hour (resource intensive)
 * - Analysis actions: 100 per hour (moderate)
 * - Query actions: 200 per hour (lightweight)
 * - Job status checks: 1000 per hour (very lightweight)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';
import { AuthenticatedRequest } from './auth.js';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store
// In production, use Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations (requests per hour)
const RATE_LIMITS = {
  'music.generate': 10,
  'music.analyze': 100,
  'music.validate': 100,
  'marketing.metrics': 200,
  'marketing.campaigns': 50,
  'marketing.growth-analysis': 20,
  'engagement.sentiment': 100,
  'engagement.churn': 50,
  'engagement.re-engage': 20,
  'automation.workflows': 50,
  'automation.forecasts': 20,
  'automation.scaling': 30,
  'testing.health': 200,
  'testing.validate': 100,
  'jobs.status': 1000,
  'default': 100,
};

/**
 * Generate rate limit key based on user and action
 */
function getRateLimitKey(req: Request, actionType: string): string {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id || req.ip || 'anonymous';
  return `${userId}:${actionType}`;
}

/**
 * Get action type from request path
 */
function getActionType(req: Request): string {
  const path = req.path;

  // Job status checks
  if (path.includes('/jobs/')) {
    return 'jobs.status';
  }

  // Extract module and action from path
  // Path format: /actions/{module}/{action}
  const match = path.match(/\/actions\/([^/]+)\/([^/]+)/);
  if (match) {
    const [, module, action] = match;
    return `${module}.${action}`;
  }

  return 'default';
}

/**
 * Get rate limit for action type
 */
function getRateLimit(actionType: string): number {
  return RATE_LIMITS[actionType as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;
}

/**
 * Check if rate limit exceeded
 */
function checkRateLimit(key: string, limit: number): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const entry = rateLimitStore.get(key);

  // No entry yet - allow and create
  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  // Entry expired - reset
  if (now >= entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip rate limiting in development mode if configured
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT_IN_DEV === 'true') {
      return next();
    }

    const actionType = getActionType(req);
    const limit = getRateLimit(actionType);
    const key = getRateLimitKey(req, actionType);

    const result = checkRateLimit(key, limit);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);

      logger.warn(`Rate limit exceeded for ${key}`, {
        actionType,
        limit,
        resetTime: new Date(result.resetTime).toISOString(),
      });

      return res.status(429).json({
        error: 'RateLimitExceeded',
        message: `You've exceeded the rate limit for this action. Please try again in ${retryAfterSeconds} seconds.`,
        limit,
        retryAfter: retryAfterSeconds,
        resetTime: new Date(result.resetTime).toISOString(),
      });
    }

    next();
  } catch (error: any) {
    logger.error('Rate limiting error:', error);
    // Don't block request on rate limiter errors
    next();
  }
}

/**
 * Custom rate limiter with specific limits
 */
export function customRateLimiter(requestsPerHour: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT_IN_DEV === 'true') {
        return next();
      }

      const actionType = getActionType(req);
      const key = getRateLimitKey(req, actionType);
      const result = checkRateLimit(key, requestsPerHour);

      res.setHeader('X-RateLimit-Limit', requestsPerHour.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      if (!result.allowed) {
        const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
        return res.status(429).json({
          error: 'RateLimitExceeded',
          message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
          limit: requestsPerHour,
          retryAfter: retryAfterSeconds,
        });
      }

      next();
    } catch (error: any) {
      logger.error('Custom rate limiting error:', error);
      next();
    }
  };
}

/**
 * Cleanup old rate limit entries (run periodically)
 */
export function cleanupRateLimits(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
  }

  return cleaned;
}

/**
 * Get current rate limit stats
 */
export function getRateLimitStats(): {
  totalKeys: number;
  entriesByAction: Record<string, number>;
} {
  const entriesByAction: Record<string, number> = {};

  for (const key of rateLimitStore.keys()) {
    const actionType = key.split(':')[1] || 'unknown';
    entriesByAction[actionType] = (entriesByAction[actionType] || 0) + 1;
  }

  return {
    totalKeys: rateLimitStore.size,
    entriesByAction,
  };
}

// Run cleanup every 10 minutes
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupRateLimits, 10 * 60 * 1000);
  logger.info('Rate limit cleanup scheduled (every 10 minutes)');
}
