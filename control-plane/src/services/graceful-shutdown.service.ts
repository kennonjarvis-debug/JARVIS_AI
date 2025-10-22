/**
 * Graceful Shutdown Service for Jarvis AI Platform
 *
 * Handles clean shutdown of instances during scaling down or updates.
 *
 * Features:
 * - Connection draining
 * - In-flight request completion
 * - Load balancer deregistration
 * - Database connection cleanup
 * - Redis connection cleanup
 * - Session migration
 */

import { EventEmitter } from 'events';
import { Server } from 'http';
import { logger } from '../utils/logger';
import { redisClient } from '../db/redis';
import { instanceRegistryService } from './instance-registry.service';
import { sessionAffinityManager } from '../middleware/session-affinity';
import { distributedLockService } from './distributed-lock.service';

export interface ShutdownConfig {
  timeout: number; // Maximum shutdown time in milliseconds
  drainTimeout: number; // Maximum time to drain connections
  forceShutdownOnTimeout: boolean;
}

export interface ShutdownProgress {
  stage: string;
  completed: boolean;
  error?: Error;
  duration?: number;
}

class GracefulShutdownService extends EventEmitter {
  private config: ShutdownConfig;
  private isShuttingDown: boolean = false;
  private shutdownStartTime?: Date;
  private activeConnections: Set<any> = new Set();
  private shutdownTimer?: NodeJS.Timeout;
  private server?: Server;

  constructor() {
    super();

    this.config = {
      timeout: 30000, // 30 seconds total shutdown time
      drainTimeout: 20000, // 20 seconds to drain connections
      forceShutdownOnTimeout: true,
    };
  }

  /**
   * Configure graceful shutdown
   */
  configure(config: Partial<ShutdownConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Graceful shutdown configured', { config: this.config });
  }

  /**
   * Set the HTTP server instance
   */
  setServer(server: Server): void {
    this.server = server;

    // Track connections
    server.on('connection', (socket) => {
      this.activeConnections.add(socket);

      socket.on('close', () => {
        this.activeConnections.delete(socket);
      });
    });

    logger.debug('HTTP server registered for graceful shutdown');
  }

  /**
   * Register shutdown handlers
   */
  registerHandlers(): void {
    // Handle SIGTERM (Docker, Kubernetes)
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM signal');
      await this.shutdown();
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT signal');
      await this.shutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception', { error });
      await this.shutdown(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', async (reason) => {
      logger.error('Unhandled rejection', { reason });
      await this.shutdown(1);
    });

    logger.info('Shutdown handlers registered');
  }

  /**
   * Initiate graceful shutdown
   */
  async shutdown(exitCode: number = 0): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    this.shutdownStartTime = new Date();

    logger.info('Initiating graceful shutdown', {
      timeout: this.config.timeout,
      exitCode,
    });

    this.emit('shutdown-start');

    // Set overall timeout
    if (this.config.forceShutdownOnTimeout) {
      this.shutdownTimer = setTimeout(() => {
        logger.error('Shutdown timeout exceeded, forcing exit');
        this.emit('shutdown-timeout');
        process.exit(exitCode || 1);
      }, this.config.timeout);
    }

    try {
      // Execute shutdown stages
      await this.executeShutdownStages();

      const duration = Date.now() - this.shutdownStartTime.getTime();
      logger.info('Graceful shutdown completed', { duration, exitCode });

      this.emit('shutdown-complete', { duration, exitCode });

      // Clear timeout
      if (this.shutdownTimer) {
        clearTimeout(this.shutdownTimer);
      }

      // Exit process
      process.exit(exitCode);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      this.emit('shutdown-error', error);

      // Force exit on error
      process.exit(exitCode || 1);
    }
  }

  /**
   * Execute all shutdown stages
   */
  private async executeShutdownStages(): Promise<void> {
    const stages = [
      { name: 'Deregister from load balancer', fn: () => this.deregisterFromLoadBalancer() },
      { name: 'Stop accepting new connections', fn: () => this.stopAcceptingConnections() },
      { name: 'Drain active connections', fn: () => this.drainConnections() },
      { name: 'Migrate sessions', fn: () => this.migrateSessions() },
      { name: 'Complete in-flight requests', fn: () => this.completeInFlightRequests() },
      { name: 'Release distributed locks', fn: () => this.releaseLocks() },
      { name: 'Close database connections', fn: () => this.closeDatabaseConnections() },
      { name: 'Close Redis connections', fn: () => this.closeRedisConnections() },
      { name: 'Cleanup resources', fn: () => this.cleanupResources() },
    ];

    for (const stage of stages) {
      const progress = await this.executeStage(stage.name, stage.fn);
      this.emit('shutdown-progress', progress);

      if (!progress.completed && progress.error) {
        logger.error(`Shutdown stage failed: ${stage.name}`, {
          error: progress.error,
        });
        // Continue with other stages even if one fails
      }
    }
  }

  /**
   * Execute a single shutdown stage
   */
  private async executeStage(
    name: string,
    fn: () => Promise<void>
  ): Promise<ShutdownProgress> {
    const startTime = Date.now();

    logger.info(`Shutdown stage: ${name}`);

    try {
      await fn();

      const duration = Date.now() - startTime;
      logger.info(`Shutdown stage completed: ${name}`, { duration });

      return { stage: name, completed: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Shutdown stage failed: ${name}`, { error, duration });

      return {
        stage: name,
        completed: false,
        error: error as Error,
        duration,
      };
    }
  }

  /**
   * Deregister from load balancer
   */
  private async deregisterFromLoadBalancer(): Promise<void> {
    try {
      // Update instance status to 'draining'
      await instanceRegistryService.updateStatus('draining');

      // Wait a bit for load balancer to update
      await this.delay(2000);

      logger.info('Deregistered from load balancer');
    } catch (error) {
      logger.error('Failed to deregister from load balancer', { error });
      throw error;
    }
  }

  /**
   * Stop accepting new connections
   */
  private async stopAcceptingConnections(): Promise<void> {
    if (!this.server) {
      logger.warn('No server instance registered');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          logger.error('Failed to stop accepting connections', { error });
          reject(error);
        } else {
          logger.info('Stopped accepting new connections');
          resolve();
        }
      });
    });
  }

  /**
   * Drain active connections
   */
  private async drainConnections(): Promise<void> {
    const startTime = Date.now();
    const connectionCount = this.activeConnections.size;

    logger.info('Draining connections', { count: connectionCount });

    while (this.activeConnections.size > 0) {
      const elapsed = Date.now() - startTime;

      if (elapsed > this.config.drainTimeout) {
        logger.warn('Drain timeout exceeded, forcing connection closure', {
          remaining: this.activeConnections.size,
        });

        // Force close remaining connections
        for (const socket of this.activeConnections) {
          socket.destroy();
        }
        break;
      }

      // Wait a bit before checking again
      await this.delay(100);
    }

    logger.info('Connections drained', {
      duration: Date.now() - startTime,
    });
  }

  /**
   * Migrate sessions to other instances
   */
  private async migrateSessions(): Promise<void> {
    try {
      const instanceId = instanceRegistryService.getInstanceId();

      // Get all healthy instances
      const instances = await instanceRegistryService.getAllInstances();
      const healthyInstances = instances.filter(
        (i) => i.status === 'ready' && i.instanceId !== instanceId
      );

      if (healthyInstances.length === 0) {
        logger.warn('No healthy instances available for session migration');
        return;
      }

      // Pick a random healthy instance
      const targetInstance =
        healthyInstances[Math.floor(Math.random() * healthyInstances.length)];

      // Migrate sessions
      const migratedCount = await sessionAffinityManager.migrateSessions(
        instanceId,
        targetInstance.instanceId
      );

      logger.info('Sessions migrated', {
        to: targetInstance.instanceId,
        count: migratedCount,
      });
    } catch (error) {
      logger.error('Failed to migrate sessions', { error });
      throw error;
    }
  }

  /**
   * Complete in-flight requests
   */
  private async completeInFlightRequests(): Promise<void> {
    // Wait for a short time to allow in-flight requests to complete
    // This is handled mostly by connection draining
    await this.delay(1000);

    logger.info('In-flight requests completed');
  }

  /**
   * Release all distributed locks
   */
  private async releaseLocks(): Promise<void> {
    try {
      await distributedLockService.releaseAll();
      logger.info('All distributed locks released');
    } catch (error) {
      logger.error('Failed to release locks', { error });
      throw error;
    }
  }

  /**
   * Close database connections
   */
  private async closeDatabaseConnections(): Promise<void> {
    try {
      // Close Prisma connections
      const { prisma } = await import('../db/prisma');
      await prisma.$disconnect();

      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Failed to close database connections', { error });
      throw error;
    }
  }

  /**
   * Close Redis connections
   */
  private async closeRedisConnections(): Promise<void> {
    try {
      await redisClient.quit();
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Failed to close Redis connections', { error });
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanupResources(): Promise<void> {
    try {
      // Deregister from instance registry
      await instanceRegistryService.deregister();

      // Clear any timers, intervals, etc.
      this.activeConnections.clear();

      logger.info('Resources cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup resources', { error });
      throw error;
    }
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Check if shutdown is in progress
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Get shutdown progress
   */
  getShutdownProgress(): {
    isShuttingDown: boolean;
    startTime: Date | undefined;
    elapsed: number;
    activeConnections: number;
  } {
    return {
      isShuttingDown: this.isShuttingDown,
      startTime: this.shutdownStartTime,
      elapsed: this.shutdownStartTime
        ? Date.now() - this.shutdownStartTime.getTime()
        : 0,
      activeConnections: this.activeConnections.size,
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const gracefulShutdownService = new GracefulShutdownService();
