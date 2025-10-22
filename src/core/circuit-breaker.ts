/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by temporarily blocking requests
 * to failing services and allowing them time to recover.
 *
 * AWS-Ready: State persisted to RDS for multi-instance coordination
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

export enum CircuitState {
  CLOSED = 'CLOSED',         // Normal operation
  OPEN = 'OPEN',             // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN'    // Testing if recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number;      // Open after N failures
  successThreshold: number;      // Close after N successes in HALF_OPEN
  timeout: number;               // Time before trying again (ms)
  resetTimeout: number;          // Time to reset failure count (ms)
  monitoringWindowMs: number;    // Rolling window for failures
}

interface CircuitBreakerMetrics {
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  totalRejected: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  stateChanges: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;
  private metrics: CircuitBreakerMetrics;
  private prisma: PrismaClient;

  constructor(
    private serviceName: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,        // 1 minute
      resetTimeout: 300000,  // 5 minutes
      monitoringWindowMs: 60000  // 1 minute window
    }
  ) {
    super();
    this.prisma = new PrismaClient();
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalRejected: 0,
      stateChanges: 0
    };

    // Load state from database on startup
    this.loadState();

    // Periodically sync state to database (for multi-instance coordination)
    setInterval(() => this.syncState(), 10000); // Every 10 seconds
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.metrics.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.nextAttemptTime && Date.now() < this.nextAttemptTime.getTime()) {
        this.metrics.totalRejected++;

        const waitTime = Math.ceil((this.nextAttemptTime.getTime() - Date.now()) / 1000);
        throw new Error(
          `Circuit breaker OPEN for ${this.serviceName}. ` +
          `Next attempt in ${waitTime}s. ` +
          `Service is temporarily unavailable due to repeated failures.`
        );
      }

      // Try to recover
      this.transitionTo(CircuitState.HALF_OPEN);
      logger.info(`Circuit breaker HALF_OPEN for ${this.serviceName}, attempting recovery`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.metrics.totalSuccesses++;
    this.metrics.lastSuccess = new Date();
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.successCount = 0;

        logger.info(`Circuit breaker CLOSED for ${this.serviceName} - service recovered`, {
          consecutiveSuccesses: this.config.successThreshold
        });

        this.emit('recovered', {
          service: this.serviceName,
          downtime: this.lastFailureTime ? Date.now() - this.lastFailureTime.getTime() : 0
        });
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.metrics.totalFailures++;
    this.metrics.lastFailure = new Date();
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.successCount = 0;

    logger.warn(`Circuit breaker failure for ${this.serviceName}`, {
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      error: error.message,
      state: this.state
    });

    if (this.failureCount >= this.config.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);

      logger.error(`Circuit breaker OPEN for ${this.serviceName}`, {
        failures: this.failureCount,
        nextAttempt: this.nextAttemptTime.toISOString()
      });

      this.emit('open', {
        service: this.serviceName,
        failures: this.failureCount,
        nextAttempt: this.nextAttemptTime,
        lastError: error.message
      });
    }
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.metrics.stateChanges++;

    logger.info(`Circuit breaker state change: ${oldState} -> ${newState}`, {
      service: this.serviceName
    });

    this.emit('stateChange', {
      service: this.serviceName,
      oldState,
      newState,
      timestamp: new Date()
    });

    // Persist state change
    this.syncState();
  }

  /**
   * Load state from database (for multi-instance coordination)
   */
  private async loadState(): Promise<void> {
    try {
      const record = await this.prisma.circuitBreakerState.findUnique({
        where: { serviceName: this.serviceName }
      });

      if (record) {
        this.state = record.state as CircuitState;
        this.failureCount = record.failureCount;
        this.successCount = record.successCount;
        this.lastFailureTime = record.lastFailureTime || undefined;
        this.nextAttemptTime = record.nextAttemptTime || undefined;

        logger.debug(`Loaded circuit breaker state for ${this.serviceName}`, {
          state: this.state,
          failures: this.failureCount
        });
      }
    } catch (error: any) {
      logger.warn(`Failed to load circuit breaker state for ${this.serviceName}`, {
        error: error.message
      });
    }
  }

  /**
   * Sync state to database (for multi-instance coordination)
   */
  private async syncState(): Promise<void> {
    try {
      await this.prisma.circuitBreakerState.upsert({
        where: { serviceName: this.serviceName },
        create: {
          id: `cb-${this.serviceName}`,
          serviceName: this.serviceName,
          state: this.state,
          failureCount: this.failureCount,
          successCount: this.successCount,
          lastFailureTime: this.lastFailureTime,
          nextAttemptTime: this.nextAttemptTime
        },
        update: {
          state: this.state,
          failureCount: this.failureCount,
          successCount: this.successCount,
          lastFailureTime: this.lastFailureTime,
          nextAttemptTime: this.nextAttemptTime
        }
      });
    } catch (error: any) {
      logger.warn(`Failed to sync circuit breaker state for ${this.serviceName}`, {
        error: error.message
      });
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      service: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      metrics: this.metrics,
      config: this.config
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset circuit breaker (emergency override)
   */
  async reset(): Promise<void> {
    logger.info(`Manually resetting circuit breaker for ${this.serviceName}`);

    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.transitionTo(CircuitState.CLOSED);

    await this.syncState();

    this.emit('reset', { service: this.serviceName });
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    await this.syncState();
    await this.prisma.$disconnect();
  }
}

/**
 * Circuit Breaker Manager
 * Manages circuit breakers for all services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create circuit breaker for service
   */
  getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const breaker = new CircuitBreaker(serviceName, config as CircuitBreakerConfig);

      // Forward events
      breaker.on('open', (data) => {
        logger.error(`[CircuitBreaker] ${serviceName} OPENED`, data);
      });

      breaker.on('recovered', (data) => {
        logger.info(`[CircuitBreaker] ${serviceName} RECOVERED`, data);
      });

      this.breakers.set(serviceName, breaker);
    }

    return this.breakers.get(serviceName)!;
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStatuses() {
    const statuses: Record<string, any> = {};

    for (const [name, breaker] of this.breakers.entries()) {
      statuses[name] = breaker.getStatus();
    }

    return statuses;
  }

  /**
   * Get circuit breakers that are open
   */
  getOpenCircuits(): string[] {
    const open: string[] = [];

    for (const [name, breaker] of this.breakers.entries()) {
      const status = breaker.getStatus();
      if (status.state === CircuitState.OPEN) {
        open.push(name);
      }
    }

    return open;
  }

  /**
   * Reset all circuit breakers
   */
  async resetAll(): Promise<void> {
    logger.warn('Resetting ALL circuit breakers');

    for (const breaker of this.breakers.values()) {
      await breaker.reset();
    }
  }

  /**
   * Cleanup all breakers
   */
  async destroy(): Promise<void> {
    for (const breaker of this.breakers.values()) {
      await breaker.destroy();
    }
    this.breakers.clear();
  }
}

// Singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();
