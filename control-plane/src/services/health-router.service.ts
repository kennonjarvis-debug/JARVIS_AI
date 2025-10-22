/**
 * Health-Based Routing Service for Jarvis AI Platform
 *
 * Implements intelligent routing based on instance health scores.
 * Routes traffic away from unhealthy instances and supports gradual recovery.
 *
 * Features:
 * - Real-time health tracking
 * - Dynamic routing weights
 * - Gradual instance recovery
 * - Circuit breaker pattern
 * - Health score calculation
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { redisClient } from '../db/redis';

export interface InstanceHealth {
  instanceId: string;
  healthScore: number; // 0-100
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  metrics: {
    cpu: number;
    memory: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  lastCheck: Date;
  consecutiveFailures: number;
  weight: number; // Routing weight (0-100)
}

export interface RoutingDecision {
  instanceId: string;
  reason: string;
  healthScore: number;
  weight: number;
}

export interface HealthCheckConfig {
  checkInterval: number; // seconds
  healthyThreshold: number; // Health score to be considered healthy
  degradedThreshold: number; // Health score to be considered degraded
  maxConsecutiveFailures: number;
  recoveryGracePeriod: number; // seconds
  circuitBreakerThreshold: number; // consecutive failures to open circuit
}

class HealthRouterService extends EventEmitter {
  private config: HealthCheckConfig;
  private instances: Map<string, InstanceHealth> = new Map();
  private checkTimer?: NodeJS.Timeout;
  private circuitBreakers: Map<string, { open: boolean; openedAt: Date }> = new Map();

  constructor() {
    super();

    this.config = {
      checkInterval: 10, // Check every 10 seconds
      healthyThreshold: 70,
      degradedThreshold: 40,
      maxConsecutiveFailures: 3,
      recoveryGracePeriod: 60, // 1 minute
      circuitBreakerThreshold: 5,
    };
  }

  /**
   * Configure health router
   */
  configure(config: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Health router configured', { config: this.config });
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.checkTimer) {
      logger.warn('Health router already running');
      return;
    }

    logger.info('Starting health router', {
      checkInterval: this.config.checkInterval,
    });

    this.checkTimer = setInterval(
      () => this.checkAllInstances(),
      this.config.checkInterval * 1000
    );

    this.emit('started');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
      logger.info('Health router stopped');
      this.emit('stopped');
    }
  }

  /**
   * Register an instance
   */
  async registerInstance(instanceId: string): Promise<void> {
    const health: InstanceHealth = {
      instanceId,
      healthScore: 100,
      status: 'healthy',
      metrics: {
        cpu: 0,
        memory: 0,
        responseTime: 0,
        errorRate: 0,
        activeConnections: 0,
      },
      lastCheck: new Date(),
      consecutiveFailures: 0,
      weight: 100,
    };

    this.instances.set(instanceId, health);

    // Store in Redis for distributed access
    await this.storeInstanceHealth(health);

    logger.info('Instance registered', { instanceId });
    this.emit('instance-registered', instanceId);
  }

  /**
   * Deregister an instance
   */
  async deregisterInstance(instanceId: string): Promise<void> {
    this.instances.delete(instanceId);
    this.circuitBreakers.delete(instanceId);

    // Remove from Redis
    await redisClient.del(`instance:health:${instanceId}`);

    logger.info('Instance deregistered', { instanceId });
    this.emit('instance-deregistered', instanceId);
  }

  /**
   * Update instance health metrics
   */
  async updateHealth(
    instanceId: string,
    metrics: Partial<InstanceHealth['metrics']>
  ): Promise<void> {
    const health = this.instances.get(instanceId);
    if (!health) {
      logger.warn('Attempted to update health for unknown instance', { instanceId });
      return;
    }

    // Update metrics
    health.metrics = { ...health.metrics, ...metrics };
    health.lastCheck = new Date();

    // Calculate health score
    health.healthScore = this.calculateHealthScore(health.metrics);

    // Update status based on health score
    if (health.healthScore >= this.config.healthyThreshold) {
      health.status = 'healthy';
      health.consecutiveFailures = 0;
    } else if (health.healthScore >= this.config.degradedThreshold) {
      health.status = 'degraded';
    } else {
      health.status = 'unhealthy';
      health.consecutiveFailures++;
    }

    // Update routing weight
    health.weight = this.calculateRoutingWeight(health);

    // Check circuit breaker
    this.updateCircuitBreaker(health);

    // Store updated health
    await this.storeInstanceHealth(health);

    this.emit('health-updated', health);
  }

  /**
   * Calculate health score from metrics
   */
  private calculateHealthScore(metrics: InstanceHealth['metrics']): number {
    // Weight factors for each metric
    const weights = {
      cpu: 0.25,
      memory: 0.25,
      responseTime: 0.25,
      errorRate: 0.25,
    };

    // Calculate individual scores (0-100)
    const cpuScore = Math.max(0, 100 - metrics.cpu);
    const memoryScore = Math.max(0, 100 - metrics.memory);

    // Response time score (assume 1000ms is poor, 100ms is good)
    const responseTimeScore = Math.max(0, 100 - (metrics.responseTime / 10));

    // Error rate score (assume 10% is poor)
    const errorRateScore = Math.max(0, 100 - (metrics.errorRate * 10));

    // Weighted average
    const score =
      cpuScore * weights.cpu +
      memoryScore * weights.memory +
      responseTimeScore * weights.responseTime +
      errorRateScore * weights.errorRate;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Calculate routing weight based on health
   */
  private calculateRoutingWeight(health: InstanceHealth): number {
    // Start with health score as base weight
    let weight = health.healthScore;

    // Reduce weight during recovery
    const timeSinceLastFailure = Date.now() - health.lastCheck.getTime();
    if (
      health.consecutiveFailures > 0 &&
      timeSinceLastFailure < this.config.recoveryGracePeriod * 1000
    ) {
      // Gradual recovery: increase weight over grace period
      const recoveryProgress = timeSinceLastFailure / (this.config.recoveryGracePeriod * 1000);
      weight = weight * recoveryProgress;
    }

    // Zero weight if circuit breaker is open
    const breaker = this.circuitBreakers.get(health.instanceId);
    if (breaker?.open) {
      weight = 0;
    }

    return Math.round(Math.max(0, Math.min(100, weight)));
  }

  /**
   * Update circuit breaker status
   */
  private updateCircuitBreaker(health: InstanceHealth): void {
    const breaker = this.circuitBreakers.get(health.instanceId);

    if (health.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      if (!breaker || !breaker.open) {
        // Open circuit breaker
        this.circuitBreakers.set(health.instanceId, {
          open: true,
          openedAt: new Date(),
        });
        logger.warn('Circuit breaker opened', {
          instanceId: health.instanceId,
          consecutiveFailures: health.consecutiveFailures,
        });
        this.emit('circuit-breaker-opened', health.instanceId);
      }
    } else if (breaker?.open) {
      // Close circuit breaker if instance recovered
      if (health.healthScore >= this.config.healthyThreshold) {
        this.circuitBreakers.delete(health.instanceId);
        logger.info('Circuit breaker closed', {
          instanceId: health.instanceId,
        });
        this.emit('circuit-breaker-closed', health.instanceId);
      }
    }
  }

  /**
   * Get best instance for routing
   */
  async getBestInstance(): Promise<RoutingDecision | null> {
    const availableInstances = Array.from(this.instances.values()).filter(
      health => health.weight > 0 && health.status !== 'offline'
    );

    if (availableInstances.length === 0) {
      logger.error('No healthy instances available for routing');
      return null;
    }

    // Weighted random selection
    const totalWeight = availableInstances.reduce((sum, h) => sum + h.weight, 0);
    let random = Math.random() * totalWeight;

    for (const health of availableInstances) {
      random -= health.weight;
      if (random <= 0) {
        return {
          instanceId: health.instanceId,
          reason: `Health: ${health.healthScore}, Weight: ${health.weight}`,
          healthScore: health.healthScore,
          weight: health.weight,
        };
      }
    }

    // Fallback to first available instance
    const fallback = availableInstances[0];
    return {
      instanceId: fallback.instanceId,
      reason: 'Fallback selection',
      healthScore: fallback.healthScore,
      weight: fallback.weight,
    };
  }

  /**
   * Get all instances sorted by health
   */
  getInstancesByHealth(): InstanceHealth[] {
    return Array.from(this.instances.values())
      .sort((a, b) => b.healthScore - a.healthScore);
  }

  /**
   * Get instance health
   */
  getInstanceHealth(instanceId: string): InstanceHealth | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Check all instances
   */
  private async checkAllInstances(): Promise<void> {
    for (const [instanceId, health] of this.instances.entries()) {
      try {
        await this.checkInstance(instanceId);
      } catch (error) {
        logger.error('Failed to check instance', { error, instanceId });
      }
    }
  }

  /**
   * Check individual instance
   */
  private async checkInstance(instanceId: string): Promise<void> {
    // This would typically make an HTTP request to the instance health endpoint
    // For now, we'll load from Redis (updated by the instance itself)
    try {
      const data = await redisClient.get(`instance:health:${instanceId}`);
      if (data) {
        const health: InstanceHealth = JSON.parse(data);
        this.instances.set(instanceId, health);

        // Check if instance is stale (no update in 2x check interval)
        const staleThreshold = this.config.checkInterval * 2 * 1000;
        const timeSinceUpdate = Date.now() - new Date(health.lastCheck).getTime();

        if (timeSinceUpdate > staleThreshold) {
          health.status = 'offline';
          health.weight = 0;
          logger.warn('Instance marked as offline (stale)', {
            instanceId,
            timeSinceUpdate,
          });
        }
      } else {
        // Instance not found in Redis, mark as offline
        const health = this.instances.get(instanceId);
        if (health) {
          health.status = 'offline';
          health.weight = 0;
        }
      }
    } catch (error) {
      logger.error('Failed to load instance health from Redis', { error, instanceId });
    }
  }

  /**
   * Store instance health in Redis
   */
  private async storeInstanceHealth(health: InstanceHealth): Promise<void> {
    try {
      await redisClient.setex(
        `instance:health:${health.instanceId}`,
        this.config.checkInterval * 3, // TTL = 3x check interval
        JSON.stringify(health)
      );
    } catch (error) {
      logger.error('Failed to store instance health in Redis', {
        error,
        instanceId: health.instanceId,
      });
    }
  }

  /**
   * Get routing statistics
   */
  getStats(): {
    totalInstances: number;
    healthyInstances: number;
    degradedInstances: number;
    unhealthyInstances: number;
    offlineInstances: number;
    openCircuitBreakers: number;
    averageHealthScore: number;
  } {
    const instances = Array.from(this.instances.values());

    return {
      totalInstances: instances.length,
      healthyInstances: instances.filter(h => h.status === 'healthy').length,
      degradedInstances: instances.filter(h => h.status === 'degraded').length,
      unhealthyInstances: instances.filter(h => h.status === 'unhealthy').length,
      offlineInstances: instances.filter(h => h.status === 'offline').length,
      openCircuitBreakers: Array.from(this.circuitBreakers.values()).filter(b => b.open).length,
      averageHealthScore:
        instances.length > 0
          ? Math.round(instances.reduce((sum, h) => sum + h.healthScore, 0) / instances.length)
          : 0,
    };
  }
}

export const healthRouterService = new HealthRouterService();
