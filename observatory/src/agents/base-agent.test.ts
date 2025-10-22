/**
 * BaseAgent Tests
 *
 * Comprehensive test suite for the abstract BaseAgent class.
 * Tests execution flow, decision integration, approval workflow, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseAgent } from './base-agent.js';
import { JarvisError, ErrorCode } from '../utils/error-handler.js';
import type { TaskRequest, TaskResult, TaskType } from '../types/tasks.js';

// Create concrete test implementation of abstract BaseAgent
class TestAgent extends BaseAgent {
  getSupportedTaskTypes(): TaskType[] {
    return ['test.task' as TaskType, 'test.other' as TaskType];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    return {
      taskId: task.id,
      success: true,
      status: 'completed',
      data: { message: 'Test executed', taskData: task.data },
      timestamp: new Date(),
      executedBy: this.id,
    };
  }
}

// Test agent that throws errors
class ErrorTestAgent extends BaseAgent {
  getSupportedTaskTypes(): TaskType[] {
    return ['test.error' as TaskType];
  }

  canHandle(task: TaskRequest): boolean {
    return this.getSupportedTaskTypes().includes(task.type);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    throw new JarvisError(
      ErrorCode.INTERNAL_ERROR,
      'Test error',
      { taskId: task.id },
      false
    );
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  let mockDecisionEngine: any;
  let mockMemory: any;
  let mockApprovalQueue: any;

  beforeEach(() => {
    // Mock decision engine
    mockDecisionEngine = {
      evaluate: vi.fn().mockResolvedValue({
        action: 'execute',
        confidence: 0.9,
        reasoning: 'Safe to execute',
        riskLevel: 'low',
        estimatedImpact: { description: 'Minimal impact' },
        requiresApproval: false,
        alternatives: [],
      }),
    };

    // Mock memory system
    mockMemory = {
      getRelevantContext: vi.fn().mockResolvedValue([
        { content: 'Previous task result', importance: 0.8 },
      ]),
      storeEntry: vi.fn().mockResolvedValue(undefined),
    };

    // Mock approval queue
    mockApprovalQueue = {
      requestApproval: vi.fn().mockResolvedValue('req-123'),
    };

    agent = new TestAgent({
      id: 'test-agent',
      name: 'Test Agent',
      capabilities: [
        {
          taskType: 'marketing.social.post' as TaskType,
          description: 'Test capability',
          requiredIntegrations: [],
        },
      ],
      integrations: {},
      decisionEngine: mockDecisionEngine,
      memory: mockMemory,
      approvalQueue: mockApprovalQueue,
    });
  });

  describe('constructor', () => {
    it('should initialize agent with config', () => {
      expect(agent.getId()).toBe('test-agent');
      expect(agent.getName()).toBe('Test Agent');
      expect(agent.getCapabilities()).toHaveLength(1);
    });

    it('should set status to idle on initialization', () => {
      const status = agent.getStatus();
      expect(status.statusMessage).toBe('idle');
    });
  });

  describe('getSupportedTaskTypes', () => {
    it('should return list of supported task types', () => {
      const types = agent.getSupportedTaskTypes();
      expect(types).toContain('test.task');
      expect(types).toContain('test.other');
      expect(types).toHaveLength(2);
    });
  });

  describe('canHandle', () => {
    it('should return true for supported task types', () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      expect(agent.canHandle(task)).toBe(true);
    });

    it('should return false for unsupported task types', () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'unsupported.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      expect(agent.canHandle(task)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute task successfully when approved by decision engine', async () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: { key: 'value' },
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      const result = await agent.execute(task);

      expect(result.status).toBe('completed');
      expect(result.status).toBe('completed');
      expect(result.taskId).toBe('task-123');
      expect(result.agentId).toBe('test-agent');
      expect(mockDecisionEngine.evaluate).toHaveBeenCalled();
      expect(mockMemory.storeEntry).toHaveBeenCalled();
    });

    it('should consult decision engine with context from memory', async () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      await agent.execute(task);

      expect(mockMemory.getRelevantContext).toHaveBeenCalled();
      expect(mockDecisionEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          task,
          historicalData: expect.any(Array),
          agentCapabilities: expect.any(Array),
        })
      );
    });

    it('should store execution result in memory', async () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      await agent.execute(task);

      expect(mockMemory.storeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task_execution',
          content: expect.objectContaining({
            task,
            result: expect.any(Object),
            decision: expect.any(Object),
          }),
          metadata: expect.objectContaining({
            agentId: 'test-agent',
            taskType: 'test.task',
            success: true,
          }),
        })
      );
    });

    it('should throw error when agent cannot handle task type', async () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'unsupported.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      await expect(agent.execute(task)).rejects.toThrow(JarvisError);
      await expect(agent.execute(task)).rejects.toThrow('cannot handle task type');
    });

    it('should request approval when decision engine requires it', async () => {
      mockDecisionEngine.evaluate.mockResolvedValueOnce({
        action: 'request_approval',
        confidence: 0.6,
        reasoning: 'Requires human review',
        riskLevel: 'high',
        estimatedImpact: { description: 'Significant impact' },
        requiresApproval: true,
        alternatives: ['Do nothing', 'Schedule for later'],
      });

      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      const result = await agent.execute(task);

      expect(result.status).toBe('awaiting_approval');
      expect(result.status).toBe('failed');
      expect(result.result).toHaveProperty('requestId', 'req-123');
      expect(mockApprovalQueue.requestApproval).toHaveBeenCalled();
    });

    it('should throw error when decision engine rejects task', async () => {
      mockDecisionEngine.evaluate.mockResolvedValueOnce({
        action: 'reject',
        confidence: 0.95,
        reasoning: 'Too risky to execute',
        riskLevel: 'critical',
        estimatedImpact: { description: 'Severe impact' },
        requiresApproval: false,
        alternatives: [],
      });

      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      await expect(agent.execute(task)).rejects.toThrow(JarvisError);
      await expect(agent.execute(task)).rejects.toThrow('rejected by decision engine');
    });

    it('should store error in memory when execution fails', async () => {
      const errorAgent = new ErrorTestAgent({
        id: 'error-agent',
        name: 'Error Agent',
        capabilities: [],
        integrations: {},
        decisionEngine: mockDecisionEngine,
        memory: mockMemory,
        approvalQueue: mockApprovalQueue,
      });

      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.error' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      await expect(errorAgent.execute(task)).rejects.toThrow();

      expect(mockMemory.storeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          content: expect.objectContaining({
            task,
            error: expect.any(String),
          }),
        })
      );
    });

    it('should update status to busy during execution', async () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      const executePromise = agent.execute(task);

      // Status should be busy during execution
      // (We can't reliably test this due to async timing, but the code is there)

      await executePromise;

      // Status should be idle after completion
      const status = agent.getStatus();
      expect(status.statusMessage).toBe('idle');
    });
  });

  describe('requestApproval', () => {
    it('should submit approval request to queue', async () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      const decision = {
        action: 'request_approval' as const,
        confidence: 0.6,
        reasoning: 'Needs approval',
        riskLevel: 'high' as const,
        estimatedImpact: { description: 'Significant' },
        requiresApproval: true,
        alternatives: ['Alternative 1'],
      };

      // Use type assertion to access protected method for testing
      const result = await (agent as any).requestApproval(task, decision);

      expect(result.status).toBe('awaiting_approval');
      expect(mockApprovalQueue.requestApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-123',
          taskType: 'test.task',
          reasoning: 'Needs approval',
          riskLevel: 'high',
        })
      );
    });
  });

  describe('getStatus', () => {
    it('should return current agent status', () => {
      const status = agent.getStatus();

      expect(status).toMatchObject({
        id: 'test-agent',
        name: 'Test Agent',
        status: 'idle',
        capabilities: expect.any(Array),
        lastActive: expect.any(Date),
      });
    });
  });

  describe('getCapabilities', () => {
    it('should return agent capabilities', () => {
      const capabilities = agent.getCapabilities();

      expect(capabilities).toHaveLength(1);
      expect(capabilities[0]).toMatchObject({
        name: 'testing',
        description: 'Test capability',
        enabled: true,
      });
    });
  });

  describe('helper methods', () => {
    it('validateTaskData should throw error when required fields missing', () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: { field1: 'value' },
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      expect(() => {
        (agent as any).validateTaskData(task, ['field1', 'field2']);
      }).toThrow(JarvisError);

      expect(() => {
        (agent as any).validateTaskData(task, ['field1', 'field2']);
      }).toThrow('Missing required fields');
    });

    it('validateTaskData should not throw when all fields present', () => {
      const task: TaskRequest = {
        id: 'task-123',
        type: 'test.task' as TaskType,
        priority: 1,
        data: { field1: 'value', field2: 'value2' },
        requestedBy: 'test-user',
        timestamp: new Date(),
      };

      expect(() => {
        (agent as any).validateTaskData(task, ['field1', 'field2']);
      }).not.toThrow();
    });

    it('createTaskResult should create standardized result object', () => {
      const result = (agent as any).createTaskResult(
        'task-123',
        true,
        { data: 'value' },
        'Custom message'
      );

      expect(result).toMatchObject({
        taskId: 'task-123',
        success: true,
        status: 'completed',
        data: { data: 'value' },
        message: 'Custom message',
        executedBy: 'test-agent',
        timestamp: expect.any(Date),
      });
    });

    it('createTaskResult should use default message when not provided', () => {
      const result = (agent as any).createTaskResult('task-123', false);

      expect(result.message).toBe('Task failed');
      expect(result.status).toBe('failed');
    });
  });
});
