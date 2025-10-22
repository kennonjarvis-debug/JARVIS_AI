/**
 * Decision engine type definitions
 * @module types/decisions
 */

import { z } from 'zod';
import { TaskType, TaskTypeSchema } from './tasks';

/**
 * Risk level for decision evaluation
 */
export enum RiskLevel {
  /** Fully automated, no approval needed */
  LOW = 'low',
  /** Automated with notification */
  MEDIUM = 'medium',
  /** Requires approval before execution */
  HIGH = 'high',
  /** Requires approval + additional verification */
  CRITICAL = 'critical',
}

/**
 * Zod schema for RiskLevel
 */
export const RiskLevelSchema = z.nativeEnum(RiskLevel);

/**
 * Context provided for decision evaluation
 */
export interface DecisionContext {
  /** Type of task being evaluated */
  taskType: TaskType;
  /** Task-specific data */
  taskData: Record<string, any>;
  /** Historical data for similar tasks */
  historicalData?: any[];
  /** User preferences that might affect the decision */
  userPreferences?: Record<string, any>;
  /** Current system state */
  currentState?: Record<string, any>;
}

/**
 * Zod schema for DecisionContext
 */
export const DecisionContextSchema = z.object({
  taskType: TaskTypeSchema,
  taskData: z.record(z.any()),
  historicalData: z.array(z.any()).optional(),
  userPreferences: z.record(z.any()).optional(),
  currentState: z.record(z.any()).optional(),
});

/**
 * Decision action to take
 */
export type DecisionAction = 'execute' | 'request_approval' | 'reject';

/**
 * Zod schema for DecisionAction
 */
export const DecisionActionSchema = z.enum(['execute', 'request_approval', 'reject']);

/**
 * Result of a decision evaluation
 */
export interface DecisionResult {
  /** Action to take */
  action: DecisionAction;
  /** Confidence score (0-1) */
  confidence: number;
  /** Explanation of the decision */
  reasoning: string;
  /** Risk level of the task */
  riskLevel: RiskLevel;
  /** Whether this decision requires human approval */
  requiresApproval?: boolean;
  /** Estimated impact of executing this task */
  estimatedImpact: {
    /** Financial impact in USD */
    financial?: number;
    /** Reputational risk level */
    reputational?: 'low' | 'medium' | 'high';
    /** Description of impact */
    description: string;
    /** Whether the action is reversible */
    reversibility?: boolean;
  };
  /** Alternative approaches to consider */
  alternatives?: Array<{
    /** Alternative action description */
    action: string;
    /** Reasoning for this alternative */
    reasoning: string;
  }>;
}

/**
 * Zod schema for DecisionResult
 */
export const DecisionResultSchema = z.object({
  action: DecisionActionSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  riskLevel: RiskLevelSchema,
  requiresApproval: z.boolean().optional(),
  estimatedImpact: z.object({
    financial: z.number().optional(),
    reputational: z.enum(['low', 'medium', 'high']).optional(),
    description: z.string(),
    reversibility: z.boolean().optional(),
  }),
  alternatives: z
    .array(
      z.object({
        action: z.string().min(1),
        reasoning: z.string().min(1),
      })
    )
    .optional(),
});

/**
 * Condition function for decision rules
 */
export type DecisionCondition = (context: DecisionContext) => boolean;

/**
 * Decision rule configuration
 */
export interface DecisionRule {
  /** Unique rule identifier */
  id: string;
  /** Task types this rule applies to (use ['*'] for all) */
  taskTypes: TaskType[] | ['*'];
  /** Condition function to evaluate */
  condition: DecisionCondition;
  /** Risk level if condition matches */
  riskLevel: RiskLevel;
  /** Whether approval is required if condition matches */
  requiresApproval: boolean;
  /** Human-readable description of the rule */
  description: string;
  /** Whether this rule is active */
  active?: boolean;
  /** Rule priority (lower numbers = higher priority) */
  priority?: number;
}

/**
 * Serializable decision rule (for storage)
 */
export interface SerializedDecisionRule {
  /** Unique rule identifier */
  id: string;
  /** Task types this rule applies to */
  taskTypes: TaskType[] | ['*'];
  /** Serialized condition (JSON object) */
  condition: Record<string, any>;
  /** Risk level if condition matches */
  riskLevel: RiskLevel;
  /** Whether approval is required */
  requiresApproval: boolean;
  /** Human-readable description */
  description: string;
  /** Whether this rule is active */
  active: boolean;
  /** Rule priority */
  priority: number;
  /** When the rule was created */
  createdAt?: Date;
  /** When the rule was last updated */
  updatedAt?: Date;
}

/**
 * Zod schema for SerializedDecisionRule
 */
export const SerializedDecisionRuleSchema = z.object({
  id: z.string().uuid(),
  taskTypes: z.union([z.array(TaskTypeSchema), z.tuple([z.literal('*')])]),
  condition: z.record(z.any()),
  riskLevel: RiskLevelSchema,
  requiresApproval: z.boolean(),
  description: z.string().min(1),
  active: z.boolean().default(true),
  priority: z.number().int().nonnegative().default(100),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

/**
 * Configuration for decision rules
 */
export interface DecisionRulesConfig {
  /** Auto-approve max spend threshold (USD) */
  autoApproveMaxSpend: number;
  /** Require approval for new audiences */
  requireApprovalForNewAudiences: boolean;
  /** Require approval for controversial topics */
  requireApprovalForControversialTopics: boolean;
  /** Auto-approve discount up to (percentage) */
  autoApproveDiscountUpTo: number;
  /** Require approval for custom pricing */
  requireApprovalForCustomPricing: boolean;
  /** Auto-approve refund up to (USD) */
  autoApproveRefundUpTo: number;
  /** Require approval for data deletion */
  requireApprovalForDataDeletion: boolean;
}

/**
 * Zod schema for DecisionRulesConfig
 */
export const DecisionRulesConfigSchema = z.object({
  autoApproveMaxSpend: z.number().positive(),
  requireApprovalForNewAudiences: z.boolean(),
  requireApprovalForControversialTopics: z.boolean(),
  autoApproveDiscountUpTo: z.number().min(0).max(100),
  requireApprovalForCustomPricing: z.boolean(),
  autoApproveRefundUpTo: z.number().nonnegative(),
  requireApprovalForDataDeletion: z.boolean(),
});

/**
 * Decision feedback from human reviewer
 */
export interface DecisionFeedback {
  /** Task ID that was decided on */
  taskId: string;
  /** The original decision */
  decision: DecisionResult;
  /** Human feedback on the decision */
  humanFeedback: 'approved' | 'rejected';
  /** Reason for the feedback */
  reason?: string;
  /** When the feedback was provided */
  timestamp: Date;
  /** Who provided the feedback */
  reviewedBy: string;
}

/**
 * Zod schema for DecisionFeedback
 */
export const DecisionFeedbackSchema = z.object({
  taskId: z.string().uuid(),
  decision: DecisionResultSchema,
  humanFeedback: z.enum(['approved', 'rejected']),
  reason: z.string().optional(),
  timestamp: z.date(),
  reviewedBy: z.string().min(1),
});

/**
 * Type guard to check if a value is a valid RiskLevel
 */
export function isRiskLevel(value: any): value is RiskLevel {
  return Object.values(RiskLevel).includes(value);
}

/**
 * Type guard to check if a value is a valid DecisionAction
 */
export function isDecisionAction(value: any): value is DecisionAction {
  return ['execute', 'request_approval', 'reject'].includes(value);
}

/**
 * Helper to validate decision context at runtime
 */
export function validateDecisionContext(data: unknown): DecisionContext {
  return DecisionContextSchema.parse(data);
}

/**
 * Helper to validate decision result at runtime
 */
export function validateDecisionResult(data: unknown): DecisionResult {
  return DecisionResultSchema.parse(data);
}

/**
 * Helper to determine if a decision requires approval
 */
export function requiresApproval(decision: DecisionResult): boolean {
  return (
    decision.action === 'request_approval' ||
    decision.riskLevel === RiskLevel.HIGH ||
    decision.riskLevel === RiskLevel.CRITICAL
  );
}
