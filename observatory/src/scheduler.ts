/**
 * Scheduler
 *
 * Manages scheduled tasks and cron jobs for the Jarvis system.
 * All jobs use configured timezone (America/Phoenix by default).
 *
 * @module scheduler
 */

import cron from 'node-cron';
import { CONFIG } from './config/tools';
import { Logger } from './utils/logger';
import type { Orchestrator } from './core/orchestrator';
import type { ApprovalQueue } from './core/approval-queue';
import type { OperationsAgent } from './agents/operations-agent';
import type { TaskType, Priority } from './types';

const logger = new Logger('Scheduler');

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler(
  orchestrator: Orchestrator,
  approvalQueue: ApprovalQueue,
  operationsAgent: OperationsAgent
): void {
  logger.info('Setting up scheduled jobs', {
    timezone: CONFIG.timezone,
  });

  // Daily analytics report at 9 AM Phoenix time
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running daily analytics job');

    try {
      await orchestrator.submitTask({
        id: crypto.randomUUID(),
        type: 'ops.analytics.generate' as TaskType,
        priority: 1 as Priority,
        data: {
          period: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000),
            end: new Date(),
          },
        },
        requestedBy: 'system:scheduler',
        timestamp: new Date(),
        metadata: {
          scheduledJob: 'daily_analytics',
        },
      });

      logger.info('Daily analytics job submitted');
    } catch (error) {
      logger.error('Failed to submit daily analytics job', { error });
    }
  }, {
    timezone: CONFIG.timezone, // America/Phoenix
  });

  // Process expired approvals every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Processing expired approvals');

    try {
      const expired = await approvalQueue.getExpiredApprovals();

      if (expired.length > 0) {
        logger.info(`Found ${expired.length} expired approvals`);

        for (const approval of expired) {
          await approvalQueue.respondToApproval(
            approval.id,
            'rejected',
            'system:scheduler',
            'Approval expired - no response received within deadline'
          );
        }
      }

      logger.info('Expired approvals processed');
    } catch (error) {
      logger.error('Failed to process expired approvals', { error });
    }
  }, {
    timezone: CONFIG.timezone,
  });

  // Health check every 6 hours (use UTC for infrastructure)
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running system health check');

    try {
      await orchestrator.submitTask({
        id: crypto.randomUUID(),
        type: 'ops.health.check' as TaskType,
        priority: 2 as Priority,
        data: {},
        requestedBy: 'system:scheduler',
        timestamp: new Date(),
        metadata: {
          scheduledJob: 'health_check',
        },
      });

      logger.info('Health check job submitted');
    } catch (error) {
      logger.error('Failed to submit health check job', { error });
    }
  }, {
    timezone: 'UTC', // Use UTC for infrastructure jobs
  });

  // Weekly data sync every Sunday at 2 AM Phoenix time
  cron.schedule('0 2 * * 0', async () => {
    logger.info('Running weekly full system sync');

    try {
      await orchestrator.submitTask({
        id: crypto.randomUUID(),
        type: 'ops.sync.data' as TaskType,
        priority: 2 as Priority,
        data: {
          type: 'full_system',
        },
        requestedBy: 'system:scheduler',
        timestamp: new Date(),
        metadata: {
          scheduledJob: 'weekly_sync',
        },
      });

      logger.info('Weekly sync job submitted');
    } catch (error) {
      logger.error('Failed to submit weekly sync job', { error });
    }
  }, {
    timezone: CONFIG.timezone,
  });

  // Clean up old memories every day at 3 AM Phoenix time
  cron.schedule('0 3 * * *', async () => {
    logger.info('Running memory cleanup');

    try {
      // This would call memory system pruning
      // For now, just log
      logger.info('Memory cleanup would run here');
    } catch (error) {
      logger.error('Failed to run memory cleanup', { error });
    }
  }, {
    timezone: CONFIG.timezone,
  });

  logger.info('All scheduled jobs initialized successfully', {
    jobs: 5,
    timezone: CONFIG.timezone,
  });
}
