/**
 * Rate Limits API Routes
 *
 * Exports all rate limit API handlers
 */

import express, { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth-middleware.js';
import { getRateLimitStatus } from './status.js';
import { resetRateLimit, removeBan } from './reset.js';
import { getRateLimitHistory, getRateLimitStats } from './history.js';

const router: Router = express.Router();

// ============================================================================
// USER ENDPOINTS (require authentication)
// ============================================================================

/**
 * GET /api/rate-limits/status
 * Get current rate limit status and quotas
 */
router.get('/status', authenticate, getRateLimitStatus);

/**
 * GET /api/rate-limits/history
 * Get violation history
 */
router.get('/history', authenticate, getRateLimitHistory);

// ============================================================================
// ADMIN ENDPOINTS (require admin role)
// ============================================================================

/**
 * POST /api/rate-limits/reset
 * Reset rate limits for a user
 */
router.post('/reset', authenticate, requireAdmin, resetRateLimit);

/**
 * POST /api/rate-limits/remove-ban
 * Remove ban from a user
 */
router.post('/remove-ban', authenticate, requireAdmin, removeBan);

/**
 * GET /api/rate-limits/stats
 * Get aggregated rate limit statistics
 */
router.get('/stats', authenticate, requireAdmin, getRateLimitStats);

export default router;
