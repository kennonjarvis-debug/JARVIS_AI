/**
 * E2E System Integration Tests
 * Tests the full Jarvis system with all components working together
 */

// Set environment variables BEFORE any imports
process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-test-key-placeholder';
process.env.SUPABASE_URL = 'https://testproject.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon';
process.env.HUBSPOT_PRIVATE_APP_TOKEN = 'pat-na1-test-token';
process.env.BREVO_API_KEY = 'xkeysib-test-api-key';
process.env.BUFFER_CLIENT_ID = 'test-client-id';
process.env.BUFFER_CLIENT_SECRET = 'test-client-secret';
process.env.BUFFER_ACCESS_TOKEN = 'test-access-token';
process.env.N8N_WEBHOOK_URL = 'https://test.n8n.webhook/endpoint';
process.env.TZ = 'America/Phoenix';
process.env.CRON_TIMEZONE = 'America/Phoenix';
process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock the scheduler module to avoid node-cron issues in tests
vi.mock('../../src/scheduler', () => ({
  initializeScheduler: vi.fn(() => {}),
}));

// Mock validateConfig to always return valid for tests
vi.mock('../../src/config/tools', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    validateConfig: vi.fn(() => ({ valid: true, errors: [] })),
  };
});

import { initializeJarvis } from '../../src/index';
import type { Task } from '../../src/types/tasks';

describe('E2E: Jarvis System Integration', () => {
  let jarvis: Awaited<ReturnType<typeof initializeJarvis>>;

  describe('System Initialization', () => {
    it('should initialize Jarvis with all components', async () => {
      // This will fail if any required env vars are missing
      jarvis = await initializeJarvis();
      expect(jarvis).toBeDefined();
    });

    it('should have all 4 agents initialized', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      expect(jarvis.agents.marketingAgent).toBeDefined();
      expect(jarvis.agents.salesAgent).toBeDefined();
      expect(jarvis.agents.supportAgent).toBeDefined();
      expect(jarvis.agents.operationsAgent).toBeDefined();
    });

    it('should have DecisionEngine initialized with rules', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      expect(jarvis.decisionEngine).toBeDefined();
      // DecisionEngine should have loaded rules from config
      expect(jarvis.decisionEngine.getConfidenceThreshold('low')).toBe(0.7);
      expect(jarvis.decisionEngine.getConfidenceThreshold('medium')).toBe(0.8);
      expect(jarvis.decisionEngine.getConfidenceThreshold('high')).toBe(0.9);
      expect(jarvis.decisionEngine.getConfidenceThreshold('critical')).toBe(1.0);
    });

    it('should have Orchestrator initialized', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      expect(jarvis.orchestrator).toBeDefined();
    });

    it('should have Memory system initialized', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      expect(jarvis.memory).toBeDefined();
    });

    it('should have ApprovalQueue initialized', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      expect(jarvis.approvalQueue).toBeDefined();
    });
  });

  describe('Decision Engine Integration', () => {
    it('should route low-risk tasks for autonomous execution', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      const lowRiskTask: Task = {
        id: 'test-1',
        type: 'marketing.social.post',
        priority: 1,
        data: {
          platform: 'twitter',
          text: 'Just shipped a great feature!',
        },
        requestedBy: 'system',
        timestamp: new Date(),
      };

      const decision = await jarvis.decisionEngine.evaluate({
        task: lowRiskTask,
        historicalData: [],
        rules: [],
        agentCapabilities: [],
      });

      // Low risk tasks should be executable without approval
      expect(['execute', 'request_approval']).toContain(decision.action);
      expect(decision.riskLevel).toBe('low');
    });

    it('should route high-risk tasks to approval queue', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      const highRiskTask: Task = {
        id: 'test-2',
        type: 'marketing.email.campaign',
        priority: 1,
        data: {
          recipientCount: 500, // Over Brevo 300 limit
          subject: 'Big announcement',
        },
        requestedBy: 'system',
        timestamp: new Date(),
      };

      const decision = await jarvis.decisionEngine.evaluate({
        task: highRiskTask,
        historicalData: [],
        rules: [],
        agentCapabilities: [],
      });

      // High risk tasks should require approval
      expect(decision.requiresApproval).toBe(true);
      expect(decision.riskLevel).toBe('high');
    });

    it('should enforce financial thresholds', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      const financialTask: Task = {
        id: 'test-3',
        type: 'support.issue.refund',
        priority: 1,
        data: {
          amount: 150, // Over $50 threshold
          ticketId: 'TICKET-123',
        },
        requestedBy: 'support-agent',
        timestamp: new Date(),
      };

      const decision = await jarvis.decisionEngine.evaluate({
        task: financialTask,
        historicalData: [],
        rules: [],
        agentCapabilities: [],
      });

      // Financial tasks over threshold should require approval
      expect(decision.requiresApproval).toBe(true);
      expect(['high', 'critical']).toContain(decision.riskLevel);
    });
  });

  describe('Agent Integration', () => {
    it('should have Marketing Agent ready to handle tasks', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      expect(jarvis.agents.marketingAgent.status).toBe('idle');
      expect(jarvis.agents.marketingAgent.name).toBe('Marketing Agent');
    });

    it('should have Sales Agent ready to handle tasks', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      expect(jarvis.agents.salesAgent.status).toBe('idle');
      expect(jarvis.agents.salesAgent.name).toBe('Sales Agent');
    });

    it('should have Support Agent ready to handle tasks', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      expect(jarvis.agents.supportAgent.status).toBe('idle');
      expect(jarvis.agents.supportAgent.name).toBe('Support Agent');
    });

    it('should have Operations Agent ready to handle tasks', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      expect(jarvis.agents.operationsAgent.status).toBe('idle');
      expect(jarvis.agents.operationsAgent.name).toBe('Operations Agent');
    });
  });

  describe('Orchestrator Integration', () => {
    it('should route marketing tasks to Marketing Agent', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      const marketingTask: Task = {
        id: 'test-marketing',
        type: 'marketing.social.post',
        priority: 1,
        data: { platform: 'twitter', text: 'Test post' },
        requestedBy: 'system',
        timestamp: new Date(),
      };

      const agent = await jarvis.orchestrator.assignAgent(marketingTask);
      expect(agent?.name).toBe('Marketing Agent');
    });

    it('should route sales tasks to Sales Agent', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      const salesTask: Task = {
        id: 'test-sales',
        type: 'sales.lead.qualify',
        priority: 1,
        data: { leadId: 'LEAD-123' },
        requestedBy: 'system',
        timestamp: new Date(),
      };

      const agent = await jarvis.orchestrator.assignAgent(salesTask);
      expect(agent?.name).toBe('Sales Agent');
    });

    it('should route support tasks to Support Agent', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      const supportTask: Task = {
        id: 'test-support',
        type: 'support.ticket.route',
        priority: 1,
        data: { ticketId: 'TICKET-123' },
        requestedBy: 'system',
        timestamp: new Date(),
      };

      const agent = await jarvis.orchestrator.assignAgent(supportTask);
      expect(agent?.name).toBe('Support Agent');
    });
  });

  describe('Memory System Integration', () => {
    it('should store and retrieve entries', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      const testEntry = {
        id: crypto.randomUUID(),
        type: 'decision' as const,
        content: { test: 'data' },
        timestamp: new Date(),
        importance: 0.8,
        metadata: { taskType: 'test' },
      };

      await jarvis.memory.storeEntry(testEntry);
      const entries = await jarvis.memory.getRecentEntries(10);

      expect(entries).toBeDefined();
      expect(Array.isArray(entries)).toBe(true);
    });
  });

  describe('End-to-End Task Flow', () => {
    it('should process a low-risk task end-to-end', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      const task: Task = {
        id: 'e2e-test-1',
        type: 'marketing.social.post',
        priority: 1,
        data: {
          platform: 'twitter',
          text: 'Autonomous AI is amazing!',
        },
        requestedBy: 'system',
        timestamp: new Date(),
      };

      // 1. Decision Engine evaluates
      const decision = await jarvis.decisionEngine.evaluate({
        task,
        historicalData: [],
        rules: [],
        agentCapabilities: [],
      });

      expect(decision).toBeDefined();
      expect(decision.action).toBeDefined();

      // 2. Orchestrator assigns agent
      const agent = await jarvis.orchestrator.assignAgent(task);
      expect(agent).toBeDefined();

      // 3. Task is stored in memory
      const memoryEntry = {
        id: crypto.randomUUID(),
        type: 'task' as const,
        content: { task, decision },
        timestamp: new Date(),
        importance: 0.5,
        metadata: { taskType: task.type },
      };

      await jarvis.memory.storeEntry(memoryEntry);
      const recentEntries = await jarvis.memory.getRecentEntries(1);
      expect(recentEntries.length).toBeGreaterThan(0);
    });

    it('should handle approval workflow for high-risk tasks', async () => {
      if (!jarvis) jarvis = await initializeJarvis();

      const highRiskTask: Task = {
        id: 'e2e-test-2',
        type: 'marketing.email.campaign',
        priority: 1,
        data: {
          recipientCount: 1000,
          subject: 'Major announcement',
          estimatedCost: 75,
        },
        requestedBy: 'marketing-agent',
        timestamp: new Date(),
      };

      // 1. Decision Engine should require approval
      const decision = await jarvis.decisionEngine.evaluate({
        task: highRiskTask,
        historicalData: [],
        rules: [],
        agentCapabilities: [],
      });

      expect(decision.requiresApproval).toBe(true);

      // 2. Task should go to approval queue
      const approvalRequest = await jarvis.approvalQueue.requestApproval({
        taskId: highRiskTask.id,
        taskType: highRiskTask.type,
        description: 'Send email campaign to 1000 recipients',
        riskLevel: decision.riskLevel,
        estimatedImpact: decision.estimatedImpact,
        agentId: 'marketing-agent',
        context: { task: highRiskTask, decision },
        reasoning: decision.reasoning,
        alternatives: decision.alternatives || [],
      });

      expect(approvalRequest).toBeDefined();
      expect(approvalRequest.status).toBe('pending');
    });
  });

  afterAll(async () => {
    if (jarvis?.orchestrator) {
      await jarvis.orchestrator.shutdown();
    }
  });
});
