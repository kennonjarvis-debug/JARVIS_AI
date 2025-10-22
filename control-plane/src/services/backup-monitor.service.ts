/**
 * Backup Monitor Service
 *
 * Monitors backup health and sends alerts
 * Features:
 * - Alert on failed backups
 * - Alert on missing backups
 * - Track backup size trends
 * - Dashboard metrics
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import Redis from 'ioredis';

export interface BackupEvent {
  id: string;
  type: 'manual' | 'daily' | 'weekly' | 'monthly';
  backup_type: 'full' | 'incremental';
  timestamp: Date;
  status: 'started' | 'success' | 'failed';
  duration_ms?: number;
  error?: string;
  size_bytes?: number;
}

export interface BackupStatistics {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  average_duration_ms: number;
  average_size_bytes: number;
  last_backup: Date | null;
  last_success: Date | null;
  last_failure: Date | null;
}

export class BackupMonitorService {
  private redis: Redis;
  private eventsKey = 'backup:events';
  private statsKey = 'backup:stats';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  /**
   * Initialize monitoring service
   */
  async initialize(): Promise<void> {
    console.log('[BackupMonitor] Initializing backup monitoring...');
  }

  /**
   * Track backup start
   */
  async trackBackupStart(type: string, backupType: string): Promise<void> {
    const event: BackupEvent = {
      id: this.generateEventId(),
      type: type as any,
      backup_type: backupType as any,
      timestamp: new Date(),
      status: 'started',
    };

    await this.saveEvent(event);
  }

  /**
   * Track backup success
   */
  async trackBackupSuccess(type: string, durationMs: number): Promise<void> {
    const event: BackupEvent = {
      id: this.generateEventId(),
      type: type as any,
      backup_type: 'full',
      timestamp: new Date(),
      status: 'success',
      duration_ms: durationMs,
    };

    await this.saveEvent(event);
    await this.updateStatistics(event);
  }

  /**
   * Track backup failure
   */
  async trackBackupFailure(type: string, error: Error, durationMs: number): Promise<void> {
    const event: BackupEvent = {
      id: this.generateEventId(),
      type: type as any,
      backup_type: 'full',
      timestamp: new Date(),
      status: 'failed',
      duration_ms: durationMs,
      error: error.message,
    };

    await this.saveEvent(event);
    await this.updateStatistics(event);
    await this.sendAlert(event);
  }

  /**
   * Save backup event
   */
  private async saveEvent(event: BackupEvent): Promise<void> {
    await this.redis.lpush(this.eventsKey, JSON.stringify(event));
    // Keep last 1000 events
    await this.redis.ltrim(this.eventsKey, 0, 999);
  }

  /**
   * Update backup statistics
   */
  private async updateStatistics(event: BackupEvent): Promise<void> {
    const stats = await this.getStatistics();

    stats.total_backups++;

    if (event.status === 'success') {
      stats.successful_backups++;
      stats.last_success = event.timestamp;
    } else if (event.status === 'failed') {
      stats.failed_backups++;
      stats.last_failure = event.timestamp;
    }

    stats.last_backup = event.timestamp;

    if (event.duration_ms) {
      const totalDuration = stats.average_duration_ms * (stats.total_backups - 1);
      stats.average_duration_ms = (totalDuration + event.duration_ms) / stats.total_backups;
    }

    await this.redis.set(this.statsKey, JSON.stringify(stats));
  }

  /**
   * Send alert for backup failure
   */
  private async sendAlert(event: BackupEvent): Promise<void> {
    console.error(`[BackupMonitor] ALERT: Backup failed`, event);

    // Send notification (integrate with existing notification system)
    // This would integrate with Pushover, ntfy, Slack, etc.
    const alertMessage = {
      title: 'Backup Failed',
      message: `${event.type} backup failed: ${event.error}`,
      priority: 'high',
      timestamp: event.timestamp,
    };

    // TODO: Integrate with notification service
    console.error('[BackupMonitor] Alert:', alertMessage);
  }

  /**
   * Get backup statistics
   */
  async getStatistics(): Promise<BackupStatistics> {
    const statsJson = await this.redis.get(this.statsKey);

    if (statsJson) {
      return JSON.parse(statsJson);
    }

    return {
      total_backups: 0,
      successful_backups: 0,
      failed_backups: 0,
      average_duration_ms: 0,
      average_size_bytes: 0,
      last_backup: null,
      last_success: null,
      last_failure: null,
    };
  }

  /**
   * Get backup history
   */
  async getBackupHistory(limit: number = 100): Promise<BackupEvent[]> {
    const events = await this.redis.lrange(this.eventsKey, 0, limit - 1);
    return events.map((e) => JSON.parse(e));
  }

  /**
   * Check for missing backups
   */
  async checkForMissingBackups(): Promise<boolean> {
    const stats = await this.getStatistics();

    if (!stats.last_backup) {
      return false;
    }

    const lastBackup = new Date(stats.last_backup);
    const now = new Date();
    const hoursSinceLastBackup =
      (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);

    // Alert if no backup in 25 hours (daily backup should run at 2 AM)
    if (hoursSinceLastBackup > 25) {
      await this.sendAlert({
        id: this.generateEventId(),
        type: 'daily',
        backup_type: 'full',
        timestamp: now,
        status: 'failed',
        error: `No backup in ${Math.floor(hoursSinceLastBackup)} hours`,
      });
      return true;
    }

    return false;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.redis.quit();
  }
}
