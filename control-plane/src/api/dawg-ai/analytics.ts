/**
 * DAWG AI Analytics API
 *
 * API endpoints for analytics, insights, and usage metrics.
 *
 * @module api/dawg-ai/analytics
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger.js';
import DawgAIAnalyticsService from '../../services/dawg-ai-analytics.service.js';

const router = Router();
const analyticsService = new DawgAIAnalyticsService();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * GET /api/dawg-ai/analytics
 * Get analytics data for time range
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const start = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const end = req.query.end ? new Date(req.query.end as string) : new Date();

    const analytics = await analyticsService.getAnalytics(userId, { start, end });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    logger.error('Failed to get analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/analytics/usage
 * Get usage metrics
 */
router.get('/usage', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const period = (req.query.period as 'day' | 'week' | 'month') || 'month';
    const metrics = await analyticsService.getUsageMetrics(userId, period);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error('Failed to get usage metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/analytics/projects/:projectId
 * Get project insights
 */
router.get('/projects/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const insights = await analyticsService.getProjectInsights(userId, req.params.projectId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    logger.error('Failed to get project insights:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/analytics/workflows/popular
 * Get popular workflows
 */
router.get('/workflows/popular', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const workflows = await analyticsService.getPopularWorkflows(userId, limit);

    res.json({
      success: true,
      data: workflows,
    });
  } catch (error: any) {
    logger.error('Failed to get popular workflows:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/analytics/health
 * Get system health metrics
 */
router.get('/health', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const health = await analyticsService.getSystemHealth(userId);

    res.json({
      success: true,
      data: health,
    });
  } catch (error: any) {
    logger.error('Failed to get system health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/analytics/export
 * Export analytics data
 */
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const start = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const end = req.query.end ? new Date(req.query.end as string) : new Date();

    const data = await analyticsService.exportAnalytics(userId, { start, end });

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error('Failed to export analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
