/**
 * Business Operator - Autonomous Management System for JARVIS
 *
 * Provides:
 * - Continuous health monitoring of AI DAWG services
 * - Auto-restart failed services (with retry limits)
 * - Business metrics collection (uptime, costs, performance, users)
 * - Alert system for critical issues
 * - Event-driven architecture for real-time updates
 */

import { EventEmitter } from 'events';
import { HealthAggregator } from './health-aggregator.js';
import { HealthStatus, ServiceHealth } from './types.js';
import { businessIntelligence } from './business-intelligence.js';
import { getAlertDispatcher } from './alert-dispatcher.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ServiceAlert {
  service: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  action: string;
}

export interface BusinessMetrics {
  uptime: {
    overall: number;
    byService: Record<string, number>;
  };
  performance: {
    responseTime: Record<string, number>;
    requestsPerMinute: number;
    errorRate: number;
  };
  costs: {
    total: number;
    aiApiCalls: {
      openai: number;
      anthropic: number;
      gemini: number;
    };
  };
  users: {
    active: number;
    sessions: number;
    newUsers: number;
  };
  timestamp: string;
}

export class BusinessOperator extends EventEmitter {
  private healthAggregator: HealthAggregator;
  private alertDispatcher: ReturnType<typeof getAlertDispatcher> | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private serviceRestartAttempts: Map<string, number> = new Map();
  private serviceUptimeStart: Map<string, number> = new Map();
  private alerts: ServiceAlert[] = [];
  private cachedMetrics: BusinessMetrics | null = null;
  private lastMetricsUpdate: number = 0;

  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly METRICS_INTERVAL = 300000; // 5 minutes
  private readonly METRICS_CACHE_TTL = 10000; // 10 seconds cache TTL
  private readonly MAX_RESTART_ATTEMPTS = 3;
  private readonly RESTART_WINDOW = 300000; // 5 minutes - reset attempt counter after this

  private dockerContainerMap: Record<string, string> = {
    'aiDawgBackend': 'ai-dawg-backend',
    'vocalCoach': 'ai-dawg-vocal-coach',
    'producer': 'ai-dawg-producer',
    'aiBrain': 'ai-dawg-ai-brain',
    'postgres': 'ai-dawg-postgres',
    'redis': 'ai-dawg-redis'
  };

  constructor() {
    super();
    this.healthAggregator = new HealthAggregator();
  }

  /**
   * Start the business operator
   * Begins continuous monitoring and metrics collection
   */
  async start(): Promise<void> {
    console.log('[BusinessOperator] Starting autonomous management system...');

    // Initialize Alert Dispatcher
    try {
      this.alertDispatcher = getAlertDispatcher({
        pushover: process.env.PUSHOVER_USER_KEY && process.env.PUSHOVER_API_TOKEN ? {
          userKey: process.env.PUSHOVER_USER_KEY,
          apiToken: process.env.PUSHOVER_API_TOKEN
        } : undefined,
        ntfy: process.env.NTFY_TOPIC ? {
          topic: process.env.NTFY_TOPIC,
          server: process.env.NTFY_SERVER
        } : undefined,
        macosNotifications: {
          enabled: process.env.MACOS_NOTIFICATIONS_ENABLED !== 'false'
        },
        dashboardWebSocket: {
          enabled: true
        },
        slack: process.env.SLACK_WEBHOOK_URL ? {
          enabled: true,
          webhookUrl: process.env.SLACK_WEBHOOK_URL
        } : undefined,
        chatgptWebhook: process.env.CHATGPT_WEBHOOK_URL ? {
          enabled: true,
          url: process.env.CHATGPT_WEBHOOK_URL
        } : undefined
      });
      console.log('[BusinessOperator] Alert Dispatcher initialized');
    } catch (error) {
      console.warn('[BusinessOperator] Failed to initialize Alert Dispatcher:', error);
    }

    // Initial health check
    await this.checkHealth();

    // Start continuous monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkHealth();
    }, this.HEALTH_CHECK_INTERVAL);

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.METRICS_INTERVAL);

    console.log('[BusinessOperator] Monitoring started');
    console.log(`  - Health checks every ${this.HEALTH_CHECK_INTERVAL / 1000}s`);
    console.log(`  - Metrics collection every ${this.METRICS_INTERVAL / 1000}s`);
  }

  /**
   * Stop the business operator
   */
  stop(): void {
    console.log('[BusinessOperator] Stopping monitoring...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    console.log('[BusinessOperator] Stopped');
  }

  /**
   * Check health of all AI DAWG services
   * Handles unhealthy services automatically
   */
  private async checkHealth(): Promise<void> {
    try {
      const health = await this.healthAggregator.checkAll();

      // Emit health update event
      this.emit('health-update', health);

      // Check each service
      const services = [
        { name: 'aiDawgBackend', health: health.services.aiDawgBackend },
        { name: 'vocalCoach', health: health.services.vocalCoach },
        { name: 'producer', health: health.services.producer },
        { name: 'aiBrain', health: health.services.aiBrain },
        { name: 'postgres', health: health.services.postgres },
        { name: 'redis', health: health.services.redis }
      ];

      for (const service of services) {
        if (service.health.status !== 'healthy') {
          await this.handleUnhealthyService(service.name, service.health);
        } else {
          // Reset restart attempts for healthy services
          this.serviceRestartAttempts.delete(service.name);

          // Track uptime start
          if (!this.serviceUptimeStart.has(service.name)) {
            this.serviceUptimeStart.set(service.name, Date.now());
          }
        }
      }
    } catch (error) {
      console.error('[BusinessOperator] Health check failed:', error);
      this.createAlert('system', 'critical', 'Health check system failed', 'Manual investigation required');
    }
  }

  /**
   * Handle unhealthy service
   * Attempts auto-restart with retry limits
   */
  private async handleUnhealthyService(serviceName: string, health: ServiceHealth): Promise<void> {
    const attempts = this.serviceRestartAttempts.get(serviceName) || 0;

    if (health.status === 'down') {
      if (attempts < this.MAX_RESTART_ATTEMPTS) {
        // Attempt auto-restart
        console.log(`[BusinessOperator] Service ${serviceName} is unhealthy. Attempting restart (${attempts + 1}/${this.MAX_RESTART_ATTEMPTS})`);

        this.createAlert(
          serviceName,
          'warning',
          `Service unhealthy: ${health.message}`,
          `Auto-restarting (attempt ${attempts + 1}/${this.MAX_RESTART_ATTEMPTS})`
        );

        await this.restartService(serviceName);
        this.serviceRestartAttempts.set(serviceName, attempts + 1);

        // Reset uptime tracking
        this.serviceUptimeStart.delete(serviceName);
      } else {
        // Max attempts reached - critical alert
        console.error(`[BusinessOperator] Service ${serviceName} failed after ${this.MAX_RESTART_ATTEMPTS} restart attempts`);

        this.createAlert(
          serviceName,
          'critical',
          `Service failed after ${this.MAX_RESTART_ATTEMPTS} restart attempts`,
          'Manual intervention required - check logs and container status'
        );
      }
    } else if (health.status === 'degraded') {
      // Degraded service - monitor closely but don't restart yet
      this.createAlert(
        serviceName,
        'info',
        `Service degraded: ${health.message}`,
        'Monitoring for further degradation'
      );
    }
  }

  /**
   * Restart a service using Docker
   */
  private async restartService(serviceName: string): Promise<void> {
    const containerName = this.dockerContainerMap[serviceName];

    if (!containerName) {
      console.error(`[BusinessOperator] Unknown service: ${serviceName}`);
      return;
    }

    try {
      console.log(`[BusinessOperator] Restarting Docker container: ${containerName}`);
      await execAsync(`docker restart ${containerName}`);
      console.log(`[BusinessOperator] Successfully restarted ${containerName}`);

      this.createAlert(
        serviceName,
        'info',
        'Service restarted successfully',
        'Monitoring recovery'
      );
    } catch (error) {
      console.error(`[BusinessOperator] Failed to restart ${containerName}:`, error);

      this.createAlert(
        serviceName,
        'critical',
        `Failed to restart service: ${error}`,
        'Check Docker daemon and container configuration'
      );
    }
  }

  /**
   * Collect business metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const health = await this.healthAggregator.checkAll();

      const metrics: BusinessMetrics = {
        uptime: this.calculateUptime(),
        performance: await this.calculatePerformance(health),
        costs: await this.calculateCosts(),
        users: await this.calculateUserMetrics(),
        timestamp: new Date().toISOString()
      };

      // Emit metrics update event
      this.emit('metrics-update', metrics);

      console.log('[BusinessOperator] Metrics collected:', {
        uptime: metrics.uptime.overall,
        errorRate: metrics.performance.errorRate,
        totalCost: metrics.costs.total,
        activeUsers: metrics.users.active
      });
    } catch (error) {
      console.error('[BusinessOperator] Metrics collection failed:', error);
    }
  }

  /**
   * Calculate service uptime
   */
  private calculateUptime(): BusinessMetrics['uptime'] {
    const now = Date.now();
    const byService: Record<string, number> = {};

    for (const [service, startTime] of this.serviceUptimeStart.entries()) {
      const uptimeMs = now - startTime;
      byService[service] = Math.round(uptimeMs / 1000); // Convert to seconds
    }

    // Overall uptime is minimum of all services
    const uptimes = Object.values(byService);
    const overall = uptimes.length > 0 ? Math.min(...uptimes) : 0;

    return { overall, byService };
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformance(health: HealthStatus): Promise<BusinessMetrics['performance']> {
    // Calculate average response time from health checks
    const responseTimes: Record<string, number> = {};

    for (const [serviceName, serviceHealth] of Object.entries(health.services)) {
      responseTimes[serviceName] = serviceHealth.latency || 0;
    }

    // Get request metrics from business intelligence
    const intelligence = businessIntelligence.getSnapshot(60); // Last hour

    return {
      responseTime: responseTimes,
      requestsPerMinute: intelligence.requests.requestsPerMinute,
      errorRate: intelligence.requests.errorRate
    };
  }

  /**
   * Calculate AI API costs
   */
  private async calculateCosts(): Promise<BusinessMetrics['costs']> {
    const intelligence = businessIntelligence.getSnapshot(60); // Last hour

    return {
      total: intelligence.aiUsage.totalCost,
      aiApiCalls: {
        openai: intelligence.aiUsage.byModel.openai.cost,
        anthropic: intelligence.aiUsage.byModel.anthropic.cost,
        gemini: intelligence.aiUsage.byModel.gemini.cost
      }
    };
  }

  /**
   * Calculate user metrics
   */
  private async calculateUserMetrics(): Promise<BusinessMetrics['users']> {
    const intelligence = businessIntelligence.getSnapshot(60); // Last hour

    return {
      active: intelligence.users.activeUsers,
      sessions: intelligence.users.totalSessions,
      newUsers: intelligence.users.newUsers
    };
  }

  /**
   * Create an alert
   */
  private createAlert(service: string, severity: ServiceAlert['severity'], message: string, action: string): void {
    const alert: ServiceAlert = {
      service,
      severity,
      message,
      action,
      timestamp: new Date().toISOString()
    };

    this.alerts.push(alert);
    this.emit('alert', alert);

    // Dispatch alert to all channels (iPhone, macOS, WebSocket, etc.)
    if (this.alertDispatcher) {
      this.alertDispatcher.dispatch(alert).catch(error => {
        console.error('[BusinessOperator] Failed to dispatch alert:', error);
      });
    }

    // Log based on severity
    const logFn = severity === 'critical' ? console.error : severity === 'warning' ? console.warn : console.log;
    logFn(`[BusinessOperator] [${severity.toUpperCase()}] ${service}: ${message} - ${action}`);
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 50): ServiceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get current business metrics (with caching)
   */
  async getCurrentMetrics(): Promise<BusinessMetrics> {
    // Return cached metrics if still valid
    const now = Date.now();
    if (this.cachedMetrics && (now - this.lastMetricsUpdate) < this.METRICS_CACHE_TTL) {
      return this.cachedMetrics;
    }

    // Fetch fresh metrics with timeout protection
    try {
      const health = await Promise.race([
        this.healthAggregator.checkAll(),
        new Promise<HealthStatus>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 3000)
        )
      ]) as HealthStatus;

      const metrics = {
        uptime: this.calculateUptime(),
        performance: await this.calculatePerformance(health),
        costs: await this.calculateCosts(),
        users: await this.calculateUserMetrics(),
        timestamp: new Date().toISOString()
      };

      // Cache the metrics
      this.cachedMetrics = metrics;
      this.lastMetricsUpdate = now;

      return metrics;
    } catch (error) {
      // If metrics fetch fails but we have cache, return cache
      if (this.cachedMetrics) {
        console.warn('[BusinessOperator] Using cached metrics due to fetch timeout');
        return this.cachedMetrics;
      }

      // Otherwise return default metrics
      console.error('[BusinessOperator] Metrics fetch failed, returning defaults', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get default metrics when real data unavailable
   */
  private getDefaultMetrics(): BusinessMetrics {
    return {
      uptime: {
        overall: 0,
        byService: {}
      },
      performance: {
        responseTime: {},
        requestsPerMinute: 0,
        errorRate: 0
      },
      costs: {
        total: 0,
        aiApiCalls: {
          openai: 0,
          anthropic: 0,
          gemini: 0
        }
      },
      users: {
        active: 0,
        sessions: 0,
        newUsers: 0
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current health status
   */
  async getCurrentHealth(): Promise<HealthStatus> {
    return await this.healthAggregator.checkAll();
  }
}

// Export singleton instance
export const businessOperator = new BusinessOperator();
