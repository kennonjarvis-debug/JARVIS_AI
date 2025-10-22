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
      // Skip disabled rules
      if (!rule.enabled) continue;

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
