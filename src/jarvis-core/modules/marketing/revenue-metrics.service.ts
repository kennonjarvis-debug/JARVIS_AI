/**
 * Revenue Metrics Service
 *
 * Tracks and aggregates revenue metrics using Prisma RevenueMetric model
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

// Plan enum - not exported from current Prisma client, defining locally
// This matches the AI DAWG Prisma schema definition
export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  STUDIO = 'STUDIO'
}

// Note: Some marketing code may reference 'ENTERPRISE' but schema has 'STUDIO'
type MarketingPlan = Plan | 'ENTERPRISE';

const prisma = new PrismaClient();

export interface RevenueData {
  date: Date;
  plan: Plan;
  newSubscribers: number;
  totalRevenue: number;
  churnCount: number;
  activeUsers: number;
}

export interface RevenueSummary {
  totalRevenue: number;
  mrrGrowth: number;
  newSubscribers: number;
  churnRate: number;
  averageRevenuePerUser: number;
  planBreakdown: {
    FREE: { users: number; revenue: number };
    PRO: { users: number; revenue: number };
    ENTERPRISE: { users: number; revenue: number };
  };
}

class RevenueMetricsService {
  /**
   * Get revenue data for date range
   */
  async getRevenue(
    startDate: Date,
    endDate: Date,
    plan?: 'FREE' | 'PRO' | 'ENTERPRISE'
  ): Promise<RevenueData[]> {
    try {
      const whereClause: any = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (plan) {
        whereClause.plan = plan;
      }

      const metrics = await prisma.revenueMetric.findMany({
        where: whereClause,
        orderBy: { date: 'asc' },
      });

      return metrics.map((m: any) => ({
        date: m.date,
        plan: m.plan,
        newSubscribers: m.newSubscribers,
        totalRevenue: m.totalRevenue,
        churnCount: m.churnCount,
        activeUsers: m.activeUsers,
      }));
    } catch (error) {
      logger.error('Revenue metrics fetch failed:', error);
      throw error;
    }
  }

  /**
   * Get metrics summary
   */
  async getMetricsSummary(days: number = 30): Promise<RevenueSummary> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const metrics = await this.getRevenue(startDate, endDate);

      // Calculate totals
      const totalRevenue = metrics.reduce((sum, m) => sum + m.totalRevenue, 0);
      const newSubscribers = metrics.reduce((sum, m) => sum + m.newSubscribers, 0);
      const totalChurn = metrics.reduce((sum, m) => sum + m.churnCount, 0);
      const totalActiveUsers = metrics.length > 0 ? metrics[metrics.length - 1].activeUsers : 0;

      // Calculate MRR growth (compare first vs last 7 days)
      const firstWeekRevenue = metrics.slice(0, 7).reduce((sum, m) => sum + m.totalRevenue, 0);
      const lastWeekRevenue = metrics.slice(-7).reduce((sum, m) => sum + m.totalRevenue, 0);
      const mrrGrowth = firstWeekRevenue > 0 ? ((lastWeekRevenue - firstWeekRevenue) / firstWeekRevenue) * 100 : 0;

      // Churn rate
      const churnRate = newSubscribers > 0 ? (totalChurn / newSubscribers) * 100 : 0;

      // ARPU
      const averageRevenuePerUser = totalActiveUsers > 0 ? totalRevenue / totalActiveUsers : 0;

      // Plan breakdown
      const freeMetrics = metrics.filter(m => m.plan === Plan.FREE);
      const proMetrics = metrics.filter(m => m.plan === Plan.PRO);
      // Note: Schema has STUDIO, not ENTERPRISE - using STUDIO here
      const enterpriseMetrics = metrics.filter(m => m.plan === Plan.STUDIO);

      return {
        totalRevenue,
        mrrGrowth,
        newSubscribers,
        churnRate,
        averageRevenuePerUser,
        planBreakdown: {
          FREE: {
            users: freeMetrics.reduce((sum, m) => sum + m.activeUsers, 0),
            revenue: freeMetrics.reduce((sum, m) => sum + m.totalRevenue, 0),
          },
          PRO: {
            users: proMetrics.reduce((sum, m) => sum + m.activeUsers, 0),
            revenue: proMetrics.reduce((sum, m) => sum + m.totalRevenue, 0),
          },
          ENTERPRISE: {
            users: enterpriseMetrics.reduce((sum, m) => sum + m.activeUsers, 0),
            revenue: enterpriseMetrics.reduce((sum, m) => sum + m.totalRevenue, 0),
          },
        },
      };
    } catch (error) {
      logger.error('Metrics summary calculation failed:', error);
      throw error;
    }
  }

  /**
   * Record revenue metric
   */
  async recordMetric(data: {
    date: Date;
    plan: Plan;
    newSubscribers: number;
    totalRevenue: number;
    churnCount: number;
    activeUsers: number;
    metadata?: any;
  }): Promise<void> {
    try {
      await prisma.revenueMetric.upsert({
        where: {
          date_plan: {
            date: data.date,
            plan: data.plan,
          },
        },
        update: {
          newSubscribers: data.newSubscribers,
          totalRevenue: data.totalRevenue,
          churnCount: data.churnCount,
          activeUsers: data.activeUsers,
          metadata: data.metadata || {},
        },
        create: {
          date: data.date,
          plan: data.plan,
          newSubscribers: data.newSubscribers,
          totalRevenue: data.totalRevenue,
          churnCount: data.churnCount,
          activeUsers: data.activeUsers,
          metadata: data.metadata || {},
        },
      });

      logger.info('Revenue metric recorded', { date: data.date, plan: data.plan });
    } catch (error) {
      logger.error('Revenue metric recording failed:', error);
      throw error;
    }
  }

  /**
   * Sync metrics from database (calculate from actual data)
   */
  async syncFromDatabase(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count active users by plan
      const userCounts = await prisma.entitlement.groupBy({
        by: ['plan'],
        _count: { userId: true },
      });

      // TODO: Calculate revenue, new subscribers, and churn from actual subscription data
      // This is a simplified version - real implementation would:
      // 1. Query subscription/billing tables
      // 2. Calculate daily revenue
      // 3. Track new signups
      // 4. Track cancellations

      for (const planData of userCounts) {
        const plan = planData.plan as Plan;
        const activeUsers = planData._count.userId;

        // Simplified revenue calculation (would use actual billing data)
        const revenuePerUser = plan === Plan.FREE ? 0 : plan === Plan.PRO ? 29.99 : 99.99;
        const totalRevenue = activeUsers * revenuePerUser;

        await this.recordMetric({
          date: today,
          plan,
          newSubscribers: 0, // Would calculate from actual data
          totalRevenue,
          churnCount: 0, // Would calculate from actual data
          activeUsers,
        });
      }

      logger.info('Metrics synced from database');
    } catch (error) {
      logger.error('Database sync failed:', error);
      throw error;
    }
  }

  /**
   * Get stats for health monitoring
   */
  async getStats(): Promise<{ totalRevenue: number; mrrGrowth: number }> {
    try {
      const summary = await this.getMetricsSummary(30);
      return {
        totalRevenue: summary.totalRevenue,
        mrrGrowth: summary.mrrGrowth,
      };
    } catch (error) {
      logger.error('Stats fetch failed:', error);
      return { totalRevenue: 0, mrrGrowth: 0 };
    }
  }

  /**
   * Get historical data for forecasting
   */
  async getHistoricalData(
    metric: 'revenue' | 'users' | 'churn',
    days: number = 30
  ): Promise<Array<{ timestamp: string; value: number }>> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const metrics = await this.getRevenue(startDate, endDate);

      return metrics.map(m => ({
        timestamp: m.date.toISOString(),
        value:
          metric === 'revenue'
            ? m.totalRevenue
            : metric === 'users'
            ? m.activeUsers
            : m.churnCount,
      }));
    } catch (error) {
      logger.error('Historical data fetch failed:', error);
      throw error;
    }
  }
}

export const revenueMetricsService = new RevenueMetricsService();
