/**
 * Social Listening Routes
 * Handles social listening engine control and configuration
 */

import { Router, type Request, type Response } from 'express';
import { Logger } from '@jarvis/shared';
import { requireAuth } from '../middleware/auth.js';
import { SocialListeningEngine } from '../services/social/SocialListeningEngine.js';

const router = Router();
const logger = new Logger('SocialListeningRoutes');

// Map to store active listening engines per observatory
const activeEngines = new Map<string, SocialListeningEngine>();

/**
 * POST /api/social-listening/start
 * Start social listening for an observatory
 */
router.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const { observatory_id, config } = req.body;

    if (!observatory_id) {
      return res.status(400).json({
        error: 'Missing observatory_id parameter',
      });
    }

    // Check if already listening
    if (activeEngines.has(observatory_id)) {
      return res.status(400).json({
        error: 'Social listening already active for this observatory',
        status: 'running',
      });
    }

    // Default config if not provided
    const listenerConfig = config || {
      platforms: ['twitter'], // Start with Twitter only
      keywords: [],
      autoReplyEnabled: false,
      confidenceThreshold: 80,
      filters: {
        minFollowers: 0,
        languages: ['en'],
      },
    };

    // Create and initialize engine
    const engine = new SocialListeningEngine(observatory_id, listenerConfig);

    // Set up event handlers
    engine.on('match', (match) => {
      logger.info('Keyword match found', { observatoryId: observatory_id, match });
    });

    engine.on('agent_triggered', (trigger) => {
      logger.info('Agent workflow triggered', { observatoryId: observatory_id, trigger });
    });

    engine.on('auto_reply', (reply) => {
      logger.info('Auto-reply sent', { observatoryId: observatory_id, reply });
    });

    engine.on('error', (error) => {
      logger.error('Social listening error', { observatoryId: observatory_id, error });
    });

    // Initialize and start listening
    await engine.initialize();
    await engine.startListening();

    activeEngines.set(observatory_id, engine);

    logger.info('Social listening started', { observatory_id });

    res.json({
      success: true,
      message: 'Social listening started',
      config: listenerConfig,
    });
  } catch (error) {
    logger.error('Failed to start social listening', error);
    res.status(500).json({
      error: 'Failed to start social listening',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/social-listening/stop
 * Stop social listening for an observatory
 */
router.post('/stop', requireAuth, async (req: Request, res: Response) => {
  try {
    const { observatory_id } = req.body;

    if (!observatory_id) {
      return res.status(400).json({
        error: 'Missing observatory_id parameter',
      });
    }

    const engine = activeEngines.get(observatory_id);

    if (!engine) {
      return res.status(404).json({
        error: 'No active social listening for this observatory',
      });
    }

    await engine.stopListening();
    activeEngines.delete(observatory_id);

    logger.info('Social listening stopped', { observatory_id });

    res.json({
      success: true,
      message: 'Social listening stopped',
    });
  } catch (error) {
    logger.error('Failed to stop social listening', error);
    res.status(500).json({
      error: 'Failed to stop social listening',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/social-listening/status
 * Get status of social listening for an observatory
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { observatory_id } = req.query;

    if (!observatory_id) {
      return res.status(400).json({
        error: 'Missing observatory_id parameter',
      });
    }

    const engine = activeEngines.get(observatory_id as string);

    if (!engine) {
      return res.json({
        status: 'stopped',
        active: false,
      });
    }

    const stats = engine.getStats();

    res.json({
      status: 'running',
      active: true,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get social listening status', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/social-listening/config
 * Update social listening configuration
 */
router.put('/config', requireAuth, async (req: Request, res: Response) => {
  try {
    const { observatory_id, config } = req.body;

    if (!observatory_id || !config) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    const engine = activeEngines.get(observatory_id);

    if (!engine) {
      return res.status(404).json({
        error: 'No active social listening for this observatory',
      });
    }

    await engine.updateConfig(config);

    logger.info('Social listening config updated', { observatory_id });

    res.json({
      success: true,
      message: 'Configuration updated',
      config,
    });
  } catch (error) {
    logger.error('Failed to update social listening config', error);
    res.status(500).json({
      error: 'Failed to update configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/social-listening/approve-response
 * Approve a pending agent response
 */
router.post('/approve-response', requireAuth, async (req: Request, res: Response) => {
  try {
    const { approval_id, approved } = req.body;

    if (!approval_id || approved === undefined) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    // This would typically be handled by the engine, but for simplicity
    // we'll just log it here. In a real implementation, you'd update the
    // approval request in the database and trigger the appropriate action.

    logger.info('Agent response approval', { approval_id, approved });

    res.json({
      success: true,
      message: approved ? 'Response approved' : 'Response rejected',
    });
  } catch (error) {
    logger.error('Failed to process approval', error);
    res.status(500).json({
      error: 'Failed to process approval',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
