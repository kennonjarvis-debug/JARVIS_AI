/**
 * Monitoring and Health Check Configuration
 * Provides system health monitoring and alerting
 */

import type { Request, Response, NextFunction } from 'express';
import { Logger } from '../src/utils/logger.js';

const logger = new Logger('Monitoring');

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail';
      message?: string;
      responseTime?: number;
    };
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

export class HealthMonitor {
  private startTime: number;
  private checks: Map<string, () => Promise<boolean>>;

  constructor() {
    this.startTime = Date.now();
    this.checks = new Map();
    this.registerDefaultChecks();
  }

  private registerDefaultChecks(): void {
    // Database check (Supabase)
    this.registerCheck('database', async () => {
      try {
        // Test database connection
        const { SUPABASE_URL } = process.env;
        if (!SUPABASE_URL) return false;

        // Basic connectivity check
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      } catch (error) {
        logger.error('Database health check failed', error);
        return false;
      }
    });

    // API dependencies check
    this.registerCheck('anthropic', async () => {
      try {
        const { ANTHROPIC_API_KEY } = process.env;
        return !!ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.startsWith('sk-ant-');
      } catch (error) {
        return false;
      }
    });

    // Memory check
    this.registerCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;

      // Warn if using more than 80% of heap
      const usagePercentage = (heapUsedMB / heapTotalMB) * 100;
      if (usagePercentage > 80) {
        logger.warn('High memory usage', { usagePercentage, heapUsedMB, heapTotalMB });
      }

      // Fail if using more than 95% of heap
      return usagePercentage < 95;
    });
  }

  /**
   * Register a custom health check
   */
  registerCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.checks.set(name, checkFn);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<HealthCheckResult> {
    const results: HealthCheckResult['checks'] = {};
    let overallStatus: HealthCheckResult['status'] = 'healthy';

    for (const [name, checkFn] of this.checks.entries()) {
      const startTime = Date.now();
      try {
        const passed = await checkFn();
        results[name] = {
          status: passed ? 'pass' : 'fail',
          responseTime: Date.now() - startTime,
        };

        if (!passed) {
          overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
        }
      } catch (error: any) {
        results[name] = {
          status: 'fail',
          message: error.message,
          responseTime: Date.now() - startTime,
        };
        overallStatus = 'unhealthy';
      }
    }

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks: results,
      system: {
        memory: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        },
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        },
      },
    };
  }

  /**
   * Express middleware for health check endpoint
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const health = await this.runHealthChecks();

        const statusCode = health.status === 'healthy' ? 200 :
                          health.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Health check failed', error);
        res.status(503).json({
          status: 'unhealthy',
          error: 'Health check failed',
        });
      }
    };
  }
}

/**
 * Request metrics middleware
 */
export class MetricsCollector {
  private requests: {
    total: number;
    successful: number;
    failed: number;
    byEndpoint: Map<string, { count: number; totalDuration: number }>;
  };

  constructor() {
    this.requests = {
      total: 0,
      successful: 0,
      failed: 0,
      byEndpoint: new Map(),
    };
  }

  /**
   * Express middleware to track request metrics
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      // Track response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const endpoint = `${req.method} ${req.path}`;

        this.requests.total++;

        if (res.statusCode < 400) {
          this.requests.successful++;
        } else {
          this.requests.failed++;
        }

        // Track per-endpoint metrics
        const endpointMetrics = this.requests.byEndpoint.get(endpoint) || {
          count: 0,
          totalDuration: 0,
        };
        endpointMetrics.count++;
        endpointMetrics.totalDuration += duration;
        this.requests.byEndpoint.set(endpoint, endpointMetrics);

        // Log slow requests
        if (duration > 5000) {
          logger.warn('Slow request detected', {
            endpoint,
            duration,
            statusCode: res.statusCode,
          });
        }
      });

      next();
    };
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const endpointMetrics = Array.from(this.requests.byEndpoint.entries()).map(
      ([endpoint, metrics]) => ({
        endpoint,
        count: metrics.count,
        avgDuration: metrics.totalDuration / metrics.count,
      })
    );

    return {
      total_requests: this.requests.total,
      successful_requests: this.requests.successful,
      failed_requests: this.requests.failed,
      success_rate: this.requests.total > 0
        ? (this.requests.successful / this.requests.total) * 100
        : 0,
      endpoints: endpointMetrics,
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.requests.total = 0;
    this.requests.successful = 0;
    this.requests.failed = 0;
    this.requests.byEndpoint.clear();
  }
}

/**
 * Alert manager for critical events
 */
export class AlertManager {
  private webhookUrl?: string;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Send alert to Discord webhook
   */
  async sendAlert(message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Alert webhook not configured');
      return;
    }

    const emoji = level === 'error' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';
    const color = level === 'error' ? 15158332 : level === 'warning' ? 16776960 : 3447003;

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `${emoji} JARVIS Alert`,
            description: message,
            color,
            timestamp: new Date().toISOString(),
            footer: {
              text: 'JARVIS Monitoring System',
            },
          }],
        }),
      });
    } catch (error) {
      logger.error('Failed to send alert', error);
    }
  }

  /**
   * Alert on system health issues
   */
  async alertOnHealth(health: HealthCheckResult): Promise<void> {
    if (health.status === 'unhealthy') {
      const failedChecks = Object.entries(health.checks)
        .filter(([_, check]) => check.status === 'fail')
        .map(([name]) => name)
        .join(', ');

      await this.sendAlert(
        `System health check failed!\nFailed checks: ${failedChecks}`,
        'error'
      );
    } else if (health.status === 'degraded') {
      await this.sendAlert(
        'System health degraded. Some checks are failing.',
        'warning'
      );
    }

    // Alert on high memory usage
    if (health.system.memory.percentage > 90) {
      await this.sendAlert(
        `High memory usage: ${health.system.memory.percentage.toFixed(1)}%`,
        'warning'
      );
    }
  }
}

// Export singleton instances
export const healthMonitor = new HealthMonitor();
export const metricsCollector = new MetricsCollector();
export const alertManager = new AlertManager(process.env.DISCORD_WEBHOOK_URL);
