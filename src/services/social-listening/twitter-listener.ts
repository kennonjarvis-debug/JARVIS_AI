import { twitterService } from '../../integrations/twitter.service';
import { SocialPost, SocialListeningConfig } from './types';
import { detectIntent } from './keyword-patterns';
import { qualityRanker } from './quality-ranker';

/**
 * Twitter/X Social Listening Service
 * Monitors Twitter for relevant opportunities
 */
export class TwitterListener {
  private config: SocialListeningConfig;

  constructor(config: SocialListeningConfig) {
    this.config = config;
  }

  /**
   * Search Twitter for posts matching our keywords
   */
  async searchPosts(accessToken: string): Promise<SocialPost[]> {
    const allPosts: SocialPost[] = [];

    // Build search queries from keyword patterns
    const searchQueries = this.buildSearchQueries();

    for (const query of searchQueries) {
      try {
        const tweets = await twitterService.searchTweets(query, this.config.maxPostsPerScan);

        for (const tweet of tweets) {
          const post = await this.convertTweetToPost(tweet, accessToken);
          if (post) {
            allPosts.push(post);
          }
        }
      } catch (error) {
        console.error(`Error searching Twitter for "${query}":`, error);
      }
    }

    return allPosts;
  }

  /**
   * Build search queries from keyword patterns
   */
  private buildSearchQueries(): string[] {
    // OPTIMIZED FOR FREE TIER: Use single comprehensive query to minimize API calls
    // This combines all intents into ONE query to stay within 100 requests/month limit

    const allKeywords = [
      'looking for producer',
      'need producer',
      'producer wanted',
      'looking for vocal coach',
      'need vocal coach',
      'vocal lessons',
      'looking for mixing',
      'need mixing engineer',
      'mastering engineer needed',
    ];

    // Single query covers all intents, excludes retweets to get quality content
    const comprehensiveQuery = `(${allKeywords.map((k) => `"${k}"`).join(' OR ')}) -is:retweet -is:reply lang:en`;

    return [comprehensiveQuery]; // Return only 1 query instead of 4
  }

  /**
   * Convert Twitter tweet to SocialPost
   */
  private async convertTweetToPost(tweet: any, accessToken: string): Promise<SocialPost | null> {
    try {
      const content = tweet.text || '';

      // Detect intent
      const { intent, confidence } = detectIntent(content);

      if (intent.length === 0) return null; // No relevant intent detected

      // Get author details
      const author = await this.getAuthorDetails(tweet, accessToken);

      const post: SocialPost = {
        id: tweet.id,
        platform: 'twitter',
        author,
        content,
        detectedIntent: intent,
        confidence,
        qualityScore: 0, // Will be calculated by quality ranker
        engagement: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          views: tweet.public_metrics?.impression_count || 0,
        },
        timestamp: new Date(tweet.created_at),
        url: `https://twitter.com/user/status/${tweet.id}`,
        language: tweet.lang || 'en',
        hashtags: tweet.entities?.hashtags?.map((h: any) => h.tag) || [],
        mentions: tweet.entities?.mentions?.map((m: any) => m.username) || [],
      };

      // Calculate quality score
      const metrics = qualityRanker.calculateQualityScore(post);
      post.qualityScore = metrics.overall;

      return post;
    } catch (error) {
      console.error('Error converting tweet to post:', error);
      return null;
    }
  }

  /**
   * Get author details from tweet
   */
  private async getAuthorDetails(tweet: any, accessToken: string): Promise<any> {
    // If tweet includes author data
    if (tweet.author) {
      return {
        id: tweet.author.id,
        username: tweet.author.username,
        displayName: tweet.author.name,
        followerCount: tweet.author.public_metrics?.followers_count || 0,
        verified: tweet.author.verified || false,
        bio: tweet.author.description || '',
        location: tweet.author.location || '',
      };
    }

    // Fallback: extract from tweet metadata
    return {
      id: tweet.author_id || 'unknown',
      username: 'unknown',
      displayName: 'Unknown User',
      followerCount: 0,
      verified: false,
      bio: '',
      location: '',
    };
  }

  /**
   * Start periodic listening
   */
  async startListening(accessToken: string, onPostsFound: (posts: SocialPost[]) => void): Promise<void> {
    console.log(`🎧 Starting Twitter social listening (interval: ${this.config.scanInterval} minutes)`);

    // Initial scan
    await this.scanAndProcess(accessToken, onPostsFound);

    // Set up periodic scanning
    setInterval(async () => {
      await this.scanAndProcess(accessToken, onPostsFound);
    }, this.config.scanInterval * 60 * 1000);
  }

  /**
   * Scan and process posts
   */
  private async scanAndProcess(accessToken: string, onPostsFound: (posts: SocialPost[]) => void): Promise<void> {
    try {
      console.log('🔍 Scanning Twitter for opportunities...');

      const posts = await this.searchPosts(accessToken);
      const rankedPosts = qualityRanker.rankPosts(posts);
      const filteredPosts = qualityRanker.filterByQuality(rankedPosts, this.config.minQualityScore);

      console.log(`✅ Found ${posts.length} posts, ${filteredPosts.length} after quality filtering`);

      if (filteredPosts.length > 0) {
        onPostsFound(filteredPosts);
      }
    } catch (error) {
      console.error('Error during Twitter scan:', error);
    }
  }
}
