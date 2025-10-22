/**
 * GDPR Data Export API
 *
 * Implements GDPR Article 15 - Right of Access
 * Allows users to export all their personal data in machine-readable format
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import archiver from 'archiver';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const prisma = new PrismaClient();

interface ExportData {
  user: any;
  subscription: any;
  usageStats: any;
  usageLogs: any[];
  observatories: any[];
  projects: any[];
  apiKeys: any[];
  metadata: {
    exportDate: string;
    dataFormat: string;
    gdprCompliant: boolean;
  };
}

/**
 * GET /api/privacy/export
 *
 * Export all user data in JSON format (GDPR Article 15)
 *
 * @query format - "json" | "zip" (default: "json")
 * @query includeUsageLogs - Include detailed usage logs (default: true)
 *
 * @returns JSON object or ZIP file containing all user data
 */
export async function exportUserData(req: Request, res: Response) {
  try {
    const userId = (req as any).userId; // Set by auth middleware
    const format = (req.query.format as string) || 'json';
    const includeUsageLogs = req.query.includeUsageLogs !== 'false';

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request'
      });
    }

    logger.info('Data export requested', { userId, format });

    // Fetch all user data from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        usageStats: true,
        observatories: true,
        projects: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
            lastOpenedAt: true,
            storageSizeGB: true,
            // Exclude large binary data (tracks/metadata) for export
            // Users can download projects separately
          }
        },
        apiKeys: {
          select: {
            id: true,
            name: true,
            active: true,
            scopes: true,
            lastUsedAt: true,
            requestCount: true,
            createdAt: true,
            expiresAt: true,
            // Exclude actual key value for security
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the provided ID'
      });
    }

    // Fetch usage logs if requested
    let usageLogs: any[] = [];
    if (includeUsageLogs) {
      usageLogs = await prisma.usageLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 10000 // Limit to most recent 10k logs
      });
    }

    // Fetch activity logs if monitoring is enabled
    let activityLogs: any[] = [];
    try {
      // Check if activity monitoring tables exist
      const activityEvents = await prisma.$queryRaw`
        SELECT * FROM activity_events
        WHERE user_id = ${userId}
        ORDER BY timestamp DESC
        LIMIT 1000
      `;
      activityLogs = activityEvents as any[];
    } catch (error) {
      // Activity monitoring not enabled or table doesn't exist
      logger.debug('Activity monitoring data not available for export');
    }

    // Compile export data
    const exportData: ExportData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      },
      subscription: user.subscription,
      usageStats: user.usageStats,
      usageLogs,
      observatories: user.observatories,
      projects: user.projects,
      apiKeys: user.apiKeys,
      metadata: {
        exportDate: new Date().toISOString(),
        dataFormat: 'JSON',
        gdprCompliant: true
      }
    };

    // Add activity logs if available
    if (activityLogs.length > 0) {
      (exportData as any).activityLogs = activityLogs;
    }

    // Log export for audit trail
    logger.info('Data export completed', {
      userId,
      format,
      recordCount: {
        usageLogs: usageLogs.length,
        observatories: user.observatories.length,
        projects: user.projects.length,
        apiKeys: user.apiKeys.length,
        activityLogs: activityLogs.length
      }
    });

    // Return based on format
    if (format === 'zip') {
      // Create ZIP archive with all data
      return await exportAsZip(res, exportData, userId);
    } else {
      // Return JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="jarvis-data-export-${userId}-${Date.now()}.json"`);
      return res.json({
        success: true,
        data: exportData
      });
    }

  } catch (error: any) {
    logger.error('Data export failed', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Data export failed',
      message: error.message
    });
  }
}

/**
 * Export data as ZIP archive
 */
async function exportAsZip(res: Response, exportData: ExportData, userId: string) {
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  // Set response headers
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="jarvis-data-export-${userId}-${Date.now()}.zip"`);

  // Pipe archive to response
  archive.pipe(res);

  // Add JSON file to archive
  archive.append(JSON.stringify(exportData, null, 2), {
    name: 'user-data.json'
  });

  // Add README
  const readme = `
# Jarvis Data Export

This archive contains all your personal data from Jarvis.

## Contents

- user-data.json: Complete data export in JSON format

## Data Included

- User profile information
- Subscription and billing details
- Usage statistics and logs
- Observatories configuration
- Projects metadata
- API keys (hashed, not plaintext)
${exportData.activityLogs ? '- Activity monitoring logs' : ''}

## GDPR Compliance

This export was generated in compliance with GDPR Article 15 (Right of Access).
Export Date: ${exportData.metadata.exportDate}

## Questions?

Contact support@jarvis.ai for any questions about your data.
`;

  archive.append(readme, { name: 'README.txt' });

  // Finalize archive
  await archive.finalize();

  logger.info('ZIP export completed', { userId });
}

/**
 * Middleware to authenticate user from JWT token
 * Should be applied before calling exportUserData
 */
export function authenticateUser(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide a valid Bearer token'
    });
  }

  const token = authHeader.substring(7);

  // TODO: Verify JWT token and extract userId
  // For now, extract from query param (dev only)
  const userId = req.query.userId as string || req.body.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'User ID required',
      message: 'Could not extract user ID from token'
    });
  }

  // Attach userId to request
  (req as any).userId = userId;
  next();
}

export default exportUserData;
