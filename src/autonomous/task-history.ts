/**
 * Task History & Learning System
 *
 * Tracks all autonomous task executions for:
 * - Performance analytics
 * - Learning from successes/failures
 * - Decision optimization
 *
 * AWS-Ready: Uses RDS for persistence across ECS instances
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import type { AutonomousTask, TaskResult, ResourceUsage } from './types.js';

interface TaskHistoryEntry {
  id: string;
  taskId: string;
  domain: string;
  action: string;
  decision: 'execute' | 'escalate' | 'defer';
  success: boolean;
  duration: number;
  resourcesUsed: ResourceUsage;
  impactScore: number;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  error?: string;
  metadata?: Record<string, any>;
  executedAt: Date;
}

interface SuccessPattern {
  parameters: Record<string, any>;
  avgImpactScore: number;
  avgDuration: number;
  frequency: number;
}

interface TaskStats {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDuration: number;
  avgImpactScore: number;
  totalCost: number;
  commonFailureReasons: Array<{ reason: string; count: number }>;
  optimalParameters?: Record<string, any>;
}

export class TaskHistory {
  private prisma: PrismaClient;
  private cache: Map<string, TaskStats> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Record task execution
   */
  async recordExecution(
    task: AutonomousTask,
    result: TaskResult,
    decision: 'execute' | 'escalate' | 'defer' = 'execute'
  ): Promise<void> {
    try {
      await this.prisma.taskHistory.create({
        data: {
          id: `th-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          taskId: task.id,
          domain: task.domain,
          action: task.title,
          decision,
          success: result.success,
          duration: result.metrics.duration,
          resourcesUsed: JSON.stringify(result.metrics.resourcesUsed),
          impactScore: result.metrics.impactScore,
          error: result.error,
          metadata: JSON.stringify(task.metadata),
          executedAt: new Date()
        }
      });

      // Invalidate cache for this domain/action
      const cacheKey = `${task.domain}:${task.title}`;
      this.cache.delete(cacheKey);

      logger.debug('Recorded task execution', {
        taskId: task.id,
        domain: task.domain,
        action: task.title,
        success: result.success
      });
    } catch (error: any) {
      logger.error('Failed to record task execution', {
        error: error.message,
        taskId: task.id
      });
    }
  }

  /**
   * Get success rate for domain/action
   */
  async getSuccessRate(domain: string, action: string): Promise<number> {
    const stats = await this.getStats(domain, action);
    return stats.successRate;
  }

  /**
   * Get average duration for domain/action
   */
  async getAverageDuration(domain: string, action: string): Promise<number> {
    const stats = await this.getStats(domain, action);
    return stats.avgDuration;
  }

  /**
   * Get average impact score
   */
  async getAverageImpactScore(domain: string, action: string): Promise<number> {
    const stats = await this.getStats(domain, action);
    return stats.avgImpactScore;
  }

  /**
   * Get comprehensive statistics
   */
  async getStats(domain: string, action: string, timeWindowHours: number = 168): Promise<TaskStats> {
    const cacheKey = `${domain}:${action}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return cached;
    }

    try {
      const since = new Date(Date.now() - timeWindowHours * 3600 * 1000);

      const tasks = await this.prisma.taskHistory.findMany({
        where: {
          domain,
          action,
          executedAt: { gte: since }
        }
      });

      const totalExecutions = tasks.length;
      const successCount = tasks.filter(t => t.success).length;
      const failureCount = totalExecutions - successCount;
      const successRate = totalExecutions > 0 ? successCount / totalExecutions : 0;

      const avgDuration = totalExecutions > 0
        ? tasks.reduce((sum, t) => sum + t.duration, 0) / totalExecutions
        : 0;

      const avgImpactScore = totalExecutions > 0
        ? tasks.reduce((sum, t) => sum + t.impactScore, 0) / totalExecutions
        : 0;

      const totalCost = tasks.reduce((sum, t) => {
        try {
          const resources = JSON.parse(t.resourcesUsed as string);
          return sum + (resources.costIncurred || 0);
        } catch {
          return sum;
        }
      }, 0);

      // Analyze failure reasons
      const failureReasons: Map<string, number> = new Map();
      tasks
        .filter(t => !t.success && t.error)
        .forEach(t => {
          const reason = t.error || 'Unknown';
          failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
        });

      const commonFailureReasons = Array.from(failureReasons.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Find optimal parameters from successful executions
      const optimalParameters = await this.findOptimalParameters(domain, action);

      const stats: TaskStats = {
        totalExecutions,
        successCount,
        failureCount,
        successRate,
        avgDuration,
        avgImpactScore,
        totalCost,
        commonFailureReasons,
        optimalParameters
      };

      // Cache stats
      this.cache.set(cacheKey, stats);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);

      return stats;
    } catch (error: any) {
      logger.error('Failed to get task stats', {
        error: error.message,
        domain,
        action
      });

      return {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgDuration: 0,
        avgImpactScore: 0,
        totalCost: 0,
        commonFailureReasons: []
      };
    }
  }

  /**
   * Find optimal parameters from successful executions
   */
  async findOptimalParameters(
    domain: string,
    action: string,
    limit: number = 10
  ): Promise<Record<string, any>> {
    try {
      const successfulTasks = await this.prisma.taskHistory.findMany({
        where: {
          domain,
          action,
          success: true,
          impactScore: { gt: 0 }
        },
        orderBy: {
          impactScore: 'desc'
        },
        take: limit
      });

      if (successfulTasks.length === 0) {
        return {};
      }

      // Extract common patterns from metadata
      const patterns = this.extractCommonPatterns(successfulTasks);

      return patterns;
    } catch (error: any) {
      logger.error('Failed to find optimal parameters', {
        error: error.message,
        domain,
        action
      });
      return {};
    }
  }

  /**
   * Extract common patterns from successful tasks
   */
  private extractCommonPatterns(tasks: any[]): Record<string, any> {
    if (tasks.length === 0) return {};

    const parameterValues: Map<string, any[]> = new Map();

    // Collect all parameter values
    tasks.forEach(task => {
      try {
        const metadata = typeof task.metadata === 'string'
          ? JSON.parse(task.metadata)
          : task.metadata;

        if (metadata && typeof metadata === 'object') {
          Object.entries(metadata).forEach(([key, value]) => {
            if (!parameterValues.has(key)) {
              parameterValues.set(key, []);
            }
            parameterValues.get(key)!.push(value);
          });
        }
      } catch (error) {
        // Skip malformed metadata
      }
    });

    // Find most common values for each parameter
    const optimalParams: Record<string, any> = {};

    parameterValues.forEach((values, key) => {
      // For strings/booleans: find most common value
      if (typeof values[0] === 'string' || typeof values[0] === 'boolean') {
        const freq: Map<any, number> = new Map();
        values.forEach(v => {
          freq.set(v, (freq.get(v) || 0) + 1);
        });

        const mostCommon = Array.from(freq.entries())
          .sort((a, b) => b[1] - a[1])[0];

        if (mostCommon) {
          optimalParams[key] = mostCommon[0];
        }
      }
      // For numbers: find average
      else if (typeof values[0] === 'number') {
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        optimalParams[key] = Math.round(avg);
      }
    });

    return optimalParams;
  }

  /**
   * Get task execution timeline
   */
  async getTimeline(
    domain: string,
    timeWindowHours: number = 24
  ): Promise<Array<{ hour: string; tasks: number; successes: number; failures: number }>> {
    try {
      const since = new Date(Date.now() - timeWindowHours * 3600 * 1000);

      const tasks = await this.prisma.taskHistory.findMany({
        where: {
          domain,
          executedAt: { gte: since }
        },
        orderBy: {
          executedAt: 'asc'
        }
      });

      // Group by hour
      const timeline: Map<string, { tasks: number; successes: number; failures: number }> = new Map();

      tasks.forEach(task => {
        const hour = new Date(task.executedAt).toISOString().slice(0, 13); // YYYY-MM-DDTHH

        if (!timeline.has(hour)) {
          timeline.set(hour, { tasks: 0, successes: 0, failures: 0 });
        }

        const entry = timeline.get(hour)!;
        entry.tasks++;
        if (task.success) {
          entry.successes++;
        } else {
          entry.failures++;
        }
      });

      return Array.from(timeline.entries())
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => a.hour.localeCompare(b.hour));
    } catch (error: any) {
      logger.error('Failed to get timeline', {
        error: error.message,
        domain
      });
      return [];
    }
  }

  /**
   * Get all task types for a domain
   */
  async getTaskTypes(domain: string): Promise<string[]> {
    try {
      const result = await this.prisma.taskHistory.findMany({
        where: { domain },
        distinct: ['action'],
        select: { action: true }
      });

      return result.map(r => r.action);
    } catch (error: any) {
      logger.error('Failed to get task types', {
        error: error.message,
        domain
      });
      return [];
    }
  }

  /**
   * Record user feedback on task execution
   */
  async recordFeedback(
    taskId: string,
    feedback: 'positive' | 'negative' | 'neutral'
  ): Promise<void> {
    try {
      await this.prisma.taskHistory.updateMany({
        where: { taskId },
        data: { userFeedback: feedback }
      });

      logger.info('Recorded user feedback', { taskId, feedback });
    } catch (error: any) {
      logger.error('Failed to record feedback', {
        error: error.message,
        taskId
      });
    }
  }

  /**
   * Cleanup old records (for maintenance)
   */
  async cleanup(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - daysToKeep * 24 * 3600 * 1000);

      const result = await this.prisma.taskHistory.deleteMany({
        where: {
          executedAt: { lt: cutoff }
        }
      });

      logger.info(`Cleaned up ${result.count} old task history records`, {
        cutoff: cutoff.toISOString()
      });

      return result.count;
    } catch (error: any) {
      logger.error('Failed to cleanup task history', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Destroy (cleanup)
   */
  async destroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Singleton instance
export const taskHistory = new TaskHistory();
