/**
 * Memory System for Jarvis
 *
 * Context and history management for autonomous operation.
 * Stores and retrieves memories for learning and decision-making.
 *
 * @module core/memory
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import {
  MemoryEntry,
  MemoryType,
  QueryOptions,
  MemoryStats,
  TaskContext,
} from '../types/memory';
import { TaskRequest, TaskResult } from '../types/tasks';

/**
 * Memory system for storing and retrieving contextual information
 */
export class MemorySystem {
  private client: SupabaseClient;
  private logger: Logger;

  constructor(supabaseClient: SupabaseClient) {
    this.client = supabaseClient;
    this.logger = new Logger('memory-system');
  }

  /**
   * Store a new memory entry
   *
   * @param entry - Memory entry to store (without ID)
   * @returns Promise resolving to the memory ID
   */
  async store(entry: Omit<MemoryEntry, 'id'>): Promise<string> {
    this.logger.debug('Storing memory entry', { type: entry.type, tags: entry.tags });

    try {
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
        throw new JarvisError(
          ErrorCode.INTERNAL_ERROR,
          `Failed to store memory: ${error.message}`,
          { entry, error: error.message }
        );
      }

      this.logger.info('Memory entry stored successfully', { memoryId: data.id });
      return data.id;
    } catch (error) {
      if (error instanceof JarvisError) throw error;

      this.logger.error('Failed to store memory', error as Error, { entry });
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to store memory entry',
        { entry },
        true
      );
    }
  }

  /**
   * Query memories with flexible filters
   *
   * @param options - Query filter options
   * @returns Promise resolving to array of matching memory entries
   */
  async query(options: QueryOptions): Promise<MemoryEntry[]> {
    this.logger.debug('Querying memories', options);

    try {
      let query = this.client
        .from('memories')
        .select('*');

      // Apply filters
      if (options.type) {
        query = query.eq('type', options.type);
      }

      if (options.agentId) {
        query = query.eq('agent_id', options.agentId);
      }

      if (options.taskId) {
        query = query.eq('task_id', options.taskId);
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

      // Apply sorting
      const sortBy = options.sortBy || 'timestamp';
      const sortOrder = options.sortOrder || 'desc';
      const sortColumn = sortBy === 'timestamp' ? 'created_at' : 'importance';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new JarvisError(
          ErrorCode.INTERNAL_ERROR,
          `Failed to query memories: ${error.message}`,
          { options, error: error.message }
        );
      }

      const memories = (data || []).map(row => ({
        id: row.id,
        type: row.type as MemoryType,
        content: row.content,
        timestamp: new Date(row.created_at),
        agentId: row.agent_id || undefined,
        taskId: row.task_id || undefined,
        tags: row.tags || [],
        importance: parseFloat(row.importance),
      }));

      this.logger.debug('Memories query completed', { count: memories.length });
      return memories;
    } catch (error) {
      if (error instanceof JarvisError) throw error;

      this.logger.error('Failed to query memories', error as Error, { options });
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to query memories',
        { options },
        true
      );
    }
  }

  /**
   * Get full context for a specific task
   * Aggregates the task, related memories, and similar past tasks
   *
   * @param taskId - Task ID to get context for
   * @returns Promise resolving to task context
   */
  async getTaskContext(taskId: string): Promise<TaskContext> {
    this.logger.debug('Getting task context', { taskId });

    try {
      // Get the task itself
      const { data: taskData, error: taskError } = await this.client
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError || !taskData) {
        throw new JarvisError(
          ErrorCode.NOT_FOUND,
          `Task not found: ${taskId}`,
          { taskId },
          false
        );
      }

      const task: TaskRequest = {
        id: taskData.id,
        type: taskData.type,
        priority: taskData.priority,
        data: taskData.data,
        requestedBy: taskData.requested_by,
        timestamp: new Date(taskData.created_at),
        metadata: taskData.metadata,
      };

      // Get related memories (memories tagged with this task)
      const relatedMemories = await this.query({
        taskId,
        limit: 50,
        sortBy: 'importance',
        sortOrder: 'desc',
      });

      // Get previous similar tasks (same type, completed)
      const { data: similarTasksData, error: similarTasksError } = await this.client
        .from('tasks')
        .select('*')
        .eq('type', task.type)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (similarTasksError) {
        this.logger.warn('Failed to fetch similar tasks', { error: similarTasksError.message });
      }

      const previousSimilarTasks: TaskResult[] = (similarTasksData || []).map(row => ({
        taskId: row.id,
        status: row.status,
        result: row.result,
        error: row.error,
        timestamp: new Date(row.updated_at),
        agentId: row.agent_id || '',
      }));

      // Get applicable learned patterns
      const applicablePatterns = await this.query({
        type: MemoryType.LEARNED_PATTERN,
        tags: [task.type],
        minImportance: 0.6,
        limit: 5,
        sortBy: 'importance',
        sortOrder: 'desc',
      });

      const context: TaskContext = {
        task,
        relatedMemories,
        previousSimilarTasks,
        applicablePatterns,
      };

      this.logger.info('Task context retrieved', {
        taskId,
        relatedMemoriesCount: relatedMemories.length,
        similarTasksCount: previousSimilarTasks.length,
        patternsCount: applicablePatterns.length,
      });

      return context;
    } catch (error) {
      if (error instanceof JarvisError) throw error;

      this.logger.error('Failed to get task context', error as Error, { taskId });
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to get task context',
        { taskId },
        true
      );
    }
  }

  /**
   * Update importance score of a memory
   *
   * @param memoryId - Memory ID to update
   * @param importance - New importance score (0-1)
   */
  async updateImportance(memoryId: string, importance: number): Promise<void> {
    this.logger.debug('Updating memory importance', { memoryId, importance });

    // Validate importance score
    if (importance < 0 || importance > 1) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Importance score must be between 0 and 1',
        { memoryId, importance },
        false
      );
    }

    try {
      const { error } = await this.client
        .from('memories')
        .update({ importance })
        .eq('id', memoryId);

      if (error) {
        throw new JarvisError(
          ErrorCode.INTERNAL_ERROR,
          `Failed to update memory importance: ${error.message}`,
          { memoryId, importance, error: error.message }
        );
      }

      this.logger.info('Memory importance updated', { memoryId, importance });
    } catch (error) {
      if (error instanceof JarvisError) throw error;

      this.logger.error('Failed to update memory importance', error as Error, {
        memoryId,
        importance,
      });
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update memory importance',
        { memoryId, importance },
        true
      );
    }
  }

  /**
   * Prune old, low-importance memories
   *
   * @param olderThan - Delete memories older than this date
   * @param maxImportance - Delete memories with importance <= this value
   * @returns Promise resolving to number of deleted memories
   */
  async prune(olderThan: Date, maxImportance: number): Promise<number> {
    this.logger.info('Pruning memories', { olderThan, maxImportance });

    try {
      // Validate parameters
      if (maxImportance < 0 || maxImportance > 1) {
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          'Max importance must be between 0 and 1',
          { maxImportance },
          false
        );
      }

      // Delete memories matching criteria
      const { data, error } = await this.client
        .from('memories')
        .delete()
        .lt('created_at', olderThan.toISOString())
        .lte('importance', maxImportance)
        .select('id');

      if (error) {
        throw new JarvisError(
          ErrorCode.INTERNAL_ERROR,
          `Failed to prune memories: ${error.message}`,
          { olderThan, maxImportance, error: error.message }
        );
      }

      const deletedCount = data?.length || 0;

      this.logger.info('Memories pruned successfully', {
        deletedCount,
        olderThan,
        maxImportance,
      });

      return deletedCount;
    } catch (error) {
      if (error instanceof JarvisError) throw error;

      this.logger.error('Failed to prune memories', error as Error, {
        olderThan,
        maxImportance,
      });
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to prune memories',
        { olderThan, maxImportance },
        true
      );
    }
  }

  /**
   * Get aggregate statistics about stored memories
   *
   * @param since - Optional start date for stats period
   * @returns Promise resolving to memory statistics
   */
  async getStats(since?: Date): Promise<MemoryStats> {
    this.logger.debug('Getting memory stats', { since });

    try {
      let query = this.client.from('memories').select('*');

      if (since) {
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new JarvisError(
          ErrorCode.INTERNAL_ERROR,
          `Failed to get memory stats: ${error.message}`,
          { since, error: error.message }
        );
      }

      const memories = data || [];

      // Calculate stats
      const byType: Record<MemoryType, number> = {} as Record<MemoryType, number>;
      const byAgent: Record<string, number> = {};
      let totalImportance = 0;

      for (const memory of memories) {
        // Count by type
        byType[memory.type as MemoryType] = (byType[memory.type as MemoryType] || 0) + 1;

        // Count by agent
        if (memory.agent_id) {
          byAgent[memory.agent_id] = (byAgent[memory.agent_id] || 0) + 1;
        }

        // Sum importance
        totalImportance += parseFloat(memory.importance);
      }

      const stats: MemoryStats = {
        totalEntries: memories.length,
        byType,
        byAgent,
        averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
        period: since
          ? {
              start: since,
              end: new Date(),
            }
          : undefined,
      };

      this.logger.debug('Memory stats calculated', stats);
      return stats;
    } catch (error) {
      if (error instanceof JarvisError) throw error;

      this.logger.error('Failed to get memory stats', error as Error, { since });
      throw new JarvisError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to get memory stats',
        { since },
        true
      );
    }
  }
}
