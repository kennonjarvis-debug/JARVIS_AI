/**
 * Memory Management Service
 *
 * Features:
 * - Garbage collection tuning
 * - Memory leak detection
 * - Object pooling
 * - Stream processing for large data
 * - Memory usage monitoring
 * - Heap snapshot analysis
 */

import { EventEmitter } from 'events';
import v8 from 'v8';
import { Transform, Readable } from 'stream';

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  heapLimit: number;
  usedPercent: number;
}

export interface MemoryThresholds {
  warning: number; // Percentage
  critical: number; // Percentage
  maxHeapSize?: number; // Bytes
}

export interface ObjectPoolOptions<T> {
  minSize?: number;
  maxSize?: number;
  createFn: () => T;
  resetFn?: (obj: T) => void;
  validateFn?: (obj: T) => boolean;
}

/**
 * Object Pool for reusing objects
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private inUse: Set<T> = new Set();
  private options: Required<ObjectPoolOptions<T>>;

  constructor(options: ObjectPoolOptions<T>) {
    this.options = {
      minSize: options.minSize || 5,
      maxSize: options.maxSize || 50,
      createFn: options.createFn,
      resetFn: options.resetFn || (() => {}),
      validateFn: options.validateFn || (() => true),
    };

    // Pre-populate pool
    for (let i = 0; i < this.options.minSize; i++) {
      this.pool.push(this.options.createFn());
    }
  }

  /**
   * Acquire object from pool
   */
  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;

      // Validate object
      if (!this.options.validateFn(obj)) {
        obj = this.options.createFn();
      }
    } else if (this.inUse.size < this.options.maxSize) {
      obj = this.options.createFn();
    } else {
      throw new Error('Object pool exhausted');
    }

    this.inUse.add(obj);
    return obj;
  }

  /**
   * Release object back to pool
   */
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      console.warn('Attempting to release object not from pool');
      return;
    }

    this.inUse.delete(obj);

    // Reset object
    this.options.resetFn(obj);

    // Return to pool if not at max size
    if (this.pool.length < this.options.maxSize) {
      this.pool.push(obj);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      available: this.pool.length,
      inUse: this.inUse.size,
      total: this.pool.length + this.inUse.size,
      maxSize: this.options.maxSize,
    };
  }

  /**
   * Drain the pool
   */
  drain(): void {
    this.pool = [];
    this.inUse.clear();
  }
}

/**
 * Memory Manager Service
 */
export class MemoryManagerService extends EventEmitter {
  private thresholds: MemoryThresholds;
  private monitoringInterval?: NodeJS.Timeout;
  private monitoringFrequency: number = 5000; // 5 seconds
  private memorySnapshots: MemoryStats[] = [];
  private maxSnapshots: number = 100;
  private gcEnabled: boolean = false;

  constructor(
    thresholds: MemoryThresholds = {
      warning: 70,
      critical: 85,
    }
  ) {
    super();
    this.thresholds = thresholds;
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(frequency: number = 5000): void {
    this.monitoringFrequency = frequency;

    this.monitoringInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      this.memorySnapshots.push(stats);

      // Keep only recent snapshots
      if (this.memorySnapshots.length > this.maxSnapshots) {
        this.memorySnapshots.shift();
      }

      // Check thresholds
      this.checkThresholds(stats);

      // Detect memory leaks
      this.detectMemoryLeaks();
    }, this.monitoringFrequency);

    console.log(`Memory monitoring started (interval: ${frequency}ms)`);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('Memory monitoring stopped');
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers || 0,
      heapLimit: heapStats.heap_size_limit,
      usedPercent: (usage.heapUsed / heapStats.heap_size_limit) * 100,
    };
  }

  /**
   * Check memory thresholds
   */
  private checkThresholds(stats: MemoryStats): void {
    if (stats.usedPercent >= this.thresholds.critical) {
      this.emit('critical', stats);
      console.error(`CRITICAL: Memory usage at ${stats.usedPercent.toFixed(2)}%`);

      // Force garbage collection if enabled
      if (this.gcEnabled && global.gc) {
        console.log('Forcing garbage collection...');
        global.gc();
      }
    } else if (stats.usedPercent >= this.thresholds.warning) {
      this.emit('warning', stats);
      console.warn(`WARNING: Memory usage at ${stats.usedPercent.toFixed(2)}%`);
    }
  }

  /**
   * Detect memory leaks
   */
  private detectMemoryLeaks(): void {
    if (this.memorySnapshots.length < 10) return;

    // Check if memory is consistently increasing
    const recent = this.memorySnapshots.slice(-10);
    const trend = this.calculateTrend(recent.map((s) => s.heapUsed));

    if (trend > 0.1) {
      // Memory increasing by more than 10% consistently
      this.emit('leak-detected', {
        trend,
        recent: recent.map((s) => s.heapUsed),
      });
      console.warn('Potential memory leak detected');
    }
  }

  /**
   * Calculate linear trend
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;

    return slope / avgY; // Normalize by average
  }

  /**
   * Force garbage collection
   */
  forceGC(): void {
    if (global.gc) {
      console.log('Forcing garbage collection...');
      global.gc();
    } else {
      console.warn('Garbage collection not exposed. Run with --expose-gc flag.');
    }
  }

  /**
   * Enable automatic GC tuning
   */
  enableGCTuning(): void {
    this.gcEnabled = true;
    console.log('Automatic GC tuning enabled');
  }

  /**
   * Take heap snapshot
   */
  takeHeapSnapshot(): string {
    const snapshot = v8.writeHeapSnapshot();
    console.log(`Heap snapshot saved to: ${snapshot}`);
    return snapshot;
  }

  /**
   * Get heap statistics
   */
  getHeapStats() {
    return v8.getHeapStatistics();
  }

  /**
   * Get heap space statistics
   */
  getHeapSpaceStats() {
    return v8.getHeapSpaceStatistics();
  }

  /**
   * Get memory snapshots history
   */
  getSnapshots(): MemoryStats[] {
    return [...this.memorySnapshots];
  }

  /**
   * Clear snapshots history
   */
  clearSnapshots(): void {
    this.memorySnapshots = [];
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Get memory report
   */
  getMemoryReport(): string {
    const stats = this.getMemoryStats();
    const heapStats = this.getHeapStats();

    return `
Memory Report:
--------------
RSS:           ${this.formatBytes(stats.rss)}
Heap Used:     ${this.formatBytes(stats.heapUsed)} (${stats.usedPercent.toFixed(2)}%)
Heap Total:    ${this.formatBytes(stats.heapTotal)}
Heap Limit:    ${this.formatBytes(stats.heapLimit)}
External:      ${this.formatBytes(stats.external)}
Array Buffers: ${this.formatBytes(stats.arrayBuffers)}

Heap Statistics:
--------------
Total Heap Size:          ${this.formatBytes(heapStats.total_heap_size)}
Total Physical Size:      ${this.formatBytes(heapStats.total_physical_size)}
Total Available Size:     ${this.formatBytes(heapStats.total_available_size)}
Used Heap Size:           ${this.formatBytes(heapStats.used_heap_size)}
Heap Size Limit:          ${this.formatBytes(heapStats.heap_size_limit)}
Malloced Memory:          ${this.formatBytes(heapStats.malloced_memory)}
Peak Malloced Memory:     ${this.formatBytes(heapStats.peak_malloced_memory)}
`.trim();
  }
}

/**
 * Stream processor for large data
 */
export class StreamProcessor {
  /**
   * Process large array in chunks using streams
   */
  static async processArray<T, R>(
    items: T[],
    processFn: (item: T) => Promise<R>,
    options: {
      concurrency?: number;
      chunkSize?: number;
    } = {}
  ): Promise<R[]> {
    const { concurrency = 10, chunkSize = 100 } = options;
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await this.processChunk(chunk, processFn, concurrency);
      results.push(...chunkResults);

      // Allow GC between chunks
      await new Promise((resolve) => setImmediate(resolve));
    }

    return results;
  }

  /**
   * Process chunk with concurrency limit
   */
  private static async processChunk<T, R>(
    items: T[],
    processFn: (item: T) => Promise<R>,
    concurrency: number
  ): Promise<R[]> {
    const results: R[] = [];
    const queue = [...items];

    const workers = Array(Math.min(concurrency, items.length))
      .fill(null)
      .map(async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item !== undefined) {
            const result = await processFn(item);
            results.push(result);
          }
        }
      });

    await Promise.all(workers);
    return results;
  }

  /**
   * Create transform stream with memory management
   */
  static createTransformStream<T, R>(
    transformFn: (chunk: T) => R | Promise<R>
  ): Transform {
    return new Transform({
      objectMode: true,
      async transform(chunk: T, encoding, callback) {
        try {
          const result = await Promise.resolve(transformFn(chunk));
          callback(null, result);
        } catch (error) {
          callback(error as Error);
        }
      },
    });
  }

  /**
   * Create readable stream from array with backpressure
   */
  static createReadableStream<T>(items: T[]): Readable {
    let index = 0;

    return new Readable({
      objectMode: true,
      read() {
        if (index < items.length) {
          this.push(items[index++]);
        } else {
          this.push(null);
        }
      },
    });
  }
}

// Singleton instance
let memoryManagerService: MemoryManagerService | null = null;

export function getMemoryManagerService(thresholds?: MemoryThresholds): MemoryManagerService {
  if (!memoryManagerService) {
    memoryManagerService = new MemoryManagerService(thresholds);
  }
  return memoryManagerService;
}

export default MemoryManagerService;
