/**
 * Unified Autonomous Agent Orchestrator
 *
 * Central coordinator for all autonomous agents, combining:
 * - Task-based autonomous operations
 * - Proactive suggestions and intelligence
 * - Adaptive learning and pattern recognition
 * - Inter-agent coordination
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import { adaptiveEngine } from './engines/adaptive-engine.js';
import {
  ClearanceLevel,
  Priority,
  TaskStatus,
  DomainType,
  AgentConfig,
  AutonomousTask,
  TaskResult,
  IDomainAgent,
  ProactiveSuggestion,
  UserInteraction,
  WorkContext,
  SystemContext,
  AgentEvent,
  AgentEventType
} from './types.js';

export class AgentOrchestrator extends EventEmitter {
  private static instance: AgentOrchestrator;

  // Agents
  private agents: Map<string, IDomainAgent> = new Map();

  // Task management
  private taskQueue: AutonomousTask[] = [];
  private activeTasks: Map<string, AutonomousTask> = new Map();
  private completedTasks: TaskResult[] = [];
  private pendingApprovals: AutonomousTask[] = [];

  // Proactive intelligence
  private suggestions: ProactiveSuggestion[] = [];
  private notificationHistory: { timestamp: Date; type: string }[] = [];

  // State
  private config: AgentConfig;
  private isRunning: boolean = false;
  private analysisTimer?: NodeJS.Timeout;
  private currentContext?: WorkContext;

  private constructor(config?: Partial<AgentConfig>) {
    super();

    // Read configuration from environment
    const enabled = process.env.AUTONOMOUS_ENABLED === 'true';
    const analysisInterval = parseInt(process.env.AUTONOMOUS_ANALYSIS_INTERVAL || '300000', 10);
    const maxConcurrentTasks = parseInt(process.env.AUTONOMOUS_MAX_CONCURRENT_TASKS || '3', 10);

    const clearanceMap: Record<string, ClearanceLevel> = {
      'READ_ONLY': ClearanceLevel.READ_ONLY,
      'SUGGEST': ClearanceLevel.SUGGEST,
      'MODIFY_SAFE': ClearanceLevel.MODIFY_SAFE,
      'MODIFY_PRODUCTION': ClearanceLevel.MODIFY_PRODUCTION,
      'FULL_AUTONOMY': ClearanceLevel.FULL_AUTONOMY,
    };
    const globalClearance = clearanceMap[process.env.AUTONOMOUS_CLEARANCE || 'SUGGEST'] || ClearanceLevel.SUGGEST;

    this.config = {
      enabled,
      analysisInterval,
      maxConcurrentTasks,
      globalClearance,
      autoApprove: {
        readOnly: process.env.AUTONOMOUS_AUTO_APPROVE_READ_ONLY === 'true',
        suggestionsOnly: process.env.AUTONOMOUS_AUTO_APPROVE_SUGGESTIONS === 'true',
        modifySafe: process.env.AUTONOMOUS_AUTO_APPROVE_MODIFY_SAFE === 'true',
        modifyProduction: process.env.AUTONOMOUS_AUTO_APPROVE_MODIFY_PRODUCTION === 'false'
      },
      proactive: {
        enabled: process.env.PROACTIVE_ENABLED === 'true',
        maxNotificationsPerHour: 5,
        maxNotificationsPerDay: 20,
        minTimeBetweenNotifications: 15,
        respectDoNotDisturb: true,
        confidenceThreshold: 0.6
      },
      learning: {
        enabled: process.env.LEARNING_ENABLED === 'true',
        learningRate: 0.7,
        confidenceThreshold: 0.75,
        maxPatternsPerDomain: 100,
        retentionDays: 90,
        autoAdapt: false
      },
      ...config
    };

    // Configure adaptive engine
    adaptiveEngine.configure(this.config.learning);
    if (this.config.learning.enabled) {
      adaptiveEngine.enableLearning();
    }
  }

  public static getInstance(config?: Partial<AgentConfig>): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator(config);
    }
    return AgentOrchestrator.instance;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the orchestrator
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('⚠️  Agent orchestrator already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('Agent orchestrator disabled via configuration');
      return;
    }

    logger.info('🚀 Starting Jarvis Unified Agent System');
    logger.info(`   Global Clearance: ${this.config.globalClearance}`);
    logger.info(`   Analysis Interval: ${this.config.analysisInterval}ms`);
    logger.info(`   Max Concurrent Tasks: ${this.config.maxConcurrentTasks}`);
    logger.info(`   Proactive Mode: ${this.config.proactive.enabled ? 'Enabled' : 'Disabled'}`);
    logger.info(`   Learning Mode: ${this.config.learning.enabled ? 'Enabled' : 'Disabled'}`);

    this.isRunning = true;

    // Initialize all agents
    for (const [name, agent] of this.agents) {
      try {
        await agent.initialize();
        logger.info(`✅ Initialized agent: ${name}`);
      } catch (error) {
        logger.error(`Failed to initialize agent ${name}:`, error);
      }
    }

    // Start analysis loop
    this.startAnalysisLoop();

    this.emitEvent('agent:started', { timestamp: new Date() });
    logger.info('✅ Unified Agent System started successfully');
  }

  /**
   * Stop the orchestrator
   */
  public async stop(): Promise<void> {
    logger.info('🛑 Stopping Unified Agent System');
    this.isRunning = false;

    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
    }

    // Wait for active tasks to complete
    logger.info(`   Waiting for ${this.activeTasks.size} active tasks to complete...`);
    await this.waitForActiveTasks();

    this.emitEvent('agent:stopped', { timestamp: new Date() });
    logger.info('✅ Unified Agent System stopped');
  }

  /**
   * Analysis loop
   */
  private startAnalysisLoop(): void {
    this.analysisTimer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.runAnalysis();
      } catch (error) {
        logger.error('Error in analysis loop:', error);
      }
    }, this.config.analysisInterval);

    // Run initial analysis
    this.runAnalysis();
  }

  /**
   * Run analysis across all agents
   */
  private async runAnalysis(): Promise<void> {
    logger.debug('🔍 Running agent analysis');

    const systemContext = this.getSystemContext();

    for (const [name, agent] of this.agents) {
      try {
        const tasks = await agent.analyze();

        for (const task of tasks) {
          // Check clearance
          if (this.canExecuteTask(task)) {
            this.queueTask(task);
          } else {
            logger.debug(`Task ${task.action} blocked by clearance level`);
          }
        }
      } catch (error) {
        logger.error(`Error analyzing agent ${name}:`, error);
      }
    }

    // Process task queue
    await this.processTaskQueue();

    // Generate proactive suggestions if enabled
    if (this.config.proactive.enabled) {
      await this.generateProactiveSuggestions();
    }
  }

  // ============================================================================
  // Agent Management
  // ============================================================================

  /**
   * Register a domain agent
   */
  public registerAgent(agent: IDomainAgent): void {
    const key = agent.domain.toString();

    if (this.agents.has(key)) {
      logger.warn(`Agent for domain ${agent.domain} already registered, replacing`);
    }

    this.agents.set(key, agent);
    logger.info(`Registered agent: ${agent.name} (${agent.domain})`);

    if (this.isRunning) {
      agent.initialize().catch(error => {
        logger.error(`Failed to initialize agent ${agent.name}:`, error);
      });
    }
  }

  /**
   * Unregister an agent
   */
  public unregisterAgent(domain: DomainType): void {
    const key = domain.toString();
    if (this.agents.delete(key)) {
      logger.info(`Unregistered agent for domain: ${domain}`);
    }
  }

  /**
   * Get all registered agents
   */
  public getAgents(): IDomainAgent[] {
    return Array.from(this.agents.values());
  }

  // ============================================================================
  // Task Management
  // ============================================================================

  /**
   * Queue a task
   */
  public queueTask(task: AutonomousTask): void {
    // Check if task requires approval
    if (task.requiresApproval || !this.shouldAutoApprove(task)) {
      this.pendingApprovals.push(task);
      this.emitEvent('task:created', { task, requiresApproval: true });
      logger.info(`Task queued for approval: ${task.action}`);
      return;
    }

    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => {
      const priorityMap = {
        [Priority.CRITICAL]: 5,
        [Priority.HIGH]: 4,
        [Priority.MEDIUM]: 3,
        [Priority.LOW]: 2,
        [Priority.BACKGROUND]: 1
      };
      return priorityMap[b.priority] - priorityMap[a.priority];
    });

    this.emitEvent('task:created', { task });
    logger.info(`Task queued: ${task.action} (priority: ${task.priority})`);
  }

  /**
   * Approve a pending task
   */
  public approveTask(taskId: string, approvedBy: string): void {
    const index = this.pendingApprovals.findIndex(t => t.id === taskId);
    if (index === -1) {
      logger.warn(`Task ${taskId} not found in pending approvals`);
      return;
    }

    const task = this.pendingApprovals.splice(index, 1)[0];
    task.approvedBy = approvedBy;
    task.approvedAt = new Date();

    this.taskQueue.push(task);
    logger.info(`Task approved: ${task.action} by ${approvedBy}`);

    this.processTaskQueue();
  }

  /**
   * Reject a pending task
   */
  public rejectTask(taskId: string): void {
    const index = this.pendingApprovals.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const task = this.pendingApprovals.splice(index, 1)[0];
      logger.info(`Task rejected: ${task.action}`);

      const result: TaskResult = {
        taskId: task.id,
        status: TaskStatus.CANCELLED,
        success: false,
        error: 'Rejected by user',
        completedAt: new Date()
      };

      this.completedTasks.push(result);
      this.emitEvent('task:completed', { task, result });
    }
  }

  /**
   * Process task queue
   */
  private async processTaskQueue(): Promise<void> {
    while (
      this.taskQueue.length > 0 &&
      this.activeTasks.size < this.config.maxConcurrentTasks
    ) {
      const task = this.taskQueue.shift()!;
      await this.executeTask(task);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: AutonomousTask): Promise<void> {
    const agent = this.agents.get(task.domain.toString());
    if (!agent) {
      logger.error(`No agent found for domain: ${task.domain}`);
      return;
    }

    task.status = TaskStatus.IN_PROGRESS;
    task.startedAt = new Date();
    this.activeTasks.set(task.id, task);

    this.emitEvent('task:started', { task });
    logger.info(`▶️  Executing task: ${task.action}`);

    try {
      const result = await agent.execute(task);

      task.status = result.status;
      task.completedAt = new Date();
      this.activeTasks.delete(task.id);
      this.completedTasks.push(result);

      // Learn from the task execution
      if (this.config.learning.enabled) {
        await adaptiveEngine.learn({
          domain: task.domain.toString(),
          input: task.params,
          output: result.output,
          timestamp: new Date()
        });
      }

      this.emitEvent('task:completed', { task, result });
      logger.info(`✅ Task completed: ${task.action}`);

      // Continue processing queue
      this.processTaskQueue();
    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.completedAt = new Date();
      this.activeTasks.delete(task.id);

      const result: TaskResult = {
        taskId: task.id,
        status: TaskStatus.FAILED,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date()
      };

      this.completedTasks.push(result);
      this.emitEvent('task:failed', { task, error: result.error });
      logger.error(`❌ Task failed: ${task.action}`, error);
    }
  }

  /**
   * Check if task can be auto-approved
   */
  private shouldAutoApprove(task: AutonomousTask): boolean {
    switch (task.clearance) {
      case ClearanceLevel.READ_ONLY:
        return this.config.autoApprove.readOnly;
      case ClearanceLevel.SUGGEST:
        return this.config.autoApprove.suggestionsOnly;
      case ClearanceLevel.MODIFY_SAFE:
        return this.config.autoApprove.modifySafe;
      case ClearanceLevel.MODIFY_PRODUCTION:
        return this.config.autoApprove.modifyProduction;
      case ClearanceLevel.FULL_AUTONOMY:
        return false; // Always require approval for full autonomy
      default:
        return false;
    }
  }

  /**
   * Check if task can be executed based on clearance
   */
  private canExecuteTask(task: AutonomousTask): boolean {
    const levels = [
      ClearanceLevel.READ_ONLY,
      ClearanceLevel.SUGGEST,
      ClearanceLevel.MODIFY_SAFE,
      ClearanceLevel.MODIFY_PRODUCTION,
      ClearanceLevel.FULL_AUTONOMY
    ];

    const globalLevel = levels.indexOf(this.config.globalClearance);
    const taskLevel = levels.indexOf(task.clearance);

    return taskLevel <= globalLevel;
  }

  /**
   * Wait for active tasks to complete
   */
  private async waitForActiveTasks(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (this.activeTasks.size > 0) {
      if (Date.now() - startTime > timeoutMs) {
        logger.warn(`Timeout waiting for tasks, ${this.activeTasks.size} tasks still active`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // ============================================================================
  // Proactive Intelligence
  // ============================================================================

  /**
   * Generate proactive suggestions
   */
  private async generateProactiveSuggestions(): Promise<void> {
    // TODO: Implement suggestion generation based on context and patterns
    // This would use the adaptive engine to identify opportunities
  }

  /**
   * Track user interaction for learning
   */
  public trackInteraction(interaction: UserInteraction): void {
    if (!this.config.learning.enabled) return;

    adaptiveEngine.trackInteraction(interaction);
    this.emitEvent('interaction:tracked', { interaction });
  }

  /**
   * Update work context
   */
  public updateContext(context: WorkContext): void {
    this.currentContext = context;
    this.emit('context:updated', context);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get system context
   */
  private getSystemContext(): SystemContext {
    return {
      uptime: process.uptime() * 1000,
      memoryUsage: process.memoryUsage(),
      cpuUsage: 0, // TODO: Calculate actual CPU usage
      activeUsers: 1,
      activeAgents: this.agents.size,
      pendingTasks: this.taskQueue.length + this.pendingApprovals.length,
      recentErrors: [],
      timestamp: new Date()
    };
  }

  /**
   * Emit an agent event
   */
  private emitEvent(type: AgentEventType, data: any): void {
    const event: AgentEvent = {
      type,
      data,
      timestamp: new Date(),
      source: 'orchestrator'
    };

    this.emit(type, event);
    this.emit('event', event);
  }

  /**
   * Get orchestrator status
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      agents: this.agents.size,
      taskQueue: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      completedTasks: this.completedTasks.length,
      pendingApprovals: this.pendingApprovals.length,
      adaptiveEngine: adaptiveEngine.getState()
    };
  }

  /**
   * Get task history
   */
  public getTaskHistory(limit: number = 100): TaskResult[] {
    return this.completedTasks.slice(-limit);
  }

  /**
   * Get pending approvals
   */
  public getPendingApprovals(): AutonomousTask[] {
    return [...this.pendingApprovals];
  }
}

// Export singleton instance getter
export const getOrchestrator = (config?: Partial<AgentConfig>) => AgentOrchestrator.getInstance(config);
