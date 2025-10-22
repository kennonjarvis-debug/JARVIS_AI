/**
 * Terminal Firewall
 * Safe, whitelisted command execution with comprehensive audit logging
 */

import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import { CommandValidator } from './command-validator.js';
import { auditLogger } from './audit-logger.js';
import type {
  CommandRule,
  ExecutionOptions,
  CommandAuditLog,
  AuditFilter,
  FirewallStats,
  ApprovalRequest
} from './types.js';

export class TerminalFirewall {
  private rules: Map<string, CommandRule> = new Map();
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private executionHistory: CommandAuditLog[] = [];
  private readonly MAX_HISTORY = 1000;

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default whitelist rules
   */
  private initializeDefaultRules(): void {
    // Git commands - generally safe, auto-approve
    this.addRule({
      command: 'git',
      allowedArgs: [
        /^status$/,
        /^log/,
        /^diff/,
        /^show/,
        /^branch/,
        /^checkout/,
        /^pull/,
        /^fetch/,
        /^add/,
        /^commit/,
        /^push/,
        /^stash/,
        /^merge/,
        /^rebase/
      ],
      requiresApproval: false,
      maxTimeout: 60000, // 1 minute
      description: 'Git version control operations',
      clearanceLevel: 1
    });

    // NPM commands - package management
    this.addRule({
      command: 'npm',
      allowedArgs: [/^install$/, /^ci$/, /^run/, /^test$/, /^build$/],
      requiresApproval: process.env.TERMINAL_AUTO_APPROVE_NPM !== 'true',
      maxTimeout: 300000, // 5 minutes
      description: 'NPM package management',
      clearanceLevel: 1
    });

    // Node commands - safe execution
    this.addRule({
      command: 'node',
      requiresApproval: false,
      maxTimeout: 120000, // 2 minutes
      description: 'Node.js script execution',
      clearanceLevel: 1
    });

    // Docker commands - container management
    this.addRule({
      command: 'docker',
      allowedArgs: [
        /^ps$/,
        /^images$/,
        /^logs/,
        /^inspect/,
        /^build/,
        /^run/,
        /^stop/,
        /^start/,
        /^restart/
      ],
      blockedArgs: [/--privileged/, /--cap-add/],
      requiresApproval: process.env.TERMINAL_AUTO_APPROVE_DOCKER !== 'true',
      maxTimeout: 300000, // 5 minutes
      description: 'Docker container operations',
      clearanceLevel: 2
    });

    // Docker Compose
    this.addRule({
      command: 'docker-compose',
      allowedArgs: [/^up$/, /^down$/, /^ps$/, /^logs/, /^restart$/],
      requiresApproval: process.env.TERMINAL_AUTO_APPROVE_DOCKER !== 'true',
      maxTimeout: 300000, // 5 minutes
      description: 'Docker Compose orchestration',
      clearanceLevel: 2
    });

    // Kubernetes - requires approval (production operations)
    this.addRule({
      command: 'kubectl',
      allowedArgs: [
        /^get/,
        /^describe/,
        /^logs/,
        /^apply/,
        /^delete/,
        /^scale/,
        /^rollout/
      ],
      requiresApproval: process.env.TERMINAL_AUTO_APPROVE_KUBECTL !== 'false',
      maxTimeout: 300000, // 5 minutes
      description: 'Kubernetes cluster operations',
      clearanceLevel: 3
    });

    // Terraform - requires approval (infrastructure changes)
    this.addRule({
      command: 'terraform',
      allowedArgs: [/^plan$/, /^apply$/, /^destroy$/, /^init$/, /^validate$/],
      requiresApproval: process.env.TERMINAL_AUTO_APPROVE_TERRAFORM !== 'false',
      maxTimeout: 600000, // 10 minutes
      description: 'Infrastructure as Code operations',
      clearanceLevel: 3
    });

    // PM2 - process management
    this.addRule({
      command: 'pm2',
      allowedArgs: [/^start$/, /^stop$/, /^restart$/, /^list$/, /^logs/, /^status$/],
      requiresApproval: false,
      maxTimeout: 60000, // 1 minute
      description: 'Process management',
      clearanceLevel: 2
    });

    // AWS CLI - requires approval
    this.addRule({
      command: 'aws',
      requiresApproval: process.env.TERMINAL_AUTO_APPROVE_AWS !== 'false',
      maxTimeout: 300000, // 5 minutes
      description: 'AWS CLI operations',
      clearanceLevel: 3
    });

    // Curl - HTTP requests
    this.addRule({
      command: 'curl',
      blockedArgs: [/--upload-file/, /-T\s/, /file:\/\//],
      requiresApproval: false,
      maxTimeout: 30000, // 30 seconds
      description: 'HTTP client requests',
      clearanceLevel: 0
    });

    // System monitoring commands
    this.addRule({
      command: 'ps',
      requiresApproval: false,
      maxTimeout: 5000,
      description: 'Process status',
      clearanceLevel: 0
    });

    this.addRule({
      command: 'df',
      requiresApproval: false,
      maxTimeout: 5000,
      description: 'Disk space usage',
      clearanceLevel: 0
    });

    this.addRule({
      command: 'free',
      requiresApproval: false,
      maxTimeout: 5000,
      description: 'Memory usage',
      clearanceLevel: 0
    });

    logger.info(`[TerminalFirewall] Initialized with ${this.rules.size} whitelisted commands`);
  }

  /**
   * Add a command rule to the whitelist
   */
  addRule(rule: CommandRule): void {
    this.rules.set(rule.command, rule);
    logger.info(`[TerminalFirewall] Added rule for command: ${rule.command}`);
  }

  /**
   * Check if command is allowed
   */
  isAllowed(command: string, args: string[]): boolean {
    const rule = this.rules.get(command);
    if (!rule) {
      logger.warn(`[TerminalFirewall] Command not whitelisted: ${command}`);
      return false;
    }

    // Check allowed args
    if (rule.allowedArgs) {
      const argsStr = args.join(' ');
      const allowed = rule.allowedArgs.some(pattern => pattern.test(argsStr));
      if (!allowed) {
        logger.warn(`[TerminalFirewall] Args not allowed for ${command}: ${argsStr}`);
        return false;
      }
    }

    // Check blocked args
    if (rule.blockedArgs) {
      const argsStr = args.join(' ');
      const blocked = rule.blockedArgs.some(pattern => pattern.test(argsStr));
      if (blocked) {
        logger.warn(`[TerminalFirewall] Blocked args detected for ${command}: ${argsStr}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Execute command with security checks
   */
  async execute(
    command: string,
    args: string[],
    options: ExecutionOptions = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const startTime = new Date();
    const logId = `cmd_${uuidv4()}`;

    // Initialize audit log
    const auditLog: CommandAuditLog = {
      id: logId,
      command,
      args,
      user: options.user,
      approved: false,
      requiresApproval: false,
      startTime,
      cwd: options.cwd
    };

    try {
      // Step 1: Check if command is whitelisted
      if (!this.isAllowed(command, args)) {
        auditLog.blocked = true;
        auditLog.blockReason = 'Command not whitelisted or args not allowed';
        this.recordExecution(auditLog);
        throw new Error(`Command not whitelisted: ${command}`);
      }

      // Step 2: Validate command safety
      const validation = CommandValidator.validate(command, args, options.env);
      if (!validation.valid) {
        auditLog.blocked = true;
        auditLog.blockReason = validation.reason;
        this.recordExecution(auditLog);
        throw new Error(`Command validation failed: ${validation.reason}`);
      }

      // Step 3: Check if approval is required
      const rule = this.rules.get(command)!;
      auditLog.requiresApproval = rule.requiresApproval || false;

      if (rule.requiresApproval && !options.requireApproval) {
        // Create approval request
        const approvalId = await this.requestApproval(command, args, options.user);
        auditLog.blocked = true;
        auditLog.blockReason = `Requires approval (request ID: ${approvalId})`;
        this.recordExecution(auditLog);
        throw new Error(`Command requires approval. Request ID: ${approvalId}`);
      }

      // Step 4: Sanitize arguments
      const sanitizedArgs = CommandValidator.sanitizeArguments(args);

      // Step 5: Execute command
      const timeout = options.timeout || rule.maxTimeout || 60000;
      const result = await this.executeCommand(command, sanitizedArgs, {
        cwd: options.cwd,
        env: options.env,
        timeout
      });

      // Step 6: Record successful execution
      auditLog.approved = true;
      auditLog.endTime = new Date();
      auditLog.duration = auditLog.endTime.getTime() - startTime.getTime();
      auditLog.exitCode = result.exitCode;
      auditLog.stdout = result.stdout;
      auditLog.stderr = result.stderr;

      this.recordExecution(auditLog);

      return result;
    } catch (error: any) {
      // Record failed execution
      auditLog.endTime = new Date();
      auditLog.duration = auditLog.endTime.getTime() - startTime.getTime();
      auditLog.error = error.message;

      this.recordExecution(auditLog);

      throw error;
    }
  }

  /**
   * Execute command using child_process.spawn
   */
  private executeCommand(
    command: string,
    args: string[],
    options: {
      cwd?: string;
      env?: Record<string, string>;
      timeout: number;
    }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const child = spawn(command, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        shell: false // Important: disable shell to prevent injection
      });

      // Capture stdout
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Capture stderr
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      child.on('close', (exitCode) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        resolve({ stdout, stderr, exitCode: exitCode || 0 });
      });

      // Handle errors
      child.on('error', (error) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        reject(error);
      });

      // Timeout handler
      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000); // Force kill after 5s

        reject(new Error(`Command timeout after ${options.timeout}ms`));
      }, options.timeout);
    });
  }

  /**
   * Request approval for command execution
   */
  private async requestApproval(command: string, args: string[], user?: string): Promise<string> {
    const approvalId = `approval_${uuidv4()}`;
    const request: ApprovalRequest = {
      id: approvalId,
      command,
      args,
      user,
      reason: 'High-risk command requires manual approval',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      status: 'pending'
    };

    this.pendingApprovals.set(approvalId, request);
    logger.info(`[TerminalFirewall] Approval requested: ${approvalId} for ${command}`);

    return approvalId;
  }

  /**
   * Approve pending command
   */
  approveCommand(approvalId: string, approver: string): boolean {
    const request = this.pendingApprovals.get(approvalId);
    if (!request) {
      logger.warn(`[TerminalFirewall] Approval request not found: ${approvalId}`);
      return false;
    }

    if (request.status !== 'pending') {
      logger.warn(`[TerminalFirewall] Approval request already processed: ${approvalId}`);
      return false;
    }

    if (new Date() > request.expiresAt) {
      request.status = 'expired';
      logger.warn(`[TerminalFirewall] Approval request expired: ${approvalId}`);
      return false;
    }

    request.status = 'approved';
    auditLogger.logApprovalDecision({
      id: `dec_${uuidv4()}`,
      requestId: approvalId,
      command: request.command,
      approver,
      decision: 'approved',
      timestamp: new Date()
    });

    logger.info(`[TerminalFirewall] Command approved: ${approvalId} by ${approver}`);
    return true;
  }

  /**
   * Record execution in history and audit log
   */
  private recordExecution(log: CommandAuditLog): void {
    // Add to in-memory history
    this.executionHistory.push(log);
    if (this.executionHistory.length > this.MAX_HISTORY) {
      this.executionHistory.shift();
    }

    // Write to audit log
    auditLogger.logCommandExecution(log);
  }

  /**
   * Get audit logs with optional filtering
   */
  getAuditLogs(filter?: AuditFilter): CommandAuditLog[] {
    if (filter) {
      return auditLogger.query(filter);
    }

    return this.executionHistory.slice(-100); // Return last 100 from memory
  }

  /**
   * Get firewall statistics
   */
  getStats(): FirewallStats {
    const logs = this.executionHistory;

    if (logs.length === 0) {
      return {
        totalExecutions: 0,
        blockedCommands: 0,
        approvedCommands: 0,
        failedCommands: 0,
        averageExecutionTime: 0,
        commandBreakdown: {},
        blockReasons: {}
      };
    }

    const commandBreakdown: Record<string, number> = {};
    const blockReasons: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;

    for (const log of logs) {
      // Command breakdown
      commandBreakdown[log.command] = (commandBreakdown[log.command] || 0) + 1;

      // Block reasons
      if (log.blocked && log.blockReason) {
        blockReasons[log.blockReason] = (blockReasons[log.blockReason] || 0) + 1;
      }

      // Average execution time
      if (log.duration) {
        totalDuration += log.duration;
        durationCount++;
      }
    }

    return {
      totalExecutions: logs.length,
      blockedCommands: logs.filter(l => l.blocked).length,
      approvedCommands: logs.filter(l => l.approved).length,
      failedCommands: logs.filter(l => l.exitCode && l.exitCode !== 0).length,
      averageExecutionTime: durationCount > 0 ? totalDuration / durationCount : 0,
      commandBreakdown,
      blockReasons
    };
  }

  /**
   * Export whitelist rules
   */
  exportWhitelist(): CommandRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get pending approval requests
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values()).filter(r => r.status === 'pending');
  }
}

// Singleton instance
export const terminalFirewall = new TerminalFirewall();
