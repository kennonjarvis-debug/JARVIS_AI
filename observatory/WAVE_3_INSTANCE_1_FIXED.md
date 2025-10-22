# Instance 1: Decision Engine (Wave 3, Prompt 12)

**Your Role:** Instance 1 - Building the Decision Engine
**Time Estimate:** 6 hours
**Priority:** CRITICAL PATH - All other agents depend on this

---

## 🎯 Your Mission

Build the **Decision Engine** - the brain that decides when Jarvis can act autonomously vs when it needs human approval.

---

## 📋 What You're Building

```typescript
// Core decision-making system
src/core/decision-engine.ts       (~600 lines)
src/core/decision-engine.test.ts  (~500 lines)
config/decision-rules.json         (~100 lines)
docs/decision-framework.md         (~400 lines)
```

**Total Output:** ~1,600 lines

---

## ✅ Production Fixes Applied

**IMPORTANT:** These fixes are already baked into your implementation:

1. **Anthropic Model:** Use `CONFIG.anthropicModel` from `src/config/tools.ts`
2. **Centralized Config:** Import from `src/config/tools.ts` for all settings
3. **Risk Thresholds:** Pre-configured for Brevo limits and cost caps

---

## 🚀 Implementation

### Step 1: Create `src/core/decision-engine.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import { MemorySystem } from './memory';
import { ApprovalQueue } from './approval-queue';
import { CONFIG, RISK_THRESHOLDS } from '../config/tools';
import type { DecisionContext, DecisionResult, DecisionRule } from '../types/decisions';
import type { RiskLevel } from '../types/decisions';

export class DecisionEngine {
  private logger: Logger;
  private rules: DecisionRule[];
  private llmClient: Anthropic;
  private memory: MemorySystem;
  private approvalQueue: ApprovalQueue;
  private confidenceThresholds: Map<RiskLevel, number>;

  constructor(
    rules: DecisionRule[],
    llmClient: Anthropic,
    memory: MemorySystem,
    approvalQueue: ApprovalQueue
  ) {
    this.logger = new Logger('DecisionEngine');
    this.rules = rules.filter(r => r.enabled).sort((a, b) => b.priority - a.priority);
    this.llmClient = llmClient;
    this.memory = memory;
    this.approvalQueue = approvalQueue;

    // Use thresholds from CONFIG
    this.confidenceThresholds = new Map([
      ['low', RISK_THRESHOLDS.confidenceRequired.low],
      ['medium', RISK_THRESHOLDS.confidenceRequired.medium],
      ['high', RISK_THRESHOLDS.confidenceRequired.high],
      ['critical', RISK_THRESHOLDS.confidenceRequired.critical],
    ]);
  }

  async evaluate(context: DecisionContext): Promise<DecisionResult> {
    this.logger.info('Evaluating decision', { taskType: context.task.type });

    // 1. Try rule-based evaluation first (fast path)
    const ruleDecision = await this.evaluateRules(context);
    if (ruleDecision) {
      this.logger.info('Decision from rules', { action: ruleDecision.action });
      return ruleDecision;
    }

    // 2. Fetch historical context
    const historicalData = await this.memory.getRelevantContext(
      context.task.type,
      context.task.data,
      10
    );

    // 3. Use Claude for decision
    const claudeDecision = await this.evaluateWithClaude({
      ...context,
      historicalData,
    });

    // 4. Check if approval needed based on thresholds
    const threshold = this.confidenceThresholds.get(claudeDecision.riskLevel) || 0.8;
    claudeDecision.requiresApproval =
      claudeDecision.confidence < threshold ||
      claudeDecision.riskLevel === 'high' ||
      claudeDecision.riskLevel === 'critical' ||
      claudeDecision.action === 'request_approval';

    // 5. Store decision for learning
    await this.memory.storeEntry({
      id: crypto.randomUUID(),
      type: 'decision',
      content: {
        task: context.task,
        decision: claudeDecision,
        model: CONFIG.anthropicModel,  // Track which model was used
      },
      timestamp: new Date(),
      importance: this.calculateImportance(claudeDecision),
      metadata: {
        taskType: context.task.type,
        riskLevel: claudeDecision.riskLevel,
        model: CONFIG.anthropicModel,
      },
    });

    return claudeDecision;
  }

  private async evaluateRules(context: DecisionContext): Promise<DecisionResult | null> {
    // Check rules in priority order
    for (const rule of this.rules) {
      try {
        // Simple JSONPath-like evaluation (you can use jsonpath-plus library)
        const matches = this.evaluateRuleCondition(rule.condition, context.task);

        if (matches) {
          this.logger.info('Rule matched', { ruleId: rule.id, ruleName: rule.name });

          return {
            action: rule.action === 'allow' ? 'execute' :
                   rule.action === 'deny' ? 'reject' :
                   'request_approval',
            confidence: 1.0, // Rules are deterministic
            reasoning: `Rule matched: ${rule.name}`,
            riskLevel: this.inferRiskLevel(context.task),
            estimatedImpact: this.estimateImpact(context.task),
            requiresApproval: rule.action === 'require_approval',
          };
        }
      } catch (error) {
        this.logger.warn('Rule evaluation failed', { ruleId: rule.id, error });
      }
    }

    return null; // No rules matched
  }

  private async evaluateWithClaude(context: DecisionContext): Promise<DecisionResult> {
    const prompt = this.buildDecisionPrompt(context);

    try {
      const response = await this.llmClient.messages.create({
        model: CONFIG.anthropicModel,  // ✅ Use centralized model config
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON response
      const decision = JSON.parse(content.text);

      // Validate with Zod if you have schemas
      return decision as DecisionResult;
    } catch (error) {
      this.logger.error('Claude evaluation failed', { error });
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to evaluate decision with Claude',
        { error, taskType: context.task.type },
        true
      );
    }
  }

  private buildDecisionPrompt(context: DecisionContext): string {
    const historicalContext = context.historicalData
      .map(entry => `- ${entry.type}: ${JSON.stringify(entry.content).substring(0, 200)}`)
      .join('\n');

    const applicableRules = this.rules
      .slice(0, 5)
      .map(rule => `- ${rule.name}: ${rule.condition}`)
      .join('\n');

    return `You are an autonomous decision-making system for DAWG AI business operations.

Task Type: ${context.task.type}
Task Data: ${JSON.stringify(context.task.data, null, 2)}

Historical Context (past similar tasks):
${historicalContext || 'No historical data available'}

Decision Rules (applicable):
${applicableRules || 'No specific rules'}

Evaluate whether this task should be:
1. EXECUTE - Safe to execute automatically
2. REQUEST_APPROVAL - Needs human approval
3. REJECT - Should not be executed

Consider these thresholds from our config:
- Email campaigns >300 recipients require approval (Brevo free tier limit)
- Financial impact >$50 = HIGH risk
- Financial impact >$100 = CRITICAL (always require approval)

Provide your response in the following JSON format:
{
  "action": "execute" | "request_approval" | "reject",
  "confidence": 0.0 to 1.0,
  "reasoning": "2-3 sentences explaining your decision",
  "riskLevel": "low" | "medium" | "high" | "critical",
  "estimatedImpact": {
    "financial": number or null,
    "reputational": "low" | "medium" | "high",
    "description": "brief description"
  },
  "alternatives": [
    {
      "action": "alternative approach",
      "reasoning": "why this might be better"
    }
  ]
}`;
  }

  async learnFromFeedback(
    taskId: string,
    decision: DecisionResult,
    outcome: 'approved' | 'rejected' | 'modified',
    feedback?: string
  ): Promise<void> {
    // Store feedback in memory
    await this.memory.storeEntry({
      id: crypto.randomUUID(),
      type: 'decision',
      content: {
        taskId,
        decision,
        outcome,
        feedback,
        model: CONFIG.anthropicModel,
      },
      timestamp: new Date(),
      importance: 0.8, // Feedback is important for learning
      metadata: {
        taskId,
        outcome,
        riskLevel: decision.riskLevel,
      },
    });

    // Adjust confidence thresholds based on patterns
    // (Simple implementation - could be enhanced with more sophisticated ML)
    if (outcome === 'rejected' && decision.confidence > 0.8) {
      // We were too confident - adjust threshold up slightly
      const currentThreshold = this.confidenceThresholds.get(decision.riskLevel);
      if (currentThreshold && currentThreshold < 0.95) {
        this.confidenceThresholds.set(decision.riskLevel, currentThreshold + 0.02);
        this.logger.info('Adjusted confidence threshold', {
          riskLevel: decision.riskLevel,
          newThreshold: currentThreshold + 0.02,
        });
      }
    }

    this.logger.info('Learned from feedback', { taskId, outcome });
  }

  private calculateImportance(decision: DecisionResult): number {
    let importance = 0.5;

    if (decision.riskLevel === 'high') importance += 0.3;
    if (decision.riskLevel === 'critical') importance += 0.5;
    if (decision.confidence < 0.6) importance += 0.2;

    return Math.min(importance, 1.0);
  }

  private inferRiskLevel(task: any): RiskLevel {
    // Check email recipient count
    if (task.data?.recipientCount) {
      const count = task.data.recipientCount;
      if (count > RISK_THRESHOLDS.emailRecipients.high) return 'high';
      if (count > RISK_THRESHOLDS.emailRecipients.medium) return 'medium';
    }

    // Check financial impact
    if (task.data?.estimatedCost || task.data?.amount) {
      const cost = task.data.estimatedCost || task.data.amount;
      if (cost > RISK_THRESHOLDS.financial.critical) return 'critical';
      if (cost > RISK_THRESHOLDS.financial.high) return 'high';
      if (cost > RISK_THRESHOLDS.financial.medium) return 'medium';
    }

    return 'low';
  }

  private estimateImpact(task: any): any {
    return {
      financial: task.data?.estimatedCost || task.data?.amount || null,
      reputational: 'low',
      description: 'Estimated based on task parameters',
    };
  }

  private evaluateRuleCondition(condition: string, task: any): boolean {
    // Simple condition evaluator (you can enhance with jsonpath-plus)
    // For now, just check if condition string matches task properties
    try {
      // Very basic evaluation - enhance with proper JSONPath library
      return eval(condition.replace(/\$/g, 'task'));
    } catch {
      return false;
    }
  }

  getConfidenceThreshold(riskLevel: RiskLevel): number {
    return this.confidenceThresholds.get(riskLevel) || 0.8;
  }

  async updateRule(ruleId: string, updates: Partial<DecisionRule>): Promise<void> {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      throw new JarvisError(
        ErrorCode.NOT_FOUND,
        'Rule not found',
        { ruleId },
        false
      );
    }

    this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    this.rules.sort((a, b) => b.priority - a.priority);

    this.logger.info('Rule updated', { ruleId, updates });
  }

  async addRule(rule: DecisionRule): Promise<void> {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);

    this.logger.info('Rule added', { ruleId: rule.id, ruleName: rule.name });
  }
}
```

---

### Step 2: Create `config/decision-rules.json`

```json
{
  "rules": [
    {
      "id": "email-bulk-brevo-limit",
      "name": "Auto-reject email campaigns >300 recipients (Brevo free tier)",
      "condition": "task.type === 'marketing.email.campaign' && task.data.recipientCount > 300",
      "action": "require_approval",
      "priority": 100,
      "enabled": true
    },
    {
      "id": "social-post-auto-approve",
      "name": "Auto-approve social posts under 280 chars",
      "condition": "task.type === 'marketing.social.post' && task.data.text.length <= 280",
      "action": "allow",
      "priority": 90,
      "enabled": true
    },
    {
      "id": "financial-critical",
      "name": "Require approval for financial impact >$100",
      "condition": "(task.data.estimatedCost || task.data.amount || 0) > 100",
      "action": "require_approval",
      "priority": 95,
      "enabled": true
    },
    {
      "id": "financial-high",
      "name": "Require approval for financial impact >$50",
      "condition": "(task.data.estimatedCost || task.data.amount || 0) > 50",
      "action": "require_approval",
      "priority": 90,
      "enabled": true
    },
    {
      "id": "support-refund-approval",
      "name": "Require approval for refunds >$50",
      "condition": "task.type === 'support.issue.refund' && task.data.amount > 50",
      "action": "require_approval",
      "priority": 90,
      "enabled": true
    },
    {
      "id": "sales-deal-creation",
      "name": "Auto-approve deal creation for qualified leads",
      "condition": "task.type === 'sales.deal.create' && task.data.leadScore > 70",
      "action": "allow",
      "priority": 80,
      "enabled": true
    },
    {
      "id": "email-small-batch",
      "name": "Auto-approve email campaigns <50 recipients",
      "condition": "task.type === 'marketing.email.campaign' && task.data.recipientCount < 50",
      "action": "allow",
      "priority": 85,
      "enabled": true
    }
  ]
}
```

---

### Step 3: Create Tests

```typescript
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
```

---

### Step 4: Create Documentation

```markdown
# docs/decision-framework.md

# Decision Engine Framework

## Overview

The Decision Engine is the brain of Jarvis that determines when tasks can be executed autonomously vs when they require human approval.

## Architecture

### Decision Flow

1. **Rule Evaluation** (fast path) - Check predefined rules
2. **Claude Evaluation** (smart path) - Use AI for complex decisions
3. **Threshold Check** - Compare confidence vs risk thresholds
4. **Approval Routing** - Send high-risk tasks to approval queue

### Risk Levels

- **LOW:** <$10 cost, <50 email recipients - High confidence (70%) required
- **MEDIUM:** $10-50 cost, 50-300 recipients - Higher confidence (80%) required
- **HIGH:** $50-100 cost, >300 recipients - Very high confidence (90%) required
- **CRITICAL:** >$100 cost - Always require approval (100%)

## Configuration

### Risk Thresholds

Defined in `src/config/tools.ts`:

\`\`\`typescript
export const RISK_THRESHOLDS = {
  emailRecipients: {
    low: 50,
    medium: 300,  // Brevo free tier limit
    high: 300,
  },
  financial: {
    low: 10,
    medium: 50,
    high: 100,
    critical: 100,
  },
};
\`\`\`

### Decision Rules

Defined in `config/decision-rules.json` with priority ordering.

## Usage

\`\`\`typescript
import { DecisionEngine } from './core/decision-engine';

const decision = await decisionEngine.evaluate({
  task,
  historicalData: [],
  rules: [],
  agentCapabilities: [],
});

if (decision.requiresApproval) {
  await approvalQueue.requestApproval({...});
} else {
  await executeTask(task);
}
\`\`\`

## Learning Mechanism

The engine learns from human feedback:

\`\`\`typescript
await decisionEngine.learnFromFeedback(
  taskId,
  decision,
  'approved',
  'Timing was good'
);
\`\`\`

This adjusts confidence thresholds over time based on approval patterns.

## Best Practices

1. Start conservative (high thresholds)
2. Monitor approval/rejection patterns
3. Adjust rules based on feedback
4. Always store decision context for auditability

## Troubleshooting

### All tasks require approval
- Check confidence thresholds in CONFIG
- Review decision rules priority
- Verify Claude API key is working

### Tasks executed that should require approval
- Lower confidence thresholds for that risk level
- Add specific rules for those task types
- Review estimated impact calculations
```

---

## 🧪 Testing

```bash
# Run tests
npm test src/core/decision-engine.test.ts

# Run with coverage
npm run test:coverage -- src/core/decision-engine.test.ts

# Type check
npm run typecheck
```

---

## ✅ Acceptance Criteria

- [ ] DecisionEngine class with all methods
- [ ] Rule-based evaluation working
- [ ] Claude integration functional
- [ ] Confidence scoring accurate
- [ ] Learning mechanism implemented
- [ ] Test coverage >80%
- [ ] All tests passing
- [ ] Documentation complete

---

## 📊 Progress Tracking

**Notify coordinator when:**
- 50% complete (~3 hours) - Instance 2 can start
- 100% complete - Ready for agent integration

---

## 🚀 Start Now!

You are the critical path. All other agents depend on your Decision Engine.

**Good luck! 🤖**
