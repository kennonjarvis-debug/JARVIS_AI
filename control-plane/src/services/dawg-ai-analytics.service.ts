/**
 * DAWG AI Analytics Service
 *
 * Provides analytics, insights, and usage statistics for DAWG AI integration.
 *
 * @module services/dawg-ai-analytics.service
 */

import { logger } from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';
import { getDawgAIService } from './dawg-ai.service.js';

const prisma = new PrismaClient();

export interface AnalyticsData {
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: {
    projectsCreated: number;
    workflowsExecuted: number;
    apiCallsTotal: number;
    apiCallsSuccess: number;
    apiCallsFailed: number;
    averageResponseTime: number;
  };
  trends: {
    projectActivity: Array<{ date: string; count: number }>;
    workflowActivity: Array<{ date: string; count: number }>;
  };
}

export interface UsageMetrics {
  userId: string;
  period: 'day' | 'week' | 'month';
  totalProjects: number;
  activeWorkflows: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  storageUsed: number;
  storageLimit: number;
}

export interface ProjectInsights {
  projectId: string;
  totalTime: number;
  completionRate: number;
  collaborators: number;
  tracks: number;
  lastActivity: Date;
  topGenres: Array<{ genre: string; count: number }>;
}

/**
 * DAWG AI Analytics Service
 */
export class DawgAIAnalyticsService {
  private dawgAIService = getDawgAIService();

  /**
   * Get analytics data for user
   */
  async getAnalytics(
    userId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<AnalyticsData> {
    try {
      // Fetch projects created in range
      const projectsCreated = await prisma.dawgAIProject.count({
        where: {
          userId,
          createdAt: {
            gte: timeRange.start,
            lte: timeRange.end,
          },
        },
      });

      // Fetch workflow executions in range
      const workflowExecutions = await prisma.dawgAIWorkflowExecution.count({
        where: {
          userId,
          startedAt: {
            gte: timeRange.start,
            lte: timeRange.end,
          },
        },
      });

      // Fetch API call analytics
      const apiAnalytics = await prisma.dawgAIAnalytics.findMany({
        where: {
          userId,
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end,
          },
        },
      });

      const apiCallsTotal = apiAnalytics.length;
      const apiCallsSuccess = apiAnalytics.filter(a => a.success).length;
      const apiCallsFailed = apiCallsTotal - apiCallsSuccess;
      const averageResponseTime = apiAnalytics.length > 0
        ? apiAnalytics.reduce((sum, a) => sum + (a.responseTime || 0), 0) / apiAnalytics.length
        : 0;

      // Generate daily project activity
      const projectActivity = await this.getProjectActivityTrend(userId, timeRange);

      // Generate daily workflow activity
      const workflowActivity = await this.getWorkflowActivityTrend(userId, timeRange);

      return {
        timeRange,
        metrics: {
          projectsCreated,
          workflowsExecuted: workflowExecutions,
          apiCallsTotal,
          apiCallsSuccess,
          apiCallsFailed,
          averageResponseTime: Math.round(averageResponseTime),
        },
        trends: {
          projectActivity,
          workflowActivity,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get DAWG AI analytics:', error);
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }

  /**
   * Get project activity trend
   */
  private async getProjectActivityTrend(
    userId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{ date: string; count: number }>> {
    try {
      // Group projects by day
      const projects = await prisma.dawgAIProject.findMany({
        where: {
          userId,
          createdAt: {
            gte: timeRange.start,
            lte: timeRange.end,
          },
        },
        select: {
          createdAt: true,
        },
      });

      // Aggregate by date
      const activityMap = new Map<string, number>();
      projects.forEach(project => {
        const date = project.createdAt.toISOString().split('T')[0];
        activityMap.set(date, (activityMap.get(date) || 0) + 1);
      });

      // Convert to array
      return Array.from(activityMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error: any) {
      logger.error('Failed to get project activity trend:', error);
      return [];
    }
  }

  /**
   * Get workflow activity trend
   */
  private async getWorkflowActivityTrend(
    userId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{ date: string; count: number }>> {
    try {
      const executions = await prisma.dawgAIWorkflowExecution.findMany({
        where: {
          userId,
          startedAt: {
            gte: timeRange.start,
            lte: timeRange.end,
          },
        },
        select: {
          startedAt: true,
        },
      });

      const activityMap = new Map<string, number>();
      executions.forEach(execution => {
        const date = execution.startedAt.toISOString().split('T')[0];
        activityMap.set(date, (activityMap.get(date) || 0) + 1);
      });

      return Array.from(activityMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error: any) {
      logger.error('Failed to get workflow activity trend:', error);
      return [];
    }
  }

  /**
   * Get usage metrics for user
   */
  async getUsageMetrics(userId: string, period: 'day' | 'week' | 'month'): Promise<UsageMetrics> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const [totalProjects, activeWorkflows, apiCalls] = await Promise.all([
        prisma.dawgAIProject.count({
          where: {
            userId,
            createdAt: { gte: startDate },
          },
        }),
        prisma.dawgAIWorkflow.count({
          where: {
            userId,
            status: 'active',
          },
        }),
        prisma.dawgAIAnalytics.count({
          where: {
            userId,
            timestamp: { gte: startDate },
          },
        }),
      ]);

      // Get usage limits from connection or use defaults
      const connection = await prisma.dawgAIConnection.findUnique({
        where: { userId },
      });

      const metadata = connection?.metadata as any || {};

      return {
        userId,
        period,
        totalProjects,
        activeWorkflows,
        apiCallsUsed: apiCalls,
        apiCallsLimit: metadata.apiCallsLimit || 10000,
        storageUsed: metadata.storageUsed || 0,
        storageLimit: metadata.storageLimit || 10000000000, // 10GB
      };
    } catch (error: any) {
      logger.error('Failed to get DAWG AI usage metrics:', error);
      throw new Error(`Failed to get usage metrics: ${error.message}`);
    }
  }

  /**
   * Get project insights
   */
  async getProjectInsights(userId: string, projectId: string): Promise<ProjectInsights> {
    try {
      const project = await prisma.dawgAIProject.findFirst({
        where: {
          id: projectId,
          userId,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Get workflow executions for this project
      const workflows = await prisma.dawgAIWorkflow.findMany({
        where: {
          userId,
          projectId,
        },
      });

      const workflowIds = workflows.map(w => w.id);

      const executions = await prisma.dawgAIWorkflowExecution.findMany({
        where: {
          workflowId: { in: workflowIds },
        },
      });

      const completedExecutions = executions.filter(e => e.status === 'completed');
      const completionRate = executions.length > 0
        ? (completedExecutions.length / executions.length) * 100
        : 0;

      // Calculate total time spent
      const totalTime = completedExecutions.reduce((sum, e) => {
        if (e.completedAt && e.startedAt) {
          return sum + (e.completedAt.getTime() - e.startedAt.getTime());
        }
        return sum;
      }, 0);

      // Extract genre information from metadata
      const metadata = project.metadata as any || {};
      const topGenres = metadata.genre
        ? [{ genre: metadata.genre, count: 1 }]
        : [];

      return {
        projectId,
        totalTime: Math.round(totalTime / 1000 / 60), // Convert to minutes
        completionRate: Math.round(completionRate),
        collaborators: metadata.collaborators?.length || 0,
        tracks: metadata.tracks?.length || 0,
        lastActivity: project.updatedAt,
        topGenres,
      };
    } catch (error: any) {
      logger.error('Failed to get project insights:', error);
      throw new Error(`Failed to get project insights: ${error.message}`);
    }
  }

  /**
   * Log API call for analytics
   */
  async logApiCall(
    userId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number
  ): Promise<void> {
    try {
      await prisma.dawgAIAnalytics.create({
        data: {
          userId,
          eventType: 'api_call',
          endpoint,
          method,
          statusCode,
          responseTime,
          success: statusCode >= 200 && statusCode < 300,
          metadata: {},
        },
      });
    } catch (error: any) {
      // Don't throw on analytics logging failure
      logger.error('Failed to log API call:', error);
    }
  }

  /**
   * Get popular workflows
   */
  async getPopularWorkflows(userId: string, limit: number = 5): Promise<any[]> {
    try {
      // Get workflows with execution counts
      const workflows = await prisma.dawgAIWorkflow.findMany({
        where: { userId },
        include: {
          _count: {
            select: { executions: true },
          },
        },
        orderBy: {
          executions: {
            _count: 'desc',
          },
        },
        take: limit,
      });

      return workflows.map(w => ({
        id: w.id,
        name: w.name,
        executionCount: (w as any)._count.executions,
        lastRun: w.lastRun,
      }));
    } catch (error: any) {
      logger.error('Failed to get popular workflows:', error);
      return [];
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(userId: string): Promise<any> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentAnalytics = await prisma.dawgAIAnalytics.findMany({
        where: {
          userId,
          timestamp: { gte: oneDayAgo },
        },
      });

      const totalCalls = recentAnalytics.length;
      const successfulCalls = recentAnalytics.filter(a => a.success).length;
      const failedCalls = totalCalls - successfulCalls;
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 100;

      const averageResponseTime = recentAnalytics.length > 0
        ? recentAnalytics.reduce((sum, a) => sum + (a.responseTime || 0), 0) / recentAnalytics.length
        : 0;

      return {
        status: successRate >= 95 ? 'healthy' : successRate >= 80 ? 'degraded' : 'unhealthy',
        uptime: successRate,
        totalCalls,
        successfulCalls,
        failedCalls,
        averageResponseTime: Math.round(averageResponseTime),
        lastChecked: now,
      };
    } catch (error: any) {
      logger.error('Failed to get system health:', error);
      return {
        status: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(userId: string, timeRange: { start: Date; end: Date }): Promise<any> {
    try {
      const [projects, workflows, executions, analytics] = await Promise.all([
        prisma.dawgAIProject.findMany({
          where: {
            userId,
            createdAt: { gte: timeRange.start, lte: timeRange.end },
          },
        }),
        prisma.dawgAIWorkflow.findMany({
          where: { userId },
        }),
        prisma.dawgAIWorkflowExecution.findMany({
          where: {
            userId,
            startedAt: { gte: timeRange.start, lte: timeRange.end },
          },
        }),
        prisma.dawgAIAnalytics.findMany({
          where: {
            userId,
            timestamp: { gte: timeRange.start, lte: timeRange.end },
          },
        }),
      ]);

      return {
        timeRange,
        exportedAt: new Date(),
        data: {
          projects,
          workflows,
          executions,
          analytics,
        },
      };
    } catch (error: any) {
      logger.error('Failed to export analytics:', error);
      throw new Error(`Failed to export analytics: ${error.message}`);
    }
  }
}

export default DawgAIAnalyticsService;
