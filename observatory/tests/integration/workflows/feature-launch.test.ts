/**
 * Feature Launch Workflow Integration Tests
 *
 * End-to-end tests for the feature launch workflow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureLaunchWorkflow } from '../../../src/workflows/feature-launch.js';
import { LangGraphOrchestrator } from '../../../src/core/langgraph-orchestrator.js';
import { BaseAgent } from '../../../src/agents/base-agent.js';
import type { MemorySystem } from '../../../src/core/memory.js';
import type { TaskRequest, TaskResult, TaskType } from '../../../src/types/tasks.js';

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

class MockMemorySystem implements MemorySystem {
  private entries: any[] = [];

  async initialize(): Promise<void> {}

  async store(entry: any): Promise<void> {
    this.entries.push(entry);
  }

  async query(query: any): Promise<any[]> {
    return this.entries;
  }

  async storeEntry(entry: any): Promise<void> {
    this.entries.push(entry);
  }

  async getRecentMemories(limit: number): Promise<any[]> {
    return this.entries.slice(-limit);
  }

  async searchMemories(query: string, limit: number): Promise<any[]> {
    return this.entries.slice(0, limit);
  }

  getEntries(): any[] {
    return this.entries;
  }
}

class MockMarketingAgent extends BaseAgent {
  constructor(memory: MemorySystem) {
    super({
      id: 'marketing-agent',
      name: 'Marketing Agent',
      capabilities: [],
      integrations: {},
      decisionEngine: {} as any,
      memory,
      approvalQueue: {} as any,
    });
  }

  getSupportedTaskTypes(): TaskType[] {
    return [
      'marketing.social.post',
      'marketing.content.create',
      'marketing.email.campaign',
    ] as TaskType[];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    return {
      taskId: task.id,
      success: true,
      status: 'completed',
      data: {
        blogPost: 'https://dawgai.com/blog/new-feature',
        socialPosts: [
          { platform: 'twitter', scheduled: true },
          { platform: 'linkedin', scheduled: true },
        ],
        emailSent: true,
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: 'Marketing campaign launched successfully',
    };
  }
}

class MockSalesAgent extends BaseAgent {
  constructor(memory: MemorySystem) {
    super({
      id: 'sales-agent',
      name: 'Sales Agent',
      capabilities: [],
      integrations: {},
      decisionEngine: {} as any,
      memory,
      approvalQueue: {} as any,
    });
  }

  getSupportedTaskTypes(): TaskType[] {
    return ['sales.lead.qualify', 'sales.outreach', 'sales.follow_up'] as TaskType[];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    return {
      taskId: task.id,
      success: true,
      status: 'completed',
      data: {
        outreachSequence: 'created',
        targetSegment: 'power-users',
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: 'Sales outreach configured',
    };
  }
}

class MockOperationsAgent extends BaseAgent {
  constructor(memory: MemorySystem) {
    super({
      id: 'operations-agent',
      name: 'Operations Agent',
      capabilities: [],
      integrations: {},
      decisionEngine: {} as any,
      memory,
      approvalQueue: {} as any,
    });
  }

  getSupportedTaskTypes(): TaskType[] {
    return ['ops.data.sync', 'ops.analytics', 'ops.monitoring'] as TaskType[];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    return {
      taskId: task.id,
      success: true,
      status: 'completed',
      data: {
        dashboardCreated: true,
        metricsTracked: ['engagement', 'conversion', 'retention'],
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: 'Analytics dashboard configured',
    };
  }
}

class MockSupportAgent extends BaseAgent {
  constructor(memory: MemorySystem) {
    super({
      id: 'support-agent',
      name: 'Support Agent',
      capabilities: [],
      integrations: {},
      decisionEngine: {} as any,
      memory,
      approvalQueue: {} as any,
    });
  }

  getSupportedTaskTypes(): TaskType[] {
    return [
      'support.ticket.respond',
      'support.ticket.route',
      'support.kb.update',
    ] as TaskType[];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    return {
      taskId: task.id,
      success: true,
      status: 'completed',
      data: {
        kbArticleCreated: true,
        faqsPrepared: true,
        teamNotified: true,
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: 'Support documentation updated',
    };
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Feature Launch Workflow', () => {
  let workflow: FeatureLaunchWorkflow;
  let orchestrator: LangGraphOrchestrator;
  let memory: MockMemorySystem;

  beforeEach(() => {
    memory = new MockMemorySystem();
    orchestrator = new LangGraphOrchestrator(memory);

    // Register mock agents
    orchestrator.registerAgent('marketing', new MockMarketingAgent(memory));
    orchestrator.registerAgent('sales', new MockSalesAgent(memory));
    orchestrator.registerAgent('operations', new MockOperationsAgent(memory));
    orchestrator.registerAgent('support', new MockSupportAgent(memory));

    workflow = new FeatureLaunchWorkflow(orchestrator);
  });

  describe('Readiness Checks', () => {
    it('should validate complete configuration', async () => {
      const config = {
        featureName: 'AI Beat Generator',
        description: 'Generate professional beats with AI',
        targetAudience: 'Music producers and beatmakers',
        launchDate: new Date(Date.now() + 86400000), // Tomorrow
        pricing: {
          tier: 'Pro',
          price: 29,
        },
        highlights: [
          'Generate beats in seconds',
          'Multiple genre styles',
          'Export to MIDI',
        ],
      };

      const { ready, issues } = await workflow.checkReadiness(config);

      expect(ready).toBe(true);
      expect(issues.length).toBe(0);
    });

    it('should detect missing required fields', async () => {
      const config = {
        featureName: '',
        description: '',
        targetAudience: '',
        launchDate: new Date(),
        highlights: [],
      };

      const { ready, issues } = await workflow.checkReadiness(config);

      expect(ready).toBe(false);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.includes('Feature name'))).toBe(true);
      expect(issues.some((i) => i.includes('description'))).toBe(true);
    });

    it('should detect past launch dates', async () => {
      const config = {
        featureName: 'Test Feature',
        description: 'Test description',
        targetAudience: 'Test audience',
        launchDate: new Date(Date.now() - 86400000), // Yesterday
        highlights: ['Test'],
      };

      const { ready, issues } = await workflow.checkReadiness(config);

      expect(ready).toBe(false);
      expect(issues.some((i) => i.includes('past'))).toBe(true);
    });
  });

  describe('Simple Launch', () => {
    it('should execute simple announcement', async () => {
      const success = await workflow.executeSimple(
        'AI Beat Generator',
        'Create professional beats with AI assistance'
      );

      expect(success).toBe(true);
    });

    it('should handle announcement failures gracefully', async () => {
      // Override marketing agent to fail
      class FailingMarketingAgent extends MockMarketingAgent {
        async executeTask(task: TaskRequest): Promise<TaskResult> {
          throw new Error('Social media API failed');
        }
      }

      orchestrator.registerAgent('marketing', new FailingMarketingAgent(memory));

      const success = await workflow.executeSimple('Test', 'Test description');

      // Should return false instead of throwing
      expect(success).toBe(false);
    });
  });

  describe('Full Feature Launch', () => {
    it('should execute complete feature launch workflow', async () => {
      const config = {
        featureName: 'AI Beat Generator',
        description: 'Generate professional beats with AI assistance',
        targetAudience: 'Music producers, beatmakers, and content creators',
        launchDate: new Date(Date.now() + 86400000),
        pricing: {
          tier: 'Pro',
          price: 29,
        },
        highlights: [
          'Generate beats in multiple genres',
          'Real-time customization',
          'Export to MIDI and audio',
          'Integrated with your DAW',
        ],
      };

      const result = await workflow.execute(config);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.announcementPublished).toBe(true);
      expect(result.socialCampaignScheduled).toBe(true);
      expect(result.emailSent).toBe(true);
      expect(result.kbUpdated).toBe(true);
      expect(result.supportPrepared).toBe(true);
      expect(result.metricsTracked).toBe(true);
      expect(result.errors.length).toBe(0);
    }, 30000); // 30 second timeout for complex workflow

    it('should track which components completed', async () => {
      const config = {
        featureName: 'Test Feature',
        description: 'Test',
        targetAudience: 'Test',
        launchDate: new Date(Date.now() + 86400000),
        highlights: ['Test'],
      };

      const result = await workflow.execute(config);

      expect(result).toBeDefined();

      // At least some components should complete
      const completedCount = [
        result.announcementPublished,
        result.socialCampaignScheduled,
        result.emailSent,
        result.kbUpdated,
        result.supportPrepared,
        result.metricsTracked,
      ].filter(Boolean).length;

      expect(completedCount).toBeGreaterThan(0);
    });

    it('should handle partial failures gracefully', async () => {
      // Override one agent to fail
      class FailingSupportAgent extends MockSupportAgent {
        async executeTask(task: TaskRequest): Promise<TaskResult> {
          throw new Error('KB update failed');
        }
      }

      orchestrator.registerAgent('support', new FailingSupportAgent(memory));

      const config = {
        featureName: 'Test Feature',
        description: 'Test',
        targetAudience: 'Test',
        launchDate: new Date(Date.now() + 86400000),
        highlights: ['Test'],
      };

      const result = await workflow.execute(config);

      // Should still return a result
      expect(result).toBeDefined();

      // Some components should succeed even if support failed
      expect(result.announcementPublished || result.socialCampaignScheduled).toBe(true);
    });
  });

  describe('Rollback', () => {
    it('should execute rollback workflow', async () => {
      const success = await workflow.rollback('AI Beat Generator');

      expect(success).toBe(true);
    });

    it('should handle rollback failures', async () => {
      // Override operations agent to fail rollback
      class FailingOperationsAgent extends MockOperationsAgent {
        async executeTask(task: TaskRequest): Promise<TaskResult> {
          if (task.data.action === 'rollback_feature') {
            throw new Error('Rollback failed');
          }
          return super.executeTask(task);
        }
      }

      orchestrator.registerAgent('operations', new FailingOperationsAgent(memory));

      const success = await workflow.rollback('Test Feature');

      // Should return false instead of throwing
      expect(success).toBe(false);
    });
  });

  describe('Memory and Tracking', () => {
    it('should store launch execution in memory', async () => {
      const config = {
        featureName: 'Test Feature',
        description: 'Test',
        targetAudience: 'Test',
        launchDate: new Date(Date.now() + 86400000),
        highlights: ['Test'],
      };

      await workflow.execute(config);

      const entries = memory.getEntries();
      expect(entries.length).toBeGreaterThan(0);

      // Should have multi-agent execution entry
      const multiAgentEntry = entries.find(
        (e) => e.type === 'multi_agent_execution'
      );
      expect(multiAgentEntry).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete simple launch within 5 seconds', async () => {
      const startTime = Date.now();
      await workflow.executeSimple('Test', 'Test');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it('should complete full launch within 30 seconds', async () => {
      const config = {
        featureName: 'Test Feature',
        description: 'Test',
        targetAudience: 'Test',
        launchDate: new Date(Date.now() + 86400000),
        highlights: ['Test'],
      };

      const startTime = Date.now();
      await workflow.execute(config);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000);
    }, 35000); // 35 second timeout
  });
});
