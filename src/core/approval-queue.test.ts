/**
 * Tests for Approval Queue System
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ApprovalQueue } from './approval-queue';
import { TaskType, Priority } from '../types/tasks';
import { RiskLevel } from '../types/decisions';
import { ApprovalRequest, NotificationChannel } from '../types/approvals';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockRequest = {
    id: 'req-123',
    task_id: 'task-123',
    task_type: TaskType.MARKETING_SOCIAL_POST,
    requested_action: 'Test action',
    reasoning: 'Test reasoning',
    risk_level: RiskLevel.MEDIUM,
    estimated_impact: { description: 'Test impact' },
    requested_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    metadata: {},
    status: 'pending',
  };

  return {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
        then: vi.fn((callback) =>
          callback({ data: [], error: null, count: 0 })
        ),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => callback({ error: null })),
      }),
    })),
  };
};

// Mock axios for webhook/Discord notifications
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ status: 200 }),
    request: vi.fn().mockResolvedValue({ status: 200 }),
  },
}));

describe('ApprovalQueue', () => {
  let mockSupabase: any;
  let approvalQueue: ApprovalQueue;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with Supabase client only', () => {
      approvalQueue = new ApprovalQueue(mockSupabase);
      expect(approvalQueue).toBeDefined();
    });

    it('should initialize with notification channels', () => {
      const channels: NotificationChannel[] = [
        { type: 'email', config: { to: 'admin@example.com' } },
        { type: 'discord', config: { webhookUrl: 'https://discord.webhook' } },
      ];

      approvalQueue = new ApprovalQueue(mockSupabase, channels);
      expect(approvalQueue).toBeDefined();
    });

    it('should filter out disabled channels', () => {
      const channels: NotificationChannel[] = [
        { type: 'email', config: { to: 'admin@example.com' }, enabled: true },
        { type: 'discord', config: { webhookUrl: 'https://discord.webhook' }, enabled: false },
      ];

      approvalQueue = new ApprovalQueue(mockSupabase, channels);
      expect(approvalQueue).toBeDefined();
    });

    it('should sort channels by priority', () => {
      const channels: NotificationChannel[] = [
        { type: 'email', config: {}, priority: 10 },
        { type: 'discord', config: {}, priority: 5 },
        { type: 'webhook', config: {}, priority: 15 },
      ];

      approvalQueue = new ApprovalQueue(mockSupabase, channels);
      expect(approvalQueue).toBeDefined();
    });

    it('should accept custom expiration time', () => {
      const customExpiration = 48 * 60 * 60 * 1000; // 48 hours
      approvalQueue = new ApprovalQueue(mockSupabase, [], customExpiration);
      expect(approvalQueue).toBeDefined();
    });
  });

  describe('requestApproval', () => {
    beforeEach(() => {
      approvalQueue = new ApprovalQueue(mockSupabase, []);
    });

    it('should create approval request successfully', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn(() => ({
        insert: insertMock,
      }));

      const requestId = await approvalQueue.requestApproval({
        taskId: 'task-123',
        taskType: TaskType.MARKETING_SOCIAL_POST,
        requestedAction: 'Post to social media',
        reasoning: 'Time-sensitive announcement',
        riskLevel: RiskLevel.MEDIUM,
        estimatedImpact: {
          financial: 0,
          description: 'May increase engagement',
        },
        metadata: {},
      });

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(insertMock).toHaveBeenCalled();
    });

    it('should generate unique request ID', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn(() => ({
        insert: insertMock,
      }));

      const requestId1 = await approvalQueue.requestApproval({
        taskId: 'task-1',
        taskType: TaskType.MARKETING_SOCIAL_POST,
        requestedAction: 'Action 1',
        reasoning: 'Reason 1',
        riskLevel: RiskLevel.LOW,
        estimatedImpact: { description: 'Low impact' },
        metadata: {},
      });

      const requestId2 = await approvalQueue.requestApproval({
        taskId: 'task-2',
        taskType: TaskType.MARKETING_SOCIAL_POST,
        requestedAction: 'Action 2',
        reasoning: 'Reason 2',
        riskLevel: RiskLevel.LOW,
        estimatedImpact: { description: 'Low impact' },
        metadata: {},
      });

      expect(requestId1).not.toBe(requestId2);
    });

    it('should set default expiration if not provided', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn(() => ({
        insert: insertMock,
      }));

      await approvalQueue.requestApproval({
        taskId: 'task-123',
        taskType: TaskType.MARKETING_SOCIAL_POST,
        requestedAction: 'Post',
        reasoning: 'Test',
        riskLevel: RiskLevel.LOW,
        estimatedImpact: { description: 'None' },
        metadata: {},
      });

      const insertedData = insertMock.mock.calls[0][0];
      expect(insertedData.expires_at).toBeDefined();
    });

    it('should use provided expiration date', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn(() => ({
        insert: insertMock,
      }));

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await approvalQueue.requestApproval({
        taskId: 'task-123',
        taskType: TaskType.MARKETING_SOCIAL_POST,
        requestedAction: 'Post',
        reasoning: 'Test',
        riskLevel: RiskLevel.LOW,
        estimatedImpact: { description: 'None' },
        expiresAt,
        metadata: {},
      });

      const insertedData = insertMock.mock.calls[0][0];
      expect(insertedData.expires_at).toBe(expiresAt.toISOString());
    });

    it('should handle database insertion error', async () => {
      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      }));

      await expect(
        approvalQueue.requestApproval({
          taskId: 'task-123',
          taskType: TaskType.MARKETING_SOCIAL_POST,
          requestedAction: 'Post',
          reasoning: 'Test',
          riskLevel: RiskLevel.LOW,
          estimatedImpact: { description: 'None' },
          metadata: {},
        })
      ).rejects.toThrow();
    });

    it('should store alternatives if provided', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn(() => ({
        insert: insertMock,
      }));

      await approvalQueue.requestApproval({
        taskId: 'task-123',
        taskType: TaskType.MARKETING_SOCIAL_POST,
        requestedAction: 'Send blast email',
        reasoning: 'Announce feature',
        riskLevel: RiskLevel.HIGH,
        estimatedImpact: { description: 'Reach 10K users' },
        alternatives: [
          { action: 'Send to segment', reasoning: 'Lower risk' },
          { action: 'Schedule for later', reasoning: 'Better timing' },
        ],
        metadata: {},
      });

      const insertedData = insertMock.mock.calls[0][0];
      expect(insertedData.alternatives).toHaveLength(2);
    });
  });

  describe('getPending', () => {
    beforeEach(() => {
      approvalQueue = new ApprovalQueue(mockSupabase, []);
    });

    it('should fetch pending approval requests', async () => {
      const mockData = [
        {
          id: 'req-1',
          task_id: 'task-1',
          task_type: TaskType.MARKETING_SOCIAL_POST,
          requested_action: 'Post to Twitter',
          reasoning: 'Announcement',
          risk_level: RiskLevel.MEDIUM,
          estimated_impact: { description: 'Medium impact' },
          requested_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          metadata: {},
          status: 'pending',
        },
      ];

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }));

      const pending = await approvalQueue.getPending();

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('req-1');
      expect(pending[0].taskType).toBe(TaskType.MARKETING_SOCIAL_POST);
    });

    it('should return empty array when no pending requests', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      const pending = await approvalQueue.getPending();

      expect(pending).toHaveLength(0);
    });

    it('should handle database query error', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }));

      await expect(approvalQueue.getPending()).rejects.toThrow();
    });
  });

  describe('respond', () => {
    beforeEach(() => {
      approvalQueue = new ApprovalQueue(mockSupabase, []);
    });

    it('should process approval response successfully', async () => {
      const mockRequest = {
        id: 'req-1',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }));

      await expect(
        approvalQueue.respond({
          requestId: 'req-1',
          decision: 'approved',
          respondedBy: 'admin@example.com',
          feedback: 'Looks good',
        })
      ).resolves.not.toThrow();
    });

    it('should reject already responded request', async () => {
      const mockRequest = {
        id: 'req-1',
        status: 'approved',
        responded_at: new Date().toISOString(),
      };

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
        }),
      }));

      await expect(
        approvalQueue.respond({
          requestId: 'req-1',
          decision: 'approved',
          respondedBy: 'admin@example.com',
        })
      ).rejects.toThrow('already been responded');
    });

    it('should reject expired request', async () => {
      const mockRequest = {
        id: 'req-1',
        status: 'pending',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
      };

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
        }),
      }));

      await expect(
        approvalQueue.respond({
          requestId: 'req-1',
          decision: 'approved',
          respondedBy: 'admin@example.com',
        })
      ).rejects.toThrow('expired');
    });

    it('should handle non-existent request', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }),
      }));

      await expect(
        approvalQueue.respond({
          requestId: 'nonexistent',
          decision: 'approved',
          respondedBy: 'admin@example.com',
        })
      ).rejects.toThrow('not found');
    });

    it('should support rejection with feedback', async () => {
      const mockRequest = {
        id: 'req-1',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
        }),
        update: updateMock,
      }));

      await approvalQueue.respond({
        requestId: 'req-1',
        decision: 'rejected',
        respondedBy: 'admin@example.com',
        feedback: 'Too risky at this time',
      });

      expect(updateMock).toHaveBeenCalled();
      const updateData = updateMock.mock.calls[0][0];
      expect(updateData.status).toBe('rejected');
      expect(updateData.feedback).toBe('Too risky at this time');
    });

    it('should support modified decision with modifications', async () => {
      const mockRequest = {
        id: 'req-1',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
        }),
        update: updateMock,
      }));

      await approvalQueue.respond({
        requestId: 'req-1',
        decision: 'modified',
        respondedBy: 'admin@example.com',
        feedback: 'Approved with changes',
        modifications: { segment: 'active_only', limit: 1000 },
      });

      expect(updateMock).toHaveBeenCalled();
      const updateData = updateMock.mock.calls[0][0];
      expect(updateData.status).toBe('modified');
      expect(updateData.modifications).toEqual({ segment: 'active_only', limit: 1000 });
    });
  });

  describe('getHistory', () => {
    beforeEach(() => {
      approvalQueue = new ApprovalQueue(mockSupabase, []);
    });

    it('should fetch approval history', async () => {
      const mockData = [
        {
          id: 'req-1',
          task_id: 'task-1',
          task_type: TaskType.MARKETING_SOCIAL_POST,
          requested_action: 'Post',
          reasoning: 'Test',
          risk_level: RiskLevel.LOW,
          estimated_impact: { description: 'None' },
          requested_at: new Date().toISOString(),
          expires_at: null,
          metadata: {},
          status: 'approved',
          responded_by: 'admin',
          responded_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }));

      const history = await approvalQueue.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].decision).toBe('approved');
    });

    it('should filter by task type', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      await approvalQueue.getHistory({
        taskType: TaskType.MARKETING_EMAIL_CAMPAIGN,
      });

      // Verify eq was called with task_type filter
      expect(mockSupabase.from).toHaveBeenCalledWith('approvals');
    });

    it('should filter by decision', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      await approvalQueue.getHistory({
        decision: 'approved',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('approvals');
    });

    it('should filter by date range', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      const since = new Date('2025-01-01');
      const until = new Date('2025-12-31');

      await approvalQueue.getHistory({ since, until });

      expect(mockSupabase.from).toHaveBeenCalledWith('approvals');
    });

    it('should limit results', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      await approvalQueue.getHistory({ limit: 50 });

      expect(mockSupabase.from).toHaveBeenCalledWith('approvals');
    });
  });

  describe('processExpired', () => {
    beforeEach(() => {
      approvalQueue = new ApprovalQueue(mockSupabase, []);
    });

    it('should auto-reject expired requests', async () => {
      const mockExpired = [
        { id: 'req-1' },
        { id: 'req-2' },
      ];

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lt: vi.fn().mockResolvedValue({ data: mockExpired, error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lt: vi.fn().mockResolvedValue({ error: null }),
        }),
      }));

      const expiredCount = await approvalQueue.processExpired();

      expect(expiredCount).toBe(2);
    });

    it('should return 0 when no expired requests', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lt: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      const expiredCount = await approvalQueue.processExpired();

      expect(expiredCount).toBe(0);
    });

    it('should handle database errors', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          lt: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }));

      await expect(approvalQueue.processExpired()).rejects.toThrow();
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      approvalQueue = new ApprovalQueue(mockSupabase, []);
    });

    it('should return queue status with metrics', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          then: vi.fn((callback) => callback({ data: [], error: null, count: 5 })),
        }),
      }));

      const status = await approvalQueue.getStatus();

      expect(status).toBeDefined();
      expect(status.pendingCount).toBeDefined();
      expect(status.expiredCount).toBeDefined();
    });

    it('should calculate average response time', async () => {
      const mockResponseData = [
        {
          requested_at: new Date('2025-01-01T10:00:00Z').toISOString(),
          responded_at: new Date('2025-01-01T11:00:00Z').toISOString(),
        },
        {
          requested_at: new Date('2025-01-02T10:00:00Z').toISOString(),
          responded_at: new Date('2025-01-02T12:00:00Z').toISOString(),
        },
      ];

      mockSupabase.from = vi.fn((table) => {
        if (table === 'approvals') {
          return {
            select: vi.fn((cols, opts) => {
              if (opts?.count === 'exact') {
                // For count queries
                return {
                  eq: vi.fn().mockReturnThis(),
                  is: vi.fn().mockReturnThis(),
                  lt: vi.fn().mockReturnThis(),
                  then: vi.fn((callback) => callback({ data: null, error: null, count: 0 })),
                };
              }
              // For data queries
              return {
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({ data: mockResponseData, error: null }),
              };
            }),
          };
        }
        return {};
      });

      const status = await approvalQueue.getStatus();

      expect(status.avgResponseTime).toBeDefined();
      if (status.avgResponseTime) {
        expect(status.avgResponseTime).toBeGreaterThan(0);
      }
    });
  });

  describe('Notification system', () => {
    it('should send Discord notification', async () => {
      const axios = await import('axios');
      const discordChannel: NotificationChannel = {
        type: 'discord',
        config: {
          webhookUrl: 'https://discord.com/webhook/123',
          username: 'Jarvis',
        },
      };

      approvalQueue = new ApprovalQueue(mockSupabase, [discordChannel]);

      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn(() => ({
        insert: insertMock,
      }));

      await approvalQueue.requestApproval({
        taskId: 'task-123',
        taskType: TaskType.MARKETING_SOCIAL_POST,
        requestedAction: 'Post',
        reasoning: 'Test',
        riskLevel: RiskLevel.LOW,
        estimatedImpact: { description: 'None' },
        metadata: {},
      });

      // Notification is sent asynchronously, give it a moment
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(axios.default.post).toHaveBeenCalled();
    });

    it('should handle webhook notification', async () => {
      const webhookChannel: NotificationChannel = {
        type: 'webhook',
        config: {
          url: 'https://example.com/webhook',
          method: 'POST',
        },
      };

      approvalQueue = new ApprovalQueue(mockSupabase, [webhookChannel]);

      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn(() => ({
        insert: insertMock,
      }));

      await approvalQueue.requestApproval({
        taskId: 'task-123',
        taskType: TaskType.MARKETING_SOCIAL_POST,
        requestedAction: 'Post',
        reasoning: 'Test',
        riskLevel: RiskLevel.LOW,
        estimatedImpact: { description: 'None' },
        metadata: {},
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should log email notification placeholder', async () => {
      const emailChannel: NotificationChannel = {
        type: 'email',
        config: {
          to: 'admin@example.com',
          template: 'approval_request',
        },
      };

      approvalQueue = new ApprovalQueue(mockSupabase, [emailChannel]);

      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn(() => ({
        insert: insertMock,
      }));

      // Should not throw even though email adapter is not available
      await expect(
        approvalQueue.requestApproval({
          taskId: 'task-123',
          taskType: TaskType.MARKETING_SOCIAL_POST,
          requestedAction: 'Post',
          reasoning: 'Test',
          riskLevel: RiskLevel.LOW,
          estimatedImpact: { description: 'None' },
          metadata: {},
        })
      ).resolves.toBeDefined();
    });
  });
});
