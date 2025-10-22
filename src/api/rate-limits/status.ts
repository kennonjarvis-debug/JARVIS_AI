/**
 * Rate Limit Status API
 *
 * GET /api/rate-limits/status
 * Returns current rate limit usage and quotas for authenticated user
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import { logger } from '../../utils/logger.js';
import { getRateLimitForTier } from '../../config/rate-limits.js';

const prisma = new PrismaClient();

/**
 * Get rate limit status for current user
 */
export async function getRateLimitStatus(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      }) as any;
    }

    const userId = req.user.id;

    // Get user's subscription tier
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        planTier: true,
        status: true,
      },
    });

    const tier = subscription?.planTier || 'FREE_TRIAL';
    const quotas = getRateLimitForTier(tier as any);

    // Get current usage
    const [apiHourly, apiDaily, aiDaily] = await Promise.all([
      rateLimiter.getUsageStats(`user:${userId}:hour`),
      rateLimiter.getUsageStats(`user:${userId}:minute`),
      rateLimiter.getUsageStats(`user:${userId}:ai:day`),
    ]);

    // Calculate reset times
    const now = new Date();
    const nextHour = new Date(Math.ceil(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000));
    const nextDay = new Date(now);
    nextDay.setHours(24, 0, 0, 0);

    // Check if user is banned
    const banStatus = await rateLimiter.isBanned(userId);

    // Get violation history
    const violations = await rateLimiter.getViolationHistory(userId, 10);

    res.json({
      success: true,
      data: {
        tier,
        quotas: {
          api: {
            hourly: {
              limit: quotas.apiCallsPerHour,
              used: apiHourly.hourly,
              remaining: Math.max(0, quotas.apiCallsPerHour - apiHourly.hourly),
              resetAt: nextHour.toISOString(),
              percentage: quotas.apiCallsPerHour > 0
                ? Math.round((apiHourly.hourly / quotas.apiCallsPerHour) * 100)
                : 0,
            },
            minute: {
              limit: quotas.apiCallsPerMinute,
              used: apiDaily.hourly, // Using hourly method with minute key
              remaining: Math.max(0, quotas.apiCallsPerMinute - apiDaily.hourly),
              resetAt: new Date(Math.ceil(now.getTime() / (60 * 1000)) * (60 * 1000)).toISOString(),
              percentage: quotas.apiCallsPerMinute > 0
                ? Math.round((apiDaily.hourly / quotas.apiCallsPerMinute) * 100)
                : 0,
            },
          },
          ai: {
            daily: {
              limit: quotas.aiRequestsPerDay,
              used: aiDaily.daily,
              remaining: Math.max(0, quotas.aiRequestsPerDay - aiDaily.daily),
              resetAt: nextDay.toISOString(),
              percentage: quotas.aiRequestsPerDay > 0
                ? Math.round((aiDaily.daily / quotas.aiRequestsPerDay) * 100)
                : 0,
            },
          },
        },
        status: {
          banned: banStatus.banned,
          bannedUntil: banStatus.until?.toISOString(),
        },
        violations: {
          recent: violations.length,
          history: violations.slice(0, 5).map((v) => ({
            timestamp: v.timestamp,
            endpoint: v.endpoint,
            limit: v.limit,
            attempted: v.attempted,
          })),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get rate limit status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status',
      message: error.message,
    });
  }
}
