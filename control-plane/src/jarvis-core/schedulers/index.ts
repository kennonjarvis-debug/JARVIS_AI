/**
 * Jarvis Scheduler Index
 * Initializes all automated schedulers
 */

import { logger } from '../../utils/logger';
import { initializeDailyHealthScheduler } from './daily-health';
import { initializeMaintenanceScheduler } from './maintenance';
import { initializeMemorySyncScheduler } from './memory-sync';

/**
 * Initialize all Jarvis schedulers
 */
export function initializeSchedulers() {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('🚀 Initializing Jarvis Schedulers');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Initialize memory sync (every 6 hours)
    initializeMemorySyncScheduler();

    // Initialize daily health reports (9 AM UTC)
    initializeDailyHealthScheduler();

    // Initialize weekly maintenance (6 AM UTC Monday)
    initializeMaintenanceScheduler();

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('✅ All schedulers initialized successfully');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Log next execution times
    logNextExecutionTimes();
  } catch (error) {
    logger.error('❌ Failed to initialize schedulers:', error);
    throw error;
  }
}

/**
 * Log next scheduled execution times
 */
function logNextExecutionTimes() {
  const now = new Date();

  // Calculate next memory sync (every 6 hours: 0, 6, 12, 18)
  const currentHour = now.getUTCHours();
  const nextSyncHour = Math.ceil(currentHour / 6) * 6;
  const nextMemorySync = new Date(now);
  nextMemorySync.setUTCHours(nextSyncHour, 0, 0, 0);
  if (nextMemorySync <= now) {
    nextMemorySync.setUTCDate(nextMemorySync.getUTCDate() + 1);
  }

  // Calculate next daily health report (9 AM UTC)
  const nextHealthReport = new Date(now);
  nextHealthReport.setUTCHours(9, 0, 0, 0);
  if (nextHealthReport <= now) {
    nextHealthReport.setUTCDate(nextHealthReport.getUTCDate() + 1);
  }

  // Calculate next weekly maintenance (Monday 6 AM UTC)
  const nextMaintenance = new Date(now);
  const daysUntilMonday = (8 - nextMaintenance.getUTCDay()) % 7 || 7;
  nextMaintenance.setUTCDate(nextMaintenance.getUTCDate() + daysUntilMonday);
  nextMaintenance.setUTCHours(6, 0, 0, 0);
  if (nextMaintenance <= now) {
    nextMaintenance.setUTCDate(nextMaintenance.getUTCDate() + 7);
  }

  logger.info('');
  logger.info('📅 Next Scheduled Executions:');
  logger.info(`   Memory Sync:       ${nextMemorySync.toISOString()}`);
  logger.info(`   Health Report:     ${nextHealthReport.toISOString()}`);
  logger.info(`   Weekly Maintenance: ${nextMaintenance.toISOString()}`);
  logger.info('');
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    initialized: true,
    schedulers: [
      {
        name: 'Memory Sync',
        schedule: '0 */6 * * *',
        description: 'Syncs adaptive memory to S3 every 6 hours'
      },
      {
        name: 'Daily Health Report',
        schedule: '0 9 * * *',
        description: 'Sends daily health summary at 9 AM UTC'
      },
      {
        name: 'Weekly Maintenance',
        schedule: '0 6 * * 1',
        description: 'Performs maintenance every Monday at 6 AM UTC'
      }
    ]
  };
}
