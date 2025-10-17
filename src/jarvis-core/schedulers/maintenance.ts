/**
 * Weekly Maintenance Scheduler
 * Handles automated key rotation, tunnel refresh, and system maintenance
 */

import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger';
import { notificationService, NotificationPayload, NotificationLevel, NotificationChannel } from '../services/notification.service';

const execAsync = promisify(exec);

/**
 * Initialize weekly maintenance scheduler
 */
export function initializeMaintenanceScheduler() {
  // Schedule for 6 AM UTC every Monday
  cron.schedule('0 6 * * 1', async () => {
    logger.info('🔧 Weekly maintenance task started');

    try {
      await performWeeklyMaintenance();
      logger.info('✅ Weekly maintenance completed successfully');
    } catch (error) {
      logger.error('❌ Weekly maintenance failed:', error);

      // Send notification about failure
      await notifyMaintenanceFailure(error as Error);
    }
  });

  logger.info('📅 Weekly maintenance scheduler initialized (6 AM UTC every Monday)');
}

/**
 * Perform all weekly maintenance tasks
 */
async function performWeeklyMaintenance(): Promise<void> {
  const tasks: Promise<void>[] = [];

  // Task 1: Rotate authentication keys
  tasks.push(rotateKeys());

  // Task 2: Refresh ngrok tunnel
  tasks.push(restartNgrokTunnel());

  // Task 3: Clean up old logs
  tasks.push(cleanupOldLogs());

  // Task 4: Backup configuration
  tasks.push(backupConfiguration());

  // Wait for all tasks to complete
  await Promise.all(tasks);

  // Send success notification
  await notifyMaintenanceSuccess();
}

/**
 * Rotate authentication keys
 */
export async function rotateKeys(): Promise<void> {
  logger.info('🔐 Rotating authentication keys...');

  try {
    const { stdout, stderr } = await execAsync('bash scripts/rotate-secrets.sh', {
      cwd: process.cwd(),
      timeout: 60000
    });

    if (stderr && !stderr.includes('Warning')) {
      logger.warn('Key rotation warnings:', stderr);
    }

    logger.info('✅ Authentication keys rotated successfully');
  } catch (error) {
    logger.error('❌ Key rotation failed:', error);
    throw new Error('Key rotation failed');
  }
}

/**
 * Restart ngrok tunnel to ensure fresh connection
 */
export async function restartNgrokTunnel(): Promise<void> {
  logger.info('🔄 Restarting ngrok tunnel...');

  try {
    // Kill existing ngrok process
    try {
      await execAsync('pkill -f ngrok');
      logger.info('Stopped existing ngrok tunnel');
    } catch {
      // No existing tunnel, continue
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start new ngrok tunnel
    const ngrokCmd = 'nohup ngrok http 3001 --log stdout > /tmp/ngrok.log 2>&1 &';
    await execAsync(ngrokCmd);

    // Wait for tunnel to establish
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify tunnel is running
    const { stdout } = await execAsync('curl -s http://localhost:4040/api/tunnels');
    const tunnels = JSON.parse(stdout);

    if (tunnels.tunnels && tunnels.tunnels.length > 0) {
      const publicUrl = tunnels.tunnels[0].public_url;
      logger.info(`✅ ngrok tunnel restarted: ${publicUrl}`);
    } else {
      throw new Error('No tunnels found after restart');
    }
  } catch (error) {
    logger.error('❌ ngrok tunnel restart failed:', error);
    throw new Error('ngrok tunnel restart failed');
  }
}

/**
 * Clean up old log files (older than 30 days)
 */
async function cleanupOldLogs(): Promise<void> {
  logger.info('🧹 Cleaning up old logs...');

  try {
    const { stdout } = await execAsync(
      'find logs -type f -name "*.log" -mtime +30 -delete -print',
      { cwd: process.cwd() }
    );

    const deletedFiles = stdout.trim().split('\n').filter(f => f.length > 0);
    logger.info(`✅ Cleaned up ${deletedFiles.length} old log files`);
  } catch (error) {
    logger.warn('⚠️  Log cleanup had issues:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Backup current configuration
 */
async function backupConfiguration(): Promise<void> {
  logger.info('💾 Backing up configuration...');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `backups/config-${timestamp}`;

    await execAsync(`mkdir -p ${backupDir}`, { cwd: process.cwd() });

    // Backup important files
    const filesToBackup = [
      '.env',
      'package.json',
      'tsconfig.json',
      '~/.jarvis/config.json'
    ];

    for (const file of filesToBackup) {
      try {
        const expandedPath = file.startsWith('~') ?
          file.replace('~', process.env.HOME || '') : file;

        await execAsync(`cp ${expandedPath} ${backupDir}/ 2>/dev/null || true`);
      } catch {
        // File might not exist, skip
      }
    }

    logger.info(`✅ Configuration backed up to ${backupDir}`);
  } catch (error) {
    logger.warn('⚠️  Configuration backup had issues:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Send maintenance success notification
 */
async function notifyMaintenanceSuccess(): Promise<void> {
  const notification: NotificationPayload = {
    id: `maint-${Date.now()}`,
    level: NotificationLevel.INFO,
    title: '✅ Weekly Maintenance Completed',
    message: [
      'Weekly maintenance tasks completed successfully:',
      '• Authentication keys rotated',
      '• ngrok tunnel refreshed',
      '• Old logs cleaned up',
      '• Configuration backed up'
    ].join('\n'),
    channels: [NotificationChannel.SLACK],
    timestamp: new Date()
  };

  try {
    await notificationService.sendNotification(notification);
  } catch (error) {
    logger.error('Failed to send maintenance success notification:', error);
  }
}

/**
 * Send maintenance failure notification
 */
async function notifyMaintenanceFailure(error: Error): Promise<void> {
  const notification: NotificationPayload = {
    id: `maint-fail-${Date.now()}`,
    level: NotificationLevel.ERROR,
    title: '❌ Weekly Maintenance Failed',
    message: [
      'Weekly maintenance encountered errors:',
      `Error: ${error.message}`,
      '',
      'Please review logs and take manual action if needed.'
    ].join('\n'),
    channels: [NotificationChannel.SLACK, NotificationChannel.EMAIL],
    timestamp: new Date()
  };

  try {
    await notificationService.sendNotification(notification);
  } catch (notifError) {
    logger.error('Failed to send maintenance failure notification:', notifError);
  }
}

/**
 * Manual maintenance trigger
 */
export async function triggerMaintenanceNow(): Promise<void> {
  logger.info('🔧 Manual maintenance trigger initiated');
  await performWeeklyMaintenance();
}
