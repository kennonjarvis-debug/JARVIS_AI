/**
 * Rate Limit History API
 *
 * GET /api/rate-limits/history
 * Returns violation history for authenticated user or specific user (admin)
 */

import { Request, Response } from 'express';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import { logger } from '../../utils/logger.js';

/**
 * Get rate limit violation history
 */
export async function getRateLimitHistory(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      }) as any;
    }

    // Allow admins to check other users' history
    const targetUserId = req.query.userId as string;
    const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);

    if (targetUserId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required to view other users\' history',
      }) as any;
    }

    const userId = targetUserId || req.user.id;
    const limit = parseInt(req.query.limit as string) || 100;

    // Get violation history
    const violations = await rateLimiter.getViolationHistory(userId, limit);

    // Check if user is currently banned
    const banStatus = await rateLimiter.isBanned(userId);

    // Group violations by endpoint
    const byEndpoint: Record<string, number> = {};
    violations.forEach((v) => {
      byEndpoint[v.endpoint] = (byEndpoint[v.endpoint] || 0) + 1;
    });

    // Group violations by day
    const byDay: Record<string, number> = {};
    violations.forEach((v) => {
      const day = v.timestamp.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        userId,
        violations: violations.map((v) => ({
          timestamp: v.timestamp,
          endpoint: v.endpoint,
          limit: v.limit,
          attempted: v.attempted,
        })),
        summary: {
          total: violations.length,
          byEndpoint,
          byDay,
          mostRecentViolation: violations[0]?.timestamp || null,
        },
        status: {
          banned: banStatus.banned,
          bannedUntil: banStatus.until?.toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get rate limit history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit history',
      message: error.message,
    });
  }
}

/**
 * Get aggregated rate limit statistics (admin only)
 */
export async function getRateLimitStats(req: Request, res: Response): Promise<void> {
  try {
    // Check admin authorization
    if (!req.user || !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      }) as any;
    }

    // This would aggregate stats across all users
    // For now, return a placeholder response
    // In production, you'd query Redis or a time-series database

    res.json({
      success: true,
      data: {
        message: 'Aggregated stats not yet implemented',
        // Future: Add metrics like:
        // - Total violations in last 24h
        // - Most violated endpoints
        // - Users with most violations
        // - Average usage by tier
        // - etc.
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get rate limit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit stats',
      message: error.message,
    });
  }
}
