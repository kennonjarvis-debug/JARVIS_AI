/**
 * OAuth Authentication Routes
 * Handles OAuth flows for Twitter, LinkedIn, Meta, etc.
 */

import { Router, type Request, type Response } from 'express';
import { TwitterApi } from 'twitter-api-v2';
import { Logger } from '@jarvis/shared';
import { integrationManager } from '../services/IntegrationManager.js';

const router = Router();
const logger = new Logger('AuthRoutes');

// In-memory store for OAuth state (in production, use Redis or database)
const oauthStates = new Map<string, { codeVerifier: string; userId?: string; observatoryId?: string }>();

/**
 * GET /api/auth/twitter
 * Initiate Twitter OAuth 2.0 flow
 */
router.get('/twitter', async (req: Request, res: Response) => {
  try {
    const { observatory_id } = req.query;

    if (!observatory_id) {
      return res.status(400).json({
        error: 'Missing observatory_id parameter',
      });
    }

    const clientId = process.env.TWITTER_OAUTH_CLIENT_ID;
    const callbackURL = process.env.NODE_ENV === 'production'
      ? 'https://jarvis-ai.co/api/auth/twitter/callback'
      : 'http://localhost:3001/api/auth/twitter/callback';

    if (!clientId) {
      throw new Error('TWITTER_OAUTH_CLIENT_ID not configured');
    }

    logger.info('Initiating Twitter OAuth flow', { observatory_id });

    const client = new TwitterApi({ clientId });

    // Generate OAuth 2.0 authorization link
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackURL, {
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    });

    // Store state and code verifier
    oauthStates.set(state, {
      codeVerifier,
      observatoryId: observatory_id as string,
    });

    // Clean up old states (older than 10 minutes)
    setTimeout(() => oauthStates.delete(state), 10 * 60 * 1000);

    // Redirect user to Twitter authorization page
    res.redirect(url);
  } catch (error) {
    logger.error('Failed to initiate Twitter OAuth', error);
    res.status(500).json({
      error: 'Failed to start Twitter authorization',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/auth/twitter/callback
 * Twitter OAuth 2.0 callback
 */
router.get('/twitter/callback', async (req: Request, res: Response) => {
  try {
    const { state, code } = req.query;

    if (!state || !code) {
      return res.status(400).send('Missing OAuth parameters');
    }

    // Retrieve stored OAuth state
    const storedState = oauthStates.get(state as string);

    if (!storedState) {
      return res.status(400).send('Invalid or expired OAuth state');
    }

    const { codeVerifier, observatoryId } = storedState;
    oauthStates.delete(state as string);

    const clientId = process.env.TWITTER_OAUTH_CLIENT_ID;
    const clientSecret = process.env.TWITTER_OAUTH_CLIENT_SECRET;
    const callbackURL = process.env.NODE_ENV === 'production'
      ? 'https://jarvis-ai.co/api/auth/twitter/callback'
      : 'http://localhost:3001/api/auth/twitter/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Twitter OAuth credentials not configured');
    }

    logger.info('Processing Twitter OAuth callback', { observatory_id: observatoryId });

    const client = new TwitterApi({ clientId, clientSecret });

    // Exchange code for access token
    const { client: loggedClient, accessToken, refreshToken } = await client.loginWithOAuth2({
      code: code as string,
      codeVerifier,
      redirectUri: callbackURL,
    });

    // Get user info
    const { data: userInfo } = await loggedClient.v2.me({
      'user.fields': ['profile_image_url', 'description'],
    });

    logger.info('Twitter OAuth successful', {
      username: userInfo.username,
      observatory_id: observatoryId,
    });

    // Create integration record in database
    const record = await integrationManager.createIntegration({
      observatoryId: observatoryId!,
      platform: 'twitter',
      accountName: `@${userInfo.username}`,
      credentials: {
        access_token: accessToken,
        refresh_token: refreshToken,
        oauth_version: '2.0',
      },
      metadata: {
        user_id: userInfo.id,
        username: userInfo.username,
        name: userInfo.name,
        profile_image_url: userInfo.profile_image_url,
      },
    });

    logger.info('Twitter integration created', { integration_id: record.id });

    // Redirect to success page
    const frontendURL = process.env.NODE_ENV === 'production'
      ? 'https://jarvis-ai.co'
      : 'http://localhost:5173';

    res.redirect(`${frontendURL}/dashboard?twitter_connected=true`);
  } catch (error) {
    logger.error('Twitter OAuth callback failed', error);

    const frontendURL = process.env.NODE_ENV === 'production'
      ? 'https://jarvis-ai.co'
      : 'http://localhost:5173';

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.redirect(`${frontendURL}/dashboard?twitter_error=${encodeURIComponent(errorMessage)}`);
  }
});

/**
 * POST /api/auth/twitter/refresh
 * Refresh Twitter OAuth 2.0 access token
 */
router.post('/twitter/refresh', async (req: Request, res: Response) => {
  try {
    const { integration_id, refresh_token } = req.body;

    if (!integration_id || !refresh_token) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    const clientId = process.env.TWITTER_OAUTH_CLIENT_ID;
    const clientSecret = process.env.TWITTER_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Twitter OAuth credentials not configured');
    }

    const client = new TwitterApi({ clientId, clientSecret });

    // Refresh the access token
    const { client: refreshedClient, accessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token(refresh_token);

    // Update integration in database
    await integrationManager.updateIntegration(integration_id, {
      credentials: {
        access_token: accessToken,
        refresh_token: newRefreshToken || refresh_token,
        oauth_version: '2.0',
      },
    });

    logger.info('Twitter token refreshed', { integration_id });

    res.json({
      success: true,
      message: 'Access token refreshed successfully',
    });
  } catch (error) {
    logger.error('Failed to refresh Twitter token', error);
    res.status(500).json({
      error: 'Failed to refresh access token',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
