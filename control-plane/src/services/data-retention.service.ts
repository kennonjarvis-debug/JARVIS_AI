/**
 * Data Retention Service
 *
 * Implements GDPR Article 5(1)(e) - Storage Limitation Principle
 * Automatically removes old data that is no longer needed
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { CronJob } from 'cron';
import { rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const prisma = new PrismaClient();

export interface RetentionPolicy {
  dataType: string;
  retentionDays: number;
  autoDelete: boolean;
  description: string;
}

export interface CleanupResult {
  dataType: string;
  recordsDeleted: number;
  bytesFreed?: number;
  timestamp: string;
}

/**
 * Default retention policies (in days)
 */
export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    dataType: 'usage_logs',
    retentionDays: 90,
    autoDelete: true,
    description: 'Usage logs older than 90 days'
  },
  {
    dataType: 'activity_logs',
    retentionDays: 7,
    autoDelete: true,
    description: 'Activity monitoring logs older than 7 days'
  },
  {
    dataType: 'session_data',
    retentionDays: 30,
    autoDelete: true,
    description: 'User session data older than 30 days'
  },
  {
    dataType: 'temp_files',
    retentionDays: 1,
    autoDelete: true,
    description: 'Temporary files older than 1 day'
  },
  {
    dataType: 'deleted_accounts',
    retentionDays: 30,
    autoDelete: true,
    description: 'Accounts scheduled for deletion after 30-day grace period'
  },
  {
    dataType: 'audit_logs',
    retentionDays: 365,
    autoDelete: false,
    description: 'Audit logs (kept for 1 year for compliance)'
  },
  {
    dataType: 'error_logs',
    retentionDays: 30,
    autoDelete: true,
    description: 'Error logs older than 30 days'
  }
];

export class DataRetentionService {
  private policies: RetentionPolicy[];
  private cleanupJobs: CronJob[] = [];
  private isRunning: boolean = false;

  constructor(customPolicies?: RetentionPolicy[]) {
    this.policies = customPolicies || DEFAULT_RETENTION_POLICIES;
  }

  /**
   * Start automatic data retention cleanup
   * Runs daily at 2 AM
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Data retention service already running');
      return;
    }

    logger.info('Starting data retention service', {
      policies: this.policies.length,
      schedule: 'Daily at 2:00 AM'
    });

    // Schedule daily cleanup at 2 AM
    const dailyCleanup = new CronJob(
      '0 2 * * *', // Daily at 2 AM
      async () => {
        logger.info('Running scheduled data retention cleanup');
        await this.runCleanup();
      },
      null,
      true,
      'America/New_York'
    );

    this.cleanupJobs.push(dailyCleanup);
    this.isRunning = true;

    logger.info('Data retention service started');
  }

  /**
   * Stop automatic cleanup
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.cleanupJobs.forEach(job => job.stop());
    this.cleanupJobs = [];
    this.isRunning = false;

    logger.info('Data retention service stopped');
  }

  /**
   * Run cleanup for all policies
   */
  async runCleanup(): Promise<CleanupResult[]> {
    const results: CleanupResult[] = [];

    logger.info('Starting data retention cleanup', {
      policies: this.policies.length
    });

    for (const policy of this.policies) {
      if (!policy.autoDelete) {
        logger.debug(`Skipping ${policy.dataType} (autoDelete: false)`);
        continue;
      }

      try {
        const result = await this.cleanupDataType(policy);
        results.push(result);

        if (result.recordsDeleted > 0) {
          logger.info(`Cleaned up ${policy.dataType}`, {
            recordsDeleted: result.recordsDeleted,
            retentionDays: policy.retentionDays
          });
        }
      } catch (error: any) {
        logger.error(`Failed to cleanup ${policy.dataType}`, {
          error: error.message,
          policy
        });
      }
    }

    const totalRecords = results.reduce((sum, r) => sum + r.recordsDeleted, 0);
    logger.info('Data retention cleanup completed', {
      totalRecordsDeleted: totalRecords,
      policiesExecuted: results.length
    });

    return results;
  }

  /**
   * Cleanup specific data type
   */
  private async cleanupDataType(policy: RetentionPolicy): Promise<CleanupResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const result: CleanupResult = {
      dataType: policy.dataType,
      recordsDeleted: 0,
      timestamp: new Date().toISOString()
    };

    switch (policy.dataType) {
      case 'usage_logs':
        result.recordsDeleted = await this.cleanupUsageLogs(cutoffDate);
        break;

      case 'activity_logs':
        result.recordsDeleted = await this.cleanupActivityLogs(cutoffDate);
        result.bytesFreed = await this.cleanupActivityFiles(cutoffDate);
        break;

      case 'session_data':
        result.recordsDeleted = await this.cleanupSessionData(cutoffDate);
        break;

      case 'temp_files':
        result.bytesFreed = await this.cleanupTempFiles(cutoffDate);
        break;

      case 'deleted_accounts':
        result.recordsDeleted = await this.cleanupDeletedAccounts(cutoffDate);
        break;

      case 'error_logs':
        result.recordsDeleted = await this.cleanupErrorLogs(cutoffDate);
        break;

      default:
        logger.warn(`Unknown data type: ${policy.dataType}`);
    }

    return result;
  }

  /**
   * Cleanup old usage logs
   */
  private async cleanupUsageLogs(cutoffDate: Date): Promise<number> {
    try {
      const deleted = await prisma.usageLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      return deleted.count;
    } catch (error: any) {
      logger.error('Failed to cleanup usage logs', { error: error.message });
      return 0;
    }
  }

  /**
   * Cleanup old activity logs
   */
  private async cleanupActivityLogs(cutoffDate: Date): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM activity_events
        WHERE timestamp < ${cutoffDate}
      `;

      return result as number;
    } catch (error: any) {
      logger.debug('Activity logs cleanup skipped (table may not exist)');
      return 0;
    }
  }

  /**
   * Cleanup old activity recording files
   */
  private async cleanupActivityFiles(cutoffDate: Date): Promise<number> {
    let bytesFreed = 0;

    try {
      const activityPath = join(process.env.HOME || '', 'Jarvis', 'data', 'activity-logs');

      if (!existsSync(activityPath)) {
        return 0;
      }

      // TODO: Implement file deletion based on age
      // This would require iterating through directories and checking file timestamps

      logger.debug('Activity files cleanup not yet implemented');
    } catch (error: any) {
      logger.error('Failed to cleanup activity files', { error: error.message });
    }

    return bytesFreed;
  }

  /**
   * Cleanup old session data
   */
  private async cleanupSessionData(cutoffDate: Date): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM activity_sessions
        WHERE ended_at < ${cutoffDate}
      `;

      return result as number;
    } catch (error: any) {
      logger.debug('Session data cleanup skipped (table may not exist)');
      return 0;
    }
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(cutoffDate: Date): Promise<number> {
    let bytesFreed = 0;

    try {
      const tempPath = join(process.env.HOME || '', 'Jarvis', 'temp');

      if (!existsSync(tempPath)) {
        return 0;
      }

      // TODO: Implement temp file deletion
      logger.debug('Temp files cleanup not yet implemented');
    } catch (error: any) {
      logger.error('Failed to cleanup temp files', { error: error.message });
    }

    return bytesFreed;
  }

  /**
   * Cleanup accounts scheduled for deletion (after grace period)
   */
  private async cleanupDeletedAccounts(cutoffDate: Date): Promise<number> {
    try {
      // Find accounts scheduled for deletion that have passed grace period
      const accountsToDelete = await prisma.$queryRaw<{ user_id: string }[]>`
        SELECT user_id FROM deletion_requests
        WHERE scheduled_date < ${cutoffDate}
      `;

      let deleted = 0;

      for (const account of accountsToDelete) {
        try {
          // Perform complete account deletion
          await this.performAccountDeletion(account.user_id);
          deleted++;

          // Remove from deletion queue
          await prisma.$executeRaw`
            DELETE FROM deletion_requests
            WHERE user_id = ${account.user_id}
          `;

          logger.info('Deleted account after grace period', {
            userId: account.user_id
          });
        } catch (error: any) {
          logger.error('Failed to delete account', {
            userId: account.user_id,
            error: error.message
          });
        }
      }

      return deleted;
    } catch (error: any) {
      logger.debug('Deleted accounts cleanup skipped (table may not exist)');
      return 0;
    }
  }

  /**
   * Cleanup old error logs
   */
  private async cleanupErrorLogs(cutoffDate: Date): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM error_logs
        WHERE timestamp < ${cutoffDate}
      `;

      return result as number;
    } catch (error: any) {
      logger.debug('Error logs cleanup skipped (table may not exist)');
      return 0;
    }
  }

  /**
   * Perform complete account deletion
   * (Used by scheduled deletion cleanup)
   */
  private async performAccountDeletion(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Delete all user data
      await tx.usageLog.deleteMany({ where: { userId } });
      await tx.observatory.deleteMany({ where: { userId } });
      await tx.project.deleteMany({ where: { userId } });
      await tx.apiKey.deleteMany({ where: { userId } });
      await tx.usageStats.delete({ where: { userId } }).catch(() => null);
      await tx.subscription.delete({ where: { userId } }).catch(() => null);
      await tx.user.delete({ where: { id: userId } });
    });

    // Delete activity monitoring data
    try {
      await prisma.$executeRaw`
        DELETE FROM activity_events WHERE user_id = ${userId}
      `;
      await prisma.$executeRaw`
        DELETE FROM activity_sessions WHERE user_id = ${userId}
      `;
    } catch (error) {
      // Tables may not exist
    }

    // Delete user files
    const activityPath = join(process.env.HOME || '', 'Jarvis', 'data', 'activity-logs', userId);
    if (existsSync(activityPath)) {
      await rmdir(activityPath, { recursive: true });
    }

    const projectsPath = join(process.env.HOME || '', 'Jarvis', 'data', 'projects', userId);
    if (existsSync(projectsPath)) {
      await rmdir(projectsPath, { recursive: true });
    }
  }

  /**
   * Get current retention policies
   */
  getPolicies(): RetentionPolicy[] {
    return this.policies;
  }

  /**
   * Update retention policy
   */
  updatePolicy(dataType: string, retentionDays: number, autoDelete?: boolean): void {
    const policy = this.policies.find(p => p.dataType === dataType);

    if (policy) {
      policy.retentionDays = retentionDays;
      if (autoDelete !== undefined) {
        policy.autoDelete = autoDelete;
      }

      logger.info('Retention policy updated', {
        dataType,
        retentionDays,
        autoDelete: policy.autoDelete
      });
    } else {
      logger.warn('Retention policy not found', { dataType });
    }
  }

  /**
   * Add custom retention policy
   */
  addPolicy(policy: RetentionPolicy): void {
    const existing = this.policies.find(p => p.dataType === policy.dataType);

    if (existing) {
      logger.warn('Policy already exists, use updatePolicy instead', {
        dataType: policy.dataType
      });
      return;
    }

    this.policies.push(policy);
    logger.info('Retention policy added', policy);
  }

  /**
   * Get cleanup statistics
   */
  async getStatistics(): Promise<any> {
    const stats: any = {};

    for (const policy of this.policies) {
      try {
        let count = 0;

        switch (policy.dataType) {
          case 'usage_logs':
            count = await prisma.usageLog.count();
            break;

          case 'activity_logs':
            const result = await prisma.$queryRaw`
              SELECT COUNT(*) as count FROM activity_events
            `;
            count = (result as any)[0]?.count || 0;
            break;

          // Add more data types as needed
        }

        stats[policy.dataType] = {
          currentCount: count,
          retentionDays: policy.retentionDays,
          autoDelete: policy.autoDelete
        };
      } catch (error) {
        // Skip if table doesn't exist
      }
    }

    return stats;
  }
}

// Singleton instance
export const dataRetentionService = new DataRetentionService();

export default dataRetentionService;
