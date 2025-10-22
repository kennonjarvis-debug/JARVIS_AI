/**
 * Integration API Routes
 * Handles all integration-related endpoints
 */

import { Router, type Request, type Response } from 'express';
import { integrationManager } from '../services/IntegrationManager.js';
import { TwitterIntegration } from '../integrations/twitter/index.js';
import { Logger, JarvisError, ErrorCode } from '@jarvis/shared';
import { requireAuth } from '../middleware/auth.js';
import { getSupabaseClient } from '../lib/supabase.js';

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
router.get('/connected', requireAuth, async (req: Request, res: Response) => {
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
router.post('/twitter/connect', requireAuth, async (req: Request, res: Response) => {
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
router.post('/twitter/tweet', requireAuth, async (req: Request, res: Response) => {
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
router.get('/twitter/mentions', requireAuth, async (req: Request, res: Response) => {
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
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
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
router.get('/:id/health', requireAuth, async (req: Request, res: Response) => {
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

/**
 * GET /api/integrations/:integration_id/metrics
 * Get live metrics for an integration (currently supports Twitter)
 */
router.get('/:integration_id/metrics', requireAuth, async (req: Request, res: Response) => {
  try {
    const { integration_id } = req.params;

    logger.info('Fetching live metrics for integration', { integrationId: integration_id });

    // Fetch integration from database
    const supabase = getSupabaseClient();
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integration_id)
      .single();

    if (fetchError || !integration) {
      return res.status(404).json({
        error: 'Integration not found',
        message: 'The requested integration does not exist',
      });
    }

    // Currently only support Twitter metrics
    if (integration.platform !== 'twitter') {
      return res.status(400).json({
        error: 'Unsupported platform',
        message: `Live metrics are not yet available for ${integration.platform}`,
      });
    }

    // Load or get Twitter integration
    let twitterIntegration = integrationManager.getIntegration(
      integration.observatory_id,
      'twitter',
      integration.account_id
    );

    if (!twitterIntegration) {
      twitterIntegration = await integrationManager.loadIntegration(integration);
    }

    const twitter = twitterIntegration as TwitterIntegration;

    // Fetch profile metrics
    const profile = await twitter.getAuthenticatedUser();

    // Fetch recent tweets with engagement
    const recentTweets = await twitter.getRecentTweets(10);

    // Calculate engagement rate
    let totalEngagement = 0;
    let totalImpressions = 0;
    let tweetsWithImpressions = 0;

    for (const tweet of recentTweets) {
      const engagement =
        tweet.public_metrics.like_count +
        tweet.public_metrics.retweet_count +
        tweet.public_metrics.reply_count +
        tweet.public_metrics.quote_count;

      totalEngagement += engagement;
      totalImpressions += tweet.public_metrics.impression_count;

      if (tweet.public_metrics.impression_count > 0) {
        tweetsWithImpressions++;
      }
    }

    const engagementRate =
      totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(2) : '0.00';

    const averageEngagement = recentTweets.length > 0 ? Math.round(totalEngagement / recentTweets.length) : 0;

    const averageImpressions =
      tweetsWithImpressions > 0 ? Math.round(totalImpressions / tweetsWithImpressions) : 0;

    // Return comprehensive metrics
    res.json({
      integration_id: integration_id,
      platform: 'twitter',
      account: {
        id: profile.id,
        username: profile.username,
        name: profile.name,
        profile_image_url: profile.profile_image_url,
        description: profile.description,
        verified: profile.verified,
      },
      metrics: {
        followers_count: profile.public_metrics.followers_count,
        following_count: profile.public_metrics.following_count,
        tweet_count: profile.public_metrics.tweet_count,
        listed_count: profile.public_metrics.listed_count,
      },
      engagement: {
        engagement_rate: parseFloat(engagementRate),
        average_engagement_per_tweet: averageEngagement,
        average_impressions_per_tweet: averageImpressions,
        total_engagement_last_10_tweets: totalEngagement,
        total_impressions_last_10_tweets: totalImpressions,
      },
      recent_tweets: recentTweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
        created_at: tweet.created_at,
        metrics: {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          replies: tweet.public_metrics.reply_count,
          quotes: tweet.public_metrics.quote_count,
          impressions: tweet.public_metrics.impression_count,
          engagement_rate:
            tweet.public_metrics.impression_count > 0
              ? (
                  ((tweet.public_metrics.like_count +
                    tweet.public_metrics.retweet_count +
                    tweet.public_metrics.reply_count +
                    tweet.public_metrics.quote_count) /
                    tweet.public_metrics.impression_count) *
                  100
                ).toFixed(2)
              : '0.00',
        },
      })),
      fetched_at: new Date().toISOString(),
    });

    logger.info('Successfully fetched live metrics', {
      integrationId: integration_id,
      username: profile.username,
      followers: profile.public_metrics.followers_count,
      engagementRate,
    });
  } catch (error) {
    logger.error('Failed to fetch integration metrics', error);

    // Check if it's a Twitter API error (e.g., token expired)
    if (error instanceof Error && error.message.includes('401')) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Twitter access token may be expired. Please reconnect your account.',
        needs_reconnect: true,
      });
    }

    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
