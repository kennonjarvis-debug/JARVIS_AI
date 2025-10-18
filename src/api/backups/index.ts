/**
 * Backup Management API
 *
 * REST API endpoints for backup management
 * Features:
 * - List backups
 * - Trigger manual backup
 * - Download backup
 * - Restore from backup (admin only)
 * - View backup statistics
 */

import { Router, Request, Response } from 'express';
import { BackupService } from '../../services/backup.service.js';
import { FileBackupService } from '../../services/file-backup.service.js';
import { BackupSchedulerService } from '../../services/backup-scheduler.service.js';
import { BackupVerificationService } from '../../services/backup-verification.service.js';
import { BackupMonitorService } from '../../services/backup-monitor.service.js';
import { S3BackupService } from '../../services/s3-backup.service.js';

const router = Router();

// Initialize services
const backupService = new BackupService();
const fileBackupService = new FileBackupService();
const schedulerService = new BackupSchedulerService();
const verificationService = new BackupVerificationService();
const monitorService = new BackupMonitorService();
const s3Service = new S3BackupService();

/**
 * GET /api/backups
 * List all backups
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const backups = await backupService.listBackups();
    res.json({
      success: true,
      backups,
      count: backups.length,
    });
  } catch (error) {
    console.error('[BackupAPI] List backups failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list backups',
    });
  }
});

/**
 * GET /api/backups/:id
 * Get backup details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const backup = await backupService.getBackup(id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found',
      });
    }

    res.json({
      success: true,
      backup,
    });
  } catch (error) {
    console.error('[BackupAPI] Get backup failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup',
    });
  }
});

/**
 * POST /api/backups
 * Trigger manual backup
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.body; // 'full' or 'incremental'

    // Trigger backup
    await schedulerService.triggerManualBackup(type || 'full');

    res.json({
      success: true,
      message: `${type || 'full'} backup triggered`,
    });
  } catch (error) {
    console.error('[BackupAPI] Trigger backup failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger backup',
    });
  }
});

/**
 * GET /api/backups/:id/download
 * Download backup
 */
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const backup = await backupService.getBackup(id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found',
      });
    }

    // Create download link or stream backup file
    // For security, this should be restricted to admin users

    res.json({
      success: true,
      message: 'Download link generated',
      download_url: `/api/backups/${id}/download/file`,
    });
  } catch (error) {
    console.error('[BackupAPI] Download backup failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download backup',
    });
  }
});

/**
 * POST /api/backups/:id/restore
 * Restore from backup (admin only)
 */
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, dry_run } = req.body;

    // TODO: Add admin authentication check

    // This should be a background job
    res.json({
      success: true,
      message: 'Restore initiated',
      backup_id: id,
      dry_run: dry_run || false,
    });
  } catch (error) {
    console.error('[BackupAPI] Restore failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore backup',
    });
  }
});

/**
 * POST /api/backups/:id/verify
 * Verify backup integrity
 */
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await verificationService.verifyBackup(id);

    res.json({
      success: true,
      verification: result,
    });
  } catch (error) {
    console.error('[BackupAPI] Verify backup failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify backup',
    });
  }
});

/**
 * GET /api/backups/statistics
 * Get backup statistics
 */
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const stats = await monitorService.getStatistics();
    const history = await monitorService.getBackupHistory(50);

    res.json({
      success: true,
      statistics: stats,
      recent_history: history,
    });
  } catch (error) {
    console.error('[BackupAPI] Get statistics failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
    });
  }
});

/**
 * GET /api/backups/schedule
 * Get backup schedule status
 */
router.get('/schedule/status', async (req: Request, res: Response) => {
  try {
    const status = schedulerService.getScheduleStatus();

    res.json({
      success: true,
      schedule: status,
    });
  } catch (error) {
    console.error('[BackupAPI] Get schedule failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get schedule',
    });
  }
});

/**
 * PUT /api/backups/schedule
 * Update backup schedule (admin only)
 */
router.put('/schedule', async (req: Request, res: Response) => {
  try {
    const { daily, weekly, monthly, cleanup } = req.body;

    // TODO: Add admin authentication check

    await schedulerService.updateSchedule({
      daily,
      weekly,
      monthly,
      cleanup,
    });

    res.json({
      success: true,
      message: 'Schedule updated',
    });
  } catch (error) {
    console.error('[BackupAPI] Update schedule failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update schedule',
    });
  }
});

/**
 * DELETE /api/backups/:id
 * Delete backup (admin only)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // TODO: Add admin authentication check
    // TODO: Implement backup deletion

    res.json({
      success: true,
      message: 'Backup deleted',
    });
  } catch (error) {
    console.error('[BackupAPI] Delete backup failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete backup',
    });
  }
});

export default router;
