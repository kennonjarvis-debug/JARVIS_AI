/**
 * macOS Notifications Service
 *
 * Provides native macOS notification support with rich features.
 * Uses node-notifier for cross-platform compatibility with macOS enhancements.
 *
 * Features:
 * - Native macOS notifications
 * - Rich notifications (buttons, images, sounds)
 * - Notification actions and callbacks
 * - Custom sounds
 * - Grouped notifications
 */

import notifier from 'node-notifier';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface NotificationOptions {
  title: string;
  message: string;
  subtitle?: string;
  sound?: string | boolean; // Sound name or true for default
  icon?: string; // Path to icon
  contentImage?: string; // Path to content image
  open?: string; // URL or file path to open on click
  wait?: boolean; // Wait for user interaction
  timeout?: number; // Auto-dismiss timeout (seconds)
  closeLabel?: string; // Label for close button
  actions?: string | string[]; // Action buttons
  dropdownLabel?: string; // Label for dropdown
  reply?: boolean; // Show reply field
}

export interface NotificationAction {
  type: 'clicked' | 'timeout' | 'replied' | 'action';
  action?: string;
  reply?: string;
  activationType?: string;
  activationValue?: string;
}

export class NotificationsService extends EventEmitter {
  private readonly appName: string = 'Jarvis AI';
  private readonly appIcon: string;

  constructor() {
    super();
    // Default app icon (can be customized)
    this.appIcon = path.join(__dirname, '../../../assets/jarvis-icon.png');
  }

  /**
   * Show a basic notification
   */
  async notify(options: NotificationOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const notificationConfig: any = {
        title: options.title,
        message: options.message,
        subtitle: options.subtitle,
        sound: options.sound === true ? 'Ping' : options.sound || false,
        icon: options.icon || this.appIcon,
        contentImage: options.contentImage,
        open: options.open,
        wait: options.wait || false,
        timeout: options.timeout || 10,
        closeLabel: options.closeLabel || 'Close',
        actions: options.actions,
        dropdownLabel: options.dropdownLabel,
        reply: options.reply || false,
      };

      notifier.notify(notificationConfig, (err, response, metadata) => {
        if (err) {
          this.emit('error', err);
          reject(err);
          return;
        }

        const action: NotificationAction = {
          type: this.parseActionType(response),
          action: metadata?.activationValue,
          reply: metadata?.activationValue,
          activationType: metadata?.activationType,
          activationValue: metadata?.activationValue,
        };

        this.emit('action', action);
        resolve();
      });
    });
  }

  /**
   * Show a success notification
   */
  async success(title: string, message: string): Promise<void> {
    return this.notify({
      title,
      message,
      sound: 'Glass',
      subtitle: 'Success',
    });
  }

  /**
   * Show an error notification
   */
  async error(title: string, message: string): Promise<void> {
    return this.notify({
      title,
      message,
      sound: 'Basso',
      subtitle: 'Error',
    });
  }

  /**
   * Show a warning notification
   */
  async warning(title: string, message: string): Promise<void> {
    return this.notify({
      title,
      message,
      sound: 'Funk',
      subtitle: 'Warning',
    });
  }

  /**
   * Show an info notification
   */
  async info(title: string, message: string): Promise<void> {
    return this.notify({
      title,
      message,
      sound: 'Ping',
      subtitle: 'Info',
    });
  }

  /**
   * Show a notification with custom actions
   */
  async notifyWithActions(
    title: string,
    message: string,
    actions: string[]
  ): Promise<NotificationAction> {
    return new Promise((resolve, reject) => {
      notifier.notify(
        {
          title,
          message,
          sound: 'Ping',
          wait: true,
          actions: actions.join(','),
          dropdownLabel: 'Actions',
        },
        (err, response, metadata) => {
          if (err) {
            this.emit('error', err);
            reject(err);
            return;
          }

          const action: NotificationAction = {
            type: this.parseActionType(response),
            action: metadata?.activationValue,
            activationType: metadata?.activationType,
            activationValue: metadata?.activationValue,
          };

          resolve(action);
        }
      );
    });
  }

  /**
   * Show a notification with reply field
   */
  async notifyWithReply(title: string, message: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      notifier.notify(
        {
          title,
          message,
          sound: 'Ping',
          wait: true,
          reply: true,
        },
        (err, response, metadata) => {
          if (err) {
            this.emit('error', err);
            reject(err);
            return;
          }

          if (metadata?.activationType === 'replied') {
            resolve(metadata.activationValue || null);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Show a notification with an image
   */
  async notifyWithImage(
    title: string,
    message: string,
    imagePath: string
  ): Promise<void> {
    return this.notify({
      title,
      message,
      contentImage: imagePath,
      sound: true,
    });
  }

  /**
   * Show a progress notification (simulated with multiple notifications)
   */
  async notifyProgress(
    title: string,
    currentStep: number,
    totalSteps: number
  ): Promise<void> {
    const percentage = Math.round((currentStep / totalSteps) * 100);
    const progressBar = '█'.repeat(percentage / 10) + '░'.repeat(10 - percentage / 10);

    return this.notify({
      title,
      message: `${progressBar} ${percentage}%`,
      sound: false,
      timeout: 3,
    });
  }

  /**
   * Use AppleScript for advanced notifications
   */
  async notifyAdvanced(options: {
    title: string;
    message: string;
    subtitle?: string;
    sound?: string;
  }): Promise<void> {
    const { title, message, subtitle, sound } = options;

    const script = `
      display notification "${message.replace(/"/g, '\\"')}" \\
        with title "${title.replace(/"/g, '\\"')}" \\
        ${subtitle ? `subtitle "${subtitle.replace(/"/g, '\\"')}" \\` : ''}
        ${sound ? `sound name "${sound}"` : ''}
    `;

    try {
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    } catch (error) {
      console.error('[Notifications] Failed to show notification:', error);
      throw error;
    }
  }

  /**
   * Show a Jarvis-specific notification
   */
  async jarvisNotify(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
    const icons = {
      info: '💡',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };

    return this.notify({
      title: `${icons[type]} Jarvis`,
      message,
      sound: type === 'error' ? 'Basso' : type === 'success' ? 'Glass' : 'Ping',
      timeout: 5,
    });
  }

  /**
   * Show a task completion notification
   */
  async taskComplete(taskName: string, duration?: number): Promise<void> {
    const durationText = duration ? ` (${this.formatDuration(duration)})` : '';
    return this.notify({
      title: '✅ Task Complete',
      message: `${taskName}${durationText}`,
      sound: 'Glass',
      timeout: 5,
    });
  }

  /**
   * Show a reminder notification
   */
  async reminder(title: string, message: string, actions?: string[]): Promise<NotificationAction | void> {
    if (actions) {
      return this.notifyWithActions(`⏰ ${title}`, message, actions);
    } else {
      return this.notify({
        title: `⏰ ${title}`,
        message,
        sound: 'Ping',
        timeout: 0, // Don't auto-dismiss
      });
    }
  }

  /**
   * Parse action type from response
   */
  private parseActionType(response: string): NotificationAction['type'] {
    if (response === 'timeout') return 'timeout';
    if (response === 'replied') return 'replied';
    if (response === 'activate') return 'clicked';
    return 'action';
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get available sounds on macOS
   */
  async getAvailableSounds(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('ls /System/Library/Sounds/');
      return stdout
        .split('\n')
        .filter(line => line.endsWith('.aiff'))
        .map(line => line.replace('.aiff', ''));
    } catch (error) {
      console.error('[Notifications] Failed to get sounds:', error);
      return ['Ping', 'Pop', 'Glass', 'Basso', 'Funk'];
    }
  }
}

/**
 * Create a singleton instance
 */
export const notificationsService = new NotificationsService();
