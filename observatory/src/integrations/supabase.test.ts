/**
 * Tests for Supabase Adapter
 *
 * @module integrations/supabase.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SupabaseAdapter,
  TaskType,
  Priority,
  MemoryType,
  RiskLevel,
  type TaskRequest,
  type TaskResult,
  type MemoryEntry,
  type QueryOptions,
  type ApprovalRequest,
  type ApprovalResponse,
} from './supabase';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('SupabaseAdapter', () => {
  let adapter: SupabaseAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new SupabaseAdapter({
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
      serviceKey: 'test-service-key',
    });
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('initializeTables', () => {
    it('should validate that all required tables exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(adapter.initializeTables()).resolves.not.toThrow();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('memories');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('approvals');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('decision_rules');
    });

    it('should throw error if a table does not exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          error: { message: 'Table not found', code: 'PGRST000' },
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(adapter.initializeTables()).rejects.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return true when connection is healthy', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await adapter.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ error: { message: 'Connection failed' } }),
        }),
      });

      const result = await adapter.healthCheck();
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // TASK OPERATIONS TESTS
  // ============================================================================

  describe('storeTask', () => {
    it('should successfully store a task', async () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: TaskType.MARKETING_SOCIAL_POST,
        priority: Priority.MEDIUM,
        data: { platform: 'twitter', content: 'Hello world' },
        requestedBy: 'user@example.com',
        timestamp: new Date('2025-10-15T12:00:00Z'),
        metadata: { source: 'api' },
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      await expect(adapter.storeTask(task)).resolves.not.toThrow();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tasks');
    });

    it('should throw error on insert failure', async () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: TaskType.MARKETING_SOCIAL_POST,
        priority: Priority.MEDIUM,
        data: {},
        requestedBy: 'user@example.com',
        timestamp: new Date(),
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Insert failed' },
        }),
      });

      await expect(adapter.storeTask(task)).rejects.toThrow('Failed to store task');
    });
  });

  describe('updateTaskStatus', () => {
    it('should successfully update task status', async () => {
      const status: TaskResult = {
        taskId: 'task-123',
        status: 'completed',
        result: { postId: 'post-456' },
        timestamp: new Date('2025-10-15T12:05:00Z'),
        agentId: 'marketing-agent',
      };

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(adapter.updateTaskStatus('task-123', status)).resolves.not.toThrow();
    });

    it('should handle update errors', async () => {
      const status: TaskResult = {
        taskId: 'task-123',
        status: 'failed',
        error: 'API timeout',
        timestamp: new Date(),
        agentId: 'marketing-agent',
      };

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Update failed' },
          }),
        }),
      });

      await expect(adapter.updateTaskStatus('task-123', status)).rejects.toThrow();
    });
  });

  describe('queryTasks', () => {
    it('should query tasks with filters', async () => {
      const mockData = [
        {
          id: 'task-1',
          type: TaskType.MARKETING_SOCIAL_POST,
          status: 'completed',
          result: { postId: 'post-1' },
          error: null,
          agent_id: 'marketing-agent',
          updated_at: '2025-10-15T12:00:00Z',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const results = await adapter.queryTasks({
        type: TaskType.MARKETING_SOCIAL_POST,
        status: 'completed',
        limit: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].taskId).toBe('task-1');
      expect(results[0].status).toBe('completed');
    });

    it('should handle empty results', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const results = await adapter.queryTasks({ limit: 10 });
      expect(results).toEqual([]);
    });
  });

  // ============================================================================
  // MEMORY OPERATIONS TESTS
  // ============================================================================

  describe('storeMemory', () => {
    it('should successfully store a memory entry', async () => {
      const memory: Omit<MemoryEntry, 'id'> = {
        type: MemoryType.TASK_EXECUTION,
        content: { result: 'success', metrics: { likes: 42 } },
        timestamp: new Date('2025-10-15T12:00:00Z'),
        agentId: 'marketing-agent',
        taskId: 'task-123',
        tags: ['social', 'twitter'],
        importance: 0.7,
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'memory-123' },
              error: null,
            }),
          }),
        }),
      });

      const memoryId = await adapter.storeMemory(memory);
      expect(memoryId).toBe('memory-123');
    });
  });

  describe('queryMemories', () => {
    it('should query memories with multiple filters', async () => {
      const mockData = [
        {
          id: 'memory-1',
          type: MemoryType.TASK_EXECUTION,
          content: { result: 'success' },
          agent_id: 'marketing-agent',
          task_id: 'task-1',
          tags: ['social', 'twitter'],
          importance: '0.7',
          created_at: '2025-10-15T12:00:00Z',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const options: QueryOptions = {
        type: MemoryType.TASK_EXECUTION,
        agentId: 'marketing-agent',
        tags: ['social'],
        minImportance: 0.5,
        limit: 10,
      };

      const results = await adapter.queryMemories(options);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('memory-1');
      expect(results[0].importance).toBe(0.7);
    });
  });

  describe('updateMemoryImportance', () => {
    it('should update memory importance score', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(adapter.updateMemoryImportance('memory-123', 0.9)).resolves.not.toThrow();
    });
  });

  describe('pruneMemories', () => {
    it('should prune old low-importance memories', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: 15,
        error: null,
      });

      const deletedCount = await adapter.pruneMemories(
        new Date('2025-01-01'),
        0.3
      );

      expect(deletedCount).toBe(15);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('prune_old_memories', {
        older_than_date: expect.any(String),
        max_importance_threshold: 0.3,
      });
    });
  });

  // ============================================================================
  // APPROVAL OPERATIONS TESTS
  // ============================================================================

  describe('storeApprovalRequest', () => {
    it('should successfully store an approval request', async () => {
      const request: Omit<ApprovalRequest, 'id'> = {
        taskId: 'task-123',
        taskType: TaskType.MARKETING_EMAIL_CAMPAIGN,
        requestedAction: 'Send email to 5000 users',
        reasoning: 'New feature announcement',
        riskLevel: RiskLevel.MEDIUM,
        estimatedImpact: {
          financial: 0,
          description: 'May increase engagement',
        },
        requestedAt: new Date('2025-10-15T12:00:00Z'),
        expiresAt: new Date('2025-10-16T12:00:00Z'),
        metadata: { segment: 'active_users' },
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'approval-123' },
              error: null,
            }),
          }),
        }),
      });

      const approvalId = await adapter.storeApprovalRequest(request);
      expect(approvalId).toBe('approval-123');
    });
  });

  describe('getPendingApprovals', () => {
    it('should retrieve all pending approvals', async () => {
      const mockData = [
        {
          id: 'approval-1',
          task_id: 'task-1',
          task_type: TaskType.MARKETING_EMAIL_CAMPAIGN,
          requested_action: 'Send campaign',
          reasoning: 'Announcement',
          risk_level: RiskLevel.MEDIUM,
          estimated_impact: { financial: 0, description: 'Low risk' },
          alternatives: null,
          requested_at: '2025-10-15T12:00:00Z',
          expires_at: '2025-10-16T12:00:00Z',
          metadata: {},
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const approvals = await adapter.getPendingApprovals();
      expect(approvals).toHaveLength(1);
      expect(approvals[0].id).toBe('approval-1');
      expect(approvals[0].riskLevel).toBe(RiskLevel.MEDIUM);
    });
  });

  describe('updateApproval', () => {
    it('should update approval with response', async () => {
      const response: ApprovalResponse = {
        requestId: 'approval-123',
        decision: 'approved',
        respondedBy: 'admin@example.com',
        respondedAt: new Date('2025-10-15T13:00:00Z'),
        feedback: 'Looks good',
      };

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(adapter.updateApproval('approval-123', response)).resolves.not.toThrow();
    });
  });

  describe('getExpiredApprovals', () => {
    it('should retrieve expired approvals', async () => {
      const mockData = [
        {
          approval_id: 'approval-1',
          task_id: 'task-1',
          expires_at: '2025-10-14T12:00:00Z',
        },
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const expired = await adapter.getExpiredApprovals();
      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe('approval-1');
    });
  });

  // ============================================================================
  // RETRY LOGIC TESTS
  // ============================================================================

  describe('retry logic', () => {
    it('should retry transient failures', async () => {
      let attemptCount = 0;

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 2) {
            return Promise.resolve({ error: { message: 'Connection timeout' } });
          }
          return Promise.resolve({ error: null });
        }),
      });

      const task: TaskRequest = {
        id: 'task-123',
        type: TaskType.MARKETING_SOCIAL_POST,
        priority: Priority.MEDIUM,
        data: {},
        requestedBy: 'user@example.com',
        timestamp: new Date(),
      };

      await adapter.storeTask(task);
      expect(attemptCount).toBe(2);
    });

    it('should not retry validation errors', async () => {
      let attemptCount = 0;

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockImplementation(() => {
          attemptCount++;
          return Promise.resolve({
            error: { message: 'Validation error: invalid data' },
          });
        }),
      });

      const task: TaskRequest = {
        id: 'task-123',
        type: TaskType.MARKETING_SOCIAL_POST,
        priority: Priority.MEDIUM,
        data: {},
        requestedBy: 'user@example.com',
        timestamp: new Date(),
      };

      await expect(adapter.storeTask(task)).rejects.toThrow();
      expect(attemptCount).toBe(1); // Should not retry
    });

    it('should fail after max retries', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Network error' },
        }),
      });

      const task: TaskRequest = {
        id: 'task-123',
        type: TaskType.MARKETING_SOCIAL_POST,
        priority: Priority.MEDIUM,
        data: {},
        requestedBy: 'user@example.com',
        timestamp: new Date(),
      };

      await expect(adapter.storeTask(task)).rejects.toThrow('Operation failed after 3 attempts');
    });
  });

  // ============================================================================
  // UTILITY METHOD TESTS
  // ============================================================================

  describe('getClient', () => {
    it('should return the underlying Supabase client', () => {
      const client = adapter.getClient();
      expect(client).toBeDefined();
      expect(client).toBe(mockSupabaseClient);
    });
  });
});
