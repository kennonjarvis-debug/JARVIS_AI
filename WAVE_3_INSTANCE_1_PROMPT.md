# Wave 3 - Instance 1: Decision Engine (Prompt 12)

**Assigned Component:** Core Decision-Making System
**Estimated Time:** 6 hours
**Dependencies:** ✅ Memory (P10), ✅ Approval Queue (P11), ✅ All Integrations (P4, P6-9), ✅ Types (P5)
**Priority:** CRITICAL - All agents depend on this component

---

## Your Task

Build the Decision Engine - the core intelligence system that determines if tasks can be executed autonomously or require human approval.

---

## Context

**Prompt 12: Decision Engine** - Risk assessment and autonomous decision-making

**Already complete:** All Wave 1 & Wave 2 components (Logger, Error Handler, Types, Supabase, Buffer, HubSpot, Email, n8n, Memory, Approval Queue)

**You're building:** The brain that decides when Jarvis can act autonomously vs when it needs human approval

**Critical:** This is the **most important Wave 3 component**. Other agents in Wave 3 will integrate with this system.

---

## API Contract

See `JARVIS_DESIGN_AND_PROMPTS.md` section **"2. Core: Decision Engine"**

```typescript
export interface DecisionContext {
  task: TaskRequest;
  historicalData: MemoryEntry[];
  rules: DecisionRule[];
  agentCapabilities: AgentCapability[];
}

export interface DecisionResult {
  action: 'execute' | 'request_approval' | 'reject';
  confidence: number; // 0-1
  reasoning: string;
  riskLevel: RiskLevel;
  estimatedImpact: {
    financial?: number;
    reputational?: 'low' | 'medium' | 'high';
    description: string;
  };
  alternatives?: Array<{
    action: string;
    reasoning: string;
  }>;
  requiresApproval: boolean;
}

export interface DecisionRule {
  id: string;
  name: string;
  condition: string; // JSONPath expression
  action: 'allow' | 'deny' | 'require_approval';
  priority: number;
  enabled: boolean;
}

export class DecisionEngine {
  constructor(
    rules: DecisionRule[],
    llmClient: AnthropicClient,
    memory: MemorySystem,
    approvalQueue: ApprovalQueue
  );

  async evaluate(context: DecisionContext): Promise<DecisionResult>;
  async learnFromFeedback(taskId: string, decision: DecisionResult, outcome: 'approved' | 'rejected' | 'modified', feedback?: string): Promise<void>;
  async updateRule(ruleId: string, updates: Partial<DecisionRule>): Promise<void>;
  async addRule(rule: DecisionRule): Promise<void>;
  getConfidenceThreshold(riskLevel: RiskLevel): number;
}
```

---

## Implementation

### 1. Create `src/core/decision-engine.ts`

**Key features:**
- **Rule-based evaluation** - Check predefined rules first (fast path)
- **Claude integration** - Use Claude Sonnet for complex decisions
- **Confidence scoring** - Calculate confidence based on historical data
- **Impact estimation** - Estimate financial and reputational impact
- **Learning mechanism** - Adjust confidence thresholds based on feedback
- **Approval integration** - Automatically route to approval queue when needed

**Decision flow:**
```
1. Load applicable rules based on task type
2. Evaluate rules in priority order
3. If rule matches → return rule-based decision
4. If no rule matches or confidence < threshold → use Claude
5. If risk = HIGH/CRITICAL → route to approval queue
6. Store decision in memory for learning
```

**Claude integration prompt template:**
```
You are an autonomous decision-making system for DAWG AI business operations.

Task Type: {taskType}
Task Data: {JSON.stringify(taskData)}

Historical Context (past similar tasks):
{pastSimilarTasks}

Decision Rules (applicable):
{applicableRules}

Evaluate whether this task should be:
1. EXECUTE - Safe to execute automatically
2. REQUEST_APPROVAL - Needs human approval
3. REJECT - Should not be executed

Provide your response in the following JSON format:
{
  "action": "execute" | "request_approval" | "reject",
  "confidence": 0.0 - 1.0,
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
}
```

**Implementation structure:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';
import { MemorySystem } from './memory';
import { ApprovalQueue } from './approval-queue';
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

    // Default confidence thresholds
    this.confidenceThresholds = new Map([
      ['low', 0.7],
      ['medium', 0.8],
      ['high', 0.9],
      ['critical', 1.0], // Always require approval for critical
    ]);
  }

  async evaluate(context: DecisionContext): Promise<DecisionResult> {
    // 1. Try rule-based evaluation first
    const ruleDecision = await this.evaluateRules(context);
    if (ruleDecision) {
      return ruleDecision;
    }

    // 2. Fetch historical context
    const historicalData = await this.memory.getRelevantContext(
      context.task.type,
      context.task.data
    );

    // 3. Use Claude for decision
    const claudeDecision = await this.evaluateWithClaude({
      ...context,
      historicalData,
    });

    // 4. Check if approval needed
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
      },
      timestamp: new Date(),
      importance: this.calculateImportance(claudeDecision),
      metadata: {
        taskType: context.task.type,
        riskLevel: claudeDecision.riskLevel,
      },
    });

    return claudeDecision;
  }

  private async evaluateRules(context: DecisionContext): Promise<DecisionResult | null> {
    // Implement rule matching logic
    // Return null if no rules match
  }

  private async evaluateWithClaude(context: DecisionContext): Promise<DecisionResult> {
    // Implement Claude API call with structured prompt
    // Parse response JSON
    // Validate with Zod schema
  }

  async learnFromFeedback(
    taskId: string,
    decision: DecisionResult,
    outcome: 'approved' | 'rejected' | 'modified',
    feedback?: string
  ): Promise<void> {
    // Store feedback in memory
    // Adjust confidence thresholds if needed
    // Update rules based on patterns
  }

  private calculateImportance(decision: DecisionResult): number {
    // Higher importance for high-risk decisions or low-confidence decisions
    let importance = 0.5;

    if (decision.riskLevel === 'high') importance += 0.3;
    if (decision.riskLevel === 'critical') importance += 0.5;
    if (decision.confidence < 0.6) importance += 0.2;

    return Math.min(importance, 1.0);
  }

  getConfidenceThreshold(riskLevel: RiskLevel): number {
    return this.confidenceThresholds.get(riskLevel) || 0.8;
  }

  async updateRule(ruleId: string, updates: Partial<DecisionRule>): Promise<void> {
    // Update rule and resort by priority
  }

  async addRule(rule: DecisionRule): Promise<void> {
    // Add rule and resort by priority
  }
}
```

---

### 2. Create `config/decision-rules.json`

**Pre-configured rules for common scenarios:**

```json
{
  "rules": [
    {
      "id": "social-post-auto-approve",
      "name": "Auto-approve social posts under 280 chars",
      "condition": "$.type == 'marketing.social.post' && $.data.text.length <= 280",
      "action": "allow",
      "priority": 100,
      "enabled": true
    },
    {
      "id": "email-bulk-require-approval",
      "name": "Require approval for bulk emails >1000 recipients",
      "condition": "$.type == 'marketing.email.campaign' && $.data.recipientCount > 1000",
      "action": "require_approval",
      "priority": 90,
      "enabled": true
    },
    {
      "id": "financial-high-value",
      "name": "Require approval for financial impact >$100",
      "condition": "$.data.estimatedCost > 100",
      "action": "require_approval",
      "priority": 95,
      "enabled": true
    },
    {
      "id": "support-refund-approval",
      "name": "Require approval for refunds >$50",
      "condition": "$.type == 'support.issue.refund' && $.data.amount > 50",
      "action": "require_approval",
      "priority": 90,
      "enabled": true
    },
    {
      "id": "sales-deal-creation",
      "name": "Auto-approve deal creation for qualified leads",
      "condition": "$.type == 'sales.deal.create' && $.data.leadScore > 70",
      "action": "allow",
      "priority": 80,
      "enabled": true
    }
  ]
}
```

---

### 3. Create `src/core/decision-engine.test.ts`

**Test coverage (>80%):**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DecisionEngine } from './decision-engine';
import type { DecisionRule, DecisionContext } from '../types/decisions';
import { TaskType } from '../types/tasks';
import { RiskLevel } from '../types/decisions';

describe('DecisionEngine', () => {
  // Test suites:

  describe('constructor and initialization', () => {
    it('should initialize with rules and dependencies');
    it('should filter out disabled rules');
    it('should sort rules by priority');
  });

  describe('evaluate - rule-based', () => {
    it('should match rule and auto-approve low-risk tasks');
    it('should match rule and require approval for high-risk tasks');
    it('should fallback to Claude if no rules match');
    it('should handle multiple matching rules by priority');
  });

  describe('evaluate - Claude-based', () => {
    it('should call Claude API with proper prompt');
    it('should parse Claude JSON response correctly');
    it('should handle Claude API errors gracefully');
    it('should validate Claude response with schema');
  });

  describe('confidence thresholds', () => {
    it('should require approval if confidence < threshold');
    it('should auto-execute if confidence >= threshold');
    it('should always require approval for critical risk');
    it('should get correct threshold for each risk level');
  });

  describe('learning from feedback', () => {
    it('should store feedback in memory');
    it('should adjust confidence threshold after multiple rejections');
    it('should adjust confidence threshold after multiple approvals');
    it('should not adjust threshold with insufficient data');
  });

  describe('rule management', () => {
    it('should update existing rule');
    it('should add new rule');
    it('should resort rules after updates');
  });

  describe('error handling', () => {
    it('should throw JarvisError on invalid context');
    it('should throw JarvisError on Claude API failure');
    it('should handle malformed Claude responses');
  });
});
```

---

### 4. Create `docs/decision-framework.md`

**Comprehensive documentation covering:**
- Decision-making philosophy
- Rule system explanation
- Claude integration details
- Learning mechanism
- Confidence scoring algorithm
- Impact estimation methodology
- Best practices for rule creation
- Troubleshooting guide

---

## Integration Points

### With Approval Queue
```typescript
// In agent execution
const decision = await decisionEngine.evaluate({
  task: taskRequest,
  historicalData: [],
  rules: decisionRules,
  agentCapabilities: agent.capabilities,
});

if (decision.requiresApproval) {
  const requestId = await approvalQueue.requestApproval({
    taskId: task.id,
    taskType: task.type,
    requestedAction: JSON.stringify(task.data),
    reasoning: decision.reasoning,
    riskLevel: decision.riskLevel,
    estimatedImpact: decision.estimatedImpact,
    alternatives: decision.alternatives,
    metadata: { confidence: decision.confidence },
  });

  return { status: 'awaiting_approval', requestId };
}

// Execute task
return await agent.execute(task);
```

### With Memory System
```typescript
// Decision engine uses memory for historical context
const historicalData = await memory.getRelevantContext(
  taskType,
  taskData,
  10 // limit
);

// Stores decisions for future reference
await memory.storeEntry({
  type: 'decision',
  content: { task, decision },
  importance: calculateImportance(decision),
});
```

### With Agents (Wave 3 Prompts 13-15)
```typescript
// In BaseAgent.execute()
const decision = await this.decisionEngine.evaluate({
  task,
  historicalData: await this.memory.getRelevantContext(task.type),
  rules: this.rules,
  agentCapabilities: this.capabilities,
});

if (decision.action === 'reject') {
  throw new JarvisError(
    ErrorCode.VALIDATION_ERROR,
    `Task rejected by decision engine: ${decision.reasoning}`
  );
}

if (decision.requiresApproval) {
  return await this.requestApproval(task, decision);
}

// Proceed with execution
```

---

## Example Usage

```typescript
import { DecisionEngine } from './core/decision-engine';
import { MemorySystem } from './core/memory';
import { ApprovalQueue } from './core/approval-queue';
import Anthropic from '@anthropic-ai/sdk';
import decisionRules from '../config/decision-rules.json';

// Initialize
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const decisionEngine = new DecisionEngine(
  decisionRules.rules,
  anthropicClient,
  memorySystem,
  approvalQueue
);

// Evaluate a task
const decision = await decisionEngine.evaluate({
  task: {
    id: 'task-123',
    type: TaskType.MARKETING_EMAIL_CAMPAIGN,
    priority: Priority.MEDIUM,
    data: {
      segment: 'active_users',
      recipientCount: 5000,
      subject: 'New Feature Launch',
      content: '...',
    },
    requestedBy: 'system',
    timestamp: new Date(),
  },
  historicalData: [],
  rules: decisionRules.rules,
  agentCapabilities: marketingAgentCapabilities,
});

console.log('Decision:', decision.action);
console.log('Confidence:', decision.confidence);
console.log('Risk Level:', decision.riskLevel);
console.log('Requires Approval:', decision.requiresApproval);

// Learn from feedback
if (decision.requiresApproval) {
  // After human responds
  await decisionEngine.learnFromFeedback(
    'task-123',
    decision,
    'approved',
    'Timing looks good, content is on-brand'
  );
}
```

---

## Output Files

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/core/decision-engine.ts` | Main implementation | ~600 |
| `src/core/decision-engine.test.ts` | Test suite | ~500 |
| `config/decision-rules.json` | Pre-configured rules | ~100 |
| `docs/decision-framework.md` | Documentation | ~400 |

**Total:** ~1,600 lines

---

## Acceptance Criteria

- [ ] DecisionEngine class with all methods implemented
- [ ] Rule-based evaluation working
- [ ] Claude integration functional
- [ ] Confidence scoring accurate
- [ ] Impact estimation implemented
- [ ] Learning mechanism functional
- [ ] Integration with Memory system
- [ ] Integration with Approval Queue
- [ ] Test coverage >80%
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Error handling with JarvisError
- [ ] Comprehensive logging

---

## Testing Commands

```bash
# Run tests
npm test src/core/decision-engine.test.ts

# Run with coverage
npm run test:coverage -- src/core/decision-engine.test.ts

# Type check
npm run typecheck

# Build
npm run build
```

---

## Success Metrics

- ✅ All acceptance criteria met
- ✅ Test coverage >80%
- ✅ Integration tests with Memory and Approval Queue pass
- ✅ Claude integration working with real API
- ✅ Rules engine matching correctly
- ✅ Confidence thresholds appropriate
- ✅ Ready for agent integration (Prompts 13-15)

---

## Important Notes

1. **Critical Path:** This component is required by ALL agents. Other Wave 3 instances (2-5) will depend on this.

2. **Claude API Key:** Ensure `ANTHROPIC_API_KEY` is set in `.env`

3. **Mocking Claude:** In tests, mock the Anthropic client to avoid real API calls

4. **JSONPath:** Use `jsonpath-plus` library for rule condition evaluation

5. **Learning:** Start with simple learning (store feedback), can enhance in future iterations

6. **Performance:** Cache rules in memory, use fast-path for rule matching

---

## Dependencies Installation

```bash
npm install @anthropic-ai/sdk jsonpath-plus
npm install -D @types/jsonpath-plus
```

---

**Start Time:** When you begin this prompt
**Expected Completion:** 6 hours
**Next Steps:** Once complete, notify coordinator. Agents in Instances 2-5 can begin integration.

---

🎯 **This is the brain of Jarvis. Build it well!**
