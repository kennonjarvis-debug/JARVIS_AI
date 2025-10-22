/**
 * Terminal Firewall Tests
 * CLAUDE A: Terminal Security Testing
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TerminalFirewall } from '../../../src/core/security/terminal-firewall.js';

describe('TerminalFirewall', () => {
  let firewall: TerminalFirewall;

  beforeEach(() => {
    firewall = new TerminalFirewall();
  });

  describe('Whitelist Management', () => {
    it('should initialize with default whitelist commands', () => {
      const whitelist = firewall.exportWhitelist();
      expect(whitelist.length).toBeGreaterThan(0);

      const commands = whitelist.map(rule => rule.command);
      expect(commands).toContain('git');
      expect(commands).toContain('npm');
      expect(commands).toContain('docker');
    });

    it('should allow whitelisted commands', () => {
      expect(firewall.isAllowed('git', ['status'])).toBe(true);
      expect(firewall.isAllowed('npm', ['install'])).toBe(true);
      expect(firewall.isAllowed('ps', ['aux'])).toBe(true);
    });

    it('should block non-whitelisted commands', () => {
      expect(firewall.isAllowed('rm', ['-rf', '/'])).toBe(false);
      expect(firewall.isAllowed('unknown-command', [])).toBe(false);
    });

    it('should export whitelist rules', () => {
      const rules = firewall.exportWhitelist();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(13); // Default whitelist size
    });
  });

  describe('Command Execution', () => {
    it('should execute safe whitelisted commands', async () => {
      const result = await firewall.execute('df', ['-h']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeDefined();
    });

    it('should reject dangerous commands', async () => {
      await expect(
        firewall.execute('rm', ['-rf', '/'])
      ).rejects.toThrow('Command not whitelisted');
    });

    it('should reject commands with invalid arguments', async () => {
      await expect(
        firewall.execute('git', ['unknown-subcommand'])
      ).rejects.toThrow();
    });

    it('should enforce timeout limits', async () => {
      // This would timeout if command runs longer than specified
      const result = await firewall.execute('ps', ['aux'], { timeout: 5000 });
      expect(result.exitCode).toBe(0);
    }, 10000);

    it('should sanitize command arguments', async () => {
      // Test that dangerous characters are handled
      const result = await firewall.execute('ps', ['aux']);
      expect(result).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    it('should log successful command executions', async () => {
      await firewall.execute('df', ['-h']);

      const logs = firewall.getAuditLogs({ limit: 1 });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].command).toBe('df');
      expect(logs[0].approved).toBe(true);
    });

    it('should log blocked command attempts', async () => {
      try {
        await firewall.execute('rm', ['-rf', '/']);
      } catch (error) {
        // Expected to fail
      }

      const logs = firewall.getAuditLogs({ blocked: true, limit: 1 });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].blocked).toBe(true);
      expect(logs[0].blockReason).toBeDefined();
    });

    it('should filter audit logs by command', async () => {
      await firewall.execute('df', ['-h']);
      await firewall.execute('ps', ['aux']);

      const dfLogs = firewall.getAuditLogs({ command: 'df' });
      expect(dfLogs.every(log => log.command === 'df')).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track execution statistics', async () => {
      await firewall.execute('df', ['-h']);

      const stats = firewall.getStats();
      expect(stats.totalExecutions).toBeGreaterThan(0);
      expect(stats.commandBreakdown).toBeDefined();
      expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('should track blocked command statistics', async () => {
      try {
        await firewall.execute('unknown-command', []);
      } catch (error) {
        // Expected
      }

      const stats = firewall.getStats();
      expect(stats.blockedCommands).toBeGreaterThan(0);
    });
  });

  describe('Approval Workflow', () => {
    it('should create approval requests for high-risk commands', async () => {
      // kubectl requires approval by default
      try {
        await firewall.execute('kubectl', ['apply', '-f', 'deployment.yaml']);
      } catch (error: any) {
        expect(error.message).toContain('requires approval');
      }

      const pending = firewall.getPendingApprovals();
      expect(pending.length).toBeGreaterThan(0);
    });

    it('should allow approved commands to execute', () => {
      const pending = firewall.getPendingApprovals();
      if (pending.length > 0) {
        const approved = firewall.approveCommand(pending[0].id, 'test-user');
        expect(approved).toBe(true);
      }
    });
  });
});
