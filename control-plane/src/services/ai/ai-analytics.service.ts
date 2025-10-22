import { logger } from '../logger.service.js';

export interface AIUsageMetric {
  userId: string;
  model: string;
  provider: 'openai' | 'anthropic';
  endpoint: string;
  tokens: number;
  cost: number;
  responseTime: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ModelPerformance {
  model: string;
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  avgResponseTime: number;
  avgTokens: number;
  totalCost: number;
}

export interface UserUsage {
  userId: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgCostPerRequest: number;
  mostUsedModel: string;
  costByModel: Record<string, number>;
}

/**
 * AI Analytics Service
 * Track usage, costs, performance, and quality metrics
 */
export class AIAnalyticsService {
  private metrics: AIUsageMetric[] = [];
  private maxMetrics: number = 100000; // Keep last 100k metrics in memory

  constructor() {
    logger.info('AI Analytics service initialized');
  }

  /**
   * Track an AI request
   */
  trackRequest(metric: AIUsageMetric): void {
    this.metrics.push(metric);

    // Trim if exceeds max
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log expensive requests
    if (metric.cost > 0.10) {
      logger.warn('Expensive AI request', {
        userId: metric.userId,
        model: metric.model,
        cost: metric.cost,
        tokens: metric.tokens,
      });
    }

    // Log slow requests
    if (metric.responseTime > 10000) {
      logger.warn('Slow AI request', {
        userId: metric.userId,
        model: metric.model,
        responseTime: metric.responseTime,
      });
    }

    // Log failures
    if (!metric.success) {
      logger.error('AI request failed', {
        userId: metric.userId,
        model: metric.model,
        endpoint: metric.endpoint,
      });
    }
  }

  /**
   * Get usage by user
   */
  getUserUsage(userId: string, startDate?: Date, endDate?: Date): UserUsage {
    const userMetrics = this.filterMetrics({ userId, startDate, endDate });

    if (userMetrics.length === 0) {
      return {
        userId,
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        avgCostPerRequest: 0,
        mostUsedModel: '',
        costByModel: {},
      };
    }

    const totalTokens = userMetrics.reduce((sum, m) => sum + m.tokens, 0);
    const totalCost = userMetrics.reduce((sum, m) => sum + m.cost, 0);

    // Calculate cost by model
    const costByModel: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};

    for (const metric of userMetrics) {
      const model = metric.model;
      costByModel[model] = (costByModel[model] || 0) + metric.cost;
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    }

    // Find most used model
    const mostUsedModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    return {
      userId,
      totalRequests: userMetrics.length,
      totalTokens,
      totalCost,
      avgCostPerRequest: totalCost / userMetrics.length,
      mostUsedModel,
      costByModel,
    };
  }

  /**
   * Get model performance metrics
   */
  getModelPerformance(model: string, startDate?: Date, endDate?: Date): ModelPerformance {
    const modelMetrics = this.filterMetrics({ model, startDate, endDate });

    if (modelMetrics.length === 0) {
      return {
        model,
        provider: 'openai',
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        avgResponseTime: 0,
        avgTokens: 0,
        totalCost: 0,
      };
    }

    const successful = modelMetrics.filter(m => m.success);
    const failed = modelMetrics.filter(m => !m.success);

    const avgResponseTime = modelMetrics.reduce((sum, m) => sum + m.responseTime, 0) / modelMetrics.length;
    const avgTokens = modelMetrics.reduce((sum, m) => sum + m.tokens, 0) / modelMetrics.length;
    const totalCost = modelMetrics.reduce((sum, m) => sum + m.cost, 0);

    return {
      model,
      provider: modelMetrics[0].provider,
      totalRequests: modelMetrics.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      successRate: successful.length / modelMetrics.length,
      avgResponseTime,
      avgTokens,
      totalCost,
    };
  }

  /**
   * Get total costs
   */
  getTotalCost(startDate?: Date, endDate?: Date): {
    total: number;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    byUser: Record<string, number>;
  } {
    const filtered = this.filterMetrics({ startDate, endDate });

    const total = filtered.reduce((sum, m) => sum + m.cost, 0);

    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    for (const metric of filtered) {
      byProvider[metric.provider] = (byProvider[metric.provider] || 0) + metric.cost;
      byModel[metric.model] = (byModel[metric.model] || 0) + metric.cost;
      byUser[metric.userId] = (byUser[metric.userId] || 0) + metric.cost;
    }

    return { total, byProvider, byModel, byUser };
  }

  /**
   * Get error rate
   */
  getErrorRate(startDate?: Date, endDate?: Date): {
    overall: number;
    byModel: Record<string, number>;
    byEndpoint: Record<string, number>;
  } {
    const filtered = this.filterMetrics({ startDate, endDate });

    if (filtered.length === 0) {
      return { overall: 0, byModel: {}, byEndpoint: {} };
    }

    const failed = filtered.filter(m => !m.success);
    const overall = failed.length / filtered.length;

    // Error rate by model
    const byModel: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};

    for (const metric of filtered) {
      modelCounts[metric.model] = (modelCounts[metric.model] || 0) + 1;
      if (!metric.success) {
        byModel[metric.model] = (byModel[metric.model] || 0) + 1;
      }
    }

    for (const model in byModel) {
      byModel[model] = byModel[model] / (modelCounts[model] || 1);
    }

    // Error rate by endpoint
    const byEndpoint: Record<string, number> = {};
    const endpointCounts: Record<string, number> = {};

    for (const metric of filtered) {
      endpointCounts[metric.endpoint] = (endpointCounts[metric.endpoint] || 0) + 1;
      if (!metric.success) {
        byEndpoint[metric.endpoint] = (byEndpoint[metric.endpoint] || 0) + 1;
      }
    }

    for (const endpoint in byEndpoint) {
      byEndpoint[endpoint] = byEndpoint[endpoint] / (endpointCounts[endpoint] || 1);
    }

    return { overall, byModel, byEndpoint };
  }

  /**
   * Compare model performance
   */
  compareModels(models: string[], startDate?: Date, endDate?: Date): ModelPerformance[] {
    return models.map(model => this.getModelPerformance(model, startDate, endDate));
  }

  /**
   * Get top users by cost
   */
  getTopUsers(limit: number = 10, startDate?: Date, endDate?: Date): UserUsage[] {
    const filtered = this.filterMetrics({ startDate, endDate });

    // Group by user
    const userIds = [...new Set(filtered.map(m => m.userId))];
    const userUsages = userIds.map(userId => this.getUserUsage(userId, startDate, endDate));

    return userUsages.sort((a, b) => b.totalCost - a.totalCost).slice(0, limit);
  }

  /**
   * Get cost trends over time
   */
  getCostTrend(
    granularity: 'hour' | 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date
  ): Array<{ date: Date; cost: number; requests: number }> {
    const filtered = this.filterMetrics({ startDate, endDate });

    // Group by time period
    const groups = new Map<string, { cost: number; requests: number }>();

    for (const metric of filtered) {
      const key = this.getTimeKey(metric.timestamp, granularity);
      const existing = groups.get(key) || { cost: 0, requests: 0 };
      existing.cost += metric.cost;
      existing.requests += 1;
      groups.set(key, existing);
    }

    return Array.from(groups.entries())
      .map(([dateStr, data]) => ({
        date: new Date(dateStr),
        cost: data.cost,
        requests: data.requests,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceSummary(startDate?: Date, endDate?: Date): {
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    const filtered = this.filterMetrics({ startDate, endDate });

    if (filtered.length === 0) {
      return {
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      };
    }

    const responseTimes = filtered.map(m => m.responseTime).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    return {
      avgResponseTime,
      p50ResponseTime: this.percentile(responseTimes, 0.50),
      p95ResponseTime: this.percentile(responseTimes, 0.95),
      p99ResponseTime: this.percentile(responseTimes, 0.99),
    };
  }

  /**
   * Filter metrics by criteria
   */
  private filterMetrics(criteria: {
    userId?: string;
    model?: string;
    provider?: string;
    endpoint?: string;
    startDate?: Date;
    endDate?: Date;
  }): AIUsageMetric[] {
    return this.metrics.filter(m => {
      if (criteria.userId && m.userId !== criteria.userId) return false;
      if (criteria.model && m.model !== criteria.model) return false;
      if (criteria.provider && m.provider !== criteria.provider) return false;
      if (criteria.endpoint && m.endpoint !== criteria.endpoint) return false;
      if (criteria.startDate && m.timestamp < criteria.startDate) return false;
      if (criteria.endDate && m.timestamp > criteria.endDate) return false;
      return true;
    });
  }

  /**
   * Get time key for grouping
   */
  private getTimeKey(date: Date, granularity: 'hour' | 'day' | 'week' | 'month'): string {
    const d = new Date(date);

    switch (granularity) {
      case 'hour':
        d.setMinutes(0, 0, 0);
        return d.toISOString();
      case 'day':
        d.setHours(0, 0, 0, 0);
        return d.toISOString().split('T')[0];
      case 'week':
        const week = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
        return `week_${week}`;
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  /**
   * Calculate percentile
   */
  private percentile(arr: number[], p: number): number {
    const index = Math.ceil(arr.length * p) - 1;
    return arr[index];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(startDate?: Date, endDate?: Date): AIUsageMetric[] {
    return this.filterMetrics({ startDate, endDate });
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(beforeDate: Date): number {
    const before = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp >= beforeDate);
    const removed = before - this.metrics.length;

    logger.info('Old metrics cleared', { removed });
    return removed;
  }
}

export default AIAnalyticsService;
