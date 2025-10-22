/**
 * Jarvis Engagement Module
 *
 * Handles user engagement, sentiment analysis, churn detection,
 * and proactive re-engagement automation.
 *
 * Features:
 * - AI chatbot support/onboarding
 * - Sentiment analysis (NLP)
 * - Churn detection (Prisma CustomerHealth)
 * - Proactive re-engagement automation
 * - Scheduled: daily churn checks, weekly engagement pushes
 */

import { BaseModule } from '../../core/base-module';
import { Router } from 'express';
import { ScheduledJob } from '../../core/jarvis.interfaces';
import { SentimentAnalyzer } from './sentiment-analyzer';
import { ChurnDetector } from './churn-detector';
import { ReEngagementService } from './re-engagement';
import { PrismaClient } from '@prisma/client';

export class EngagementModule extends BaseModule {
  name = 'engagement';
  version = '1.0.0';
  description = 'User engagement, sentiment analysis, and churn prevention';
  dependencies: string[] = [];

  private prisma: PrismaClient;
  private sentimentAnalyzer: SentimentAnalyzer;
  private churnDetector: ChurnDetector;
  private reEngagement: ReEngagementService;

  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.churnDetector = new ChurnDetector(this.prisma);
    this.reEngagement = new ReEngagementService(this.prisma);
  }

  /**
   * Initialize engagement module
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing Engagement Module...');

    // Register command handlers
    this.registerCommand('analyze-sentiment', this.handleAnalyzeSentiment.bind(this));
    this.registerCommand('check-churn-risk', this.handleCheckChurnRisk.bind(this));
    this.registerCommand('get-churn-users', this.handleGetChurnUsers.bind(this));
    this.registerCommand('send-engagement', this.handleSendEngagement.bind(this));
    this.registerCommand('get-health-score', this.handleGetHealthScore.bind(this));
    this.registerCommand('update-health-score', this.handleUpdateHealthScore.bind(this));
    this.registerCommand('chatbot-query', this.handleChatbotQuery.bind(this));

    // Initialize services
    await this.sentimentAnalyzer.initialize();
    await this.churnDetector.initialize();
    await this.reEngagement.initialize();

    this.logger.info('Engagement Module initialized successfully');
  }

  /**
   * Shutdown engagement module
   */
  protected async onShutdown(): Promise<void> {
    this.logger.info('Shutting down Engagement Module...');

    // Cleanup
    await this.prisma.$disconnect();

    this.logger.info('Engagement Module shut down successfully');
  }

  /**
   * Register Express routes
   */
  protected onRegisterRoutes(router: Router): void {
    // Sentiment analysis
    router.post('/sentiment/analyze', async (req, res) => {
      try {
        const { text, context } = req.body;
        const result = await this.sentimentAnalyzer.analyze(text, context);
        res.json({ success: true, data: result });
      } catch (error: any) {
        this.logger.error('Sentiment analysis failed', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Churn detection
    router.get('/churn/check/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const result = await this.churnDetector.checkUser(userId);
        res.json({ success: true, data: result });
      } catch (error: any) {
        this.logger.error('Churn check failed', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.get('/churn/at-risk', async (req, res) => {
      try {
        const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : undefined;
        const users = await this.churnDetector.getAtRiskUsers(threshold);
        res.json({ success: true, data: users, count: users.length });
      } catch (error: any) {
        this.logger.error('Get at-risk users failed', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Health scores
    router.get('/health/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const health = await this.prisma.customerHealth.findUnique({
          where: { userId },
          include: { User: { select: { email: true, username: true, lastLoginAt: true } } }
        });

        if (!health) {
          return res.status(404).json({ success: false, error: 'Health record not found' });
        }

        res.json({ success: true, data: health });
      } catch (error: any) {
        this.logger.error('Get health score failed', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.post('/health/:userId/update', async (req, res) => {
      try {
        const { userId } = req.params;
        const updates = req.body;
        const updated = await this.churnDetector.updateHealthScore(userId, updates);
        res.json({ success: true, data: updated });
      } catch (error: any) {
        this.logger.error('Update health score failed', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Re-engagement
    router.post('/engagement/send', async (req, res) => {
      try {
        const { userId, type, metadata } = req.body;
        const result = await this.reEngagement.sendEngagementMessage(userId, type, metadata);
        res.json({ success: true, data: result });
      } catch (error: any) {
        this.logger.error('Send engagement failed', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.post('/engagement/campaign', async (req, res) => {
      try {
        const { userIds, type, metadata } = req.body;
        const result = await this.reEngagement.runCampaign(userIds, type, metadata);
        res.json({ success: true, data: result });
      } catch (error: any) {
        this.logger.error('Run campaign failed', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Module status
    router.get('/status', async (req, res) => {
      const stats = await this.getEngagementStats();
      res.json({ success: true, data: stats });
    });
  }

  /**
   * Get health metrics
   */
  protected async onGetHealthMetrics() {
    const stats = await this.getEngagementStats();

    return {
      activeUsers: stats.activeUsers,
      churnRiskHigh: stats.churnRiskHigh,
      sentimentScore: stats.avgSentiment || 0,
      errorRate: 0, // Track errors if needed
    };
  }

  /**
   * Define scheduled jobs
   */
  protected onGetScheduledJobs(): ScheduledJob[] {
    return [
      {
        id: 'daily-churn-check',
        name: 'Daily Churn Check',
        schedule: '0 9 * * *', // 9 AM daily
        handler: this.runDailyChurnCheck.bind(this),
        enabled: true,
        description: 'Check for users at risk of churning and update health scores',
      },
      {
        id: 'weekly-engagement-push',
        name: 'Weekly Engagement Push',
        schedule: '0 10 * * 1', // 10 AM every Monday
        handler: this.runWeeklyEngagementPush.bind(this),
        enabled: true,
        description: 'Send re-engagement messages to inactive users',
      },
      {
        id: 'hourly-health-update',
        name: 'Hourly Health Score Update',
        schedule: '0 * * * *', // Every hour
        handler: this.runHourlyHealthUpdate.bind(this),
        enabled: true,
        description: 'Update customer health scores based on recent activity',
      },
    ];
  }

  // Command Handlers
  // ==================

  /**
   * Analyze sentiment of text
   */
  private async handleAnalyzeSentiment(params: any): Promise<any> {
    const { text, context } = params;

    if (!text) {
      throw new Error('Text parameter is required');
    }

    const result = await this.sentimentAnalyzer.analyze(text, context);

    this.logger.info('Sentiment analysis completed', {
      sentiment: result.sentiment,
      score: result.score,
      context
    });

    return result;
  }

  /**
   * Check churn risk for a user
   */
  private async handleCheckChurnRisk(params: any): Promise<any> {
    const { userId } = params;

    if (!userId) {
      throw new Error('userId parameter is required');
    }

    const result = await this.churnDetector.checkUser(userId);

    this.logger.info('Churn risk checked', {
      userId,
      churnRisk: result.churnRisk,
      healthScore: result.healthScore
    });

    return result;
  }

  /**
   * Get users at risk of churning
   */
  private async handleGetChurnUsers(params: any): Promise<any> {
    const { threshold } = params;

    const users = await this.churnDetector.getAtRiskUsers(threshold);

    this.logger.info('Retrieved at-risk users', { count: users.length, threshold });

    return { users, count: users.length };
  }

  /**
   * Send engagement message
   */
  private async handleSendEngagement(params: any): Promise<any> {
    const { userId, type, metadata } = params;

    if (!userId || !type) {
      throw new Error('userId and type parameters are required');
    }

    const result = await this.reEngagement.sendEngagementMessage(userId, type, metadata);

    this.logger.info('Engagement message sent', { userId, type });

    return result;
  }

  /**
   * Get health score for user
   */
  private async handleGetHealthScore(params: any): Promise<any> {
    const { userId } = params;

    if (!userId) {
      throw new Error('userId parameter is required');
    }

    const health = await this.prisma.customerHealth.findUnique({
      where: { userId },
      include: { User: { select: { email: true, username: true } } }
    });

    if (!health) {
      throw new Error(`Health record not found for user ${userId}`);
    }

    return health;
  }

  /**
   * Update health score for user
   */
  private async handleUpdateHealthScore(params: any): Promise<any> {
    const { userId, updates } = params;

    if (!userId || !updates) {
      throw new Error('userId and updates parameters are required');
    }

    const result = await this.churnDetector.updateHealthScore(userId, updates);

    this.logger.info('Health score updated', { userId, updates });

    return result;
  }

  /**
   * Handle chatbot query
   */
  private async handleChatbotQuery(params: any): Promise<any> {
    const { query, userId, context } = params;

    if (!query) {
      throw new Error('query parameter is required');
    }

    // TODO: Integrate with ChatAssistant from src/ui/chatbot
    // For now, return a simple response
    this.logger.info('Chatbot query received', { query, userId });

    return {
      response: `I received your query: "${query}". Chatbot integration coming soon!`,
      sentiment: await this.sentimentAnalyzer.analyze(query),
      timestamp: new Date()
    };
  }

  // Scheduled Job Handlers
  // =======================

  /**
   * Daily churn check job
   */
  private async runDailyChurnCheck(): Promise<void> {
    this.logger.info('Running daily churn check...');

    try {
      // Get all active users
      const users = await this.prisma.user.findMany({
        where: {
          CustomerHealth: {
            isNot: null
          }
        },
        include: { CustomerHealth: true }
      });

      let updatedCount = 0;
      let highRiskCount = 0;

      // Check each user
      for (const user of users) {
        try {
          const result = await this.churnDetector.checkUser(user.id);

          if (result.churnRisk === 'HIGH' || result.churnRisk === 'CRITICAL') {
            highRiskCount++;

            // Send alert for critical cases
            if (result.churnRisk === 'CRITICAL') {
              this.logger.warn('Critical churn risk detected', {
                userId: user.id,
                email: user.email,
                healthScore: result.healthScore
              });
            }
          }

          updatedCount++;
        } catch (error: any) {
          this.logger.error('Failed to check user churn', { userId: user.id, error: error.message });
        }
      }

      this.logger.info('Daily churn check completed', {
        totalUsers: users.length,
        updated: updatedCount,
        highRisk: highRiskCount
      });
    } catch (error: any) {
      this.logger.error('Daily churn check failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Weekly engagement push job
   */
  private async runWeeklyEngagementPush(): Promise<void> {
    this.logger.info('Running weekly engagement push...');

    try {
      // Get users who haven't logged in for 7+ days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const inactiveUsers = await this.prisma.user.findMany({
        where: {
          OR: [
            { lastLoginAt: { lt: sevenDaysAgo } },
            { lastLoginAt: null }
          ],
          CustomerHealth: {
            churnRisk: {
              in: ['MEDIUM', 'HIGH', 'CRITICAL']
            }
          }
        },
        include: { CustomerHealth: true }
      });

      let sentCount = 0;
      let failedCount = 0;

      // Send engagement messages
      for (const user of inactiveUsers) {
        try {
          await this.reEngagement.sendEngagementMessage(
            user.id,
            'weekly_checkin',
            { lastLogin: user.lastLoginAt }
          );
          sentCount++;
        } catch (error: any) {
          this.logger.error('Failed to send engagement message', { userId: user.id, error: error.message });
          failedCount++;
        }
      }

      this.logger.info('Weekly engagement push completed', {
        totalUsers: inactiveUsers.length,
        sent: sentCount,
        failed: failedCount
      });
    } catch (error: any) {
      this.logger.error('Weekly engagement push failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Hourly health score update job
   */
  private async runHourlyHealthUpdate(): Promise<void> {
    this.logger.info('Running hourly health score update...');

    try {
      // Get recently active users (last 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const recentUsers = await this.prisma.user.findMany({
        where: {
          lastLoginAt: { gte: twoHoursAgo }
        },
        include: { CustomerHealth: true }
      });

      let updatedCount = 0;

      // Update health scores for recently active users
      for (const user of recentUsers) {
        try {
          await this.churnDetector.checkUser(user.id);
          updatedCount++;
        } catch (error: any) {
          this.logger.error('Failed to update health score', { userId: user.id, error: error.message });
        }
      }

      this.logger.info('Hourly health update completed', {
        recentUsers: recentUsers.length,
        updated: updatedCount
      });
    } catch (error: any) {
      this.logger.error('Hourly health update failed', { error: error.message });
    }
  }

  // Utility Methods
  // ===============

  /**
   * Get engagement statistics
   */
  private async getEngagementStats() {
    const [
      totalUsers,
      activeUsers,
      churnRiskHigh,
      churnRiskCritical,
      avgHealthScore,
      recentTickets
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      }),
      this.prisma.customerHealth.count({
        where: { churnRisk: 'HIGH' }
      }),
      this.prisma.customerHealth.count({
        where: { churnRisk: 'CRITICAL' }
      }),
      this.prisma.customerHealth.aggregate({
        _avg: { healthScore: true }
      }),
      this.prisma.supportTicket.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      churnRiskHigh,
      churnRiskCritical,
      avgHealthScore: avgHealthScore._avg.healthScore || 0,
      avgSentiment: 0, // Placeholder for sentiment tracking
      recentTickets,
      timestamp: new Date()
    };
  }
}

// Export singleton instance
export default new EngagementModule();
