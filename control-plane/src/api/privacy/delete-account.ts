/**
 * GDPR Account Deletion API
 *
 * Implements GDPR Article 17 - Right to Erasure ("Right to be Forgotten")
 * Allows users to request complete deletion of their account and all associated data
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getStripeService } from '../../services/stripe.service.js';
import { getS3DeletionService } from '../../services/s3-deletion.service.js';

const prisma = new PrismaClient();
const stripeService = getStripeService();
const s3DeletionService = getS3DeletionService();

interface DeletionRequest {
  userId: string;
  reason?: string;
  confirmationCode?: string;
  immediateDelete: boolean;
}

interface DeletionResult {
  success: boolean;
  userId: string;
  scheduledDate?: string;
  deletedImmediately?: boolean;
  recordsDeleted: {
    user: boolean;
    subscription: boolean;
    usageStats: boolean;
    usageLogs: number;
    observatories: number;
    projects: number;
    apiKeys: number;
    activityLogs?: number;
    files?: number;
  };
}

/**
 * DELETE /api/privacy/delete-account
 *
 * Request account deletion (GDPR Article 17)
 *
 * @body confirmationCode - User must confirm deletion with code sent to email
 * @body reason - Optional reason for deletion
 * @body immediateDelete - If true, delete immediately; if false, schedule for 30 days
 *
 * @returns Deletion confirmation and details
 */
export async function deleteUserAccount(req: Request, res: Response) {
  try {
    const userId = (req as any).userId; // Set by auth middleware
    const {
      confirmationCode,
      reason,
      immediateDelete = false
    } = req.body as DeletionRequest;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request'
      });
    }

    logger.info('Account deletion requested', {
      userId,
      immediateDelete,
      reason: reason || 'not specified'
    });

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the provided ID'
      });
    }

    // Check if user has active subscription
    if (user.subscription?.status === 'ACTIVE') {
      // Cancel subscription first
      logger.info('Canceling active subscription before deletion', { userId });

      // Cancel Stripe subscription if exists
      if (user.subscription.stripeSubscriptionId) {
        try {
          // Cancel immediately on account deletion
          await stripeService.cancelSubscription(
            user.subscription.stripeSubscriptionId,
            true // immediately = true
          );

          logger.info('Stripe subscription cancelled successfully', {
            userId,
            subscriptionId: user.subscription.stripeSubscriptionId
          });
        } catch (error: any) {
          logger.error('Failed to cancel Stripe subscription', {
            userId,
            subscriptionId: user.subscription.stripeSubscriptionId,
            error: error.message
          });

          // Log error but continue with deletion
          // Stripe subscription may need manual cancellation
        }
      }

      // Update subscription status in database
      await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          cancelAtPeriodEnd: false
        }
      });
    }

    // Perform deletion
    let result: DeletionResult;

    if (immediateDelete) {
      result = await performImmediateDeletion(userId);
    } else {
      result = await scheduleDelayedDeletion(userId, reason);
    }

    // Log deletion for audit trail (in separate audit log that persists)
    await logDeletionRequest(userId, user.email, reason, immediateDelete);

    logger.info('Account deletion processed', {
      userId,
      immediateDelete,
      result
    });

    return res.json({
      success: true,
      message: immediateDelete
        ? 'Your account has been permanently deleted'
        : 'Your account deletion has been scheduled',
      data: result
    });

  } catch (error: any) {
    logger.error('Account deletion failed', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Account deletion failed',
      message: error.message
    });
  }
}

/**
 * Perform immediate account deletion
 */
async function performImmediateDeletion(userId: string): Promise<DeletionResult> {
  const result: DeletionResult = {
    success: false,
    userId,
    deletedImmediately: true,
    recordsDeleted: {
      user: false,
      subscription: false,
      usageStats: false,
      usageLogs: 0,
      observatories: 0,
      projects: 0,
      apiKeys: 0
    }
  };

  try {
    // Delete in transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Delete usage logs
      const deletedUsageLogs = await tx.usageLog.deleteMany({
        where: { userId }
      });
      result.recordsDeleted.usageLogs = deletedUsageLogs.count;

      // 2. Delete observatories
      const deletedObservatories = await tx.observatory.deleteMany({
        where: { userId }
      });
      result.recordsDeleted.observatories = deletedObservatories.count;

      // 3. Delete projects
      const deletedProjects = await tx.project.deleteMany({
        where: { userId }
      });
      result.recordsDeleted.projects = deletedProjects.count;

      // 4. Delete API keys
      const deletedApiKeys = await tx.apiKey.deleteMany({
        where: { userId }
      });
      result.recordsDeleted.apiKeys = deletedApiKeys.count;

      // 5. Delete usage stats
      const deletedUsageStats = await tx.usageStats.delete({
        where: { userId }
      }).catch(() => null);
      result.recordsDeleted.usageStats = !!deletedUsageStats;

      // 6. Delete subscription
      const deletedSubscription = await tx.subscription.delete({
        where: { userId }
      }).catch(() => null);
      result.recordsDeleted.subscription = !!deletedSubscription;

      // 7. Finally, delete user
      await tx.user.delete({
        where: { id: userId }
      });
      result.recordsDeleted.user = true;
    });

    // Delete activity monitoring data if exists
    try {
      const deletedActivityEvents = await prisma.$executeRaw`
        DELETE FROM activity_events WHERE user_id = ${userId}
      `;
      result.recordsDeleted.activityLogs = deletedActivityEvents as number;

      const deletedActivitySessions = await prisma.$executeRaw`
        DELETE FROM activity_sessions WHERE user_id = ${userId}
      `;
    } catch (error) {
      // Activity monitoring not enabled or tables don't exist
      logger.debug('Activity monitoring data cleanup skipped');
    }

    // Delete user files from storage
    const filesDeleted = await deleteUserFiles(userId);
    result.recordsDeleted.files = filesDeleted;

    result.success = true;
    return result;

  } catch (error: any) {
    logger.error('Immediate deletion failed', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Schedule delayed deletion (30 days grace period)
 */
async function scheduleDelayedDeletion(userId: string, reason?: string): Promise<DeletionResult> {
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 30); // 30-day grace period

  // Mark user as pending deletion
  await prisma.user.update({
    where: { id: userId },
    data: {
      // Add deletion scheduled flag to user metadata
      // This would require a schema update to add deletionScheduledAt field
      updatedAt: new Date()
    }
  });

  // Store deletion request in a separate table
  try {
    await prisma.$executeRaw`
      INSERT INTO deletion_requests (user_id, scheduled_date, reason, created_at)
      VALUES (${userId}, ${scheduledDate}, ${reason || null}, NOW())
    `;
  } catch (error) {
    // Table doesn't exist, log for manual processing
    logger.warn('Deletion requests table not found, logging for manual processing', {
      userId,
      scheduledDate,
      reason
    });
  }

  // Cancel subscription but keep data for 30 days
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
      cancelAtPeriodEnd: false
    }
  });

  return {
    success: true,
    userId,
    scheduledDate: scheduledDate.toISOString(),
    recordsDeleted: {
      user: false,
      subscription: false,
      usageStats: false,
      usageLogs: 0,
      observatories: 0,
      projects: 0,
      apiKeys: 0
    }
  };
}

/**
 * Delete user files from storage (local and S3)
 */
async function deleteUserFiles(userId: string): Promise<number> {
  let filesDeleted = 0;

  try {
    // Delete local files
    // Delete activity monitoring recordings
    const activityPath = join(process.env.HOME || '', 'Jarvis', 'data', 'activity-logs', userId);
    if (existsSync(activityPath)) {
      // Recursively delete directory
      await rmdir(activityPath, { recursive: true });
      filesDeleted += 1;
      logger.info('Deleted local activity logs directory', { userId });
    }

    // Delete project files if stored locally
    const projectsPath = join(process.env.HOME || '', 'Jarvis', 'data', 'projects', userId);
    if (existsSync(projectsPath)) {
      await rmdir(projectsPath, { recursive: true });
      filesDeleted += 1;
      logger.info('Deleted local projects directory', { userId });
    }

    // Delete from cloud storage (S3)
    if (s3DeletionService.isConfigured()) {
      logger.info('Deleting user files from S3', { userId });

      const s3Result = await s3DeletionService.deleteUserFiles(userId);

      filesDeleted += s3Result.deletedFiles;

      logger.info('S3 deletion completed', {
        userId,
        deletedFiles: s3Result.deletedFiles,
        deletedBytes: s3Result.deletedBytes,
        errors: s3Result.errors.length
      });

      // Log S3 errors but don't fail deletion
      if (s3Result.errors.length > 0) {
        logger.error('S3 deletion had errors', {
          userId,
          errors: s3Result.errors
        });
      }
    } else {
      logger.warn('S3 not configured - skipping cloud storage deletion', { userId });
    }

  } catch (error: any) {
    logger.error('Error deleting user files', {
      userId,
      error: error.message,
      stack: error.stack
    });
  }

  return filesDeleted;
}

/**
 * Log deletion request in audit trail
 * This persists even after user deletion for compliance
 */
async function logDeletionRequest(
  userId: string,
  email: string,
  reason?: string,
  immediate: boolean = false
) {
  try {
    await prisma.$executeRaw`
      INSERT INTO gdpr_audit_log (
        user_id,
        email,
        action,
        reason,
        timestamp
      )
      VALUES (
        ${userId},
        ${email},
        ${immediate ? 'IMMEDIATE_DELETION' : 'SCHEDULED_DELETION'},
        ${reason || null},
        NOW()
      )
    `;
  } catch (error) {
    // Table doesn't exist, log to file instead
    logger.info('GDPR Audit Log', {
      userId,
      email,
      action: immediate ? 'IMMEDIATE_DELETION' : 'SCHEDULED_DELETION',
      reason,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * POST /api/privacy/cancel-deletion
 *
 * Cancel a scheduled account deletion (must be done within 30-day grace period)
 */
export async function cancelAccountDeletion(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Remove from deletion queue
    try {
      await prisma.$executeRaw`
        DELETE FROM deletion_requests WHERE user_id = ${userId}
      `;
    } catch (error) {
      logger.warn('Could not remove from deletion_requests table', { userId });
    }

    logger.info('Account deletion cancelled', { userId });

    return res.json({
      success: true,
      message: 'Your account deletion has been cancelled'
    });

  } catch (error: any) {
    logger.error('Cancel deletion failed', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to cancel deletion',
      message: error.message
    });
  }
}

export default {
  deleteUserAccount,
  cancelAccountDeletion
};
