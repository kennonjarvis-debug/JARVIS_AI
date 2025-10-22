/**
 * Tests for Memory System
 *
 * @module core/memory.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemorySystem } from './memory';
import { MemoryType, MemoryEntry, QueryOptions } from '../types/memory';
import { TaskType, Priority } from '../types/tasks';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  return {
    from: vi.fn(() => mockQuery),
    __mockQuery: mockQuery,
  };
};

describe('MemorySystem', () => {
  let memorySystem: MemorySystem;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    memorySystem = new MemorySystem(mockClient as any);
  });

  describe('store()', () => {
    it('should store a memory entry successfully', async () => {
      const mockMemoryId = 'mem-123';
      mockClient.__mockQuery.single.mockResolvedValueOnce({
        data: { id: mockMemoryId },
        error: null,
      });

      const entry: Omit<MemoryEntry, 'id'> = {
        type: MemoryType.TASK_EXECUTION,
        content: { result: 'success', duration: 1234 },
        timestamp: new Date(),
        agentId: 'agent-1',
        taskId: 'task-1',
        tags: ['test', 'success'],
        importance: 0.8,
      };

      const memoryId = await memorySystem.store(entry);

      expect(memoryId).toBe(mockMemoryId);
      expect(mockClient.from).toHaveBeenCalledWith('memories');
      expect(mockClient.__mockQuery.insert).toHaveBeenCalled();
    });

    it('should handle database errors when storing', async () => {
      mockClient.__mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const entry: Omit<MemoryEntry, 'id'> = {
        type: MemoryType.ERROR,
        content: { error: 'test error' },
        timestamp: new Date(),
        tags: [],
        importance: 0.9,
      };

      await expect(memorySystem.store(entry)).rejects.toThrow();
    });

    it('should store memory without optional fields', async () => {
      const mockMemoryId = 'mem-456';
      mockClient.__mockQuery.single.mockResolvedValueOnce({
        data: { id: mockMemoryId },
        error: null,
      });

      const entry: Omit<MemoryEntry, 'id'> = {
        type: MemoryType.USER_FEEDBACK,
        content: { feedback: 'Great job!' },
        timestamp: new Date(),
        tags: ['feedback', 'positive'],
        importance: 1.0,
      };

      const memoryId = await memorySystem.store(entry);

      expect(memoryId).toBe(mockMemoryId);
    });
  });

  describe('query()', () => {
    it('should query memories with type filter', async () => {
      const mockMemories = [
        {
          id: 'mem-1',
          type: MemoryType.TASK_EXECUTION,
          content: { result: 'success' },
          created_at: new Date().toISOString(),
          tags: ['test'],
          importance: 0.7,
        },
      ];

      mockClient.__mockQuery.single = undefined;
      vi.spyOn(mockClient.__mockQuery, 'order').mockResolvedValueOnce({
        data: mockMemories,
        error: null,
      });

      const options: QueryOptions = {
        type: MemoryType.TASK_EXECUTION,
      };

      const results = await memorySystem.query(options);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(MemoryType.TASK_EXECUTION);
      expect(mockClient.__mockQuery.eq).toHaveBeenCalledWith('type', MemoryType.TASK_EXECUTION);
    });

    it('should query memories with multiple filters', async () => {
      const mockMemories = [
        {
          id: 'mem-2',
          type: MemoryType.DECISION_OUTCOME,
          content: { decision: 'approved' },
          created_at: new Date().toISOString(),
          agent_id: 'agent-1',
          tags: ['decision', 'approved'],
          importance: 0.8,
        },
      ];

      // Mock the final resolve after order().limit()
      mockClient.__mockQuery.limit.mockResolvedValueOnce({
        data: mockMemories,
        error: null,
      });

      const options: QueryOptions = {
        type: MemoryType.DECISION_OUTCOME,
        agentId: 'agent-1',
        minImportance: 0.5,
        limit: 10,
      };

      const results = await memorySystem.query(options);

      expect(results).toHaveLength(1);
      expect(mockClient.__mockQuery.eq).toHaveBeenCalledWith('type', MemoryType.DECISION_OUTCOME);
      expect(mockClient.__mockQuery.eq).toHaveBeenCalledWith('agent_id', 'agent-1');
      expect(mockClient.__mockQuery.gte).toHaveBeenCalledWith('importance', 0.5);
      expect(mockClient.__mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should query with tags filter', async () => {
      const mockMemories: any[] = [];

      vi.spyOn(mockClient.__mockQuery, 'order').mockResolvedValueOnce({
        data: mockMemories,
        error: null,
      });

      const options: QueryOptions = {
        tags: ['important', 'urgent'],
      };

      await memorySystem.query(options);

      expect(mockClient.__mockQuery.contains).toHaveBeenCalledWith('tags', ['important', 'urgent']);
    });

    it('should query with date filter', async () => {
      const mockMemories: any[] = [];
      const sinceDate = new Date('2025-10-01');

      vi.spyOn(mockClient.__mockQuery, 'order').mockResolvedValueOnce({
        data: mockMemories,
        error: null,
      });

      const options: QueryOptions = {
        since: sinceDate,
      };

      await memorySystem.query(options);

      expect(mockClient.__mockQuery.gte).toHaveBeenCalledWith('created_at', sinceDate.toISOString());
    });

    it('should apply custom sorting', async () => {
      const mockMemories: any[] = [];

      vi.spyOn(mockClient.__mockQuery, 'order').mockResolvedValueOnce({
        data: mockMemories,
        error: null,
      });

      const options: QueryOptions = {
        sortBy: 'importance',
        sortOrder: 'asc',
      };

      await memorySystem.query(options);

      expect(mockClient.__mockQuery.order).toHaveBeenCalledWith('importance', { ascending: true });
    });

    it('should handle query errors', async () => {
      vi.spyOn(mockClient.__mockQuery, 'order').mockResolvedValueOnce({
        data: null,
        error: { message: 'Query failed' },
      });

      await expect(memorySystem.query({})).rejects.toThrow();
    });
  });

  describe('getTaskContext()', () => {
    it('should retrieve full task context', async () => {
      const taskId = 'task-123';
      const mockTask = {
        id: taskId,
        type: TaskType.MARKETING_SOCIAL_POST,
        priority: Priority.MEDIUM,
        data: { platform: 'twitter' },
        requested_by: 'user-1',
        created_at: new Date().toISOString(),
        metadata: {},
      };

      // Mock task query
      mockClient.__mockQuery.single.mockResolvedValueOnce({
        data: mockTask,
        error: null,
      });

      // Mock related memories query (first call to query() in getTaskContext)
      mockClient.__mockQuery.limit.mockResolvedValueOnce({
        data: [
          {
            id: 'mem-1',
            type: MemoryType.TASK_EXECUTION,
            content: {},
            created_at: new Date().toISOString(),
            task_id: taskId,
            tags: [],
            importance: 0.7,
          },
        ],
        error: null,
      });

      // Mock similar tasks query (direct client.from().select()...limit() call)
      mockClient.__mockQuery.limit.mockResolvedValueOnce({
        data: [
          {
            id: 'task-prev',
            type: TaskType.MARKETING_SOCIAL_POST,
            status: 'completed',
            updated_at: new Date().toISOString(),
            agent_id: 'agent-1',
          },
        ],
        error: null,
      });

      // Mock patterns query (second call to query() in getTaskContext)
      mockClient.__mockQuery.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const context = await memorySystem.getTaskContext(taskId);

      expect(context.task.id).toBe(taskId);
      expect(context.relatedMemories).toHaveLength(1);
      expect(context.previousSimilarTasks).toHaveLength(1);
      expect(context.applicablePatterns).toBeDefined();
    });

    it('should throw error if task not found', async () => {
      mockClient.__mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(memorySystem.getTaskContext('nonexistent')).rejects.toThrow();
    });
  });

  describe('updateImportance()', () => {
    it('should update memory importance', async () => {
      mockClient.__mockQuery.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await memorySystem.updateImportance('mem-123', 0.9);

      expect(mockClient.from).toHaveBeenCalledWith('memories');
      expect(mockClient.__mockQuery.update).toHaveBeenCalledWith({ importance: 0.9 });
      expect(mockClient.__mockQuery.eq).toHaveBeenCalledWith('id', 'mem-123');
    });

    it('should validate importance score range', async () => {
      await expect(memorySystem.updateImportance('mem-123', 1.5)).rejects.toThrow();
      await expect(memorySystem.updateImportance('mem-123', -0.1)).rejects.toThrow();
    });

    it('should handle update errors', async () => {
      mockClient.__mockQuery.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(memorySystem.updateImportance('mem-123', 0.8)).rejects.toThrow();
    });
  });

  describe('prune()', () => {
    it('should prune old low-importance memories', async () => {
      const olderThan = new Date('2025-09-01');
      const maxImportance = 0.3;

      mockClient.__mockQuery.select.mockResolvedValueOnce({
        data: [{ id: 'mem-1' }, { id: 'mem-2' }, { id: 'mem-3' }],
        error: null,
      });

      const deletedCount = await memorySystem.prune(olderThan, maxImportance);

      expect(deletedCount).toBe(3);
      expect(mockClient.from).toHaveBeenCalledWith('memories');
      expect(mockClient.__mockQuery.delete).toHaveBeenCalled();
      expect(mockClient.__mockQuery.lt).toHaveBeenCalledWith(
        'created_at',
        olderThan.toISOString()
      );
      expect(mockClient.__mockQuery.lte).toHaveBeenCalledWith('importance', maxImportance);
    });

    it('should validate maxImportance parameter', async () => {
      const olderThan = new Date();

      await expect(memorySystem.prune(olderThan, 1.5)).rejects.toThrow();
      await expect(memorySystem.prune(olderThan, -0.1)).rejects.toThrow();
    });

    it('should return 0 if no memories pruned', async () => {
      mockClient.__mockQuery.select.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const deletedCount = await memorySystem.prune(new Date(), 0.1);

      expect(deletedCount).toBe(0);
    });

    it('should handle prune errors', async () => {
      mockClient.__mockQuery.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed' },
      });

      await expect(memorySystem.prune(new Date(), 0.5)).rejects.toThrow();
    });
  });

  describe('getStats()', () => {
    it('should calculate memory statistics', async () => {
      const mockMemories = [
        {
          type: MemoryType.TASK_EXECUTION,
          agent_id: 'agent-1',
          importance: '0.7',
        },
        {
          type: MemoryType.TASK_EXECUTION,
          agent_id: 'agent-1',
          importance: '0.8',
        },
        {
          type: MemoryType.USER_FEEDBACK,
          agent_id: 'agent-2',
          importance: '1.0',
        },
      ];

      vi.spyOn(mockClient.__mockQuery, 'select').mockResolvedValueOnce({
        data: mockMemories,
        error: null,
      });

      const stats = await memorySystem.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.byType[MemoryType.TASK_EXECUTION]).toBe(2);
      expect(stats.byType[MemoryType.USER_FEEDBACK]).toBe(1);
      expect(stats.byAgent['agent-1']).toBe(2);
      expect(stats.byAgent['agent-2']).toBe(1);
      expect(stats.averageImportance).toBeCloseTo(0.833, 2);
    });

    it('should filter stats by date', async () => {
      const sinceDate = new Date('2025-10-01');

      // Mock the final resolve - gte() returns a promise when awaited
      mockClient.__mockQuery.gte.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const stats = await memorySystem.getStats(sinceDate);

      expect(mockClient.__mockQuery.gte).toHaveBeenCalledWith(
        'created_at',
        sinceDate.toISOString()
      );
      expect(stats.period).toBeDefined();
      expect(stats.period?.start).toEqual(sinceDate);
    });

    it('should handle empty results', async () => {
      vi.spyOn(mockClient.__mockQuery, 'select').mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const stats = await memorySystem.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.averageImportance).toBe(0);
    });

    it('should handle stats query errors', async () => {
      vi.spyOn(mockClient.__mockQuery, 'select').mockResolvedValueOnce({
        data: null,
        error: { message: 'Query failed' },
      });

      await expect(memorySystem.getStats()).rejects.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should support storing and querying workflow', async () => {
      // Store a memory
      mockClient.__mockQuery.single.mockResolvedValueOnce({
        data: { id: 'mem-new' },
        error: null,
      });

      const memoryId = await memorySystem.store({
        type: MemoryType.LEARNED_PATTERN,
        content: { pattern: 'users prefer morning emails' },
        timestamp: new Date(),
        tags: ['email', 'timing', 'learned'],
        importance: 0.85,
      });

      expect(memoryId).toBe('mem-new');

      // Query it back
      vi.spyOn(mockClient.__mockQuery, 'order').mockResolvedValueOnce({
        data: [
          {
            id: 'mem-new',
            type: MemoryType.LEARNED_PATTERN,
            content: { pattern: 'users prefer morning emails' },
            created_at: new Date().toISOString(),
            tags: ['email', 'timing', 'learned'],
            importance: 0.85,
          },
        ],
        error: null,
      });

      const results = await memorySystem.query({
        type: MemoryType.LEARNED_PATTERN,
        tags: ['email'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mem-new');
    });
  });
});
