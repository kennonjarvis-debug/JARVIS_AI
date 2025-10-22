/**
 * Database Query Optimizer Service
 *
 * Features:
 * - N+1 query detection
 * - Query performance analysis
 * - Index recommendations
 * - Slow query tracking
 * - Query result caching
 * - Connection pooling optimization
 */

import { Pool, PoolClient, QueryResult, QueryConfig } from 'pg';
import { getCacheService, CacheService } from './cache.service';

export interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  rowCount: number;
  cached: boolean;
}

export interface SlowQuery {
  query: string;
  executionTime: number;
  count: number;
  lastOccurrence: Date;
  stackTrace?: string;
}

export interface N1Detection {
  parentQuery: string;
  childQueries: string[];
  count: number;
  suggestion: string;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  reason: string;
  estimatedImprovement: string;
}

export class QueryOptimizerService {
  private pool: Pool;
  private cache: CacheService;
  private queryMetrics: QueryMetrics[] = [];
  private slowQueries: Map<string, SlowQuery> = new Map();
  private n1Detections: N1Detection[] = [];
  private slowQueryThreshold: number = 100; // ms
  private maxMetricsHistory: number = 1000;

  constructor(pool: Pool) {
    this.pool = pool;
    this.cache = getCacheService();
  }

  /**
   * Execute query with optimization
   */
  async query<T = any>(
    query: string | QueryConfig,
    values?: any[],
    options: {
      cache?: boolean;
      cacheTTL?: number;
      skipOptimization?: boolean;
    } = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryText = typeof query === 'string' ? query : query.text;
    const queryValues = values || (typeof query === 'object' ? query.values : undefined);

    // Check cache first
    if (options.cache) {
      const cacheKey = this.getCacheKey(queryText, queryValues);
      const cached = await this.cache.get<QueryResult<T>>(cacheKey);
      if (cached) {
        this.recordMetric({
          query: queryText,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          rowCount: cached.rowCount,
          cached: true,
        });
        return cached;
      }
    }

    // Execute query
    let result: QueryResult<T>;
    try {
      if (typeof query === 'string') {
        result = await this.pool.query<T>(query, values);
      } else {
        result = await this.pool.query<T>(query);
      }
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }

    const executionTime = Date.now() - startTime;

    // Record metrics
    this.recordMetric({
      query: queryText,
      executionTime,
      timestamp: new Date(),
      rowCount: result.rowCount || 0,
      cached: false,
    });

    // Check for slow query
    if (executionTime > this.slowQueryThreshold) {
      this.recordSlowQuery(queryText, executionTime);
    }

    // Cache result if enabled
    if (options.cache) {
      const cacheKey = this.getCacheKey(queryText, queryValues);
      await this.cache.set(cacheKey, result, { ttl: options.cacheTTL || 300 });
    }

    return result;
  }

  /**
   * Execute query with connection from pool
   */
  async queryWithClient<T = any>(
    client: PoolClient,
    query: string | QueryConfig,
    values?: any[]
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryText = typeof query === 'string' ? query : query.text;

    let result: QueryResult<T>;
    try {
      if (typeof query === 'string') {
        result = await client.query<T>(query, values);
      } else {
        result = await client.query<T>(query);
      }
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }

    const executionTime = Date.now() - startTime;

    this.recordMetric({
      query: queryText,
      executionTime,
      timestamp: new Date(),
      rowCount: result.rowCount || 0,
      cached: false,
    });

    if (executionTime > this.slowQueryThreshold) {
      this.recordSlowQuery(queryText, executionTime);
    }

    return result;
  }

  /**
   * Batch query execution (prevents N+1)
   */
  async batchQuery<T = any>(
    queries: Array<{ query: string; values?: any[] }>
  ): Promise<QueryResult<T>[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results: QueryResult<T>[] = [];

      for (const q of queries) {
        const result = await this.queryWithClient<T>(client, q.query, q.values);
        results.push(result);
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
   * Detect N+1 queries
   */
  detectN1Queries(timeWindow: number = 1000): N1Detection[] {
    const recentMetrics = this.queryMetrics.filter(
      (m) => Date.now() - m.timestamp.getTime() < timeWindow
    );

    const queryGroups = new Map<string, QueryMetrics[]>();
    for (const metric of recentMetrics) {
      const normalizedQuery = this.normalizeQuery(metric.query);
      if (!queryGroups.has(normalizedQuery)) {
        queryGroups.set(normalizedQuery, []);
      }
      queryGroups.get(normalizedQuery)!.push(metric);
    }

    const detections: N1Detection[] = [];

    // Look for patterns: 1 parent query followed by many similar child queries
    for (const [query, metrics] of queryGroups) {
      if (metrics.length > 5) {
        // Threshold for N+1 detection
        const detection: N1Detection = {
          parentQuery: this.findParentQuery(query, recentMetrics),
          childQueries: [query],
          count: metrics.length,
          suggestion: this.generateN1Solution(query, metrics.length),
        };
        detections.push(detection);
      }
    }

    return detections;
  }

  /**
   * Normalize query for pattern matching
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?') // Replace $1, $2, etc. with ?
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/'\w+'/g, "'?'") // Replace string literals
      .trim()
      .toLowerCase();
  }

  /**
   * Find parent query that triggered N+1
   */
  private findParentQuery(childQuery: string, metrics: QueryMetrics[]): string {
    // Simple heuristic: find query that executed before the child queries
    // In production, you'd use stack traces or context
    return 'SELECT * FROM parent_table';
  }

  /**
   * Generate solution for N+1 problem
   */
  private generateN1Solution(query: string, count: number): string {
    if (query.includes('select') && query.includes('where')) {
      return `Consider using JOIN or IN clause to fetch all ${count} related records in a single query instead of ${count} separate queries.`;
    }
    return `Detected ${count} similar queries. Consider batching or using a more efficient query pattern.`;
  }

  /**
   * Analyze query and suggest indexes
   */
  async analyzeQuery(query: string): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    try {
      // Use EXPLAIN to analyze query
      const explainResult = await this.pool.query(`EXPLAIN (FORMAT JSON) ${query}`);
      const plan = explainResult.rows[0]['QUERY PLAN'][0];

      // Look for sequential scans
      if (this.hasSequentialScan(plan)) {
        const tables = this.extractTables(query);
        const columns = this.extractWhereColumns(query);

        for (const table of tables) {
          if (columns.length > 0) {
            recommendations.push({
              table,
              columns,
              reason: 'Sequential scan detected. Index could improve performance.',
              estimatedImprovement: '50-90% faster',
            });
          }
        }
      }

      // Look for sorts without indexes
      if (this.hasSort(plan)) {
        const orderByColumns = this.extractOrderByColumns(query);
        if (orderByColumns.length > 0) {
          const tables = this.extractTables(query);
          for (const table of tables) {
            recommendations.push({
              table,
              columns: orderByColumns,
              reason: 'Sort operation detected. Index could eliminate sort step.',
              estimatedImprovement: '30-60% faster',
            });
          }
        }
      }
    } catch (error) {
      console.error('Query analysis error:', error);
    }

    return recommendations;
  }

  /**
   * Check if query plan has sequential scan
   */
  private hasSequentialScan(plan: any): boolean {
    if (plan['Node Type'] === 'Seq Scan') {
      return true;
    }
    if (plan.Plans) {
      return plan.Plans.some((p: any) => this.hasSequentialScan(p));
    }
    return false;
  }

  /**
   * Check if query plan has sort
   */
  private hasSort(plan: any): boolean {
    if (plan['Node Type'] === 'Sort') {
      return true;
    }
    if (plan.Plans) {
      return plan.Plans.some((p: any) => this.hasSort(p));
    }
    return false;
  }

  /**
   * Extract table names from query
   */
  private extractTables(query: string): string[] {
    const matches = query.match(/from\s+(\w+)|join\s+(\w+)/gi);
    if (!matches) return [];
    return matches.map((m) => m.split(/\s+/).pop()!).filter(Boolean);
  }

  /**
   * Extract WHERE clause columns
   */
  private extractWhereColumns(query: string): string[] {
    const whereMatch = query.match(/where\s+(.+?)(?:order|group|limit|$)/i);
    if (!whereMatch) return [];

    const whereClause = whereMatch[1];
    const columns = whereClause.match(/(\w+)\s*=/g);
    if (!columns) return [];

    return columns.map((c) => c.replace(/\s*=$/, ''));
  }

  /**
   * Extract ORDER BY columns
   */
  private extractOrderByColumns(query: string): string[] {
    const orderMatch = query.match(/order\s+by\s+(.+?)(?:limit|$)/i);
    if (!orderMatch) return [];

    const orderClause = orderMatch[1];
    return orderClause.split(',').map((c) => c.trim().split(/\s+/)[0]);
  }

  /**
   * Get cache key for query
   */
  private getCacheKey(query: string, values?: any[]): string {
    const normalized = this.normalizeQuery(query);
    const valuesHash = values ? JSON.stringify(values) : '';
    return `query:${normalized}:${valuesHash}`;
  }

  /**
   * Record query metric
   */
  private recordMetric(metric: QueryMetrics): void {
    this.queryMetrics.push(metric);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics.shift();
    }
  }

  /**
   * Record slow query
   */
  private recordSlowQuery(query: string, executionTime: number): void {
    const normalized = this.normalizeQuery(query);
    const existing = this.slowQueries.get(normalized);

    if (existing) {
      existing.count++;
      existing.executionTime = Math.max(existing.executionTime, executionTime);
      existing.lastOccurrence = new Date();
    } else {
      this.slowQueries.set(normalized, {
        query,
        executionTime,
        count: 1,
        lastOccurrence: new Date(),
        stackTrace: new Error().stack,
      });
    }

    console.warn(`Slow query detected (${executionTime}ms): ${query}`);
  }

  /**
   * Get slow queries report
   */
  getSlowQueries(): SlowQuery[] {
    return Array.from(this.slowQueries.values()).sort(
      (a, b) => b.executionTime - a.executionTime
    );
  }

  /**
   * Get query statistics
   */
  getQueryStats() {
    const totalQueries = this.queryMetrics.length;
    const cachedQueries = this.queryMetrics.filter((m) => m.cached).length;
    const avgExecutionTime =
      this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;

    return {
      totalQueries,
      cachedQueries,
      cacheHitRate: totalQueries > 0 ? cachedQueries / totalQueries : 0,
      avgExecutionTime,
      slowQueryCount: this.slowQueries.size,
      n1Detections: this.detectN1Queries(),
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.queryMetrics = [];
    this.slowQueries.clear();
    this.n1Detections = [];
  }

  /**
   * Get connection pool stats
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Optimize connection pool settings
   */
  optimizePool(metrics: { avgQueryTime: number; peakConcurrency: number }) {
    const recommendations = [];

    // If pool is often waiting, increase pool size
    if (this.pool.waitingCount > 5) {
      recommendations.push({
        setting: 'max',
        current: this.pool.options.max,
        recommended: Math.min((this.pool.options.max || 10) * 1.5, 50),
        reason: 'High wait count detected',
      });
    }

    // If queries are fast and pool is large, reduce it
    if (metrics.avgQueryTime < 10 && (this.pool.options.max || 10) > 20) {
      recommendations.push({
        setting: 'max',
        current: this.pool.options.max,
        recommended: 15,
        reason: 'Queries are fast, can reduce pool size',
      });
    }

    return recommendations;
  }
}

// Singleton instance
let queryOptimizerService: QueryOptimizerService | null = null;

export function getQueryOptimizerService(pool?: Pool): QueryOptimizerService {
  if (!queryOptimizerService && pool) {
    queryOptimizerService = new QueryOptimizerService(pool);
  }
  if (!queryOptimizerService) {
    throw new Error('QueryOptimizerService not initialized. Pass Pool instance first.');
  }
  return queryOptimizerService;
}

export default QueryOptimizerService;
