/**
 * Subscription-Based Rate Limiting Middleware
 *
 * Enforces tier-based rate limits based on user's subscription plan:
 * - Starter: 50 AI requests/day, 500 API calls/hour
 * - Professional: 200 AI requests/day, 2000 API calls/hour
 * - Enterprise: Unlimited
 *
 * Returns 429 with proper headers when limits exceeded
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, PlanTier } from '@prisma/client';
import { rateLimiter } from './rate-limiter.js';
import { logger } from '../utils/logger.js';
import {
  getRateLimitForTier,
  ANONYMOUS_LIMITS,
  RATE_LIMIT_HEADERS,
  RATE_LIMIT_MESSAGES,
  MONITORING_CONFIG,
} from '../config/rate-limits.js';

const prisma = new PrismaClient();

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitContext {
  userId?: string;
  userEmail?: string;
  tier: PlanTier | 'ANONYMOUS';
  quotas: {
    aiRequestsPerDay: number;
    apiCallsPerHour: number;
    apiCallsPerMinute: number;
  };
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      rateLimitContext?: RateLimitContext;
    }
  }
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================

/**
 * Check subscription-based rate limits
 * Should be applied AFTER authentication middleware
 */
export async function checkSubscriptionRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get user context
    const context = await getUserRateLimitContext(req);
    req.rateLimitContext = context;

    // Check if this is an AI request (counts against AI quota)
    const isAIRequest = isAIEndpoint(req.path);

    // Check minute-level limits (for all requests)
    const minuteResult = await rateLimiter.checkLimit({
      identifier: `user:${context.userId || 'anonymous'}:minute`,
      limit: context.quotas.apiCallsPerMinute,
      windowMs: 60 * 1000, // 1 minute
      algorithm: 'sliding-window',
    });

    if (!minuteResult.allowed) {
      return sendRateLimitError(
        res,
        context,
        minuteResult,
        'Minute',
        req.path
      );
    }

    // Check hourly limits
    const hourResult = await rateLimiter.checkLimit({
      identifier: `user:${context.userId || 'anonymous'}:hour`,
      limit: context.quotas.apiCallsPerHour,
      windowMs: 60 * 60 * 1000, // 1 hour
      algorithm: 'sliding-window',
      burstMultiplier: context.tier === PlanTier.ENTERPRISE ? 1.5 : 1.2,
    });

    if (!hourResult.allowed) {
      return sendRateLimitError(
        res,
        context,
        hourResult,
        'Hourly',
        req.path
      );
    }

    // Check daily AI quota (if AI request)
    if (isAIRequest) {
      const dayResult = await rateLimiter.checkLimit({
        identifier: `user:${context.userId || 'anonymous'}:ai:day`,
        limit: context.quotas.aiRequestsPerDay,
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        algorithm: 'sliding-window',
      });

      if (!dayResult.allowed) {
        return sendRateLimitError(
          res,
          context,
          dayResult,
          'AI Daily',
          req.path
        );
      }

      // Set AI-specific headers
      setRateLimitHeaders(res, dayResult, context.tier, 'AI');
    }

    // Set standard rate limit headers
    setRateLimitHeaders(res, hourResult, context.tier, 'API');

    // Log warnings if approaching limit
    if (MONITORING_CONFIG.logWarnings) {
      checkWarningThresholds(context, hourResult, 'hourly');
      if (isAIRequest) {
        // Would need to fetch day result again, skip for now
      }
    }

    next();
  } catch (error: any) {
    logger.error('Subscription rate limit check failed:', error);

    // Graceful degradation - allow request but log error
    logger.warn('Allowing request due to rate limit check error');
    next();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user's rate limit context from database
 */
async function getUserRateLimitContext(req: Request): Promise<RateLimitContext> {
  // Anonymous user
  if (!req.user) {
    return {
      tier: 'ANONYMOUS',
      quotas: {
        aiRequestsPerDay: ANONYMOUS_LIMITS.aiRequestsPerDay,
        apiCallsPerHour: ANONYMOUS_LIMITS.apiCallsPerHour,
        apiCallsPerMinute: ANONYMOUS_LIMITS.apiCallsPerMinute,
      },
    };
  }

  try {
    // Fetch user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
      select: {
        planTier: true,
        status: true,
      },
    });

    // Default to FREE_TRIAL if no subscription
    const tier = subscription?.planTier || PlanTier.FREE_TRIAL;
    const quotas = getRateLimitForTier(tier);

    // If subscription expired/canceled, downgrade to free tier
    if (
      subscription &&
      ['CANCELED', 'EXPIRED', 'PAST_DUE'].includes(subscription.status)
    ) {
      const freeQuotas = getRateLimitForTier(PlanTier.FREE_TRIAL);
      return {
        userId: req.user.id,
        userEmail: req.user.email,
        tier: PlanTier.FREE_TRIAL,
        quotas: {
          aiRequestsPerDay: freeQuotas.aiRequestsPerDay,
          apiCallsPerHour: freeQuotas.apiCallsPerHour,
          apiCallsPerMinute: freeQuotas.apiCallsPerMinute,
        },
      };
    }

    return {
      userId: req.user.id,
      userEmail: req.user.email,
      tier,
      quotas: {
        aiRequestsPerDay: quotas.aiRequestsPerDay,
        apiCallsPerHour: quotas.apiCallsPerHour,
        apiCallsPerMinute: quotas.apiCallsPerMinute,
      },
    };
  } catch (error: any) {
    logger.error('Failed to fetch user subscription:', error);

    // Fallback to free tier on error
    const freeQuotas = getRateLimitForTier(PlanTier.FREE_TRIAL);
    return {
      userId: req.user.id,
      userEmail: req.user.email,
      tier: PlanTier.FREE_TRIAL,
      quotas: {
        aiRequestsPerDay: freeQuotas.aiRequestsPerDay,
        apiCallsPerHour: freeQuotas.apiCallsPerHour,
        apiCallsPerMinute: freeQuotas.apiCallsPerMinute,
      },
    };
  }
}

/**
 * Check if endpoint is an AI request
 */
function isAIEndpoint(path: string): boolean {
  const aiEndpoints = [
    '/api/ai/generate',
    '/api/ai/chat',
    '/api/v1/chat',
    '/api/ai/completion',
    '/api/ai/embedding',
    '/api/observatory/analyze', // Uses AI
  ];

  return aiEndpoints.some((endpoint) => path.startsWith(endpoint));
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(
  res: Response,
  result: { limit: number; remaining: number; resetAt: Date },
  tier: PlanTier | 'ANONYMOUS',
  quotaType: 'API' | 'AI'
): void {
  res.setHeader(RATE_LIMIT_HEADERS.LIMIT, result.limit.toString());
  res.setHeader(RATE_LIMIT_HEADERS.REMAINING, result.remaining.toString());
  res.setHeader(RATE_LIMIT_HEADERS.RESET, result.resetAt.toISOString());
  res.setHeader(RATE_LIMIT_HEADERS.TIER, tier);
  res.setHeader(RATE_LIMIT_HEADERS.QUOTA_TYPE, quotaType);
}

/**
 * Send 429 error response
 */
function sendRateLimitError(
  res: Response,
  context: RateLimitContext,
  result: { limit: number; remaining: number; resetAt: Date; retryAfter?: number },
  limitType: 'Minute' | 'Hourly' | 'AI Daily',
  endpoint: string
): void {
  // Set headers
  setRateLimitHeaders(res, result, context.tier, limitType.includes('AI') ? 'AI' : 'API');

  if (result.retryAfter) {
    res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, result.retryAfter.toString());
  }

  // Record violation
  rateLimiter.recordViolation({
    timestamp: new Date(),
    identifier: context.userId || 'anonymous',
    endpoint,
    limit: result.limit,
    attempted: result.limit + 1,
  });

  // Determine upgrade suggestion
  let upgradeSuggestion: string | undefined;
  if (context.tier === PlanTier.FREE_TRIAL || context.tier === 'ANONYMOUS') {
    upgradeSuggestion = RATE_LIMIT_MESSAGES.UPGRADE_SUGGESTION('Free Trial', 'Starter');
  } else if (context.tier === PlanTier.STARTER) {
    upgradeSuggestion = RATE_LIMIT_MESSAGES.UPGRADE_SUGGESTION('Starter', 'Professional');
  } else if (context.tier === PlanTier.PROFESSIONAL) {
    upgradeSuggestion = RATE_LIMIT_MESSAGES.UPGRADE_SUGGESTION('Professional', 'Enterprise');
  }

  // Build error message
  const resetTimeString = result.resetAt.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
  });

  let message: string;
  if (limitType === 'AI Daily') {
    message = RATE_LIMIT_MESSAGES.AI_QUOTA_EXCEEDED(
      context.tier,
      result.limit,
      resetTimeString
    );
  } else {
    message = RATE_LIMIT_MESSAGES.QUOTA_EXCEEDED(
      context.tier,
      resetTimeString
    );
  }

  // Log violation
  if (MONITORING_CONFIG.logViolations) {
    logger.warn(`Rate limit exceeded: ${context.userId || 'anonymous'} - ${limitType} - ${endpoint}`);
  }

  // Send response
  res.status(429).json({
    success: false,
    error: 'Rate limit exceeded',
    message,
    details: {
      limitType,
      tier: context.tier,
      limit: result.limit,
      remaining: 0,
      resetAt: result.resetAt.toISOString(),
      retryAfter: result.retryAfter,
    },
    upgrade: upgradeSuggestion
      ? {
          message: upgradeSuggestion,
          url: '/pricing',
        }
      : undefined,
  });
}

/**
 * Check if approaching warning thresholds
 */
function checkWarningThresholds(
  context: RateLimitContext,
  result: { limit: number; remaining: number },
  limitType: string
): void {
  if (result.limit === -1) return; // Unlimited

  const usagePercent = ((result.limit - result.remaining) / result.limit) * 100;

  for (const threshold of MONITORING_CONFIG.warningThresholds) {
    if (usagePercent >= threshold * 100 && usagePercent < threshold * 100 + 5) {
      logger.info(
        `Rate limit warning: ${context.userId || 'anonymous'} at ${Math.round(usagePercent)}% of ${limitType} limit`
      );

      // Could trigger notification to user here
      // e.g., send email warning at 90% usage
      break;
    }
  }
}

/**
 * Get current usage for user
 */
export async function getUserCurrentUsage(userId: string): Promise<{
  api: { hourly: number; minute: number };
  ai: { daily: number };
}> {
  const apiHourly = await rateLimiter.getUsageStats(`user:${userId}:hour`);
  const apiMinute = await rateLimiter.getUsageStats(`user:${userId}:minute`);
  const aiDaily = await rateLimiter.getUsageStats(`user:${userId}:ai:day`);

  return {
    api: {
      hourly: apiHourly.hourly,
      minute: apiMinute.hourly, // Use hourly method but with minute identifier
    },
    ai: {
      daily: aiDaily.daily,
    },
  };
}

/**
 * Reset user's rate limits (admin function)
 */
export async function resetUserRateLimits(userId: string): Promise<void> {
  await Promise.all([
    rateLimiter.reset(`user:${userId}:minute`),
    rateLimiter.reset(`user:${userId}:hour`),
    rateLimiter.reset(`user:${userId}:ai:day`),
  ]);

  logger.info(`Rate limits reset for user: ${userId}`);
}
