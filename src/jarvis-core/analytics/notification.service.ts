/**
 * Notification Service
 *
 * Sends alerts via Slack and other channels
 */

import { logger } from '../../backend/utils/logger';

export interface Alert {
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  details?: any;
}

export class NotificationService {
  private slackWebhookUrl?: string;

  constructor(slackWebhookUrl?: string) {
    this.slackWebhookUrl = slackWebhookUrl;
  }

  /**
   * Send alert notification
   */
  async sendAlert(alert: Alert): Promise<void> {
    // Log locally
    this.logAlert(alert);

    // Send to Slack if configured
    if (this.slackWebhookUrl) {
      await this.sendToSlack(alert);
    }
  }

  /**
   * Log alert to console
   */
  private logAlert(alert: Alert): void {
    const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
    logger.warn(`${emoji} ${alert.title}: ${alert.message}`);

    if (alert.details) {
      logger.info('Alert details:', alert.details);
    }
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(alert: Alert): Promise<void> {
    if (!this.slackWebhookUrl) return;

    try {
      const color = alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'good';

      const payload = {
        text: `*${alert.title}*`,
        attachments: [
          {
            color,
            text: alert.message,
            fields: alert.details ? this.formatDetails(alert.details) : [],
            footer: 'Jarvis Cloud Intelligence',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.error(`Failed to send Slack notification: ${response.status}`);
      } else {
        logger.info('✅ Slack notification sent successfully');
      }
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Format alert details for Slack
   */
  private formatDetails(details: any): Array<{ title: string; value: string; short: boolean }> {
    const fields: Array<{ title: string; value: string; short: boolean }> = [];

    if (details.module) {
      fields.push({ title: 'Module', value: details.module, short: true });
    }

    if (details.score !== undefined) {
      fields.push({ title: 'Score', value: `${details.score}/100`, short: true });
    }

    if (details.passRate !== undefined) {
      fields.push({ title: 'Pass Rate', value: `${details.passRate.toFixed(1)}%`, short: true });
    }

    if (details.successRate !== undefined) {
      fields.push({ title: 'Success Rate', value: `${details.successRate.toFixed(1)}%`, short: true });
    }

    if (details.issues && Array.isArray(details.issues) && details.issues.length > 0) {
      fields.push({
        title: 'Issues',
        value: details.issues.slice(0, 3).join('\n'),
        short: false,
      });
    }

    if (details.recommendations && Array.isArray(details.recommendations) && details.recommendations.length > 0) {
      fields.push({
        title: 'Recommendations',
        value: details.recommendations.slice(0, 3).join('\n'),
        short: false,
      });
    }

    return fields;
  }
}
