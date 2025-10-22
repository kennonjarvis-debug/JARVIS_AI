/**
 * DAWG AI API Router
 *
 * Main router for all DAWG AI endpoints.
 *
 * @module api/dawg-ai
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger.js';
import { getDawgAIService } from '../../services/dawg-ai.service.js';
import projectsRouter from './projects.js';
import workflowsRouter from './workflows.js';
import analyticsRouter from './analytics.js';

const router = Router();
const dawgAIService = getDawgAIService();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * GET /api/dawg-ai/status
 * Get connection status
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = await dawgAIService.getConnectionStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Failed to get connection status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/dawg-ai/connect
 * Store OAuth credentials after authentication
 */
router.post('/connect', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { accessToken, refreshToken, expiresIn, scope } = req.body;

    if (!accessToken || !refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token and refresh token are required',
      });
    }

    await dawgAIService.storeCredentials(userId, {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + (expiresIn || 3600) * 1000),
      scope: scope || '',
    });

    res.json({
      success: true,
      message: 'DAWG AI connected successfully',
    });
  } catch (error: any) {
    logger.error('Failed to connect DAWG AI:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/dawg-ai/disconnect
 * Disconnect DAWG AI account
 */
router.post('/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await dawgAIService.disconnect(userId);

    res.json({
      success: true,
      message: 'DAWG AI disconnected successfully',
    });
  } catch (error: any) {
    logger.error('Failed to disconnect DAWG AI:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/dawg-ai/sync
 * Sync user data from DAWG AI
 */
router.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await dawgAIService.syncUserData(userId);

    res.json({
      success: true,
      message: 'Data synced successfully',
    });
  } catch (error: any) {
    logger.error('Failed to sync DAWG AI data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Mount sub-routers
 */
router.use('/projects', projectsRouter);
router.use('/workflows', workflowsRouter);
router.use('/analytics', analyticsRouter);

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'DAWG AI Integration',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

export default router;
