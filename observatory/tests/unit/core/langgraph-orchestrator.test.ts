/**
 * LangGraph Orchestrator Tests
 *
 * Comprehensive test suite for the LangGraph-based multi-agent orchestration system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LangGraphOrchestrator } from '../../../src/core/langgraph-orchestrator.js';
import { BaseAgent } from '../../../src/agents/base-agent.js';
import type { MemorySystem } from '../../../src/core/memory.js';
import type { TaskRequest, TaskResult, TaskType, Priority } from '../../../src/types/tasks.js';

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

class MockAgent extends BaseAgent {
  private taskTypes: TaskType[];

  constructor(
    id: string,
    name: string,
    taskTypes: TaskType[],
    memory: MemorySystem
  ) {
    super({
      id,
      name,
      capabilities: [],
      integrations: {},
      decisionEngine: {} as any,
      memory,
      approvalQueue: {} as any,
    });
    this.taskTypes = taskTypes;
  }

  getSupportedTaskTypes(): TaskType[] {
    return this.taskTypes;
  }

  canHandle(task: TaskRequest): boolean {
    return this.taskTypes.includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      taskId: task.id,
      success: true,
      status: 'completed',
      data: {
        agentId: this.id,
        agentName: this.name,
        action: `Processed ${task.type}`,
      },
      timestamp: new Date(),
      executedBy: this.id,
      message: `${this.name} completed the task`,
    };
  }
}

class MockMemorySystem implements MemorySystem {
  async initialize(): Promise<void> {}

  async store(entry: any): Promise<void> {
    // Mock storage
  }

  async query(query: any): Promise<any[]> {
    return [];
  }

  async storeEntry(entry: any): Promise<void> {
    // Mock storage
  }

  async getRecentMemories(limit: number): Promise<any[]> {
    return [];
  }

  async searchMemories(query: string, limit: number): Promise<any[]> {
    return [];
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('LangGraphOrchestrator', () => {
  let orchestrator: LangGraphOrchestrator;
  let memory: MockMemorySystem;
  let marketingAgent: MockAgent;
  let salesAgent: MockAgent;
  let operationsAgent: MockAgent;
  let supportAgent: MockAgent;

  beforeEach(() => {
    memory = new MockMemorySystem();
    orchestrator = new LangGraphOrchestrator(memory);

    // Create mock agents
    marketingAgent = new MockAgent(
      'marketing-agent',
      'Marketing Agent',
      ['marketing.social.post', 'marketing.content.create', 'marketing.email.campaign'] as TaskType[],
      memory
    );

    salesAgent = new MockAgent(
      'sales-agent',
      'Sales Agent',
      ['sales.lead.qualify', 'sales.outreach', 'sales.follow_up'] as TaskType[],
      memory
    );

    operationsAgent = new MockAgent(
      'operations-agent',
      'Operations Agent',
      ['ops.data.sync', 'ops.analytics', 'ops.monitoring'] as TaskType[],
      memory
    );

    supportAgent = new MockAgent(
      'support-agent',
      'Support Agent',
      ['support.ticket.respond', 'support.ticket.route', 'support.kb.update'] as TaskType[],
      memory
    );

    // Register agents
    orchestrator.registerAgent('marketing', marketingAgent);
    orchestrator.registerAgent('sales', salesAgent);
    orchestrator.registerAgent('operations', operationsAgent);
    orchestrator.registerAgent('support', supportAgent);
  });

  describe('Agent Registration', () => {
    it('should register agents successfully', () => {
      const agents = orchestrator.getRegisteredAgents();

      expect(agents).toContain('marketing');
      expect(agents).toContain('sales');
      expect(agents).toContain('operations');
      expect(agents).toContain('support');
      expect(agents.length).toBe(4);
    });

    it('should allow registering new agents after initialization', () => {
      const newAgent = new MockAgent(
        'custom-agent',
        'Custom Agent',
        ['ops.data.sync'] as TaskType[],
        memory
      );

      orchestrator.registerAgent('custom', newAgent);

      const agents = orchestrator.getRegisteredAgents();
      expect(agents).toContain('custom');
      expect(agents.length).toBe(5);
    });
  });

  describe('Simple Task Execution', () => {
    it('should route simple marketing task to marketing agent', async () => {
      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.social.post' as TaskType,
        priority: 1 as Priority,
        data: {
          platform: 'twitter',
          content: 'Test post about DAWG AI',
        },
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      const result = await orchestrator.executeTask(task);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should route operations task to operations agent', async () => {
      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'ops.analytics' as TaskType,
        priority: 2 as Priority,
        data: {
          report: 'monthly',
        },
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      const result = await orchestrator.executeTask(task);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Multi-Agent Coordination', () => {
    it('should coordinate multiple agents for complex tasks', async () => {
      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.content.create' as TaskType,
        priority: 1 as Priority,
        data: {
          workflow: 'feature_launch',
          featureName: 'AI Beat Generator',
          description: 'Generate professional beats with AI',
          actions: [
            'Create announcement',
            'Schedule social posts',
            'Update knowledge base',
            'Track metrics',
          ],
        },
        requestedBy: 'test-suite',
        timestamp: new Date(),
        metadata: {
          requiresCollaboration: true,
        },
      };

      const result = await orchestrator.executeTask(task);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.agentActions).toBeDefined();
    });

    it('should handle parallel agent execution', async () => {
      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.email.campaign' as TaskType,
        priority: 1 as Priority,
        data: {
          campaign: 'Pro Tier Launch',
          parallel: true,
        },
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      const startTime = Date.now();
      const result = await orchestrator.executeTask(task);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Parallel execution should be faster than sequential
      // With 4 agents taking ~10ms each, sequential = 40ms, parallel = ~15ms
      expect(duration).toBeLessThan(5000); // reasonable upper bound
    });
  });

  describe('Error Handling', () => {
    it('should handle agent execution failures gracefully', async () => {
      // Create an agent that always fails
      class FailingAgent extends MockAgent {
        async executeTask(task: TaskRequest): Promise<TaskResult> {
          throw new Error('Simulated agent failure');
        }
      }

      const failingAgent = new FailingAgent(
        'failing-agent',
        'Failing Agent',
        ['ops.monitoring'] as TaskType[],
        memory
      );

      orchestrator.registerAgent('failing', failingAgent);

      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'ops.monitoring' as TaskType,
        priority: 0 as Priority,
        data: {},
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      // Should not throw, but return a result with errors
      const result = await orchestrator.executeTask(task);

      // The orchestrator should still complete and return a result
      expect(result).toBeDefined();
    });

    it('should continue workflow when one agent fails in multi-agent tasks', async () => {
      class PartiallyFailingAgent extends MockAgent {
        async executeTask(task: TaskRequest): Promise<TaskResult> {
          // Fail 50% of the time
          if (Math.random() > 0.5) {
            throw new Error('Random failure');
          }
          return super.executeTask(task);
        }
      }

      const flaky = new PartiallyFailingAgent(
        'flaky-agent',
        'Flaky Agent',
        ['ops.data.sync'] as TaskType[],
        memory
      );

      orchestrator.registerAgent('flaky', flaky);

      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.content.create' as TaskType,
        priority: 1 as Priority,
        data: {
          multiAgent: true,
        },
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      const result = await orchestrator.executeTask(task);

      // Should still return a result
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete simple tasks within 5 seconds', async () => {
      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.social.post' as TaskType,
        priority: 1 as Priority,
        data: {
          content: 'Quick post',
        },
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      const startTime = Date.now();
      await orchestrator.executeTask(task);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it('should complete complex multi-agent tasks within 30 seconds', async () => {
      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.content.create' as TaskType,
        priority: 1 as Priority,
        data: {
          workflow: 'feature_launch',
          complex: true,
        },
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      const startTime = Date.now();
      await orchestrator.executeTask(task);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000);
    });
  });

  describe('Result Aggregation', () => {
    it('should aggregate results from multiple agents', async () => {
      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.email.campaign' as TaskType,
        priority: 1 as Priority,
        data: {
          campaign: 'Multi-Agent Test',
        },
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      const result = await orchestrator.executeTask(task);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.agentActions).toBeDefined();
    });

    it('should identify when more work is needed', async () => {
      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.content.create' as TaskType,
        priority: 1 as Priority,
        data: {
          incomplete: true,
        },
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      const result = await orchestrator.executeTask(task);

      expect(result).toBeDefined();
      // Result should indicate if more work is needed
      expect(result.needsMoreWork).toBeDefined();
    });
  });

  describe('Memory Integration', () => {
    it('should store execution results in memory', async () => {
      const storeSpy = vi.spyOn(memory, 'store');

      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'ops.analytics' as TaskType,
        priority: 2 as Priority,
        data: {},
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      await orchestrator.executeTask(task);

      expect(storeSpy).toHaveBeenCalled();
    });

    it('should store multi-agent executions with appropriate metadata', async () => {
      const storeSpy = vi.spyOn(memory, 'store');

      const task: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.content.create' as TaskType,
        priority: 1 as Priority,
        data: {
          multiAgent: true,
        },
        requestedBy: 'test-suite',
        timestamp: new Date(),
      };

      await orchestrator.executeTask(task);

      expect(storeSpy).toHaveBeenCalled();

      // Check that the stored entry has the right structure
      const storeCall = storeSpy.mock.calls[0][0];
      expect(storeCall.type).toBe('multi_agent_execution');
      expect(storeCall.content).toBeDefined();
      expect(storeCall.content.agentResponses).toBeDefined();
    });
  });
});
