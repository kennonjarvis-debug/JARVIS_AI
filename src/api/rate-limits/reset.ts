/**
 * Rate Limit Reset API
 *
 * POST /api/rate-limits/reset
 * Admin endpoint to reset rate limits for a user
 */

import { Request, Response } from 'express';
import { resetUserRateLimits } from '../../middleware/subscription-rate-limits.js';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import { logger } from '../../utils/logger.js';

/**
 * Reset rate limits for a user (admin only)
 */
export async function resetRateLimit(req: Request, res: Response): Promise<void> {
  try {
    // Check admin authorization
    if (!req.user || !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      }) as any;
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId',
      }) as any;
    }

    // Reset all rate limits for user
    await resetUserRateLimits(userId);

    // Also remove any ban
    await rateLimiter.removeBan(userId);

    logger.info(`Rate limits reset for user ${userId} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: `Rate limits reset for user: ${userId}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to reset rate limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset rate limits',
      message: error.message,
    });
  }
}

/**
 * Remove ban from user (admin only)
 */
export async function removeBan(req: Request, res: Response): Promise<void> {
  try {
    // Check admin authorization
    if (!req.user || !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      }) as any;
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId',
      }) as any;
    }

    await rateLimiter.removeBan(userId);

    logger.info(`Ban removed for user ${userId} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: `Ban removed for user: ${userId}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to remove ban:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove ban',
      message: error.message,
    });
  }
}
