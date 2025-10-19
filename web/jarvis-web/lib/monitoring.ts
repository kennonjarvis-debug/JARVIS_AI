/**
 * Frontend Monitoring Service
 * Tracks page views, performance, errors, and Web Vitals
 */

export interface WebVitals {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
}

export interface PageView {
  path: string;
  timestamp: number;
  referrer?: string;
  userAgent?: string;
  sessionId?: string;
  userId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ErrorEvent {
  message: string;
  stack?: string;
  timestamp: number;
  url: string;
  userAgent?: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

class FrontendMonitoring {
  private sessionId: string;
  private userId?: string;
  private apiEndpoint: string;
  private webVitals: WebVitals = {};
  private errors: ErrorEvent[] = [];
  private pageViews: PageView[] = [];
  private performanceMetrics: PerformanceMetric[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize monitoring
   */
  private initialize() {
    // Track page views
    this.trackPageView();

    // Track Web Vitals
    this.trackWebVitals();

    // Track errors
    this.setupErrorTracking();

    // Track performance
    this.trackPerformance();

    // Send metrics periodically
    this.startPeriodicReporting();
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Track page view
   */
  trackPageView(path?: string) {
    if (typeof window === 'undefined') return;

    const pageView: PageView = {
      path: path || window.location.pathname,
      timestamp: Date.now(),
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.pageViews.push(pageView);

    // Send to backend
    this.sendMetric('pageview', pageView);
  }

  /**
   * Track Web Vitals
   */
  private trackWebVitals() {
    if (typeof window === 'undefined') return;

    // Use the web-vitals library if available
    if (typeof window.webVitals !== 'undefined') {
      const vitals = window.webVitals;

      vitals.onLCP((metric: any) => {
        this.webVitals.LCP = metric.value;
        this.sendMetric('web-vital', { name: 'LCP', value: metric.value });
      });

      vitals.onFID((metric: any) => {
        this.webVitals.FID = metric.value;
        this.sendMetric('web-vital', { name: 'FID', value: metric.value });
      });

      vitals.onCLS((metric: any) => {
        this.webVitals.CLS = metric.value;
        this.sendMetric('web-vital', { name: 'CLS', value: metric.value });
      });

      vitals.onFCP((metric: any) => {
        this.webVitals.FCP = metric.value;
        this.sendMetric('web-vital', { name: 'FCP', value: metric.value });
      });

      vitals.onTTFB((metric: any) => {
        this.webVitals.TTFB = metric.value;
        this.sendMetric('web-vital', { name: 'TTFB', value: metric.value });
      });
    }
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking() {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        userId: this.userId,
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        userId: this.userId,
      });
    });
  }

  /**
   * Track error
   */
  trackError(error: ErrorEvent) {
    this.errors.push(error);

    // Send to backend
    this.sendMetric('error', error);
  }

  /**
   * Track custom event
   */
  trackEvent(name: string, metadata?: Record<string, any>) {
    this.sendMetric('custom-event', {
      name,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      metadata,
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance() {
    if (typeof window === 'undefined' || !window.performance) return;

    // Track navigation timing
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
    const responseTime = perfData.responseEnd - perfData.requestStart;

    const metrics = [
      { name: 'page_load_time', value: pageLoadTime },
      { name: 'dom_ready_time', value: domReadyTime },
      { name: 'response_time', value: responseTime },
    ];

    metrics.forEach(metric => {
      this.performanceMetrics.push({
        name: metric.name,
        value: metric.value,
        timestamp: Date.now(),
      });

      this.sendMetric('performance', metric);
    });
  }

  /**
   * Track API call performance
   */
  trackApiCall(endpoint: string, duration: number, statusCode: number) {
    const metric: PerformanceMetric = {
      name: 'api_call',
      value: duration,
      timestamp: Date.now(),
      metadata: {
        endpoint,
        statusCode,
        sessionId: this.sessionId,
        userId: this.userId,
      },
    };

    this.performanceMetrics.push(metric);
    this.sendMetric('api-call', metric);
  }

  /**
   * Send metric to backend
   */
  private async sendMetric(type: string, data: any) {
    try {
      // Use navigator.sendBeacon for reliability
      if (navigator.sendBeacon) {
        const blob = new Blob(
          [JSON.stringify({ type, data, timestamp: Date.now() })],
          { type: 'application/json' }
        );
        navigator.sendBeacon(`${this.apiEndpoint}/api/monitoring/track`, blob);
      } else {
        // Fallback to fetch
        await fetch(`${this.apiEndpoint}/api/monitoring/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type, data, timestamp: Date.now() }),
          keepalive: true,
        });
      }
    } catch (error) {
      console.error('Failed to send monitoring metric:', error);
    }
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting() {
    // Send aggregated metrics every 30 seconds
    setInterval(() => {
      this.sendAggregatedMetrics();
    }, 30000);

    // Send on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.sendAggregatedMetrics();
      });
    }
  }

  /**
   * Send aggregated metrics
   */
  private sendAggregatedMetrics() {
    if (this.errors.length === 0 &&
        this.pageViews.length === 0 &&
        this.performanceMetrics.length === 0) {
      return;
    }

    const aggregated = {
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      errors: this.errors,
      pageViews: this.pageViews,
      performanceMetrics: this.performanceMetrics,
      webVitals: this.webVitals,
    };

    this.sendMetric('aggregated', aggregated);

    // Clear sent metrics
    this.errors = [];
    this.pageViews = [];
    this.performanceMetrics = [];
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session data
   */
  getSessionData() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      errors: this.errors,
      pageViews: this.pageViews,
      performanceMetrics: this.performanceMetrics,
      webVitals: this.webVitals,
    };
  }
}

// Lazy singleton instance (only created in browser)
let monitoringInstance: FrontendMonitoring | null = null;

function getMonitoring(): FrontendMonitoring {
  if (typeof window === 'undefined') {
    // Return a no-op instance for SSR
    return {
      setUserId: () => {},
      trackPageView: () => {},
      trackError: () => {},
      trackEvent: () => {},
      trackPerformance: () => {},
      trackApiCall: () => {},
      getSessionData: () => ({
        sessionId: '',
        userId: undefined,
        errors: [],
        pageViews: [],
        performanceMetrics: [],
        webVitals: {},
      }),
    } as any;
  }

  if (!monitoringInstance) {
    monitoringInstance = new FrontendMonitoring();
  }

  return monitoringInstance;
}

// Export lazy-loaded singleton
export const monitoring = getMonitoring();

// Export for use in components
export default getMonitoring();

// Helper hook for React components
export function useMonitoring() {
  return getMonitoring();
}

// Type declarations for window
declare global {
  interface Window {
    webVitals?: any;
  }
}
