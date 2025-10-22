/**
 * Rate Limit Middleware Orchestrator
 *
 * Main middleware that coordinates all rate limiting functionality:
 * - Bypass checks
 * - Endpoint-specific limits
 * - Subscription-based limits
 * - Ban enforcement
 * - Logging and monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from './rate-limiter.js';
import { checkSubscriptionRateLimit } from './subscription-rate-limits.js';
import { checkRateLimitBypass, extractAPIKeyScopes } from './rate-limit-bypass.js';
import { logger } from '../utils/logger.js';
import {
  getEndpointLimit,
  RATE_LIMIT_HEADERS,
  RATE_LIMIT_MESSAGES,
  MONITORING_CONFIG,
} from '../config/rate-limits.js';

// ============================================================================
// MAIN RATE LIMIT MIDDLEWARE
// ============================================================================

/**
 * Apply rate limiting to request
 * This is the main entry point - apply to all API routes
 *
 * Usage in Express:
 *   app.use('/api', rateLimitMiddleware);
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Check if request should bypass rate limiting
    checkRateLimitBypass(req, res, () => {});

    if (req.rateLimitBypass?.enabled) {
      logger.debug(`Rate limit bypassed: ${req.rateLimitBypass.reason}`);
      return next();
    }

    // 2. Check if identifier is banned
    const identifier = req.user?.id || getClientIP(req);
    const banStatus = await rateLimiter.isBanned(identifier);

    if (banStatus.banned) {
      return sendBanResponse(res, banStatus.until!);
    }

    // 3. Check endpoint-specific limits (if configured)
    const endpointLimit = getEndpointLimit(req.method, req.path);

    if (endpointLimit && endpointLimit.maxRequests > 0) {
      const result = await rateLimiter.checkLimit({
        identifier: `endpoint:${req.method}:${req.path}:${identifier}`,
        limit: endpointLimit.maxRequests,
        windowMs: endpointLimit.windowMs,
        algorithm: 'sliding-window',
      });

      if (!result.allowed) {
        // Record violation
        await rateLimiter.recordViolation({
          timestamp: new Date(),
          identifier,
          endpoint: `${req.method} ${req.path}`,
          limit: result.limit,
          attempted: result.limit + 1,
        });

        return sendEndpointLimitError(res, req, result, endpointLimit.message);
      }

      // Set headers
      setEndpointLimitHeaders(res, result);
    }

    // 4. Apply subscription-based rate limits
    await checkSubscriptionRateLimit(req, res, next);
  } catch (error: any) {
    logger.error('Rate limit middleware error:', error);

    // Graceful degradation - allow request
    logger.warn('Allowing request due to rate limit middleware error');
    next();
  }
}

// ============================================================================
// MIDDLEWARE COMPONENTS (EXPORTED FOR GRANULAR USE)
// ============================================================================

/**
 * Apply ONLY endpoint-specific rate limits
 * Useful for public endpoints that don't require authentication
 */
export async function endpointRateLimitOnly(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check bypass
    checkRateLimitBypass(req, res, () => {});
    if (req.rateLimitBypass?.enabled) {
      return next();
    }

    // Get identifier (IP for anonymous, userId for authenticated)
    const identifier = req.user?.id || getClientIP(req);

    // Check ban
    const banStatus = await rateLimiter.isBanned(identifier);
    if (banStatus.banned) {
      return sendBanResponse(res, banStatus.until!);
    }

    // Check endpoint limit
    const endpointLimit = getEndpointLimit(req.method, req.path);

    if (endpointLimit && endpointLimit.maxRequests > 0) {
      const result = await rateLimiter.checkLimit({
        identifier: `endpoint:${req.method}:${req.path}:${identifier}`,
        limit: endpointLimit.maxRequests,
        windowMs: endpointLimit.windowMs,
        algorithm: 'sliding-window',
      });

      if (!result.allowed) {
        await rateLimiter.recordViolation({
          timestamp: new Date(),
          identifier,
          endpoint: `${req.method} ${req.path}`,
          limit: result.limit,
          attempted: result.limit + 1,
        });

        return sendEndpointLimitError(res, req, result, endpointLimit.message);
      }

      setEndpointLimitHeaders(res, result);
    }

    next();
  } catch (error: any) {
    logger.error('Endpoint rate limit error:', error);
    next();
  }
}

/**
 * Apply ONLY IP-based rate limits
 * Useful for public/anonymous endpoints
 */
export async function ipRateLimitOnly(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check bypass
    checkRateLimitBypass(req, res, () => {});
    if (req.rateLimitBypass?.enabled) {
      return next();
    }

    const ip = getClientIP(req);

    // Check ban
    const banStatus = await rateLimiter.isBanned(ip);
    if (banStatus.banned) {
      return sendBanResponse(res, banStatus.until!);
    }

    // Apply IP-based limits (10 requests per minute, 100 per hour)
    const minuteResult = await rateLimiter.checkLimit({
      identifier: `ip:${ip}:minute`,
      limit: 10,
      windowMs: 60 * 1000,
      algorithm: 'sliding-window',
    });

    if (!minuteResult.allowed) {
      await rateLimiter.recordViolation({
        timestamp: new Date(),
        identifier: ip,
        endpoint: `${req.method} ${req.path}`,
        limit: minuteResult.limit,
        attempted: minuteResult.limit + 1,
      });

      return sendIPLimitError(res, minuteResult);
    }

    const hourResult = await rateLimiter.checkLimit({
      identifier: `ip:${ip}:hour`,
      limit: 100,
      windowMs: 60 * 60 * 1000,
      algorithm: 'sliding-window',
    });

    if (!hourResult.allowed) {
      await rateLimiter.recordViolation({
        timestamp: new Date(),
        identifier: ip,
        endpoint: `${req.method} ${req.path}`,
        limit: hourResult.limit,
        attempted: hourResult.limit + 1,
      });

      return sendIPLimitError(res, hourResult);
    }

    setEndpointLimitHeaders(res, hourResult);
    next();
  } catch (error: any) {
    logger.error('IP rate limit error:', error);
    next();
  }
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Send ban response
 */
function sendBanResponse(res: Response, until: Date): void {
  const message = RATE_LIMIT_MESSAGES.TEMPORARY_BAN(
    until.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short',
    })
  );

  const retryAfter = Math.ceil((until.getTime() - Date.now()) / 1000);

  res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter.toString());

  res.status(429).json({
    success: false,
    error: 'Temporarily banned',
    message,
    details: {
      bannedUntil: until.toISOString(),
      retryAfter,
    },
  });
}

/**
 * Send endpoint-specific limit error
 */
function sendEndpointLimitError(
  res: Response,
  req: Request,
  result: { limit: number; remaining: number; resetAt: Date; retryAfter?: number },
  customMessage?: string
): void {
  const resetTimeString = result.resetAt.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
  });

  const message =
    customMessage ||
    RATE_LIMIT_MESSAGES.ENDPOINT_LIMIT(`${req.method} ${req.path}`, resetTimeString);

  res.setHeader(RATE_LIMIT_HEADERS.LIMIT, result.limit.toString());
  res.setHeader(RATE_LIMIT_HEADERS.REMAINING, '0');
  res.setHeader(RATE_LIMIT_HEADERS.RESET, result.resetAt.toISOString());

  if (result.retryAfter) {
    res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, result.retryAfter.toString());
  }

  if (MONITORING_CONFIG.logViolations) {
    logger.warn(`Endpoint rate limit exceeded: ${req.method} ${req.path} - ${getClientIP(req)}`);
  }

  res.status(429).json({
    success: false,
    error: 'Endpoint rate limit exceeded',
    message,
    details: {
      endpoint: `${req.method} ${req.path}`,
      limit: result.limit,
      resetAt: result.resetAt.toISOString(),
      retryAfter: result.retryAfter,
    },
  });
}

/**
 * Send IP-based limit error
 */
function sendIPLimitError(
  res: Response,
  result: { limit: number; remaining: number; resetAt: Date; retryAfter?: number }
): void {
  res.setHeader(RATE_LIMIT_HEADERS.LIMIT, result.limit.toString());
  res.setHeader(RATE_LIMIT_HEADERS.REMAINING, '0');
  res.setHeader(RATE_LIMIT_HEADERS.RESET, result.resetAt.toISOString());

  if (result.retryAfter) {
    res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, result.retryAfter.toString());
  }

  res.status(429).json({
    success: false,
    error: 'IP rate limit exceeded',
    message: 'Too many requests from this IP address. Please try again later.',
    details: {
      limit: result.limit,
      resetAt: result.resetAt.toISOString(),
      retryAfter: result.retryAfter,
    },
  });
}

/**
 * Set rate limit headers
 */
function setEndpointLimitHeaders(
  res: Response,
  result: { limit: number; remaining: number; resetAt: Date }
): void {
  res.setHeader(RATE_LIMIT_HEADERS.LIMIT, result.limit.toString());
  res.setHeader(RATE_LIMIT_HEADERS.REMAINING, result.remaining.toString());
  res.setHeader(RATE_LIMIT_HEADERS.RESET, result.resetAt.toISOString());
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get client IP from request
 */
function getClientIP(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

// ============================================================================
// EXPORTS
// ============================================================================

export { extractAPIKeyScopes, checkRateLimitBypass };
