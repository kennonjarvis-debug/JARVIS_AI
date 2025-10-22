/**
 * Backup Scheduler Service
 *
 * Manages automated backup schedules using cron
 * Features:
 * - Daily backups at 2 AM
 * - Weekly full backups on Sundays
 * - Monthly archival backups
 * - Automatic cleanup of old backups
 * - Configurable schedules
 */

import * as cron from 'node-cron';
import { BackupService } from './backup.service.js';
import { FileBackupService } from './file-backup.service.js';
import { BackupMonitorService } from './backup-monitor.service.js';

export interface ScheduleConfig {
  daily: {
    enabled: boolean;
    time: string; // Cron format: "0 2 * * *" (2 AM daily)
    type: 'incremental' | 'full';
  };
  weekly: {
    enabled: boolean;
    time: string; // Cron format: "0 3 * * 0" (3 AM on Sundays)
    type: 'full';
  };
  monthly: {
    enabled: boolean;
    time: string; // Cron format: "0 4 1 * *" (4 AM on 1st of month)
    type: 'full';
  };
  cleanup: {
    enabled: boolean;
    time: string; // Cron format: "0 5 * * 0" (5 AM on Sundays)
  };
}

export class BackupSchedulerService {
  private backupService: BackupService;
  private fileBackupService: FileBackupService;
  private monitorService: BackupMonitorService;
  private config: ScheduleConfig;
  private tasks: Map<string, cron.ScheduledTask>;

  constructor() {
    this.backupService = new BackupService();
    this.fileBackupService = new FileBackupService();
    this.monitorService = new BackupMonitorService();
    this.tasks = new Map();

    // Default schedule configuration
    this.config = {
      daily: {
        enabled: process.env.BACKUP_DAILY_ENABLED !== 'false',
        time: process.env.BACKUP_DAILY_TIME || '0 2 * * *', // 2 AM daily
        type: 'incremental',
      },
      weekly: {
        enabled: process.env.BACKUP_WEEKLY_ENABLED !== 'false',
        time: process.env.BACKUP_WEEKLY_TIME || '0 3 * * 0', // 3 AM on Sundays
        type: 'full',
      },
      monthly: {
        enabled: process.env.BACKUP_MONTHLY_ENABLED !== 'false',
        time: process.env.BACKUP_MONTHLY_TIME || '0 4 1 * *', // 4 AM on 1st of month
        type: 'full',
      },
      cleanup: {
        enabled: process.env.BACKUP_CLEANUP_ENABLED !== 'false',
        time: process.env.BACKUP_CLEANUP_TIME || '0 5 * * 0', // 5 AM on Sundays
      },
    };
  }

  /**
   * Initialize backup scheduler
   */
  async initialize(): Promise<void> {
    console.log('[BackupScheduler] Initializing backup scheduler...');

    // Initialize services
    await this.backupService.initialize();
    await this.fileBackupService.initialize();
    await this.monitorService.initialize();

    // Schedule backup jobs
    this.scheduleJobs();

    console.log('[BackupScheduler] Backup scheduler initialized');
    console.log('[BackupScheduler] Scheduled jobs:');
    if (this.config.daily.enabled) {
      console.log(`  - Daily ${this.config.daily.type} backup: ${this.config.daily.time}`);
    }
    if (this.config.weekly.enabled) {
      console.log(`  - Weekly ${this.config.weekly.type} backup: ${this.config.weekly.time}`);
    }
    if (this.config.monthly.enabled) {
      console.log(`  - Monthly ${this.config.monthly.type} backup: ${this.config.monthly.time}`);
    }
    if (this.config.cleanup.enabled) {
      console.log(`  - Cleanup old backups: ${this.config.cleanup.time}`);
    }
  }

  /**
   * Schedule all backup jobs
   */
  private scheduleJobs(): void {
    // Daily backups
    if (this.config.daily.enabled) {
      const task = cron.schedule(this.config.daily.time, async () => {
        await this.runDailyBackup();
      });
      this.tasks.set('daily', task);
      console.log('[BackupScheduler] Daily backup scheduled');
    }

    // Weekly backups
    if (this.config.weekly.enabled) {
      const task = cron.schedule(this.config.weekly.time, async () => {
        await this.runWeeklyBackup();
      });
      this.tasks.set('weekly', task);
      console.log('[BackupScheduler] Weekly backup scheduled');
    }

    // Monthly backups
    if (this.config.monthly.enabled) {
      const task = cron.schedule(this.config.monthly.time, async () => {
        await this.runMonthlyBackup();
      });
      this.tasks.set('monthly', task);
      console.log('[BackupScheduler] Monthly backup scheduled');
    }

    // Cleanup old backups
    if (this.config.cleanup.enabled) {
      const task = cron.schedule(this.config.cleanup.time, async () => {
        await this.runCleanup();
      });
      this.tasks.set('cleanup', task);
      console.log('[BackupScheduler] Cleanup scheduled');
    }
  }

  /**
   * Run daily backup
   */
  private async runDailyBackup(): Promise<void> {
    console.log('[BackupScheduler] Starting daily backup...');

    const startTime = Date.now();

    try {
      // Track backup start
      await this.monitorService.trackBackupStart('daily', this.config.daily.type);

      // Run backup based on type
      if (this.config.daily.type === 'full') {
        await this.backupService.createFullBackup();
        await this.fileBackupService.createFullBackup();
      } else {
        // Incremental backup
        await this.fileBackupService.createIncrementalBackup();
        // Database backups are always full
        await this.backupService.createFullBackup();
      }

      const duration = Date.now() - startTime;

      // Track backup success
      await this.monitorService.trackBackupSuccess('daily', duration);

      console.log(`[BackupScheduler] Daily backup completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track backup failure
      await this.monitorService.trackBackupFailure('daily', error as Error, duration);

      console.error('[BackupScheduler] Daily backup failed', error);
    }
  }

  /**
   * Run weekly backup
   */
  private async runWeeklyBackup(): Promise<void> {
    console.log('[BackupScheduler] Starting weekly backup...');

    const startTime = Date.now();

    try {
      // Track backup start
      await this.monitorService.trackBackupStart('weekly', 'full');

      // Always full backup for weekly
      await this.backupService.createFullBackup();
      await this.fileBackupService.createFullBackup();

      const duration = Date.now() - startTime;

      // Track backup success
      await this.monitorService.trackBackupSuccess('weekly', duration);

      console.log(`[BackupScheduler] Weekly backup completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track backup failure
      await this.monitorService.trackBackupFailure('weekly', error as Error, duration);

      console.error('[BackupScheduler] Weekly backup failed', error);
    }
  }

  /**
   * Run monthly backup
   */
  private async runMonthlyBackup(): Promise<void> {
    console.log('[BackupScheduler] Starting monthly archival backup...');

    const startTime = Date.now();

    try {
      // Track backup start
      await this.monitorService.trackBackupStart('monthly', 'full');

      // Always full backup for monthly archival
      await this.backupService.createFullBackup();
      await this.fileBackupService.createFullBackup();

      const duration = Date.now() - startTime;

      // Track backup success
      await this.monitorService.trackBackupSuccess('monthly', duration);

      console.log(`[BackupScheduler] Monthly backup completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track backup failure
      await this.monitorService.trackBackupFailure('monthly', error as Error, duration);

      console.error('[BackupScheduler] Monthly backup failed', error);
    }
  }

  /**
   * Run cleanup of old backups
   */
  private async runCleanup(): Promise<void> {
    console.log('[BackupScheduler] Starting backup cleanup...');

    try {
      await this.backupService.cleanupOldBackups();
      console.log('[BackupScheduler] Backup cleanup completed');
    } catch (error) {
      console.error('[BackupScheduler] Backup cleanup failed', error);
    }
  }

  /**
   * Trigger manual backup
   */
  async triggerManualBackup(type: 'full' | 'incremental' = 'full'): Promise<void> {
    console.log(`[BackupScheduler] Triggering manual ${type} backup...`);

    const startTime = Date.now();

    try {
      // Track backup start
      await this.monitorService.trackBackupStart('manual', type);

      if (type === 'full') {
        await this.backupService.createFullBackup();
        await this.fileBackupService.createFullBackup();
      } else {
        await this.fileBackupService.createIncrementalBackup();
        await this.backupService.createFullBackup();
      }

      const duration = Date.now() - startTime;

      // Track backup success
      await this.monitorService.trackBackupSuccess('manual', duration);

      console.log(`[BackupScheduler] Manual backup completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track backup failure
      await this.monitorService.trackBackupFailure('manual', error as Error, duration);

      console.error('[BackupScheduler] Manual backup failed', error);
      throw error;
    }
  }

  /**
   * Get backup schedule status
   */
  getScheduleStatus(): {
    daily: { enabled: boolean; time: string; nextRun: Date | null };
    weekly: { enabled: boolean; time: string; nextRun: Date | null };
    monthly: { enabled: boolean; time: string; nextRun: Date | null };
    cleanup: { enabled: boolean; time: string; nextRun: Date | null };
  } {
    return {
      daily: {
        enabled: this.config.daily.enabled,
        time: this.config.daily.time,
        nextRun: this.calculateNextRun(this.config.daily.time),
      },
      weekly: {
        enabled: this.config.weekly.enabled,
        time: this.config.weekly.time,
        nextRun: this.calculateNextRun(this.config.weekly.time),
      },
      monthly: {
        enabled: this.config.monthly.enabled,
        time: this.config.monthly.time,
        nextRun: this.calculateNextRun(this.config.monthly.time),
      },
      cleanup: {
        enabled: this.config.cleanup.enabled,
        time: this.config.cleanup.time,
        nextRun: this.calculateNextRun(this.config.cleanup.time),
      },
    };
  }

  /**
   * Calculate next run time for cron expression
   */
  private calculateNextRun(cronExpression: string): Date | null {
    try {
      const task = cron.schedule(cronExpression, () => {});
      // This is a simplified calculation
      // In production, use a proper cron parser library
      const now = new Date();
      const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Placeholder
      task.stop();
      return nextRun;
    } catch {
      return null;
    }
  }

  /**
   * Update schedule configuration
   */
  async updateSchedule(config: Partial<ScheduleConfig>): Promise<void> {
    console.log('[BackupScheduler] Updating schedule configuration...');

    // Stop all existing tasks
    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`[BackupScheduler] Stopped task: ${name}`);
    }
    this.tasks.clear();

    // Update configuration
    this.config = {
      ...this.config,
      ...config,
    };

    // Reschedule jobs
    this.scheduleJobs();

    console.log('[BackupScheduler] Schedule configuration updated');
  }

  /**
   * Stop all scheduled tasks
   */
  async stop(): Promise<void> {
    console.log('[BackupScheduler] Stopping all scheduled tasks...');

    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`[BackupScheduler] Stopped task: ${name}`);
    }

    this.tasks.clear();
    console.log('[BackupScheduler] All tasks stopped');
  }

  /**
   * Start all scheduled tasks
   */
  async start(): Promise<void> {
    console.log('[BackupScheduler] Starting all scheduled tasks...');

    for (const [name, task] of this.tasks) {
      task.start();
      console.log(`[BackupScheduler] Started task: ${name}`);
    }

    console.log('[BackupScheduler] All tasks started');
  }

  /**
   * Get backup history
   */
  async getBackupHistory(): Promise<any[]> {
    return this.monitorService.getBackupHistory();
  }

  /**
   * Get backup statistics
   */
  async getStatistics(): Promise<any> {
    return this.monitorService.getStatistics();
  }
}
