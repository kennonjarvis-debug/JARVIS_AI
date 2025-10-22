/**
 * OAuth Connector
 * Base class for integrations using OAuth 2.0 authentication
 */

import { OAuth2Client } from 'google-auth-library';
import { BaseIntegration, type IntegrationConfig } from './BaseIntegration.js';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl?: string;
  tokenUrl?: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  expiry_date?: number;
}

/**
 * Base class for OAuth 2.0 integrations
 */
export abstract class OAuthConnector extends BaseIntegration {
  protected oauth2Client!: OAuth2Client;
  protected oauthConfig: OAuthConfig;
  protected tokens?: OAuthTokens;

  constructor(config: IntegrationConfig & { oauthConfig: OAuthConfig }) {
    super(config);
    this.oauthConfig = config.oauthConfig;
    this.tokens = config.credentials as OAuthTokens;
  }

  /**
   * Initialize OAuth client
   */
  async initialize(): Promise<void> {
    this.oauth2Client = new OAuth2Client(
      this.oauthConfig.clientId,
      this.oauthConfig.clientSecret,
      this.oauthConfig.redirectUri
    );

    // Set tokens if available
    if (this.tokens) {
      this.oauth2Client.setCredentials(this.tokens);
    }

    this.isInitialized = true;
    this.logger.info('OAuth client initialized');
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthUrl(state?: string): string {
    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized');
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: this.oauthConfig.scopes,
      state: state || this.integrationId,
      prompt: 'consent', // Force consent screen to get refresh token
    });

    this.logger.info('Generated auth URL', { state });
    return authUrl;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string): Promise<OAuthTokens> {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth client not initialized');
      }

      this.logger.info('Exchanging auth code for tokens');
      const { tokens } = await this.oauth2Client.getToken(code);

      // Set tokens in client
      this.oauth2Client.setCredentials(tokens);
      this.tokens = tokens as OAuthTokens;

      // Save tokens to database
      await this.updateCredentials(tokens);

      // Update status
      await this.updateStatus('connected');

      // Log activity
      await this.logActivity({
        activityType: 'integration',
        action: 'connected',
        title: `${this.displayName} connected`,
        description: 'OAuth authentication successful',
      });

      this.logger.info('OAuth tokens obtained and saved');
      return this.tokens;
    } catch (error) {
      this.logger.error('OAuth callback failed', error);
      await this.updateStatus('error', error instanceof Error ? error.message : 'OAuth failed');
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<OAuthTokens> {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth client not initialized');
      }

      if (!this.tokens?.refresh_token) {
        throw new Error('No refresh token available');
      }

      this.logger.info('Refreshing access token');
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      this.tokens = credentials as OAuthTokens;
      this.oauth2Client.setCredentials(this.tokens);

      // Save updated tokens
      await this.updateCredentials(this.tokens);

      this.logger.info('Access token refreshed successfully');
      return this.tokens;
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      await this.updateStatus('error', 'Token refresh failed');
      throw error;
    }
  }

  /**
   * Check if access token is expired or about to expire
   */
  protected isTokenExpired(): boolean {
    if (!this.tokens?.expiry_date) {
      return false; // Unknown, assume valid
    }

    // Refresh if expires within 5 minutes
    const bufferMs = 5 * 60 * 1000;
    return this.tokens.expiry_date < Date.now() + bufferMs;
  }

  /**
   * Ensure valid access token (refresh if needed)
   */
  protected async ensureValidToken(): Promise<void> {
    if (this.isTokenExpired()) {
      this.logger.info('Token expired, refreshing');
      await this.refreshAccessToken();
    }
  }

  /**
   * Test OAuth connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.oauth2Client || !this.tokens) {
        return false;
      }

      // Try to get token info to verify validity
      await this.ensureValidToken();

      // Call platform-specific test (implemented by subclass)
      return await this.testPlatformConnection();
    } catch (error) {
      this.logger.error('Connection test failed', error);
      return false;
    }
  }

  /**
   * Platform-specific connection test (must be implemented by subclass)
   */
  protected abstract testPlatformConnection(): Promise<boolean>;

  /**
   * Disconnect OAuth integration
   */
  async disconnect(): Promise<void> {
    try {
      this.logger.info('Disconnecting OAuth integration');

      // Revoke tokens if possible
      if (this.oauth2Client && this.tokens?.access_token) {
        try {
          await this.oauth2Client.revokeToken(this.tokens.access_token);
          this.logger.info('OAuth tokens revoked');
        } catch (error) {
          this.logger.warn('Failed to revoke tokens', error);
        }
      }

      // Clear tokens
      this.tokens = undefined;

      // Update status
      await this.updateStatus('disconnected');

      // Log activity
      await this.logActivity({
        activityType: 'integration',
        action: 'disconnected',
        title: `${this.displayName} disconnected`,
        description: 'OAuth connection removed',
      });

      this.isInitialized = false;
    } catch (error) {
      this.logger.error('Disconnect failed', error);
      throw error;
    }
  }
}
