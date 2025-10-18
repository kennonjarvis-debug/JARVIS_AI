import { PrismaClient } from '@prisma/client';
import { SocialPost } from './types';

/**
 * Database Service for Social Listening
 * Handles persistence of discovered posts, responses, and analytics
 */
export class SocialListeningDatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Save a discovered post to the database
   */
  async savePost(userId: string, post: SocialPost): Promise<string> {
    const result = await this.prisma.socialListeningPost.upsert({
      where: {
        platform_externalId: {
          platform: post.platform,
          externalId: post.id,
        },
      },
      create: {
        userId,
        platform: post.platform,
        externalId: post.id,
        authorId: post.author.id,
        authorUsername: post.author.username,
        authorDisplayName: post.author.displayName,
        authorFollowers: post.author.followerCount,
        authorVerified: post.author.verified || false,
        authorBio: post.author.bio,
        authorLocation: post.author.location,
        content: post.content,
        detectedIntents: post.detectedIntent,
        primaryIntent: post.detectedIntent[0] || 'general_discussion',
        confidence: post.confidence,
        qualityScore: post.qualityScore,
        engagementLikes: post.engagement.likes,
        engagementRetweets: post.engagement.retweets,
        engagementReplies: post.engagement.replies,
        engagementViews: post.engagement.views,
        postUrl: post.url,
        language: post.language,
        hashtags: post.hashtags || [],
        mentions: post.mentions || [],
        mediaUrls: post.mediaUrls || [],
        postedAt: post.timestamp,
      },
      update: {
        // Update engagement metrics if post already exists
        engagementLikes: post.engagement.likes,
        engagementRetweets: post.engagement.retweets,
        engagementReplies: post.engagement.replies,
        engagementViews: post.engagement.views,
        qualityScore: post.qualityScore,
      },
    });

    return result.id;
  }

  /**
   * Save a generated response
   */
  async saveResponse(
    userId: string,
    postId: string,
    responseText: string,
    qualityScore: number,
    scheduledFor?: Date
  ): Promise<string> {
    const response = await this.prisma.socialListeningResponse.create({
      data: {
        postId,
        userId,
        responseText,
        qualityScore,
        status: 'pending',
        scheduledFor,
        metadata: {
          model: 'claude-sonnet-4-20250514',
          temperature: 0.8,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    return response.id;
  }

  /**
   * Approve a response
   */
  async approveResponse(responseId: string, approvedBy: string): Promise<void> {
    await this.prisma.socialListeningResponse.update({
      where: { id: responseId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy,
      },
    });
  }

  /**
   * Reject a response
   */
  async rejectResponse(responseId: string, rejectedBy: string, reason?: string): Promise<void> {
    await this.prisma.socialListeningResponse.update({
      where: { id: responseId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason: reason,
      },
    });
  }

  /**
   * Record an engagement
   */
  async recordEngagement(
    userId: string,
    postId: string,
    responseId: string,
    platform: string,
    engagementType: string,
    success: boolean,
    externalId?: string,
    error?: string
  ): Promise<string> {
    const engagement = await this.prisma.socialListeningEngagement.create({
      data: {
        postId,
        responseId,
        userId,
        platform,
        engagementType,
        externalId,
        success,
        error,
      },
    });

    // Update response status
    if (success) {
      await this.prisma.socialListeningResponse.update({
        where: { id: responseId },
        data: {
          status: 'posted',
          postedAt: new Date(),
        },
      });
    }

    return engagement.id;
  }

  /**
   * Get pending responses for approval
   */
  async getPendingResponses(userId: string, limit: number = 50) {
    return this.prisma.socialListeningResponse.findMany({
      where: {
        userId,
        status: 'pending',
      },
      include: {
        post: true,
      },
      orderBy: {
        generatedAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get posts discovered in the last N hours
   */
  async getRecentPosts(userId: string, hours: number = 24, limit: number = 100) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    return this.prisma.socialListeningPost.findMany({
      where: {
        userId,
        discoveredAt: {
          gte: since,
        },
      },
      orderBy: {
        qualityScore: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get posts by intent
   */
  async getPostsByIntent(userId: string, intent: string, limit: number = 50) {
    return this.prisma.socialListeningPost.findMany({
      where: {
        userId,
        primaryIntent: intent,
      },
      orderBy: {
        discoveredAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Track analytics event
   */
  async trackAnalytics(
    userId: string,
    platform: string,
    metricType: string,
    metricValue: number,
    dimension1?: string,
    dimension2?: string,
    metadata?: any
  ): Promise<void> {
    await this.prisma.socialListeningAnalytics.create({
      data: {
        userId,
        platform,
        metricType,
        metricValue,
        dimension1,
        dimension2,
        metadata,
      },
    });
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(userId: string, platform?: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = {
      userId,
      timestamp: {
        gte: since,
      },
    };

    if (platform) {
      where.platform = platform;
    }

    const metrics = await this.prisma.socialListeningAnalytics.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Aggregate metrics
    const summary = {
      scansCompleted: 0,
      postsDiscovered: 0,
      responsesGenerated: 0,
      engagementsMade: 0,
      byPlatform: {} as Record<string, any>,
      byIntent: {} as Record<string, number>,
    };

    for (const metric of metrics) {
      switch (metric.metricType) {
        case 'scan_completed':
          summary.scansCompleted += metric.metricValue;
          break;
        case 'posts_discovered':
          summary.postsDiscovered += metric.metricValue;
          break;
        case 'responses_generated':
          summary.responsesGenerated += metric.metricValue;
          break;
        case 'engagement_made':
          summary.engagementsMade += metric.metricValue;
          break;
      }

      // By platform
      if (!summary.byPlatform[metric.platform]) {
        summary.byPlatform[metric.platform] = {
          scans: 0,
          posts: 0,
          responses: 0,
          engagements: 0,
        };
      }

      // By intent
      if (metric.dimension1) {
        summary.byIntent[metric.dimension1] = (summary.byIntent[metric.dimension1] || 0) + metric.metricValue;
      }
    }

    return summary;
  }

  /**
   * Get or create user config
   */
  async getUserConfig(userId: string) {
    let config = await this.prisma.socialListeningConfig.findUnique({
      where: { userId },
    });

    if (!config) {
      // Create default config
      config = await this.prisma.socialListeningConfig.create({
        data: {
          userId,
          platforms: ['twitter'],
          scanInterval: 15,
          maxPostsPerScan: 20,
          minQualityScore: 0.6,
          autoEngageEnabled: false,
          requireApproval: true,
          enabledIntents: [
            'seeking_producer',
            'seeking_vocal_coach',
            'seeking_mixing_engineer',
            'seeking_mastering_engineer',
            'asking_for_feedback',
            'collaboration_request',
          ],
          maxResponseDelay: 30,
          dailyEngagementLimit: 50,
        },
      });
    }

    return config;
  }

  /**
   * Update user config
   */
  async updateUserConfig(userId: string, updates: any) {
    return this.prisma.socialListeningConfig.update({
      where: { userId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Check if daily engagement limit reached
   */
  async checkDailyEngagementLimit(userId: string): Promise<{ reached: boolean; count: number; limit: number }> {
    const config = await this.getUserConfig(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.prisma.socialListeningEngagement.count({
      where: {
        userId,
        performedAt: {
          gte: today,
        },
        success: true,
      },
    });

    return {
      reached: count >= config.dailyEngagementLimit,
      count,
      limit: config.dailyEngagementLimit,
    };
  }

  /**
   * Update engagement metrics when a lead responds
   */
  async updateEngagementMetrics(
    engagementId: string,
    metrics: {
      authorReplied?: boolean;
      conversationStarted?: boolean;
      leadGenerated?: boolean;
      likesReceived?: number;
      repliesReceived?: number;
      retweetsReceived?: number;
      viewsReceived?: number;
    }
  ): Promise<void> {
    await this.prisma.socialListeningEngagement.update({
      where: { id: engagementId },
      data: metrics,
    });
  }

  /**
   * Mark a lead as converted (responded to our post)
   */
  async markLeadAsConverted(engagementId: string): Promise<void> {
    await this.prisma.socialListeningEngagement.update({
      where: { id: engagementId },
      data: {
        authorReplied: true,
        conversationStarted: true,
        leadGenerated: true,
      },
    });
  }

  /**
   * Get all leads that responded (for tracking conversions)
   */
  async getConvertedLeads(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.socialListeningEngagement.findMany({
      where: {
        userId,
        leadGenerated: true,
        performedAt: {
          gte: since,
        },
      },
      include: {
        post: true,
        response: true,
      },
      orderBy: {
        performedAt: 'desc',
      },
    });
  }

  /**
   * Get engagements that received responses (for follow-up)
   */
  async getEngagementsWithResponses(userId: string, limit: number = 50) {
    return this.prisma.socialListeningEngagement.findMany({
      where: {
        userId,
        authorReplied: true,
      },
      include: {
        post: true,
        response: true,
      },
      orderBy: {
        performedAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const socialListeningDb = new SocialListeningDatabaseService();
