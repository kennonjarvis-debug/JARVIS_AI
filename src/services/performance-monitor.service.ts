import { defaultLogger } from './logger.service.js';
import { metricsService } from './metrics.service.js';
import { Request } from 'express';

export interface PerformanceMetric {
  id: string;
  type: 'query' | 'endpoint' | 'operation';
  name: string;
  duration: number;
  timestamp: Date;
  context?: Record<string, any>;
  slow: boolean;
}

export interface SlowQueryAlert {
  query: string;
  duration: number;
  table?: string;
  operation?: string;
  timestamp: Date;
  requestId?: string;
}

export interface SlowEndpointAlert {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: Date;
  requestId?: string;
  statusCode?: number;
}

export interface PerformanceStats {
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  slowestQueries: SlowQueryAlert[];
  slowestEndpoints: SlowEndpointAlert[];
  memoryUsage: {
    current: number;
    average: number;
    peak: number;
  };
  cpuUsage: {
    current: number;
    average: number;
    peak: number;
  };
}

export class PerformanceMonitorService {
  private slowQueryThreshold: number = 100; // ms
  private slowEndpointThreshold: number = 500; // ms
  private metrics: PerformanceMetric[] = [];
  private slowQueries: SlowQueryAlert[] = [];
  private slowEndpoints: SlowEndpointAlert[] = [];
  private maxMetricsSize: number = 10000;
  private maxAlertsSize: number = 1000;
  private memorySnapshots: number[] = [];
  private cpuSnapshots: number[] = [];
  private lastCpuUsage = process.cpuUsage();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize performance monitoring
   */
  private initialize() {
    // Start periodic monitoring
    this.startPeriodicMonitoring();

    defaultLogger.info('Performance monitor initialized', {
      slowQueryThreshold: this.slowQueryThreshold,
      slowEndpointThreshold: this.slowEndpointThreshold,
    });
  }

  /**
   * Start periodic monitoring of system resources
   */
  private startPeriodicMonitoring() {
    // Monitor memory every 10 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memorySnapshots.push(memUsage.heapUsed);

      // Keep last 360 snapshots (1 hour)
      if (this.memorySnapshots.length > 360) {
        this.memorySnapshots = this.memorySnapshots.slice(-360);
      }
    }, 10000);

    // Monitor CPU every 10 seconds
    setInterval(() => {
      const currentUsage = process.cpuUsage(this.lastCpuUsage);
      const totalUsage = (currentUsage.user + currentUsage.system) / 1000000; // Convert to seconds
      this.cpuSnapshots.push(totalUsage);
      this.lastCpuUsage = process.cpuUsage();

      // Keep last 360 snapshots (1 hour)
      if (this.cpuSnapshots.length > 360) {
        this.cpuSnapshots = this.cpuSnapshots.slice(-360);
      }
    }, 10000);

    // Cleanup old metrics every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Track database query performance
   */
  trackQuery(
    query: string,
    duration: number,
    options?: {
      table?: string;
      operation?: string;
      requestId?: string;
      context?: Record<string, any>;
    }
  ) {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      type: 'query',
      name: query,
      duration,
      timestamp: new Date(),
      context: options?.context,
      slow: duration > this.slowQueryThreshold,
    };

    this.metrics.push(metric);

    // Track in metrics service
    metricsService.recordDbQuery(
      options?.operation || 'query',
      options?.table || 'unknown',
      duration
    );

    // Alert on slow query
    if (metric.slow) {
      const alert: SlowQueryAlert = {
        query,
        duration,
        table: options?.table,
        operation: options?.operation,
        timestamp: new Date(),
        requestId: options?.requestId,
      };

      this.slowQueries.push(alert);

      defaultLogger.warn('Slow query detected', {
        query: query.substring(0, 100),
        duration,
        table: options?.table,
        operation: options?.operation,
        threshold: this.slowQueryThreshold,
      });

      // Trim alerts if needed
      if (this.slowQueries.length > this.maxAlertsSize) {
        this.slowQueries = this.slowQueries.slice(-this.maxAlertsSize);
      }
    }

    // Trim metrics if needed
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }

  /**
   * Track endpoint performance
   */
  trackEndpoint(
    endpoint: string,
    method: string,
    duration: number,
    options?: {
      statusCode?: number;
      requestId?: string;
      context?: Record<string, any>;
    }
  ) {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      type: 'endpoint',
      name: `${method} ${endpoint}`,
      duration,
      timestamp: new Date(),
      context: options?.context,
      slow: duration > this.slowEndpointThreshold,
    };

    this.metrics.push(metric);

    // Track in metrics service
    metricsService.recordHttpRequest(method, endpoint, options?.statusCode || 200, duration);

    // Alert on slow endpoint
    if (metric.slow) {
      const alert: SlowEndpointAlert = {
        endpoint,
        method,
        duration,
        timestamp: new Date(),
        requestId: options?.requestId,
        statusCode: options?.statusCode,
      };

      this.slowEndpoints.push(alert);

      defaultLogger.warn('Slow endpoint detected', {
        endpoint,
        method,
        duration,
        statusCode: options?.statusCode,
        threshold: this.slowEndpointThreshold,
      });

      // Trim alerts if needed
      if (this.slowEndpoints.length > this.maxAlertsSize) {
        this.slowEndpoints = this.slowEndpoints.slice(-this.maxAlertsSize);
      }
    }

    // Trim metrics if needed
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }

  /**
   * Track custom operation performance
   */
  trackOperation(
    operationName: string,
    duration: number,
    context?: Record<string, any>
  ) {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      type: 'operation',
      name: operationName,
      duration,
      timestamp: new Date(),
      context,
      slow: duration > 1000, // 1 second threshold for operations
    };

    this.metrics.push(metric);

    if (metric.slow) {
      defaultLogger.warn('Slow operation detected', {
        operation: operationName,
        duration,
        context,
      });
    }

    // Trim metrics if needed
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindow: number = 3600000): PerformanceStats {
    const now = Date.now();
    const windowStart = now - timeWindow;

    // Filter metrics within time window
    const recentMetrics = this.metrics.filter(
      m => m.timestamp.getTime() >= windowStart
    );

    // Calculate response time percentiles
    const durations = recentMetrics
      .filter(m => m.type === 'endpoint')
      .map(m => m.duration)
      .sort((a, b) => a - b);

    const averageResponseTime = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const p95ResponseTime = durations[p95Index] || 0;
    const p99ResponseTime = durations[p99Index] || 0;

    // Get slowest queries and endpoints
    const slowestQueries = [...this.slowQueries]
      .filter(q => q.timestamp.getTime() >= windowStart)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const slowestEndpoints = [...this.slowEndpoints]
      .filter(e => e.timestamp.getTime() >= windowStart)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Calculate memory stats
    const currentMemory = process.memoryUsage().heapUsed;
    const averageMemory = this.memorySnapshots.length > 0
      ? this.memorySnapshots.reduce((sum, m) => sum + m, 0) / this.memorySnapshots.length
      : currentMemory;
    const peakMemory = this.memorySnapshots.length > 0
      ? Math.max(...this.memorySnapshots)
      : currentMemory;

    // Calculate CPU stats
    const currentCpu = this.cpuSnapshots.length > 0
      ? this.cpuSnapshots[this.cpuSnapshots.length - 1]
      : 0;
    const averageCpu = this.cpuSnapshots.length > 0
      ? this.cpuSnapshots.reduce((sum, c) => sum + c, 0) / this.cpuSnapshots.length
      : 0;
    const peakCpu = this.cpuSnapshots.length > 0
      ? Math.max(...this.cpuSnapshots)
      : 0;

    return {
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      slowestQueries,
      slowestEndpoints,
      memoryUsage: {
        current: currentMemory,
        average: averageMemory,
        peak: peakMemory,
      },
      cpuUsage: {
        current: currentCpu,
        average: averageCpu,
        peak: peakCpu,
      },
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 50): SlowQueryAlert[] {
    return [...this.slowQueries]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get slow endpoints
   */
  getSlowEndpoints(limit: number = 50): SlowEndpointAlert[] {
    return [...this.slowEndpoints]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Create a timer for measuring operation duration
   */
  createTimer(operationName: string, context?: Record<string, any>): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.trackOperation(operationName, duration, context);
    };
  }

  /**
   * Cleanup old metrics
   */
  private cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Remove old metrics
    this.metrics = this.metrics.filter(
      m => now - m.timestamp.getTime() < maxAge
    );

    // Remove old slow query alerts
    this.slowQueries = this.slowQueries.filter(
      q => now - q.timestamp.getTime() < maxAge
    );

    // Remove old slow endpoint alerts
    this.slowEndpoints = this.slowEndpoints.filter(
      e => now - e.timestamp.getTime() < maxAge
    );

    defaultLogger.info('Performance monitor cleanup completed', {
      metrics: this.metrics.length,
      slowQueries: this.slowQueries.length,
      slowEndpoints: this.slowEndpoints.length,
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(threshold: number) {
    this.slowQueryThreshold = threshold;
    defaultLogger.info('Slow query threshold updated', { threshold });
  }

  /**
   * Set slow endpoint threshold
   */
  setSlowEndpointThreshold(threshold: number) {
    this.slowEndpointThreshold = threshold;
    defaultLogger.info('Slow endpoint threshold updated', { threshold });
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    this.slowQueries = [];
    this.slowEndpoints = [];
    this.memorySnapshots = [];
    this.cpuSnapshots = [];
    defaultLogger.info('Performance monitor cleared');
  }
}

// Middleware for automatic endpoint performance tracking
export function performanceMiddleware(performanceMonitor: PerformanceMonitorService) {
  return (req: Request, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const endpoint = req.route?.path || req.path || 'unknown';

      performanceMonitor.trackEndpoint(endpoint, req.method, duration, {
        statusCode: res.statusCode,
        requestId: req.id,
      });
    });

    next();
  };
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitorService();

export default performanceMonitor;
