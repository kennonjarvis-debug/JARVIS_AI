/**
 * Alert Dispatcher
 * Central service for dispatching alerts to all notification channels
 *
 * Supported channels:
 * - iPhone Push Notifications (Pushover/Ntfy/APNs)
 * - macOS Native Notifications
 * - Dashboard WebSocket
 * - Slack
 * - Email
 * - ChatGPT Webhook
 */

import { EventEmitter } from 'events';
import { ServiceAlert } from './business-operator.js';
import { logger } from '../utils/logger.js';
import { websocketHub } from './websocket-hub.js';
import notifier from 'node-notifier';
import axios from 'axios';

export interface AlertChannel {
  name: string;
  enabled: boolean;
  send: (alert: ServiceAlert) => Promise<void>;
}

export interface PushoverConfig {
  userKey: string;
  apiToken: string;
}

export interface NtfyConfig {
  topic: string;
  server?: string;
}

export interface AlertDispatcherConfig {
  pushover?: PushoverConfig;
  ntfy?: NtfyConfig;
  macosNotifications?: {
    enabled: boolean;
  };
  dashboardWebSocket?: {
    enabled: boolean;
  };
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
  };
  chatgptWebhook?: {
    enabled: boolean;
    url?: string;
  };
}

export class AlertDispatcher extends EventEmitter {
  private static instance: AlertDispatcher;
  private config: AlertDispatcherConfig;
  private channels: AlertChannel[] = [];
  private alertHistory: ServiceAlert[] = [];
  private maxHistorySize = 500;

  private constructor(config: AlertDispatcherConfig) {
    super();
    this.config = config;
    this.initializeChannels();
  }

  static getInstance(config?: AlertDispatcherConfig): AlertDispatcher {
    if (!AlertDispatcher.instance) {
      if (!config) {
        throw new Error('AlertDispatcher must be initialized with config on first call');
      }
      AlertDispatcher.instance = new AlertDispatcher(config);
    }
    return AlertDispatcher.instance;
  }

  /**
   * Initialize all alert channels based on configuration
   */
  private initializeChannels(): void {
    // iPhone Push Notifications (Pushover)
    if (this.config.pushover?.userKey && this.config.pushover?.apiToken) {
      this.channels.push({
        name: 'pushover',
        enabled: true,
        send: this.sendPushover.bind(this)
      });
      logger.info('📱 Pushover notifications enabled');
    }

    // iPhone/Android Push Notifications (Ntfy)
    if (this.config.ntfy?.topic) {
      this.channels.push({
        name: 'ntfy',
        enabled: true,
        send: this.sendNtfy.bind(this)
      });
      logger.info('📱 Ntfy notifications enabled');
    }

    // macOS Native Notifications
    if (this.config.macosNotifications?.enabled !== false) {
      this.channels.push({
        name: 'macos',
        enabled: true,
        send: this.sendMacOSNotification.bind(this)
      });
      logger.info('💻 macOS notifications enabled');
    }

    // Dashboard WebSocket
    if (this.config.dashboardWebSocket?.enabled !== false) {
      this.channels.push({
        name: 'dashboard-websocket',
        enabled: true,
        send: this.sendDashboardWebSocket.bind(this)
      });
      logger.info('📊 Dashboard WebSocket alerts enabled');
    }

    // Slack
    if (this.config.slack?.enabled && this.config.slack.webhookUrl) {
      this.channels.push({
        name: 'slack',
        enabled: true,
        send: this.sendSlack.bind(this)
      });
      logger.info('💬 Slack alerts enabled');
    }

    // ChatGPT Webhook
    if (this.config.chatgptWebhook?.enabled && this.config.chatgptWebhook.url) {
      this.channels.push({
        name: 'chatgpt-webhook',
        enabled: true,
        send: this.sendChatGPTWebhook.bind(this)
      });
      logger.info('🤖 ChatGPT webhook alerts enabled');
    }

    logger.info(`🎯 Alert Dispatcher initialized with ${this.channels.length} channels`);
  }

  /**
   * Dispatch alert to all enabled channels
   */
  async dispatch(alert: ServiceAlert): Promise<void> {
    logger.info(`📢 Dispatching alert: ${alert.service} - ${alert.severity} - ${alert.message}`);

    // Add to history
    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
    }

    // Emit event
    this.emit('alert-dispatched', alert);

    // Send to all channels in parallel
    const dispatchPromises = this.channels
      .filter(channel => channel.enabled)
      .map(channel =>
        channel.send(alert)
          .then(() => {
            logger.info(`✅ Alert sent via ${channel.name}`);
            this.emit('channel-success', { channel: channel.name, alert });
          })
          .catch(error => {
            logger.error(`❌ Failed to send alert via ${channel.name}:`, error);
            this.emit('channel-error', { channel: channel.name, alert, error });
          })
      );

    await Promise.allSettled(dispatchPromises);
  }

  /**
   * Send iPhone push notification via Pushover
   * Pushover is a simple push notification service for iOS/Android
   * Get API credentials at: https://pushover.net/
   */
  private async sendPushover(alert: ServiceAlert): Promise<void> {
    if (!this.config.pushover) {
      throw new Error('Pushover not configured');
    }

    const priority = alert.severity === 'critical' ? 1 : alert.severity === 'warning' ? 0 : -1;
    const sound = alert.severity === 'critical' ? 'siren' : 'pushover';

    await axios.post('https://api.pushover.net/1/messages.json', {
      token: this.config.pushover.apiToken,
      user: this.config.pushover.userKey,
      title: `🚨 Jarvis: ${alert.service}`,
      message: `${this.getSeverityEmoji(alert.severity)} ${alert.message}\n\nAction: ${alert.action}`,
      priority,
      sound,
      timestamp: new Date(alert.timestamp).getTime() / 1000
    });
  }

  /**
   * Send push notification via Ntfy
   * Ntfy is an open-source push notification service
   * Setup: Install ntfy app on iPhone and subscribe to your topic
   * Docs: https://ntfy.sh/
   */
  private async sendNtfy(alert: ServiceAlert): Promise<void> {
    if (!this.config.ntfy) {
      throw new Error('Ntfy not configured');
    }

    const server = this.config.ntfy.server || 'https://ntfy.sh';
    const priority = alert.severity === 'critical' ? 'urgent' :
                     alert.severity === 'warning' ? 'high' : 'default';

    const severityTag = alert.severity === 'critical' ? 'alert' :
                        alert.severity === 'warning' ? 'warning' : 'info';

    await axios.post(`${server}/${this.config.ntfy.topic}`, alert.message, {
      headers: {
        'Title': `Jarvis Alert: ${alert.service}`,
        'Priority': priority,
        'Tags': `${severityTag},jarvis,${alert.service}`,
        'Actions': `view, View Dashboard, ${process.env.DASHBOARD_URL || 'http://localhost:5001'}`
      }
    });
  }

  /**
   * Send macOS native notification
   * Uses node-notifier to send system notifications on macOS
   */
  private async sendMacOSNotification(alert: ServiceAlert): Promise<void> {
    return new Promise((resolve, reject) => {
      notifier.notify({
        title: `Jarvis Alert: ${alert.service}`,
        message: `${this.getSeverityEmoji(alert.severity)} ${alert.message}`,
        subtitle: alert.action,
        sound: alert.severity === 'critical' ? 'Basso' : 'Blow',
        icon: process.env.JARVIS_ICON_PATH || undefined,
        contentImage: undefined,
        open: process.env.DASHBOARD_URL || 'http://localhost:5001',
        wait: false,
        timeout: alert.severity === 'critical' ? 30 : 10
      }, (err: Error | null, response: unknown) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Send alert via Dashboard WebSocket
   * Broadcasts alert to all connected dashboard clients
   */
  private async sendDashboardWebSocket(alert: ServiceAlert): Promise<void> {
    // Broadcast via WebSocket Hub
    websocketHub.broadcastToAll({
      type: 'presence',
      data: {
        type: 'alert',
        service: alert.service,
        severity: alert.severity,
        message: alert.message,
        action: alert.action,
        timestamp: alert.timestamp
      }
    });
  }

  /**
   * Send alert to Slack
   */
  private async sendSlack(alert: ServiceAlert): Promise<void> {
    if (!this.config.slack?.webhookUrl) {
      throw new Error('Slack webhook not configured');
    }

    const color = alert.severity === 'critical' ? '#d63031' :
                  alert.severity === 'warning' ? '#fdcb6e' : '#0984e3';

    await axios.post(this.config.slack.webhookUrl, {
      text: `${this.getSeverityEmoji(alert.severity)} *Jarvis Alert*`,
      attachments: [{
        color,
        fields: [
          { title: 'Service', value: alert.service, short: true },
          { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          { title: 'Message', value: alert.message, short: false },
          { title: 'Action', value: alert.action, short: false }
        ],
        footer: 'Jarvis Monitoring System',
        ts: new Date(alert.timestamp).getTime() / 1000
      }]
    });
  }

  /**
   * Send alert to ChatGPT webhook
   */
  private async sendChatGPTWebhook(alert: ServiceAlert): Promise<void> {
    if (!this.config.chatgptWebhook?.url) {
      throw new Error('ChatGPT webhook not configured');
    }

    await axios.post(this.config.chatgptWebhook.url, {
      type: 'system_alert',
      alert: {
        service: alert.service,
        severity: alert.severity,
        message: alert.message,
        action: alert.action,
        timestamp: alert.timestamp
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Jarvis-Alert': 'true'
      }
    });
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: 'info' | 'warning' | 'critical'): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 50): ServiceAlert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alert statistics
   */
  getStats() {
    const now = Date.now();
    const lastHour = this.alertHistory.filter(a =>
      new Date(a.timestamp).getTime() > now - 3600000
    );
    const lastDay = this.alertHistory.filter(a =>
      new Date(a.timestamp).getTime() > now - 86400000
    );

    return {
      total: this.alertHistory.length,
      lastHour: lastHour.length,
      lastDay: lastDay.length,
      bySeverity: {
        critical: this.alertHistory.filter(a => a.severity === 'critical').length,
        warning: this.alertHistory.filter(a => a.severity === 'warning').length,
        info: this.alertHistory.filter(a => a.severity === 'info').length
      },
      byService: this.alertHistory.reduce((acc, alert) => {
        acc[alert.service] = (acc[alert.service] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      channels: this.channels.map(c => ({
        name: c.name,
        enabled: c.enabled
      }))
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AlertDispatcherConfig>): void {
    this.config = { ...this.config, ...updates };
    this.channels = [];
    this.initializeChannels();
    logger.info('Alert Dispatcher configuration updated');
  }

  /**
   * Enable/disable specific channel
   */
  setChannelEnabled(channelName: string, enabled: boolean): void {
    const channel = this.channels.find(c => c.name === channelName);
    if (channel) {
      channel.enabled = enabled;
      logger.info(`Channel ${channelName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

// Export singleton getter
export function getAlertDispatcher(config?: AlertDispatcherConfig): AlertDispatcher {
  return AlertDispatcher.getInstance(config);
}
