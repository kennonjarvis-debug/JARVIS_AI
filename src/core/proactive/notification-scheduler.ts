/**
 * Notification Scheduler
 * Queues and sends proactive notifications at optimal times
 */

import { EventEmitter } from 'events';
import { ProactiveNotification, ProactiveSuggestion, SuggestionFeedback } from './types';
import { timingIntelligence } from './timing-intelligence';

export class NotificationScheduler extends EventEmitter {
  private static instance: NotificationScheduler;
  private queue: ProactiveNotification[] = [];
  private sentNotifications: ProactiveNotification[] = [];

  private constructor() {
    super();
    this.startScheduler();
  }

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  private startScheduler() {
    setInterval(() => this.processQueue(), 60 * 1000);
  }

  scheduleFromSuggestion(suggestion: ProactiveSuggestion): string {
    const notification: ProactiveNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      suggestionId: suggestion.id,
      title: suggestion.title,
      message: suggestion.message,
      priority: suggestion.priority,
      scheduledFor: new Date(),
      deliveryMethod: 'toast',
      status: 'queued'
    };

    this.queue.push(notification);
    this.emit('notificationQueued', notification);
    return notification.id;
  }

  private async processQueue() {
    const now = Date.now();
    for (const notification of this.queue) {
      if (notification.status === 'queued') {
        const scheduledTime = new Date(notification.scheduledFor).getTime();
        if (scheduledTime <= now) {
          await this.sendNotification(notification);
        }
      }
    }
  }

  private async sendNotification(notification: ProactiveNotification) {
    notification.sentAt = new Date();
    notification.status = 'sent';
    timingIntelligence.trackSentNotification(notification);
    this.sentNotifications.push(notification);
    this.queue = this.queue.filter(n => n.id !== notification.id);
    this.emit('notificationReady', notification);
    console.log(`📢 Proactive notification sent: ${notification.title}`);
  }

  getPendingNotifications(): ProactiveNotification[] {
    return this.queue.filter(n => n.status === 'queued');
  }

  getRecentNotifications(limit: number = 10): ProactiveNotification[] {
    return this.sentNotifications.slice(-limit);
  }
}

export const notificationScheduler = NotificationScheduler.getInstance();
export default NotificationScheduler;
