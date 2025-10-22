/**
 * Unified Jarvis Agent System
 *
 * Public API for the autonomous and proactive agent system.
 * This replaces both:
 * - src/autonomous/orchestrator.ts
 * - src/core/proactive/proactive-agent.ts
 *
 * Usage:
 * ```typescript
 * import { getOrchestrator, adaptiveEngine, ClearanceLevel } from '@/core/agents';
 *
 * const orchestrator = getOrchestrator();
 * await orchestrator.start();
 * ```
 */

// Main orchestrator
export { AgentOrchestrator, getOrchestrator } from './orchestrator.js';

// Engines
export { AdaptiveEngine, adaptiveEngine } from './engines/adaptive-engine.js';

// Configuration
export { defaultConfig, productionConfig, developmentConfig, getConfig } from './config.js';

// Types
export * from './types.js';

// Domain agents
export { BaseDomainAgent } from './domains/base-domain.js';
export { ChatConversationDomain } from './domains/chat-conversation-domain.js';
export { CodeOptimizationDomain } from './domains/code-optimization-domain.js';
export { CostOptimizationDomain } from './domains/cost-optimization-domain.js';
export { DataScientistDomain } from './domains/data-scientist-domain.js';
export { MarketingStrategistDomain } from './domains/marketing-strategist-domain.js';
export { SystemHealthDomain } from './domains/system-health-domain.js';

// Re-export types for backwards compatibility
export type {
  // Agent configuration
  AgentConfig,
  ClearanceLevel,
  Priority,
  TaskStatus,
  DomainType,

  // Tasks
  AutonomousTask,
  TaskResult,
  AutonomousWorkflow,

  // Learning
  LearningPattern,
  AdaptiveModel,
  AdaptiveDecision,
  UserFeedback,
  TrainingDataPoint,

  // Proactive
  UserInteraction,
  UserPreference,
  TimingPattern,
  WorkContext,
  ProactiveSuggestion,

  // Agents
  IDomainAgent,
  DomainCapability,
  AgentMessage,

  // System
  SystemContext,
  AdaptiveState,
  LearningMetrics,
  AgentEvent,
  AgentEventType
} from './types.js';
