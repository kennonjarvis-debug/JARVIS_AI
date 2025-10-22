/**
 * Operations Agent
 *
 * Handles system operations, data synchronization, health monitoring,
 * and analytics generation for the Jarvis autonomous agent system.
 *
 * @module agents/operations-agent
 */

import { BaseAgent } from './base-agent';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TaskRequest, TaskResult, TaskType } from '../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SyncJob {
  id: string;
  type: 'hubspot_contacts' | 'analytics' | 'buffer_metrics' | 'full_system';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  errors?: string[];
  details?: Record<string, any>;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
  details?: Record<string, any>;
}

export interface AnalyticsReport {
  period: {
    start: Date;
    end: Date;
  };
  system: {
    tasksExecuted: number;
    autonomousExecutions: number;
    approvalsRequested: number;
    successRate: number;
  };
  agents?: {
    marketing?: AgentMetrics;
    sales?: AgentMetrics;
    support?: AgentMetrics;
  };
  integrations?: {
    buffer?: IntegrationMetrics;
    hubspot?: IntegrationMetrics;
    email?: IntegrationMetrics;
  };
  generatedAt: Date;
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  avgExecutionTime: number;
  successRate: number;
}

export interface IntegrationMetrics {
  requests: number;
  errors: number;
  avgResponseTime: number;
  uptime: number;
}

// ============================================================================
// OPERATIONS AGENT
// ============================================================================

export class OperationsAgent extends BaseAgent {
  private supabase: SupabaseClient;
  private hubspot?: any;
  private buffer?: any;
  private email?: any;

  constructor(config: any) {
    super(config);

    if (!config.integrations?.supabase) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Supabase integration required for Operations Agent'
      );
    }

    this.supabase = config.integrations.supabase;
    this.hubspot = config.integrations.hubspot;
    this.buffer = config.integrations.buffer;
    this.email = config.integrations.email;
  }

  /**
   * Get supported task types
   */
  getSupportedTaskTypes(): TaskType[] {
    return [
      'ops.sync.data' as TaskType,
      'ops.health.check' as TaskType,
      'ops.analytics.generate' as TaskType,
      'ops.backup.create' as TaskType,
    ];
  }

  /**
   * Check if agent can handle task
   */
  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  /**
   * Execute a task
   */
  async executeTask(task: TaskRequest): Promise<TaskResult> {
    this.logger.info('Operations agent executing task', {
      taskId: task.id,
      type: task.type,
    });

    switch (task.type) {
      case 'ops.data.sync' as TaskType:
        return await this.handleDataSync(task);
      case 'ops.analytics' as TaskType:
        return await this.handleAnalytics(task);
      case 'ops.monitoring' as TaskType:
        return await this.handleHealthCheck(task);
      default:
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Unsupported task type: ${task.type}`
        );
    }
  }

  // ============================================================================
  // DATA SYNCHRONIZATION
  // ============================================================================

  /**
   * Sync data between systems
   */
  async syncData(type: SyncJob['type']): Promise<SyncJob> {
    const job: SyncJob = {
      id: crypto.randomUUID(),
      type,
      status: 'running',
      startedAt: new Date(),
      recordsProcessed: 0,
      errors: [],
      details: {},
    };

    this.logger.info('Starting data sync', { jobId: job.id, type });

    try {
      switch (type) {
        case 'hubspot_contacts':
          await this.syncHubSpotContacts(job);
          break;
        case 'analytics':
          await this.syncAnalytics(job);
          break;
        case 'buffer_metrics':
          await this.syncBufferMetrics(job);
          break;
        case 'full_system':
          await this.syncFullSystem(job);
          break;
      }

      job.status = 'completed';
      job.completedAt = new Date();

      this.logger.info('Data sync completed', {
        jobId: job.id,
        recordsProcessed: job.recordsProcessed,
        duration: job.completedAt.getTime() - job.startedAt.getTime(),
      });
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.errors?.push((error as Error).message);

      this.logger.error('Data sync failed', {
        jobId: job.id,
        error: (error as Error).message,
      });

      throw error;
    }

    // Store job result
    await this.storeSyncJob(job);

    return job;
  }

  /**
   * Sync HubSpot contacts to Supabase
   */
  private async syncHubSpotContacts(job: SyncJob): Promise<void> {
    if (!this.hubspot) {
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'HubSpot not configured'
      );
    }

    // Get recently updated contacts
    const contacts = await this.hubspot.getContacts({
      limit: 100,
      properties: ['email', 'firstname', 'lastname', 'company', 'phone'],
    });

    for (const contact of contacts) {
      try {
        // Upsert to Supabase
        await this.supabase
          .from('hubspot_contacts')
          .upsert({
            hubspot_id: contact.id,
            email: contact.email,
            first_name: contact.firstname,
            last_name: contact.lastname,
            company: contact.company,
            phone: contact.phone,
            raw_data: contact,
            synced_at: new Date().toISOString(),
          });

        job.recordsProcessed++;
      } catch (error) {
        job.errors?.push(`Failed to sync contact ${contact.id}: ${(error as Error).message}`);
      }
    }

    job.details = {
      totalContacts: contacts.length,
      successfulSyncs: job.recordsProcessed,
      failedSyncs: contacts.length - job.recordsProcessed,
    };
  }

  /**
   * Sync analytics data
   */
  private async syncAnalytics(job: SyncJob): Promise<void> {
    // Aggregate task data from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data: tasks, error } = await this.supabase
      .from('tasks')
      .select('*')
      .gte('created_at', yesterday.toISOString());

    if (error) {
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        `Failed to fetch tasks: ${error.message}`
      );
    }

    // Aggregate by agent and status
    const analytics = this.aggregateTaskMetrics(tasks || []);

    // Store analytics snapshot
    await this.supabase
      .from('analytics_snapshots')
      .insert({
        period_start: yesterday.toISOString(),
        period_end: new Date().toISOString(),
        data: analytics,
        created_at: new Date().toISOString(),
      });

    job.recordsProcessed = (tasks || []).length;
    job.details = analytics;
  }

  /**
   * Sync Buffer social media metrics
   */
  private async syncBufferMetrics(job: SyncJob): Promise<void> {
    if (!this.buffer) {
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Buffer not configured'
      );
    }

    // Get recent posts and their analytics
    const profiles = await this.buffer.getProfiles();

    for (const profile of profiles) {
      const updates = await this.buffer.getUpdates(profile.id, {
        count: 50,
      });

      for (const update of updates) {
        try {
          await this.supabase
            .from('social_media_metrics')
            .upsert({
              platform: profile.service,
              post_id: update.id,
              posted_at: update.sent_at,
              likes: update.statistics?.likes || 0,
              comments: update.statistics?.comments || 0,
              shares: update.statistics?.shares || 0,
              reach: update.statistics?.reach || 0,
              synced_at: new Date().toISOString(),
            });

          job.recordsProcessed++;
        } catch (error) {
          job.errors?.push(`Failed to sync update ${update.id}: ${(error as Error).message}`);
        }
      }
    }
  }

  /**
   * Sync all systems
   */
  private async syncFullSystem(job: SyncJob): Promise<void> {
    const subJobs: string[] = [];

    if (this.hubspot) {
      await this.syncHubSpotContacts(job);
      subJobs.push('hubspot_contacts');
    }

    if (this.buffer) {
      await this.syncBufferMetrics(job);
      subJobs.push('buffer_metrics');
    }

    await this.syncAnalytics(job);
    subJobs.push('analytics');

    job.details = { completedSyncs: subJobs };
  }

  // ============================================================================
  // HEALTH CHECKS
  // ============================================================================

  /**
   * Check health of all integrations
   */
  async checkSystemHealth(): Promise<HealthCheck[]> {
    this.logger.info('Starting system health check');

    const checks: HealthCheck[] = [];

    // Always check Supabase
    checks.push(await this.checkSupabaseHealth());

    // Check optional integrations
    if (this.hubspot) {
      checks.push(await this.checkHubSpotHealth());
    }

    if (this.buffer) {
      checks.push(await this.checkBufferHealth());
    }

    if (this.email) {
      checks.push(await this.checkEmailHealth());
    }

    // Check Anthropic API
    checks.push(await this.checkAnthropicHealth());

    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    this.logger.info('Health check complete', {
      total: checks.length,
      healthy: healthyCount,
      issues: checks.length - healthyCount,
    });

    // Store health check results
    await this.storeHealthChecks(checks);

    return checks;
  }

  /**
   * Check Supabase health
   */
  private async checkSupabaseHealth(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      // Simple query to verify connection
      await this.supabase
        .from('tasks')
        .select('id')
        .limit(1);

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

  /**
   * Check HubSpot health
   */
  private async checkHubSpotHealth(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      await this.hubspot.getContacts({ limit: 1 });

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

  /**
   * Check Buffer health
   */
  private async checkBufferHealth(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      await this.buffer.getProfiles();

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

  /**
   * Check Email service health
   */
  private async checkEmailHealth(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      // Health check without sending email
      const healthy = await this.email.healthCheck();

      return {
        service: 'Email (Brevo)',
        status: healthy ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        service: 'Email (Brevo)',
        status: 'down',
        lastCheck: new Date(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check Anthropic API health
   */
  private async checkAnthropicHealth(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      // Simple test query
      await this.generateContent('Health check. Respond with "OK".');

      return {
        service: 'Anthropic API',
        status: 'healthy',
        responseTime: Date.now() - start,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        service: 'Anthropic API',
        status: 'down',
        lastCheck: new Date(),
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Generate analytics report
   */
  async generateAnalytics(period: { start: Date; end: Date }): Promise<AnalyticsReport> {
    this.logger.info('Generating analytics report', { period });

    // Fetch all tasks in period
    const { data: tasks, error } = await this.supabase
      .from('tasks')
      .select('*')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());

    if (error) {
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        `Failed to fetch tasks: ${error.message}`
      );
    }

    // Aggregate system metrics
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed') || [];
    const failedTasks = tasks?.filter(t => t.status === 'failed') || [];
    const approvalsRequested = tasks?.filter(t => t.status === 'pending_approval') || [];

    const report: AnalyticsReport = {
      period,
      system: {
        tasksExecuted: totalTasks,
        autonomousExecutions: completedTasks.length,
        approvalsRequested: approvalsRequested.length,
        successRate: totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0,
      },
      generatedAt: new Date(),
    };

    // Store report
    await this.supabase
      .from('analytics_reports')
      .insert({
        period_start: period.start.toISOString(),
        period_end: period.end.toISOString(),
        data: report,
        created_at: new Date().toISOString(),
      });

    return report;
  }

  // ============================================================================
  // TASK HANDLERS
  // ============================================================================

  private async handleDataSync(task: TaskRequest): Promise<TaskResult> {
    const { type } = task.data;
    const job = await this.syncData(type);

    return {
      taskId: task.id,
      success: job.status === 'completed',
      status: job.status === 'completed' ? 'completed' : 'failed',
      data: job,
      timestamp: new Date(),
      executedBy: this.id,
      message: `Data sync ${job.status}: ${job.recordsProcessed} records`,
    };
  }

  private async handleHealthCheck(task: TaskRequest): Promise<TaskResult> {
    const checks = await this.checkSystemHealth();
    const unhealthyServices = checks.filter(c => c.status !== 'healthy');

    return {
      taskId: task.id,
      success: unhealthyServices.length === 0,
      status: 'completed',
      data: {
        checks,
        summary: {
          total: checks.length,
          healthy: checks.filter(c => c.status === 'healthy').length,
          degraded: checks.filter(c => c.status === 'degraded').length,
          down: checks.filter(c => c.status === 'down').length,
        },
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: `Health check: ${checks.length - unhealthyServices.length}/${checks.length} services healthy`,
    };
  }

  private async handleAnalytics(task: TaskRequest): Promise<TaskResult> {
    const { period } = task.data;
    const report = await this.generateAnalytics(period);

    return {
      taskId: task.id,
      success: true,
      status: 'completed',
      data: report,
      timestamp: new Date(),
      executedBy: this.id,
      message: `Analytics generated: ${report.system.tasksExecuted} tasks analyzed`,
    };
  }

  private async handleBackup(task: TaskRequest): Promise<TaskResult> {
    // Placeholder for backup functionality
    this.logger.info('Backup requested', { taskId: task.id });

    return {
      taskId: task.id,
      success: true,
      status: 'completed',
      data: { message: 'Backup functionality not yet implemented' },
      timestamp: new Date(),
      executedBy: this.id,
      message: 'Backup task acknowledged',
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private aggregateTaskMetrics(tasks: any[]): Record<string, any> {
    const byAgent: Record<string, { completed: number; failed: number }> = {};
    const byType: Record<string, number> = {};

    for (const task of tasks) {
      // By agent
      const agent = task.agent_id || 'unknown';
      if (!byAgent[agent]) {
        byAgent[agent] = { completed: 0, failed: 0 };
      }
      if (task.status === 'completed') byAgent[agent].completed++;
      if (task.status === 'failed') byAgent[agent].failed++;

      // By type
      byType[task.type] = (byType[task.type] || 0) + 1;
    }

    return {
      totalTasks: tasks.length,
      byAgent,
      byType,
      aggregatedAt: new Date().toISOString(),
    };
  }

  private async storeSyncJob(job: SyncJob): Promise<void> {
    try {
      await this.supabase
        .from('sync_jobs')
        .insert({
          id: job.id,
          type: job.type,
          status: job.status,
          started_at: job.startedAt.toISOString(),
          completed_at: job.completedAt?.toISOString(),
          records_processed: job.recordsProcessed,
          errors: job.errors,
          details: job.details,
        });
    } catch (error) {
      this.logger.error('Failed to store sync job', {
        jobId: job.id,
        error: (error as Error).message,
      });
    }
  }

  private async storeHealthChecks(checks: HealthCheck[]): Promise<void> {
    try {
      await this.supabase
        .from('health_checks')
        .insert(
          checks.map(check => ({
            service: check.service,
            status: check.status,
            response_time: check.responseTime,
            error: check.error,
            checked_at: check.lastCheck.toISOString(),
          }))
        );
    } catch (error) {
      this.logger.error('Failed to store health checks', {
        error: (error as Error).message,
      });
    }
  }
}
