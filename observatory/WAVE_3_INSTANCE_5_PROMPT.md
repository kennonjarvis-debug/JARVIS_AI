# Wave 3 - Instance 5: Operations Agent & Orchestrator (Prompt 15)

**Assigned Component:** Operations Agent + Central Orchestrator
**Estimated Time:** 8 hours
**Dependencies:** ✅ ALL Agents (P13-14), ✅ Decision Engine (P12), ✅ All Integrations, ✅ All Core Systems
**Priority:** CRITICAL - Final integration piece that ties everything together

---

## Your Task

Build the OperationsAgent (system management) and the Orchestrator (central coordination system). This is the final piece that completes the entire Jarvis autonomous system.

---

## Context

**Prompt 15: Operations Agent & Orchestrator** - System completion

**Already complete:** Everything except this

**You're building:**
1. **OperationsAgent** - Data sync, monitoring, analytics, backups
2. **Orchestrator** - Central coordinator for all agents and tasks

**Critical:** This is the **final Wave 3 component** that brings the entire system together.

---

## API Contract

See `JARVIS_DESIGN_AND_PROMPTS.md` sections:
- **"1. Core: Orchestrator"**
- **"8. Agents: Operations Agent"**

### Orchestrator Interface

```typescript
export interface OrchestratorConfig {
  agents: BaseAgent[];
  integrations: {
    supabase: SupabaseClient;
    buffer?: BufferAdapter;
    hubspot?: HubSpotAdapter;
    email?: EmailAdapter;
    n8n?: N8nAdapter;
  };
  decisionEngine: DecisionEngine;
  approvalQueue: ApprovalQueue;
  memory: MemorySystem;
}

export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'in_progress' | 'awaiting_approval' | 'completed' | 'failed';
  assignedAgent?: string;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
  error?: string;
}

export class Orchestrator extends EventEmitter {
  constructor(config: OrchestratorConfig);

  async initialize(): Promise<void>;
  async submitTask(task: TaskRequest): Promise<string>;
  async getTaskStatus(taskId: string): Promise<TaskStatus>;
  async cancelTask(taskId: string): Promise<void>;
  async shutdown(): Promise<void>;

  // Event handlers
  on(event: 'task:submitted', listener: (task: TaskRequest) => void): this;
  on(event: 'task:started', listener: (taskId: string, agentId: string) => void): this;
  on(event: 'task:completed', listener: (result: TaskResult) => void): this;
  on(event: 'task:failed', listener: (taskId: string, error: Error) => void): this;
  on(event: 'task:approval_required', listener: (taskId: string, requestId: string) => void): this;
}
```

### OperationsAgent Interface

```typescript
export interface SyncJob {
  id: string;
  type: 'hubspot_contacts' | 'analytics' | 'full_sync';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  recordsProcessed?: number;
  errors?: string[];
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

export interface AnalyticsReport {
  period: { start: Date; end: Date };
  marketing: {
    socialPosts: number;
    totalReach: number;
    totalEngagement: number;
  };
  sales: {
    leadsQualified: number;
    dealsCreated: number;
    pipelineValue: number;
  };
  support: {
    ticketsReceived: number;
    ticketsResolved: number;
    avgResponseTime: number;
  };
  system: {
    tasksExecuted: number;
    autonomousExecutions: number;
    approvalsRequested: number;
  };
}

export class OperationsAgent extends BaseAgent {
  async syncData(type: 'hubspot_contacts' | 'analytics' | 'full_sync'): Promise<SyncJob>;
  async checkSystemHealth(): Promise<HealthCheck[]>;
  async generateAnalytics(period: { start: Date; end: Date }): Promise<AnalyticsReport>;
  async createBackup(): Promise<{ backupId: string; size: number }>;
  async handleAlert(alert: SystemAlert): Promise<void>;

  // Overrides from BaseAgent
  getSupportedTaskTypes(): TaskType[];
  canHandle(task: TaskRequest): boolean;
  executeTask(task: TaskRequest): Promise<TaskResult>;
}
```

---

## Implementation

### Part 1: Operations Agent

#### 1. Create `src/agents/operations-agent.ts`

**Operations-specific automation:**

```typescript
import { BaseAgent } from './base-agent';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HubSpotAdapter } from '../integrations/hubspot';
import type { BufferAdapter } from '../integrations/buffer';
import type { EmailAdapter } from '../integrations/email';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks';
import { JarvisError, ErrorCode } from '../utils/error-handler';

export interface SyncJob {
  id: string;
  type: 'hubspot_contacts' | 'analytics' | 'full_sync';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  recordsProcessed?: number;
  errors?: string[];
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

export interface AnalyticsReport {
  period: { start: Date; end: Date };
  marketing: any;
  sales: any;
  support: any;
  system: any;
}

export class OperationsAgent extends BaseAgent {
  private supabase: SupabaseClient;
  private hubspot?: HubSpotAdapter;
  private buffer?: BufferAdapter;
  private email?: EmailAdapter;

  constructor(config: any) {
    super(config);

    if (!config.integrations.supabase) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'OperationsAgent requires Supabase integration',
        { agentId: config.id },
        false
      );
    }

    this.supabase = config.integrations.supabase;
    this.hubspot = config.integrations.hubspot;
    this.buffer = config.integrations.buffer;
    this.email = config.integrations.email;
  }

  getSupportedTaskTypes(): TaskType[] {
    return [
      'ops.sync.data' as TaskType,
      'ops.health.check' as TaskType,
      'ops.analytics.generate' as TaskType,
      'ops.backup.create' as TaskType,
      'ops.alert.handle' as TaskType,
    ];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    this.logger.info('Executing operations task', {
      taskId: task.id,
      type: task.type,
    });

    switch (task.type) {
      case 'ops.sync.data':
        return await this.syncDataTask(task.data.type);

      case 'ops.health.check':
        return await this.healthCheckTask();

      case 'ops.analytics.generate':
        return await this.generateAnalyticsTask(task.data.period);

      case 'ops.backup.create':
        return await this.createBackupTask();

      case 'ops.alert.handle':
        return await this.handleAlertTask(task.data.alert);

      default:
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Unsupported task type: ${task.type}`,
          { taskId: task.id },
          false
        );
    }
  }

  /**
   * Sync data between systems
   */
  async syncData(
    type: 'hubspot_contacts' | 'analytics' | 'full_sync'
  ): Promise<SyncJob> {
    const job: SyncJob = {
      id: crypto.randomUUID(),
      type,
      status: 'running',
      startedAt: new Date(),
      recordsProcessed: 0,
      errors: [],
    };

    try {
      switch (type) {
        case 'hubspot_contacts':
          await this.syncHubSpotContacts(job);
          break;

        case 'analytics':
          await this.syncAnalytics(job);
          break;

        case 'full_sync':
          await this.syncHubSpotContacts(job);
          await this.syncAnalytics(job);
          break;
      }

      job.status = 'completed';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.errors?.push((error as Error).message);
      this.logger.error('Sync job failed', { job, error });
    }

    return job;
  }

  private async syncHubSpotContacts(job: SyncJob): Promise<void> {
    if (!this.hubspot) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'HubSpot integration not configured',
        {},
        false
      );
    }

    // Fetch contacts from HubSpot
    const contacts = await this.hubspot.searchContacts({
      properties: ['email', 'firstname', 'lastname', 'company'],
      filters: [],
    });

    // Upsert into Supabase
    for (const contact of contacts.results) {
      try {
        await this.supabase.from('contacts').upsert({
          hubspot_id: contact.id,
          email: contact.properties.email,
          first_name: contact.properties.firstname,
          last_name: contact.properties.lastname,
          company: contact.properties.company,
          synced_at: new Date().toISOString(),
        });

        job.recordsProcessed = (job.recordsProcessed || 0) + 1;
      } catch (error) {
        job.errors?.push(`Failed to sync contact ${contact.id}: ${error}`);
      }
    }

    this.logger.info('HubSpot contacts synced', {
      processed: job.recordsProcessed,
      errors: job.errors?.length,
    });
  }

  private async syncAnalytics(job: SyncJob): Promise<void> {
    // Aggregate analytics from all sources
    const analytics: any = {};

    // Buffer analytics
    if (this.buffer) {
      // Would fetch from Buffer API
      analytics.buffer = {};
    }

    // Store in Supabase
    await this.supabase.from('analytics_snapshots').insert({
      id: crypto.randomUUID(),
      data: analytics,
      created_at: new Date().toISOString(),
    });

    job.recordsProcessed = (job.recordsProcessed || 0) + 1;
  }

  private async syncDataTask(type: string): Promise<TaskResult> {
    const job = await this.syncData(type as any);

    return {
      taskId: crypto.randomUUID(),
      success: job.status === 'completed',
      status: 'completed',
      data: job,
      timestamp: new Date(),
      executedBy: this.id,
      message: `Data sync ${job.status}: ${job.recordsProcessed} records`,
    };
  }

  /**
   * Check health of all integrations
   */
  async checkSystemHealth(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Supabase
    checks.push(await this.checkSupabaseHealth());

    // HubSpot
    if (this.hubspot) {
      checks.push(await this.checkHubSpotHealth());
    }

    // Buffer
    if (this.buffer) {
      checks.push(await this.checkBufferHealth());
    }

    // Email
    if (this.email) {
      checks.push(await this.checkEmailHealth());
    }

    return checks;
  }

  private async checkSupabaseHealth(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.supabase.from('health_check').select('*').limit(1);
      return {
        service: 'Supabase',
        status: 'healthy',
        responseTime: Date.now() - start,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        service: 'Supabase',
        status: 'down',
        lastCheck: new Date(),
        error: (error as Error).message,
      };
    }
  }

  private async checkHubSpotHealth(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.hubspot!.searchContacts({ properties: ['email'], filters: [] });
      return {
        service: 'HubSpot',
        status: 'healthy',
        responseTime: Date.now() - start,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        service: 'HubSpot',
        status: 'down',
        lastCheck: new Date(),
        error: (error as Error).message,
      };
    }
  }

  private async checkBufferHealth(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.buffer!.getProfiles();
      return {
        service: 'Buffer',
        status: 'healthy',
        responseTime: Date.now() - start,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        service: 'Buffer',
        status: 'down',
        lastCheck: new Date(),
        error: (error as Error).message,
      };
    }
  }

  private async checkEmailHealth(): Promise<HealthCheck> {
    // Email doesn't have a health endpoint, assume healthy if configured
    return {
      service: 'Email',
      status: 'healthy',
      lastCheck: new Date(),
    };
  }

  private async healthCheckTask(): Promise<TaskResult> {
    const checks = await this.checkSystemHealth();

    const allHealthy = checks.every((c) => c.status === 'healthy');

    return {
      taskId: crypto.randomUUID(),
      success: allHealthy,
      status: 'completed',
      data: { checks },
      timestamp: new Date(),
      executedBy: this.id,
      message: `System health: ${allHealthy ? 'All systems healthy' : 'Some systems down'}`,
    };
  }

  /**
   * Generate analytics report
   */
  async generateAnalytics(period: {
    start: Date;
    end: Date;
  }): Promise<AnalyticsReport> {
    // Fetch data from memory/Supabase
    const { data: tasks } = await this.supabase
      .from('task_executions')
      .select('*')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());

    // Aggregate metrics
    const report: AnalyticsReport = {
      period,
      marketing: {
        socialPosts: 0,
        totalReach: 0,
        totalEngagement: 0,
      },
      sales: {
        leadsQualified: 0,
        dealsCreated: 0,
        pipelineValue: 0,
      },
      support: {
        ticketsReceived: 0,
        ticketsResolved: 0,
        avgResponseTime: 0,
      },
      system: {
        tasksExecuted: tasks?.length || 0,
        autonomousExecutions: tasks?.filter((t: any) => !t.required_approval).length || 0,
        approvalsRequested: tasks?.filter((t: any) => t.required_approval).length || 0,
      },
    };

    return report;
  }

  private async generateAnalyticsTask(period: {
    start: Date;
    end: Date;
  }): Promise<TaskResult> {
    const report = await this.generateAnalytics(period);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: report,
      timestamp: new Date(),
      executedBy: this.id,
      message: 'Analytics report generated',
    };
  }

  /**
   * Create system backup
   */
  async createBackup(): Promise<{ backupId: string; size: number }> {
    // Export all data from Supabase
    const backupId = `backup_${Date.now()}`;

    // Would implement actual backup logic here
    this.logger.info('Backup created', { backupId });

    return {
      backupId,
      size: 0, // Would calculate actual size
    };
  }

  private async createBackupTask(): Promise<TaskResult> {
    const backup = await this.createBackup();

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: backup,
      timestamp: new Date(),
      executedBy: this.id,
      message: `Backup created: ${backup.backupId}`,
    };
  }

  /**
   * Handle system alert
   */
  async handleAlert(alert: any): Promise<void> {
    this.logger.warn('System alert received', { alert });

    // Store in Supabase
    await this.supabase.from('system_alerts').insert({
      id: crypto.randomUUID(),
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      data: alert.data,
      created_at: new Date().toISOString(),
    });

    // Send notification if critical
    if (alert.severity === 'critical' && this.email) {
      await this.email.sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@dawgai.com',
        subject: `🚨 Critical Alert: ${alert.type}`,
        html: `<h2>Critical System Alert</h2><p>${alert.message}</p><pre>${JSON.stringify(alert.data, null, 2)}</pre>`,
      });
    }
  }

  private async handleAlertTask(alert: any): Promise<TaskResult> {
    await this.handleAlert(alert);

    return {
      taskId: crypto.randomUUID(),
      success: true,
      status: 'completed',
      data: { alertId: alert.id },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Alert handled: ${alert.type}`,
    };
  }
}
```

---

### Part 2: Orchestrator

#### 2. Create `src/core/orchestrator.ts`

**Central coordination system:**

```typescript
import { EventEmitter } from 'events';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import type { BaseAgent } from '../agents/base-agent';
import type { DecisionEngine } from './decision-engine';
import type { ApprovalQueue } from './approval-queue';
import type { MemorySystem } from './memory';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks';

export interface OrchestratorConfig {
  agents: BaseAgent[];
  integrations: {
    supabase: SupabaseClient;
    [key: string]: any;
  };
  decisionEngine: DecisionEngine;
  approvalQueue: ApprovalQueue;
  memory: MemorySystem;
}

export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'in_progress' | 'awaiting_approval' | 'completed' | 'failed';
  assignedAgent?: string;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
  error?: string;
}

export class Orchestrator extends EventEmitter {
  private logger: Logger;
  private agents: Map<string, BaseAgent>;
  private taskTypeToAgent: Map<TaskType, BaseAgent>;
  private tasks: Map<string, TaskStatus>;
  private supabase: SupabaseClient;
  private decisionEngine: DecisionEngine;
  private approvalQueue: ApprovalQueue;
  private memory: MemorySystem;
  private initialized: boolean = false;
  private shuttingDown: boolean = false;

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

    // Register agents
    for (const agent of config.agents) {
      this.registerAgent(agent);
    }
  }

  /**
   * Initialize orchestrator
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing orchestrator');

    // Load pending tasks from database
    const { data: pendingTasks } = await this.supabase
      .from('tasks')
      .select('*')
      .in('status', ['pending', 'in_progress']);

    if (pendingTasks) {
      for (const task of pendingTasks) {
        this.tasks.set(task.id, {
          taskId: task.id,
          status: task.status,
          assignedAgent: task.assigned_agent,
          startedAt: task.started_at ? new Date(task.started_at) : undefined,
        });
      }
    }

    this.initialized = true;
    this.logger.info('Orchestrator initialized', {
      agents: this.agents.size,
      pendingTasks: this.tasks.size,
    });
  }

  /**
   * Register an agent
   */
  private registerAgent(agent: BaseAgent): void {
    const agentStatus = agent.getStatus();
    this.agents.set(agentStatus.id, agent);

    // Map task types to agent
    const supportedTypes = agent.getSupportedTaskTypes();
    for (const taskType of supportedTypes) {
      this.taskTypeToAgent.set(taskType, agent);
    }

    this.logger.info('Agent registered', {
      agentId: agentStatus.id,
      name: agentStatus.name,
      taskTypes: supportedTypes,
    });
  }

  /**
   * Submit a task for execution
   */
  async submitTask(task: TaskRequest): Promise<string> {
    if (!this.initialized) {
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Orchestrator not initialized',
        {},
        false
      );
    }

    if (this.shuttingDown) {
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Orchestrator is shutting down',
        {},
        false
      );
    }

    this.logger.info('Task submitted', { taskId: task.id, type: task.type });

    // Store task in database
    await this.supabase.from('tasks').insert({
      id: task.id,
      type: task.type,
      priority: task.priority,
      data: task.data,
      requested_by: task.requestedBy,
      status: 'pending',
      created_at: task.timestamp.toISOString(),
    });

    // Create task status
    const taskStatus: TaskStatus = {
      taskId: task.id,
      status: 'pending',
    };
    this.tasks.set(task.id, taskStatus);

    // Emit event
    this.emit('task:submitted', task);

    // Execute async
    this.executeTask(task).catch((error) => {
      this.logger.error('Task execution failed', { taskId: task.id, error });
      this.emit('task:failed', task.id, error);
    });

    return task.id;
  }

  /**
   * Execute a task
   */
  private async executeTask(task: TaskRequest): Promise<void> {
    const taskStatus = this.tasks.get(task.id);
    if (!taskStatus) return;

    try {
      // Find appropriate agent
      const agent = this.taskTypeToAgent.get(task.type);
      if (!agent) {
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `No agent found for task type: ${task.type}`,
          { taskType: task.type },
          false
        );
      }

      // Update status
      taskStatus.status = 'in_progress';
      taskStatus.assignedAgent = agent.getStatus().id;
      taskStatus.startedAt = new Date();

      await this.updateTaskInDB(task.id, {
        status: 'in_progress',
        assigned_agent: agent.getStatus().id,
        started_at: taskStatus.startedAt.toISOString(),
      });

      this.emit('task:started', task.id, agent.getStatus().id);

      // Execute task through agent
      const result = await agent.execute(task);

      // Check if approval required
      if (result.status === 'awaiting_approval') {
        taskStatus.status = 'awaiting_approval';
        taskStatus.result = result;

        await this.updateTaskInDB(task.id, {
          status: 'awaiting_approval',
        });

        this.emit('task:approval_required', task.id, result.data.requestId);
        return;
      }

      // Task completed
      taskStatus.status = 'completed';
      taskStatus.completedAt = new Date();
      taskStatus.result = result;

      await this.updateTaskInDB(task.id, {
        status: 'completed',
        completed_at: taskStatus.completedAt.toISOString(),
        result: result,
      });

      this.emit('task:completed', result);

      this.logger.info('Task completed', {
        taskId: task.id,
        agentId: agent.getStatus().id,
        success: result.success,
      });
    } catch (error) {
      taskStatus.status = 'failed';
      taskStatus.completedAt = new Date();
      taskStatus.error = (error as Error).message;

      await this.updateTaskInDB(task.id, {
        status: 'failed',
        completed_at: taskStatus.completedAt.toISOString(),
        error: (error as Error).message,
      });

      this.emit('task:failed', task.id, error);

      throw error;
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
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
        { taskId },
        false
      );
    }

    return {
      taskId: data.id,
      status: data.status,
      assignedAgent: data.assigned_agent,
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      result: data.result,
      error: data.error,
    };
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    const taskStatus = this.tasks.get(taskId);
    if (!taskStatus) {
      throw new JarvisError(
        ErrorCode.NOT_FOUND,
        'Task not found',
        { taskId },
        false
      );
    }

    if (taskStatus.status === 'completed' || taskStatus.status === 'failed') {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Cannot cancel completed or failed task',
        { taskId, status: taskStatus.status },
        false
      );
    }

    taskStatus.status = 'failed';
    taskStatus.error = 'Cancelled by user';

    await this.updateTaskInDB(taskId, {
      status: 'failed',
      error: 'Cancelled by user',
    });

    this.logger.info('Task cancelled', { taskId });
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down orchestrator');
    this.shuttingDown = true;

    // Wait for in-progress tasks to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const inProgress = Array.from(this.tasks.values()).filter(
        (t) => t.status === 'in_progress'
      );

      if (inProgress.length === 0) break;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.logger.info('Orchestrator shutdown complete');
  }

  /**
   * Update task in database
   */
  private async updateTaskInDB(taskId: string, updates: any): Promise<void> {
    await this.supabase.from('tasks').update(updates).eq('id', taskId);
  }
}
```

---

#### 3. Create `src/index.ts` (Main Entry Point)

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { Orchestrator } from './core/orchestrator';
import { DecisionEngine } from './core/decision-engine';
import { MemorySystem } from './core/memory';
import { ApprovalQueue } from './core/approval-queue';
import { MarketingAgent } from './agents/marketing-agent';
import { SalesAgent } from './agents/sales-agent';
import { SupportAgent } from './agents/support-agent';
import { OperationsAgent } from './agents/operations-agent';
import { BufferAdapter } from './integrations/buffer';
import { HubSpotAdapter } from './integrations/hubspot';
import { EmailAdapter } from './integrations/email';
import { Logger } from './utils/logger';
import decisionRules from '../config/decision-rules.json';

// Load environment
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Initialize Jarvis autonomous system
 */
export async function initializeJarvis() {
  const logger = new Logger('Jarvis');
  logger.info('Initializing Jarvis autonomous system');

  // 1. Initialize Anthropic client
  const anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // 2. Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 3. Initialize integrations
  const buffer = new BufferAdapter({
    accessToken: process.env.BUFFER_ACCESS_TOKEN!,
    profileIds: {
      twitter: process.env.BUFFER_TWITTER_PROFILE_ID!,
      linkedin: process.env.BUFFER_LINKEDIN_PROFILE_ID!,
    },
  });

  const hubspot = new HubSpotAdapter({
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
    portalId: process.env.HUBSPOT_PORTAL_ID!,
  });

  const email = new EmailAdapter({
    provider: 'sendgrid',
    apiKey: process.env.SENDGRID_API_KEY!,
    fromAddress: process.env.EMAIL_FROM_ADDRESS!,
    fromName: process.env.EMAIL_FROM_NAME!,
  });

  // 4. Initialize core systems
  const memory = new MemorySystem(supabase);

  const approvalQueue = new ApprovalQueue(supabase, [
    {
      type: 'discord',
      config: { webhookUrl: process.env.DISCORD_WEBHOOK_URL },
      enabled: !!process.env.DISCORD_WEBHOOK_URL,
      priority: 1,
    },
  ]);

  const decisionEngine = new DecisionEngine(
    decisionRules.rules as any,
    anthropicClient,
    memory,
    approvalQueue
  );

  // 5. Initialize agents
  const marketingAgent = new MarketingAgent({
    id: 'marketing-agent',
    name: 'Marketing Agent',
    capabilities: [
      {
        id: 'social-posting',
        name: 'Social Media Posting',
        description: 'Create and schedule social media posts',
        requiredIntegrations: ['buffer'],
      },
    ],
    integrations: { buffer, email },
    llmClient: anthropicClient,
    decisionEngine,
    memory,
    approvalQueue,
  });

  const salesAgent = new SalesAgent({
    id: 'sales-agent',
    name: 'Sales Agent',
    capabilities: [
      {
        id: 'lead-qualification',
        name: 'Lead Qualification',
        description: 'Qualify and score leads',
        requiredIntegrations: ['hubspot'],
      },
    ],
    integrations: { hubspot, email, supabase },
    llmClient: anthropicClient,
    decisionEngine,
    memory,
    approvalQueue,
  });

  const supportAgent = new SupportAgent({
    id: 'support-agent',
    name: 'Support Agent',
    capabilities: [
      {
        id: 'ticket-routing',
        name: 'Ticket Routing',
        description: 'Route and respond to support tickets',
        requiredIntegrations: ['hubspot', 'email'],
      },
    ],
    integrations: { hubspot, email, supabase },
    llmClient: anthropicClient,
    decisionEngine,
    memory,
    approvalQueue,
  });

  const opsAgent = new OperationsAgent({
    id: 'operations-agent',
    name: 'Operations Agent',
    capabilities: [
      {
        id: 'data-sync',
        name: 'Data Synchronization',
        description: 'Sync data between systems',
        requiredIntegrations: ['supabase'],
      },
    ],
    integrations: { supabase, hubspot, buffer, email },
    llmClient: anthropicClient,
    decisionEngine,
    memory,
    approvalQueue,
  });

  // 6. Initialize orchestrator
  const orchestrator = new Orchestrator({
    agents: [marketingAgent, salesAgent, supportAgent, opsAgent],
    integrations: { supabase, buffer, hubspot, email },
    decisionEngine,
    approvalQueue,
    memory,
  });

  await orchestrator.initialize();

  logger.info('Jarvis initialization complete');

  return {
    orchestrator,
    agents: {
      marketing: marketingAgent,
      sales: salesAgent,
      support: supportAgent,
      operations: opsAgent,
    },
    systems: {
      decisionEngine,
      memory,
      approvalQueue,
    },
  };
}

// Export for use in other modules
export { Orchestrator } from './core/orchestrator';
export { DecisionEngine } from './core/decision-engine';
export { MemorySystem } from './core/memory';
export { ApprovalQueue } from './core/approval-queue';
export * from './agents';
export * from './integrations';
export * from './types';

// Main entry point
if (require.main === module) {
  initializeJarvis()
    .then(({ orchestrator }) => {
      console.log('🤖 Jarvis is now running!');

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('Shutting down Jarvis...');
        await orchestrator.shutdown();
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('Failed to initialize Jarvis:', error);
      process.exit(1);
    });
}
```

---

### 4. Create Tests

**`src/agents/operations-agent.test.ts`:**
- Data sync operations
- Health checks
- Analytics generation
- Backup creation
- Alert handling

**`src/core/orchestrator.test.ts`:**
- Task submission
- Task routing
- Status tracking
- Event emission
- Shutdown handling

---

### 5. Create `docs/orchestration.md`

**Documentation covering:**
- System architecture overview
- Orchestrator functionality
- Agent coordination
- Task lifecycle
- Event system
- Deployment guide
- Configuration reference

---

## Output Files

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/agents/operations-agent.ts` | Operations agent | ~500 |
| `src/core/orchestrator.ts` | Central orchestrator | ~600 |
| `src/index.ts` | Main entry point | ~200 |
| `src/agents/operations-agent.test.ts` | Ops tests | ~350 |
| `src/core/orchestrator.test.ts` | Orchestrator tests | ~400 |
| `docs/orchestration.md` | Documentation | ~400 |

**Total:** ~2,450 lines

---

## Acceptance Criteria

- [ ] OperationsAgent with all features
- [ ] Orchestrator with task routing
- [ ] Event system functional
- [ ] Agent lifecycle management
- [ ] Main entry point created
- [ ] Graceful shutdown
- [ ] Health monitoring
- [ ] Data synchronization
- [ ] Analytics generation
- [ ] Integration tests pass
- [ ] Test coverage >80%
- [ ] Documentation complete
- [ ] Full system demo working

---

## Testing Commands

```bash
npm test src/agents/operations-agent.test.ts
npm test src/core/orchestrator.test.ts
npm run test:coverage
npm run typecheck
npm run build
```

---

## Final Integration Test

```typescript
import { initializeJarvis } from './src';
import { TaskType, Priority } from './src/types/tasks';

async function demo() {
  const { orchestrator } = await initializeJarvis();

  // Submit a social post task
  const taskId = await orchestrator.submitTask({
    id: crypto.randomUUID(),
    type: TaskType.MARKETING_SOCIAL_POST,
    priority: Priority.MEDIUM,
    data: {
      platform: 'twitter',
      topic: 'New feature release',
      targetAudience: 'music producers',
    },
    requestedBy: 'demo',
    timestamp: new Date(),
  });

  console.log('Task submitted:', taskId);

  // Monitor status
  orchestrator.on('task:completed', (result) => {
    console.log('Task completed:', result);
  });

  // Check status
  const status = await orchestrator.getTaskStatus(taskId);
  console.log('Task status:', status);
}
```

---

**Start Time:** After Instances 2-4 are complete
**Expected Completion:** 8 hours
**Final Step:** This completes the entire Jarvis system!

---

🎉 **Build the final piece that brings Jarvis to life!**
