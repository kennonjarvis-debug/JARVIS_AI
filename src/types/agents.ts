/**
 * Agent-related type definitions
 * @module types/agents
 */

import { z } from 'zod';
import { TaskType, TaskTypeSchema } from './tasks';

/**
 * Capability that an agent can perform
 */
export interface AgentCapability {
  /** Task type this capability handles */
  taskType: TaskType;
  /** Human-readable description of the capability */
  description: string;
  /** Estimated time to complete in milliseconds */
  estimatedDuration?: number;
  /** Integration names required for this capability */
  requiredIntegrations: string[];
}

/**
 * Zod schema for AgentCapability
 */
export const AgentCapabilitySchema = z.object({
  taskType: TaskTypeSchema,
  description: z.string().min(1, 'Description is required'),
  estimatedDuration: z.number().positive().optional(),
  requiredIntegrations: z.array(z.string()),
});

/**
 * Configuration for an agent instance
 */
export interface AgentConfig {
  /** Unique agent identifier */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** List of capabilities this agent provides */
  capabilities?: AgentCapability[];
  /** Integration adapters available to this agent */
  integrations: Record<string, any>;
  /** Anthropic API client for LLM operations */
  anthropicClient?: any;
  /** Decision engine instance */
  decisionEngine?: any;
  /** Memory system instance */
  memory?: any;
  /** Approval queue instance */
  approvalQueue?: any;
}

/**
 * Zod schema for AgentConfig
 */
export const AgentConfigSchema = z.object({
  id: z.string().min(1, 'Agent ID is required'),
  name: z.string().min(1, 'Agent name is required'),
  capabilities: z.array(AgentCapabilitySchema),
  integrations: z.record(z.any()),
  llmClient: z.any(),
  decisionEngine: z.any(),
  memory: z.any(),
});

/**
 * Agent status information
 */
export interface AgentStatus {
  /** Agent identifier */
  id: string;
  /** Agent name */
  name: string;
  /** Number of currently executing tasks */
  activeTasks: number;
  /** Agent capabilities */
  capabilities: AgentCapability[];
  /** Whether the agent is healthy and operational */
  isHealthy: boolean;
  /** Optional status message */
  statusMessage?: string;
  /** Last health check timestamp */
  lastHealthCheck?: Date;
}

/**
 * Zod schema for AgentStatus
 */
export const AgentStatusSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  activeTasks: z.number().nonnegative(),
  capabilities: z.array(AgentCapabilitySchema),
  isHealthy: z.boolean(),
  statusMessage: z.string().optional(),
  lastHealthCheck: z.date().optional(),
});

/**
 * Agent health check result
 */
export interface AgentHealthCheck {
  /** Agent identifier */
  agentId: string;
  /** Whether the agent passed health check */
  healthy: boolean;
  /** Timestamp of the health check */
  timestamp: Date;
  /** Details about the health check */
  details: {
    /** Whether integrations are accessible */
    integrationsHealthy: boolean;
    /** Whether LLM client is working */
    llmHealthy: boolean;
    /** Whether memory system is accessible */
    memoryHealthy: boolean;
    /** Additional diagnostic information */
    diagnostics?: Record<string, any>;
  };
  /** Error message if unhealthy */
  error?: string;
}

/**
 * Zod schema for AgentHealthCheck
 */
export const AgentHealthCheckSchema = z.object({
  agentId: z.string().min(1),
  healthy: z.boolean(),
  timestamp: z.date(),
  details: z.object({
    integrationsHealthy: z.boolean(),
    llmHealthy: z.boolean(),
    memoryHealthy: z.boolean(),
    diagnostics: z.record(z.any()).optional(),
  }),
  error: z.string().optional(),
});

/**
 * Agent lifecycle states
 */
export enum AgentLifecycleState {
  /** Agent is being initialized */
  INITIALIZING = 'initializing',
  /** Agent is ready to accept tasks */
  READY = 'ready',
  /** Agent is executing a task */
  BUSY = 'busy',
  /** Agent is paused and not accepting new tasks */
  PAUSED = 'paused',
  /** Agent encountered an error and needs attention */
  ERROR = 'error',
  /** Agent is shutting down */
  SHUTTING_DOWN = 'shutting_down',
  /** Agent has been shut down */
  STOPPED = 'stopped',
}

/**
 * Zod schema for AgentLifecycleState
 */
export const AgentLifecycleStateSchema = z.nativeEnum(AgentLifecycleState);

/**
 * Agent performance metrics
 */
export interface AgentMetrics {
  /** Agent identifier */
  agentId: string;
  /** Total tasks completed */
  tasksCompleted: number;
  /** Total tasks failed */
  tasksFailed: number;
  /** Average task execution time in milliseconds */
  avgExecutionTime: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Time period for these metrics */
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Zod schema for AgentMetrics
 */
export const AgentMetricsSchema = z.object({
  agentId: z.string().min(1),
  tasksCompleted: z.number().nonnegative(),
  tasksFailed: z.number().nonnegative(),
  avgExecutionTime: z.number().nonnegative(),
  successRate: z.number().min(0).max(1),
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
});

/**
 * Type guard to check if agent is in operational state
 */
export function isAgentOperational(state: AgentLifecycleState): boolean {
  return state === AgentLifecycleState.READY || state === AgentLifecycleState.BUSY;
}

/**
 * Helper to validate agent config at runtime
 */
export function validateAgentConfig(data: unknown): AgentConfig {
  return AgentConfigSchema.parse(data) as AgentConfig;
}

/**
 * Helper to validate agent status at runtime
 */
export function validateAgentStatus(data: unknown): AgentStatus {
  return AgentStatusSchema.parse(data);
}
