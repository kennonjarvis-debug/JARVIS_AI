/**
 * Twitter Integration
 * Supports posting to Twitter with multi-account capability
 * Ported and adapted from Jarvis-v0
 */

import { TwitterApi, type TweetV2PostTweetResult } from 'twitter-api-v2';
import { promises as fs } from 'fs';
import { BaseIntegration, type IntegrationConfig } from '../base/index.js';
import { JarvisError, ErrorCode } from '@jarvis/shared';

export interface TwitterCredentials {
  api_key: string;
  api_secret: string;
  access_token: string;
  access_token_secret: string;
}

export interface TwitterPostParams {
  text: string;
  mediaPath?: string;
  mediaType?: 'image' | 'video';
}

export interface TwitterPostResult {
  tweetId: string;
  url: string;
  username: string;
}

/**
 * Twitter integration for autonomous posting
 */
export class TwitterIntegration extends BaseIntegration {
  private client!: TwitterApi;
  private rwClient!: TwitterApi;
  private username?: string;

  get name(): string {
    return 'twitter';
  }

  get displayName(): string {
    return 'Twitter/X';
  }

  /**
   * Initialize Twitter client
   */
  async initialize(): Promise<void> {
    try {
      const creds = this.credentials as TwitterCredentials;

      // Validate credentials
      if (!creds.api_key || !creds.api_secret || !creds.access_token || !creds.access_token_secret) {
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          'Twitter credentials incomplete',
          { hasApiKey: !!creds.api_key, hasApiSecret: !!creds.api_secret }
        );
      }

      // Initialize Twitter API client
      this.client = new TwitterApi({
        appKey: creds.api_key,
        appSecret: creds.api_secret,
        accessToken: creds.access_token,
        accessSecret: creds.access_token_secret,
      });

      this.rwClient = this.client.readWrite;

      // Get authenticated user info
      const me = await this.client.v2.me();
      this.username = me.data.username;

      this.isInitialized = true;
      this.logger.info('Twitter client initialized', { username: this.username });

      await this.updateStatus('connected');
    } catch (error) {
      this.logger.error('Failed to initialize Twitter client', error);
      await this.updateStatus('error', error instanceof Error ? error.message : 'Initialization failed');
      throw error;
    }
  }

  /**
   * Test Twitter connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      // Try to get user info
      await this.client.v2.me();
      return true;
    } catch (error) {
      this.logger.error('Twitter connection test failed', error);
      return false;
    }
  }

  /**
   * Disconnect Twitter integration
   */
  async disconnect(): Promise<void> {
    try {
      this.isInitialized = false;
      this.username = undefined;

      await this.updateStatus('disconnected');

      await this.logActivity({
        activityType: 'integration',
        action: 'disconnected',
        title: 'Twitter disconnected',
        description: `Disconnected Twitter account @${this.username}`,
      });

      this.logger.info('Twitter integration disconnected');
    } catch (error) {
      this.logger.error('Failed to disconnect Twitter', error);
      throw error;
    }
  }

  /**
   * Post a tweet with optional media
   */
  async postTweet(params: TwitterPostParams): Promise<TwitterPostResult> {
    try {
      if (!this.isInitialized) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Twitter client not initialized'
        );
      }

      this.logger.info('Posting tweet', {
        username: this.username,
        textLength: params.text.length,
        hasMedia: !!params.mediaPath,
      });

      let mediaId: string | undefined;

      // Upload media if provided
      if (params.mediaPath) {
        mediaId = await this.uploadMedia(params.mediaPath, params.mediaType || 'image');
      }

      // Create tweet
      const tweetData: any = {
        text: params.text,
      };

      if (mediaId) {
        tweetData.media = {
          media_ids: [mediaId],
        };
      }

      const result: TweetV2PostTweetResult = await this.rwClient.v2.tweet(tweetData);
      const tweetId = result.data.id;
      const tweetUrl = `https://twitter.com/${this.username}/status/${tweetId}`;

      // Log to database
      await this.logActivity({
        activityType: 'post',
        action: 'created',
        title: 'Posted tweet',
        description: params.text.slice(0, 100) + (params.text.length > 100 ? '...' : ''),
        metadata: {
          tweetId,
          url: tweetUrl,
          username: this.username,
          hasMedia: !!mediaId,
          textLength: params.text.length,
        },
        status: 'success',
      });

      // Save to social_posts table
      await this.saveSocialPost({
        platform: 'twitter',
        externalId: tweetId,
        content: params.text,
        mediaUrls: params.mediaPath ? [params.mediaPath] : [],
        publishedAt: new Date(),
        status: 'published',
      });

      this.logger.info('Tweet posted successfully', {
        tweetId,
        url: tweetUrl,
        username: this.username,
      });

      return {
        tweetId,
        url: tweetUrl,
        username: this.username!,
      };
    } catch (error) {
      this.logger.error('Failed to post tweet', error);

      // Log failure
      await this.logActivity({
        activityType: 'post',
        action: 'created',
        title: 'Failed to post tweet',
        description: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          text: params.text.slice(0, 100),
        },
        status: 'failed',
      });

      throw new JarvisError(
        ErrorCode.API_ERROR,
        'Failed to post tweet',
        { error: error instanceof Error ? error.message : error }
      );
    }
  }

  /**
   * Upload media (image or video) to Twitter
   */
  private async uploadMedia(mediaPath: string, mediaType: 'image' | 'video'): Promise<string> {
    try {
      this.logger.info('Uploading media to Twitter', { mediaPath, mediaType });

      // Read file as buffer
      const fileBuffer = await fs.readFile(mediaPath);

      // Upload using twitter-api-v2's built-in media upload
      const mediaId = await this.client.v1.uploadMedia(fileBuffer, {
        mimeType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
      });

      this.logger.info('Media uploaded successfully', { mediaId, mediaType });
      return mediaId;
    } catch (error) {
      this.logger.error('Failed to upload media', error);
      throw new JarvisError(
        ErrorCode.API_ERROR,
        'Failed to upload media to Twitter',
        { mediaPath, mediaType, error: error instanceof Error ? error.message : error }
      );
    }
  }

  /**
   * Get mentions (tweets mentioning the authenticated user)
   */
  async getMentions(maxResults: number = 10): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Twitter client not initialized'
        );
      }

      // Get authenticated user ID
      const me = await this.client.v2.me();
      const userId = me.data.id;

      // Get mentions
      const mentions = await this.client.v2.userMentionTimeline(userId, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'author_id', 'conversation_id'],
      });

      this.logger.info('Retrieved mentions', { count: mentions.data.data?.length || 0 });

      return mentions.data.data || [];
    } catch (error) {
      this.logger.error('Failed to get mentions', error);
      throw new JarvisError(
        ErrorCode.API_ERROR,
        'Failed to get Twitter mentions',
        { error: error instanceof Error ? error.message : error }
      );
    }
  }

  /**
   * Get user info for the authenticated account
   */
  async getMe(): Promise<{ id: string; username: string; name: string }> {
    try {
      if (!this.isInitialized) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Twitter client not initialized'
        );
      }

      const me = await this.client.v2.me();

      return {
        id: me.data.id,
        username: me.data.username,
        name: me.data.name,
      };
    } catch (error) {
      this.logger.error('Failed to get user info', error);
      throw new JarvisError(
        ErrorCode.API_ERROR,
        'Failed to get Twitter user info',
        { error: error instanceof Error ? error.message : error }
      );
    }
  }

  /**
   * Save social post to database
   */
  private async saveSocialPost(params: {
    platform: string;
    externalId: string;
    content: string;
    mediaUrls: string[];
    publishedAt: Date;
    status: string;
  }): Promise<void> {
    try {
      const { error } = await this.supabase.from('social_posts').insert({
        observatory_id: this.observatoryId,
        integration_id: this.integrationId,
        platform: params.platform,
        external_id: params.externalId,
        content: params.content,
        media_urls: params.mediaUrls,
        published_at: params.publishedAt.toISOString(),
        status: params.status,
        engagement: {},
      });

      if (error) {
        this.logger.error('Failed to save social post to database', error);
      }
    } catch (error) {
      this.logger.error('Failed to save social post', error);
    }
  }
}
