/**
 * Tests for Support Agent
 *
 * Comprehensive test suite covering ticket routing, KB search, automated responses,
 * and support metrics with production-ready fixes applied.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SupportAgent, SupportTicket, KBArticle } from './support-agent';
import { JarvisError, ErrorCode } from '../utils/error-handler';

// Mock BaseAgent
vi.mock('./base-agent', () => ({
  BaseAgent: class BaseAgent {
    protected id = 'support-agent-1';
    protected logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    protected async generateContent(prompt: string): Promise<string> {
      // Mock implementation
      if (prompt.includes('Categorize')) {
        return 'general';
      }
      return '<p>Mocked response</p>';
    }
  },
}));

describe('SupportAgent', () => {
  let agent: SupportAgent;
  let mockHubSpot: any;
  let mockEmail: any;
  let mockSupabase: any;
  let mockConfig: any;

  beforeEach(() => {
    mockHubSpot = {
      logActivity: vi.fn().mockResolvedValue(undefined),
    };

    mockEmail = {
      sendEmail: vi.fn().mockResolvedValue({ messageId: 'msg-123', status: 'sent' }),
    };

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };

    mockConfig = {
      id: 'support-agent-1',
      name: 'Support Agent',
      integrations: {
        hubspot: mockHubSpot,
        email: mockEmail,
        supabase: mockSupabase,
      },
      llmClient: {},
      decisionEngine: {},
      memory: {},
    };

    agent = new SupportAgent(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create SupportAgent with all integrations', () => {
      expect(agent).toBeInstanceOf(SupportAgent);
    });

    it('should throw error if HubSpot missing', () => {
      const configWithoutHubSpot = {
        ...mockConfig,
        integrations: { ...mockConfig.integrations, hubspot: null },
      };

      expect(() => new SupportAgent(configWithoutHubSpot)).toThrow(JarvisError);
      expect(() => new SupportAgent(configWithoutHubSpot)).toThrow('HubSpot integration required');
    });

    it('should throw error if Email missing', () => {
      const configWithoutEmail = {
        ...mockConfig,
        integrations: { ...mockConfig.integrations, email: null },
      };

      expect(() => new SupportAgent(configWithoutEmail)).toThrow(JarvisError);
      expect(() => new SupportAgent(configWithoutEmail)).toThrow('Email integration required');
    });

    it('should throw error if Supabase missing', () => {
      const configWithoutSupabase = {
        ...mockConfig,
        integrations: { ...mockConfig.integrations, supabase: null },
      };

      expect(() => new SupportAgent(configWithoutSupabase)).toThrow(JarvisError);
      expect(() => new SupportAgent(configWithoutSupabase)).toThrow('Supabase integration required');
    });
  });

  describe('getSupportedTaskTypes', () => {
    it('should return all supported task types', () => {
      const types = agent.getSupportedTaskTypes();

      expect(types).toContain('support.ticket.route');
      expect(types).toContain('support.ticket.respond');
      expect(types).toContain('support.kb.search');
      expect(types).toContain('support.kb.create');
      expect(types).toContain('support.metrics.generate');
      expect(types).toHaveLength(5);
    });
  });

  describe('canHandle', () => {
    it('should return true for supported task types', () => {
      const task = {
        id: 'task-1',
        type: 'support.ticket.route' as any,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      expect(agent.canHandle(task)).toBe(true);
    });

    it('should return false for unsupported task types', () => {
      const task = {
        id: 'task-1',
        type: 'marketing.social.post' as any,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      expect(agent.canHandle(task)).toBe(false);
    });
  });

  describe('routeTicket', () => {
    it('should route high-priority bug to engineering', async () => {
      const ticket: SupportTicket = {
        id: 'ticket-1',
        subject: 'App is completely broken',
        description: 'The app crashes on startup',
        customerEmail: 'customer@example.com',
        createdAt: new Date(),
      };

      // Mock categorization
      vi.spyOn(agent as any, 'categorizeTicket').mockResolvedValue('bug');

      const routing = await agent.routeTicket(ticket);

      expect(routing.category).toBe('bug');
      expect(routing.assignTo).toBe('engineering');
      expect(routing.priority).toBe('high');
      expect(routing.reasoning).toContain('engineering');
    });

    it('should route billing with refund to human', async () => {
      const ticket: SupportTicket = {
        id: 'ticket-2',
        subject: 'Request refund',
        description: 'I want my money back',
        customerEmail: 'customer@example.com',
        createdAt: new Date(),
      };

      vi.spyOn(agent as any, 'categorizeTicket').mockResolvedValue('billing');

      const routing = await agent.routeTicket(ticket);

      expect(routing.category).toBe('billing');
      expect(routing.assignTo).toBe('human');
      expect(routing.reasoning).toContain('approval');
    });

    it('should route billing without refund to billing team', async () => {
      const ticket: SupportTicket = {
        id: 'ticket-3',
        subject: 'Question about invoice',
        description: 'Can you explain my recent invoice?',
        customerEmail: 'customer@example.com',
        createdAt: new Date(),
      };

      vi.spyOn(agent as any, 'categorizeTicket').mockResolvedValue('billing');

      const routing = await agent.routeTicket(ticket);

      expect(routing.category).toBe('billing');
      expect(routing.assignTo).toBe('billing');
    });

    it('should auto-assign when KB article found with high relevance', async () => {
      const ticket: SupportTicket = {
        id: 'ticket-4',
        subject: 'How to reset password',
        description: 'I forgot my password',
        customerEmail: 'customer@example.com',
        createdAt: new Date(),
      };

      vi.spyOn(agent as any, 'categorizeTicket').mockResolvedValue('general');

      const mockArticles: KBArticle[] = [
        {
          id: 'kb-1',
          title: 'Password Reset Guide',
          content: 'How to reset your password...',
          category: 'account',
          tags: ['password', 'reset'],
          relevanceScore: 0.9,
        },
      ];

      vi.spyOn(agent, 'searchKnowledgeBase').mockResolvedValue(mockArticles);
      vi.spyOn(agent as any, 'generateResponse').mockResolvedValue('<p>Auto response</p>');

      const routing = await agent.routeTicket(ticket);

      expect(routing.assignTo).toBe('auto');
      expect(routing.reasoning).toContain('KB article');
      expect(routing.suggestedResponse).toBeDefined();
    });

    it('should escalate to human when KB relevance is low', async () => {
      const ticket: SupportTicket = {
        id: 'ticket-5',
        subject: 'Complex issue',
        description: 'This is a complicated problem',
        customerEmail: 'customer@example.com',
        createdAt: new Date(),
      };

      vi.spyOn(agent as any, 'categorizeTicket').mockResolvedValue('general');
      vi.spyOn(agent, 'searchKnowledgeBase').mockResolvedValue([]);

      const routing = await agent.routeTicket(ticket);

      expect(routing.assignTo).toBe('human');
      expect(routing.reasoning).toContain('No relevant KB article');
    });

    it('should handle feature requests to product team', async () => {
      const ticket: SupportTicket = {
        id: 'ticket-6',
        subject: 'Feature request: Dark mode',
        description: 'Please add dark mode',
        customerEmail: 'customer@example.com',
        createdAt: new Date(),
      };

      vi.spyOn(agent as any, 'categorizeTicket').mockResolvedValue('feature_request');

      const routing = await agent.routeTicket(ticket);

      expect(routing.assignTo).toBe('product');
      expect(routing.category).toBe('feature_request');
    });
  });

  describe('searchKnowledgeBase', () => {
    it('should search KB with correct FTS syntax', async () => {
      const mockArticles = [
        { id: 'kb-1', title: 'Test', content: 'Content', category: 'test', tags: [] },
      ];

      mockSupabase.select.mockResolvedValue({ data: mockArticles, error: null });

      const results = await agent.searchKnowledgeBase('password reset');

      expect(mockSupabase.from).toHaveBeenCalledWith('kb_articles');
      expect(mockSupabase.or).toHaveBeenCalledWith(
        expect.stringContaining('fts.@@.plainto_tsquery')
      );
      expect(results).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const results = await agent.searchKnowledgeBase('test');

      expect(results).toEqual([]);
    });

    it('should return empty array when no articles found', async () => {
      mockSupabase.select.mockResolvedValue({ data: [], error: null });

      const results = await agent.searchKnowledgeBase('nonexistent');

      expect(results).toEqual([]);
    });

    it('should calculate relevance scores', async () => {
      const mockArticles = [
        {
          id: 'kb-1',
          title: 'Password Reset',
          content: 'How to reset password',
          category: 'account',
          tags: ['password'],
        },
      ];

      mockSupabase.select.mockResolvedValue({ data: mockArticles, error: null });

      const results = await agent.searchKnowledgeBase('password');

      expect(results[0].relevanceScore).toBeGreaterThan(0);
      expect(results[0].relevanceScore).toBeLessThanOrEqual(1);
    });

    it('should sort results by relevance score', async () => {
      const mockArticles = [
        {
          id: 'kb-1',
          title: 'Other Topic',
          content: 'password mentioned here',
          category: 'test',
          tags: [],
        },
        {
          id: 'kb-2',
          title: 'Password Reset Guide',
          content: 'How to reset password',
          category: 'account',
          tags: ['password'],
        },
      ];

      mockSupabase.select.mockResolvedValue({ data: mockArticles, error: null });

      const results = await agent.searchKnowledgeBase('password');

      expect(results[0].id).toBe('kb-2'); // Higher relevance should be first
    });
  });

  describe('getSupportMetrics', () => {
    it('should get metrics with correct count syntax', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          status: 'resolved',
          assigned_to: 'auto',
          escalated: false,
          created_at: '2025-10-01T00:00:00Z',
          first_response_at: '2025-10-01T00:10:00Z',
          resolved_at: '2025-10-01T01:00:00Z',
        },
        {
          id: 'ticket-2',
          status: 'open',
          assigned_to: 'human',
          escalated: true,
          created_at: '2025-10-01T00:00:00Z',
          first_response_at: null,
          resolved_at: null,
        },
      ];

      // Mock count query
      mockSupabase.select.mockResolvedValueOnce({ count: 2 });

      // Mock data query
      mockSupabase.select.mockResolvedValueOnce({ data: mockTickets, error: null });

      const metrics = await agent.getSupportMetrics({
        start: new Date('2025-10-01'),
        end: new Date('2025-10-02'),
      });

      expect(metrics.totalTickets).toBe(2);
      expect(metrics.resolved).toBe(1);
      expect(metrics.autoResolved).toBe(1);
      expect(metrics.escalated).toBe(1);
      expect(metrics.avgResponseTime).toBeGreaterThan(0);
    });

    it('should handle empty metrics', async () => {
      mockSupabase.select.mockResolvedValueOnce({ count: 0 });
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });

      const metrics = await agent.getSupportMetrics({
        start: new Date('2025-10-01'),
        end: new Date('2025-10-02'),
      });

      expect(metrics.totalTickets).toBe(0);
      expect(metrics.resolved).toBe(0);
      expect(metrics.avgResponseTime).toBe(0);
      expect(metrics.avgResolutionTime).toBe(0);
    });

    it('should throw error on database failure', async () => {
      mockSupabase.select.mockResolvedValueOnce({ count: null });
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(
        agent.getSupportMetrics({
          start: new Date('2025-10-01'),
          end: new Date('2025-10-02'),
        })
      ).rejects.toThrow(JarvisError);
    });
  });

  describe('executeTask', () => {
    it('should execute ticket routing task', async () => {
      const task = {
        id: 'task-1',
        type: 'support.ticket.route' as any,
        priority: 1,
        data: {
          subject: 'Test ticket',
          description: 'Test description',
          customerEmail: 'customer@example.com',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      vi.spyOn(agent, 'routeTicket').mockResolvedValue({
        ticketId: 'ticket-1',
        assignTo: 'auto',
        priority: 'low',
        category: 'general',
        reasoning: 'Test',
        suggestedResponse: '<p>Response</p>',
      });

      mockSupabase.insert.mockResolvedValue({ data: {}, error: null });
      mockSupabase.update.mockResolvedValue({ data: {}, error: null });

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should execute KB search task', async () => {
      const task = {
        id: 'task-2',
        type: 'support.kb.search' as any,
        priority: 1,
        data: { query: 'password reset' },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      vi.spyOn(agent, 'searchKnowledgeBase').mockResolvedValue([
        {
          id: 'kb-1',
          title: 'Test',
          content: 'Content',
          category: 'test',
          tags: [],
          relevanceScore: 0.9,
        },
      ]);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.articles).toHaveLength(1);
    });

    it('should execute KB create task', async () => {
      const task = {
        id: 'task-3',
        type: 'support.kb.create' as any,
        priority: 1,
        data: {
          title: 'New Article',
          content: 'Article content',
          category: 'general',
          tags: ['test'],
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      mockSupabase.insert.mockResolvedValue({
        data: { id: 'kb-new' },
        error: null,
      });
      mockSupabase.single.mockResolvedValue({
        data: { id: 'kb-new' },
        error: null,
      });

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should execute metrics generation task', async () => {
      const task = {
        id: 'task-4',
        type: 'support.metrics.generate' as any,
        priority: 1,
        data: {
          start: '2025-10-01',
          end: '2025-10-02',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      vi.spyOn(agent, 'getSupportMetrics').mockResolvedValue({
        totalTickets: 10,
        resolved: 8,
        avgResponseTime: 15,
        avgResolutionTime: 120,
        autoResolved: 5,
        escalated: 2,
      });

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.totalTickets).toBe(10);
    });

    it('should throw error for unsupported task type', async () => {
      const task = {
        id: 'task-5',
        type: 'unsupported.task' as any,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await expect(agent.executeTask(task)).rejects.toThrow(JarvisError);
    });
  });

  describe('private methods', () => {
    it('should determine priority from keywords', () => {
      const ticket: SupportTicket = {
        id: 'ticket-1',
        subject: 'System is down',
        description: 'Everything is broken',
        customerEmail: 'customer@example.com',
        createdAt: new Date(),
      };

      const priority = (agent as any).determinePriority(ticket, 'bug');

      expect(priority).toBe('critical');
    });

    it('should detect refund requests', () => {
      const ticket: SupportTicket = {
        id: 'ticket-1',
        subject: 'I want a refund',
        description: 'Please give me my money back',
        customerEmail: 'customer@example.com',
        createdAt: new Date(),
      };

      const requiresRefund = (agent as any).requiresRefund(ticket);

      expect(requiresRefund).toBe(true);
    });

    it('should calculate relevance score correctly', async () => {
      const article = {
        title: 'Password Reset Guide',
        content: 'How to reset your password step by step',
        tags: ['password', 'reset', 'account'],
      };

      const score = await (agent as any).calculateRelevance('password reset', article);

      expect(score).toBeGreaterThan(0.5); // Should have good relevance
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should calculate average response time', () => {
      const tickets = [
        {
          created_at: '2025-10-01T00:00:00Z',
          first_response_at: '2025-10-01T00:10:00Z', // 10 min
        },
        {
          created_at: '2025-10-01T00:00:00Z',
          first_response_at: '2025-10-01T00:20:00Z', // 20 min
        },
      ];

      const avgTime = (agent as any).calculateAvgResponseTime(tickets);

      expect(avgTime).toBe(15); // Average of 10 and 20
    });

    it('should calculate average resolution time', () => {
      const tickets = [
        {
          created_at: '2025-10-01T00:00:00Z',
          resolved_at: '2025-10-01T01:00:00Z', // 60 min
        },
        {
          created_at: '2025-10-01T00:00:00Z',
          resolved_at: '2025-10-01T02:00:00Z', // 120 min
        },
      ];

      const avgTime = (agent as any).calculateAvgResolutionTime(tickets);

      expect(avgTime).toBe(90); // Average of 60 and 120
    });
  });
});
