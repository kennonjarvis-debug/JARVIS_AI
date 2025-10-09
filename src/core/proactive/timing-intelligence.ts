/**
 * Timing Intelligence
 * Learns optimal notification times and manages smart scheduling
 */

import { EventEmitter } from 'events';
import { TimingPattern, ProactiveNotification, SuggestionFeedback } from './types';
import { adaptiveEngine } from './adaptive-engine-v2';

export class TimingIntelligence extends EventEmitter {
  private static instance: TimingIntelligence;
  private notificationHistory: Array<{ notificationId: string; sentAt: Date; responded: boolean; responseTime?: number }> = [];
  private recentNotifications: ProactiveNotification[] = [];

  // Rate limiting
  private maxPerHour = 5;
  private maxPerDay = 20;
  private minTimeBetween = 15; // minutes

  private constructor() {
    super();
  }

  static getInstance(): TimingIntelligence {
    if (!TimingIntelligence.instance) {
      TimingIntelligence.instance = new TimingIntelligence();
    }
    return TimingIntelligence.instance;
  }

  /**
   * Check if it's a good time to send a notification
   */
  isGoodTimeToNotify(activityType?: string, priority?: 'low' | 'medium' | 'high' | 'critical'): boolean {
    // Critical notifications always go through
    if (priority === 'critical') {
      return true;
    }

    // Check rate limits
    if (!this.checkRateLimits()) {
      return false;
    }

    // Check general time appropriateness
    if (!adaptiveEngine.isGoodTimeForNotification(activityType)) {
      return false;
    }

    // Check if enough time has passed since last notification
    if (!this.checkMinimumTimeBetween()) {
      return false;
    }

    return true;
  }

  /**
   * Schedule notification for optimal time
   */
  scheduleForOptimalTime(notification: ProactiveNotification): Date {
    const now = new Date();

    // If critical, send immediately
    if (notification.priority === 'critical') {
      return now;
    }

    // Check if current time is good
    if (this.isGoodTimeToNotify(undefined, notification.priority)) {
      return now;
    }

    // Find next good time
    return this.findNextGoodTime();
  }

  /**
   * Record notification feedback
   */
  recordFeedback(feedback: SuggestionFeedback) {
    const notification = this.recentNotifications.find(n => n.suggestionId === feedback.suggestionId);
    if (notification) {
      const responded = feedback.feedbackType === 'acted_upon' || feedback.feedbackType === 'positive';
      const responseTime = notification.sentAt 
        ? new Date(feedback.timestamp).getTime() - new Date(notification.sentAt).getTime()
        : undefined;

      this.notificationHistory.push({
        notificationId: notification.id,
        sentAt: notification.sentAt || new Date(),
        responded,
        responseTime
      });

      // Learn from feedback
      if (feedback.feedbackType === 'dismissed' || feedback.feedbackType === 'negative') {
        // Reduce notification frequency
        this.maxPerHour = Math.max(2, this.maxPerHour - 1);
      } else if (feedback.feedbackType === 'acted_upon') {
        // Can increase frequency slightly
        this.maxPerHour = Math.min(10, this.maxPerHour + 1);
      }
    }
  }

  /**
   * Get notification statistics
   */
  getStats() {
    const total = this.notificationHistory.length;
    const responded = this.notificationHistory.filter(n => n.responded).length;
    const avgResponseTime = this.notificationHistory
      .filter(n => n.responseTime)
      .reduce((sum, n) => sum + (n.responseTime || 0), 0) / responded || 0;

    return {
      totalSent: total,
      responseRate: total > 0 ? (responded / total) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime / 1000), // seconds
      currentRateLimit: this.maxPerHour
    };
  }

  /**
   * Track sent notification
   */
  trackSentNotification(notification: ProactiveNotification) {
    this.recentNotifications.push(notification);
    
    // Keep only last 100
    if (this.recentNotifications.length > 100) {
      this.recentNotifications = this.recentNotifications.slice(-100);
    }
  }

  private checkRateLimits(): boolean {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const sentLastHour = this.recentNotifications.filter(
      n => n.sentAt && new Date(n.sentAt).getTime() > oneHourAgo
    ).length;

    const sentLastDay = this.recentNotifications.filter(
      n => n.sentAt && new Date(n.sentAt).getTime() > oneDayAgo
    ).length;

    return sentLastHour < this.maxPerHour && sentLastDay < this.maxPerDay;
  }

  private checkMinimumTimeBetween(): boolean {
    if (this.recentNotifications.length === 0) return true;

    const lastNotification = this.recentNotifications[this.recentNotifications.length - 1];
    if (!lastNotification.sentAt) return true;

    const timeSince = Date.now() - new Date(lastNotification.sentAt).getTime();
    return timeSince > this.minTimeBetween * 60 * 1000;
  }

  private findNextGoodTime(): Date {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    return nextHour;
  }
}

export const timingIntelligence = TimingIntelligence.getInstance();
export default TimingIntelligence;
