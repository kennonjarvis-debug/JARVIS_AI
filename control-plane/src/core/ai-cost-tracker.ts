/**
 * AI Cost Tracker
 *
 * Tracks AI API usage and costs across all providers
 * Stores data in Redis for persistence and reporting
 * Helps optimize spending for Enhanced Hybrid deployment
 */

import { logger } from '../utils/logger.js';
import type { AIResponse } from './smart-ai-router.js';
import Redis from 'ioredis';

export interface CostEntry {
  timestamp: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  cached: boolean;
}

export interface DailyCostSummary {
  date: string;
  totalCost: number;
  totalRequests: number;
  breakdown: {
    gemini: number;
    openai: number;
    anthropic: number;
  };
  tokenUsage: {
    input: number;
    output: number;
  };
}

export class AICostTracker {
  private entries: CostEntry[] = [];
  private dailySummaries: Map<string, DailyCostSummary> = new Map();
  private redis: Redis | null = null;

  private readonly REDIS_KEY_ENTRIES = 'ai:cost:entries';
  private readonly REDIS_KEY_SUMMARIES = 'ai:cost:summaries';

  constructor() {
    logger.info('AICostTracker initialized');

    // Initialize Redis connection if configured
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      try {
        this.redis = new Redis(
          process.env.REDIS_URL || {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0')
          }
        );

        this.redis.on('error', (error) => {
          logger.error('Redis connection error', { error: error.message });
        });

        this.redis.on('connect', () => {
          logger.info('Redis connected for AI cost tracking');
        });

        logger.info('Redis initialized for cost tracking');
      } catch (error: any) {
        logger.error('Failed to initialize Redis', { error: error.message });
        this.redis = null;
      }
    } else {
      logger.warn('Redis not configured - cost data will not persist across restarts');
    }

    this.loadFromStorage();
  }

  /**
   * Track a new AI request
   */
  async trackRequest(response: AIResponse): Promise<void> {
    const entry: CostEntry = {
      timestamp: response.timestamp,
      model: response.model,
      provider: response.provider,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      cost: response.cost,
      cached: response.cached,
    };

    this.entries.push(entry);
    this.updateDailySummary(entry);

    // Save to storage periodically (every 10 requests)
    if (this.entries.length % 10 === 0) {
      await this.saveToStorage();
    }

    logger.debug('Request tracked', {
      model: entry.model,
      cost: entry.cost,
      tokens: entry.inputTokens + entry.outputTokens,
    });
  }

  /**
   * Update daily summary with new entry
   */
  private updateDailySummary(entry: CostEntry): void {
    const date = entry.timestamp.split('T')[0];
    let summary = this.dailySummaries.get(date);

    if (!summary) {
      summary = {
        date,
        totalCost: 0,
        totalRequests: 0,
        breakdown: {
          gemini: 0,
          openai: 0,
          anthropic: 0,
        },
        tokenUsage: {
          input: 0,
          output: 0,
        },
      };
      this.dailySummaries.set(date, summary);
    }

    summary.totalCost += entry.cost;
    summary.totalRequests++;
    summary.tokenUsage.input += entry.inputTokens;
    summary.tokenUsage.output += entry.outputTokens;

    // Update provider breakdown
    if (entry.provider === 'gemini') {
      summary.breakdown.gemini += entry.cost;
    } else if (entry.provider === 'openai') {
      summary.breakdown.openai += entry.cost;
    } else if (entry.provider === 'anthropic') {
      summary.breakdown.anthropic += entry.cost;
    }

    this.dailySummaries.set(date, summary);
  }

  /**
   * Get today's cost summary
   */
  getDailyCost(): DailyCostSummary {
    const today = new Date().toISOString().split('T')[0];
    return this.dailySummaries.get(today) || {
      date: today,
      totalCost: 0,
      totalRequests: 0,
      breakdown: {
        gemini: 0,
        openai: 0,
        anthropic: 0,
      },
      tokenUsage: {
        input: 0,
        output: 0,
      },
    };
  }

  /**
   * Get cost summary for a specific date
   */
  getCostByDate(date: string): DailyCostSummary | null {
    return this.dailySummaries.get(date) || null;
  }

  /**
   * Get monthly cost (last 30 days)
   */
  getMonthlyCost(): {
    totalCost: number;
    dailyBreakdown: DailyCostSummary[];
    averageDailyCost: number;
  } {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const relevantSummaries = Array.from(this.dailySummaries.values())
      .filter(summary => new Date(summary.date) >= thirtyDaysAgo)
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalCost = relevantSummaries.reduce((sum, s) => sum + s.totalCost, 0);
    const averageDailyCost = relevantSummaries.length > 0 ? totalCost / relevantSummaries.length : 0;

    return {
      totalCost,
      dailyBreakdown: relevantSummaries,
      averageDailyCost,
    };
  }

  /**
   * Get cost projection for rest of month
   */
  getMonthlyProjection(): {
    currentMonthCost: number;
    projectedTotalCost: number;
    daysRemaining: number;
  } {
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM

    // Get all costs for current month
    const monthSummaries = Array.from(this.dailySummaries.values())
      .filter(summary => summary.date.startsWith(currentMonth));

    const currentMonthCost = monthSummaries.reduce((sum, s) => sum + s.totalCost, 0);
    const daysWithData = monthSummaries.length;

    // Calculate average daily cost
    const avgDailyCost = daysWithData > 0 ? currentMonthCost / daysWithData : 0;

    // Days in current month
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = lastDayOfMonth - now.getDate();

    // Project total cost
    const projectedTotalCost = currentMonthCost + (avgDailyCost * daysRemaining);

    return {
      currentMonthCost,
      projectedTotalCost,
      daysRemaining,
    };
  }

  /**
   * Get cost alerts (if approaching budget)
   */
  getAlerts(monthlyBudget: number = 50): {
    alerts: string[];
    status: 'ok' | 'warning' | 'critical';
  } {
    const projection = this.getMonthlyProjection();
    const alerts: string[] = [];
    let status: 'ok' | 'warning' | 'critical' = 'ok';

    const percentageOfBudget = (projection.projectedTotalCost / monthlyBudget) * 100;

    if (percentageOfBudget >= 100) {
      status = 'critical';
      alerts.push(
        `CRITICAL: Projected monthly cost ($${projection.projectedTotalCost.toFixed(2)}) exceeds budget ($${monthlyBudget})`
      );
    } else if (percentageOfBudget >= 80) {
      status = 'warning';
      alerts.push(
        `WARNING: Projected monthly cost ($${projection.projectedTotalCost.toFixed(2)}) is at ${percentageOfBudget.toFixed(1)}% of budget`
      );
    } else if (percentageOfBudget >= 50) {
      status = 'ok';
      alerts.push(
        `INFO: Projected monthly cost ($${projection.projectedTotalCost.toFixed(2)}) is at ${percentageOfBudget.toFixed(1)}% of budget`
      );
    }

    // Check for unusual spikes
    const dailyCosts = this.getMonthlyCost().dailyBreakdown;
    if (dailyCosts.length >= 2) {
      const lastDayCost = dailyCosts[dailyCosts.length - 1].totalCost;
      const avgCost = dailyCosts.slice(0, -1).reduce((sum, s) => sum + s.totalCost, 0) / (dailyCosts.length - 1);

      if (lastDayCost > avgCost * 2) {
        status = status === 'ok' ? 'warning' : status;
        alerts.push(
          `WARNING: Today's cost ($${lastDayCost.toFixed(2)}) is ${((lastDayCost / avgCost) * 100).toFixed(0)}% higher than average`
        );
      }
    }

    return { alerts, status };
  }

  /**
   * Save cost data to Redis for persistence
   */
  private async saveToStorage(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      // Save entries (keep last 1000 for performance)
      const recentEntries = this.entries.slice(-1000);
      await this.redis.set(
        this.REDIS_KEY_ENTRIES,
        JSON.stringify(recentEntries),
        'EX',
        86400 * 30 // Expire after 30 days
      );

      // Save daily summaries as hash
      const summariesObject = Object.fromEntries(this.dailySummaries);
      await this.redis.set(
        this.REDIS_KEY_SUMMARIES,
        JSON.stringify(summariesObject),
        'EX',
        86400 * 90 // Expire after 90 days
      );

      logger.debug('Cost data saved to Redis', {
        entriesCount: recentEntries.length,
        summariesCount: this.dailySummaries.size,
      });
    } catch (error: any) {
      logger.error('Failed to save cost data to Redis', {
        error: error.message
      });
    }
  }

  /**
   * Load cost data from Redis
   */
  private async loadFromStorage(): Promise<void> {
    if (!this.redis) {
      logger.debug('Redis not configured - starting with empty cost data');
      return;
    }

    try {
      // Load entries
      const entriesData = await this.redis.get(this.REDIS_KEY_ENTRIES);
      if (entriesData) {
        this.entries = JSON.parse(entriesData);
        logger.info('Loaded cost entries from Redis', {
          count: this.entries.length
        });
      }

      // Load daily summaries
      const summariesData = await this.redis.get(this.REDIS_KEY_SUMMARIES);
      if (summariesData) {
        const summariesObject = JSON.parse(summariesData);
        this.dailySummaries = new Map(Object.entries(summariesObject));
        logger.info('Loaded daily summaries from Redis', {
          count: this.dailySummaries.size
        });
      }

      logger.debug('Cost data loaded from Redis');
    } catch (error: any) {
      logger.error('Failed to load cost data from Redis', {
        error: error.message
      });
      // Continue with empty data if load fails
      this.entries = [];
      this.dailySummaries = new Map();
    }
  }

  /**
   * Get detailed cost report
   */
  getDetailedReport(): {
    today: DailyCostSummary;
    monthly: {
      totalCost: number;
      dailyBreakdown: DailyCostSummary[];
      averageDailyCost: number;
    };
    projection: {
      currentMonthCost: number;
      projectedTotalCost: number;
      daysRemaining: number;
    };
    alerts: {
      alerts: string[];
      status: 'ok' | 'warning' | 'critical';
    };
  } {
    return {
      today: this.getDailyCost(),
      monthly: this.getMonthlyCost(),
      projection: this.getMonthlyProjection(),
      alerts: this.getAlerts(),
    };
  }

  /**
   * Clear old entries (keep last 90 days)
   */
  cleanup(): void {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];

    // Remove old entries
    this.entries = this.entries.filter(entry => entry.timestamp.split('T')[0] >= cutoffDate);

    // Remove old daily summaries
    for (const [date] of this.dailySummaries) {
      if (date < cutoffDate) {
        this.dailySummaries.delete(date);
      }
    }

    logger.info('Cleaned up old cost entries', {
      remainingEntries: this.entries.length,
      remainingSummaries: this.dailySummaries.size,
    });
  }
}

export default AICostTracker;
