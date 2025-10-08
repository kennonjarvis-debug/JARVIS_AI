/**
 * Jarvis Notification Service
 * Handles notifications for MEDIUM and HIGH clearance actions
 *
 * Channels:
 * - Slack
 * - Email
 * - Webhooks
 *
 * Features:
 * - Multi-channel delivery
 * - Rate limiting to prevent spam
 * - Retry logic for failed deliveries
 * - Notification templates
 * - Delivery tracking
 */

import { EventEmitter } from 'events';
import { logger } from '../../backend/utils/logger';
import { JarvisAction } from '../core/clearance-system';

/**
 * Notification channel types
 */
export enum NotificationChannel {
  SLACK = 'slack',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
}

/**
 * Notification level
 */
export enum NotificationLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
    channel?: string;
    username?: string;
  };
  email?: {
    enabled: boolean;
    from?: string;
    to?: string[];
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      auth?: {
        user: string;
        pass: string;
      };
    };
  };
  webhook?: {
    enabled: boolean;
    url?: string;
    headers?: Record<string, string>;
  };
  rateLimit: {
    maxPerHour: number;
    maxPerDay: number;
  };
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  id: string;
  level: NotificationLevel;
  title: string;
  message: string;
  action?: JarvisAction;
  approvalLink?: string;
  metadata?: Record<string, any>;
  channels: NotificationChannel[];
  timestamp: Date;
}

/**
 * Notification delivery result
 */
export interface NotificationResult {
  notificationId: string;
  channel: NotificationChannel;
  success: boolean;
  deliveredAt?: Date;
  error?: string;
  retryCount: number;
}

/**
 * Notification history entry
 */
export interface NotificationHistory {
  payload: NotificationPayload;
  results: NotificationResult[];
  createdAt: Date;
}

/**
 * Notification Service - Handles multi-channel notifications
 */
export class NotificationService extends EventEmitter {
  private static instance: NotificationService;
  private config: NotificationConfig = {
    slack: {
      enabled: false,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || '#jarvis-alerts',
      username: 'Jarvis AI',
    },
    email: {
      enabled: false,
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO?.split(',') || [],
      smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined,
      },
    },
    webhook: {
      enabled: false,
      url: process.env.WEBHOOK_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    },
    rateLimit: {
      maxPerHour: 30,
      maxPerDay: 200,
    },
  };

  private notificationHistory: NotificationHistory[] = [];
  private maxHistorySize = 1000;
  private recentNotifications: Date[] = [];

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Notify operator about an action
   */
  async notifyOperator(
    action: JarvisAction,
    level: 'medium' | 'high',
    approvalEndpoint?: string
  ): Promise<void> {
    // Check rate limits
    if (!this.checkRateLimit()) {
      logger.warn('Notification rate limit exceeded - skipping notification', {
        actionId: action.id,
      });
      return;
    }

    // Determine notification level
    const notificationLevel = level === 'high'
      ? NotificationLevel.CRITICAL
      : NotificationLevel.WARNING;

    // Build approval link if provided
    const approvalLink = approvalEndpoint
      ? `${process.env.API_BASE_URL || 'http://localhost:3001'}${approvalEndpoint}`
      : undefined;

    // Create notification payload
    const payload: NotificationPayload = {
      id: this.generateNotificationId(),
      level: notificationLevel,
      title: level === 'high'
        ? `🚨 HIGH Clearance Action Requires Approval`
        : `⚠️ MEDIUM Clearance Action Scheduled`,
      message: this.buildNotificationMessage(action, level, approvalLink),
      action,
      approvalLink,
      metadata: {
        actionId: action.id,
        moduleName: action.moduleName,
        actionType: action.actionType,
        clearanceLevel: action.clearanceLevel,
      },
      channels: this.determineChannels(level),
      timestamp: new Date(),
    };

    logger.info('Sending notification', {
      notificationId: payload.id,
      level,
      channels: payload.channels,
    });

    // Send notification
    await this.sendNotification(payload);

    // Record in recent notifications for rate limiting
    this.recentNotifications.push(new Date());
    this.cleanupRecentNotifications();

    this.emit('notification:sent', payload);
  }

  /**
   * Send a custom notification
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    const results: NotificationResult[] = [];

    // Send to each channel
    for (const channel of payload.channels) {
      try {
        const result = await this.sendToChannel(payload, channel);
        results.push(result);
      } catch (error) {
        logger.error('Failed to send notification to channel', {
          channel,
          error: (error as Error).message,
        });
        results.push({
          notificationId: payload.id,
          channel,
          success: false,
          error: (error as Error).message,
          retryCount: 0,
        });
      }
    }

    // Add to history
    this.addToHistory({
      payload,
      results,
      createdAt: new Date(),
    });

    // Retry failed notifications
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      setTimeout(() => {
        this.retryFailedNotifications(payload, failedResults);
      }, 5000); // Retry after 5 seconds
    }
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(
    payload: NotificationPayload,
    channel: NotificationChannel
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      notificationId: payload.id,
      channel,
      success: false,
      retryCount: 0,
    };

    try {
      switch (channel) {
        case NotificationChannel.SLACK:
          await this.sendToSlack(payload);
          break;

        case NotificationChannel.EMAIL:
          await this.sendToEmail(payload);
          break;

        case NotificationChannel.WEBHOOK:
          await this.sendToWebhook(payload);
          break;

        default:
          throw new Error(`Unknown notification channel: ${channel}`);
      }

      result.success = true;
      result.deliveredAt = new Date();

      logger.info('Notification sent successfully', {
        notificationId: payload.id,
        channel,
      });
    } catch (error) {
      result.error = (error as Error).message;
      logger.error('Failed to send notification', {
        notificationId: payload.id,
        channel,
        error: result.error,
      });
    }

    return result;
  }

  /**
   * Send notification to Slack
   */
  private async sendToSlack(payload: NotificationPayload): Promise<void> {
    if (!this.config.slack?.enabled || !this.config.slack.webhookUrl) {
      throw new Error('Slack is not configured');
    }

    const slackPayload = {
      channel: this.config.slack.channel,
      username: this.config.slack.username,
      icon_emoji: this.getEmojiForLevel(payload.level),
      text: payload.title,
      attachments: [
        {
          color: this.getColorForLevel(payload.level),
          text: payload.message,
          fields: [
            {
              title: 'Action Type',
              value: payload.action?.actionType || 'N/A',
              short: true,
            },
            {
              title: 'Module',
              value: payload.action?.moduleName || 'N/A',
              short: true,
            },
            {
              title: 'Clearance Level',
              value: payload.action?.clearanceLevel.toUpperCase() || 'N/A',
              short: true,
            },
            {
              title: 'Status',
              value: payload.action?.status || 'N/A',
              short: true,
            },
          ],
          actions: payload.approvalLink ? [
            {
              type: 'button',
              text: 'Approve Action',
              url: payload.approvalLink,
              style: 'primary',
            },
          ] : undefined,
          footer: 'Jarvis AI Operator',
          ts: Math.floor(payload.timestamp.getTime() / 1000),
        },
      ],
    };

    const response = await fetch(this.config.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
  }

  /**
   * Send notification via email
   */
  private async sendToEmail(payload: NotificationPayload): Promise<void> {
    if (!this.config.email?.enabled) {
      throw new Error('Email is not configured');
    }

    // This is a stub implementation
    // In production, use nodemailer or similar
    logger.info('Email notification (stub)', {
      to: this.config.email.to,
      subject: payload.title,
      body: payload.message,
    });

    // Simulate email sending
    // In production: await transporter.sendMail({ from, to, subject, html })
  }

  /**
   * Send notification to webhook
   */
  private async sendToWebhook(payload: NotificationPayload): Promise<void> {
    if (!this.config.webhook?.enabled || !this.config.webhook.url) {
      throw new Error('Webhook is not configured');
    }

    const webhookPayload = {
      id: payload.id,
      level: payload.level,
      title: payload.title,
      message: payload.message,
      action: payload.action,
      approvalLink: payload.approvalLink,
      metadata: payload.metadata,
      timestamp: payload.timestamp.toISOString(),
    };

    const response = await fetch(this.config.webhook.url, {
      method: 'POST',
      headers: {
        ...this.config.webhook.headers,
        'X-Jarvis-Notification-ID': payload.id,
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.statusText}`);
    }
  }

  /**
   * Retry failed notifications
   */
  private async retryFailedNotifications(
    payload: NotificationPayload,
    failedResults: NotificationResult[]
  ): Promise<void> {
    const maxRetries = 3;

    for (const result of failedResults) {
      if (result.retryCount >= maxRetries) {
        logger.error('Max retries exceeded for notification', {
          notificationId: payload.id,
          channel: result.channel,
        });
        continue;
      }

      logger.info('Retrying failed notification', {
        notificationId: payload.id,
        channel: result.channel,
        retryCount: result.retryCount + 1,
      });

      try {
        const retryResult = await this.sendToChannel(payload, result.channel);
        retryResult.retryCount = result.retryCount + 1;

        if (!retryResult.success && retryResult.retryCount < maxRetries) {
          setTimeout(() => {
            this.retryFailedNotifications(payload, [retryResult]);
          }, 10000); // Retry after 10 seconds
        }
      } catch (error) {
        logger.error('Retry failed', {
          notificationId: payload.id,
          channel: result.channel,
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Build notification message
   */
  private buildNotificationMessage(
    action: JarvisAction,
    level: 'medium' | 'high',
    approvalLink?: string
  ): string {
    const parts: string[] = [];

    if (level === 'high') {
      parts.push(`**Action Requires Approval**`);
      parts.push(`\n\n**Description:** ${action.description}`);
      parts.push(`\n**Module:** ${action.moduleName}`);
      parts.push(`\n**Action Type:** ${action.actionType}`);
      parts.push(`\n**Requested At:** ${action.requestedAt.toISOString()}`);

      if (approvalLink) {
        parts.push(`\n\n**Approval Required:** Please approve or reject this action within 24 hours.`);
        parts.push(`\n**Approval Link:** ${approvalLink}`);
      }
    } else {
      parts.push(`**Action Scheduled for Execution**`);
      parts.push(`\n\n**Description:** ${action.description}`);
      parts.push(`\n**Module:** ${action.moduleName}`);
      parts.push(`\n**Action Type:** ${action.actionType}`);
      parts.push(`\n**Scheduled At:** ${action.requestedAt.toISOString()}`);
      parts.push(`\n**Will Execute In:** 5 minutes`);
      parts.push(`\n\n**Note:** This action will execute automatically unless cancelled.`);
    }

    return parts.join('');
  }

  /**
   * Determine notification channels based on level
   */
  private determineChannels(level: 'medium' | 'high'): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    if (level === 'high') {
      // HIGH actions go to all channels
      if (this.config.slack?.enabled) channels.push(NotificationChannel.SLACK);
      if (this.config.email?.enabled) channels.push(NotificationChannel.EMAIL);
      if (this.config.webhook?.enabled) channels.push(NotificationChannel.WEBHOOK);
    } else {
      // MEDIUM actions go to Slack and webhook only
      if (this.config.slack?.enabled) channels.push(NotificationChannel.SLACK);
      if (this.config.webhook?.enabled) channels.push(NotificationChannel.WEBHOOK);
    }

    return channels;
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(): boolean {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const lastHour = this.recentNotifications.filter(t => t >= oneHourAgo).length;
    const lastDay = this.recentNotifications.filter(t => t >= oneDayAgo).length;

    return (
      lastHour < this.config.rateLimit.maxPerHour &&
      lastDay < this.config.rateLimit.maxPerDay
    );
  }

  /**
   * Cleanup old recent notifications
   */
  private cleanupRecentNotifications(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.recentNotifications = this.recentNotifications.filter(t => t >= oneDayAgo);
  }

  /**
   * Add to notification history
   */
  private addToHistory(entry: NotificationHistory): void {
    this.notificationHistory.push(entry);

    // Trim history
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get emoji for notification level
   */
  private getEmojiForLevel(level: NotificationLevel): string {
    switch (level) {
      case NotificationLevel.INFO: return ':information_source:';
      case NotificationLevel.WARNING: return ':warning:';
      case NotificationLevel.ERROR: return ':x:';
      case NotificationLevel.CRITICAL: return ':rotating_light:';
      default: return ':bell:';
    }
  }

  /**
   * Get color for notification level
   */
  private getColorForLevel(level: NotificationLevel): string {
    switch (level) {
      case NotificationLevel.INFO: return '#36a64f';
      case NotificationLevel.WARNING: return '#ff9800';
      case NotificationLevel.ERROR: return '#f44336';
      case NotificationLevel.CRITICAL: return '#9c27b0';
      default: return '#2196f3';
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<NotificationConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    logger.info('Notification configuration updated');
  }

  /**
   * Get configuration
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Get notification history
   */
  getHistory(limit = 100): NotificationHistory[] {
    return this.notificationHistory.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalNotifications: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    deliveryRate: number;
    notificationsLastHour: number;
    notificationsLastDay: number;
    rateLimitStatus: {
      hourlyLimit: number;
      dailyLimit: number;
      hourlyUsed: number;
      dailyUsed: number;
    };
  } {
    const totalNotifications = this.notificationHistory.length;
    const allResults = this.notificationHistory.flatMap(h => h.results);
    const successfulDeliveries = allResults.filter(r => r.success).length;
    const failedDeliveries = allResults.filter(r => !r.success).length;
    const deliveryRate = totalNotifications > 0
      ? (successfulDeliveries / allResults.length) * 100
      : 0;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const notificationsLastHour = this.recentNotifications.filter(t => t >= oneHourAgo).length;
    const notificationsLastDay = this.recentNotifications.filter(t => t >= oneDayAgo).length;

    return {
      totalNotifications,
      successfulDeliveries,
      failedDeliveries,
      deliveryRate,
      notificationsLastHour,
      notificationsLastDay,
      rateLimitStatus: {
        hourlyLimit: this.config.rateLimit.maxPerHour,
        dailyLimit: this.config.rateLimit.maxPerDay,
        hourlyUsed: notificationsLastHour,
        dailyUsed: notificationsLastDay,
      },
    };
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
