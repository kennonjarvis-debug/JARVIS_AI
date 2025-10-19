/**
 * Integration API Routes
 * Handles all integration-related endpoints
 */

import { Router, type Request, type Response } from 'express';
import { integrationManager } from '../services/IntegrationManager.js';
import { TwitterIntegration } from '../integrations/twitter/index.js';
import { Logger, JarvisError, ErrorCode } from '@jarvis/shared';

const router = Router();
const logger = new Logger('IntegrationRoutes');

/**
 * GET /api/integrations
 * List all available integrations
 */
router.get('/', (_req: Request, res: Response) => {
  const available = [
    {
      platform: 'twitter',
      name: 'Twitter/X',
      description: 'Post tweets, monitor mentions, engage with followers',
      category: 'social',
      icon: '𝕏',
      status: 'available',
      requiresOAuth: false,
    },
    {
      platform: 'gmail',
      name: 'Gmail',
      description: 'Send/receive emails, auto-respond, organize inbox',
      category: 'email',
      icon: '📧',
      status: 'coming_soon',
      requiresOAuth: true,
    },
    {
      platform: 'hubspot',
      name: 'HubSpot CRM',
      description: 'Sync contacts, manage deals, track interactions',
      category: 'crm',
      icon: '🔶',
      status: 'coming_soon',
      requiresOAuth: true,
    },
  ];

  res.json({ integrations: available });
});

/**
 * GET /api/integrations/connected
 * Get all connected integrations for the authenticated user
 */
router.get('/connected', async (req: Request, res: Response) => {
  try {
    // TODO: Get observatoryId from authenticated user
    // For now, we'll use a placeholder
    const observatoryId = req.query.observatory_id as string;

    if (!observatoryId) {
      return res.status(400).json({
        error: 'Missing observatory_id parameter',
        message: 'Please provide observatory_id query parameter',
      });
    }

    const integrations = await integrationManager.loadIntegrationsForObservatory(observatoryId);

    const connected = await Promise.all(
      integrations.map(async (integration) => {
        const health = await integration.getHealth();
        return {
          platform: integration.name,
          displayName: integration.displayName,
          status: health.status,
          lastChecked: health.lastChecked,
        };
      })
    );

    res.json({ integrations: connected });
  } catch (error) {
    logger.error('Failed to get connected integrations', error);
    res.status(500).json({
      error: 'Failed to load integrations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/integrations/twitter/connect
 * Connect a Twitter account
 */
router.post('/twitter/connect', async (req: Request, res: Response) => {
  try {
    const { observatory_id, api_key, api_secret, access_token, access_token_secret, account_name } = req.body;

    if (!observatory_id || !api_key || !api_secret || !access_token || !access_token_secret) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide observatory_id, api_key, api_secret, access_token, and access_token_secret',
      });
    }

    logger.info('Connecting Twitter account', { observatory_id, account_name });

    // Create integration record in database
    const record = await integrationManager.createIntegration({
      observatoryId: observatory_id,
      platform: 'twitter',
      accountName: account_name || 'Twitter Account',
      credentials: {
        api_key,
        api_secret,
        access_token,
        access_token_secret,
      },
    });

    // Load and initialize the integration
    const integration = await integrationManager.loadIntegration(record);

    // Get user info to confirm connection
    const twitter = integration as TwitterIntegration;
    const userInfo = await twitter.getMe();

    res.json({
      success: true,
      integration: {
        id: record.id,
        platform: 'twitter',
        username: userInfo.username,
        name: userInfo.name,
        status: 'connected',
      },
    });
  } catch (error) {
    logger.error('Failed to connect Twitter', error);
    res.status(500).json({
      error: 'Failed to connect Twitter account',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/integrations/twitter/tweet
 * Post a tweet
 */
router.post('/twitter/tweet', async (req: Request, res: Response) => {
  try {
    const { observatory_id, text, media_path, media_type } = req.body;

    if (!observatory_id || !text) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide observatory_id and text',
      });
    }

    logger.info('Posting tweet', { observatory_id, textLength: text.length });

    // Get Twitter integration
    const integration = integrationManager.getIntegration(observatory_id, 'twitter');

    if (!integration) {
      return res.status(404).json({
        error: 'Twitter not connected',
        message: 'Please connect a Twitter account first',
      });
    }

    // Post tweet
    const twitter = integration as TwitterIntegration;
    const result = await twitter.postTweet({
      text,
      mediaPath: media_path,
      mediaType: media_type,
    });

    res.json({
      success: true,
      tweet: result,
    });
  } catch (error) {
    logger.error('Failed to post tweet', error);
    res.status(500).json({
      error: 'Failed to post tweet',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/integrations/twitter/mentions
 * Get Twitter mentions
 */
router.get('/twitter/mentions', async (req: Request, res: Response) => {
  try {
    const observatoryId = req.query.observatory_id as string;
    const maxResults = parseInt(req.query.max_results as string) || 10;

    if (!observatoryId) {
      return res.status(400).json({
        error: 'Missing observatory_id parameter',
      });
    }

    // Get Twitter integration
    const integration = integrationManager.getIntegration(observatoryId, 'twitter');

    if (!integration) {
      return res.status(404).json({
        error: 'Twitter not connected',
      });
    }

    const twitter = integration as TwitterIntegration;
    const mentions = await twitter.getMentions(maxResults);

    res.json({
      mentions,
      count: mentions.length,
    });
  } catch (error) {
    logger.error('Failed to get mentions', error);
    res.status(500).json({
      error: 'Failed to get mentions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/integrations/:id
 * Disconnect an integration
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logger.info('Disconnecting integration', { integrationId: id });

    await integrationManager.deleteIntegration(id);

    res.json({
      success: true,
      message: 'Integration disconnected successfully',
    });
  } catch (error) {
    logger.error('Failed to disconnect integration', error);
    res.status(500).json({
      error: 'Failed to disconnect integration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/integrations/:id/health
 * Check integration health
 */
router.get('/:id/health', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // TODO: Get integration by ID
    // For now, this is a placeholder

    res.json({
      status: 'healthy',
      message: 'Health check endpoint coming soon',
    });
  } catch (error) {
    logger.error('Failed to check health', error);
    res.status(500).json({
      error: 'Failed to check health',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/integrations/stats
 * Get integration statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = integrationManager.getStatistics();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get stats', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
