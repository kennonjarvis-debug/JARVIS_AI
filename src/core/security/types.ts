/**
 * Terminal Firewall Type Definitions
 */

export interface CommandRule {
  command: string;
  allowedArgs?: RegExp[];
  blockedArgs?: RegExp[];
  requiresApproval?: boolean;
  maxTimeout?: number; // milliseconds
  description?: string;
  clearanceLevel?: number; // 0-4 (READ_ONLY to MODIFY_PRODUCTION)
}

export interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  user?: string;
  timeout?: number;
  requireApproval?: boolean;
}

export interface CommandAuditLog {
  id: string;
  command: string;
  args: string[];
  user?: string;
  approved: boolean;
  requiresApproval: boolean;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  exitCode?: number;
  stdout?: string; // truncated to 5KB
  stderr?: string; // truncated to 5KB
  error?: string;
  cwd?: string;
  blocked?: boolean;
  blockReason?: string;
}

export interface AuditFilter {
  command?: string;
  user?: string;
  approved?: boolean;
  blocked?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface FirewallStats {
  totalExecutions: number;
  blockedCommands: number;
  approvedCommands: number;
  failedCommands: number;
  averageExecutionTime: number;
  commandBreakdown: Record<string, number>;
  blockReasons: Record<string, number>;
}

export interface ApprovalRequest {
  id: string;
  command: string;
  args: string[];
  user?: string;
  reason: string;
  requestedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}
