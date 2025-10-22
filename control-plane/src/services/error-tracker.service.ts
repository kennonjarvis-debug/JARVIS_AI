import * as Sentry from '@sentry/node';
import { defaultLogger } from './logger.service.js';
import { Request } from 'express';

export interface ErrorGroup {
  id: string;
  fingerprint: string;
  message: string;
  type: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  stack?: string;
  contexts: ErrorContext[];
}

export interface ErrorContext {
  timestamp: Date;
  requestId?: string;
  userId?: string;
  url?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface ErrorStats {
  totalErrors: number;
  errorRate: number;
  topErrors: ErrorGroup[];
  errorsByType: Map<string, number>;
  errorsByEndpoint: Map<string, number>;
}

export class ErrorTrackerService {
  private errors: Map<string, ErrorGroup> = new Map();
  private errorHistory: ErrorContext[] = [];
  private maxHistorySize: number = 1000;
  private sentryEnabled: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize error tracking
   */
  private initialize() {
    // Initialize Sentry if DSN is provided
    if (process.env.SENTRY_DSN) {
      try {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV || 'development',
          tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
          beforeSend(event, hint) {
            // Filter out specific errors if needed
            return event;
          },
        });

        this.sentryEnabled = true;
        defaultLogger.info('Sentry error tracking initialized');
      } catch (error) {
        defaultLogger.error('Failed to initialize Sentry', error);
      }
    }

    // Cleanup old errors periodically (every hour)
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Track an error
   */
  trackError(error: Error, context?: ErrorContext) {
    try {
      const fingerprint = this.generateFingerprint(error);
      const errorId = this.errors.has(fingerprint)
        ? this.errors.get(fingerprint)!.id
        : this.generateErrorId();

      // Get or create error group
      let errorGroup = this.errors.get(fingerprint);

      if (errorGroup) {
        errorGroup.count++;
        errorGroup.lastSeen = new Date();
        errorGroup.contexts.push({
          timestamp: new Date(),
          ...context,
        });

        // Keep only recent contexts
        if (errorGroup.contexts.length > 10) {
          errorGroup.contexts = errorGroup.contexts.slice(-10);
        }
      } else {
        errorGroup = {
          id: errorId,
          fingerprint,
          message: error.message,
          type: error.name,
          count: 1,
          firstSeen: new Date(),
          lastSeen: new Date(),
          stack: error.stack,
          contexts: context ? [{ timestamp: new Date(), ...context }] : [],
        };
        this.errors.set(fingerprint, errorGroup);
      }

      // Add to history
      this.errorHistory.push({
        timestamp: new Date(),
        ...context,
      });

      // Trim history if needed
      if (this.errorHistory.length > this.maxHistorySize) {
        this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
      }

      // Send to Sentry if enabled
      if (this.sentryEnabled) {
        Sentry.captureException(error, {
          contexts: {
            custom: context,
          },
        });
      }

      // Log error
      defaultLogger.error('Error tracked', error, {
        errorId,
        fingerprint,
        ...context,
      });
    } catch (trackingError) {
      defaultLogger.error('Failed to track error', trackingError);
    }
  }

  /**
   * Track error from Express request
   */
  trackRequestError(error: Error, req: Request) {
    const context: ErrorContext = {
      timestamp: new Date(),
      requestId: req.id,
      userId: (req as any).user?.id,
      url: req.originalUrl || req.url,
      method: req.method,
      ip: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      metadata: {
        body: req.body,
        query: req.query,
        params: req.params,
      },
    };

    this.trackError(error, context);
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(error: Error): string {
    // Use error type and first line of stack trace
    const stackLine = error.stack?.split('\n')[1]?.trim() || '';
    return `${error.name}:${error.message}:${stackLine}`;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindow: number = 3600000): ErrorStats {
    const now = Date.now();
    const windowStart = now - timeWindow;

    // Filter errors within time window
    const recentErrors = this.errorHistory.filter(
      ctx => ctx.timestamp.getTime() >= windowStart
    );

    // Calculate error rate (errors per minute)
    const errorRate = (recentErrors.length / (timeWindow / 60000));

    // Get top errors
    const topErrors = Array.from(this.errors.values())
      .filter(error => error.lastSeen.getTime() >= windowStart)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Group by type
    const errorsByType = new Map<string, number>();
    topErrors.forEach(error => {
      errorsByType.set(error.type, (errorsByType.get(error.type) || 0) + error.count);
    });

    // Group by endpoint
    const errorsByEndpoint = new Map<string, number>();
    recentErrors.forEach(ctx => {
      if (ctx.url) {
        errorsByEndpoint.set(ctx.url, (errorsByEndpoint.get(ctx.url) || 0) + 1);
      }
    });

    return {
      totalErrors: recentErrors.length,
      errorRate,
      topErrors,
      errorsByType,
      errorsByEndpoint,
    };
  }

  /**
   * Get error group by ID
   */
  getErrorGroup(errorId: string): ErrorGroup | undefined {
    return Array.from(this.errors.values()).find(error => error.id === errorId);
  }

  /**
   * Get all error groups
   */
  getErrorGroups(limit: number = 50): ErrorGroup[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
      .slice(0, limit);
  }

  /**
   * Search errors by message
   */
  searchErrors(query: string): ErrorGroup[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.errors.values())
      .filter(error =>
        error.message.toLowerCase().includes(lowerQuery) ||
        error.type.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  /**
   * Get errors for specific user
   */
  getUserErrors(userId: string, limit: number = 20): ErrorContext[] {
    return this.errorHistory
      .filter(ctx => ctx.userId === userId)
      .slice(-limit);
  }

  /**
   * Get errors for specific endpoint
   */
  getEndpointErrors(url: string, limit: number = 20): ErrorContext[] {
    return this.errorHistory
      .filter(ctx => ctx.url === url)
      .slice(-limit);
  }

  /**
   * Cleanup old errors
   */
  private cleanup() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Remove old error groups
    for (const [fingerprint, error] of this.errors.entries()) {
      if (now - error.lastSeen.getTime() > maxAge) {
        this.errors.delete(fingerprint);
      }
    }

    // Trim error history
    const cutoff = now - maxAge;
    this.errorHistory = this.errorHistory.filter(
      ctx => ctx.timestamp.getTime() >= cutoff
    );

    defaultLogger.info('Error tracking cleanup completed', {
      errorGroups: this.errors.size,
      errorHistory: this.errorHistory.length,
    });
  }

  /**
   * Clear all tracked errors
   */
  clear() {
    this.errors.clear();
    this.errorHistory = [];
    defaultLogger.info('Error tracking cleared');
  }

  /**
   * Check if error rate exceeds threshold
   */
  isErrorRateHigh(threshold: number = 10): boolean {
    const stats = this.getErrorStats(300000); // Last 5 minutes
    return stats.errorRate > threshold;
  }

  /**
   * Get Sentry status
   */
  getSentryStatus(): { enabled: boolean; dsn?: string } {
    return {
      enabled: this.sentryEnabled,
      dsn: this.sentryEnabled ? process.env.SENTRY_DSN?.substring(0, 20) + '...' : undefined,
    };
  }
}

// Error tracking middleware
export function errorTrackingMiddleware(errorTracker: ErrorTrackerService) {
  return (err: Error, req: any, res: any, next: any) => {
    errorTracker.trackRequestError(err, req);
    next(err);
  };
}

// Singleton instance
export const errorTracker = new ErrorTrackerService();

export default errorTracker;
