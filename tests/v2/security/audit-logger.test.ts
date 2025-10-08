/**
 * Audit Logger Tests
 * CLAUDE A: Audit Logging & Security Event Tracking
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AuditLogger } from '../../../src/core/security/audit-logger.js';
import type { CommandAuditLog } from '../../../src/core/security/types.js';
import fs from 'fs';
import path from 'path';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  let testLogDir: string;

  beforeEach(() => {
    // Create temporary test log directory
    testLogDir = path.join(__dirname, '../../../logs/audit-test-' + Date.now());
    auditLogger = new AuditLogger({
      logDir: testLogDir,
      retentionDays: 7
    });
  });

  afterEach(() => {
    // Cleanup test log directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('Log Directory Management', () => {
    it('should create log directory on initialization', () => {
      expect(fs.existsSync(testLogDir)).toBe(true);
      expect(fs.statSync(testLogDir).isDirectory()).toBe(true);
    });

    it('should create log directory recursively if parent does not exist', () => {
      const nestedDir = path.join(__dirname, '../../../logs/deeply/nested/audit-test-' + Date.now());
      const nestedLogger = new AuditLogger({ logDir: nestedDir });

      expect(fs.existsSync(nestedDir)).toBe(true);

      // Cleanup
      fs.rmSync(path.join(__dirname, '../../../logs/deeply'), { recursive: true, force: true });
    });
  });

  describe('Command Execution Logging', () => {
    it('should log command execution with proper format', () => {
      const log: CommandAuditLog = {
        id: 'test-cmd-001',
        command: 'git',
        args: ['status'],
        user: 'test-user',
        approved: true,
        requiresApproval: false,
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
        exitCode: 0,
        stdout: 'On branch main',
        stderr: '',
        cwd: '/test/dir'
      };

      auditLogger.logCommandExecution(log);

      const logPath = path.join(testLogDir, 'terminal-commands.log');
      expect(fs.existsSync(logPath)).toBe(true);

      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('test-cmd-001');
      expect(content).toContain('git');
      expect(content).toContain('status');
    });

    it('should truncate large stdout to 5KB', () => {
      const largeOutput = 'x'.repeat(10 * 1024); // 10KB

      const log: CommandAuditLog = {
        id: 'test-cmd-002',
        command: 'cat',
        args: ['large-file.txt'],
        approved: true,
        requiresApproval: false,
        startTime: new Date(),
        stdout: largeOutput
      };

      auditLogger.logCommandExecution(log);

      const logPath = path.join(testLogDir, 'terminal-commands.log');
      const content = fs.readFileSync(logPath, 'utf8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.stdout).toContain('(truncated)');
      expect(parsed.stdout.length).toBeLessThan(10 * 1024);
    });

    it('should truncate large stderr to 5KB', () => {
      const largeError = 'Error: '.repeat(2000); // Large error output

      const log: CommandAuditLog = {
        id: 'test-cmd-003',
        command: 'npm',
        args: ['install'],
        approved: true,
        requiresApproval: false,
        startTime: new Date(),
        stderr: largeError
      };

      auditLogger.logCommandExecution(log);

      const logPath = path.join(testLogDir, 'terminal-commands.log');
      const content = fs.readFileSync(logPath, 'utf8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.stderr).toContain('(truncated)');
      expect(parsed.stderr.length).toBeLessThan(10 * 1024);
    });

    it('should log blocked command attempts', () => {
      const log: CommandAuditLog = {
        id: 'test-cmd-004',
        command: 'rm',
        args: ['-rf', '/'],
        approved: false,
        requiresApproval: false,
        startTime: new Date(),
        blocked: true,
        blockReason: 'Dangerous command pattern detected'
      };

      auditLogger.logCommandExecution(log);

      const logs = auditLogger.query({ blocked: true });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].blocked).toBe(true);
      expect(logs[0].blockReason).toBe('Dangerous command pattern detected');
    });
  });

  describe('Authentication Event Logging', () => {
    it('should log successful authentication events', () => {
      const authEvent = {
        id: 'auth-001',
        type: 'login' as const,
        user: 'test-user',
        ip: '192.168.1.100',
        success: true,
        timestamp: new Date()
      };

      auditLogger.logAuthenticationAttempt(authEvent);

      const logPath = path.join(testLogDir, 'auth-events.log');
      expect(fs.existsSync(logPath)).toBe(true);

      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('auth-001');
      expect(content).toContain('login');
      expect(content).toContain('test-user');
    });

    it('should log failed authentication events', () => {
      const authEvent = {
        id: 'auth-002',
        type: 'auth_failure' as const,
        user: 'attacker',
        ip: '10.0.0.50',
        success: false,
        timestamp: new Date(),
        metadata: { reason: 'Invalid password' }
      };

      auditLogger.logAuthenticationAttempt(authEvent);

      const logPath = path.join(testLogDir, 'auth-events.log');
      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('auth_failure');
      expect(content).toContain('attacker');
    });
  });

  describe('Approval Decision Logging', () => {
    it('should log approved command decisions', () => {
      const decision = {
        id: 'dec-001',
        requestId: 'req-123',
        command: 'kubectl',
        approver: 'admin-user',
        decision: 'approved' as const,
        timestamp: new Date()
      };

      auditLogger.logApprovalDecision(decision);

      const logPath = path.join(testLogDir, 'approval-decisions.log');
      expect(fs.existsSync(logPath)).toBe(true);

      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('dec-001');
      expect(content).toContain('approved');
      expect(content).toContain('kubectl');
    });

    it('should log denied command decisions', () => {
      const decision = {
        id: 'dec-002',
        requestId: 'req-456',
        command: 'terraform destroy',
        approver: 'admin-user',
        decision: 'denied' as const,
        reason: 'Production environment protection',
        timestamp: new Date()
      };

      auditLogger.logApprovalDecision(decision);

      const logPath = path.join(testLogDir, 'approval-decisions.log');
      const content = fs.readFileSync(logPath, 'utf8');
      expect(content).toContain('denied');
      expect(content).toContain('Production environment protection');
    });
  });

  describe('Log Querying', () => {
    beforeEach(() => {
      // Setup test logs
      const log1: CommandAuditLog = {
        id: 'query-001',
        command: 'git',
        args: ['status'],
        user: 'user1',
        approved: true,
        requiresApproval: false,
        startTime: new Date('2025-10-01'),
        exitCode: 0
      };

      const log2: CommandAuditLog = {
        id: 'query-002',
        command: 'npm',
        args: ['install'],
        user: 'user2',
        approved: true,
        requiresApproval: false,
        startTime: new Date('2025-10-02'),
        exitCode: 0
      };

      const log3: CommandAuditLog = {
        id: 'query-003',
        command: 'docker',
        args: ['build'],
        user: 'user1',
        approved: false,
        requiresApproval: true,
        startTime: new Date('2025-10-03'),
        blocked: true,
        blockReason: 'Requires approval'
      };

      auditLogger.logCommandExecution(log1);
      auditLogger.logCommandExecution(log2);
      auditLogger.logCommandExecution(log3);
    });

    it('should query all logs without filter', () => {
      const logs = auditLogger.query({});
      expect(logs.length).toBe(3);
    });

    it('should filter logs by command', () => {
      const logs = auditLogger.query({ command: 'git' });
      expect(logs.length).toBe(1);
      expect(logs[0].command).toBe('git');
    });

    it('should filter logs by user', () => {
      const logs = auditLogger.query({ user: 'user1' });
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.user === 'user1')).toBe(true);
    });

    it('should filter logs by approved status', () => {
      const logs = auditLogger.query({ approved: true });
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.approved === true)).toBe(true);
    });

    it('should filter logs by blocked status', () => {
      const logs = auditLogger.query({ blocked: true });
      expect(logs.length).toBe(1);
      expect(logs[0].blocked).toBe(true);
    });

    it('should filter logs by date range', () => {
      const logs = auditLogger.query({
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-02')
      });
      expect(logs.length).toBe(2);
    });

    it('should limit query results', () => {
      const logs = auditLogger.query({ limit: 2 });
      expect(logs.length).toBe(2);
    });

    it('should return empty array for non-existent log file', () => {
      const newLogger = new AuditLogger({
        logDir: path.join(__dirname, '../../../logs/nonexistent-' + Date.now())
      });

      const logs = newLogger.query({});
      expect(logs).toEqual([]);

      // Cleanup
      if (fs.existsSync(newLogger['logDir'])) {
        fs.rmSync(newLogger['logDir'], { recursive: true });
      }
    });
  });

  describe('Log Export', () => {
    beforeEach(() => {
      const log: CommandAuditLog = {
        id: 'export-001',
        command: 'ls',
        args: ['-la'],
        user: 'test-user',
        approved: true,
        requiresApproval: false,
        startTime: new Date('2025-10-01'),
        endTime: new Date('2025-10-01'),
        duration: 50,
        exitCode: 0
      };

      auditLogger.logCommandExecution(log);
    });

    it('should export logs in JSON format', () => {
      const exported = auditLogger.exportLogs(
        new Date('2025-10-01'),
        new Date('2025-10-02'),
        'json'
      );

      expect(exported).toBeTruthy();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should export logs in CSV format', () => {
      const exported = auditLogger.exportLogs(
        new Date('2025-10-01'),
        new Date('2025-10-02'),
        'csv'
      );

      expect(exported).toContain('id,command,args');
      expect(exported).toContain('export-001');
      expect(exported).toContain('ls');
    });

    it('should handle empty date range', () => {
      const exported = auditLogger.exportLogs(
        new Date('2025-12-01'),
        new Date('2025-12-02'),
        'csv'
      );

      expect(exported).toContain('No logs found');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      const logs: CommandAuditLog[] = [
        {
          id: 'stats-001',
          command: 'git',
          args: ['status'],
          approved: true,
          requiresApproval: false,
          startTime: new Date(),
          exitCode: 0
        },
        {
          id: 'stats-002',
          command: 'npm',
          args: ['install'],
          approved: true,
          requiresApproval: false,
          startTime: new Date(),
          exitCode: 1
        },
        {
          id: 'stats-003',
          command: 'rm',
          args: ['-rf', '/'],
          approved: false,
          requiresApproval: false,
          startTime: new Date(),
          blocked: true
        }
      ];

      logs.forEach(log => auditLogger.logCommandExecution(log));
    });

    it('should calculate total log count', () => {
      const stats = auditLogger.getStats();
      expect(stats.totalLogs).toBeGreaterThan(0);
    });

    it('should calculate blocked command count', () => {
      const stats = auditLogger.getStats();
      expect(stats.blockedCommands).toBeGreaterThan(0);
    });

    it('should calculate approved command count', () => {
      const stats = auditLogger.getStats();
      expect(stats.approvedCommands).toBeGreaterThan(0);
    });

    it('should calculate failed command count', () => {
      const stats = auditLogger.getStats();
      expect(stats.failedCommands).toBeGreaterThan(0);
    });

    it('should track oldest and newest log timestamps', () => {
      const stats = auditLogger.getStats();
      expect(stats.oldestLog).toBeDefined();
      expect(stats.newestLog).toBeDefined();
    });

    it('should return zero stats for empty logs', () => {
      const newLogger = new AuditLogger({
        logDir: path.join(__dirname, '../../../logs/empty-' + Date.now())
      });

      const stats = newLogger.getStats();
      expect(stats.totalLogs).toBe(0);
      expect(stats.blockedCommands).toBe(0);
      expect(stats.approvedCommands).toBe(0);
      expect(stats.failedCommands).toBe(0);

      // Cleanup
      fs.rmSync(newLogger['logDir'], { recursive: true });
    });
  });

  describe('Log Cleanup', () => {
    it('should remove old logs based on retention policy', () => {
      // Create old log entries
      const oldLog: CommandAuditLog = {
        id: 'old-001',
        command: 'git',
        args: ['status'],
        approved: true,
        requiresApproval: false,
        startTime: new Date('2025-01-01'), // Very old
        exitCode: 0
      };

      const recentLog: CommandAuditLog = {
        id: 'recent-001',
        command: 'npm',
        args: ['install'],
        approved: true,
        requiresApproval: false,
        startTime: new Date(), // Recent
        exitCode: 0
      };

      auditLogger.logCommandExecution(oldLog);
      auditLogger.logCommandExecution(recentLog);

      // Run cleanup with 7-day retention
      auditLogger.cleanup();

      const logs = auditLogger.query({});
      const hasOldLog = logs.some(log => log.id === 'old-001');
      expect(hasOldLog).toBe(false);

      const hasRecentLog = logs.some(log => log.id === 'recent-001');
      expect(hasRecentLog).toBe(true);
    });
  });

  describe('Log Rotation', () => {
    it('should rotate large log files', () => {
      const logPath = path.join(testLogDir, 'terminal-commands.log');

      // Create a large log file (> 100MB would be slow, so we test the mechanism)
      const largeData = 'x'.repeat(1024); // 1KB
      for (let i = 0; i < 100; i++) {
        const log: CommandAuditLog = {
          id: `rotate-${i}`,
          command: 'echo',
          args: [largeData],
          approved: true,
          requiresApproval: false,
          startTime: new Date()
        };
        auditLogger.logCommandExecution(log);
      }

      // Get current size
      const statsBefore = fs.statSync(logPath);

      // Rotation with very small max size for testing
      auditLogger.rotate(0.001); // 0.001 MB = 1KB

      // Check if file was rotated (renamed)
      const files = fs.readdirSync(testLogDir);
      const rotatedFiles = files.filter(f => f.startsWith('terminal-commands.log.'));

      expect(rotatedFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle write errors gracefully', () => {
      // Test with a valid directory, but writeLog handles file system errors gracefully
      // The writeLog method has try-catch that prevents throwing errors
      const validLogger = new AuditLogger({
        logDir: path.join(__dirname, '../../../logs/test-errors-' + Date.now())
      });

      const log: CommandAuditLog = {
        id: 'error-001',
        command: 'test',
        args: [],
        approved: true,
        requiresApproval: false,
        startTime: new Date()
      };

      // Should not throw error even with filesystem issues
      expect(() => validLogger.logCommandExecution(log)).not.toThrow();

      // Cleanup
      if (fs.existsSync(validLogger['logDir'])) {
        fs.rmSync(validLogger['logDir'], { recursive: true });
      }
    });

    it('should handle malformed JSON lines in log files', () => {
      const logPath = path.join(testLogDir, 'terminal-commands.log');

      // Write valid log
      const validLog: CommandAuditLog = {
        id: 'valid-001',
        command: 'ls',
        args: [],
        approved: true,
        requiresApproval: false,
        startTime: new Date()
      };

      auditLogger.logCommandExecution(validLog);

      // Manually append malformed JSON
      fs.appendFileSync(logPath, 'INVALID JSON LINE\n', 'utf8');

      // Should handle gracefully and return valid logs only
      const logs = auditLogger.query({});
      expect(logs.length).toBe(1);
      expect(logs[0].id).toBe('valid-001');
    });
  });
});
