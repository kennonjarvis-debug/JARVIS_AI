/**
 * Orchestrator
 *
 * Central coordinator for the Jarvis autonomous agent system.
 * Routes tasks to appropriate agents, manages event-driven architecture,
 * coordinates approval workflows, and maintains system state.
 *
 * @module core/orchestrator
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import type { BaseAgent } from '../agents/base-agent';
import type { DecisionEngine } from './decision-engine';
import type { ApprovalQueue } from './approval-queue';
import type { MemorySystem } from './memory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TaskRequest, TaskResult, TaskType, Priority } from '../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OrchestratorConfig {
  agents: BaseAgent[];
  integrations: {
    supabase: SupabaseClient;
    buffer?: any;
    hubspot?: any;
    email?: any;
    n8n?: any;
  };
  decisionEngine: DecisionEngine;
  approvalQueue: ApprovalQueue;
  memory: MemorySystem;
}

export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'in_progress' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
  assignedAgent?: string;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
  error?: string;
  approvalRequestId?: string;
}

export interface SystemMetrics {
  uptime: number;
  tasksProcessed: number;
  tasksInProgress: number;
  tasksPending: number;
  tasksAwaitingApproval: number;
  agents: {
    total: number;
    active: number;
    idle: number;
  };
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class Orchestrator extends EventEmitter {
  private logger: Logger;
  private agents: Map<string, BaseAgent>;
  private taskTypeToAgent: Map<TaskType, BaseAgent>;
  private tasks: Map<string, TaskStatus>;
  private supabase: SupabaseClient;
  private decisionEngine: DecisionEngine;
  private approvalQueue: ApprovalQueue;
  private memory: MemorySystem;
  private startTime: Date;
  private isShuttingDown: boolean = false;

  constructor(config: OrchestratorConfig) {
    super();
    this.logger = new Logger('Orchestrator');
    this.agents = new Map();
    this.taskTypeToAgent = new Map();
    this.tasks = new Map();
    this.supabase = config.integrations.supabase;
    this.decisionEngine = config.decisionEngine;
    this.approvalQueue = config.approvalQueue;
    this.memory = config.memory;
    this.startTime = new Date();

    // Register all agents
    for (const agent of config.agents) {
      this.registerAgent(agent);
    }

    this.logger.info('Orchestrator created', {
      agentCount: this.agents.size,
      taskTypesSupported: this.taskTypeToAgent.size,
    });
  }

  /**
   * Initialize the orchestrator
   * Loads pending tasks and sets up event listeners
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing orchestrator...');

    try {
      // Load pending tasks from database
      await this.loadPendingTasks();

      // Set up approval queue listener
      this.setupApprovalListener();

      // Initialize memory system
      await this.memory.initialize();

      this.logger.info('Orchestrator initialized successfully', {
        pendingTasks: this.tasks.size,
        registeredAgents: this.agents.size,
      });

      this.emit('orchestrator:ready');
    } catch (error) {
      this.logger.error('Failed to initialize orchestrator', { error });
      throw new JarvisError(
        ErrorCode.SYSTEM_ERROR,
        'Orchestrator initialization failed',
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Register an agent with the orchestrator
   */
  private registerAgent(agent: BaseAgent): void {
    const status = agent.getStatus();
    this.agents.set(status.id, agent);

    // Map each task type to this agent
    const types = agent.getSupportedTaskTypes();
    for (const type of types) {
      if (this.taskTypeToAgent.has(type)) {
        this.logger.warn('Task type already registered to another agent', {
          taskType: type,
          existingAgent: this.taskTypeToAgent.get(type)?.getStatus().id,
          newAgent: status.id,
        });
      }
      this.taskTypeToAgent.set(type, agent);
    }

    this.logger.info('Agent registered', {
      agentId: status.id,
      agentName: status.name,
      taskTypes: types.length,
    });
  }

  /**
   * Submit a task for execution
   * The task will be evaluated by the decision engine before execution
   */
  async submitTask(task: TaskRequest): Promise<string> {
    if (this.isShuttingDown) {
      throw new JarvisError(
        ErrorCode.SYSTEM_ERROR,
        'System is shutting down, cannot accept new tasks'
      );
    }

    this.logger.info('Task submitted', {
      taskId: task.id,
      type: task.type,
      priority: task.priority,
      requestedBy: task.requestedBy,
    });

    // Validate task
    this.validateTask(task);

    // Store in database
    try {
      await this.supabase
        .from('tasks')
        .insert({
          id: task.id,
          type: task.type,
          priority: task.priority,
          data: task.data,
          requested_by: task.requestedBy,
          status: 'pending',
          created_at: task.timestamp.toISOString(),
          metadata: task.metadata || {},
        });
    } catch (error) {
      throw new JarvisError(
        ErrorCode.DATABASE_ERROR,
        'Failed to store task',
        { taskId: task.id, error: (error as Error).message }
      );
    }

    // Create task status
    const taskStatus: TaskStatus = {
      taskId: task.id,
      status: 'pending',
    };
    this.tasks.set(task.id, taskStatus);

    // Emit event
    this.emit('task:submitted', task);

    // Execute task asynchronously
    this.executeTask(task).catch(error => {
      this.logger.error('Task execution failed', {
        taskId: task.id,
        error: (error as Error).message,
      });
      this.emit('task:failed', task.id, error);
    });

    return task.id;
  }

  /**
   * Execute a task
   * Goes through decision engine, routes to appropriate agent
   */
  private async executeTask(task: TaskRequest): Promise<void> {
    const taskStatus = this.tasks.get(task.id);
    if (!taskStatus) {
      this.logger.error('Task status not found', { taskId: task.id });
      return;
    }

    try {
      // Step 1: Evaluate with decision engine
      this.logger.info('Evaluating task with decision engine', {
        taskId: task.id,
      });

      const decision = await this.decisionEngine.evaluate(task);

      if (decision.requiresApproval) {
        // Task requires approval
        taskStatus.status = 'awaiting_approval';
        taskStatus.approvalRequestId = decision.approvalRequestId;

        await this.updateTaskInDB(task.id, {
          status: 'awaiting_approval',
          approval_request_id: decision.approvalRequestId,
        });

        this.emit('task:approval_required', task.id, decision.approvalRequestId);

        this.logger.info('Task requires approval', {
          taskId: task.id,
          approvalRequestId: decision.approvalRequestId,
          riskLevel: decision.riskLevel,
        });

        return;
      }

      // Step 2: Find appropriate agent
      const agent = this.taskTypeToAgent.get(task.type);
      if (!agent) {
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `No agent available for task type: ${task.type}`
        );
      }

      // Step 3: Execute task with agent
      taskStatus.status = 'in_progress';
      taskStatus.assignedAgent = agent.getStatus().id;
      taskStatus.startedAt = new Date();

      await this.updateTaskInDB(task.id, {
        status: 'in_progress',
        assigned_agent: agent.getStatus().id,
        started_at: taskStatus.startedAt.toISOString(),
      });

      this.emit('task:started', task.id, agent.getStatus().id);

      this.logger.info('Executing task with agent', {
        taskId: task.id,
        agent: agent.getStatus().id,
      });

      // Execute
      const result = await agent.execute(task);

      // Step 4: Handle result
      if (result.status === 'awaiting_approval') {
        taskStatus.status = 'awaiting_approval';
        taskStatus.approvalRequestId = result.data?.approvalRequestId;

        await this.updateTaskInDB(task.id, {
          status: 'awaiting_approval',
          approval_request_id: result.data?.approvalRequestId,
        });

        this.emit('task:approval_required', task.id, result.data?.approvalRequestId);
        return;
      }

      // Task completed
      taskStatus.status = result.success ? 'completed' : 'failed';
      taskStatus.completedAt = new Date();
      taskStatus.result = result;

      await this.updateTaskInDB(task.id, {
        status: taskStatus.status,
        result: result.data,
        error: result.error,
        completed_at: taskStatus.completedAt.toISOString(),
      });

      // Store in memory
      await this.memory.storeEntry({
        id: crypto.randomUUID(),
        type: 'task_execution',
        content: {
          taskId: task.id,
          taskType: task.type,
          agentId: agent.getStatus().id,
          success: result.success,
          result: result.data,
        },
        timestamp: new Date(),
        importance: result.success ? 0.6 : 0.8, // Failures are more important
        metadata: {
          taskId: task.id,
          agentId: agent.getStatus().id,
        },
      });

      this.emit('task:completed', result);

      this.logger.info('Task completed', {
        taskId: task.id,
        success: result.success,
        duration: taskStatus.completedAt.getTime() - taskStatus.startedAt!.getTime(),
      });

    } catch (error) {
      // Task failed
      taskStatus.status = 'failed';
      taskStatus.error = (error as Error).message;
      taskStatus.completedAt = new Date();

      await this.updateTaskInDB(task.id, {
        status: 'failed',
        error: taskStatus.error,
        completed_at: taskStatus.completedAt.toISOString(),
      });

      this.emit('task:failed', task.id, error);

      this.logger.error('Task execution failed', {
        taskId: task.id,
        error: taskStatus.error,
      });
    }
  }

  /**
   * Handle approval decision
   * Called when a human approves or rejects a task
   */
  async handleApprovalDecision(
    approvalRequestId: string,
    decision: 'approved' | 'rejected' | 'modified',
    feedback?: string
  ): Promise<void> {
    this.logger.info('Handling approval decision', {
      approvalRequestId,
      decision,
    });

    // Find task awaiting this approval
    const taskId = await this.findTaskByApprovalId(approvalRequestId);
    if (!taskId) {
      this.logger.error('No task found for approval', { approvalRequestId });
      return;
    }

    const taskStatus = this.tasks.get(taskId);
    if (!taskStatus) {
      this.logger.error('Task status not found', { taskId });
      return;
    }

    if (decision === 'approved') {
      // Re-submit task for execution (bypassing decision engine)
      const { data: taskData } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskData) {
        const task: TaskRequest = {
          id: taskData.id,
          type: taskData.type,
          priority: taskData.priority,
          data: taskData.data,
          requestedBy: taskData.requested_by,
          timestamp: new Date(taskData.created_at),
          metadata: taskData.metadata,
        };

        // Find agent and execute
        const agent = this.taskTypeToAgent.get(task.type);
        if (agent) {
          taskStatus.status = 'in_progress';
          taskStatus.startedAt = new Date();

          const result = await agent.execute(task);

          taskStatus.status = result.success ? 'completed' : 'failed';
          taskStatus.completedAt = new Date();
          taskStatus.result = result;

          await this.updateTaskInDB(taskId, {
            status: taskStatus.status,
            result: result.data,
            error: result.error,
            completed_at: taskStatus.completedAt.toISOString(),
          });

          this.emit('task:completed', result);
        }
      }
    } else {
      // Rejected
      taskStatus.status = 'failed';
      taskStatus.error = `Rejected: ${feedback || 'No feedback provided'}`;
      taskStatus.completedAt = new Date();

      await this.updateTaskInDB(taskId, {
        status: 'failed',
        error: taskStatus.error,
        completed_at: taskStatus.completedAt.toISOString(),
      });

      this.emit('task:rejected', taskId, feedback);
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    // Check in-memory first
    const status = this.tasks.get(taskId);
    if (status) {
      return status;
    }

    // Fetch from database
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !data) {
      throw new JarvisError(
        ErrorCode.NOT_FOUND,
        'Task not found',
        { taskId }
      );
    }

    return {
      taskId: data.id,
      status: data.status,
      assignedAgent: data.assigned_agent,
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      error: data.error,
      approvalRequestId: data.approval_request_id,
    };
  }

  /**
   * Get system metrics
   */
  async getMetrics(): Promise<SystemMetrics> {
    // Count tasks by status
    const { count: pending } = await this.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: inProgress } = await this.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    const { count: awaitingApproval } = await this.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'awaiting_approval');

    const { count: total } = await this.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });

    // Agent status
    const activeAgents = Array.from(this.agents.values()).filter(
      agent => agent.getStatus().status === 'active'
    );

    return {
      uptime: Date.now() - this.startTime.getTime(),
      tasksProcessed: total || 0,
      tasksInProgress: inProgress || 0,
      tasksPending: pending || 0,
      tasksAwaitingApproval: awaitingApproval || 0,
      agents: {
        total: this.agents.size,
        active: activeAgents.length,
        idle: this.agents.size - activeAgents.length,
      },
    };
  }

  /**
   * Shutdown the orchestrator gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down orchestrator...');
    this.isShuttingDown = true;

    // Wait for in-progress tasks (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();

    while (this.hasInProgressTasks() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.hasInProgressTasks()) {
      this.logger.warn('Shutdown timeout reached with tasks still in progress');
    }

    // Shutdown agents
    for (const agent of this.agents.values()) {
      try {
        await agent.shutdown();
      } catch (error) {
        this.logger.error('Error shutting down agent', {
          agent: agent.getStatus().id,
          error,
        });
      }
    }

    this.emit('orchestrator:shutdown');
    this.logger.info('Orchestrator shutdown complete');
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private validateTask(task: TaskRequest): void {
    if (!task.id) {
      throw new JarvisError(ErrorCode.VALIDATION_ERROR, 'Task ID is required');
    }

    if (!task.type) {
      throw new JarvisError(ErrorCode.VALIDATION_ERROR, 'Task type is required');
    }

    if (!this.taskTypeToAgent.has(task.type)) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        `Unsupported task type: ${task.type}`
      );
    }

    if (task.priority === undefined || task.priority < 0 || task.priority > 3) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Task priority must be 0-3'
      );
    }

    if (!task.requestedBy) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Task requestedBy is required'
      );
    }
  }

  private async loadPendingTasks(): Promise<void> {
    const { data: pendingTasks, error } = await this.supabase
      .from('tasks')
      .select('*')
      .in('status', ['pending', 'in_progress', 'awaiting_approval']);

    if (error) {
      this.logger.error('Failed to load pending tasks', { error });
      return;
    }

    for (const task of pendingTasks || []) {
      this.tasks.set(task.id, {
        taskId: task.id,
        status: task.status,
        assignedAgent: task.assigned_agent,
        startedAt: task.started_at ? new Date(task.started_at) : undefined,
        completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
        approvalRequestId: task.approval_request_id,
      });
    }

    this.logger.info('Loaded pending tasks', { count: pendingTasks?.length || 0 });
  }

  private setupApprovalListener(): void {
    this.approvalQueue.on('approval:responded', async ({ requestId, decision, feedback }) => {
      await this.handleApprovalDecision(requestId, decision, feedback);
    });
  }

  private async updateTaskInDB(taskId: string, updates: Record<string, any>): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      this.logger.error('Failed to update task in database', {
        taskId,
        error: error.message,
      });
    }
  }

  private async findTaskByApprovalId(approvalRequestId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('id')
      .eq('approval_request_id', approvalRequestId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.id;
  }

  private hasInProgressTasks(): boolean {
    return Array.from(this.tasks.values()).some(
      task => task.status === 'in_progress'
    );
  }
}
