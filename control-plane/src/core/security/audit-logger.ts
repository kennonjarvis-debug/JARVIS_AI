/**
 * Audit Logger
 * Dedicated audit logging for security events with JSON format and retention policies
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import type { CommandAuditLog, AuditFilter, ApprovalRequest } from './types.js';

export interface AuthEvent {
  id: string;
  type: 'login' | 'logout' | 'auth_failure' | 'token_refresh';
  user?: string;
  ip?: string;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ApprovalDecision {
  id: string;
  requestId: string;
  command: string;
  approver?: string;
  decision: 'approved' | 'denied';
  reason?: string;
  timestamp: Date;
}

export class AuditLogger {
  private logDir: string;
  private retentionDays: number;
  private commandLogPath: string;
  private authLogPath: string;
  private approvalLogPath: string;

  constructor(options?: {
    logDir?: string;
    retentionDays?: number;
  }) {
    this.logDir = options?.logDir || './logs/audit';
    this.retentionDays = options?.retentionDays || 90;

    this.commandLogPath = path.join(this.logDir, 'terminal-commands.log');
    this.authLogPath = path.join(this.logDir, 'auth-events.log');
    this.approvalLogPath = path.join(this.logDir, 'approval-decisions.log');

    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      logger.info(`[AuditLogger] Created audit log directory: ${this.logDir}`);
    }
  }

  /**
   * Write log entry to file
   */
  private writeLog(filePath: string, entry: any): void {
    const logLine = JSON.stringify(entry) + '\n';

    try {
      fs.appendFileSync(filePath, logLine, 'utf8');
    } catch (error: any) {
      logger.error(`[AuditLogger] Failed to write audit log: ${error.message}`);
    }
  }

  /**
   * Log command execution
   */
  logCommandExecution(log: CommandAuditLog): void {
    // Truncate output to 5KB
    const MAX_OUTPUT_SIZE = 5 * 1024;

    if (log.stdout && log.stdout.length > MAX_OUTPUT_SIZE) {
      log.stdout = log.stdout.substring(0, MAX_OUTPUT_SIZE) + '\n... (truncated)';
    }

    if (log.stderr && log.stderr.length > MAX_OUTPUT_SIZE) {
      log.stderr = log.stderr.substring(0, MAX_OUTPUT_SIZE) + '\n... (truncated)';
    }

    this.writeLog(this.commandLogPath, log);
    logger.debug(`[AuditLogger] Logged command execution: ${log.id}`);
  }

  /**
   * Log authentication attempt
   */
  logAuthenticationAttempt(event: AuthEvent): void {
    this.writeLog(this.authLogPath, event);
    logger.debug(`[AuditLogger] Logged auth event: ${event.type}`);
  }

  /**
   * Log approval decision
   */
  logApprovalDecision(decision: ApprovalDecision): void {
    this.writeLog(this.approvalLogPath, decision);
    logger.info(`[AuditLogger] Logged approval decision: ${decision.decision} for ${decision.requestId}`);
  }

  /**
   * Query command audit logs
   */
  query(filter: AuditFilter = {}): CommandAuditLog[] {
    if (!fs.existsSync(this.commandLogPath)) {
      return [];
    }

    const logs: CommandAuditLog[] = [];

    try {
      const content = fs.readFileSync(this.commandLogPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const log: CommandAuditLog = JSON.parse(line);

          // Apply filters
          if (filter.command && log.command !== filter.command) continue;
          if (filter.user && log.user !== filter.user) continue;
          if (filter.approved !== undefined && log.approved !== filter.approved) continue;
          if (filter.blocked !== undefined && log.blocked !== filter.blocked) continue;

          if (filter.startDate && new Date(log.startTime) < filter.startDate) continue;
          if (filter.endDate && new Date(log.startTime) > filter.endDate) continue;

          logs.push(log);

          // Apply limit
          if (filter.limit && logs.length >= filter.limit) break;
        } catch (parseError) {
          // Skip invalid JSON lines
          continue;
        }
      }
    } catch (error: any) {
      logger.error(`[AuditLogger] Failed to query logs: ${error.message}`);
    }

    return logs;
  }

  /**
   * Export logs in specified format
   */
  exportLogs(startDate: Date, endDate: Date, format: 'json' | 'csv' = 'json'): string {
    const logs = this.query({ startDate, endDate });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    if (logs.length === 0) {
      return 'No logs found for the specified date range\n';
    }

    const headers = [
      'id',
      'command',
      'args',
      'user',
      'approved',
      'blocked',
      'startTime',
      'endTime',
      'duration',
      'exitCode',
      'error'
    ];

    let csv = headers.join(',') + '\n';

    for (const log of logs) {
      const row = [
        log.id,
        log.command,
        JSON.stringify(log.args),
        log.user || '',
        log.approved.toString(),
        log.blocked?.toString() || 'false',
        log.startTime.toString(),
        log.endTime?.toString() || '',
        log.duration?.toString() || '',
        log.exitCode?.toString() || '',
        log.error || ''
      ];

      csv += row.map(field => `"${field}"`).join(',') + '\n';
    }

    return csv;
  }

  /**
   * Get audit statistics
   */
  getStats(): {
    totalLogs: number;
    blockedCommands: number;
    approvedCommands: number;
    failedCommands: number;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const logs = this.query({});

    if (logs.length === 0) {
      return {
        totalLogs: 0,
        blockedCommands: 0,
        approvedCommands: 0,
        failedCommands: 0
      };
    }

    return {
      totalLogs: logs.length,
      blockedCommands: logs.filter(l => l.blocked).length,
      approvedCommands: logs.filter(l => l.approved).length,
      failedCommands: logs.filter(l => l.exitCode !== 0 && l.exitCode !== undefined).length,
      oldestLog: new Date(Math.min(...logs.map(l => new Date(l.startTime).getTime()))),
      newestLog: new Date(Math.max(...logs.map(l => new Date(l.startTime).getTime())))
    };
  }

  /**
   * Clean up old logs based on retention policy
   */
  cleanup(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    logger.info(`[AuditLogger] Cleaning logs older than ${cutoffDate.toISOString()}`);

    for (const logPath of [this.commandLogPath, this.authLogPath, this.approvalLogPath]) {
      if (!fs.existsSync(logPath)) continue;

      try {
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        const keptLines: string[] = [];
        let removedCount = 0;

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            const entryDate = new Date(entry.startTime || entry.timestamp);

            if (entryDate >= cutoffDate) {
              keptLines.push(line);
            } else {
              removedCount++;
            }
          } catch {
            // Keep malformed lines
            keptLines.push(line);
          }
        }

        if (removedCount > 0) {
          fs.writeFileSync(logPath, keptLines.join('\n') + '\n', 'utf8');
          logger.info(`[AuditLogger] Removed ${removedCount} old entries from ${path.basename(logPath)}`);
        }
      } catch (error: any) {
        logger.error(`[AuditLogger] Failed to cleanup ${logPath}: ${error.message}`);
      }
    }
  }

  /**
   * Rotate log files (create new file when size exceeds limit)
   */
  rotate(maxSizeMB: number = 100): void {
    for (const logPath of [this.commandLogPath, this.authLogPath, this.approvalLogPath]) {
      if (!fs.existsSync(logPath)) continue;

      try {
        const stats = fs.statSync(logPath);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > maxSizeMB) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedPath = `${logPath}.${timestamp}`;

          fs.renameSync(logPath, rotatedPath);
          logger.info(`[AuditLogger] Rotated log file: ${path.basename(logPath)} (${sizeMB.toFixed(2)}MB)`);
        }
      } catch (error: any) {
        logger.error(`[AuditLogger] Failed to rotate ${logPath}: ${error.message}`);
      }
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger({
  logDir: process.env.TERMINAL_AUDIT_LOG_PATH || './logs/audit',
  retentionDays: parseInt(process.env.TERMINAL_AUDIT_RETENTION_DAYS || '90')
});

// Setup periodic cleanup (daily)
setInterval(() => {
  auditLogger.cleanup();
  auditLogger.rotate();
}, 24 * 60 * 60 * 1000);
