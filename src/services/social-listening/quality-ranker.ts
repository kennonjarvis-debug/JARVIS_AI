import { SocialPost, QualityMetrics } from './types';

/**
 * Quality Ranking System
 * Ranks social posts by potential engagement value
 */
export class QualityRanker {
  /**
   * Calculate overall quality score for a post
   */
  calculateQualityScore(post: SocialPost): QualityMetrics {
    const authorCredibility = this.calculateAuthorCredibility(post);
    const contentRelevance = post.confidence; // From intent detection
    const engagementPotential = this.calculateEngagementPotential(post);
    const recency = this.calculateRecency(post.timestamp);

    // Weighted average
    const overall =
      authorCredibility * 0.3 +
      contentRelevance * 0.35 +
      engagementPotential * 0.25 +
      recency * 0.1;

    return {
      authorCredibility,
      contentRelevance,
      engagementPotential,
      recency,
      overall,
    };
  }

  /**
   * Calculate author credibility score (0-1)
   */
  private calculateAuthorCredibility(post: SocialPost): number {
    let score = 0;

    // Follower count (max 0.4)
    const followerScore = Math.min((post.author.followerCount || 0) / 10000, 1) * 0.4;
    score += followerScore;

    // Verified account (+0.3)
    if (post.author.verified) {
      score += 0.3;
    }

    // Has bio (+0.1)
    if (post.author.bio && post.author.bio.length > 20) {
      score += 0.1;
    }

    // Account activity (estimated from engagement) (+0.2)
    const totalEngagement = post.engagement.likes + post.engagement.retweets + post.engagement.replies;
    const activityScore = Math.min(totalEngagement / 100, 1) * 0.2;
    score += activityScore;

    return Math.min(score, 1);
  }

  /**
   * Calculate engagement potential (0-1)
   */
  private calculateEngagementPotential(post: SocialPost): number {
    const { likes, retweets, replies, views } = post.engagement;

    // Engagement rate (likes + retweets + replies) / views
    if (views && views > 0) {
      const engagementRate = (likes + retweets + replies) / views;
      return Math.min(engagementRate * 100, 1); // Normalize
    }

    // Fallback: absolute engagement numbers
    const totalEngagement = likes + retweets + replies;

    if (totalEngagement === 0) return 0.3; // Recent post, no engagement yet
    if (totalEngagement < 5) return 0.4;
    if (totalEngagement < 20) return 0.6;
    if (totalEngagement < 100) return 0.8;
    return 1.0;
  }

  /**
   * Calculate recency score (0-1)
   */
  private calculateRecency(timestamp: Date): number {
    const now = new Date();
    const ageMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);

    // Fresher posts get higher scores
    if (ageMinutes < 10) return 1.0;
    if (ageMinutes < 30) return 0.9;
    if (ageMinutes < 60) return 0.8;
    if (ageMinutes < 180) return 0.6;
    if (ageMinutes < 360) return 0.4;
    if (ageMinutes < 720) return 0.2;
    return 0.1;
  }

  /**
   * Rank posts by quality score
   */
  rankPosts(posts: SocialPost[]): SocialPost[] {
    return posts
      .map((post) => {
        const metrics = this.calculateQualityScore(post);
        return {
          ...post,
          qualityScore: metrics.overall,
        };
      })
      .sort((a, b) => b.qualityScore - a.qualityScore);
  }

  /**
   * Filter posts by minimum quality threshold
   */
  filterByQuality(posts: SocialPost[], minScore: number = 0.5): SocialPost[] {
    return posts.filter((post) => post.qualityScore >= minScore);
  }
}

export const qualityRanker = new QualityRanker();
