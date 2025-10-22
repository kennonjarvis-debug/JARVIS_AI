/**
 * Performance Profiler Service
 *
 * Features:
 * - CPU profiling
 * - Memory profiling
 * - Event loop lag detection
 * - Flame graphs
 * - Real-time performance monitoring
 * - Automatic performance alerts
 */

import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';
import v8 from 'v8';

export interface ProfilerMetrics {
  cpu: {
    usage: number; // 0-100
    userTime: number;
    systemTime: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    usedPercent: number;
  };
  eventLoop: {
    lag: number; // milliseconds
    utilizationPercent: number;
  };
  requests: {
    total: number;
    active: number;
    avgDuration: number;
    p95Duration: number;
  };
}

export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  detail?: any;
}

export interface ProfileSession {
  id: string;
  startTime: number;
  endTime?: number;
  metrics: ProfilerMetrics[];
  entries: PerformanceEntry[];
}

export class PerformanceProfilerService extends EventEmitter {
  private sessions: Map<string, ProfileSession> = new Map();
  private currentSession?: ProfileSession;
  private observer?: PerformanceObserver;
  private eventLoopMonitor?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private lastCpuUsage = process.cpuUsage();
  private lastEventLoopCheck = Date.now();
  private requestDurations: number[] = [];
  private activeRequests = 0;

  constructor() {
    super();
    this.setupPerformanceObserver();
  }

  /**
   * Setup performance observer
   */
  private setupPerformanceObserver(): void {
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        this.recordEntry({
          name: entry.name,
          entryType: entry.entryType,
          startTime: entry.startTime,
          duration: entry.duration,
          detail: (entry as any).detail,
        });
      }
    });

    // Observe all performance entry types
    this.observer.observe({ entryTypes: ['measure', 'function', 'gc'] });
  }

  /**
   * Start profiling session
   */
  startProfiling(sessionId: string = `session-${Date.now()}`): string {
    console.log(`Starting profiling session: ${sessionId}`);

    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      metrics: [],
      entries: [],
    };

    this.sessions.set(sessionId, this.currentSession);

    // Start monitoring
    this.startEventLoopMonitoring();
    this.startMetricsCollection();

    return sessionId;
  }

  /**
   * Stop profiling session
   */
  stopProfiling(sessionId?: string): ProfileSession | undefined {
    const id = sessionId || this.currentSession?.id;
    if (!id) {
      console.warn('No active profiling session');
      return undefined;
    }

    const session = this.sessions.get(id);
    if (!session) {
      console.warn(`Session not found: ${id}`);
      return undefined;
    }

    session.endTime = Date.now();
    this.currentSession = undefined;

    // Stop monitoring
    this.stopEventLoopMonitoring();
    this.stopMetricsCollection();

    console.log(`Stopped profiling session: ${id}`);
    return session;
  }

  /**
   * Start event loop monitoring
   */
  private startEventLoopMonitoring(): void {
    this.lastEventLoopCheck = Date.now();

    this.eventLoopMonitor = setInterval(() => {
      const now = Date.now();
      const lag = now - this.lastEventLoopCheck - 100; // Expected 100ms interval
      this.lastEventLoopCheck = now;

      if (lag > 50) {
        // Event loop lag > 50ms
        this.emit('event-loop-lag', lag);
        console.warn(`Event loop lag detected: ${lag}ms`);
      }
    }, 100);
  }

  /**
   * Stop event loop monitoring
   */
  private stopEventLoopMonitoring(): void {
    if (this.eventLoopMonitor) {
      clearInterval(this.eventLoopMonitor);
      this.eventLoopMonitor = undefined;
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = this.collectMetrics();
      if (this.currentSession) {
        this.currentSession.metrics.push(metrics);
      }

      // Check for performance issues
      this.checkPerformanceThresholds(metrics);
    }, 1000); // Collect every second
  }

  /**
   * Stop metrics collection
   */
  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): ProfilerMetrics {
    // CPU metrics
    const cpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    const totalCpu = cpuUsage.user + cpuUsage.system;
    const cpuPercent = (totalCpu / 1000000) * 100; // Convert to percentage

    // Memory metrics
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    // Event loop metrics (estimated)
    const eventLoopLag = 0; // Would need more sophisticated monitoring

    // Request metrics
    const avgDuration =
      this.requestDurations.length > 0
        ? this.requestDurations.reduce((a, b) => a + b, 0) / this.requestDurations.length
        : 0;

    const sorted = [...this.requestDurations].sort((a, b) => a - b);
    const p95Duration = sorted[Math.floor(sorted.length * 0.95)] || 0;

    return {
      cpu: {
        usage: cpuPercent,
        userTime: cpuUsage.user,
        systemTime: cpuUsage.system,
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        usedPercent: (memUsage.heapUsed / heapStats.heap_size_limit) * 100,
      },
      eventLoop: {
        lag: eventLoopLag,
        utilizationPercent: 0, // Would need more sophisticated monitoring
      },
      requests: {
        total: this.requestDurations.length,
        active: this.activeRequests,
        avgDuration,
        p95Duration,
      },
    };
  }

  /**
   * Record performance entry
   */
  private recordEntry(entry: PerformanceEntry): void {
    if (this.currentSession) {
      this.currentSession.entries.push(entry);
    }
  }

  /**
   * Check performance thresholds
   */
  private checkPerformanceThresholds(metrics: ProfilerMetrics): void {
    // CPU threshold
    if (metrics.cpu.usage > 80) {
      this.emit('high-cpu', metrics.cpu);
      console.warn(`High CPU usage: ${metrics.cpu.usage.toFixed(2)}%`);
    }

    // Memory threshold
    if (metrics.memory.usedPercent > 85) {
      this.emit('high-memory', metrics.memory);
      console.warn(`High memory usage: ${metrics.memory.usedPercent.toFixed(2)}%`);
    }

    // Request duration threshold
    if (metrics.requests.p95Duration > 1000) {
      this.emit('slow-requests', metrics.requests);
      console.warn(`Slow requests: P95 ${metrics.requests.p95Duration.toFixed(2)}ms`);
    }
  }

  /**
   * Mark request start
   */
  requestStart(name: string): () => void {
    this.activeRequests++;
    const startTime = performance.now();
    performance.mark(`${name}-start`);

    return () => {
      this.activeRequests--;
      const endTime = performance.now();
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      const duration = endTime - startTime;
      this.requestDurations.push(duration);

      // Keep only recent durations
      if (this.requestDurations.length > 1000) {
        this.requestDurations.shift();
      }
    };
  }

  /**
   * Measure function execution
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const endRequest = this.requestStart(name);
    try {
      return await fn();
    } finally {
      endRequest();
    }
  }

  /**
   * Measure sync function execution
   */
  measure<T>(name: string, fn: () => T): T {
    const endRequest = this.requestStart(name);
    try {
      return fn();
    } finally {
      endRequest();
    }
  }

  /**
   * Generate flame graph data
   */
  generateFlameGraph(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Group entries by name and calculate total duration
    const stacks: Map<string, { name: string; value: number; children: any[] }> = new Map();

    for (const entry of session.entries) {
      if (!stacks.has(entry.name)) {
        stacks.set(entry.name, {
          name: entry.name,
          value: 0,
          children: [],
        });
      }

      const stack = stacks.get(entry.name)!;
      stack.value += entry.duration;
    }

    return {
      name: 'root',
      children: Array.from(stacks.values()),
    };
  }

  /**
   * Get session report
   */
  getSessionReport(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const duration = (session.endTime || Date.now()) - session.startTime;
    const avgMetrics = this.calculateAverageMetrics(session.metrics);

    let report = '\n# Performance Profile Report\n\n';
    report += `Session ID: ${session.id}\n`;
    report += `Duration: ${(duration / 1000).toFixed(2)}s\n`;
    report += `Started: ${new Date(session.startTime).toISOString()}\n`;
    if (session.endTime) {
      report += `Ended: ${new Date(session.endTime).toISOString()}\n`;
    }

    report += '\n## Average Metrics\n\n';
    report += `**CPU Usage:** ${avgMetrics.cpu.usage.toFixed(2)}%\n`;
    report += `**Memory Used:** ${this.formatBytes(avgMetrics.memory.heapUsed)} (${avgMetrics.memory.usedPercent.toFixed(2)}%)\n`;
    report += `**Active Requests:** ${avgMetrics.requests.active}\n`;
    report += `**Avg Request Duration:** ${avgMetrics.requests.avgDuration.toFixed(2)}ms\n`;
    report += `**P95 Request Duration:** ${avgMetrics.requests.p95Duration.toFixed(2)}ms\n`;

    report += '\n## Top 10 Slowest Operations\n\n';
    const sorted = session.entries.sort((a, b) => b.duration - a.duration).slice(0, 10);
    for (const entry of sorted) {
      report += `- ${entry.name}: ${entry.duration.toFixed(2)}ms\n`;
    }

    return report;
  }

  /**
   * Calculate average metrics
   */
  private calculateAverageMetrics(metrics: ProfilerMetrics[]): ProfilerMetrics {
    if (metrics.length === 0) {
      return this.collectMetrics();
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      cpu: {
        usage: avg(metrics.map((m) => m.cpu.usage)),
        userTime: avg(metrics.map((m) => m.cpu.userTime)),
        systemTime: avg(metrics.map((m) => m.cpu.systemTime)),
      },
      memory: {
        heapUsed: avg(metrics.map((m) => m.memory.heapUsed)),
        heapTotal: avg(metrics.map((m) => m.memory.heapTotal)),
        external: avg(metrics.map((m) => m.memory.external)),
        rss: avg(metrics.map((m) => m.memory.rss)),
        usedPercent: avg(metrics.map((m) => m.memory.usedPercent)),
      },
      eventLoop: {
        lag: avg(metrics.map((m) => m.eventLoop.lag)),
        utilizationPercent: avg(metrics.map((m) => m.eventLoop.utilizationPercent)),
      },
      requests: {
        total: avg(metrics.map((m) => m.requests.total)),
        active: avg(metrics.map((m) => m.requests.active)),
        avgDuration: avg(metrics.map((m) => m.requests.avgDuration)),
        p95Duration: avg(metrics.map((m) => m.requests.p95Duration)),
      },
    };
  }

  /**
   * Format bytes
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Clear old sessions
   */
  clearSessions(olderThan: number = 3600000): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.startTime > olderThan) {
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Get all sessions
   */
  getSessions(): ProfileSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopEventLoopMonitoring();
    this.stopMetricsCollection();
    this.observer?.disconnect();
  }
}

// Singleton instance
let profilerService: PerformanceProfilerService | null = null;

export function getProfilerService(): PerformanceProfilerService {
  if (!profilerService) {
    profilerService = new PerformanceProfilerService();
  }
  return profilerService;
}

export default PerformanceProfilerService;
