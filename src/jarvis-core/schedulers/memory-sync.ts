/**
 * Memory Sync Scheduler
 * Syncs Jarvis adaptive memory to S3 every 6 hours
 */

import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

/**
 * Initialize memory sync scheduler
 */
export function initializeMemorySyncScheduler() {
  // Schedule for every 6 hours (0:00, 6:00, 12:00, 18:00)
  cron.schedule('0 */6 * * *', async () => {
    logger.info('🌐 Memory sync scheduled task started');

    try {
      await syncMemoryToS3();
      logger.info('✅ Memory sync completed successfully');
    } catch (error) {
      logger.error('❌ Memory sync failed:', error);
    }
  });

  logger.info('📅 Memory sync scheduler initialized (every 6 hours)');
}

/**
 * Sync memory to S3
 */
export async function syncMemoryToS3(): Promise<void> {
  logger.info('📤 Syncing adaptive memory to S3...');

  try {
    const { stdout, stderr } = await execAsync('bash scripts/cloud/sync-memory-to-s3.sh', {
      cwd: process.cwd(),
      timeout: 120000 // 2 minutes timeout
    });

    if (stdout) {
      logger.info('Sync output:', stdout);
    }

    if (stderr && !stderr.includes('Warning')) {
      logger.warn('Sync warnings:', stderr);
    }

    logger.info('✅ Memory synced to S3');
  } catch (error: any) {
    // Check if it's an AWS configuration error
    if (error.message && error.message.includes('AWS CLI not configured')) {
      logger.warn('⚠️  AWS CLI not configured yet. Skipping memory sync.');
      logger.info('💡 Run "aws configure" to set up AWS credentials');
    } else {
      logger.error('❌ Memory sync failed:', error);
      throw error;
    }
  }
}

/**
 * Manual memory sync trigger
 */
export async function triggerMemorySyncNow(): Promise<void> {
  logger.info('🔄 Manual memory sync initiated');
  await syncMemoryToS3();
}
