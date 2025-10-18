import { TwitterListener } from './twitter-listener';
import { responseGenerator } from './response-generator';
import { SocialPost, SocialListeningConfig, EngagementStrategy } from './types';
import { twitterService } from '../../integrations/twitter.service';
import { socialListeningDb } from './database.service';

/**
 * Social Listening Orchestrator
 * Coordinates scanning, ranking, and engagement across social platforms
 */
export class SocialListeningOrchestrator {
  private config: SocialListeningConfig;
  private twitterListener: TwitterListener | null = null;
  private isListening: boolean = false;
  private discoveredPosts: Map<string, SocialPost> = new Map();
  private pendingResponses: Map<string, string> = new Map();
  private userId: string = 'superadmin'; // TODO: Pass userId from start() method

  constructor(config: SocialListeningConfig) {
    this.config = config;
  }

  /**
   * Start social listening across configured platforms
   */
  async start(accessToken: string): Promise<void> {
    if (this.isListening) {
      console.log('⚠️ Social listening already running');
      return;
    }

    console.log('🚀 Starting Jarvis Social Listening System');
    console.log(`📊 Platforms: ${this.config.platforms.join(', ')}`);
    console.log(`🔍 Scan interval: ${this.config.scanInterval} minutes`);
    console.log(`⭐ Min quality score: ${this.config.minQualityScore}`);
    console.log(`🤖 Auto-engage: ${this.config.autoEngageEnabled}`);
    console.log(`✅ Requires approval: ${this.config.requireApproval}`);

    this.isListening = true;

    // Initialize platform listeners
    if (this.config.platforms.includes('twitter')) {
      this.startTwitterListening(accessToken);
    }

    // TODO: Add other platforms (Threads, Instagram, Facebook, etc.)
  }

  /**
   * Stop social listening
   */
  stop(): void {
    console.log('🛑 Stopping social listening system');
    this.isListening = false;
    // TODO: Clear intervals for all platform listeners
  }

  /**
   * Start Twitter/X listening
   */
  private async startTwitterListening(accessToken: string): Promise<void> {
    this.twitterListener = new TwitterListener(this.config);

    await this.twitterListener.startListening(accessToken, async (posts) => {
      await this.handleDiscoveredPosts(posts, accessToken);
    });
  }

  /**
   * Handle newly discovered posts
   */
  private async handleDiscoveredPosts(posts: SocialPost[], accessToken: string): Promise<void> {
    console.log(`\n🎯 Processing ${posts.length} high-quality opportunities`);

    for (const post of posts) {
      // Skip if already processed
      if (this.discoveredPosts.has(post.id)) {
        continue;
      }

      // Add to discovered posts
      this.discoveredPosts.set(post.id, post);

      // Log discovery
      this.logDiscovery(post);

      // Determine engagement strategy
      const strategy = this.getEngagementStrategy(post);

      if (!strategy.shouldEngage(post)) {
        console.log(`⏭️  Skipping engagement (strategy: ${strategy.responseStyle})`);
        continue;
      }

      // Generate response
      await this.processEngagement(post, strategy, accessToken);
    }
  }

  /**
   * Process engagement for a post
   */
  private async processEngagement(
    post: SocialPost,
    strategy: EngagementStrategy,
    accessToken: string
  ): Promise<void> {
    try {
      // Apply response delay
      const delay = this.calculateResponseDelay(strategy);
      console.log(`⏰ Waiting ${delay} minutes before responding...`);

      // Generate AI response
      const response = await responseGenerator.generateResponse(post);
      const score = responseGenerator.scoreResponse(response, post);

      console.log(`\n💬 Generated Response (score: ${score.toFixed(2)}):`);
      console.log(`"${response}"\n`);

      // Store pending response
      this.pendingResponses.set(post.id, response);

      // Handle based on config
      if (this.config.requireApproval) {
        console.log('⏸️  Response pending approval');
        // TODO: Store in database for approval queue
      } else if (this.config.autoEngageEnabled) {
        console.log('🚀 Auto-engaging (no approval required)');
        console.log(`⏰ Scheduling post for ${delay} minutes from now...`);

        // Wait for the delay, then post
        setTimeout(async () => {
          try {
            await this.postResponse(post, response, accessToken);
            console.log(`✅ Successfully posted response to @${post.author.username}`);
          } catch (error: any) {
            console.error(`❌ Failed to post response:`, error.message);
          }
        }, delay * 60 * 1000); // Convert minutes to milliseconds
      } else {
        console.log('ℹ️  Response generated but auto-engage disabled');
      }
    } catch (error) {
      console.error(`❌ Error processing engagement for post ${post.id}:`, error);
    }
  }

  /**
   * Get engagement strategy for a post
   */
  private getEngagementStrategy(post: SocialPost): EngagementStrategy {
    const primaryIntent = post.detectedIntent[0];

    // Define engagement strategies per intent
    const strategies: Record<string, EngagementStrategy> = {
      seeking_producer: {
        intent: 'seeking_producer',
        priority: 10,
        responseDelay: { min: 5, max: 15 },
        shouldEngage: (p) => p.qualityScore >= 0.6,
        responseStyle: 'helpful',
      },
      seeking_vocal_coach: {
        intent: 'seeking_vocal_coach',
        priority: 10,
        responseDelay: { min: 5, max: 15 },
        shouldEngage: (p) => p.qualityScore >= 0.6,
        responseStyle: 'helpful',
      },
      seeking_mixing_engineer: {
        intent: 'seeking_mixing_engineer',
        priority: 9,
        responseDelay: { min: 10, max: 20 },
        shouldEngage: (p) => p.qualityScore >= 0.6,
        responseStyle: 'helpful',
      },
      seeking_mastering_engineer: {
        intent: 'seeking_mastering_engineer',
        priority: 9,
        responseDelay: { min: 10, max: 20 },
        shouldEngage: (p) => p.qualityScore >= 0.6,
        responseStyle: 'helpful',
      },
      asking_for_feedback: {
        intent: 'asking_for_feedback',
        priority: 7,
        responseDelay: { min: 15, max: 30 },
        shouldEngage: (p) => p.qualityScore >= 0.7 && (p.author.followerCount || 0) > 100,
        responseStyle: 'conversational',
      },
      collaboration_request: {
        intent: 'collaboration_request',
        priority: 8,
        responseDelay: { min: 10, max: 25 },
        shouldEngage: (p) => p.qualityScore >= 0.65,
        responseStyle: 'conversational',
      },
      showcasing_work: {
        intent: 'showcasing_work',
        priority: 5,
        responseDelay: { min: 20, max: 40 },
        shouldEngage: (p) => p.qualityScore >= 0.75 && (p.author.followerCount || 0) > 500,
        responseStyle: 'showcase',
      },
      offering_producer_services: {
        intent: 'offering_producer_services',
        priority: 3,
        responseDelay: { min: 30, max: 60 },
        shouldEngage: (p) => false, // Don't engage with competitors
        responseStyle: 'direct',
      },
    };

    return (
      strategies[primaryIntent] || {
        intent: 'general_discussion',
        priority: 4,
        responseDelay: { min: 20, max: 40 },
        shouldEngage: (p) => p.qualityScore >= 0.8,
        responseStyle: 'conversational',
      }
    );
  }

  /**
   * Calculate response delay based on strategy
   */
  private calculateResponseDelay(strategy: EngagementStrategy): number {
    const { min, max } = strategy.responseDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Log post discovery
   */
  private logDiscovery(post: SocialPost): void {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎯 OPPORTUNITY DISCOVERED`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Platform: ${post.platform.toUpperCase()}`);
    console.log(`Author: @${post.author.username} (${post.author.displayName})`);
    console.log(`Followers: ${post.author.followerCount || 'unknown'}`);
    console.log(`Verified: ${post.author.verified ? '✓' : '✗'}`);
    console.log(`Intent: ${post.detectedIntent.join(', ')}`);
    console.log(`Confidence: ${(post.confidence * 100).toFixed(1)}%`);
    console.log(`Quality Score: ${(post.qualityScore * 100).toFixed(1)}%`);
    console.log(`Engagement: ${post.engagement.likes} ♥ | ${post.engagement.retweets} ⟳ | ${post.engagement.replies} 💬`);
    console.log(`Posted: ${this.getTimeAgo(post.timestamp)}`);
    console.log(`\nContent: "${post.content}"`);
    console.log(`URL: ${post.url}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  /**
   * Get human-readable time ago
   */
  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Get current stats
   */
  getStats(): {
    isListening: boolean;
    totalDiscovered: number;
    pendingResponses: number;
    platforms: string[];
  } {
    return {
      isListening: this.isListening,
      totalDiscovered: this.discoveredPosts.size,
      pendingResponses: this.pendingResponses.size,
      platforms: this.config.platforms,
    };
  }

  /**
   * Get discovered posts
   */
  getDiscoveredPosts(): SocialPost[] {
    return Array.from(this.discoveredPosts.values());
  }

  /**
   * Get pending responses
   */
  getPendingResponses(): Array<{ post: SocialPost; response: string }> {
    return Array.from(this.pendingResponses.entries()).map(([postId, response]) => ({
      post: this.discoveredPosts.get(postId)!,
      response,
    }));
  }

  /**
   * Approve and post a response
   */
  async approveResponse(postId: string, accessToken: string): Promise<void> {
    const response = this.pendingResponses.get(postId);
    const post = this.discoveredPosts.get(postId);

    if (!response || !post) {
      throw new Error(`Response not found for post ${postId}`);
    }

    console.log(`✅ Approving response for post ${postId}`);
    // TODO: Implement actual posting logic
    // await this.postResponse(post, response, accessToken);

    this.pendingResponses.delete(postId);
  }

  /**
   * Reject a response
   */
  rejectResponse(postId: string): void {
    console.log(`❌ Rejecting response for post ${postId}`);
    this.pendingResponses.delete(postId);
  }

  /**
   * Post a response to Twitter
   */
  private async postResponse(post: SocialPost, responseText: string, accessToken: string): Promise<void> {
    try {
      console.log(`\n📤 Posting response to @${post.author.username}...`);
      console.log(`   Original post: "${post.content.substring(0, 50)}..."`);
      console.log(`   Our response: "${responseText}"`);

      // Save post and response to database first
      const postId = await socialListeningDb.savePost(this.userId, post);
      const responseScore = responseGenerator.scoreResponse(responseText, post);
      const responseId = await socialListeningDb.saveResponse(this.userId, postId, responseText, responseScore);

      // Post the tweet reply
      const result = await twitterService.postTweet(accessToken, responseText);

      console.log(`✅ Tweet posted successfully!`);
      console.log(`   Tweet ID: ${result.id}`);
      console.log(`   URL: https://twitter.com/user/status/${result.id}`);

      // Record successful engagement in database
      await socialListeningDb.recordEngagement(
        this.userId,
        postId,
        responseId,
        'twitter',
        'reply',
        true, // success
        result.id, // externalId (tweet ID)
        undefined // no error
      );

      console.log(`💾 Engagement saved to database (post: ${postId}, response: ${responseId})`);

      // Remove from pending responses
      this.pendingResponses.delete(post.id);
    } catch (error: any) {
      console.error(`❌ Error posting tweet:`, error.message);

      // Try to save the failed engagement attempt
      try {
        const postId = await socialListeningDb.savePost(this.userId, post);
        const responseScore = responseGenerator.scoreResponse(responseText, post);
        const responseId = await socialListeningDb.saveResponse(this.userId, postId, responseText, responseScore);

        await socialListeningDb.recordEngagement(
          this.userId,
          postId,
          responseId,
          'twitter',
          'reply',
          false, // failure
          undefined,
          error.message
        );
      } catch (dbError) {
        console.error(`❌ Failed to save engagement error to database:`, dbError);
      }

      throw error;
    }
  }
}

/**
 * Create default configuration
 */
export function createDefaultConfig(): SocialListeningConfig {
  return {
    platforms: ['twitter'], // Start with X/Twitter only
    keywords: [], // Keywords are defined in keyword-patterns.ts
    scanInterval: 1440, // OPTIMIZED FOR FREE TIER: Once per day (Twitter Free = 100 requests/month)
    maxPostsPerScan: 10, // Reduced to conserve API calls
    minQualityScore: 0.6, // Only engage with quality >= 60%
    autoEngageEnabled: false, // Require manual approval (FREE TIER)
    requireApproval: true, // Safety first
  };
}

// Export singleton instance
export const socialListeningOrchestrator = new SocialListeningOrchestrator(createDefaultConfig());
