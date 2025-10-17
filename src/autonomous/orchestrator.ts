/**
 * Autonomous Orchestrator
 *
 * Central coordinator for all autonomous domain agents.
 * Manages task scheduling, prioritization, resource allocation,
 * and inter-agent coordination.
 *
 * This is the "brain" of the autonomous system - Claude C.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { ClearanceLevel, Priority } from './types.js';
import type {
  IDomainAgent,
  AutonomousTask,
  TaskResult,
  TaskStatus,
  AutonomousDecision,
  AgentMessage,
  SystemContext,
  AutonomousWorkflow,
} from './types.js';

import { CodeOptimizationDomain } from './domains/code-optimization-domain.js';
import { CostOptimizationDomain } from './domains/cost-optimization-domain.js';
import { SystemHealthDomain } from './domains/system-health-domain.js';
import { DataScientistDomain } from './domains/data-scientist-domain.js';
import { MarketingStrategistDomain } from './domains/marketing-strategist-domain.js';

export interface OrchestratorConfig {
  enabled: boolean;
  analysisInterval: number; // milliseconds
  maxConcurrentTasks: number;
  globalClearance: ClearanceLevel;
  autoApprove: {
    readOnly: boolean;
    suggestionsOnly: boolean;
    modifySafe: boolean;
    modifyProduction: boolean;
  };
}

export class AutonomousOrchestrator extends EventEmitter {
  private static instance: AutonomousOrchestrator;

  private agents: Map<string, IDomainAgent> = new Map();
  private taskQueue: AutonomousTask[] = [];
  private activeTasks: Map<string, AutonomousTask> = new Map();
  private completedTasks: TaskResult[] = [];
  private config: OrchestratorConfig;
  private analysisTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  private constructor(config?: Partial<OrchestratorConfig>) {
    super();

    // Read configuration from environment variables
    const enabled = process.env.AUTONOMOUS_ENABLED === 'true';
    const analysisInterval = parseInt(process.env.AUTONOMOUS_ANALYSIS_INTERVAL || '300000', 10);
    const maxConcurrentTasks = parseInt(process.env.AUTONOMOUS_MAX_CONCURRENT_TASKS || '3', 10);

    // Parse clearance level from environment
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
        modifyProduction: process.env.AUTONOMOUS_AUTO_APPROVE_MODIFY_PRODUCTION === 'true',
      },
      ...config,
    };

    logger.info('🤖 AutonomousOrchestrator initialized', {
      enabled: this.config.enabled,
      clearance: ClearanceLevel[this.config.globalClearance],
      analysisInterval: `${this.config.analysisInterval / 1000}s`,
      maxConcurrentTasks: this.config.maxConcurrentTasks,
    });
  }

  static getInstance(config?: Partial<OrchestratorConfig>): AutonomousOrchestrator {
    if (!AutonomousOrchestrator.instance) {
      AutonomousOrchestrator.instance = new AutonomousOrchestrator(config);
    }
    return AutonomousOrchestrator.instance;
  }

  /**
   * Initialize and start the orchestrator
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Autonomous features disabled - not starting orchestrator');
      return;
    }

    if (this.isRunning) {
      logger.warn('Orchestrator already running');
      return;
    }

    logger.info('🤖 Starting Autonomous Orchestrator (Claude C)...');

    // Register domain agents
    await this.registerAgents();

    // Start analysis loop
    this.startAnalysisLoop();

    this.isRunning = true;
    this.emit('started');

    logger.info('✅ Autonomous Orchestrator started successfully');
    logger.info(`📊 Registered ${this.agents.size} domain agents`);
    logger.info(`🔐 Global clearance: ${ClearanceLevel[this.config.globalClearance]}`);
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping Autonomous Orchestrator...');

    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
    }

    // Wait for active tasks to complete
    if (this.activeTasks.size > 0) {
      logger.info(`Waiting for ${this.activeTasks.size} active tasks to complete...`);
      // In production, would implement graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    this.isRunning = false;
    this.emit('stopped');

    logger.info('✅ Autonomous Orchestrator stopped');
  }

  /**
   * Register domain agents
   */
  private async registerAgents(): Promise<void> {
    // Initialize agents with global clearance
    const codeOptimizer = new CodeOptimizationDomain(this.config.globalClearance);
    const costOptimizer = new CostOptimizationDomain(this.config.globalClearance);
    const healthMonitor = new SystemHealthDomain(this.config.globalClearance);
    const dataScientist = new DataScientistDomain(this.config.globalClearance);
    const marketingStrategist = new MarketingStrategistDomain(this.config.globalClearance);

    // Register agents
    this.agents.set('code-optimization', codeOptimizer);
    this.agents.set('cost-optimization', costOptimizer);
    this.agents.set('system-health', healthMonitor);
    this.agents.set('data-science', dataScientist);
    this.agents.set('marketing', marketingStrategist);

    // Setup event listeners for each agent
    for (const [domain, agent] of this.agents.entries()) {
      // BaseDomainAgent extends EventEmitter, so we can safely cast
      const agentEmitter = agent as any;

      agentEmitter.on('taskStarted', (task: AutonomousTask) => {
        logger.info(`[${domain}] Task started: ${task.title}`);
        this.emit('taskStarted', { domain, task });
      });

      agentEmitter.on('taskCompleted', (task: AutonomousTask, result: TaskResult) => {
        logger.info(`[${domain}] Task completed: ${task.title}`, {
          success: result.success,
          impactScore: result.metrics.impactScore,
        });
        this.completedTasks.push(result);
        this.emit('taskCompleted', { domain, task, result });
      });

      agentEmitter.on('taskFailed', (task: AutonomousTask, result: TaskResult) => {
        logger.error(`[${domain}] Task failed: ${task.title}`, {
          error: result.error,
        });
        this.emit('taskFailed', { domain, task, result });
      });
    }

    logger.info(`Registered ${this.agents.size} domain agents`);
  }

  /**
   * Start periodic analysis loop
   */
  private startAnalysisLoop(): void {
    // Run initial analysis immediately
    this.runAnalysis();

    // Then run periodically
    this.analysisTimer = setInterval(() => {
      this.runAnalysis();
    }, this.config.analysisInterval);

    logger.info(`Analysis loop started (interval: ${this.config.analysisInterval}ms)`);
  }

  /**
   * Run analysis across all domains
   */
  private async runAnalysis(): Promise<void> {
    logger.info('🔍 Running autonomous analysis across all domains...');

    try {
      // Get tasks from each domain
      const allTasks: AutonomousTask[] = [];

      for (const [domain, agent] of this.agents.entries()) {
        try {
          const tasks = await agent.analyze();
          allTasks.push(...tasks);
          logger.info(`[${domain}] Identified ${tasks.length} opportunities`);
        } catch (error: any) {
          logger.error(`[${domain}] Analysis failed:`, error);
        }
      }

      // Sort by priority
      allTasks.sort((a, b) => b.priority - a.priority);

      // Make decisions on each task
      for (const task of allTasks) {
        const decision = await this.makeDecision(task);

        if (decision.decision === 'execute') {
          await this.scheduleTask(task);
        } else if (decision.decision === 'escalate') {
          logger.warn(`Task requires approval: ${task.title}`, {
            reason: decision.reasoning,
          });
          this.emit('approvalRequired', { task, decision });
        }
      }

      // Execute queued tasks
      await this.processQueue();

      logger.info(`Analysis complete. Queue size: ${this.taskQueue.length}, Active: ${this.activeTasks.size}`);

    } catch (error: any) {
      logger.error('Analysis failed:', error);
    }
  }

  /**
   * Make autonomous decision on task
   */
  private async makeDecision(task: AutonomousTask): Promise<AutonomousDecision> {
    const decision: AutonomousDecision = {
      id: `decision-${Date.now()}`,
      taskId: task.id,
      agentDomain: task.domain,
      decision: 'defer',
      reasoning: '',
      confidence: 0,
      risksIdentified: [],
      timestamp: new Date(),
    };

    // Check clearance
    if (task.clearanceRequired > this.config.globalClearance) {
      decision.decision = 'escalate';
      decision.reasoning = `Task requires clearance level ${ClearanceLevel[task.clearanceRequired]}, but global clearance is ${ClearanceLevel[this.config.globalClearance]}`;
      decision.confidence = 1.0;
      return decision;
    }

    // Check auto-approval settings
    const canAutoApprove = this.canAutoApprove(task.clearanceRequired);

    if (!canAutoApprove) {
      decision.decision = 'escalate';
      decision.reasoning = `Task requires ${ClearanceLevel[task.clearanceRequired]} clearance, but auto-approval is disabled for this level`;
      decision.confidence = 1.0;
      return decision;
    }

    // Assess risks
    decision.risksIdentified = this.assessRisks(task);

    // Critical priority tasks with low risk -> execute
    if (task.priority === Priority.CRITICAL && decision.risksIdentified.length === 0) {
      decision.decision = 'execute';
      decision.reasoning = 'Critical priority task with no identified risks';
      decision.confidence = 0.95;
      return decision;
    }

    // High priority tasks with acceptable risks -> execute
    if (task.priority >= Priority.HIGH && decision.risksIdentified.every(r => r.severity !== 'critical')) {
      decision.decision = 'execute';
      decision.reasoning = 'High priority task with acceptable risk level';
      decision.confidence = 0.85;
      return decision;
    }

    // Read-only tasks are generally safe
    if (task.clearanceRequired === ClearanceLevel.READ_ONLY) {
      decision.decision = 'execute';
      decision.reasoning = 'Read-only task with no system modifications';
      decision.confidence = 0.99;
      return decision;
    }

    // Suggest-only tasks need review
    if (task.clearanceRequired === ClearanceLevel.SUGGEST) {
      decision.decision = 'execute';
      decision.reasoning = 'Suggestion-only task for human review';
      decision.confidence = 0.90;
      return decision;
    }

    // Default: escalate for approval
    decision.decision = 'escalate';
    decision.reasoning = 'Task requires human approval due to risk/priority combination';
    decision.confidence = 0.7;

    return decision;
  }

  /**
   * Check if clearance level can be auto-approved
   */
  private canAutoApprove(clearance: ClearanceLevel): boolean {
    switch (clearance) {
      case ClearanceLevel.READ_ONLY:
        return this.config.autoApprove.readOnly;
      case ClearanceLevel.SUGGEST:
        return this.config.autoApprove.suggestionsOnly;
      case ClearanceLevel.MODIFY_SAFE:
        return this.config.autoApprove.modifySafe;
      case ClearanceLevel.MODIFY_PRODUCTION:
        return this.config.autoApprove.modifyProduction;
      case ClearanceLevel.FULL_AUTONOMY:
        return false; // Always requires explicit approval
      default:
        return false;
    }
  }

  /**
   * Assess risks for a task
   */
  private assessRisks(task: AutonomousTask): Array<{
    category: 'cost' | 'performance' | 'security' | 'availability' | 'data-loss';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    probability: number;
  }> {
    const risks = [];

    // Cost risks
    if (task.metadata.estimatedCost && task.metadata.estimatedCost > 1.0) {
      risks.push({
        category: 'cost' as const,
        severity: 'medium' as const,
        description: `Task may incur costs of $${task.metadata.estimatedCost}`,
        probability: 0.8,
      });
    }

    // Production modification risks
    if (task.clearanceRequired >= ClearanceLevel.MODIFY_PRODUCTION) {
      risks.push({
        category: 'availability' as const,
        severity: 'high' as const,
        description: 'Task will modify production resources',
        probability: 1.0,
      });
    }

    // Data modification risks
    if (task.metadata.filesModified || task.clearanceRequired >= ClearanceLevel.MODIFY_SAFE) {
      risks.push({
        category: 'data-loss' as const,
        severity: 'low' as const,
        description: 'Task will modify files or data',
        probability: 0.3,
      });
    }

    return risks;
  }

  /**
   * Schedule task for execution
   */
  private async scheduleTask(task: AutonomousTask): Promise<void> {
    // Check if we can execute immediately
    if (this.activeTasks.size < this.config.maxConcurrentTasks) {
      await this.executeTask(task);
    } else {
      // Add to queue
      this.taskQueue.push(task);
      task.status = 'pending' as TaskStatus;
      logger.info(`Task queued: ${task.title}`);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: AutonomousTask): Promise<void> {
    const agent = this.agents.get(task.domain);

    if (!agent) {
      logger.error(`No agent found for domain: ${task.domain}`);
      return;
    }

    if (!agent.canExecute(task)) {
      logger.warn(`Agent cannot execute task: ${task.title}`);
      return;
    }

    this.activeTasks.set(task.id, task);
    task.status = 'in_progress' as TaskStatus;
    task.startedAt = new Date();

    try {
      const result = await agent.execute(task);

      task.status = result.success ? 'completed' as TaskStatus : 'failed' as TaskStatus;
      task.completedAt = new Date();
      task.result = result;

      this.activeTasks.delete(task.id);

      // Process next task in queue
      await this.processQueue();

    } catch (error: any) {
      logger.error(`Task execution error: ${task.title}`, error);
      task.status = 'failed' as TaskStatus;
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Process task queue
   */
  private async processQueue(): Promise<void> {
    while (this.taskQueue.length > 0 && this.activeTasks.size < this.config.maxConcurrentTasks) {
      const task = this.taskQueue.shift();
      if (task) {
        await this.executeTask(task);
      }
    }
  }

  /**
   * Get orchestrator status
   */
  getStatus(): {
    running: boolean;
    agents: number;
    queuedTasks: number;
    activeTasks: number;
    completedTasks: number;
    config: OrchestratorConfig;
  } {
    return {
      running: this.isRunning,
      agents: this.agents.size,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      completedTasks: this.completedTasks.length,
      config: this.config,
    };
  }

  /**
   * Get agent statuses
   */
  getAgentStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};

    for (const [domain, agent] of this.agents.entries()) {
      statuses[domain] = agent.getStatus();
    }

    return statuses;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Orchestrator configuration updated', this.config);
    this.emit('configUpdated', this.config);
  }

  /**
   * Manually trigger analysis
   */
  async triggerAnalysis(): Promise<void> {
    logger.info('Manual analysis triggered');
    await this.runAnalysis();
  }

  /**
   * Approve a pending task
   */
  async approveTask(taskId: string): Promise<void> {
    const task = this.taskQueue.find(t => t.id === taskId);

    if (!task) {
      logger.warn(`Task not found: ${taskId}`);
      return;
    }

    task.status = 'approved' as TaskStatus;
    logger.info(`Task approved: ${task.title}`);

    await this.executeTask(task);
  }

  /**
   * Reject a pending task
   */
  rejectTask(taskId: string, reason: string): void {
    const taskIndex = this.taskQueue.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      logger.warn(`Task not found: ${taskId}`);
      return;
    }

    const task = this.taskQueue[taskIndex];
    task.status = 'cancelled' as TaskStatus;

    this.taskQueue.splice(taskIndex, 1);

    logger.info(`Task rejected: ${task.title}`, { reason });
    this.emit('taskRejected', { task, reason });
  }
}

// Export singleton instance
export const orchestrator = AutonomousOrchestrator.getInstance();

export default AutonomousOrchestrator;
