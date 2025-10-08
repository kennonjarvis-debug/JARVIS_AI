/**
 * Base Domain Agent
 *
 * Abstract base class for all autonomous domain agents.
 * Provides common functionality for task execution, learning,
 * and coordination with other agents.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import { ClearanceLevel } from '../types.js';
import type {
  IDomainAgent,
  DomainType,
  AutonomousTask,
  TaskResult,
  AgentStatus,
  DomainCapability,
  ResourceUsage,
  LogEntry,
  LearningFeedback,
  SystemContext,
} from '../types.js';

export abstract class BaseDomainAgent extends EventEmitter implements IDomainAgent {
  abstract domain: DomainType;
  abstract name: string;
  abstract description: string;
  abstract capabilities: DomainCapability[];

  currentClearance: ClearanceLevel;
  private tasksCompleted: number = 0;
  private tasksFailed: number = 0;
  private totalExecutionTime: number = 0;
  private currentTask?: AutonomousTask;
  private resourceUsage: ResourceUsage;
  private learningHistory: LearningFeedback[] = [];
  private lastActivityAt: Date;

  constructor(clearance: ClearanceLevel = ClearanceLevel.SUGGEST) {
    super();
    this.currentClearance = clearance;
    this.lastActivityAt = new Date();
    this.resourceUsage = this.initializeResourceUsage();

    // Note: Cannot log here as abstract properties (name, domain) are not yet initialized
    logger.info('Domain agent initialized', {
      clearance: this.getClearanceName(clearance),
    });
  }

  /**
   * Analyze domain and identify opportunities
   * Must be implemented by each domain agent
   */
  abstract analyze(): Promise<AutonomousTask[]>;

  /**
   * Execute domain-specific task logic
   * Must be implemented by each domain agent
   */
  protected abstract executeTask(task: AutonomousTask): Promise<TaskResult>;

  /**
   * Execute task with common wrapper logic
   */
  async execute(task: AutonomousTask): Promise<TaskResult> {
    if (!this.canExecute(task)) {
      const error = `Cannot execute task: insufficient clearance or domain mismatch`;
      logger.error(error, {
        taskId: task.id,
        required: task.clearanceRequired,
        current: this.currentClearance,
        domain: task.domain,
      });

      return this.createErrorResult(task, error);
    }

    this.currentTask = task;
    this.lastActivityAt = new Date();
    const startTime = Date.now();

    logger.info(`Executing task: ${task.title}`, {
      taskId: task.id,
      domain: this.domain,
      priority: task.priority,
    });

    this.emit('taskStarted', task);

    try {
      // Execute the task
      const result = await this.executeTask(task);

      const duration = Date.now() - startTime;
      result.metrics.duration = duration;

      // Update statistics
      if (result.success) {
        this.tasksCompleted++;
        this.emit('taskCompleted', task, result);
        logger.info(`Task completed successfully: ${task.title}`, {
          taskId: task.id,
          duration,
          impactScore: result.metrics.impactScore,
        });
      } else {
        this.tasksFailed++;
        this.emit('taskFailed', task, result);
        logger.error(`Task failed: ${task.title}`, {
          taskId: task.id,
          error: result.error,
        });
      }

      this.totalExecutionTime += duration;
      this.updateResourceUsage(result.metrics.resourcesUsed);

      // Learn from execution
      await this.learn(task, result);

      this.currentTask = undefined;
      this.lastActivityAt = new Date();

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.tasksFailed++;
      this.currentTask = undefined;
      this.lastActivityAt = new Date();

      logger.error(`Task execution error: ${task.title}`, {
        taskId: task.id,
        error: error.message,
        stack: error.stack,
      });

      this.emit('taskError', task, error);

      return this.createErrorResult(task, error.message, duration);
    }
  }

  /**
   * Check if agent can execute task
   */
  canExecute(task: AutonomousTask): boolean {
    // Check domain match
    if (task.domain !== this.domain) {
      return false;
    }

    // Check clearance level
    if (this.currentClearance < task.clearanceRequired) {
      return false;
    }

    // Check if already executing a task
    if (this.currentTask) {
      return false;
    }

    return true;
  }

  /**
   * Get agent status
   */
  getStatus(): AgentStatus {
    const averageCompletionTime =
      this.tasksCompleted > 0
        ? this.totalExecutionTime / this.tasksCompleted
        : 0;

    const healthScore = this.calculateHealthScore();

    return {
      active: !!this.currentTask,
      currentTask: this.currentTask?.id,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      averageCompletionTime,
      lastActivityAt: this.lastActivityAt,
      healthScore,
      resourceUsage: this.resourceUsage,
    };
  }

  /**
   * Update clearance level
   */
  setClearance(level: ClearanceLevel): void {
    const oldLevel = this.currentClearance;
    this.currentClearance = level;

    logger.info(`Clearance updated for ${this.name}`, {
      from: this.getClearanceName(oldLevel),
      to: this.getClearanceName(level),
    });

    this.emit('clearanceChanged', { oldLevel, newLevel: level });
  }

  /**
   * Get system context for decision making
   */
  protected async getSystemContext(): Promise<SystemContext> {
    // This would integrate with actual system monitoring
    // For now, return a basic context
    return {
      timestamp: new Date(),
      environment: (process.env.NODE_ENV as any) || 'development',
      systemHealth: {
        cpu: 50,
        memory: 60,
        disk: 40,
        network: 90,
      },
      activeUsers: 1,
      currentLoad: 30,
      recentErrors: 0,
      budgetRemaining: {
        daily: 45,
        monthly: 1200,
      },
      maintenanceWindow: false,
      emergencyMode: false,
    };
  }

  /**
   * Learn from task execution
   */
  protected async learn(task: AutonomousTask, result: TaskResult): Promise<void> {
    const feedback: LearningFeedback = {
      taskId: task.id,
      actualOutcome: result.success ? 'success' : 'failure',
      expectedOutcome: 'success', // We always expect success
      actualDuration: result.metrics.duration,
      estimatedDuration: task.estimatedDuration,
      actualCost: result.metrics.resourcesUsed.costIncurred,
      estimatedCost: task.metadata.estimatedCost || 0,
      improvementSuggestions: [],
      timestamp: new Date(),
    };

    // Analyze performance
    if (feedback.actualDuration > feedback.estimatedDuration * 1.5) {
      feedback.improvementSuggestions.push(
        'Task took 50% longer than estimated - review estimation model'
      );
    }

    if (feedback.actualCost > feedback.estimatedCost * 1.2) {
      feedback.improvementSuggestions.push(
        'Task cost exceeded estimate by 20% - review cost model'
      );
    }

    this.learningHistory.push(feedback);

    // Keep only last 100 feedback entries
    if (this.learningHistory.length > 100) {
      this.learningHistory.shift();
    }

    this.emit('learned', feedback);
  }

  /**
   * Get learning insights
   */
  getLearningInsights(): {
    successRate: number;
    averageEstimationError: number;
    commonFailureReasons: string[];
    improvements: string[];
  } {
    if (this.learningHistory.length === 0) {
      return {
        successRate: 0,
        averageEstimationError: 0,
        commonFailureReasons: [],
        improvements: [],
      };
    }

    const successes = this.learningHistory.filter(f => f.actualOutcome === 'success').length;
    const successRate = successes / this.learningHistory.length;

    const estimationErrors = this.learningHistory.map(f =>
      Math.abs(f.actualDuration - f.estimatedDuration) / f.estimatedDuration
    );
    const averageEstimationError =
      estimationErrors.reduce((a, b) => a + b, 0) / estimationErrors.length;

    // Collect all improvement suggestions
    const allSuggestions = this.learningHistory.flatMap(f => f.improvementSuggestions);
    const uniqueSuggestions = [...new Set(allSuggestions)];

    return {
      successRate,
      averageEstimationError,
      commonFailureReasons: [], // Would need error categorization
      improvements: uniqueSuggestions,
    };
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(): number {
    const totalTasks = this.tasksCompleted + this.tasksFailed;

    if (totalTasks === 0) {
      return 100; // New agent, full health
    }

    // Success rate component (0-50 points)
    const successRate = this.tasksCompleted / totalTasks;
    const successScore = successRate * 50;

    // Activity recency component (0-25 points)
    const hoursSinceActivity =
      (Date.now() - this.lastActivityAt.getTime()) / (1000 * 60 * 60);
    const activityScore = Math.max(0, 25 - hoursSinceActivity);

    // Resource efficiency component (0-25 points)
    const costPerTask = this.resourceUsage.costIncurred / totalTasks;
    const efficiencyScore = Math.max(0, 25 - costPerTask);

    return Math.round(successScore + activityScore + efficiencyScore);
  }

  /**
   * Initialize resource usage
   */
  private initializeResourceUsage(): ResourceUsage {
    return {
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      filesModified: 0,
      cpuTime: 0,
      memoryPeak: 0,
    };
  }

  /**
   * Update cumulative resource usage
   */
  private updateResourceUsage(usage: ResourceUsage): void {
    this.resourceUsage.apiCalls += usage.apiCalls;
    this.resourceUsage.tokensUsed += usage.tokensUsed;
    this.resourceUsage.costIncurred += usage.costIncurred;
    this.resourceUsage.filesModified += usage.filesModified;
    this.resourceUsage.cpuTime += usage.cpuTime;
    this.resourceUsage.memoryPeak = Math.max(this.resourceUsage.memoryPeak, usage.memoryPeak);
  }

  /**
   * Create error result
   */
  private createErrorResult(
    task: AutonomousTask,
    error: string,
    duration: number = 0
  ): TaskResult {
    return {
      success: false,
      error,
      metrics: {
        duration,
        resourcesUsed: this.initializeResourceUsage(),
        impactScore: 0,
      },
      logs: [{
        timestamp: new Date(),
        level: 'error',
        message: error,
        context: { taskId: task.id },
      }],
    };
  }

  /**
   * Create log entry
   */
  protected log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      message,
      context,
    };
  }

  /**
   * Get clearance level name
   */
  private getClearanceName(level: ClearanceLevel): string {
    return ClearanceLevel[level];
  }
}

export default BaseDomainAgent;
