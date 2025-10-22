/**
 * Command Validator
 * Validates commands against security patterns and detects dangerous operations
 */

import { logger } from '../../utils/logger.js';

export class CommandValidator {
  /**
   * Dangerous command patterns that should always be blocked
   */
  private static readonly DANGEROUS_PATTERNS = [
    // Destructive file operations
    /rm\s+(-rf|--recursive\s+--force|--force\s+--recursive)/,
    /rm\s+.*\/\*/,
    /dd\s+if=/,
    /mkfs/,
    /format\s+[a-z]:/i,

    // System modification
    /shutdown/,
    /reboot/,
    /halt/,
    /poweroff/,

    // Privilege escalation
    /sudo\s+su/,
    /chmod\s+777/,
    /chown\s+root/,

    // Network attacks
    /:(){ :|:& };:/,  // Fork bomb
    /while true.*do/,  // Infinite loop
    />\s*\/dev\/sd[a-z]/,  // Direct device write
  ];

  /**
   * Shell injection patterns
   */
  private static readonly INJECTION_PATTERNS = [
    /;\s*rm/,
    /\|\s*rm/,
    /&&\s*rm/,
    /`.*`/,  // Command substitution
    /\$\(.*\)/,  // Command substitution
    /<\(.*\)/,  // Process substitution
    />\(.*\)/,  // Process substitution
  ];

  /**
   * Check if command/args contain dangerous patterns
   */
  static isDangerous(command: string, args: string[]): boolean {
    const fullCommand = `${command} ${args.join(' ')}`;

    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(fullCommand)) {
        logger.warn(`Dangerous pattern detected: ${pattern.source}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Detect shell injection attempts
   */
  static hasInjectionAttempt(input: string): boolean {
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        logger.warn(`Injection attempt detected: ${pattern.source}`);
        return true;
      }
    }

    // Check for suspicious characters
    if (/[;&|`$()<>]/.test(input) && !/^[a-zA-Z0-9\s\-_./=]+$/.test(input)) {
      logger.warn('Suspicious characters detected in input');
      return true;
    }

    return false;
  }

  /**
   * Validate file path (prevent directory traversal)
   */
  static validateFilePath(path: string): boolean {
    // Block directory traversal
    if (path.includes('../') || path.includes('..\\')) {
      logger.warn('Directory traversal attempt detected');
      return false;
    }

    // Block absolute paths to sensitive directories
    const sensitivePaths = [
      '/etc/passwd',
      '/etc/shadow',
      '/root/',
      '/boot/',
      '/.ssh/',
      '/var/log/auth',
    ];

    for (const sensitive of sensitivePaths) {
      if (path.startsWith(sensitive) || path.includes(sensitive)) {
        logger.warn(`Access to sensitive path blocked: ${sensitive}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize command arguments
   */
  static sanitizeArguments(args: string[]): string[] {
    return args.map(arg => {
      // Remove leading/trailing whitespace
      arg = arg.trim();

      // Remove null bytes
      arg = arg.replace(/\0/g, '');

      // Escape special shell characters if present
      if (/[;&|`$()<>]/.test(arg)) {
        // If arg contains shell metacharacters, quote it
        arg = `"${arg.replace(/"/g, '\\"')}"`;
      }

      return arg;
    });
  }

  /**
   * Validate environment variables
   */
  static validateEnvVars(env: Record<string, string>): boolean {
    const dangerousEnvVars = ['LD_PRELOAD', 'LD_LIBRARY_PATH'];

    for (const key of dangerousEnvVars) {
      if (env.hasOwnProperty(key)) {
        logger.warn(`Dangerous environment variable blocked: ${key}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Check if command is attempting to modify critical files
   */
  static isCriticalFileModification(command: string, args: string[]): boolean {
    const criticalFiles = [
      '/etc/passwd',
      '/etc/shadow',
      '/etc/sudoers',
      '/boot/grub',
      '/.ssh/authorized_keys',
    ];

    const fullCommand = `${command} ${args.join(' ')}`;

    for (const file of criticalFiles) {
      if (fullCommand.includes(file)) {
        logger.warn(`Attempted modification of critical file: ${file}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Comprehensive validation
   */
  static validate(command: string, args: string[], env?: Record<string, string>): {
    valid: boolean;
    reason?: string;
  } {
    // Check for dangerous patterns
    if (this.isDangerous(command, args)) {
      return { valid: false, reason: 'Dangerous command pattern detected' };
    }

    // Check for injection attempts
    const fullCommand = `${command} ${args.join(' ')}`;
    if (this.hasInjectionAttempt(fullCommand)) {
      return { valid: false, reason: 'Shell injection attempt detected' };
    }

    // Validate file paths in arguments
    for (const arg of args) {
      if (arg.startsWith('/') || arg.startsWith('./')) {
        if (!this.validateFilePath(arg)) {
          return { valid: false, reason: `Invalid file path: ${arg}` };
        }
      }
    }

    // Validate environment variables
    if (env && !this.validateEnvVars(env)) {
      return { valid: false, reason: 'Dangerous environment variable detected' };
    }

    // Check for critical file modification
    if (this.isCriticalFileModification(command, args)) {
      return { valid: false, reason: 'Attempted modification of critical system file' };
    }

    return { valid: true };
  }
}
