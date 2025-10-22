// src/core/decision-engine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DecisionEngine } from './decision-engine';
import type { DecisionRule, DecisionContext } from '../types/decisions';
import { TaskType } from '../types/tasks';
import { RiskLevel } from '../types/decisions';

describe('DecisionEngine', () => {
  let engine: DecisionEngine;
  let mockLlm: any;
  let mockMemory: any;
  let mockApprovalQueue: any;

  beforeEach(() => {
    mockLlm = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                action: 'execute',
                confidence: 0.85,
                reasoning: 'Task appears safe to execute',
                riskLevel: 'low',
                estimatedImpact: {
                  financial: 0,
                  reputational: 'low',
                  description: 'Minimal impact',
                },
              }),
            },
          ],
        }),
      },
    };

    mockMemory = {
      getRelevantContext: vi.fn().mockResolvedValue([]),
      storeEntry: vi.fn().mockResolvedValue(undefined),
    };

    mockApprovalQueue = {};

    const rules: DecisionRule[] = [
      {
        id: 'test-rule',
        name: 'Test Rule',
        condition: "task.type === 'test.task'",
        action: 'allow',
        priority: 100,
        enabled: true,
      },
    ];

    engine = new DecisionEngine(rules, mockLlm, mockMemory, mockApprovalQueue);
  });

  describe('evaluate', () => {
    it('should use rule-based decision when rule matches', async () => {
      const context: DecisionContext = {
        task: {
          id: 'task-123',
          type: 'test.task' as TaskType,
          priority: 1,
          data: {},
          requestedBy: 'test',
          timestamp: new Date(),
        },
        historicalData: [],
        rules: [],
        agentCapabilities: [],
      };

      const result = await engine.evaluate(context);

      expect(result.action).toBe('execute');
      expect(result.confidence).toBe(1.0);
      expect(mockLlm.messages.create).not.toHaveBeenCalled();
    });

    it('should use Claude when no rules match', async () => {
      const context: DecisionContext = {
        task: {
          id: 'task-123',
          type: 'marketing.social.post' as TaskType,
          priority: 1,
          data: { platform: 'twitter' },
          requestedBy: 'test',
          timestamp: new Date(),
        },
        historicalData: [],
        rules: [],
        agentCapabilities: [],
      };

      const result = await engine.evaluate(context);

      expect(result.action).toBe('execute');
      expect(mockLlm.messages.create).toHaveBeenCalled();
    });

    it('should require approval for high risk tasks', async () => {
      mockLlm.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              action: 'request_approval',
              confidence: 0.6,
              reasoning: 'High risk task',
              riskLevel: 'high',
              estimatedImpact: {
                financial: 150,
                reputational: 'high',
                description: 'Significant impact',
              },
            }),
          },
        ],
      });

      const context: DecisionContext = {
        task: {
          id: 'task-123',
          type: 'marketing.email.campaign' as TaskType,
          priority: 1,
          data: { recipientCount: 5000 },
          requestedBy: 'test',
          timestamp: new Date(),
        },
        historicalData: [],
        rules: [],
        agentCapabilities: [],
      };

      const result = await engine.evaluate(context);

      expect(result.requiresApproval).toBe(true);
      expect(result.riskLevel).toBe('high');
    });
  });

  describe('learnFromFeedback', () => {
    it('should store feedback in memory', async () => {
      const decision = {
        action: 'execute' as const,
        confidence: 0.85,
        reasoning: 'Test',
        riskLevel: 'low' as RiskLevel,
        estimatedImpact: { description: 'Test' },
        requiresApproval: false,
      };

      await engine.learnFromFeedback('task-123', decision, 'approved', 'Looks good');

      expect(mockMemory.storeEntry).toHaveBeenCalled();
    });

    it('should adjust confidence threshold after rejection', async () => {
      const decision = {
        action: 'execute' as const,
        confidence: 0.85,
        reasoning: 'Test',
        riskLevel: 'medium' as RiskLevel,
        estimatedImpact: { description: 'Test' },
        requiresApproval: false,
      };

      const beforeThreshold = engine.getConfidenceThreshold('medium');
      await engine.learnFromFeedback('task-123', decision, 'rejected', 'Too risky');
      const afterThreshold = engine.getConfidenceThreshold('medium');

      expect(afterThreshold).toBeGreaterThan(beforeThreshold);
    });
  });

  describe('rule management', () => {
    it('should add new rule', async () => {
      const newRule: DecisionRule = {
        id: 'new-rule',
        name: 'New Rule',
        condition: "task.type === 'new.task'",
        action: 'deny',
        priority: 50,
        enabled: true,
      };

      await engine.addRule(newRule);

      // Rule should be in the list (verify by testing evaluation)
      const context: DecisionContext = {
        task: {
          id: 'task-123',
          type: 'new.task' as TaskType,
          priority: 1,
          data: {},
          requestedBy: 'test',
          timestamp: new Date(),
        },
        historicalData: [],
        rules: [],
        agentCapabilities: [],
      };

      const result = await engine.evaluate(context);
      expect(result.action).toBe('reject');
    });

    it('should update existing rule', async () => {
      await engine.updateRule('test-rule', { enabled: false });

      // Rule should be disabled now
      const context: DecisionContext = {
        task: {
          id: 'task-123',
          type: 'test.task' as TaskType,
          priority: 1,
          data: {},
          requestedBy: 'test',
          timestamp: new Date(),
        },
        historicalData: [],
        rules: [],
        agentCapabilities: [],
      };

      const result = await engine.evaluate(context);
      // Should fall through to Claude since rule is disabled
      expect(mockLlm.messages.create).toHaveBeenCalled();
    });
  });
});
