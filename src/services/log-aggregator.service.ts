import { defaultLogger } from './logger.service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  userId?: string;
  ip?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  metadata?: Record<string, any>;
}

export interface LogSearchResult {
  total: number;
  logs: LogEntry[];
  aggregations?: {
    byLevel: Map<string, number>;
    byUser: Map<string, number>;
    byEndpoint: Map<string, number>;
  };
}

export class LogAggregatorService {
  private logDir: string;
  private logCache: LogEntry[] = [];
  private maxCacheSize: number = 10000;

  constructor() {
    this.logDir = path.join(path.dirname(__dirname), '..', 'logs');
    this.initialize();
  }

  /**
   * Initialize log aggregator
   */
  private async initialize() {
    try {
      // Ensure log directory exists
      await fs.mkdir(this.logDir, { recursive: true });

      // Start periodic cache refresh
      this.startCacheRefresh();

      defaultLogger.info('Log aggregator initialized', { logDir: this.logDir });
    } catch (error) {
      defaultLogger.error('Failed to initialize log aggregator', error);
    }
  }

  /**
   * Start periodic cache refresh
   */
  private startCacheRefresh() {
    // Refresh cache every 5 minutes
    setInterval(async () => {
      try {
        await this.refreshCache();
      } catch (error) {
        defaultLogger.error('Error refreshing log cache', error);
      }
    }, 5 * 60 * 1000);

    // Initial refresh
    this.refreshCache().catch(error =>
      defaultLogger.error('Error in initial cache refresh', error)
    );
  }

  /**
   * Refresh log cache with recent logs
   */
  private async refreshCache() {
    try {
      const files = await fs.readdir(this.logDir);

      // Get today's combined log file
      const today = new Date().toISOString().split('T')[0];
      const logFileName = `combined-${today}.log`;

      if (files.includes(logFileName)) {
        const logPath = path.join(this.logDir, logFileName);
        const content = await fs.readFile(logPath, 'utf-8');
        const lines = content.trim().split('\n');

        // Parse last N lines
        const recentLogs = lines
          .slice(-this.maxCacheSize)
          .map(line => {
            try {
              return JSON.parse(line) as LogEntry;
            } catch {
              return null;
            }
          })
          .filter((log): log is LogEntry => log !== null);

        this.logCache = recentLogs;

        defaultLogger.debug('Log cache refreshed', {
          entries: this.logCache.length,
        });
      }
    } catch (error) {
      defaultLogger.error('Error refreshing cache', error);
    }
  }

  /**
   * Search logs
   */
  async searchLogs(options: {
    query?: string;
    level?: string;
    userId?: string;
    requestId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  }): Promise<LogSearchResult> {
    try {
      let logs = [...this.logCache];

      // Filter by level
      if (options.level) {
        logs = logs.filter(log => log.level === options.level);
      }

      // Filter by user ID
      if (options.userId) {
        logs = logs.filter(log => log.userId === options.userId);
      }

      // Filter by request ID
      if (options.requestId) {
        logs = logs.filter(log => log.requestId === options.requestId);
      }

      // Filter by time range
      if (options.startTime) {
        logs = logs.filter(log =>
          new Date(log.timestamp) >= options.startTime!
        );
      }

      if (options.endTime) {
        logs = logs.filter(log =>
          new Date(log.timestamp) <= options.endTime!
        );
      }

      // Filter by query (search in message)
      if (options.query) {
        const lowerQuery = options.query.toLowerCase();
        logs = logs.filter(log =>
          log.message.toLowerCase().includes(lowerQuery) ||
          JSON.stringify(log.metadata || {}).toLowerCase().includes(lowerQuery)
        );
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const total = logs.length;

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 100;
      logs = logs.slice(offset, offset + limit);

      // Calculate aggregations
      const aggregations = this.calculateAggregations(logs);

      return {
        total,
        logs,
        aggregations,
      };
    } catch (error) {
      defaultLogger.error('Error searching logs', error);
      throw error;
    }
  }

  /**
   * Calculate log aggregations
   */
  private calculateAggregations(logs: LogEntry[]) {
    const byLevel = new Map<string, number>();
    const byUser = new Map<string, number>();
    const byEndpoint = new Map<string, number>();

    logs.forEach(log => {
      // Aggregate by level
      byLevel.set(log.level, (byLevel.get(log.level) || 0) + 1);

      // Aggregate by user
      if (log.userId) {
        byUser.set(log.userId, (byUser.get(log.userId) || 0) + 1);
      }

      // Aggregate by endpoint
      if (log.url) {
        byEndpoint.set(log.url, (byEndpoint.get(log.url) || 0) + 1);
      }
    });

    return { byLevel, byUser, byEndpoint };
  }

  /**
   * Get logs by request ID
   */
  async getLogsByRequestId(requestId: string): Promise<LogEntry[]> {
    const result = await this.searchLogs({ requestId, limit: 1000 });
    return result.logs;
  }

  /**
   * Get logs by user ID
   */
  async getLogsByUserId(userId: string, limit: number = 100): Promise<LogEntry[]> {
    const result = await this.searchLogs({ userId, limit });
    return result.logs;
  }

  /**
   * Get error logs
   */
  async getErrorLogs(limit: number = 100): Promise<LogEntry[]> {
    const result = await this.searchLogs({ level: 'error', limit });
    return result.logs;
  }

  /**
   * Get logs for time range
   */
  async getLogsForTimeRange(startTime: Date, endTime: Date, limit: number = 1000): Promise<LogEntry[]> {
    const result = await this.searchLogs({ startTime, endTime, limit });
    return result.logs;
  }

  /**
   * Export logs to JSON
   */
  async exportLogs(options: {
    startTime?: Date;
    endTime?: Date;
    level?: string;
    userId?: string;
  }): Promise<string> {
    const result = await this.searchLogs({
      ...options,
      limit: 100000, // Export up to 100k logs
    });

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      total: result.total,
      logs: result.logs,
      aggregations: {
        byLevel: Object.fromEntries(result.aggregations?.byLevel || []),
        byUser: Object.fromEntries(result.aggregations?.byUser || []),
        byEndpoint: Object.fromEntries(result.aggregations?.byEndpoint || []),
      },
    }, null, 2);
  }

  /**
   * Get log statistics
   */
  async getLogStats(timeWindow: number = 3600000): Promise<{
    total: number;
    byLevel: Map<string, number>;
    errorRate: number;
    topUsers: Array<{ userId: string; count: number }>;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  }> {
    const startTime = new Date(Date.now() - timeWindow);
    const result = await this.searchLogs({ startTime, limit: 100000 });

    const errorCount = result.logs.filter(log => log.level === 'error').length;
    const errorRate = errorCount / (timeWindow / 60000); // errors per minute

    const topUsers = Array.from(result.aggregations?.byUser || [])
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topEndpoints = Array.from(result.aggregations?.byEndpoint || [])
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: result.total,
      byLevel: result.aggregations?.byLevel || new Map(),
      errorRate,
      topUsers,
      topEndpoints,
    };
  }

  /**
   * Stream logs in real-time
   */
  async *streamLogs(options: {
    level?: string;
    userId?: string;
  }): AsyncGenerator<LogEntry> {
    // This is a simplified implementation
    // In production, you would use file system watchers or log streaming
    let lastIndex = this.logCache.length;

    while (true) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (this.logCache.length > lastIndex) {
        const newLogs = this.logCache.slice(lastIndex);
        lastIndex = this.logCache.length;

        for (const log of newLogs) {
          if (options.level && log.level !== options.level) continue;
          if (options.userId && log.userId !== options.userId) continue;

          yield log;
        }
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.logCache = [];
    defaultLogger.info('Log cache cleared');
  }
}

// Singleton instance
export const logAggregator = new LogAggregatorService();

export default logAggregator;
