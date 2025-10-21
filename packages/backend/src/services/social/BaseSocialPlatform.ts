/**
 * Base Social Platform Abstract Class
 * Defines common interface for all social media platforms (Twitter, Meta, LinkedIn)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  SocialPost,
  PlatformMetrics,
  PostRequest,
  PostResult,
  KeywordMatch,
} from './types';

export interface PlatformConfig {
  integrationId: string;
  observatoryId: string;
  credentials: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
}

export abstract class BaseSocialPlatform {
  protected supabase: SupabaseClient;
  protected config: PlatformConfig;
  protected platformName: 'twitter' | 'meta' | 'linkedin';

  constructor(config: PlatformConfig, platformName: 'twitter' | 'meta' | 'linkedin') {
    this.config = config;
    this.platformName = platformName;

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ========================================================================
  // ABSTRACT METHODS - Must be implemented by platform-specific classes
  // ========================================================================

  /**
   * Stream posts matching keywords in real-time
   * @param keywords - Array of keywords to monitor
   * @returns Async iterable of matching posts
   */
  abstract streamKeywords(keywords: string[]): AsyncIterableIterator<SocialPost>;

  /**
   * Create a new post on the platform
   * @param request - Post content and metadata
   * @returns Post result with ID and URL
   */
  abstract createPost(request: PostRequest): Promise<PostResult>;

  /**
   * Reply to an existing post
   * @param postId - ID of post to reply to
   * @param content - Reply content
   * @returns Post result with reply ID and URL
   */
  abstract replyToPost(postId: string, content: string): Promise<PostResult>;

  /**
   * Send a direct message to a user
   * @param userId - Target user ID
   * @param message - Message content
   * @returns Message result
   */
  abstract sendDirectMessage(userId: string, message: string): Promise<{ id: string }>;

  /**
   * Get platform-specific metrics (followers, engagement, etc.)
   * @returns Platform metrics
   */
  abstract getMetrics(): Promise<PlatformMetrics>;

  /**
   * Like/react to a post
   * @param postId - ID of post to like
   */
  abstract likePost(postId: string): Promise<void>;

  /**
   * Search for posts by keyword or phrase
   * @param query - Search query
   * @param limit - Maximum number of results
   * @returns Array of matching posts
   */
  abstract searchPosts(query: string, limit?: number): Promise<SocialPost[]>;

  /**
   * Get user profile information
   * @param userId - User ID to fetch
   * @returns User profile data
   */
  abstract getUserProfile(userId: string): Promise<any>;

  // ========================================================================
  // SHARED UTILITY METHODS
  // ========================================================================

  /**
   * Refresh access token if expired
   * @returns New access token
   */
  protected async refreshAccessToken(): Promise<string> {
    const { data: integration } = await this.supabase
      .from('integrations')
      .select('credentials')
      .eq('id', this.config.integrationId)
      .single();

    if (!integration) {
      throw new Error('Integration not found');
    }

    const credentials = integration.credentials as any;

    // Check if token is expired
    if (credentials.expires_at) {
      const expiresAt = new Date(credentials.expires_at);
      if (expiresAt > new Date()) {
        // Token still valid
        return credentials.access_token;
      }
    }

    // Token expired - refresh it (platform-specific implementation)
    const newToken = await this.performTokenRefresh(credentials.refresh_token);

    // Update database with new token
    await this.supabase
      .from('integrations')
      .update({
        credentials: {
          ...credentials,
          access_token: newToken.accessToken,
          refresh_token: newToken.refreshToken || credentials.refresh_token,
          expires_at: newToken.expiresAt,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.config.integrationId);

    this.config.credentials.accessToken = newToken.accessToken;

    return newToken.accessToken;
  }

  /**
   * Platform-specific token refresh implementation
   * @param refreshToken - Refresh token
   * @returns New access token and expiry
   */
  protected abstract performTokenRefresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
  }>;

  /**
   * Log social activity to database for monitoring
   * @param activity - Activity details
   */
  protected async logActivity(activity: {
    type: 'post' | 'reply' | 'like' | 'dm' | 'search';
    postId?: string;
    content?: string;
    metadata?: any;
  }): Promise<void> {
    await this.supabase.from('social_activity_logs').insert({
      integration_id: this.config.integrationId,
      observatory_id: this.config.observatoryId,
      platform: this.platformName,
      activity_type: activity.type,
      post_id: activity.postId,
      content: activity.content,
      metadata: activity.metadata,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Analyze post for keyword matches and relevance
   * @param post - Social post to analyze
   * @param keywords - Keywords to match against
   * @returns Keyword match analysis
   */
  protected async analyzePost(post: SocialPost, keywords: string[]): Promise<KeywordMatch> {
    const text = post.content.text.toLowerCase();
    const matchedKeywords = keywords.filter((keyword) =>
      text.includes(keyword.toLowerCase())
    );

    // Calculate relevance score (0-100)
    let relevanceScore = 0;

    // Base score from keyword matches
    relevanceScore += matchedKeywords.length * 20;

    // Boost for author metrics
    if (post.author.verified) relevanceScore += 10;
    if (post.metrics.likes > 100) relevanceScore += 10;
    if (post.metrics.shares > 50) relevanceScore += 10;

    // Cap at 100
    relevanceScore = Math.min(100, relevanceScore);

    // Simple sentiment analysis (would use AI in production)
    const sentiment = this.detectSentiment(text);

    // Suggest agent based on keywords and sentiment
    const suggestedAgent = this.suggestAgent(matchedKeywords, sentiment);

    // Suggest action
    let suggestedAction: 'engage' | 'monitor' | 'ignore' = 'monitor';
    if (relevanceScore > 60 && sentiment !== 'negative') {
      suggestedAction = 'engage';
    } else if (relevanceScore < 30) {
      suggestedAction = 'ignore';
    }

    return {
      post,
      matchedKeywords,
      relevanceScore,
      sentiment,
      suggestedAction,
      suggestedAgent,
    };
  }

  /**
   * Detect sentiment of text (simple implementation)
   * @param text - Text to analyze
   * @returns Sentiment classification
   */
  private detectSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'love', 'awesome', 'excellent', 'amazing', 'perfect', 'thanks'];
    const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'poor', 'worst', 'disappointed'];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    words.forEach((word) => {
      if (positiveWords.includes(word)) score++;
      if (negativeWords.includes(word)) score--;
    });

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Suggest which agent should handle this post
   * @param keywords - Matched keywords
   * @param sentiment - Post sentiment
   * @returns Suggested agent type
   */
  private suggestAgent(
    keywords: string[],
    sentiment: string
  ): 'sales' | 'marketing' | 'support' | 'operations' | undefined {
    const keywordStr = keywords.join(' ').toLowerCase();

    // Sales keywords
    if (keywordStr.match(/pricing|cost|buy|purchase|upgrade|enterprise/)) {
      return 'sales';
    }

    // Support keywords
    if (keywordStr.match(/help|issue|problem|bug|error|support|question/)) {
      return 'support';
    }

    // Marketing keywords
    if (keywordStr.match(/feature|announcement|new|update|launch/)) {
      return 'marketing';
    }

    // Operations keywords
    if (keywordStr.match(/api|integration|deployment|performance/)) {
      return 'operations';
    }

    // Default based on sentiment
    if (sentiment === 'negative') return 'support';
    if (sentiment === 'positive') return 'marketing';

    return 'sales'; // Default fallback
  }

  /**
   * Get integration configuration from database
   * @param integrationId - Integration ID
   * @returns Integration config
   */
  static async getIntegrationConfig(
    integrationId: string
  ): Promise<PlatformConfig | null> {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (error || !integration) {
      return null;
    }

    const credentials = integration.credentials as any;

    return {
      integrationId: integration.id,
      observatoryId: integration.observatory_id,
      credentials: {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token,
        expiresAt: credentials.expires_at ? new Date(credentials.expires_at) : undefined,
      },
    };
  }
}
