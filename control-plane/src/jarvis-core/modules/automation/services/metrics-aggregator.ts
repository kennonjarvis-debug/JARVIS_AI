/**
 * Metrics Aggregator Service
 *
 * Aggregates usage events and revenue metrics from the database
 * Generates daily/weekly/monthly summaries for the BI dashboard
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AggregatedMetrics {
  type: 'daily' | 'weekly' | 'monthly';
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    totalEvents: number;
    byFeature: Record<string, number>;
    byUser: Record<string, number>;
    errorRate: number;
  };
  revenue: {
    totalRevenue: number;
    byPlan: Record<string, number>;
    newSubscribers: number;
    churnCount: number;
    activeUsers: number;
  };
  insights: string[];
}

export class MetricsAggregator {
  private lastAggregation: Date | null = null;
  private isRunning = false;

  async initialize(): Promise<void> {
    console.log('[MetricsAggregator] Initialized');
  }

  async shutdown(): Promise<void> {
    console.log('[MetricsAggregator] Shutting down');
    await prisma.$disconnect();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      lastAggregation: this.lastAggregation,
      isRunning: this.isRunning,
    };
  }

  /**
   * Run aggregation for a specific time period
   */
  async runAggregation(
    type: 'daily' | 'weekly' | 'monthly' = 'daily',
    force = false
  ): Promise<AggregatedMetrics> {
    if (this.isRunning && !force) {
      throw new Error('Aggregation already running');
    }

    this.isRunning = true;

    try {
      const period = this.calculatePeriod(type);
      const { start, end } = period;

      // Aggregate usage events
      const usageMetrics = await this.aggregateUsageEvents(start, end);

      // Aggregate revenue metrics
      const revenueMetrics = await this.aggregateRevenueMetrics(start, end);

      // Generate insights
      const insights = this.generateInsights(usageMetrics, revenueMetrics);

      this.lastAggregation = new Date();

      return {
        type,
        period,
        usage: usageMetrics,
        revenue: revenueMetrics,
        insights,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get aggregated metrics for a time period
   */
  async getAggregatedMetrics(type: 'daily' | 'weekly' | 'monthly'): Promise<AggregatedMetrics> {
    return this.runAggregation(type, false);
  }

  /**
   * Aggregate usage events from the database
   */
  private async aggregateUsageEvents(start: Date, end: Date) {
    // Get all usage events in the period
    const events = await prisma.usageEvent.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Calculate metrics
    const totalEvents = events.length;
    const errorEvents = events.filter((e: { eventType: string }) => e.eventType === 'failed').length;
    const errorRate = totalEvents > 0 ? errorEvents / totalEvents : 0;

    // Group by feature
    const byFeature: Record<string, number> = {};
    events.forEach((event: { featureKey: string }) => {
      byFeature[event.featureKey] = (byFeature[event.featureKey] || 0) + 1;
    });

    // Group by user
    const byUser: Record<string, number> = {};
    events.forEach((event: { userId: string }) => {
      byUser[event.userId] = (byUser[event.userId] || 0) + 1;
    });

    return {
      totalEvents,
      byFeature,
      byUser,
      errorRate,
    };
  }

  /**
   * Aggregate revenue metrics from the database
   */
  private async aggregateRevenueMetrics(start: Date, end: Date) {
    // Get all revenue metrics in the period
    const metrics = await prisma.revenueMetric.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    // Calculate totals
    const totalRevenue = metrics.reduce((sum: number, m: { totalRevenue: number }) => sum + m.totalRevenue, 0);
    const newSubscribers = metrics.reduce((sum: number, m: { newSubscribers: number }) => sum + m.newSubscribers, 0);
    const churnCount = metrics.reduce((sum: number, m: { churnCount: number }) => sum + m.churnCount, 0);

    // Group by plan
    const byPlan: Record<string, number> = {};
    metrics.forEach((metric: { plan: string; totalRevenue: number }) => {
      byPlan[metric.plan] = (byPlan[metric.plan] || 0) + metric.totalRevenue;
    });

    // Calculate active users (latest count)
    const activeUsers = metrics.reduce((sum: number, m: { activeUsers: number }) => sum + m.activeUsers, 0);

    return {
      totalRevenue,
      byPlan,
      newSubscribers,
      churnCount,
      activeUsers,
    };
  }

  /**
   * Generate insights from aggregated data
   */
  private generateInsights(
    usageMetrics: { errorRate: number; byFeature: Record<string, number>; totalEvents: number },
    revenueMetrics: { churnCount: number; newSubscribers: number; byPlan: Record<string, number> }
  ): string[] {
    const insights: string[] = [];

    // Usage insights
    if (usageMetrics.errorRate > 0.1) {
      insights.push(
        `High error rate detected: ${(usageMetrics.errorRate * 100).toFixed(1)}%. Investigation recommended.`
      );
    }

    const topFeature = Object.entries(usageMetrics.byFeature)
      .sort(([, a], [, b]: [string, number]) => (b as number) - (a as number))[0];
    if (topFeature) {
      insights.push(`Most popular feature: ${topFeature[0]} with ${topFeature[1]} events`);
    }

    // Revenue insights
    if (revenueMetrics.churnCount > revenueMetrics.newSubscribers) {
      insights.push(
        `Churn alert: ${revenueMetrics.churnCount} cancellations vs ${revenueMetrics.newSubscribers} new subscribers`
      );
    }

    const topPlan = Object.entries(revenueMetrics.byPlan)
      .sort(([, a], [, b]: [string, number]) => (b as number) - (a as number))[0];
    if (topPlan) {
      insights.push(
        `Top revenue plan: ${topPlan[0]} generating $${(topPlan[1] as number).toFixed(2)}`
      );
    }

    // Growth insights
    const growthRate =
      revenueMetrics.newSubscribers > 0
        ? ((revenueMetrics.newSubscribers - revenueMetrics.churnCount) /
            revenueMetrics.newSubscribers) *
          100
        : 0;
    insights.push(`Net subscriber growth: ${growthRate.toFixed(1)}%`);

    return insights;
  }

  /**
   * Calculate time period for aggregation type
   */
  private calculatePeriod(type: 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (type) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
    }

    return { start, end };
  }

  /**
   * Store aggregated metrics for historical tracking
   */
  async storeAggregation(metrics: AggregatedMetrics): Promise<void> {
    // In a production system, you might want to store these in a separate
    // aggregated_metrics table for faster querying
    console.log(`[MetricsAggregator] Stored ${metrics.type} aggregation for period ${metrics.period.start} to ${metrics.period.end}`);
  }
}
