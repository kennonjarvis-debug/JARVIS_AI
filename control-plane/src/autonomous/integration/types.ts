/**
 * Autonomous Integration Types
 * Type definitions for autonomous AI task execution
 */

export interface AutonomousTask {
  id: string;
  description: string;
  complexity: 'simple' | 'moderate' | 'complex';
  priority: 'low' | 'medium' | 'high' | 'critical';
  models?: AIModel[];
  context?: Record<string, any>;
  constraints?: TaskConstraints;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskConstraints {
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
  budget?: number;
  requiredCapabilities?: string[];
}

export type AIModel = 'claude' | 'gpt4' | 'gemini' | 'gpt4o';

export interface AIModelConfig {
  name: AIModel;
  provider: 'anthropic' | 'openai' | 'google';
  modelId: string;
  capabilities: string[];
  costPerToken: number;
  maxTokens: number;
}

export interface AutonomousTaskResult {
  taskId: string;
  success: boolean;
  results: ModelResult[];
  bestResult?: ModelResult;
  totalCost: number;
  duration: number;
  error?: string;
  timestamp: Date;
}

export interface ModelResult {
  model: AIModel;
  response: string;
  confidence: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  duration: number;
  error?: string;
}

export interface ExecutionStrategy {
  type: 'parallel' | 'sequential' | 'cascading' | 'voting';
  modelSelection?: AIModel[];
  fallbackChain?: AIModel[];
  consensusThreshold?: number;
}

export interface AutonomousJobConfig {
  strategy: ExecutionStrategy;
  maxConcurrency?: number;
  timeout?: number;
  retryPolicy?: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
}
