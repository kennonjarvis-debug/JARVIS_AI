/**
 * Task-related type definitions and validation schemas
 * @module types/tasks
 */

import { z } from 'zod';

/**
 * Task types organized by domain
 */
export enum TaskType {
  // Marketing tasks
  MARKETING_SOCIAL_POST = 'marketing.social.post',
  MARKETING_CONTENT_CREATE = 'marketing.content.create',
  MARKETING_EMAIL_CAMPAIGN = 'marketing.email.campaign',

  // Sales tasks
  SALES_LEAD_QUALIFY = 'sales.lead.qualify',
  SALES_OUTREACH = 'sales.outreach',
  SALES_FOLLOW_UP = 'sales.follow_up',

  // Operations tasks
  OPS_DATA_SYNC = 'ops.data.sync',
  OPS_ANALYTICS = 'ops.analytics',
  OPS_MONITORING = 'ops.monitoring',

  // Support tasks
  SUPPORT_TICKET_RESPOND = 'support.ticket.respond',
  SUPPORT_TICKET_ROUTE = 'support.ticket.route',
  SUPPORT_KB_UPDATE = 'support.kb.update',
}

/**
 * Task priority levels
 * Lower numbers indicate higher priority
 */
export enum Priority {
  /** Handle immediately - security, outages */
  CRITICAL = 0,
  /** Handle within 5 minutes - support tickets, hot leads */
  HIGH = 1,
  /** Handle within 1 hour - scheduled posts, analytics */
  MEDIUM = 2,
  /** Handle within 24 hours - KB updates, reports */
  LOW = 3,
}

/**
 * Zod schema for TaskType enum
 */
export const TaskTypeSchema = z.nativeEnum(TaskType);

/**
 * Zod schema for Priority enum
 */
export const PrioritySchema = z.nativeEnum(Priority);

/**
 * Task request submitted to the orchestrator
 */
export interface TaskRequest {
  /** Unique task identifier (UUID) */
  id: string;
  /** Type of task to execute */
  type: TaskType;
  /** Task priority level */
  priority: Priority;
  /** Task-specific data payload */
  data: Record<string, any>;
  /** Identifier of the entity requesting the task */
  requestedBy: string;
  /** When the task was submitted */
  timestamp: Date;
  /** Optional metadata for tracking and context */
  metadata?: Record<string, any>;
}

/**
 * Zod schema for TaskRequest validation
 */
export const TaskRequestSchema = z.object({
  id: z.string().uuid('Task ID must be a valid UUID'),
  type: TaskTypeSchema,
  priority: PrioritySchema,
  data: z.record(z.any()),
  requestedBy: z.string().min(1, 'requestedBy is required'),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Task execution result
 */
export interface TaskResult {
  /** ID of the task that was executed */
  taskId: string;
  /** Whether the task succeeded */
  success: boolean;
  /** Final status of the task */
  status: 'completed' | 'failed' | 'pending_approval' | 'in_progress';
  /** Result data if completed successfully */
  data?: any;
  /** Result data (alternative field name) */
  result?: any;
  /** Error information if failed */
  error?: Error;
  /** When the task completed or failed */
  timestamp: Date;
  /** ID of the agent that executed the task */
  executedBy: string;
  /** ID of the agent that executed the task (alternative field name) */
  agentId?: string;
  /** Optional message about the result */
  message?: string;
}

/**
 * Zod schema for TaskResult validation
 */
export const TaskResultSchema = z.object({
  taskId: z.string().uuid(),
  success: z.boolean(),
  status: z.enum(['completed', 'failed', 'pending_approval', 'in_progress']),
  data: z.any().optional(),
  result: z.any().optional(),
  error: z.instanceof(Error).optional(),
  timestamp: z.date(),
  executedBy: z.string().min(1),
  agentId: z.string().min(1).optional(),
  message: z.string().optional(),
});

/**
 * Type guard to check if a value is a valid TaskType
 */
export function isTaskType(value: any): value is TaskType {
  return Object.values(TaskType).includes(value);
}

/**
 * Type guard to check if a value is a valid Priority
 */
export function isPriority(value: any): value is Priority {
  return Object.values(Priority).includes(value);
}

/**
 * Helper to get task type category (marketing, sales, ops, support)
 */
export function getTaskCategory(taskType: TaskType): string {
  return taskType.split('.')[0];
}

/**
 * Helper to validate task request at runtime
 */
export function validateTaskRequest(data: unknown): TaskRequest {
  return TaskRequestSchema.parse(data);
}

/**
 * Helper to validate task result at runtime
 */
export function validateTaskResult(data: unknown): TaskResult {
  return TaskResultSchema.parse(data);
}
