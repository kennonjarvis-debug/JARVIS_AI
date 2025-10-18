/**
 * Next.js API Route Rate Limiter
 *
 * Redis-backed rate limiting for Next.js API routes
 * Provides simple interface for edge and serverless functions
 */

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  /** Unique identifier (userId, IP, etc.) */
  identifier: string;
  /** Maximum requests allowed in window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Optional custom error message */
  message?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

// ============================================================================
// REDIS CLIENT
// ============================================================================

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }
  return redis;
}

// ============================================================================
// RATE LIMITER
// ============================================================================

/**
 * Check rate limit using sliding window algorithm
 */
export async function rateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { identifier, limit, windowSeconds } = config;

  try {
    const client = getRedisClient();
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;
    const key = `jarvis:nextjs:ratelimit:${identifier}`;

    // Ensure connection
    if (client.status !== 'ready') {
      await client.connect();
    }

    // Redis pipeline for atomic operations
    const multi = client.multi();

    // Remove old entries
    multi.zremrangebyscore(key, '-inf', windowStart);

    // Count current entries
    multi.zcard(key);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry
    multi.expire(key, windowSeconds);

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis transaction failed');
    }

    // Get count before adding current request
    const count = (results[1][1] as number) || 0;

    const allowed = count < limit;
    const remaining = Math.max(0, limit - count - 1);
    const resetAt = Math.ceil((now + windowMs) / 1000);

    return {
      success: allowed,
      limit,
      remaining,
      reset: resetAt,
      retryAfter: allowed ? undefined : Math.ceil(windowMs / 1000),
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);

    // Graceful degradation - allow request
    const resetAt = Math.ceil((Date.now() + config.windowSeconds * 1000) / 1000);
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: resetAt,
    };
  }
}

/**
 * Apply rate limiting to Next.js API route
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const ip = request.ip ?? 'anonymous';
 *   const result = await applyRateLimit(request, {
 *     identifier: ip,
 *     limit: 10,
 *     windowSeconds: 60,
 *   });
 *
 *   if (!result.success) {
 *     return result.response;
 *   }
 *
 *   // Continue with request...
 *   return NextResponse.json({ data: 'ok' });
 * }
 * ```
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{
  success: boolean;
  response?: NextResponse;
  headers: Record<string, string>;
}> {
  const result = await rateLimit(config);

  // Prepare headers
  const headers = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };

  if (!result.success) {
    // Add retry-after header
    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    const message =
      config.message ||
      'Too many requests. Please try again later.';

    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message,
        limit: result.limit,
        reset: new Date(result.reset * 1000).toISOString(),
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers,
      }
    );

    return {
      success: false,
      response,
      headers,
    };
  }

  return {
    success: true,
    headers,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get client IP from Next.js request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to request IP
  return request.ip || 'anonymous';
}

/**
 * Get rate limit identifier from request
 * Uses userId if authenticated, falls back to IP
 */
export function getRateLimitIdentifier(request: NextRequest): string {
  // Check for user ID in custom header (set by middleware)
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP
  const ip = getClientIP(request);
  return `ip:${ip}`;
}

/**
 * Preset rate limit configs for common use cases
 */
export const RATE_LIMIT_PRESETS = {
  /** Very strict - for auth endpoints */
  strict: {
    limit: 5,
    windowSeconds: 60 * 15, // 15 minutes
  },
  /** Standard - for most API endpoints */
  standard: {
    limit: 60,
    windowSeconds: 60, // 1 minute
  },
  /** Generous - for read-heavy endpoints */
  generous: {
    limit: 300,
    windowSeconds: 60, // 1 minute
  },
  /** Per hour limits */
  hourly: {
    limit: 100,
    windowSeconds: 60 * 60, // 1 hour
  },
};

// ============================================================================
// LEGACY SUPPORT (Pages Router)
// ============================================================================

/**
 * Rate limit middleware for Next.js Pages API routes
 *
 * @example
 * ```ts
 * import type { NextApiRequest, NextApiResponse } from 'next';
 * import { withRateLimit } from '@/lib/rate-limit';
 *
 * async function handler(req: NextApiRequest, res: NextApiResponse) {
 *   // Your handler code
 *   res.json({ data: 'ok' });
 * }
 *
 * export default withRateLimit(handler, {
 *   limit: 10,
 *   windowSeconds: 60,
 * });
 * ```
 */
export function withRateLimit(
  handler: (req: any, res: any) => Promise<void> | void,
  config: Omit<RateLimitConfig, 'identifier'>
) {
  return async (req: any, res: any) => {
    // Get identifier from request
    const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.socket.remoteAddress ||
      'anonymous';

    const identifier = `ip:${ip}`;

    // Check rate limit
    const result = await rateLimit({
      ...config,
      identifier,
    });

    // Set headers
    res.setHeader('X-RateLimit-Limit', result.limit.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', result.reset.toString());

    if (!result.success) {
      if (result.retryAfter) {
        res.setHeader('Retry-After', result.retryAfter.toString());
      }

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: config.message || 'Too many requests. Please try again later.',
        limit: result.limit,
        reset: new Date(result.reset * 1000).toISOString(),
        retryAfter: result.retryAfter,
      });
    }

    // Continue to handler
    return handler(req, res);
  };
}

/**
 * Clean up Redis connection (call on app shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
