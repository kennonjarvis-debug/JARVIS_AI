/**
 * Analytics Service
 *
 * Handles analytics tracking and consent management
 * Integrates with analytics providers while respecting user privacy preferences
 */

import { logger } from '../utils/logger.js';

export interface AnalyticsEvent {
  name: string;
  userId?: string;
  properties?: Record<string, any>;
  timestamp: Date;
}

export interface AnalyticsConfig {
  enabled: boolean;
  providers: {
    googleAnalytics?: {
      measurementId: string;
      enabled: boolean;
    };
    mixpanel?: {
      token: string;
      enabled: boolean;
    };
    segment?: {
      writeKey: string;
      enabled: boolean;
    };
  };
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  private config: AnalyticsConfig;
  private userOptOuts: Set<string> = new Set();

  private constructor(config?: Partial<AnalyticsConfig>) {
    this.config = {
      enabled: process.env.ANALYTICS_ENABLED === 'true',
      providers: {
        googleAnalytics: {
          measurementId: process.env.GA_MEASUREMENT_ID || '',
          enabled: !!process.env.GA_MEASUREMENT_ID
        },
        mixpanel: {
          token: process.env.MIXPANEL_TOKEN || '',
          enabled: !!process.env.MIXPANEL_TOKEN
        },
        segment: {
          writeKey: process.env.SEGMENT_WRITE_KEY || '',
          enabled: !!process.env.SEGMENT_WRITE_KEY
        }
      },
      ...config
    };

    logger.info('Analytics service initialized', {
      enabled: this.config.enabled,
      providers: Object.keys(this.config.providers).filter(
        p => this.config.providers[p as keyof typeof this.config.providers]?.enabled
      )
    });
  }

  static getInstance(config?: Partial<AnalyticsConfig>): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService(config);
    }
    return AnalyticsService.instance;
  }

  /**
   * Track an analytics event
   */
  async track(event: AnalyticsEvent): Promise<void> {
    // Check if analytics is globally enabled
    if (!this.config.enabled) {
      return;
    }

    // Check if user has opted out
    if (event.userId && this.userOptOuts.has(event.userId)) {
      logger.debug('Analytics tracking skipped - user opted out', {
        userId: event.userId,
        event: event.name
      });
      return;
    }

    try {
      // Track with enabled providers
      const trackingPromises: Promise<void>[] = [];

      if (this.config.providers.googleAnalytics?.enabled) {
        trackingPromises.push(this.trackGoogleAnalytics(event));
      }

      if (this.config.providers.mixpanel?.enabled) {
        trackingPromises.push(this.trackMixpanel(event));
      }

      if (this.config.providers.segment?.enabled) {
        trackingPromises.push(this.trackSegment(event));
      }

      await Promise.all(trackingPromises);

      logger.debug('Analytics event tracked', {
        event: event.name,
        userId: event.userId,
        providers: trackingPromises.length
      });

    } catch (error: any) {
      logger.error('Failed to track analytics event', {
        event: event.name,
        error: error.message
      });
    }
  }

  /**
   * Disable analytics for a specific user
   */
  async disableForUser(userId: string): Promise<void> {
    this.userOptOuts.add(userId);

    logger.info('Analytics disabled for user', { userId });

    // TODO: Call provider APIs to opt out user
    // - Google Analytics: set gtag consent to 'denied'
    // - Mixpanel: opt_out_tracking
    // - Segment: disable tracking for user

    // For now, just add to local opt-out set
    // This prevents new events from being tracked
  }

  /**
   * Enable analytics for a specific user
   */
  async enableForUser(userId: string): Promise<void> {
    this.userOptOuts.delete(userId);

    logger.info('Analytics enabled for user', { userId });
  }

  /**
   * Check if user has opted out
   */
  isUserOptedOut(userId: string): boolean {
    return this.userOptOuts.has(userId);
  }

  /**
   * Track event with Google Analytics
   */
  private async trackGoogleAnalytics(event: AnalyticsEvent): Promise<void> {
    // TODO: Implement Google Analytics 4 tracking
    // Using Measurement Protocol API or gtag.js

    logger.debug('GA4 tracking (stub)', {
      measurementId: this.config.providers.googleAnalytics?.measurementId,
      event: event.name
    });
  }

  /**
   * Track event with Mixpanel
   */
  private async trackMixpanel(event: AnalyticsEvent): Promise<void> {
    // TODO: Implement Mixpanel tracking
    // Using Mixpanel HTTP API

    logger.debug('Mixpanel tracking (stub)', {
      token: this.config.providers.mixpanel?.token?.slice(0, 8) + '...',
      event: event.name
    });
  }

  /**
   * Track event with Segment
   */
  private async trackSegment(event: AnalyticsEvent): Promise<void> {
    // TODO: Implement Segment tracking
    // Using Segment HTTP API

    logger.debug('Segment tracking (stub)', {
      writeKey: this.config.providers.segment?.writeKey?.slice(0, 8) + '...',
      event: event.name
    });
  }

  /**
   * Get analytics configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Check if analytics is globally enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();

export default AnalyticsService;
