/**
 * Base Domain Agent
 *
 * Defines the interface and base implementation for domain-specific agents.
 */

export enum ClearanceLevel {
  READ_ONLY = 1,
  SAFE_MODIFY = 2,
  FULL_ACCESS = 3,
  ADMIN = 4
}

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

export abstract class BaseDomainAgent {
  protected name: string;
  protected domain: string;
  protected clearanceLevel: ClearanceLevel;
  protected state: AgentState;
  protected tasksExecuted: number = 0;
  protected totalImpact: number = 0;

  constructor(name: string, domain: string, clearanceLevel: ClearanceLevel = ClearanceLevel.SAFE_MODIFY) {
    this.name = name;
    this.domain = domain;
    this.clearanceLevel = clearanceLevel;
    this.state = {
      status: 'idle'
    };
  }

  /**
   * Analyze input and generate tasks
   */
  abstract analyze(input: string, context?: any): Promise<AnalysisResult>;

  /**
   * Execute a specific task
   */
  abstract executeTask(task: Task): Promise<ExecutionResult>;

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
      clearanceLevel: this.clearanceLevel,
      domain: this.domain,
      name: this.name
    };
  }

  /**
   * Check if agent can execute task based on clearance
   */
  protected canExecute(task: Task): boolean {
    return this.clearanceLevel >= task.clearanceRequired;
  }

  /**
   * Calculate impact score for a task
   */
  protected calculateImpact(task: Task): number {
    // Base implementation - can be overridden
    return task.priority * task.estimatedImpact;
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
}
