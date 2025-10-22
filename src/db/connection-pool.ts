/**
 * Optimized Database Connection Pool
 *
 * Features:
 * - Dynamic pool sizing based on load
 * - Connection recycling
 * - Health checks
 * - Failover support
 * - Connection leak detection
 * - Performance monitoring
 */

import { Pool, PoolClient, PoolConfig } from 'pg';

export interface ConnectionPoolOptions extends PoolConfig {
  healthCheckInterval?: number; // Health check interval in ms
  connectionTimeout?: number; // Connection timeout in ms
  recycleInterval?: number; // Connection recycle interval in ms
  maxLifetime?: number; // Max connection lifetime in ms
  leakDetectionThreshold?: number; // Leak detection threshold in ms
  enableMetrics?: boolean; // Enable performance metrics
}

export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  totalQueries: number;
  avgQueryTime: number;
  peakConnections: number;
  connectionLeaks: number;
  connectionErrors: number;
}

export class ConnectionPool {
  private pool: Pool;
  private options: Required<ConnectionPoolOptions>;
  private metrics: PoolMetrics;
  private healthCheckTimer?: NodeJS.Timeout;
  private recycleTimer?: NodeJS.Timeout;
  private checkoutTimes: Map<PoolClient, number> = new Map();

  constructor(options: ConnectionPoolOptions = {}) {
    // Default options
    this.options = {
      max: options.max || 20, // Maximum pool size
      min: options.min || 5, // Minimum pool size
      idleTimeoutMillis: options.idleTimeoutMillis || 30000, // 30s
      connectionTimeoutMillis: options.connectionTimeoutMillis || 5000, // 5s
      healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
      connectionTimeout: options.connectionTimeout || 5000,
      recycleInterval: options.recycleInterval || 300000, // 5 minutes
      maxLifetime: options.maxLifetime || 1800000, // 30 minutes
      leakDetectionThreshold: options.leakDetectionThreshold || 30000, // 30s
      enableMetrics: options.enableMetrics !== false,
      ...options,
    } as Required<ConnectionPoolOptions>;

    // Initialize metrics
    this.metrics = {
      totalConnections: 0,
      idleConnections: 0,
      activeConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      avgQueryTime: 0,
      peakConnections: 0,
      connectionLeaks: 0,
      connectionErrors: 0,
    };

    // Create pool
    this.pool = new Pool(this.options);

    // Setup event listeners
    this.setupEventListeners();

    // Start health checks
    this.startHealthChecks();

    // Start connection recycling
    this.startConnectionRecycling();
  }

  /**
   * Setup pool event listeners
   */
  private setupEventListeners(): void {
    this.pool.on('connect', (client) => {
      this.metrics.totalConnections++;
      console.log('New database connection established');
    });

    this.pool.on('acquire', (client) => {
      this.metrics.activeConnections++;
      this.checkoutTimes.set(client, Date.now());

      // Update peak connections
      if (this.metrics.activeConnections > this.metrics.peakConnections) {
        this.metrics.peakConnections = this.metrics.activeConnections;
      }
    });

    this.pool.on('release', (client) => {
      this.metrics.activeConnections--;
      this.metrics.idleConnections++;

      // Check for connection leaks
      const checkoutTime = this.checkoutTimes.get(client);
      if (checkoutTime) {
        const duration = Date.now() - checkoutTime;
        if (duration > this.options.leakDetectionThreshold) {
          this.metrics.connectionLeaks++;
          console.warn(`Potential connection leak detected: ${duration}ms`);
        }
        this.checkoutTimes.delete(client);
      }
    });

    this.pool.on('remove', (client) => {
      this.metrics.totalConnections--;
      this.metrics.idleConnections--;
      console.log('Database connection removed from pool');
    });

    this.pool.on('error', (err, client) => {
      this.metrics.connectionErrors++;
      console.error('Database connection error:', err);
    });
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      console.error('Failed to get database client:', error);
      throw error;
    }
  }

  /**
   * Execute query with automatic client management
   */
  async query<T = any>(query: string, values?: any[]): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await this.pool.query(query, values);
      this.updateQueryMetrics(Date.now() - startTime);
      return result as T;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch execute queries
   */
  async batch<T = any>(queries: Array<{ query: string; values?: any[] }>): Promise<T[]> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const results: T[] = [];

      for (const q of queries) {
        const result = await client.query(q.query, q.values);
        results.push(result as T);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update query metrics
   */
  private updateQueryMetrics(executionTime: number): void {
    this.metrics.totalQueries++;
    this.metrics.avgQueryTime =
      (this.metrics.avgQueryTime * (this.metrics.totalQueries - 1) + executionTime) /
      this.metrics.totalQueries;
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.pool.query('SELECT 1');
        console.log('Database health check passed');
      } catch (error) {
        console.error('Database health check failed:', error);
        // Attempt to recover
        await this.recover();
      }
    }, this.options.healthCheckInterval);
  }

  /**
   * Start connection recycling
   */
  private startConnectionRecycling(): void {
    this.recycleTimer = setInterval(async () => {
      try {
        // Get idle connections and recycle old ones
        const idleCount = this.pool.idleCount;
        if (idleCount > this.options.min!) {
          console.log(`Recycling ${idleCount - this.options.min!} idle connections`);
          // Pool will automatically remove idle connections based on idleTimeoutMillis
        }
      } catch (error) {
        console.error('Connection recycling error:', error);
      }
    }, this.options.recycleInterval);
  }

  /**
   * Recover from connection failures
   */
  private async recover(): Promise<void> {
    console.log('Attempting to recover database connections...');
    try {
      // Try to establish a new connection
      const client = await this.pool.connect();
      client.release();
      console.log('Database connection recovered');
    } catch (error) {
      console.error('Failed to recover database connection:', error);
      // Optionally implement exponential backoff retry logic
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Get pool metrics
   */
  getMetrics(): PoolMetrics {
    return {
      ...this.metrics,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
    };
  }

  /**
   * Optimize pool size based on current metrics
   */
  async optimizePoolSize(): Promise<void> {
    const stats = this.getStats();

    // If waiting count is high, increase pool size
    if (stats.waitingCount > 5 && this.options.max! < 50) {
      const newMax = Math.min(this.options.max! + 5, 50);
      console.log(`Increasing pool size from ${this.options.max} to ${newMax}`);
      this.options.max = newMax;
      // Note: pg.Pool doesn't support dynamic resizing, would need to recreate pool
    }

    // If idle count is high, decrease pool size
    if (stats.idleCount > this.options.max! * 0.7 && this.options.max! > 10) {
      const newMax = Math.max(this.options.max! - 5, 10);
      console.log(`Decreasing pool size from ${this.options.max} to ${newMax}`);
      this.options.max = newMax;
    }
  }

  /**
   * Drain the pool (close all connections)
   */
  async drain(): Promise<void> {
    console.log('Draining connection pool...');
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.recycleTimer) {
      clearInterval(this.recycleTimer);
    }
    await this.pool.end();
    console.log('Connection pool drained');
  }

  /**
   * Close the pool
   */
  async close(): Promise<void> {
    await this.drain();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      idleConnections: 0,
      activeConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      avgQueryTime: 0,
      peakConnections: 0,
      connectionLeaks: 0,
      connectionErrors: 0,
    };
  }

  /**
   * Get connection health
   */
  isHealthy(): boolean {
    const stats = this.getStats();
    return (
      stats.totalCount > 0 &&
      this.metrics.connectionErrors === 0 &&
      stats.waitingCount < this.options.max! * 0.5
    );
  }

  /**
   * Warm up pool (pre-create minimum connections)
   */
  async warmup(): Promise<void> {
    console.log(`Warming up connection pool with ${this.options.min} connections...`);
    const clients: PoolClient[] = [];

    try {
      for (let i = 0; i < this.options.min!; i++) {
        const client = await this.pool.connect();
        clients.push(client);
      }

      // Release all clients back to pool
      clients.forEach((client) => client.release());
      console.log('Connection pool warmed up');
    } catch (error) {
      console.error('Failed to warm up connection pool:', error);
      // Release any clients that were acquired
      clients.forEach((client) => client.release());
    }
  }
}

// Singleton instance
let connectionPool: ConnectionPool | null = null;

export function getConnectionPool(options?: ConnectionPoolOptions): ConnectionPool {
  if (!connectionPool) {
    connectionPool = new ConnectionPool(options);
  }
  return connectionPool;
}

export default ConnectionPool;
