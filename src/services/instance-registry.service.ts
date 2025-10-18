/**
 * Instance Registry Service for Jarvis AI Platform
 *
 * Service discovery and instance registration for distributed deployment.
 * Tracks all running instances and their metadata.
 *
 * Features:
 * - Automatic instance registration
 * - Heartbeat mechanism
 * - Instance metadata (version, capacity, health)
 * - Auto-deregistration on failure
 * - Redis-backed distributed registry
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { redisClient } from '../db/redis';

export interface InstanceMetadata {
  instanceId: string;
  hostname: string;
  pid: number;
  version: string;
  startedAt: Date;
  lastHeartbeat: Date;
  status: 'starting' | 'ready' | 'draining' | 'stopped';
  capacity: {
    maxConnections: number;
    maxMemory: number;
    cpuCores: number;
  };
  current: {
    connections: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  endpoints: {
    http: string;
    websocket?: string;
    metrics?: string;
  };
  tags: string[];
}

export interface RegistryConfig {
  heartbeatInterval: number; // seconds
  instanceTimeout: number; // seconds
  redisKeyPrefix: string;
}

class InstanceRegistryService extends EventEmitter {
  private config: RegistryConfig;
  private instanceId: string;
  private metadata: InstanceMetadata;
  private heartbeatTimer?: NodeJS.Timeout;
  private isRegistered: boolean = false;

  constructor() {
    super();

    this.config = {
      heartbeatInterval: 10, // Heartbeat every 10 seconds
      instanceTimeout: 30, // Consider instance dead after 30 seconds
      redisKeyPrefix: 'instance:registry',
    };

    this.instanceId = this.generateInstanceId();
    this.metadata = this.createMetadata();
  }

  /**
   * Configure the registry
   */
  configure(config: Partial<RegistryConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Instance registry configured', { config: this.config });
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(): string {
    const hostname = os.hostname();
    const pid = process.pid;
    const timestamp = Date.now();

    return crypto
      .createHash('sha256')
      .update(`${hostname}-${pid}-${timestamp}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Create instance metadata
   */
  private createMetadata(): InstanceMetadata {
    const cpus = os.cpus();
    const totalMem = os.totalmem();

    return {
      instanceId: this.instanceId,
      hostname: os.hostname(),
      pid: process.pid,
      version: process.env.APP_VERSION || '1.0.0',
      startedAt: new Date(),
      lastHeartbeat: new Date(),
      status: 'starting',
      capacity: {
        maxConnections: parseInt(process.env.MAX_CONNECTIONS || '1000', 10),
        maxMemory: totalMem,
        cpuCores: cpus.length,
      },
      current: {
        connections: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
      endpoints: {
        http: `http://${os.hostname()}:${process.env.PORT || 3000}`,
        websocket: process.env.WS_PORT ? `ws://${os.hostname()}:${process.env.WS_PORT}` : undefined,
        metrics: process.env.METRICS_PORT ? `http://${os.hostname()}:${process.env.METRICS_PORT}/metrics` : undefined,
      },
      tags: this.parseTags(),
    };
  }

  /**
   * Parse instance tags from environment
   */
  private parseTags(): string[] {
    const tags = process.env.INSTANCE_TAGS || '';
    return tags.split(',').filter(t => t.trim().length > 0);
  }

  /**
   * Register this instance
   */
  async register(): Promise<void> {
    if (this.isRegistered) {
      logger.warn('Instance already registered');
      return;
    }

    try {
      this.metadata.status = 'ready';
      this.metadata.lastHeartbeat = new Date();

      await this.publishMetadata();

      // Start heartbeat
      this.startHeartbeat();

      this.isRegistered = true;

      logger.info('Instance registered', {
        instanceId: this.instanceId,
        hostname: this.metadata.hostname,
        endpoints: this.metadata.endpoints,
      });

      this.emit('registered', this.metadata);
    } catch (error) {
      logger.error('Failed to register instance', { error });
      throw error;
    }
  }

  /**
   * Deregister this instance
   */
  async deregister(): Promise<void> {
    if (!this.isRegistered) {
      return;
    }

    try {
      this.stopHeartbeat();

      this.metadata.status = 'stopped';
      await this.publishMetadata();

      // Remove from registry after a delay
      setTimeout(async () => {
        await this.removeFromRegistry();
      }, 5000);

      this.isRegistered = false;

      logger.info('Instance deregistered', { instanceId: this.instanceId });
      this.emit('deregistered', this.metadata);
    } catch (error) {
      logger.error('Failed to deregister instance', { error });
    }
  }

  /**
   * Start sending heartbeats
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(
      () => this.sendHeartbeat(),
      this.config.heartbeatInterval * 1000
    );

    logger.debug('Heartbeat started', {
      interval: this.config.heartbeatInterval,
    });
  }

  /**
   * Stop sending heartbeats
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      logger.debug('Heartbeat stopped');
    }
  }

  /**
   * Send heartbeat
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      this.metadata.lastHeartbeat = new Date();
      this.updateCurrentMetrics();

      await this.publishMetadata();

      this.emit('heartbeat', this.metadata);
    } catch (error) {
      logger.error('Failed to send heartbeat', { error });
      this.emit('heartbeat-error', error);
    }
  }

  /**
   * Update current metrics
   */
  private updateCurrentMetrics(): void {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();

    this.metadata.current.memoryUsage = (memUsage.heapUsed / totalMem) * 100;

    // CPU usage would be updated by a separate monitoring service
    // For now, use a placeholder
    this.metadata.current.cpuUsage = 0;

    // Connection count would be updated by the application
    // For now, use a placeholder
    this.metadata.current.connections = 0;
  }

  /**
   * Publish metadata to Redis
   */
  private async publishMetadata(): Promise<void> {
    const key = `${this.config.redisKeyPrefix}:${this.instanceId}`;
    const ttl = this.config.instanceTimeout;

    try {
      await redisClient.setex(key, ttl, JSON.stringify(this.metadata));
    } catch (error) {
      logger.error('Failed to publish instance metadata', { error });
      throw error;
    }
  }

  /**
   * Remove from registry
   */
  private async removeFromRegistry(): Promise<void> {
    const key = `${this.config.redisKeyPrefix}:${this.instanceId}`;

    try {
      await redisClient.del(key);
      logger.debug('Instance removed from registry', { instanceId: this.instanceId });
    } catch (error) {
      logger.error('Failed to remove instance from registry', { error });
    }
  }

  /**
   * Get all registered instances
   */
  async getAllInstances(): Promise<InstanceMetadata[]> {
    const pattern = `${this.config.redisKeyPrefix}:*`;
    const instances: InstanceMetadata[] = [];

    try {
      const keys = await this.scanKeys(pattern);

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const metadata: InstanceMetadata = JSON.parse(data);

          // Check if instance is still alive
          const timeSinceHeartbeat =
            Date.now() - new Date(metadata.lastHeartbeat).getTime();

          if (timeSinceHeartbeat < this.config.instanceTimeout * 1000) {
            instances.push(metadata);
          } else {
            // Instance is dead, remove it
            await redisClient.del(key);
            logger.warn('Removed stale instance', {
              instanceId: metadata.instanceId,
              timeSinceHeartbeat,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to get all instances', { error });
    }

    return instances;
  }

  /**
   * Get instance by ID
   */
  async getInstance(instanceId: string): Promise<InstanceMetadata | null> {
    const key = `${this.config.redisKeyPrefix}:${instanceId}`;

    try {
      const data = await redisClient.get(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error('Failed to get instance', { error, instanceId });
    }

    return null;
  }

  /**
   * Get instances by tag
   */
  async getInstancesByTag(tag: string): Promise<InstanceMetadata[]> {
    const allInstances = await this.getAllInstances();
    return allInstances.filter(instance => instance.tags.includes(tag));
  }

  /**
   * Get instances by status
   */
  async getInstancesByStatus(
    status: InstanceMetadata['status']
  ): Promise<InstanceMetadata[]> {
    const allInstances = await this.getAllInstances();
    return allInstances.filter(instance => instance.status === status);
  }

  /**
   * Update instance status
   */
  async updateStatus(status: InstanceMetadata['status']): Promise<void> {
    this.metadata.status = status;
    await this.publishMetadata();

    logger.info('Instance status updated', {
      instanceId: this.instanceId,
      status,
    });

    this.emit('status-changed', status);
  }

  /**
   * Update connection count
   */
  async updateConnections(count: number): Promise<void> {
    this.metadata.current.connections = count;
  }

  /**
   * Update CPU usage
   */
  async updateCPU(usage: number): Promise<void> {
    this.metadata.current.cpuUsage = usage;
  }

  /**
   * Scan Redis keys with pattern
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      cursor = reply[0];
      keys.push(...reply[1]);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Get this instance's metadata
   */
  getMetadata(): InstanceMetadata {
    return { ...this.metadata };
  }

  /**
   * Get instance ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<{
    totalInstances: number;
    readyInstances: number;
    drainingInstances: number;
    totalConnections: number;
    averageCPU: number;
    averageMemory: number;
  }> {
    const instances = await this.getAllInstances();

    return {
      totalInstances: instances.length,
      readyInstances: instances.filter(i => i.status === 'ready').length,
      drainingInstances: instances.filter(i => i.status === 'draining').length,
      totalConnections: instances.reduce((sum, i) => sum + i.current.connections, 0),
      averageCPU:
        instances.length > 0
          ? instances.reduce((sum, i) => sum + i.current.cpuUsage, 0) / instances.length
          : 0,
      averageMemory:
        instances.length > 0
          ? instances.reduce((sum, i) => sum + i.current.memoryUsage, 0) / instances.length
          : 0,
    };
  }
}

export const instanceRegistryService = new InstanceRegistryService();
