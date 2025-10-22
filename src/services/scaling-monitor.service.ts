/**
 * Scaling Monitor Service for Jarvis AI Platform
 *
 * Tracks scaling metrics and events for monitoring and capacity planning.
 *
 * Features:
 * - Instance count tracking
 * - Request distribution monitoring
 * - Auto-scaling event logging
 * - Capacity planning metrics
 * - Integration with Prometheus
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { redisClient } from '../db/redis';
import { metricsService } from './metrics.service';

export interface ScalingEvent {
  timestamp: Date;
  type: 'scale-up' | 'scale-down' | 'manual-scale';
  fromInstances: number;
  toInstances: number;
  reason: string;
  duration: number; // milliseconds
  success: boolean;
  metadata?: Record<string, any>;
}

export interface CapacityMetrics {
  currentInstances: number;
  maxInstances: number;
  minInstances: number;
  utilizationPercent: number;
  requestsPerInstance: number;
  averageResponseTime: number;
  errorRate: number;
  timestamp: Date;
}

export interface ScalingStats {
  totalScaleUps: number;
  totalScaleDowns: number;
  failedScaleOps: number;
  averageScaleDuration: number;
  lastScaleEvent: ScalingEvent | null;
  uptimePercent: number;
}

class ScalingMonitorService extends EventEmitter {
  private events: ScalingEvent[] = [];
  private maxEventHistory: number = 1000;
  private metricsInterval?: NodeJS.Timeout;
  private capacityHistory: CapacityMetrics[] = [];
  private maxCapacityHistory: number = 1440; // 24 hours at 1-minute intervals

  constructor() {
    super();
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.metricsInterval) {
      logger.warn('Scaling monitor already running');
      return;
    }

    logger.info('Starting scaling monitor');

    // Collect capacity metrics every minute
    this.metricsInterval = setInterval(
      () => this.collectCapacityMetrics(),
      60000
    );

    this.emit('started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
      logger.info('Scaling monitor stopped');
      this.emit('stopped');
    }
  }

  /**
   * Record a scaling event
   */
  async recordScalingEvent(event: Omit<ScalingEvent, 'timestamp'>): Promise<void> {
    const scalingEvent: ScalingEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Add to in-memory history
    this.events.push(scalingEvent);

    // Trim history if needed
    if (this.events.length > this.maxEventHistory) {
      this.events = this.events.slice(-this.maxEventHistory);
    }

    // Store in Redis for distributed access
    await this.storeEventInRedis(scalingEvent);

    // Log the event
    logger.info('Scaling event recorded', {
      type: scalingEvent.type,
      from: scalingEvent.fromInstances,
      to: scalingEvent.toInstances,
      reason: scalingEvent.reason,
      duration: scalingEvent.duration,
      success: scalingEvent.success,
    });

    // Export to metrics service
    if (metricsService) {
      metricsService.recordScalingEvent(scalingEvent);
    }

    this.emit('scaling-event', scalingEvent);
  }

  /**
   * Store event in Redis
   */
  private async storeEventInRedis(event: ScalingEvent): Promise<void> {
    try {
      const key = `scaling:event:${event.timestamp.getTime()}`;
      await redisClient.setex(key, 86400 * 30, JSON.stringify(event)); // Keep for 30 days

      // Also add to a sorted set for time-based queries
      await redisClient.zadd(
        'scaling:events',
        event.timestamp.getTime(),
        key
      );

      // Trim old events (keep last 30 days)
      const cutoff = Date.now() - 86400 * 30 * 1000;
      await redisClient.zremrangebyscore('scaling:events', 0, cutoff);
    } catch (error) {
      logger.error('Failed to store scaling event in Redis', { error });
    }
  }

  /**
   * Collect capacity metrics
   */
  private async collectCapacityMetrics(): Promise<void> {
    try {
      const metrics = await this.getCurrentCapacityMetrics();

      // Add to history
      this.capacityHistory.push(metrics);

      // Trim history if needed
      if (this.capacityHistory.length > this.maxCapacityHistory) {
        this.capacityHistory = this.capacityHistory.slice(-this.maxCapacityHistory);
      }

      // Store in Redis
      await this.storeCapacityMetrics(metrics);

      this.emit('capacity-metrics', metrics);
    } catch (error) {
      logger.error('Failed to collect capacity metrics', { error });
    }
  }

  /**
   * Get current capacity metrics
   */
  private async getCurrentCapacityMetrics(): Promise<CapacityMetrics> {
    // Get instance count from orchestrator or registry
    const currentInstances = await this.getInstanceCount();

    const minInstances = parseInt(process.env.MIN_INSTANCES || '3', 10);
    const maxInstances = parseInt(process.env.MAX_INSTANCES || '10', 10);

    // Calculate utilization
    const utilizationPercent = ((currentInstances - minInstances) / (maxInstances - minInstances)) * 100;

    // Get metrics from metrics service
    const requestRate = await metricsService.getRequestRate();
    const requestsPerInstance = currentInstances > 0 ? requestRate / currentInstances : 0;
    const averageResponseTime = await metricsService.getAverageResponseTime();
    const errorRate = await metricsService.getErrorRate();

    return {
      currentInstances,
      maxInstances,
      minInstances,
      utilizationPercent: Math.max(0, Math.min(100, utilizationPercent)),
      requestsPerInstance,
      averageResponseTime,
      errorRate,
      timestamp: new Date(),
    };
  }

  /**
   * Store capacity metrics in Redis
   */
  private async storeCapacityMetrics(metrics: CapacityMetrics): Promise<void> {
    try {
      const key = `scaling:capacity:${metrics.timestamp.getTime()}`;
      await redisClient.setex(key, 86400 * 7, JSON.stringify(metrics)); // Keep for 7 days

      // Also store in time-series
      await redisClient.zadd(
        'scaling:capacity:timeseries',
        metrics.timestamp.getTime(),
        key
      );

      // Trim old metrics (keep last 7 days)
      const cutoff = Date.now() - 86400 * 7 * 1000;
      await redisClient.zremrangebyscore('scaling:capacity:timeseries', 0, cutoff);
    } catch (error) {
      logger.error('Failed to store capacity metrics in Redis', { error });
    }
  }

  /**
   * Get instance count
   */
  private async getInstanceCount(): Promise<number> {
    // This would typically query the orchestrator or instance registry
    // For now, return a default value
    const instanceRegistryService = await import('./instance-registry.service');
    const instances = await instanceRegistryService.instanceRegistryService.getAllInstances();
    return instances.filter(i => i.status === 'ready').length;
  }

  /**
   * Get scaling events within a time range
   */
  async getEvents(
    startTime: Date,
    endTime: Date
  ): Promise<ScalingEvent[]> {
    try {
      const keys = await redisClient.zrangebyscore(
        'scaling:events',
        startTime.getTime(),
        endTime.getTime()
      );

      const events: ScalingEvent[] = [];

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          events.push(JSON.parse(data));
        }
      }

      return events;
    } catch (error) {
      logger.error('Failed to get scaling events', { error });
      return [];
    }
  }

  /**
   * Get recent scaling events
   */
  getRecentEvents(count: number = 10): ScalingEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get capacity metrics within a time range
   */
  async getCapacityMetrics(
    startTime: Date,
    endTime: Date
  ): Promise<CapacityMetrics[]> {
    try {
      const keys = await redisClient.zrangebyscore(
        'scaling:capacity:timeseries',
        startTime.getTime(),
        endTime.getTime()
      );

      const metrics: CapacityMetrics[] = [];

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          metrics.push(JSON.parse(data));
        }
      }

      return metrics;
    } catch (error) {
      logger.error('Failed to get capacity metrics', { error });
      return [];
    }
  }

  /**
   * Get recent capacity metrics
   */
  getRecentCapacityMetrics(count: number = 60): CapacityMetrics[] {
    return this.capacityHistory.slice(-count);
  }

  /**
   * Get scaling statistics
   */
  async getStats(): Promise<ScalingStats> {
    const events = this.events;

    const scaleUps = events.filter(e => e.type === 'scale-up');
    const scaleDowns = events.filter(e => e.type === 'scale-down');
    const failed = events.filter(e => !e.success);

    const totalDuration = events.reduce((sum, e) => sum + e.duration, 0);
    const averageScaleDuration = events.length > 0 ? totalDuration / events.length : 0;

    const lastScaleEvent = events.length > 0 ? events[events.length - 1] : null;

    // Calculate uptime (percentage of time with at least min instances)
    const uptimePercent = await this.calculateUptime();

    return {
      totalScaleUps: scaleUps.length,
      totalScaleDowns: scaleDowns.length,
      failedScaleOps: failed.length,
      averageScaleDuration,
      lastScaleEvent,
      uptimePercent,
    };
  }

  /**
   * Calculate uptime percentage
   */
  private async calculateUptime(): Promise<number> {
    // Look at capacity metrics for the last 24 hours
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const metrics = await this.getCapacityMetrics(startTime, endTime);

    if (metrics.length === 0) {
      return 100; // No data, assume healthy
    }

    const minInstances = parseInt(process.env.MIN_INSTANCES || '3', 10);
    const healthyMetrics = metrics.filter(m => m.currentInstances >= minInstances);

    return (healthyMetrics.length / metrics.length) * 100;
  }

  /**
   * Get capacity forecast
   */
  async getForecast(hoursAhead: number = 24): Promise<{
    predictedInstances: number;
    predictedUtilization: number;
    confidence: number;
  }> {
    // Simple linear regression on recent capacity metrics
    const recentMetrics = this.getRecentCapacityMetrics(60); // Last hour

    if (recentMetrics.length < 10) {
      // Not enough data for forecast
      return {
        predictedInstances: recentMetrics[recentMetrics.length - 1]?.currentInstances || 3,
        predictedUtilization: 50,
        confidence: 0,
      };
    }

    // Calculate trend
    const instanceTrend = this.calculateTrend(
      recentMetrics.map(m => m.currentInstances)
    );
    const utilizationTrend = this.calculateTrend(
      recentMetrics.map(m => m.utilizationPercent)
    );

    const currentInstances = recentMetrics[recentMetrics.length - 1].currentInstances;
    const currentUtilization = recentMetrics[recentMetrics.length - 1].utilizationPercent;

    // Project forward
    const predictedInstances = Math.max(
      parseInt(process.env.MIN_INSTANCES || '3', 10),
      Math.min(
        parseInt(process.env.MAX_INSTANCES || '10', 10),
        Math.round(currentInstances + instanceTrend * hoursAhead)
      )
    );

    const predictedUtilization = Math.max(
      0,
      Math.min(100, currentUtilization + utilizationTrend * hoursAhead)
    );

    // Calculate confidence based on data consistency
    const confidence = this.calculateConfidence(recentMetrics);

    return {
      predictedInstances,
      predictedUtilization,
      confidence,
    };
  }

  /**
   * Calculate trend from data points
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, y) => sum + y, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate forecast confidence
   */
  private calculateConfidence(metrics: CapacityMetrics[]): number {
    if (metrics.length < 10) return 0;

    // Calculate variance in recent metrics
    const instances = metrics.map(m => m.currentInstances);
    const mean = instances.reduce((sum, v) => sum + v, 0) / instances.length;
    const variance = instances.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / instances.length;

    // Lower variance = higher confidence
    const maxVariance = 10; // Arbitrary threshold
    const confidence = Math.max(0, Math.min(100, (1 - variance / maxVariance) * 100));

    return confidence;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.events = [];
    this.capacityHistory = [];
    logger.info('Scaling monitor history cleared');
  }
}

export const scalingMonitorService = new ScalingMonitorService();
