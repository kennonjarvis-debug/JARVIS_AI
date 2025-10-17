/**
 * Base Domain Agent
 *
 * Defines the interface and base implementation for domain-specific agents.
 */

import { EventEmitter } from 'events';
import {
  ClearanceLevel
} from '../types.js';
import type {
  DomainType,
  AutonomousTask,
  TaskResult,
  DomainCapability,
  AgentStatus,
  LogEntry,
  IDomainAgent
} from '../types.js';

// Re-export ClearanceLevel for backward compatibility
export { ClearanceLevel };

// Legacy types for backwards compatibility
export interface Task {
  id: string;
  type: string;
  description: string;
  priority: number;
  clearanceRequired: ClearanceLevel;
  estimatedImpact: number;
  metadata?: Record<string, any>;
}

export interface AnalysisResult {
  tasks: Task[];
  insights: string[];
  confidence: number;
  recommendedActions: string[];
}

export interface ExecutionResult {
  success: boolean;
  tasksCompleted: number;
  errors: string[];
  learningFeedback: string[];
  resourcesUsed: {
    cpuTime: number;
    apiCalls: number;
    tokens: number;
  };
}

export interface AgentState {
  status: 'idle' | 'analyzing' | 'executing' | 'paused' | 'error';
  currentTask?: string;
  lastActivity?: Date;
}

export abstract class BaseDomainAgent extends EventEmitter implements IDomainAgent {
  public abstract domain: DomainType;
  public abstract name: string;
  public abstract description: string;
  public abstract capabilities: DomainCapability[];

  public currentClearance: ClearanceLevel;
  protected state: AgentState;
  protected tasksExecuted: number = 0;
  protected totalImpact: number = 0;

  constructor(name: string, domain: string, clearanceLevel?: ClearanceLevel) {
    super();
    this.currentClearance = clearanceLevel || 0; // Default to READ_ONLY
    this.state = {
      status: 'idle'
    };
  }

  /**
   * Analyze current state and identify opportunities (IDomainAgent interface)
   */
  abstract analyze(): Promise<AutonomousTask[]>;

  /**
   * Execute a specific task (protected - called by public execute method)
   */
  protected abstract executeTask(task: AutonomousTask): Promise<TaskResult>;

  /**
   * Execute a specific task (public IDomainAgent interface)
   */
  async execute(task: AutonomousTask): Promise<TaskResult> {
    return this.executeTask(task);
  }

  /**
   * Validate if agent can execute task
   */
  canExecute(task: AutonomousTask): boolean {
    return this.currentClearance >= task.clearanceRequired;
  }

  /**
   * Get agent status and metrics
   */
  getStatus(): AgentStatus {
    return {
      active: this.state.status !== 'idle' && this.state.status !== 'paused',
      currentTask: this.state.currentTask,
      tasksCompleted: this.tasksExecuted,
      tasksFailed: 0,
      averageCompletionTime: 0,
      lastActivityAt: this.state.lastActivity || new Date(),
      healthScore: 100,
      resourceUsage: {
        apiCalls: 0,
        tokensUsed: 0,
        costIncurred: 0,
        filesModified: 0,
        cpuTime: 0,
        memoryPeak: 0
      }
    };
  }

  /**
   * Get agent's current state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Pause agent operations
   */
  pause(): void {
    this.state.status = 'paused';
  }

  /**
   * Resume agent operations
   */
  resume(): void {
    this.state.status = 'idle';
  }

  /**
   * Stop agent
   */
  stop(): void {
    this.state.status = 'idle';
    this.state.currentTask = undefined;
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      tasksExecuted: this.tasksExecuted,
      totalImpact: this.totalImpact,
      clearanceLevel: this.currentClearance,
      domain: this.domain,
      name: this.name
    };
  }

  /**
   * Calculate impact score for a task
   */
  protected calculateImpact(task: AutonomousTask, artifacts?: any[]): number {
    // Base implementation - can be overridden
    return task.priority * (task.metadata?.estimatedImpact || 1);
  }

  /**
   * Generate learning feedback from execution
   */
  protected generateLearningFeedback(task: Task, result: ExecutionResult): string[] {
    const feedback: string[] = [];

    if (result.success) {
      feedback.push(`Successfully completed ${task.type} task`);
    } else {
      feedback.push(`Failed to complete ${task.type} task: ${result.errors.join(', ')}`);
    }

    if (result.resourcesUsed.apiCalls > 10) {
      feedback.push(`High API usage detected (${result.resourcesUsed.apiCalls} calls)`);
    }

    return feedback;
  }

  /**
   * Helper to create log entries
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, any>): any {
    return {
      timestamp: new Date(),
      level,
      message,
      context
    };
  }

  /**
   * Helper to get system context (can be overridden)
   */
  protected async getSystemContext(): Promise<any> {
    return {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
}
