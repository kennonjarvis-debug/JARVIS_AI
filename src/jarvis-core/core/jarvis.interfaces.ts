/**
 * Jarvis Core Interfaces
 * Type definitions and interfaces for the Jarvis AI Operator layer
 */

import { Router } from 'express';

/**
 * Core module interface that all Jarvis modules must implement
 */
export interface JarvisModule {
  /** Unique module identifier */
  name: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** List of module names this module depends on */
  dependencies: string[];

  /** Module description for documentation */
  description: string;

  /**
   * Initialize the module
   * Called during system startup after all dependencies are loaded
   */
  initialize(): Promise<void>;

  /**
   * Shutdown the module gracefully
   * Called during system shutdown
   */
  shutdown(): Promise<void>;

  /**
   * Register Express routes for this module
   * Routes will be mounted under /jarvis/{module-name}/
   */
  registerRoutes(router: Router): void;

  /**
   * Handle a command directed to this module
   * Used for ChatGPT integration and inter-module communication
   */
  handleCommand(command: JarvisCommand): Promise<JarvisCommandResult>;

  /**
   * Get current health status of the module
   * Used for monitoring and alerting
   */
  getHealthStatus(): Promise<ModuleHealth>;

  /**
   * Get scheduled jobs for this module (optional)
   * Returns cron-based jobs to be registered with the scheduler
   */
  getScheduledJobs?(): ScheduledJob[];
}

/**
 * Command structure for inter-module and ChatGPT communication
 */
export interface JarvisCommand {
  /** Unique command ID for tracking */
  id: string;

  /** Target module name */
  module: string;

  /** Action to perform within the module */
  action: string;

  /** Command parameters */
  parameters: Record<string, any>;

  /** User ID if command originated from a user */
  userId?: string;

  /** Command creation timestamp */
  timestamp: Date;

  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Result of command execution
 */
export interface JarvisCommandResult {
  /** Whether the command executed successfully */
  success: boolean;

  /** Result data (if successful) */
  data?: any;

  /** Error message (if failed) */
  error?: string;

  /** Execution metadata */
  metadata: {
    /** Execution time in milliseconds */
    executionTime: number;

    /** Module that executed the command */
    module: string;

    /** Execution timestamp */
    timestamp: Date;

    /** Additional metadata */
    [key: string]: any;
  };
}

/**
 * Module health status
 */
export interface ModuleHealth {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

  /** Module uptime in milliseconds */
  uptime: number;

  /** Last health check timestamp */
  lastCheck: Date;

  /** Specific health metrics */
  metrics?: {
    /** CPU usage percentage (0-100) */
    cpuUsage?: number;

    /** Memory usage in MB */
    memoryUsage?: number;

    /** Active connections/sessions */
    activeConnections?: number;

    /** Error rate (errors per minute) */
    errorRate?: number;

    /** Custom metrics */
    [key: string]: any;
  };

  /** Health issues or warnings */
  issues?: string[];

  /** Additional details */
  details?: Record<string, any>;
}

/**
 * Scheduled job definition
 */
export interface ScheduledJob {
  /** Unique job identifier */
  id: string;

  /** Job name for logging */
  name: string;

  /** Cron expression (e.g., "0 9 * * *" for daily at 9 AM) */
  schedule: string;

  /** Job execution function */
  handler: () => Promise<void>;

  /** Whether the job is enabled */
  enabled: boolean;

  /** Job description */
  description?: string;

  /** Timezone for schedule (default: UTC) */
  timezone?: string;

  /** Retry configuration */
  retry?: {
    /** Maximum retry attempts */
    maxAttempts: number;

    /** Delay between retries in milliseconds */
    delayMs: number;
  };
}

/**
 * Module configuration
 */
export interface ModuleConfig {
  /** Whether the module is enabled */
  enabled: boolean;

  /** Module priority (lower numbers = higher priority) */
  priority: number;

  /** Module-specific settings */
  settings: Record<string, any>;

  /** Feature flags */
  features?: Record<string, boolean>;

  /** Resource limits */
  limits?: {
    /** Max concurrent operations */
    maxConcurrency?: number;

    /** Max memory usage in MB */
    maxMemoryMB?: number;

    /** Request timeout in milliseconds */
    timeoutMs?: number;
  };
}

/**
 * System-level health status
 */
export interface SystemHealth {
  /** Overall system status */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Individual module health statuses */
  modules: Record<string, ModuleHealth>;

  /** System uptime in milliseconds */
  uptime: number;

  /** Last health check timestamp */
  lastCheck: Date;

  /** System-level metrics */
  metrics: {
    /** Total modules loaded */
    totalModules: number;

    /** Healthy modules count */
    healthyModules: number;

    /** Degraded modules count */
    degradedModules: number;

    /** Unhealthy modules count */
    unhealthyModules: number;

    /** Total active jobs */
    activeJobs: number;

    /** Total commands processed */
    commandsProcessed: number;

    /** Average response time in milliseconds */
    avgResponseTime: number;
  };

  /** System-level issues */
  issues?: string[];
}

/**
 * Event types emitted by Jarvis system
 */
export enum JarvisEvent {
  /** Module initialized */
  MODULE_INITIALIZED = 'module:initialized',

  /** Module shutdown */
  MODULE_SHUTDOWN = 'module:shutdown',

  /** Module health changed */
  MODULE_HEALTH_CHANGED = 'module:health-changed',

  /** Command received */
  COMMAND_RECEIVED = 'command:received',

  /** Command completed */
  COMMAND_COMPLETED = 'command:completed',

  /** Command failed */
  COMMAND_FAILED = 'command:failed',

  /** Job started */
  JOB_STARTED = 'job:started',

  /** Job completed */
  JOB_COMPLETED = 'job:completed',

  /** Job failed */
  JOB_FAILED = 'job:failed',

  /** System health changed */
  SYSTEM_HEALTH_CHANGED = 'system:health-changed',

  /** Error occurred */
  ERROR = 'error',
}

/**
 * Event payload structure
 */
export interface JarvisEventPayload {
  /** Event type */
  event: JarvisEvent;

  /** Event timestamp */
  timestamp: Date;

  /** Module name (if applicable) */
  module?: string;

  /** Event data */
  data: any;

  /** Event metadata */
  metadata?: Record<string, any>;
}

/**
 * Logger interface for modules
 */
export interface ModuleLogger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Module context provided to modules during initialization
 */
export interface ModuleContext {
  /** Module configuration */
  config: ModuleConfig;

  /** Module logger */
  logger: ModuleLogger;

  /** Execute command on another module */
  executeCommand(command: JarvisCommand): Promise<JarvisCommandResult>;

  /** Emit an event */
  emit(event: JarvisEvent, data: any): void;

  /** Subscribe to an event */
  on(event: JarvisEvent, handler: (payload: JarvisEventPayload) => void): void;
}
