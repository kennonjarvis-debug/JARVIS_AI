/**
 * MarketingAgent Tests
 *
 * Comprehensive test suite for the MarketingAgent.
 * Tests social media posting, email campaigns, Brevo limit enforcement, and batching.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketingAgent } from './marketing-agent.js';
import { JarvisError } from '../utils/error-handler.js';
import type { TaskRequest, TaskType } from '../types/tasks.js';

describe('MarketingAgent', () => {
  let agent: MarketingAgent;
  let mockBuffer: any;
  let mockEmail: any;
  let mockDecisionEngine: any;
  let mockMemory: any;
  let mockApprovalQueue: any;

  beforeEach(() => {
    // Mock Buffer adapter
    mockBuffer = {
      createPost: vi.fn().mockResolvedValue({
        id: 'post-123',
        profileIds: ['profile-1'],
        scheduledAt: new Date(),
      }),
    };

    // Mock Email adapter
    mockEmail = {
      sendBulkEmail: vi.fn().mockResolvedValue({
        sent: 100,
        messageIds: ['msg-1', 'msg-2'],
      }),
    };

    // Mock Decision Engine
    mockDecisionEngine = {
      evaluate: vi.fn().mockResolvedValue({
        action: 'execute',
        confidence: 0.9,
        reasoning: 'Safe to execute',
        riskLevel: 'low',
        requiresApproval: false,
      }),
    };

    // Mock Memory System
    mockMemory = {
      getRelevantContext: vi.fn().mockResolvedValue([]),
      storeEntry: vi.fn().mockResolvedValue(undefined),
    };

    // Mock Approval Queue
    mockApprovalQueue = {
      requestApproval: vi.fn().mockResolvedValue('req-123'),
    };

    // Set environment variables for Buffer profile IDs
    process.env.BUFFER_TWITTER_PROFILE_ID = 'twitter-123';
    process.env.BUFFER_LINKEDIN_PROFILE_ID = 'linkedin-123';
    process.env.BUFFER_FACEBOOK_PROFILE_ID = 'facebook-123';

    agent = new MarketingAgent({
      id: 'marketing-agent',
      name: 'Marketing Agent',
      capabilities: [
        { name: 'social_media', description: 'Social media management', enabled: true },
        { name: 'email_campaigns', description: 'Email campaign management', enabled: true },
      ],
      integrations: {
        buffer: mockBuffer,
        email: mockEmail,
      },
      decisionEngine: mockDecisionEngine,
      memory: mockMemory,
      approvalQueue: mockApprovalQueue,
    });
  });

  afterEach(() => {
    // Reset daily count after each test
    agent.resetDailyEmailCount();
  });

  describe('getSupportedTaskTypes', () => {
    it('should support marketing task types', () => {
      const types = agent.getSupportedTaskTypes();

      expect(types).toContain('marketing.social.post');
      expect(types).toContain('marketing.email.campaign');
      expect(types).toContain('marketing.content.create');
      expect(types).toHaveLength(3);
    });
  });

  describe('canHandle', () => {
    it('should handle supported marketing tasks', () => {
      const socialTask: TaskRequest = {
        id: 'task-1',
        type: 'marketing.social.post' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      expect(agent.canHandle(socialTask)).toBe(true);
    });

    it('should reject unsupported task types', () => {
      const unsupportedTask: TaskRequest = {
        id: 'task-1',
        type: 'sales.lead.qualify' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      expect(agent.canHandle(unsupportedTask)).toBe(false);
    });
  });

  describe('createSocialPost', () => {
    it('should create and schedule social media post via Buffer', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.social.post' as TaskType,
        priority: 1,
        data: {
          platform: 'twitter',
          topic: 'New product launch',
          targetAudience: 'Musicians and producers',
          tone: 'professional',
          hashtags: ['DAWGAI', 'MusicProduction'],
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.data).toHaveProperty('postId', 'post-123');
      expect(result.data).toHaveProperty('platform', 'twitter');
      expect(mockBuffer.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.any(String),
          profiles: ['twitter-123'],
        })
      );
    });

    it('should throw error when Buffer not configured', async () => {
      const agentWithoutBuffer = new MarketingAgent({
        id: 'marketing-agent',
        name: 'Marketing Agent',
        capabilities: [],
        integrations: {}, // No Buffer
        decisionEngine: mockDecisionEngine,
        memory: mockMemory,
        approvalQueue: mockApprovalQueue,
      });

      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.social.post' as TaskType,
        priority: 1,
        data: {
          platform: 'twitter',
          topic: 'Test',
          targetAudience: 'Test audience',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await expect(agentWithoutBuffer.executeTask(task)).rejects.toThrow(JarvisError);
      await expect(agentWithoutBuffer.executeTask(task)).rejects.toThrow(
        'Buffer integration not configured'
      );
    });

    it('should validate required fields for social post', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.social.post' as TaskType,
        priority: 1,
        data: {
          platform: 'twitter',
          // Missing topic and targetAudience
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await expect(agent.executeTask(task)).rejects.toThrow(JarvisError);
      await expect(agent.executeTask(task)).rejects.toThrow(
        'Missing required fields'
      );
    });
  });

  describe('createEmailCampaign', () => {
    it('should send email campaign when under daily limit', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.email.campaign' as TaskType,
        priority: 1,
        data: {
          segment: 'active_users',
          subject: 'Weekly Newsletter',
          content: 'Test content',
          recipientCount: 100,
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.data).toHaveProperty('recipientCount', 100);
      expect(mockEmail.sendBulkEmail).toHaveBeenCalled();
    });

    it('should track daily email count after sending', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.email.campaign' as TaskType,
        priority: 1,
        data: {
          segment: 'active_users',
          subject: 'Test',
          content: 'Test content',
          recipientCount: 100,
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await agent.executeTask(task);

      const stats = agent.getDailyEmailStats();
      expect(stats.sent).toBe(100);
      expect(stats.remaining).toBe(200); // 300 - 100
    });

    it('should batch campaign when exceeds 300/day limit', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.email.campaign' as TaskType,
        priority: 1,
        data: {
          segment: 'all_users',
          subject: 'Big Campaign',
          content: 'Test content',
          recipientCount: 1000, // Exceeds 300/day limit
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.batched).toBe(true);
      expect(result.data.totalBatches).toBe(4); // 1000 / 300 = 3.33, rounded up to 4
      expect(result.data.batches).toHaveLength(4);
      expect(mockMemory.storeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scheduled_task',
          content: expect.objectContaining({
            batches: expect.any(Array),
            status: 'planned',
          }),
        })
      );
    });

    it('should calculate correct batch sizes', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.email.campaign' as TaskType,
        priority: 1,
        data: {
          segment: 'all_users',
          subject: 'Big Campaign',
          content: 'Test content',
          recipientCount: 1000,
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.executeTask(task);

      const batches = result.data.batches;
      expect(batches[0].recipientCount).toBe(300);
      expect(batches[1].recipientCount).toBe(300);
      expect(batches[2].recipientCount).toBe(300);
      expect(batches[3].recipientCount).toBe(100); // Remaining
    });

    it('should schedule batches on different days', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.email.campaign' as TaskType,
        priority: 1,
        data: {
          segment: 'all_users',
          subject: 'Big Campaign',
          content: 'Test content',
          recipientCount: 600,
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.executeTask(task);

      const batches = result.data.batches;
      const day1 = new Date(batches[0].scheduledFor).getDate();
      const day2 = new Date(batches[1].scheduledFor).getDate();

      expect(day2).toBe(day1 + 1); // Second batch is next day
    });

    it('should reject campaign that exceeds remaining daily limit', async () => {
      // Send 250 emails first
      await agent.executeTask({
        id: 'task-1',
        type: 'marketing.email.campaign' as TaskType,
        priority: 1,
        data: {
          segment: 'users',
          subject: 'First',
          content: 'Content',
          recipientCount: 250,
        },
        requestedBy: 'test',
        timestamp: new Date(),
      });

      // Try to send 100 more (exceeds 300 limit)
      const task: TaskRequest = {
        id: 'task-2',
        type: 'marketing.email.campaign' as TaskType,
        priority: 1,
        data: {
          segment: 'users',
          subject: 'Second',
          content: 'Content',
          recipientCount: 100, // Only 50 remaining
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await expect(agent.executeTask(task)).rejects.toThrow(JarvisError);
      await expect(agent.executeTask(task)).rejects.toThrow('exceeds remaining daily limit');
    });

    it('should throw error when email adapter not configured', async () => {
      const agentWithoutEmail = new MarketingAgent({
        id: 'marketing-agent',
        name: 'Marketing Agent',
        capabilities: [],
        integrations: {}, // No email
        decisionEngine: mockDecisionEngine,
        memory: mockMemory,
        approvalQueue: mockApprovalQueue,
      });

      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.email.campaign' as TaskType,
        priority: 1,
        data: {
          segment: 'users',
          subject: 'Test',
          content: 'Content',
          recipientCount: 50,
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await expect(agentWithoutEmail.executeTask(task)).rejects.toThrow(JarvisError);
      await expect(agentWithoutEmail.executeTask(task)).rejects.toThrow(
        'Email integration not configured'
      );
    });
  });

  describe('createContent', () => {
    it('should create marketing content', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.content.create' as TaskType,
        priority: 1,
        data: {
          contentType: 'blog post',
          topic: 'The Future of Browser-Based DAWs',
          targetAudience: 'Music producers',
          tone: 'professional',
          wordCount: 800,
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('contentType', 'blog post');
      expect(result.data).toHaveProperty('content');
      expect(result.data).toHaveProperty('wordCount');
    });
  });

  describe('daily email count management', () => {
    it('should reset daily count on new day', () => {
      // Manually set daily count
      (agent as any).dailyEmailCount = 200;
      (agent as any).lastResetDate = new Date('2025-01-01');

      // Trigger check (this happens in executeTask)
      (agent as any).checkAndResetDailyCount();

      const stats = agent.getDailyEmailStats();
      expect(stats.sent).toBe(0);
    });

    it('should not reset count on same day', async () => {
      // Send 100 emails
      await agent.executeTask({
        id: 'task-1',
        type: 'marketing.email.campaign' as TaskType,
        priority: 1,
        data: {
          segment: 'users',
          subject: 'Test',
          content: 'Content',
          recipientCount: 100,
        },
        requestedBy: 'test',
        timestamp: new Date(),
      });

      // Send another 50
      await agent.executeTask({
        id: 'task-2',
        type: 'marketing.email.campaign' as TaskType,
        priority: 1,
        data: {
          segment: 'users',
          subject: 'Test 2',
          content: 'Content',
          recipientCount: 50,
        },
        requestedBy: 'test',
        timestamp: new Date(),
      });

      const stats = agent.getDailyEmailStats();
      expect(stats.sent).toBe(150); // Cumulative
      expect(stats.remaining).toBe(150);
    });

    it('should provide accurate stats', () => {
      (agent as any).dailyEmailCount = 175;

      const stats = agent.getDailyEmailStats();

      expect(stats.sent).toBe(175);
      expect(stats.limit).toBe(300);
      expect(stats.remaining).toBe(125);
      expect(stats.resetDate).toBeInstanceOf(Date);
    });

    it('should allow manual reset', () => {
      (agent as any).dailyEmailCount = 250;

      agent.resetDailyEmailCount();

      const stats = agent.getDailyEmailStats();
      expect(stats.sent).toBe(0);
      expect(stats.remaining).toBe(300);
    });
  });

  describe('platform optimization', () => {
    it('should optimize content for Twitter character limit', () => {
      const longContent = 'a'.repeat(300); // Exceeds 280 char limit
      const optimized = (agent as any).optimizeForPlatform(longContent, 'twitter');

      expect(optimized.length).toBeLessThanOrEqual(280);
      expect(optimized).toMatch(/\.\.\.$/); // Should end with ...
    });

    it('should not truncate content under platform limit', () => {
      const shortContent = 'Short tweet';
      const optimized = (agent as any).optimizeForPlatform(shortContent, 'twitter');

      expect(optimized).toBe(shortContent);
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported task type', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.unsupported' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await expect(agent.executeTask(task)).rejects.toThrow(JarvisError);
      await expect(agent.executeTask(task)).rejects.toThrow('Unsupported task type');
    });

    it('should throw error when Buffer profile ID not configured', async () => {
      delete process.env.BUFFER_TWITTER_PROFILE_ID;

      const task: TaskRequest = {
        id: 'task-1',
        type: 'marketing.social.post' as TaskType,
        priority: 1,
        data: {
          platform: 'twitter',
          topic: 'Test',
          targetAudience: 'Test',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await expect(agent.executeTask(task)).rejects.toThrow(JarvisError);
      await expect(agent.executeTask(task)).rejects.toThrow('Buffer profile ID not configured');
    });
  });
});
