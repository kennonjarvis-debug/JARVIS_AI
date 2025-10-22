import { defaultLogger } from './logger.service.js';
import nodemailer from 'nodemailer';
import axios from 'axios';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertChannel = 'email' | 'slack' | 'webhook';

export interface Alert {
  id: string;
  name: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  metadata?: Record<string, any>;
  acknowledged?: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface AlertCondition {
  id: string;
  name: string;
  description: string;
  checkFn: () => Promise<boolean> | boolean;
  severity: AlertSeverity;
  channels: AlertChannel[];
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
  metadata?: Record<string, any>;
}

export interface AlertConfig {
  channels: {
    email?: {
      enabled: boolean;
      from: string;
      to: string[];
      smtp?: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
      channel?: string;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
    };
  };
}

export class AlertingService {
  private alerts: Map<string, Alert> = new Map();
  private conditions: Map<string, AlertCondition> = new Map();
  private config: AlertConfig;
  private emailTransporter?: nodemailer.Transporter;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config?: AlertConfig) {
    this.config = config || this.getDefaultConfig();
    this.initialize();
  }

  /**
   * Get default configuration from environment
   */
  private getDefaultConfig(): AlertConfig {
    return {
      channels: {
        email: {
          enabled: !!process.env.ALERT_EMAIL_ENABLED,
          from: process.env.ALERT_EMAIL_FROM || 'alerts@jarvis.ai',
          to: process.env.ALERT_EMAIL_TO?.split(',') || [],
          smtp: process.env.SMTP_HOST ? {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || '',
            },
          } : undefined,
        },
        slack: {
          enabled: !!process.env.ALERT_SLACK_ENABLED,
          webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
          channel: process.env.ALERT_SLACK_CHANNEL,
        },
        webhook: {
          enabled: !!process.env.ALERT_WEBHOOK_ENABLED,
          url: process.env.ALERT_WEBHOOK_URL || '',
          headers: process.env.ALERT_WEBHOOK_HEADERS
            ? JSON.parse(process.env.ALERT_WEBHOOK_HEADERS)
            : undefined,
        },
      },
    };
  }

  /**
   * Initialize alerting service
   */
  private initialize() {
    // Setup email transport if configured
    if (this.config.channels.email?.enabled && this.config.channels.email.smtp) {
      try {
        this.emailTransporter = nodemailer.createTransport(this.config.channels.email.smtp);
        defaultLogger.info('Email alerting configured');
      } catch (error) {
        defaultLogger.error('Failed to configure email alerting', error);
      }
    }

    // Register default alert conditions
    this.registerDefaultConditions();

    // Start periodic checks
    this.startPeriodicChecks();

    defaultLogger.info('Alerting service initialized');
  }

  /**
   * Register default alert conditions
   */
  private registerDefaultConditions() {
    // High error rate
    this.registerCondition({
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Error rate exceeds 10 errors per minute',
      severity: 'critical',
      channels: ['email', 'slack'],
      enabled: true,
      cooldownMinutes: 15,
      checkFn: async () => {
        const { errorTracker } = await import('./error-tracker.service.js');
        return errorTracker.isErrorRateHigh(10);
      },
    });

    // High memory usage
    this.registerCondition({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      description: 'Memory usage exceeds 90%',
      severity: 'warning',
      channels: ['email', 'slack'],
      enabled: true,
      cooldownMinutes: 15,
      checkFn: () => {
        const memUsage = process.memoryUsage();
        const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        return heapPercent > 90;
      },
    });

    // Service unhealthy
    this.registerCondition({
      id: 'service_unhealthy',
      name: 'Service Unhealthy',
      description: 'Health check reports unhealthy status',
      severity: 'critical',
      channels: ['email', 'slack', 'webhook'],
      enabled: true,
      cooldownMinutes: 5,
      checkFn: async () => {
        const { healthCheckService } = await import('../api/health/index.js');
        const health = await healthCheckService.performHealthCheck();
        return health.status === 'unhealthy';
      },
    });
  }

  /**
   * Start periodic alert condition checks
   */
  private startPeriodicChecks() {
    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkAllConditions();
    }, 30000);
  }

  /**
   * Stop periodic checks
   */
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Register an alert condition
   */
  registerCondition(condition: AlertCondition) {
    this.conditions.set(condition.id, condition);
    defaultLogger.info(`Registered alert condition: ${condition.name}`);
  }

  /**
   * Remove an alert condition
   */
  removeCondition(conditionId: string) {
    this.conditions.delete(conditionId);
    defaultLogger.info(`Removed alert condition: ${conditionId}`);
  }

  /**
   * Check all alert conditions
   */
  private async checkAllConditions() {
    for (const condition of this.conditions.values()) {
      if (!condition.enabled) continue;

      try {
        // Check cooldown
        if (condition.lastTriggered) {
          const timeSinceLastTrigger = Date.now() - condition.lastTriggered.getTime();
          const cooldownMs = condition.cooldownMinutes * 60 * 1000;
          if (timeSinceLastTrigger < cooldownMs) {
            continue; // Still in cooldown
          }
        }

        // Check condition
        const shouldAlert = await condition.checkFn();

        if (shouldAlert) {
          await this.triggerAlert(condition);
        }
      } catch (error) {
        defaultLogger.error(`Error checking alert condition ${condition.id}`, error);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(condition: AlertCondition) {
    const alert: Alert = {
      id: this.generateAlertId(),
      name: condition.name,
      message: condition.description,
      severity: condition.severity,
      timestamp: new Date(),
      metadata: condition.metadata,
    };

    this.alerts.set(alert.id, alert);

    // Update last triggered time
    condition.lastTriggered = new Date();

    // Send to configured channels
    const sendPromises = condition.channels.map(channel =>
      this.sendAlert(alert, channel)
    );

    await Promise.allSettled(sendPromises);

    defaultLogger.warn('Alert triggered', {
      alertId: alert.id,
      name: alert.name,
      severity: alert.severity,
    });
  }

  /**
   * Send alert to a specific channel
   */
  private async sendAlert(alert: Alert, channel: AlertChannel) {
    try {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(alert);
          break;
        case 'slack':
          await this.sendSlackAlert(alert);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alert);
          break;
      }
    } catch (error) {
      defaultLogger.error(`Failed to send alert to ${channel}`, error);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert) {
    if (!this.config.channels.email?.enabled || !this.emailTransporter) {
      return;
    }

    const { from, to } = this.config.channels.email;

    const subject = `[${alert.severity.toUpperCase()}] ${alert.name}`;
    const html = `
      <h2>${alert.name}</h2>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      ${alert.metadata ? `<pre>${JSON.stringify(alert.metadata, null, 2)}</pre>` : ''}
    `;

    await this.emailTransporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    defaultLogger.info(`Email alert sent for ${alert.id}`);
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert) {
    if (!this.config.channels.slack?.enabled || !this.config.channels.slack.webhookUrl) {
      return;
    }

    const color = alert.severity === 'critical' ? 'danger' :
                  alert.severity === 'warning' ? 'warning' : 'good';

    const payload = {
      channel: this.config.channels.slack.channel,
      attachments: [
        {
          color,
          title: alert.name,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true,
            },
          ],
          footer: 'Jarvis Monitoring',
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    await axios.post(this.config.channels.slack.webhookUrl, payload);

    defaultLogger.info(`Slack alert sent for ${alert.id}`);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert) {
    if (!this.config.channels.webhook?.enabled || !this.config.channels.webhook.url) {
      return;
    }

    await axios.post(
      this.config.channels.webhook.url,
      {
        alert,
        timestamp: new Date().toISOString(),
      },
      {
        headers: this.config.channels.webhook.headers,
      }
    );

    defaultLogger.info(`Webhook alert sent for ${alert.id}`);
  }

  /**
   * Create a manual alert
   */
  async createAlert(
    name: string,
    message: string,
    severity: AlertSeverity,
    channels: AlertChannel[] = ['email', 'slack'],
    metadata?: Record<string, any>
  ) {
    const alert: Alert = {
      id: this.generateAlertId(),
      name,
      message,
      severity,
      timestamp: new Date(),
      metadata,
    };

    this.alerts.set(alert.id, alert);

    // Send to configured channels
    const sendPromises = channels.map(channel =>
      this.sendAlert(alert, channel)
    );

    await Promise.allSettled(sendPromises);

    defaultLogger.warn('Manual alert created', {
      alertId: alert.id,
      name,
      severity,
    });

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId?: string) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = userId;

      defaultLogger.info(`Alert ${alertId} acknowledged`, { userId });
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();

      defaultLogger.info(`Alert ${alertId} resolved`);
    }
  }

  /**
   * Get all alerts
   */
  getAlerts(filter?: {
    severity?: AlertSeverity;
    acknowledged?: boolean;
    resolved?: boolean;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filter) {
      if (filter.severity) {
        alerts = alerts.filter(a => a.severity === filter.severity);
      }
      if (filter.acknowledged !== undefined) {
        alerts = alerts.filter(a => !!a.acknowledged === filter.acknowledged);
      }
      if (filter.resolved !== undefined) {
        alerts = alerts.filter(a => !!a.resolved === filter.resolved);
      }
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get all alert conditions
   */
  getConditions(): AlertCondition[] {
    return Array.from(this.conditions.values());
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AlertConfig>) {
    this.config = { ...this.config, ...config };
    defaultLogger.info('Alert configuration updated');
  }

  /**
   * Clear all alerts
   */
  clearAlerts() {
    this.alerts.clear();
    defaultLogger.info('All alerts cleared');
  }
}

// Singleton instance
export const alertingService = new AlertingService();

export default alertingService;
