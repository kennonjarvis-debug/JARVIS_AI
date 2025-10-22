/**
 * Health Monitor
 * Continuously monitors AI DAWG services and tracks health status
 */

import { ServiceConfig, HealthCheckResult, AutomonyConfig } from './types';
import { ServiceRegistry } from './service-registry';
import axios from 'axios';

export class HealthMonitor {
  private registry: ServiceRegistry;
  private config: AutomonyConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private onUnhealthyCallback?: (serviceName: string, result: HealthCheckResult) => void;

  constructor(registry: ServiceRegistry, config: AutomonyConfig) {
    this.registry = registry;
    this.config = config;
  }

  /**
   * Start monitoring all services
   */
  start(onUnhealthy?: (serviceName: string, result: HealthCheckResult) => void): void {
    if (this.monitoringInterval) {
      console.log('⚠️  Health monitoring already running');
      return;
    }

    this.onUnhealthyCallback = onUnhealthy;

    const intervalMs = this.config.monitoring.health_check_interval_seconds * 1000;

    console.log(`💓 Starting health monitoring (interval: ${this.config.monitoring.health_check_interval_seconds}s)`);

    // Initial check
    this.checkAllServices();

    // Start periodic checks
    this.monitoringInterval = setInterval(() => {
      this.checkAllServices();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('🛑 Health monitoring stopped');
    }
  }

  /**
   * Check all services
   */
  private async checkAllServices(): Promise<void> {
    const services = this.config.ai_dawg.services;

    for (const [serviceName, serviceConfig] of Object.entries(services)) {
      // Skip disabled services
      if (serviceConfig.enabled === false) {
        continue;
      }

      const result = await this.checkServiceHealth(serviceName, serviceConfig);

      // Update registry
      if (result.healthy) {
        this.registry.markHealthy(serviceName);
      } else {
        this.registry.markUnhealthy(serviceName);

        // Trigger callback if provided
        if (this.onUnhealthyCallback) {
          this.onUnhealthyCallback(serviceName, result);
        }
      }
    }
  }

  /**
   * Check health of a single service
   */
  async checkServiceHealth(serviceName: string, config: ServiceConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await axios.get(config.health_endpoint, {
        timeout: this.config.monitoring.health_check_timeout_seconds * 1000,
        validateStatus: (status) => status < 500 // Accept any status < 500
      });

      const responseTime = Date.now() - startTime;
      const healthy = response.status >= 200 && response.status < 400;

      if (healthy) {
        console.log(`✅ ${config.name} healthy (${responseTime}ms)`);
      } else {
        console.log(`⚠️  ${config.name} returned status ${response.status} (${responseTime}ms)`);
      }

      return {
        service: serviceName,
        healthy,
        status_code: response.status,
        response_time_ms: responseTime,
        timestamp: new Date()
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        // Network error or timeout
        console.log(`❌ ${config.name} health check failed: ${error.message}`);

        return {
          service: serviceName,
          healthy: false,
          error: error.message,
          response_time_ms: responseTime,
          timestamp: new Date()
        };
      } else {
        console.log(`❌ ${config.name} health check error:`, error);

        return {
          service: serviceName,
          healthy: false,
          error: String(error),
          response_time_ms: responseTime,
          timestamp: new Date()
        };
      }
    }
  }

  /**
   * Get latest health status for all services
   */
  async getHealthStatus(): Promise<Record<string, HealthCheckResult>> {
    const services = this.config.ai_dawg.services;
    const results: Record<string, HealthCheckResult> = {};

    for (const [serviceName, serviceConfig] of Object.entries(services)) {
      if (serviceConfig.enabled === false) {
        continue;
      }

      results[serviceName] = await this.checkServiceHealth(serviceName, serviceConfig);
    }

    return results;
  }

  /**
   * Check if all enabled services are healthy
   */
  async areAllServicesHealthy(): Promise<boolean> {
    const status = await this.getHealthStatus();
    return Object.values(status).every(result => result.healthy);
  }

  /**
   * Get unhealthy services
   */
  async getUnhealthyServices(): Promise<string[]> {
    const status = await this.getHealthStatus();
    return Object.entries(status)
      .filter(([_, result]) => !result.healthy)
      .map(([serviceName]) => serviceName);
  }
}
