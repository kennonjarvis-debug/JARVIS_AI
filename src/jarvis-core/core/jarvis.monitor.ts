/**
 * Jarvis Monitor
 * System health monitoring and alerting
 */

import { EventEmitter } from 'events';
import {
  SystemHealth,
  ModuleHealth,
  JarvisEvent,
} from './jarvis.interfaces';
import { moduleRegistry } from './module-registry';
import { jarvisScheduler } from './jarvis.scheduler';
import { logger } from '../../backend/utils/logger';

/**
 * Health check interval in milliseconds
 */
const DEFAULT_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Health alert
 */
export interface HealthAlert {
  id: string;
  severity: AlertSeverity;
  module?: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  metadata?: Record<string, any>;
}

/**
 * Monitor for system and module health
 */
export class JarvisMonitor extends EventEmitter {
  private static instance: JarvisMonitor;
  private checkInterval: NodeJS.Timeout | null = null;
  private healthHistory: SystemHealth[] = [];
  private maxHistorySize: number = 1000;
  private alerts: HealthAlert[] = [];
  private maxAlerts: number = 500;
  private isRunning: boolean = false;
  private lastSystemHealth: SystemHealth | null = null;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): JarvisMonitor {
    if (!JarvisMonitor.instance) {
      JarvisMonitor.instance = new JarvisMonitor();
    }
    return JarvisMonitor.instance;
  }

  /**
   * Start health monitoring
   */
  start(intervalMs: number = DEFAULT_CHECK_INTERVAL): void {
    if (this.isRunning) {
      logger.warn('Health monitor already running');
      return;
    }

    logger.info(`Starting health monitor with ${intervalMs}ms interval`);

    // Initial health check
    this.performHealthCheck();

    // Schedule periodic health checks
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);

    this.isRunning = true;

    logger.info('Health monitor started successfully');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Health monitor not running');
      return;
    }

    logger.info('Stopping health monitor...');

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isRunning = false;

    logger.info('Health monitor stopped');
  }

  /**
   * Perform a health check on all modules
   */
  async performHealthCheck(): Promise<SystemHealth> {
    logger.debug('Performing system health check...');

    try {
      const systemHealth = await this.collectSystemHealth();

      // Record in history
      this.recordHealthHistory(systemHealth);

      // Check for health changes and generate alerts
      this.checkHealthChanges(systemHealth);

      // Update last system health
      this.lastSystemHealth = systemHealth;

      // Emit health check event
      this.emit(JarvisEvent.SYSTEM_HEALTH_CHANGED, {
        event: JarvisEvent.SYSTEM_HEALTH_CHANGED,
        timestamp: new Date(),
        data: systemHealth,
      });

      logger.debug('Health check completed', {
        status: systemHealth.status,
        healthyModules: systemHealth.metrics.healthyModules,
        degradedModules: systemHealth.metrics.degradedModules,
        unhealthyModules: systemHealth.metrics.unhealthyModules,
      });

      return systemHealth;
    } catch (error) {
      logger.error('Health check failed', {
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Collect system health status
   */
  private async collectSystemHealth(): Promise<SystemHealth> {
    const modules = moduleRegistry.getAllModules();
    const moduleHealthStatuses: Record<string, ModuleHealth> = {};

    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;
    const issues: string[] = [];

    // Collect health from all modules
    for (const module of modules) {
      try {
        const health = await module.getHealthStatus();
        moduleHealthStatuses[module.name] = health;

        if (health.status === 'healthy') {
          healthyCount++;
        } else if (health.status === 'degraded') {
          degradedCount++;
          if (health.issues) {
            issues.push(`${module.name}: ${health.issues.join(', ')}`);
          }
        } else {
          unhealthyCount++;
          if (health.issues) {
            issues.push(`${module.name}: ${health.issues.join(', ')}`);
          }
        }
      } catch (error) {
        logger.error(`Failed to get health for module: ${module.name}`, {
          error: (error as Error).message,
        });

        moduleHealthStatuses[module.name] = {
          status: 'unhealthy',
          uptime: 0,
          lastCheck: new Date(),
          issues: [`Health check failed: ${(error as Error).message}`],
        };

        unhealthyCount++;
        issues.push(`${module.name}: Health check failed`);
      }
    }

    // Determine overall system status
    let systemStatus: SystemHealth['status'] = 'healthy';
    if (unhealthyCount > 0) {
      systemStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      systemStatus = 'degraded';
    }

    // Get scheduler stats
    const schedulerStats = jarvisScheduler.getStats();

    return {
      status: systemStatus,
      modules: moduleHealthStatuses,
      uptime: this.getSystemUptime(),
      lastCheck: new Date(),
      metrics: {
        totalModules: modules.length,
        healthyModules: healthyCount,
        degradedModules: degradedCount,
        unhealthyModules: unhealthyCount,
        activeJobs: schedulerStats.activeJobs,
        commandsProcessed: 0, // Will be set by controller
        avgResponseTime: 0, // Will be set by controller
      },
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Check for health changes and generate alerts
   */
  private checkHealthChanges(currentHealth: SystemHealth): void {
    if (!this.lastSystemHealth) {
      // First health check, no comparison
      return;
    }

    const lastHealth = this.lastSystemHealth;

    // Check for overall system status change
    if (currentHealth.status !== lastHealth.status) {
      this.createAlert({
        severity: this.getAlertSeverity(currentHealth.status),
        message: `System health changed from ${lastHealth.status} to ${currentHealth.status}`,
        metadata: {
          previousStatus: lastHealth.status,
          currentStatus: currentHealth.status,
          healthyModules: currentHealth.metrics.healthyModules,
          unhealthyModules: currentHealth.metrics.unhealthyModules,
        },
      });
    }

    // Check for individual module health changes
    for (const [moduleName, currentModuleHealth] of Object.entries(currentHealth.modules)) {
      const lastModuleHealth = lastHealth.modules[moduleName];

      if (!lastModuleHealth) {
        // New module
        continue;
      }

      if (currentModuleHealth.status !== lastModuleHealth.status) {
        this.createAlert({
          severity: this.getAlertSeverity(currentModuleHealth.status),
          module: moduleName,
          message: `Module "${moduleName}" health changed from ${lastModuleHealth.status} to ${currentModuleHealth.status}`,
          metadata: {
            previousStatus: lastModuleHealth.status,
            currentStatus: currentModuleHealth.status,
            issues: currentModuleHealth.issues,
          },
        });
      }
    }

    // Check for unhealthy modules
    if (currentHealth.metrics.unhealthyModules > lastHealth.metrics.unhealthyModules) {
      const newUnhealthyCount =
        currentHealth.metrics.unhealthyModules - lastHealth.metrics.unhealthyModules;

      this.createAlert({
        severity: AlertSeverity.ERROR,
        message: `${newUnhealthyCount} additional module(s) became unhealthy`,
        metadata: {
          totalUnhealthy: currentHealth.metrics.unhealthyModules,
          newUnhealthy: newUnhealthyCount,
        },
      });
    }
  }

  /**
   * Get alert severity from health status
   */
  private getAlertSeverity(status: SystemHealth['status'] | 'unknown'): AlertSeverity {
    switch (status) {
      case 'healthy':
        return AlertSeverity.INFO;
      case 'degraded':
        return AlertSeverity.WARNING;
      case 'unhealthy':
        return AlertSeverity.ERROR;
      default:
        return AlertSeverity.INFO;
    }
  }

  /**
   * Create a health alert
   */
  private createAlert(alert: Omit<HealthAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const newAlert: HealthAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      acknowledged: false,
      ...alert,
    };

    this.alerts.push(newAlert);

    // Trim alerts if exceeds max size
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    logger.warn('Health alert created', {
      alertId: newAlert.id,
      severity: newAlert.severity,
      module: newAlert.module,
      message: newAlert.message,
    });

    // Emit alert event
    this.emit('alert:created', newAlert);
  }

  /**
   * Record health check in history
   */
  private recordHealthHistory(health: SystemHealth): void {
    this.healthHistory.push(health);

    // Trim history if exceeds max size
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get health history
   */
  getHealthHistory(limit: number = 100): SystemHealth[] {
    return this.healthHistory.slice(-limit).reverse();
  }

  /**
   * Get current system health
   */
  getCurrentHealth(): SystemHealth | null {
    return this.lastSystemHealth;
  }

  /**
   * Get all alerts
   */
  getAlerts(options?: {
    severity?: AlertSeverity;
    module?: string;
    acknowledged?: boolean;
    limit?: number;
  }): HealthAlert[] {
    let filtered = [...this.alerts];

    if (options?.severity) {
      filtered = filtered.filter(a => a.severity === options.severity);
    }

    if (options?.module) {
      filtered = filtered.filter(a => a.module === options.module);
    }

    if (options?.acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === options.acknowledged);
    }

    const limit = options?.limit || 100;
    return filtered.slice(-limit).reverse();
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);

    if (!alert) {
      return false;
    }

    alert.acknowledged = true;

    logger.info('Alert acknowledged', { alertId });

    return true;
  }

  /**
   * Acknowledge all alerts
   */
  acknowledgeAllAlerts(): number {
    const unacknowledgedCount = this.alerts.filter(a => !a.acknowledged).length;

    this.alerts.forEach(a => {
      a.acknowledged = true;
    });

    logger.info(`Acknowledged ${unacknowledgedCount} alerts`);

    return unacknowledgedCount;
  }

  /**
   * Get monitor statistics
   */
  getStats(): {
    isRunning: boolean;
    healthHistorySize: number;
    totalAlerts: number;
    unacknowledgedAlerts: number;
    alertsBySeverity: Record<AlertSeverity, number>;
    currentSystemStatus: SystemHealth['status'] | null;
  } {
    const alertsBySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.ERROR]: 0,
      [AlertSeverity.CRITICAL]: 0,
    };

    this.alerts.forEach(alert => {
      alertsBySeverity[alert.severity]++;
    });

    return {
      isRunning: this.isRunning,
      healthHistorySize: this.healthHistory.length,
      totalAlerts: this.alerts.length,
      unacknowledgedAlerts: this.alerts.filter(a => !a.acknowledged).length,
      alertsBySeverity,
      currentSystemStatus: this.lastSystemHealth?.status || null,
    };
  }

  /**
   * Get system uptime
   */
  private getSystemUptime(): number {
    // This would ideally track from system start
    // For now, return process uptime
    return process.uptime() * 1000;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown monitor
   */
  shutdown(): void {
    logger.info('Shutting down health monitor...');

    this.stop();

    logger.info('Health monitor shut down successfully');
  }
}

// Export singleton instance
export const jarvisMonitor = JarvisMonitor.getInstance();
