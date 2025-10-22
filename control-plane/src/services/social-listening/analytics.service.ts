import { socialListeningDb } from './database.service';

/**
 * Social Listening Analytics Service
 * Provides insights, metrics, and performance tracking
 */
export class SocialListeningAnalyticsService {
  /**
   * Generate comprehensive dashboard data
   */
  async getDashboard(userId: string, days: number = 7) {
    const [summary, recentPosts, pendingResponses, engagementLimit] = await Promise.all([
      socialListeningDb.getAnalyticsSummary(userId, undefined, days),
      socialListeningDb.getRecentPosts(userId, 24, 10),
      socialListeningDb.getPendingResponses(userId, 10),
      socialListeningDb.checkDailyEngagementLimit(userId),
    ]);

    return {
      summary,
      recentPosts: recentPosts.map((post) => ({
        id: post.id,
        platform: post.platform,
        author: post.authorUsername,
        content: post.content.substring(0, 100) + '...',
        intent: post.primaryIntent,
        qualityScore: post.qualityScore,
        discoveredAt: post.discoveredAt,
      })),
      pendingResponses: pendingResponses.map((resp) => ({
        id: resp.id,
        postAuthor: resp.post.authorUsername,
        postContent: resp.post.content.substring(0, 50) + '...',
        responseText: resp.responseText,
        qualityScore: resp.qualityScore,
        generatedAt: resp.generatedAt,
      })),
      engagementLimit,
      period: `Last ${days} days`,
    };
  }

  /**
   * Get engagement performance metrics
   */
  async getEngagementMetrics(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // This would query the database for engagement metrics
    // For now, returning a structured response
    return {
      totalEngagements: 0,
      successRate: 0,
      averageResponseTime: 0,
      conversionsStarted: 0,
      leadsGenerated: 0,
      byPlatform: {},
      byIntent: {},
      timeline: [],
    };
  }

  /**
   * Get intent performance breakdown
   */
  async getIntentPerformance(userId: string, days: number = 30) {
    const posts = await socialListeningDb.getRecentPosts(userId, days * 24, 1000);

    const intentStats: Record<
      string,
      {
        discovered: number;
        avgQuality: number;
        responded: number;
        engaged: number;
      }
    > = {};

    for (const post of posts) {
      const intent = post.primaryIntent;

      if (!intentStats[intent]) {
        intentStats[intent] = {
          discovered: 0,
          avgQuality: 0,
          responded: 0,
          engaged: 0,
        };
      }

      intentStats[intent].discovered++;
      intentStats[intent].avgQuality += post.qualityScore;
    }

    // Calculate averages
    for (const intent in intentStats) {
      const count = intentStats[intent].discovered;
      if (count > 0) {
        intentStats[intent].avgQuality = intentStats[intent].avgQuality / count;
      }
    }

    return intentStats;
  }

  /**
   * Get quality score distribution
   */
  async getQualityDistribution(userId: string, days: number = 7) {
    const posts = await socialListeningDb.getRecentPosts(userId, days * 24, 1000);

    const distribution = {
      excellent: 0, // 0.9-1.0
      good: 0, // 0.7-0.89
      medium: 0, // 0.5-0.69
      low: 0, // 0-0.49
    };

    for (const post of posts) {
      const score = post.qualityScore;

      if (score >= 0.9) distribution.excellent++;
      else if (score >= 0.7) distribution.good++;
      else if (score >= 0.5) distribution.medium++;
      else distribution.low++;
    }

    return distribution;
  }

  /**
   * Get top performing posts (by engagement received)
   */
  async getTopPosts(userId: string, limit: number = 10, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // This would query posts with highest engagement
    return [];
  }

  /**
   * Get author credibility insights
   */
  async getAuthorInsights(userId: string, days: number = 30) {
    const posts = await socialListeningDb.getRecentPosts(userId, days * 24, 1000);

    let totalFollowers = 0;
    let verifiedCount = 0;
    let totalAuthors = 0;

    const uniqueAuthors = new Set<string>();

    for (const post of posts) {
      uniqueAuthors.add(post.authorId);

      if (post.authorFollowers) {
        totalFollowers += post.authorFollowers;
      }

      if (post.authorVerified) {
        verifiedCount++;
      }
    }

    totalAuthors = uniqueAuthors.size;

    return {
      uniqueAuthors: totalAuthors,
      avgFollowers: totalAuthors > 0 ? Math.floor(totalFollowers / posts.length) : 0,
      verifiedPercentage: posts.length > 0 ? (verifiedCount / posts.length) * 100 : 0,
      totalPosts: posts.length,
    };
  }

  /**
   * Generate performance report
   */
  async generateReport(userId: string, days: number = 30): Promise<string> {
    const [dashboard, intentPerf, qualityDist, authorInsights] = await Promise.all([
      this.getDashboard(userId, days),
      this.getIntentPerformance(userId, days),
      this.getQualityDistribution(userId, days),
      this.getAuthorInsights(userId, days),
    ]);

    const report = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  JARVIS SOCIAL LISTENING PERFORMANCE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Period: ${dashboard.period}
Generated: ${new Date().toLocaleString()}

📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scans Completed:      ${dashboard.summary.scansCompleted}
Posts Discovered:     ${dashboard.summary.postsDiscovered}
Responses Generated:  ${dashboard.summary.responsesGenerated}
Engagements Made:     ${dashboard.summary.engagementsMade}
Pending Responses:    ${dashboard.pendingResponses.length}

🎯 ENGAGEMENT CAPACITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Today's Engagements:  ${dashboard.engagementLimit.count} / ${dashboard.engagementLimit.limit}
Remaining:            ${dashboard.engagementLimit.limit - dashboard.engagementLimit.count}
Status:               ${dashboard.engagementLimit.reached ? '❌ Limit Reached' : '✅ Available'}

📈 QUALITY DISTRIBUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Excellent (90%+):     ${qualityDist.excellent}
Good (70-89%):        ${qualityDist.good}
Medium (50-69%):      ${qualityDist.medium}
Low (<50%):           ${qualityDist.low}

🎤 INTENT PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.formatIntentStats(intentPerf)}

👥 AUTHOR INSIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unique Authors:       ${authorInsights.uniqueAuthors}
Avg Followers:        ${authorInsights.avgFollowers.toLocaleString()}
Verified Accounts:    ${authorInsights.verifiedPercentage.toFixed(1)}%
Total Posts:          ${authorInsights.totalPosts}

🌟 TOP RECENT DISCOVERIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.formatRecentPosts(dashboard.recentPosts)}

⏳ PENDING RESPONSES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.formatPendingResponses(dashboard.pendingResponses)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return report;
  }

  /**
   * Format intent statistics
   */
  private formatIntentStats(intentPerf: Record<string, any>): string {
    const lines: string[] = [];

    const sorted = Object.entries(intentPerf).sort(
      ([, a]: any, [, b]: any) => b.discovered - a.discovered
    );

    for (const [intent, stats] of sorted) {
      const avgQuality = ((stats as any).avgQuality * 100).toFixed(1);
      lines.push(
        `${intent.padEnd(30)} | ${(stats as any).discovered} posts (${avgQuality}% avg quality)`
      );
    }

    return lines.length > 0 ? lines.join('\n') : 'No data available';
  }

  /**
   * Format recent posts
   */
  private formatRecentPosts(posts: any[]): string {
    if (posts.length === 0) return 'No recent posts';

    const lines: string[] = [];

    for (let i = 0; i < Math.min(5, posts.length); i++) {
      const post = posts[i];
      const quality = (post.qualityScore * 100).toFixed(0);
      const timeAgo = this.getTimeAgo(post.discoveredAt);

      lines.push(
        `${i + 1}. @${post.author} | ${post.intent} | ${quality}% quality | ${timeAgo}`
      );
      lines.push(`   "${post.content}"`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format pending responses
   */
  private formatPendingResponses(responses: any[]): string {
    if (responses.length === 0) return 'No pending responses';

    const lines: string[] = [];

    for (let i = 0; i < Math.min(3, responses.length); i++) {
      const resp = responses[i];
      const quality = (resp.qualityScore * 100).toFixed(0);

      lines.push(`${i + 1}. To @${resp.postAuthor} (${quality}% quality)`);
      lines.push(`   Response: "${resp.responseText}"`);
      lines.push('');
    }

    if (responses.length > 3) {
      lines.push(`... and ${responses.length - 3} more`);
    }

    return lines.join('\n');
  }

  /**
   * Get human-readable time ago
   */
  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Track a scan event
   */
  async trackScan(userId: string, platform: string, postsFound: number): Promise<void> {
    await socialListeningDb.trackAnalytics(userId, platform, 'scan_completed', 1);

    if (postsFound > 0) {
      await socialListeningDb.trackAnalytics(userId, platform, 'posts_discovered', postsFound);
    }
  }

  /**
   * Track a response generation
   */
  async trackResponseGenerated(
    userId: string,
    platform: string,
    intent: string,
    qualityScore: number
  ): Promise<void> {
    await socialListeningDb.trackAnalytics(
      userId,
      platform,
      'responses_generated',
      1,
      intent,
      qualityScore >= 0.7 ? 'high_quality' : 'medium_quality'
    );
  }

  /**
   * Track an engagement
   */
  async trackEngagement(
    userId: string,
    platform: string,
    engagementType: string,
    success: boolean
  ): Promise<void> {
    await socialListeningDb.trackAnalytics(
      userId,
      platform,
      'engagement_made',
      success ? 1 : 0,
      engagementType
    );
  }
}

// Export singleton instance
export const analyticsService = new SocialListeningAnalyticsService();
