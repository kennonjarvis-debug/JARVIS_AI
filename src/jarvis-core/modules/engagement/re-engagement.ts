/**
 * Re-Engagement Service
 *
 * Handles proactive user re-engagement and retention campaigns
 */

import { PrismaClient } from '@prisma/client';
import { EngagementMessage, EngagementMessageType, EngagementCampaignResult } from './types';
import { v4 as uuidv4 } from 'uuid';

export class ReEngagementService {
  private prisma: PrismaClient;

  // Message templates
  private messageTemplates: Record<EngagementMessageType, (context: any) => EngagementMessage>;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    // Initialize message templates
    this.messageTemplates = {
      welcome: this.createWelcomeMessage.bind(this),
      onboarding: this.createOnboardingMessage.bind(this),
      weekly_checkin: this.createWeeklyCheckinMessage.bind(this),
      feature_highlight: this.createFeatureHighlightMessage.bind(this),
      win_back: this.createWinBackMessage.bind(this),
      re_engagement: this.createReEngagementMessage.bind(this),
      milestone: this.createMilestoneMessage.bind(this),
      feedback_request: this.createFeedbackRequestMessage.bind(this),
      custom: this.createCustomMessage.bind(this)
    };
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    // Placeholder for initialization logic
  }

  /**
   * Send engagement message to a user
   */
  async sendEngagementMessage(
    userId: string,
    type: EngagementMessageType,
    metadata?: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true, firstName: true, lastName: true }
      });

      if (!user) {
        return { success: false, error: `User ${userId} not found` };
      }

      // Generate message
      const message = this.messageTemplates[type]({ user, ...metadata });

      // Send message (placeholder - integrate with email service)
      const messageId = await this.sendEmail(user.email, message);

      // Log the engagement
      await this.logEngagementEvent(userId, type, messageId, metadata);

      return { success: true, messageId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Run engagement campaign for multiple users
   */
  async runCampaign(
    userIds: string[],
    type: EngagementMessageType,
    metadata?: any
  ): Promise<EngagementCampaignResult> {
    const campaignId = uuidv4();
    const startedAt = new Date();

    let sentCount = 0;
    const failedUsers: string[] = [];

    // Send to all users
    for (const userId of userIds) {
      const result = await this.sendEngagementMessage(userId, type, { ...metadata, campaignId });

      if (result.success) {
        sentCount++;
      } else {
        failedUsers.push(userId);
      }
    }

    const completedAt = new Date();

    return {
      campaignId,
      type,
      totalUsers: userIds.length,
      sentCount,
      failedCount: failedUsers.length,
      failedUsers,
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime()
    };
  }

  /**
   * Send targeted campaign to at-risk users
   */
  async sendChurnPreventionCampaign(): Promise<EngagementCampaignResult> {
    // Get users at high risk
    const atRiskUsers = await this.prisma.customerHealth.findMany({
      where: {
        churnRisk: { in: ['HIGH', 'CRITICAL'] }
      },
      select: { userId: true }
    });

    const userIds = atRiskUsers.map(u => u.userId);

    return this.runCampaign(userIds, 'win_back', {
      reason: 'churn_prevention'
    });
  }

  /**
   * Send weekly check-in to inactive users
   */
  async sendWeeklyCheckin(): Promise<EngagementCampaignResult> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const inactiveUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { lastLoginAt: { lt: sevenDaysAgo } },
          { lastLoginAt: null }
        ]
      },
      select: { id: true }
    });

    const userIds = inactiveUsers.map(u => u.id);

    return this.runCampaign(userIds, 'weekly_checkin', {
      daysInactive: 7
    });
  }

  // Private Methods - Message Templates
  // ====================================

  private createWelcomeMessage(context: any): EngagementMessage {
    const { user } = context;
    const name = user.firstName || user.username;

    return {
      type: 'welcome',
      subject: `Welcome to AI DAWG, ${name}! 🎵`,
      body: `
        <h2>Welcome to AI DAWG!</h2>
        <p>Hi ${name},</p>
        <p>We're thrilled to have you join our community of music creators. AI DAWG is your AI-powered music production assistant, designed to help you create amazing music faster than ever.</p>
        <p>Here's what you can do:</p>
        <ul>
          <li>🎤 Generate vocals and toplines with AI</li>
          <li>🎹 Create melodies and chord progressions</li>
          <li>🎼 Produce complete tracks</li>
          <li>🎙️ Clone voices for custom vocal tracks</li>
        </ul>
        <p>Ready to get started?</p>
      `,
      ctaText: 'Create Your First Project',
      ctaUrl: '/projects/new'
    };
  }

  private createOnboardingMessage(context: any): EngagementMessage {
    const { user } = context;
    const name = user.firstName || user.username;

    return {
      type: 'onboarding',
      subject: `${name}, let's get you started with AI DAWG`,
      body: `
        <h2>Quick Start Guide</h2>
        <p>Hi ${name},</p>
        <p>We noticed you haven't created your first project yet. Let us help you get started!</p>
        <p><strong>In just 5 minutes, you can:</strong></p>
        <ol>
          <li>Create a new project</li>
          <li>Generate lyrics with AI</li>
          <li>Create a melody</li>
          <li>Export your track</li>
        </ol>
        <p>Need help? Check out our tutorials or schedule a 1-on-1 onboarding call.</p>
      `,
      ctaText: 'Watch Tutorial',
      ctaUrl: '/tutorials/getting-started'
    };
  }

  private createWeeklyCheckinMessage(context: any): EngagementMessage {
    const { user } = context;
    const name = user.firstName || user.username;

    return {
      type: 'weekly_checkin',
      subject: `${name}, we miss you! Check out what's new 🎵`,
      body: `
        <h2>We Miss You!</h2>
        <p>Hi ${name},</p>
        <p>It's been a while since we've seen you. We've been working hard to make AI DAWG even better!</p>
        <p><strong>What's new:</strong></p>
        <ul>
          <li>✨ Improved vocal generation quality</li>
          <li>🎼 New melody patterns and styles</li>
          <li>⚡ Faster processing times</li>
          <li>🎹 More instruments and sounds</li>
        </ul>
        <p>Come back and create something amazing today!</p>
      `,
      ctaText: 'Open AI DAWG',
      ctaUrl: '/dashboard'
    };
  }

  private createFeatureHighlightMessage(context: any): EngagementMessage {
    const { user, feature } = context;
    const name = user.firstName || user.username;

    return {
      type: 'feature_highlight',
      subject: `${name}, have you tried ${feature?.name || 'this feature'}?`,
      body: `
        <h2>Feature Spotlight: ${feature?.name || 'New Feature'}</h2>
        <p>Hi ${name},</p>
        <p>We think you'll love this feature!</p>
        <p>${feature?.description || 'Check out our latest feature to supercharge your music production.'}</p>
        <p>Try it today and let us know what you think.</p>
      `,
      ctaText: `Try ${feature?.name || 'This Feature'}`,
      ctaUrl: feature?.url || '/features'
    };
  }

  private createWinBackMessage(context: any): EngagementMessage {
    const { user } = context;
    const name = user.firstName || user.username;

    return {
      type: 'win_back',
      subject: `${name}, we want you back! Special offer inside 🎁`,
      body: `
        <h2>We Want You Back!</h2>
        <p>Hi ${name},</p>
        <p>We noticed you haven't been active recently. We'd love to have you back!</p>
        <p>To show our appreciation, we're offering you:</p>
        <ul>
          <li>🎁 Free premium access for 1 month</li>
          <li>📚 Exclusive tutorial content</li>
          <li>🎵 Priority support</li>
        </ul>
        <p>Don't miss out on this limited-time offer!</p>
      `,
      ctaText: 'Claim Your Offer',
      ctaUrl: '/promotions/win-back'
    };
  }

  private createReEngagementMessage(context: any): EngagementMessage {
    const { user } = context;
    const name = user.firstName || user.username;

    return {
      type: 're_engagement',
      subject: `${name}, let's create something amazing together`,
      body: `
        <h2>Ready to Create?</h2>
        <p>Hi ${name},</p>
        <p>Your creativity is what makes AI DAWG special. We're here to help you bring your musical ideas to life.</p>
        <p>What would you like to create today?</p>
        <ul>
          <li>🎤 A catchy topline</li>
          <li>🎵 A full instrumental</li>
          <li>🎼 Complete song arrangement</li>
        </ul>
      `,
      ctaText: 'Start Creating',
      ctaUrl: '/projects/new'
    };
  }

  private createMilestoneMessage(context: any): EngagementMessage {
    const { user, milestone } = context;
    const name = user.firstName || user.username;

    return {
      type: 'milestone',
      subject: `🎉 Congratulations ${name}! ${milestone?.title || 'You hit a milestone!'}`,
      body: `
        <h2>Milestone Achievement! 🎉</h2>
        <p>Hi ${name},</p>
        <p>Congratulations! You've ${milestone?.description || 'reached an important milestone'}!</p>
        <p>Keep up the amazing work. We can't wait to see what you create next!</p>
      `,
      ctaText: 'View Your Stats',
      ctaUrl: '/profile/stats'
    };
  }

  private createFeedbackRequestMessage(context: any): EngagementMessage {
    const { user } = context;
    const name = user.firstName || user.username;

    return {
      type: 'feedback_request',
      subject: `${name}, we'd love your feedback on AI DAWG`,
      body: `
        <h2>Your Feedback Matters</h2>
        <p>Hi ${name},</p>
        <p>We're constantly working to improve AI DAWG, and your feedback is invaluable to us.</p>
        <p>Could you spare 2 minutes to share your thoughts?</p>
        <p>As a thank you, we'll give you 100 free credits!</p>
      `,
      ctaText: 'Give Feedback',
      ctaUrl: '/feedback'
    };
  }

  private createCustomMessage(context: any): EngagementMessage {
    return {
      type: 'custom',
      subject: context.subject || 'Message from AI DAWG',
      body: context.body || '',
      ctaText: context.ctaText,
      ctaUrl: context.ctaUrl,
      metadata: context.metadata
    };
  }

  // Private Methods - Utilities
  // ============================

  /**
   * Send email (placeholder - integrate with real email service)
   */
  private async sendEmail(to: string, message: EngagementMessage): Promise<string> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[EMAIL] Sending "${message.subject}" to ${to}`);

    // For now, just return a mock message ID
    return `msg_${uuidv4()}`;
  }

  /**
   * Log engagement event
   */
  private async logEngagementEvent(
    userId: string,
    type: EngagementMessageType,
    messageId: string,
    metadata?: any
  ): Promise<void> {
    // TODO: Log to database or analytics service
    console.log(`[ENGAGEMENT] User ${userId} - Type: ${type} - Message: ${messageId}`);
  }
}
