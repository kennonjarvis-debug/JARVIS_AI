/**
 * DAWG AI OAuth Integration
 *
 * Implements OAuth 2.0 authorization flow for DAWG AI.
 *
 * @module integrations/dawg-ai-oauth
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { getDawgAIService } from '../services/dawg-ai.service.js';

const dawgAIService = getDawgAIService();

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

/**
 * Default OAuth configuration
 */
const DEFAULT_CONFIG: OAuthConfig = {
  clientId: process.env.DAWG_AI_CLIENT_ID || '',
  clientSecret: process.env.DAWG_AI_CLIENT_SECRET || '',
  redirectUri: process.env.DAWG_AI_REDIRECT_URI || 'http://localhost:3000/api/integrations/dawg-ai/callback',
  authorizationUrl: process.env.DAWG_AI_AUTH_URL || 'https://api.dawg-ai.com/oauth/authorize',
  tokenUrl: process.env.DAWG_AI_TOKEN_URL || 'https://api.dawg-ai.com/oauth/token',
  scopes: [
    'projects:read',
    'projects:write',
    'workflows:read',
    'workflows:write',
    'analytics:read',
  ],
};

/**
 * DAWG AI OAuth Service
 */
export class DawgAIOAuthService {
  private config: OAuthConfig;
  private stateStore: Map<string, { userId: string; timestamp: number }>;

  constructor(config?: Partial<OAuthConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stateStore = new Map();

    // Clean up expired states every 5 minutes
    setInterval(() => this.cleanupExpiredStates(), 5 * 60 * 1000);
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  generateAuthorizationUrl(userId: string): string {
    // Generate random state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with user ID and timestamp
    this.stateStore.set(state, {
      userId,
      timestamp: Date.now(),
    });

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });

    const url = `${this.config.authorizationUrl}?${params.toString()}`;
    logger.info('Generated OAuth authorization URL', { userId, state });

    return url;
  }

  /**
   * Verify state parameter and return user ID
   */
  verifyState(state: string): string | null {
    const stored = this.stateStore.get(state);

    if (!stored) {
      logger.warn('Invalid OAuth state parameter', { state });
      return null;
    }

    // Check if state is expired (15 minutes)
    const maxAge = 15 * 60 * 1000;
    if (Date.now() - stored.timestamp > maxAge) {
      logger.warn('Expired OAuth state parameter', { state });
      this.stateStore.delete(state);
      return null;
    }

    // Remove state after verification (one-time use)
    this.stateStore.delete(state);

    return stored.userId;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string;
  }> {
    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in || 3600,
        scope: data.scope || this.config.scopes.join(' '),
      };
    } catch (error: any) {
      logger.error('Failed to exchange OAuth code:', error);
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in || 3600,
      };
    } catch (error: any) {
      logger.error('Failed to refresh OAuth token:', error);
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.tokenUrl.replace('/token', '/revoke')}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(
              `${this.config.clientId}:${this.config.clientSecret}`
            ).toString('base64')}`,
          },
          body: new URLSearchParams({
            token,
            token_type_hint: 'access_token',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Token revocation failed');
      }

      logger.info('OAuth token revoked successfully');
    } catch (error: any) {
      logger.error('Failed to revoke OAuth token:', error);
      // Don't throw - revocation failure shouldn't block disconnection
    }
  }

  /**
   * Clean up expired state parameters
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes

    let cleanedCount = 0;
    for (const [state, data] of this.stateStore.entries()) {
      if (now - data.timestamp > maxAge) {
        this.stateStore.delete(state);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired OAuth states`);
    }
  }

  /**
   * Complete OAuth flow
   */
  async completeOAuthFlow(
    userId: string,
    code: string,
    state: string
  ): Promise<void> {
    // Verify state
    const verifiedUserId = this.verifyState(state);
    if (!verifiedUserId || verifiedUserId !== userId) {
      throw new Error('Invalid or expired OAuth state');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCode(code);

    // Store credentials
    await dawgAIService.storeCredentials(userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      scope: tokens.scope,
    });

    logger.info('OAuth flow completed successfully', { userId });
  }
}

/**
 * Singleton instance
 */
let oauthServiceInstance: DawgAIOAuthService | null = null;

/**
 * Get OAuth service instance
 */
export function getDawgAIOAuthService(config?: Partial<OAuthConfig>): DawgAIOAuthService {
  if (!oauthServiceInstance) {
    oauthServiceInstance = new DawgAIOAuthService(config);
  }
  return oauthServiceInstance;
}

export default DawgAIOAuthService;
