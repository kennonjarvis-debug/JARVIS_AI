/**
 * Auto-Scaler Service for Jarvis AI Platform
 *
 * Monitors system metrics and automatically scales instances
 * based on CPU, memory, and request rate thresholds.
 *
 * Features:
 * - CPU and memory monitoring
 * - Request rate tracking
 * - Gradual scaling (one instance at a time)
 * - Cooldown periods to prevent flapping
 * - Integration with Docker Swarm/Kubernetes
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import { logger } from '../utils/logger';
import { metricsService } from './metrics.service';

export interface ScalingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
  activeConnections: number;
  instanceCount: number;
  timestamp: Date;
}

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCPU: number;
  targetMemory: number;
  targetRequestRate: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number; // seconds
  checkInterval: number; // seconds
}

export interface ScalingDecision {
  action: 'scale-up' | 'scale-down' | 'no-action';
  reason: string;
  currentInstances: number;
  targetInstances: number;
  metrics: ScalingMetrics;
}

class AutoScalerService extends EventEmitter {
  private config: ScalingConfig;
  private checkTimer?: NodeJS.Timeout;
  private lastScaleTime: Date = new Date(0);
  private requestCount: number = 0;
  private lastRequestCountReset: Date = new Date();
  private isScaling: boolean = false;

  constructor() {
    super();

    // Default configuration
    this.config = {
      minInstances: 3,
      maxInstances: 10,
      targetCPU: 70, // 70% CPU target
      targetMemory: 80, // 80% memory target
      targetRequestRate: 1000, // 1000 req/s per instance
      scaleUpThreshold: 0.8, // Scale up when 80% of target
      scaleDownThreshold: 0.3, // Scale down when 30% of target
      cooldownPeriod: 300, // 5 minutes
      checkInterval: 30, // Check every 30 seconds
    };
  }

  /**
   * Configure the auto-scaler
   */
  configure(config: Partial<ScalingConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Auto-scaler configured', { config: this.config });
  }

  /**
   * Start the auto-scaler
   */
  start(): void {
    if (this.checkTimer) {
      logger.warn('Auto-scaler already running');
      return;
    }

    logger.info('Starting auto-scaler', {
      minInstances: this.config.minInstances,
      maxInstances: this.config.maxInstances,
      checkInterval: this.config.checkInterval,
    });

    this.checkTimer = setInterval(
      () => this.checkAndScale(),
      this.config.checkInterval * 1000
    );

    this.emit('started');
  }

  /**
   * Stop the auto-scaler
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
      logger.info('Auto-scaler stopped');
      this.emit('stopped');
    }
  }

  /**
   * Record a request for rate calculation
   */
  recordRequest(): void {
    this.requestCount++;
  }

  /**
   * Get current system metrics
   */
  private async getMetrics(): Promise<ScalingMetrics> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // Calculate CPU usage (average across all cores)
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const cpuUsage = ((total - idle) / total) * 100;

    // Calculate memory usage
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    // Calculate request rate (requests per second)
    const now = new Date();
    const timeDiff = (now.getTime() - this.lastRequestCountReset.getTime()) / 1000;
    const requestRate = timeDiff > 0 ? this.requestCount / timeDiff : 0;

    // Reset request counter every minute
    if (timeDiff >= 60) {
      this.requestCount = 0;
      this.lastRequestCountReset = now;
    }

    // Get instance count from orchestrator
    const instanceCount = await this.getInstanceCount();

    // Get active connections from metrics
    const activeConnections = await metricsService.getActiveConnections();

    return {
      cpuUsage,
      memoryUsage,
      requestRate,
      activeConnections,
      instanceCount,
      timestamp: now,
    };
  }

  /**
   * Check metrics and make scaling decision
   */
  private async checkAndScale(): Promise<void> {
    if (this.isScaling) {
      logger.debug('Scaling operation in progress, skipping check');
      return;
    }

    try {
      const metrics = await this.getMetrics();
      const decision = this.makeScalingDecision(metrics);

      // Log metrics
      logger.debug('Scaling metrics', {
        cpu: metrics.cpuUsage.toFixed(2),
        memory: metrics.memoryUsage.toFixed(2),
        requestRate: metrics.requestRate.toFixed(2),
        instances: metrics.instanceCount,
      });

      // Execute scaling decision
      if (decision.action !== 'no-action') {
        await this.executeScaling(decision);
      }

      this.emit('metrics', metrics);
      this.emit('decision', decision);
    } catch (error) {
      logger.error('Error in auto-scaler check', { error });
      this.emit('error', error);
    }
  }

  /**
   * Make scaling decision based on metrics
   */
  private makeScalingDecision(metrics: ScalingMetrics): ScalingDecision {
    const { instanceCount } = metrics;

    // Check cooldown period
    const now = new Date();
    const timeSinceLastScale = (now.getTime() - this.lastScaleTime.getTime()) / 1000;

    if (timeSinceLastScale < this.config.cooldownPeriod) {
      return {
        action: 'no-action',
        reason: `Cooldown period (${this.config.cooldownPeriod - timeSinceLastScale}s remaining)`,
        currentInstances: instanceCount,
        targetInstances: instanceCount,
        metrics,
      };
    }

    // Calculate load factors
    const cpuLoad = metrics.cpuUsage / this.config.targetCPU;
    const memoryLoad = metrics.memoryUsage / this.config.targetMemory;
    const requestLoad = metrics.requestRate / (this.config.targetRequestRate * instanceCount);

    // Use the highest load factor
    const maxLoad = Math.max(cpuLoad, memoryLoad, requestLoad);

    // Scale up decision
    if (maxLoad >= this.config.scaleUpThreshold && instanceCount < this.config.maxInstances) {
      let reason = '';
      if (cpuLoad >= this.config.scaleUpThreshold) reason = `CPU: ${metrics.cpuUsage.toFixed(1)}%`;
      else if (memoryLoad >= this.config.scaleUpThreshold) reason = `Memory: ${metrics.memoryUsage.toFixed(1)}%`;
      else reason = `Request rate: ${metrics.requestRate.toFixed(0)}/s`;

      return {
        action: 'scale-up',
        reason: `High load (${reason})`,
        currentInstances: instanceCount,
        targetInstances: instanceCount + 1,
        metrics,
      };
    }

    // Scale down decision
    if (maxLoad <= this.config.scaleDownThreshold && instanceCount > this.config.minInstances) {
      return {
        action: 'scale-down',
        reason: `Low load (${(maxLoad * 100).toFixed(1)}%)`,
        currentInstances: instanceCount,
        targetInstances: instanceCount - 1,
        metrics,
      };
    }

    return {
      action: 'no-action',
      reason: `Load within acceptable range (${(maxLoad * 100).toFixed(1)}%)`,
      currentInstances: instanceCount,
      targetInstances: instanceCount,
      metrics,
    };
  }

  /**
   * Execute scaling decision
   */
  private async executeScaling(decision: ScalingDecision): Promise<void> {
    this.isScaling = true;

    try {
      logger.info('Executing scaling decision', {
        action: decision.action,
        reason: decision.reason,
        from: decision.currentInstances,
        to: decision.targetInstances,
      });

      if (decision.action === 'scale-up') {
        await this.scaleUp(decision.targetInstances);
      } else if (decision.action === 'scale-down') {
        await this.scaleDown(decision.targetInstances);
      }

      this.lastScaleTime = new Date();
      this.emit('scaled', decision);

      logger.info('Scaling completed', {
        action: decision.action,
        instances: decision.targetInstances,
      });
    } catch (error) {
      logger.error('Failed to execute scaling', { error, decision });
      this.emit('scaling-error', { error, decision });
    } finally {
      this.isScaling = false;
    }
  }

  /**
   * Scale up by adding instances
   */
  private async scaleUp(targetInstances: number): Promise<void> {
    const orchestrator = process.env.ORCHESTRATOR || 'docker';

    if (orchestrator === 'docker') {
      await this.scaleDockerService(targetInstances);
    } else if (orchestrator === 'kubernetes') {
      await this.scaleKubernetesDeployment(targetInstances);
    } else {
      logger.warn('Unknown orchestrator, scaling skipped', { orchestrator });
    }
  }

  /**
   * Scale down by removing instances
   */
  private async scaleDown(targetInstances: number): Promise<void> {
    const orchestrator = process.env.ORCHESTRATOR || 'docker';

    if (orchestrator === 'docker') {
      await this.scaleDockerService(targetInstances);
    } else if (orchestrator === 'kubernetes') {
      await this.scaleKubernetesDeployment(targetInstances);
    } else {
      logger.warn('Unknown orchestrator, scaling skipped', { orchestrator });
    }
  }

  /**
   * Scale Docker Swarm service
   */
  private async scaleDockerService(replicas: number): Promise<void> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const serviceName = process.env.DOCKER_SERVICE_NAME || 'jarvis-app';

    try {
      await execAsync(`docker service scale ${serviceName}=${replicas}`);
      logger.info('Docker service scaled', { service: serviceName, replicas });
    } catch (error) {
      logger.error('Failed to scale Docker service', { error, service: serviceName });
      throw error;
    }
  }

  /**
   * Scale Kubernetes deployment
   */
  private async scaleKubernetesDeployment(replicas: number): Promise<void> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const deploymentName = process.env.K8S_DEPLOYMENT_NAME || 'jarvis-app';
    const namespace = process.env.K8S_NAMESPACE || 'default';

    try {
      await execAsync(
        `kubectl scale deployment ${deploymentName} --replicas=${replicas} -n ${namespace}`
      );
      logger.info('Kubernetes deployment scaled', {
        deployment: deploymentName,
        namespace,
        replicas
      });
    } catch (error) {
      logger.error('Failed to scale Kubernetes deployment', {
        error,
        deployment: deploymentName
      });
      throw error;
    }
  }

  /**
   * Get current instance count
   */
  private async getInstanceCount(): Promise<number> {
    const orchestrator = process.env.ORCHESTRATOR || 'docker';

    try {
      if (orchestrator === 'docker') {
        return await this.getDockerInstanceCount();
      } else if (orchestrator === 'kubernetes') {
        return await this.getKubernetesInstanceCount();
      }
    } catch (error) {
      logger.error('Failed to get instance count', { error });
    }

    // Default to minimum instances if unable to determine
    return this.config.minInstances;
  }

  /**
   * Get Docker Swarm instance count
   */
  private async getDockerInstanceCount(): Promise<number> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const serviceName = process.env.DOCKER_SERVICE_NAME || 'jarvis-app';

    try {
      const { stdout } = await execAsync(
        `docker service ls --filter name=${serviceName} --format "{{.Replicas}}"`
      );
      const match = stdout.trim().match(/(\d+)\/\d+/);
      return match ? parseInt(match[1], 10) : this.config.minInstances;
    } catch (error) {
      logger.error('Failed to get Docker instance count', { error });
      return this.config.minInstances;
    }
  }

  /**
   * Get Kubernetes instance count
   */
  private async getKubernetesInstanceCount(): Promise<number> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const deploymentName = process.env.K8S_DEPLOYMENT_NAME || 'jarvis-app';
    const namespace = process.env.K8S_NAMESPACE || 'default';

    try {
      const { stdout } = await execAsync(
        `kubectl get deployment ${deploymentName} -n ${namespace} -o jsonpath='{.status.replicas}'`
      );
      return parseInt(stdout.trim(), 10) || this.config.minInstances;
    } catch (error) {
      logger.error('Failed to get Kubernetes instance count', { error });
      return this.config.minInstances;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ScalingConfig {
    return { ...this.config };
  }

  /**
   * Get scaling status
   */
  getStatus(): {
    running: boolean;
    isScaling: boolean;
    lastScaleTime: Date;
    config: ScalingConfig;
  } {
    return {
      running: !!this.checkTimer,
      isScaling: this.isScaling,
      lastScaleTime: this.lastScaleTime,
      config: this.config,
    };
  }
}

export const autoScalerService = new AutoScalerService();
