/**
 * Twitter Platform Implementation
 * Uses Twitter API v2 with OAuth 2.0
 */

import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import { BaseSocialPlatform, PlatformConfig } from './BaseSocialPlatform';
import type { SocialPost, PlatformMetrics, PostRequest, PostResult } from './types';

export class TwitterPlatform extends BaseSocialPlatform {
  private client: TwitterApi;

  constructor(config: PlatformConfig) {
    super(config, 'twitter');
    this.client = new TwitterApi(config.credentials.accessToken);
  }

  // ========================================================================
  // STREAMING & LISTENING
  // ========================================================================

  async *streamKeywords(keywords: string[]): AsyncIterableIterator<SocialPost> {
    // Twitter API v2 Filtered Stream
    const rules = keywords.map((keyword) => ({
      value: keyword,
      tag: `keyword_${keyword.replace(/\s+/g, '_')}`,
    }));

    // Set up stream rules
    const existingRules = await this.client.v2.streamRules();
    if (existingRules.data?.length) {
      await this.client.v2.updateStreamRules({
        delete: { ids: existingRules.data.map((rule) => rule.id) },
      });
    }

    await this.client.v2.updateStreamRules({
      add: rules,
    });

    // Start streaming
    const stream = await this.client.v2.searchStream({
      'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'conversation_id', 'in_reply_to_user_id'],
      'user.fields': ['username', 'name', 'profile_image_url', 'verified'],
      expansions: ['author_id'],
    });

    for await (const data of stream) {
      if (data.data) {
        const tweet = data.data;
        const author = data.includes?.users?.[0];

        if (author) {
          yield this.convertToSocialPost(tweet, author);
        }
      }
    }
  }

  // ========================================================================
  // POSTING & ENGAGEMENT
  // ========================================================================

  async createPost(request: PostRequest): Promise<PostResult> {
    try {
      const { data: tweet } = await this.client.v2.tweet({
        text: request.text,
        // Twitter API v2 media upload would go here
      });

      await this.logActivity({
        type: 'post',
        postId: tweet.id,
        content: request.text,
      });

      return {
        id: tweet.id,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        createdAt: new Date(),
        platform: 'twitter',
      };
    } catch (error) {
      console.error('Twitter post failed:', error);
      throw new Error(`Failed to create Twitter post: ${(error as Error).message}`);
    }
  }

  async replyToPost(postId: string, content: string): Promise<PostResult> {
    try {
      const { data: tweet } = await this.client.v2.tweet({
        text: content,
        reply: { in_reply_to_tweet_id: postId },
      });

      await this.logActivity({
        type: 'reply',
        postId: tweet.id,
        content,
        metadata: { originalPostId: postId },
      });

      return {
        id: tweet.id,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        createdAt: new Date(),
        platform: 'twitter',
      };
    } catch (error) {
      console.error('Twitter reply failed:', error);
      throw new Error(`Failed to reply to Twitter post: ${(error as Error).message}`);
    }
  }

  async sendDirectMessage(userId: string, message: string): Promise<{ id: string }> {
    try {
      const result = await this.client.v1.sendDm({
        recipient_id: userId,
        text: message,
      });

      await this.logActivity({
        type: 'dm',
        content: message,
        metadata: { recipientId: userId },
      });

      return { id: result.id_str };
    } catch (error) {
      console.error('Twitter DM failed:', error);
      throw new Error(`Failed to send Twitter DM: ${(error as Error).message}`);
    }
  }

  async likePost(postId: string): Promise<void> {
    try {
      // Get authenticated user's ID
      const me = await this.client.v2.me();
      await this.client.v2.like(me.data.id, postId);

      await this.logActivity({
        type: 'like',
        postId,
      });
    } catch (error) {
      console.error('Twitter like failed:', error);
      throw new Error(`Failed to like Twitter post: ${(error as Error).message}`);
    }
  }

  // ========================================================================
  // SEARCH & DISCOVERY
  // ========================================================================

  async searchPosts(query: string, limit: number = 10): Promise<SocialPost[]> {
    try {
      const { data: tweets, includes } = await this.client.v2.search(query, {
        max_results: limit,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'conversation_id'],
        'user.fields': ['username', 'name', 'profile_image_url', 'verified'],
        expansions: ['author_id'],
      });

      const users = includes?.users || [];
      const userMap = new Map(users.map((u) => [u.id, u]));

      return tweets.map((tweet) => {
        const author = userMap.get(tweet.author_id || '');
        if (!author) {
          throw new Error(`Author not found for tweet ${tweet.id}`);
        }
        return this.convertToSocialPost(tweet, author);
      });
    } catch (error) {
      console.error('Twitter search failed:', error);
      throw new Error(`Failed to search Twitter: ${(error as Error).message}`);
    }
  }

  async getUserProfile(userId: string): Promise<any> {
    try {
      const { data: user } = await this.client.v2.user(userId, {
        'user.fields': ['created_at', 'description', 'public_metrics', 'verified'],
      });

      return {
        id: user.id,
        username: user.username,
        displayName: user.name,
        bio: user.description,
        verified: user.verified || false,
        followers: user.public_metrics?.followers_count || 0,
        following: user.public_metrics?.following_count || 0,
        tweets: user.public_metrics?.tweet_count || 0,
        createdAt: user.created_at,
      };
    } catch (error) {
      console.error('Twitter user fetch failed:', error);
      throw new Error(`Failed to fetch Twitter user: ${(error as Error).message}`);
    }
  }

  // ========================================================================
  // METRICS
  // ========================================================================

  async getMetrics(): Promise<PlatformMetrics> {
    try {
      const me = await this.client.v2.me({
        'user.fields': ['public_metrics'],
      });

      const metrics = me.data.public_metrics!;

      return {
        followers: metrics.followers_count,
        following: metrics.following_count,
        posts: metrics.tweet_count,
        engagement: {
          rate: 0, // Would calculate from recent tweets
          totalInteractions: 0,
        },
      };
    } catch (error) {
      console.error('Twitter metrics fetch failed:', error);
      throw new Error(`Failed to fetch Twitter metrics: ${(error as Error).message}`);
    }
  }

  // ========================================================================
  // TOKEN REFRESH
  // ========================================================================

  protected async performTokenRefresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
  }> {
    try {
      const clientId = process.env.TWITTER_OAUTH_CLIENT_ID!;
      const clientSecret = process.env.TWITTER_OAUTH_CLIENT_SECRET!;

      const client = new TwitterApi({
        clientId,
        clientSecret,
      });

      const {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      } = await client.refreshOAuth2Token(refreshToken);

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt,
      };
    } catch (error) {
      console.error('Twitter token refresh failed:', error);
      throw new Error(`Failed to refresh Twitter token: ${(error as Error).message}`);
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  private convertToSocialPost(tweet: TweetV2, author: UserV2): SocialPost {
    return {
      id: tweet.id,
      platform: 'twitter',
      author: {
        id: author.id,
        username: author.username,
        displayName: author.name,
        profileImage: author.profile_image_url,
        verified: author.verified || false,
      },
      content: {
        text: tweet.text,
        media: [],
        urls: [],
        hashtags: [],
        mentions: [],
      },
      metrics: {
        likes: tweet.public_metrics?.like_count || 0,
        shares: tweet.public_metrics?.retweet_count || 0,
        comments: tweet.public_metrics?.reply_count || 0,
        views: tweet.public_metrics?.impression_count,
      },
      timestamp: tweet.created_at ? new Date(tweet.created_at) : new Date(),
      conversationId: tweet.conversation_id,
      inReplyToId: tweet.in_reply_to_user_id,
      raw: tweet,
    };
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser(): Promise<UserV2> {
    const me = await this.client.v2.me({
      'user.fields': ['username', 'name', 'profile_image_url', 'verified', 'public_metrics'],
    });
    return me.data;
  }
}
