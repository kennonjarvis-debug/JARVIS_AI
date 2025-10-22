/**
 * Supabase Integration Adapter
 *
 * Provides data persistence layer for Jarvis autonomous agent system.
 * Handles tasks, memories, approvals, and decision rules storage.
 *
 * @module integrations/supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPE DEFINITIONS
// Note: These types will eventually be imported from src/types/
// For now, they're defined locally to avoid circular dependencies during parallel development
// ============================================================================

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

export enum TaskType {
  MARKETING_SOCIAL_POST = 'marketing.social.post',
  MARKETING_CONTENT_CREATE = 'marketing.content.create',
  MARKETING_EMAIL_CAMPAIGN = 'marketing.email.campaign',
  SALES_LEAD_QUALIFY = 'sales.lead.qualify',
  SALES_OUTREACH = 'sales.outreach',
  SALES_FOLLOW_UP = 'sales.follow_up',
  OPS_DATA_SYNC = 'ops.data.sync',
  OPS_ANALYTICS = 'ops.analytics',
  OPS_MONITORING = 'ops.monitoring',
  SUPPORT_TICKET_RESPOND = 'support.ticket.respond',
  SUPPORT_TICKET_ROUTE = 'support.ticket.route',
  SUPPORT_KB_UPDATE = 'support.kb.update',
}

export enum Priority {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

export interface TaskRequest {
  id: string;
  type: TaskType;
  priority: Priority;
  data: Record<string, any>;
  requestedBy: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TaskResult {
  taskId: string;
  status: 'completed' | 'failed' | 'pending_approval' | 'in_progress' | 'pending';
  result?: any;
  error?: string;
  timestamp: Date;
  agentId: string;
}

export enum MemoryType {
  TASK_EXECUTION = 'task_execution',
  USER_FEEDBACK = 'user_feedback',
  DECISION_OUTCOME = 'decision_outcome',
  SYSTEM_STATE = 'system_state',
  LEARNED_PATTERN = 'learned_pattern',
  ERROR = 'error',
}

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: any;
  timestamp: Date;
  agentId?: string;
  taskId?: string;
  tags: string[];
  importance: number;
}

export interface QueryOptions {
  type?: MemoryType;
  agentId?: string;
  tags?: string[];
  since?: Date;
  limit?: number;
  minImportance?: number;
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  taskType: TaskType;
  requestedAction: string;
  reasoning: string;
  riskLevel: RiskLevel;
  estimatedImpact: {
    financial?: number;
    description: string;
  };
  alternatives?: Array<{
    action: string;
    reasoning: string;
  }>;
  requestedAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface ApprovalResponse {
  requestId: string;
  decision: 'approved' | 'rejected' | 'modified';
  respondedBy: string;
  respondedAt: Date;
  feedback?: string;
  modifications?: Record<string, any>;
}

// ============================================================================
// SUPABASE ADAPTER
// ============================================================================

export class SupabaseAdapter {
  private client: SupabaseClient;
  private config: SupabaseConfig;
  private maxRetries = 3;
  private retryDelay = 1000; // milliseconds

  constructor(config: SupabaseConfig) {
    this.config = config;

    // Use service key if available for admin operations, otherwise use anon key
    const key = config.serviceKey || config.anonKey;

    this.client = createClient(config.url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });
  }

  /**
   * Initialize database tables using the schema
   * This should be called once during setup
   */
  async initializeTables(): Promise<void> {
    // Note: In production, this would execute the schema SQL
    // For Supabase, tables are typically created via migrations
    // This method validates that tables exist
    try {
      const tables = ['tasks', 'memories', 'approvals', 'decision_rules'];

      for (const table of tables) {
        const { error } = await this.client
          .from(table)
          .select('id')
          .limit(1);

        if (error && error.code !== 'PGRST116') { // PGRST116 = empty result set
          throw new Error(`Table '${table}' does not exist or is not accessible: ${error.message}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to initialize tables: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // TASK OPERATIONS
  // ============================================================================

  /**
   * Store a new task in the database
   */
  async storeTask(task: TaskRequest): Promise<void> {
    await this.withRetry(async () => {
      const { error } = await this.client
        .from('tasks')
        .insert({
          id: task.id,
          type: task.type,
          priority: task.priority,
          data: task.data,
          status: 'pending',
          requested_by: task.requestedBy,
          created_at: task.timestamp.toISOString(),
          metadata: task.metadata || {},
        });

      if (error) {
        throw new Error(`Failed to store task: ${error.message}`);
      }
    });
  }

  /**
   * Update task status and result
   */
  async updateTaskStatus(taskId: string, status: TaskResult): Promise<void> {
    await this.withRetry(async () => {
      const { error } = await this.client
        .from('tasks')
        .update({
          status: status.status,
          result: status.result || null,
          error: status.error || null,
          agent_id: status.agentId,
          updated_at: status.timestamp.toISOString(),
        })
        .eq('id', taskId);

      if (error) {
        throw new Error(`Failed to update task status: ${error.message}`);
      }
    });
  }

  /**
   * Query tasks with filters
   */
  async queryTasks(filters: {
    type?: TaskType;
    status?: string;
    since?: Date;
    limit?: number;
  }): Promise<TaskResult[]> {
    return await this.withRetry(async () => {
      let query = this.client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.since) {
        query = query.gte('created_at', filters.since.toISOString());
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to query tasks: ${error.message}`);
      }

      return (data || []).map(row => ({
        taskId: row.id,
        status: row.status,
        result: row.result,
        error: row.error,
        timestamp: new Date(row.updated_at),
        agentId: row.agent_id || '',
      }));
    });
  }

  // ============================================================================
  // MEMORY OPERATIONS
  // ============================================================================

  /**
   * Store a memory entry
   */
  async storeMemory(entry: Omit<MemoryEntry, 'id'>): Promise<string> {
    return await this.withRetry(async () => {
      const { data, error } = await this.client
        .from('memories')
        .insert({
          type: entry.type,
          content: entry.content,
          agent_id: entry.agentId || null,
          task_id: entry.taskId || null,
          tags: entry.tags,
          importance: entry.importance,
          created_at: entry.timestamp.toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to store memory: ${error.message}`);
      }

      return data.id;
    });
  }

  /**
   * Query memories with flexible filters
   */
  async queryMemories(options: QueryOptions): Promise<MemoryEntry[]> {
    return await this.withRetry(async () => {
      let query = this.client
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });

      if (options.type) {
        query = query.eq('type', options.type);
      }

      if (options.agentId) {
        query = query.eq('agent_id', options.agentId);
      }

      if (options.tags && options.tags.length > 0) {
        query = query.contains('tags', options.tags);
      }

      if (options.since) {
        query = query.gte('created_at', options.since.toISOString());
      }

      if (options.minImportance !== undefined) {
        query = query.gte('importance', options.minImportance);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to query memories: ${error.message}`);
      }

      return (data || []).map(row => ({
        id: row.id,
        type: row.type as MemoryType,
        content: row.content,
        timestamp: new Date(row.created_at),
        agentId: row.agent_id || undefined,
        taskId: row.task_id || undefined,
        tags: row.tags || [],
        importance: parseFloat(row.importance),
      }));
    });
  }

  /**
   * Update importance score of a memory
   */
  async updateMemoryImportance(memoryId: string, importance: number): Promise<void> {
    await this.withRetry(async () => {
      const { error } = await this.client
        .from('memories')
        .update({ importance })
        .eq('id', memoryId);

      if (error) {
        throw new Error(`Failed to update memory importance: ${error.message}`);
      }
    });
  }

  /**
   * Prune old memories based on age and importance
   */
  async pruneMemories(olderThan: Date, maxImportance: number): Promise<number> {
    return await this.withRetry(async () => {
      // Use the database function we created in the schema
      const { data, error } = await this.client
        .rpc('prune_old_memories', {
          older_than_date: olderThan.toISOString(),
          max_importance_threshold: maxImportance,
        });

      if (error) {
        throw new Error(`Failed to prune memories: ${error.message}`);
      }

      return data || 0;
    });
  }

  // ============================================================================
  // APPROVAL OPERATIONS
  // ============================================================================

  /**
   * Store an approval request
   */
  async storeApprovalRequest(request: Omit<ApprovalRequest, 'id'>): Promise<string> {
    return await this.withRetry(async () => {
      const { data, error } = await this.client
        .from('approvals')
        .insert({
          task_id: request.taskId,
          task_type: request.taskType,
          requested_action: request.requestedAction,
          reasoning: request.reasoning,
          risk_level: request.riskLevel,
          estimated_impact: request.estimatedImpact,
          alternatives: request.alternatives || null,
          requested_at: request.requestedAt.toISOString(),
          expires_at: request.expiresAt?.toISOString() || null,
          metadata: request.metadata,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to store approval request: ${error.message}`);
      }

      return data.id;
    });
  }

  /**
   * Get all pending approval requests
   */
  async getPendingApprovals(): Promise<ApprovalRequest[]> {
    return await this.withRetry(async () => {
      const { data, error } = await this.client
        .from('approvals')
        .select('*')
        .is('decision', null)
        .order('requested_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get pending approvals: ${error.message}`);
      }

      return (data || []).map(row => ({
        id: row.id,
        taskId: row.task_id,
        taskType: row.task_type as TaskType,
        requestedAction: row.requested_action,
        reasoning: row.reasoning,
        riskLevel: row.risk_level as RiskLevel,
        estimatedImpact: row.estimated_impact,
        alternatives: row.alternatives || undefined,
        requestedAt: new Date(row.requested_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        metadata: row.metadata || {},
      }));
    });
  }

  /**
   * Update approval with human response
   */
  async updateApproval(requestId: string, response: ApprovalResponse): Promise<void> {
    await this.withRetry(async () => {
      const { error } = await this.client
        .from('approvals')
        .update({
          decision: response.decision,
          responded_by: response.respondedBy,
          responded_at: response.respondedAt.toISOString(),
          feedback: response.feedback || null,
          modifications: response.modifications || null,
        })
        .eq('id', requestId);

      if (error) {
        throw new Error(`Failed to update approval: ${error.message}`);
      }
    });
  }

  /**
   * Get expired approvals using the database function
   */
  async getExpiredApprovals(): Promise<Array<{ id: string; taskId: string; expiresAt: Date }>> {
    return await this.withRetry(async () => {
      const { data, error } = await this.client
        .rpc('get_expired_approvals');

      if (error) {
        throw new Error(`Failed to get expired approvals: ${error.message}`);
      }

      return (data || []).map(row => ({
        id: row.approval_id,
        taskId: row.task_id,
        expiresAt: new Date(row.expires_at),
      }));
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Execute a query with automatic retry logic for transient failures
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on validation errors or client errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Operation failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Don't retry validation errors, auth errors, or not found errors
    const nonRetryablePatterns = [
      'validation',
      'invalid',
      'unauthorized',
      'forbidden',
      'not found',
      'constraint',
      'unique',
      'foreign key',
    ];

    return nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the underlying Supabase client (for advanced usage)
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Health check - verify connection to Supabase
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('tasks')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}
