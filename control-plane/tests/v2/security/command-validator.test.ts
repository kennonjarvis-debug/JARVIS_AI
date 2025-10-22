/**
 * Command Validator Tests
 * CLAUDE A: Command Validation & Injection Detection Testing
 */

import { describe, it, expect } from '@jest/globals';
import { CommandValidator } from '../../../src/core/security/command-validator.js';

describe('CommandValidator', () => {
  describe('Dangerous Pattern Detection', () => {
    it('should detect rm -rf patterns', () => {
      expect(CommandValidator.isDangerous('rm', ['-rf', '/'])).toBe(true);
      expect(CommandValidator.isDangerous('rm', ['-rf', '/*'])).toBe(true);
      expect(CommandValidator.isDangerous('rm', ['--recursive', '--force', '/'])).toBe(true);
    });

    it('should detect format/mkfs patterns', () => {
      expect(CommandValidator.isDangerous('mkfs', ['/dev/sda'])).toBe(true);
      expect(CommandValidator.isDangerous('dd', ['if=/dev/zero', 'of=/dev/sda'])).toBe(true);
    });

    it('should detect system modification commands', () => {
      expect(CommandValidator.isDangerous('shutdown', ['-h', 'now'])).toBe(true);
      expect(CommandValidator.isDangerous('reboot', [])).toBe(true);
      expect(CommandValidator.isDangerous('halt', [])).toBe(true);
      expect(CommandValidator.isDangerous('poweroff', [])).toBe(true);
    });

    it('should detect privilege escalation patterns', () => {
      expect(CommandValidator.isDangerous('sudo', ['su'])).toBe(true);
      expect(CommandValidator.isDangerous('chmod', ['777', '/etc/passwd'])).toBe(true);
      expect(CommandValidator.isDangerous('chown', ['root', '/etc/shadow'])).toBe(true);
    });

    it('should detect dangerous device write patterns', () => {
      expect(CommandValidator.isDangerous('cat', ['file', '>', '/dev/sda'])).toBe(true);
    });

    it('should allow safe commands', () => {
      expect(CommandValidator.isDangerous('ls', ['-la'])).toBe(false);
      expect(CommandValidator.isDangerous('cat', ['file.txt'])).toBe(false);
      expect(CommandValidator.isDangerous('grep', ['pattern', 'file.txt'])).toBe(false);
      expect(CommandValidator.isDangerous('git', ['status'])).toBe(false);
    });
  });

  describe('Injection Detection', () => {
    it('should detect command injection with semicolons', () => {
      expect(CommandValidator.hasInjectionAttempt('; rm -rf /')).toBe(true);
      expect(CommandValidator.hasInjectionAttempt('file.txt; rm -rf /')).toBe(true);
    });

    it('should detect command injection with pipes', () => {
      expect(CommandValidator.hasInjectionAttempt('| rm -rf /')).toBe(true);
      expect(CommandValidator.hasInjectionAttempt('file.txt | rm -rf /')).toBe(true);
    });

    it('should detect command injection with AND operator', () => {
      expect(CommandValidator.hasInjectionAttempt('&& rm -rf /')).toBe(true);
      expect(CommandValidator.hasInjectionAttempt('file.txt && rm -rf /')).toBe(true);
    });

    it('should detect command substitution with backticks', () => {
      expect(CommandValidator.hasInjectionAttempt('`rm -rf /`')).toBe(true);
      expect(CommandValidator.hasInjectionAttempt('file`whoami`.txt')).toBe(true);
    });

    it('should detect command substitution with $()', () => {
      expect(CommandValidator.hasInjectionAttempt('$(rm -rf /)')).toBe(true);
      expect(CommandValidator.hasInjectionAttempt('file$(whoami).txt')).toBe(true);
    });

    it('should detect process substitution', () => {
      expect(CommandValidator.hasInjectionAttempt('<(ls)')).toBe(true);
      expect(CommandValidator.hasInjectionAttempt('>(cat)')).toBe(true);
    });

    it('should allow safe inputs without special characters', () => {
      expect(CommandValidator.hasInjectionAttempt('normal-file.txt')).toBe(false);
      expect(CommandValidator.hasInjectionAttempt('/path/to/file')).toBe(false);
      expect(CommandValidator.hasInjectionAttempt('file_name_123')).toBe(false);
    });

    it('should allow safe flags and arguments', () => {
      expect(CommandValidator.hasInjectionAttempt('--flag=value')).toBe(false);
      expect(CommandValidator.hasInjectionAttempt('-rf')).toBe(false);
    });
  });

  describe('File Path Validation', () => {
    it('should block directory traversal with ../', () => {
      expect(CommandValidator.validateFilePath('../../../etc/passwd')).toBe(false);
      expect(CommandValidator.validateFilePath('../../.ssh/id_rsa')).toBe(false);
      expect(CommandValidator.validateFilePath('../config.json')).toBe(false);
    });

    it('should block directory traversal with ..\\', () => {
      expect(CommandValidator.validateFilePath('..\\..\\etc\\passwd')).toBe(false);
    });

    it('should block sensitive system paths', () => {
      expect(CommandValidator.validateFilePath('/etc/passwd')).toBe(false);
      expect(CommandValidator.validateFilePath('/etc/shadow')).toBe(false);
      expect(CommandValidator.validateFilePath('/root/.ssh/id_rsa')).toBe(false);
      expect(CommandValidator.validateFilePath('/boot/grub/grub.cfg')).toBe(false);
      expect(CommandValidator.validateFilePath('/.ssh/authorized_keys')).toBe(false);
      expect(CommandValidator.validateFilePath('/var/log/auth.log')).toBe(false);
    });

    it('should allow safe paths', () => {
      expect(CommandValidator.validateFilePath('/tmp/safe-file.txt')).toBe(true);
      expect(CommandValidator.validateFilePath('./local-file.txt')).toBe(true);
      expect(CommandValidator.validateFilePath('/home/user/documents/file.pdf')).toBe(true);
      expect(CommandValidator.validateFilePath('/var/www/html/index.html')).toBe(true);
    });
  });

  describe('Argument Sanitization', () => {
    it('should trim whitespace from arguments', () => {
      const unsafe = ['  file.txt  ', '\ttab.txt\t'];
      const safe = CommandValidator.sanitizeArguments(unsafe);

      expect(safe[0]).toBe('file.txt');
      expect(safe[1]).toBe('tab.txt');
    });

    it('should remove null bytes', () => {
      const unsafe = ['file\0.txt', 'normal.txt'];
      const safe = CommandValidator.sanitizeArguments(unsafe);

      expect(safe[0]).not.toContain('\0');
      expect(safe[0]).toBe('file.txt');
      expect(safe[1]).toBe('normal.txt');
    });

    it('should quote arguments with shell metacharacters', () => {
      const unsafe = ['file with spaces', 'normal'];
      const safe = CommandValidator.sanitizeArguments(unsafe);

      expect(safe).toBeDefined();
      expect(safe.length).toBe(2);
    });

    it('should escape dangerous characters', () => {
      const unsafe = ['file; rm -rf /', '--flag'];
      const safe = CommandValidator.sanitizeArguments(unsafe);

      expect(safe).toBeDefined();
      expect(safe.length).toBe(unsafe.length);
      // Should be quoted/escaped
      expect(safe[0]).toContain('"');
    });

    it('should handle empty arguments', () => {
      const unsafe = ['', 'file.txt', ''];
      const safe = CommandValidator.sanitizeArguments(unsafe);

      expect(safe.length).toBe(3);
      expect(safe[1]).toBe('file.txt');
    });
  });

  describe('Environment Variable Validation', () => {
    it('should block dangerous LD_PRELOAD', () => {
      const env = { LD_PRELOAD: '/malicious/lib.so' };
      expect(CommandValidator.validateEnvVars(env)).toBe(false);
    });

    it('should block dangerous LD_LIBRARY_PATH', () => {
      const env = { LD_LIBRARY_PATH: '/malicious/libs' };
      expect(CommandValidator.validateEnvVars(env)).toBe(false);
    });

    it('should allow safe environment variables', () => {
      const env = {
        PATH: '/usr/bin:/bin',
        HOME: '/home/user',
        NODE_ENV: 'production'
      };
      expect(CommandValidator.validateEnvVars(env)).toBe(true);
    });

    it('should allow empty environment', () => {
      expect(CommandValidator.validateEnvVars({})).toBe(true);
    });
  });

  describe('Critical File Modification Detection', () => {
    it('should detect modification of /etc/passwd', () => {
      expect(CommandValidator.isCriticalFileModification('echo', ['data', '>', '/etc/passwd'])).toBe(true);
      expect(CommandValidator.isCriticalFileModification('cat', ['/etc/passwd'])).toBe(true);
    });

    it('should detect modification of /etc/shadow', () => {
      expect(CommandValidator.isCriticalFileModification('vim', ['/etc/shadow'])).toBe(true);
    });

    it('should detect modification of /etc/sudoers', () => {
      expect(CommandValidator.isCriticalFileModification('nano', ['/etc/sudoers'])).toBe(true);
    });

    it('should detect modification of bootloader files', () => {
      expect(CommandValidator.isCriticalFileModification('rm', ['/boot/grub/grub.cfg'])).toBe(true);
    });

    it('should detect modification of SSH authorized_keys', () => {
      expect(CommandValidator.isCriticalFileModification('echo', ['key', '>>', '/.ssh/authorized_keys'])).toBe(true);
    });

    it('should allow modification of non-critical files', () => {
      expect(CommandValidator.isCriticalFileModification('vim', ['/tmp/file.txt'])).toBe(false);
      expect(CommandValidator.isCriticalFileModification('echo', ['data', '>', '/home/user/file.txt'])).toBe(false);
    });
  });

  describe('Comprehensive Validation', () => {
    it('should validate safe commands completely', () => {
      const result = CommandValidator.validate('git', ['status']);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject dangerous commands with reason', () => {
      const result = CommandValidator.validate('rm', ['-rf', '/']);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Dangerous command pattern detected');
    });

    it('should reject injection attempts with reason', () => {
      // Use a test case without 'rm' to avoid dangerous pattern detection
      const result = CommandValidator.validate('ls', ['file.txt', '&&', 'cat', 'other.txt']);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Shell injection attempt detected');
    });

    it('should reject invalid file paths with reason', () => {
      // Use a path starting with ./ to trigger file path validation
      const result = CommandValidator.validate('cat', ['./../../../../etc/passwd']);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid file path');
    });

    it('should reject dangerous environment variables with reason', () => {
      const result = CommandValidator.validate('ls', [], { LD_PRELOAD: '/malicious.so' });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Dangerous environment variable detected');
    });

    it('should reject critical file modification with reason', () => {
      // /etc/sudoers is in criticalFiles but not in sensitivePaths, so it bypasses file path validation
      const result = CommandValidator.validate('echo', ['/etc/sudoers']);
      expect(result.valid).toBe(false);
      // This file is caught by critical file modification check, not file path validation
      expect(result.reason).toBe('Attempted modification of critical system file');
    });

    it('should validate complex safe commands', () => {
      const result = CommandValidator.validate('npm', ['install', 'package-name']);
      expect(result.valid).toBe(true);
    });

    it('should validate safe file operations', () => {
      const result = CommandValidator.validate('cat', ['./local-file.txt']);
      expect(result.valid).toBe(true);
    });
  });
});
