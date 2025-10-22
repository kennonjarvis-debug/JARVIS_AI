/**
 * Approval queue type definitions
 * @module types/approvals
 */

import { z } from 'zod';
import { TaskType, TaskTypeSchema } from './tasks';
import { RiskLevel, RiskLevelSchema } from './decisions';

/**
 * Approval request for human review
 */
export interface ApprovalRequest {
  /** Unique approval request identifier */
  id: string;
  /** Task ID requiring approval */
  taskId: string;
  /** Type of task */
  taskType: TaskType;
  /** Requested action description */
  requestedAction: string;
  /** Reasoning for the request */
  reasoning: string;
  /** Risk level assessment */
  riskLevel: RiskLevel;
  /** Estimated impact of the action */
  estimatedImpact: {
    /** Financial impact in USD */
    financial?: number;
    /** Human-readable impact description */
    description: string;
  };
  /** Alternative approaches to consider */
  alternatives?: Array<{
    /** Alternative action description */
    action: string;
    /** Reasoning for this alternative */
    reasoning: string;
  }>;
  /** When the request was created */
  requestedAt: Date;
  /** When the request expires (auto-reject after) */
  expiresAt?: Date;
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Zod schema for ApprovalRequest
 */
export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  taskType: TaskTypeSchema,
  requestedAction: z.string().min(1),
  reasoning: z.string().min(1),
  riskLevel: RiskLevelSchema,
  estimatedImpact: z.object({
    financial: z.number().optional(),
    description: z.string().min(1),
  }),
  alternatives: z
    .array(
      z.object({
        action: z.string().min(1),
        reasoning: z.string().min(1),
      })
    )
    .optional(),
  requestedAt: z.date(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.any()),
});

/**
 * Approval decision type
 */
export type ApprovalDecision = 'approved' | 'rejected' | 'modified';

/**
 * Zod schema for ApprovalDecision
 */
export const ApprovalDecisionSchema = z.enum(['approved', 'rejected', 'modified']);

/**
 * Response to an approval request
 */
export interface ApprovalResponse {
  /** Approval request ID */
  requestId: string;
  /** Decision made */
  decision: ApprovalDecision;
  /** Who responded to the request */
  respondedBy: string;
  /** When the response was submitted */
  respondedAt: Date;
  /** Optional feedback on the decision */
  feedback?: string;
  /** Modifications to the requested action (if decision is 'modified') */
  modifications?: Record<string, any>;
}

/**
 * Zod schema for ApprovalResponse
 */
export const ApprovalResponseSchema = z.object({
  requestId: z.string().uuid(),
  decision: ApprovalDecisionSchema,
  respondedBy: z.string().min(1),
  respondedAt: z.date(),
  feedback: z.string().optional(),
  modifications: z.record(z.any()).optional(),
});

/**
 * Notification channel type
 */
export type NotificationChannelType = 'email' | 'slack' | 'discord' | 'webhook';

/**
 * Zod schema for NotificationChannelType
 */
export const NotificationChannelTypeSchema = z.enum(['email', 'slack', 'discord', 'webhook']);

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  /** Type of notification channel */
  type: NotificationChannelType;
  /** Channel-specific configuration */
  config: Record<string, any>;
  /** Whether this channel is enabled */
  enabled?: boolean;
  /** Priority for this channel (lower = higher priority) */
  priority?: number;
}

/**
 * Zod schema for NotificationChannel
 */
export const NotificationChannelSchema = z.object({
  type: NotificationChannelTypeSchema,
  config: z.record(z.any()),
  enabled: z.boolean().default(true),
  priority: z.number().int().nonnegative().default(100),
});

/**
 * Email notification configuration
 */
export interface EmailNotificationConfig {
  /** Recipient email address */
  to: string;
  /** CC email addresses */
  cc?: string[];
  /** Template to use for the email */
  template?: string;
  /** Whether to include full task context */
  includeFullContext?: boolean;
}

/**
 * Zod schema for EmailNotificationConfig
 */
export const EmailNotificationConfigSchema = z.object({
  to: z.string().email(),
  cc: z.array(z.string().email()).optional(),
  template: z.string().optional(),
  includeFullContext: z.boolean().default(true),
});

/**
 * Discord webhook notification configuration
 */
export interface DiscordNotificationConfig {
  /** Discord webhook URL */
  webhookUrl: string;
  /** Username to display */
  username?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Whether to mention @everyone */
  mentionEveryone?: boolean;
}

/**
 * Zod schema for DiscordNotificationConfig
 */
export const DiscordNotificationConfigSchema = z.object({
  webhookUrl: z.string().url(),
  username: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  mentionEveryone: z.boolean().default(false),
});

/**
 * Webhook notification configuration
 */
export interface WebhookNotificationConfig {
  /** Webhook URL */
  url: string;
  /** HTTP method */
  method?: 'POST' | 'PUT';
  /** Custom headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Zod schema for WebhookNotificationConfig
 */
export const WebhookNotificationConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['POST', 'PUT']).default('POST'),
  headers: z.record(z.string()).optional(),
  timeout: z.number().int().positive().default(30000),
});

/**
 * Approval queue status
 */
export interface ApprovalQueueStatus {
  /** Number of pending approvals */
  pendingCount: number;
  /** Oldest pending request timestamp */
  oldestRequest?: Date;
  /** Number of expired requests */
  expiredCount: number;
  /** Average response time in milliseconds */
  avgResponseTime?: number;
}

/**
 * Zod schema for ApprovalQueueStatus
 */
export const ApprovalQueueStatusSchema = z.object({
  pendingCount: z.number().nonnegative(),
  oldestRequest: z.date().optional(),
  expiredCount: z.number().nonnegative(),
  avgResponseTime: z.number().nonnegative().optional(),
});

/**
 * Combined approval request and response
 */
export type ApprovalRecord = ApprovalRequest & Partial<ApprovalResponse>;

/**
 * Approval history filter options
 */
export interface ApprovalHistoryFilter {
  /** Filter by task type */
  taskType?: TaskType;
  /** Filter by decision */
  decision?: ApprovalDecision;
  /** Only show approvals after this date */
  since?: Date;
  /** Only show approvals before this date */
  until?: Date;
  /** Filter by risk level */
  riskLevel?: RiskLevel;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Zod schema for ApprovalHistoryFilter
 */
export const ApprovalHistoryFilterSchema = z.object({
  taskType: TaskTypeSchema.optional(),
  decision: ApprovalDecisionSchema.optional(),
  since: z.date().optional(),
  until: z.date().optional(),
  riskLevel: RiskLevelSchema.optional(),
  limit: z.number().int().positive().optional(),
});

/**
 * Type guard to check if a value is a valid ApprovalDecision
 */
export function isApprovalDecision(value: any): value is ApprovalDecision {
  return ['approved', 'rejected', 'modified'].includes(value);
}

/**
 * Type guard to check if a value is a valid NotificationChannelType
 */
export function isNotificationChannelType(value: any): value is NotificationChannelType {
  return ['email', 'slack', 'discord', 'webhook'].includes(value);
}

/**
 * Helper to validate approval request at runtime
 */
export function validateApprovalRequest(data: unknown): ApprovalRequest {
  return ApprovalRequestSchema.parse(data);
}

/**
 * Helper to validate approval response at runtime
 */
export function validateApprovalResponse(data: unknown): ApprovalResponse {
  return ApprovalResponseSchema.parse(data);
}

/**
 * Helper to check if an approval has expired
 */
export function isApprovalExpired(request: ApprovalRequest): boolean {
  if (!request.expiresAt) return false;
  return new Date() > request.expiresAt;
}

/**
 * Helper to calculate time until approval expires
 */
export function getTimeUntilExpiration(request: ApprovalRequest): number | null {
  if (!request.expiresAt) return null;
  const now = new Date().getTime();
  const expiresAt = request.expiresAt.getTime();
  return Math.max(0, expiresAt - now);
}
