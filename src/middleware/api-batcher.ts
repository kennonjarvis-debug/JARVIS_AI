/**
 * API Batching Middleware
 *
 * Features:
 * - Combine multiple API requests into one
 * - DataLoader pattern implementation
 * - Request debouncing
 * - Automatic request deduplication
 * - Configurable batch size and timing
 */

import { Request, Response, NextFunction } from 'express';

export interface BatchRequest {
  id: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface BatchResponse {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: any;
  error?: string;
}

export interface BatcherOptions {
  maxBatchSize?: number;
  batchWindowMs?: number;
  enableDeduplication?: boolean;
  maxConcurrentBatches?: number;
}

interface PendingRequest {
  request: BatchRequest;
  resolve: (response: BatchResponse) => void;
  timestamp: number;
}

export class ApiBatcher {
  private options: Required<BatcherOptions>;
  private pendingRequests: Map<string, PendingRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private activeBatches: number = 0;
  private requestCache: Map<string, BatchResponse> = new Map();

  constructor(options: BatcherOptions = {}) {
    this.options = {
      maxBatchSize: options.maxBatchSize || 50,
      batchWindowMs: options.batchWindowMs || 10,
      enableDeduplication: options.enableDeduplication !== false,
      maxConcurrentBatches: options.maxConcurrentBatches || 5,
    };
  }

  /**
   * Add request to batch queue
   */
  addRequest(request: BatchRequest): Promise<BatchResponse> {
    return new Promise((resolve) => {
      // Check cache for deduplication
      if (this.options.enableDeduplication) {
        const cacheKey = this.getCacheKey(request);
        const cached = this.requestCache.get(cacheKey);
        if (cached) {
          resolve(cached);
          return;
        }
      }

      const batchKey = this.getBatchKey(request);

      // Add to pending requests
      if (!this.pendingRequests.has(batchKey)) {
        this.pendingRequests.set(batchKey, []);
      }

      this.pendingRequests.get(batchKey)!.push({
        request,
        resolve,
        timestamp: Date.now(),
      });

      // Check if we should flush immediately
      if (this.pendingRequests.get(batchKey)!.length >= this.options.maxBatchSize) {
        this.flushBatch(batchKey);
      } else {
        // Schedule batch flush
        if (!this.batchTimers.has(batchKey)) {
          const timer = setTimeout(() => {
            this.flushBatch(batchKey);
          }, this.options.batchWindowMs);
          this.batchTimers.set(batchKey, timer);
        }
      }
    });
  }

  /**
   * Get batch key for grouping similar requests
   */
  private getBatchKey(request: BatchRequest): string {
    // Group by method and base URL
    const url = new URL(request.url, 'http://localhost');
    return `${request.method}:${url.pathname}`;
  }

  /**
   * Get cache key for deduplication
   */
  private getCacheKey(request: BatchRequest): string {
    return JSON.stringify({
      method: request.method,
      url: request.url,
      body: request.body,
    });
  }

  /**
   * Flush a batch of requests
   */
  private async flushBatch(batchKey: string): Promise<void> {
    // Clear timer
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    // Get pending requests
    const pending = this.pendingRequests.get(batchKey);
    if (!pending || pending.length === 0) return;

    // Clear pending
    this.pendingRequests.delete(batchKey);

    // Wait if too many concurrent batches
    while (this.activeBatches >= this.options.maxConcurrentBatches) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.activeBatches++;

    try {
      // Execute batch
      const responses = await this.executeBatch(pending.map((p) => p.request));

      // Resolve all pending requests
      pending.forEach((p, index) => {
        const response = responses[index];
        p.resolve(response);

        // Cache response for deduplication
        if (this.options.enableDeduplication && response.status === 200) {
          const cacheKey = this.getCacheKey(p.request);
          this.requestCache.set(cacheKey, response);

          // Auto-expire cache after 5 seconds
          setTimeout(() => {
            this.requestCache.delete(cacheKey);
          }, 5000);
        }
      });
    } catch (error) {
      console.error('Batch execution error:', error);

      // Reject all pending requests
      pending.forEach((p) => {
        p.resolve({
          id: p.request.id,
          status: 500,
          error: 'Batch execution failed',
        });
      });
    } finally {
      this.activeBatches--;
    }
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch(requests: BatchRequest[]): Promise<BatchResponse[]> {
    // This is a placeholder - in production, you'd implement actual batching logic
    // For example, send all requests to a batch endpoint or execute them in parallel

    const responses: BatchResponse[] = [];

    // Execute requests in parallel with concurrency limit
    const concurrency = 10;
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResponses = await Promise.all(
        batch.map((req) => this.executeSingleRequest(req))
      );
      responses.push(...batchResponses);
    }

    return responses;
  }

  /**
   * Execute a single request
   */
  private async executeSingleRequest(request: BatchRequest): Promise<BatchResponse> {
    try {
      // This is a placeholder - implement actual request execution
      // For now, just return a mock response
      return {
        id: request.id,
        status: 200,
        body: { message: 'Success' },
      };
    } catch (error: any) {
      return {
        id: request.id,
        status: 500,
        error: error.message,
      };
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalPending = 0;
    for (const pending of this.pendingRequests.values()) {
      totalPending += pending.length;
    }

    return {
      pendingRequests: totalPending,
      activeBatches: this.activeBatches,
      cacheSize: this.requestCache.size,
      batchQueues: this.pendingRequests.size,
    };
  }

  /**
   * Clear all pending requests and cache
   */
  clear(): void {
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
    this.pendingRequests.clear();
    this.requestCache.clear();
  }
}

/**
 * DataLoader-style batcher for database queries
 */
export class DataLoader<K, V> {
  private batchLoadFn: (keys: K[]) => Promise<V[]>;
  private options: {
    maxBatchSize: number;
    batchWindowMs: number;
    cache: boolean;
  };
  private queue: Array<{
    key: K;
    resolve: (value: V) => void;
    reject: (error: Error) => void;
  }> = [];
  private cache: Map<string, V> = new Map();
  private batchTimer?: NodeJS.Timeout;

  constructor(
    batchLoadFn: (keys: K[]) => Promise<V[]>,
    options: {
      maxBatchSize?: number;
      batchWindowMs?: number;
      cache?: boolean;
    } = {}
  ) {
    this.batchLoadFn = batchLoadFn;
    this.options = {
      maxBatchSize: options.maxBatchSize || 100,
      batchWindowMs: options.batchWindowMs || 10,
      cache: options.cache !== false,
    };
  }

  /**
   * Load a single item
   */
  load(key: K): Promise<V> {
    // Check cache
    if (this.options.cache) {
      const cacheKey = JSON.stringify(key);
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        return Promise.resolve(cached);
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // Flush if batch is full
      if (this.queue.length >= this.options.maxBatchSize) {
        this.flush();
      } else {
        // Schedule flush
        if (!this.batchTimer) {
          this.batchTimer = setTimeout(() => {
            this.flush();
          }, this.options.batchWindowMs);
        }
      }
    });
  }

  /**
   * Load multiple items
   */
  loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map((key) => this.load(key)));
  }

  /**
   * Flush the current batch
   */
  private async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.queue.length === 0) return;

    const queue = [...this.queue];
    this.queue = [];

    try {
      const keys = queue.map((item) => item.key);
      const values = await this.batchLoadFn(keys);

      if (values.length !== keys.length) {
        throw new Error(
          `DataLoader batch function must return array of same length as keys. Expected ${keys.length}, got ${values.length}`
        );
      }

      // Resolve all promises and cache results
      queue.forEach((item, index) => {
        const value = values[index];
        item.resolve(value);

        // Cache the result
        if (this.options.cache) {
          const cacheKey = JSON.stringify(item.key);
          this.cache.set(cacheKey, value);
        }
      });
    } catch (error) {
      // Reject all promises
      queue.forEach((item) => {
        item.reject(error as Error);
      });
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Prime the cache with a value
   */
  prime(key: K, value: V): void {
    if (this.options.cache) {
      const cacheKey = JSON.stringify(key);
      this.cache.set(cacheKey, value);
    }
  }
}

/**
 * Express middleware for batch endpoint
 */
export function batchMiddleware(options: BatcherOptions = {}) {
  const batcher = new ApiBatcher(options);

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/batch' && req.method === 'POST') {
      try {
        const requests: BatchRequest[] = req.body.requests;

        if (!Array.isArray(requests)) {
          return res.status(400).json({ error: 'Invalid batch request format' });
        }

        // Process all requests
        const responses = await Promise.all(
          requests.map((request) => batcher.addRequest(request))
        );

        res.json({ responses });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else {
      next();
    }
  };
}

export default { ApiBatcher, DataLoader, batchMiddleware };
