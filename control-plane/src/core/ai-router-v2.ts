/**
 * Smart AI Router v2
 *
 * Enhanced with:
 * - Multi-dimensional scoring (quality, speed, cost)
 * - Budget tracking with alerts
 * - Comprehensive telemetry
 * - Historical performance optimization
 * - Auto-fallback on failures
 * - Rate limit handling
 *
 * Target: <$50/month with 100 req/day average
 */

import { logger } from '../utils/logger.js';
import { AICostTracker } from './ai-cost-tracker.js';
import {
  GeminiProvider,
  OpenAIProvider,
  AnthropicProvider,
  MistralProvider,
  type AIProviderRequest,
  type AIProviderResponse,
} from '../integrations/ai-providers/index.js';

// ============================================================================
// Types
// ============================================================================

export interface AIModel {
  name: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'mistral';
  costPerMillionInputTokens: number;
  costPerMillionOutputTokens: number;
  freeRequestsPerDay?: number;
  // v2: Performance characteristics
  avgLatencyMs: number;
  qualityScore: number; // 0-100
  reliabilityScore: number; // 0-100
}

export interface AIRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  context?: string;
  complexity?: 'simple' | 'moderate' | 'complex';
  // v2: Priority and constraints
  priority?: 'low' | 'normal' | 'high';
  maxCost?: number; // Max acceptable cost in dollars
  maxLatencyMs?: number; // Max acceptable latency
  requireQuality?: number; // Min quality score 0-100
}

export interface AIResponse {
  model: string;
  provider: string;
  response: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  cached: boolean;
  timestamp: string;
  // v2: Enhanced metadata
  qualityScore: number;
  fallbackUsed: boolean;
  rateLimitHit: boolean;
  budgetRemaining: number;
}

export interface RoutingStrategy {
  geminiPercentage: number;
  gptMiniPercentage: number;
  claudePercentage: number;
  mistralPercentage?: number;
}

export interface BudgetConfig {
  dailyLimit: number; // dollars
  monthlyLimit: number; // dollars
  alertThreshold: number; // 0-1 (e.g., 0.8 = 80%)
  hardStop: boolean; // Stop requests when limit hit
}

export interface ModelScore {
  model: string;
  totalScore: number;
  breakdown: {
    costScore: number; // 0-100
    speedScore: number; // 0-100
    qualityScore: number; // 0-100
    reliabilityScore: number; // 0-100
  };
  estimatedCost: number;
  estimatedLatency: number;
  meetsConstraints: boolean;
  reason?: string; // Why this model was selected/rejected
}

export interface Telemetry {
  timestamp: string;
  requestId: string;
  model: string;
  provider: string;
  complexity: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
  errorType?: string;
  fallbackUsed: boolean;
  rateLimitHit: boolean;
  budgetExceeded: boolean;
}

// ============================================================================
// Enhanced AI Router v2
// ============================================================================

export class SmartAIRouterV2 {
  private costTracker: AICostTracker;
  private strategy: RoutingStrategy;
  private budget: BudgetConfig;
  private requestCount: number = 0;
  private geminiDailyCount: number = 0;
  private lastResetDate: string;
  private telemetry: Telemetry[] = [];
  private maxTelemetrySize: number = 1000;

  // Provider instances
  private geminiProvider?: GeminiProvider;
  private openaiProvider?: OpenAIProvider;
  private anthropicProvider?: AnthropicProvider;
  private mistralProvider?: MistralProvider;

  // Model definitions with performance metrics
  private models: Record<string, AIModel> = {
    'gemini-flash': {
      name: 'Gemini 1.5 Flash',
      provider: 'gemini',
      costPerMillionInputTokens: 0.15,
      costPerMillionOutputTokens: 0.60,
      freeRequestsPerDay: 1500,
      avgLatencyMs: 800,
      qualityScore: 75,
      reliabilityScore: 90,
    },
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      provider: 'openai',
      costPerMillionInputTokens: 0.15,
      costPerMillionOutputTokens: 0.60,
      avgLatencyMs: 1200,
      qualityScore: 80,
      reliabilityScore: 95,
    },
    'claude-sonnet-4.5': {
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      costPerMillionInputTokens: 3.00,
      costPerMillionOutputTokens: 15.00,
      avgLatencyMs: 1500,
      qualityScore: 95,
      reliabilityScore: 98,
    },
    'mistral-small': {
      name: 'Mistral Small',
      provider: 'mistral',
      costPerMillionInputTokens: 0.20,
      costPerMillionOutputTokens: 0.60,
      avgLatencyMs: 900,
      qualityScore: 70,
      reliabilityScore: 88,
    },
  };

  constructor(
    strategy?: RoutingStrategy,
    budget?: BudgetConfig
  ) {
    this.strategy = strategy || {
      geminiPercentage: 70,
      gptMiniPercentage: 20,
      claudePercentage: 10,
      mistralPercentage: 0,
    };

    this.budget = budget || {
      dailyLimit: 1.67, // $50/month = ~$1.67/day
      monthlyLimit: 50,
      alertThreshold: 0.8,
      hardStop: true,
    };

    this.costTracker = new AICostTracker();
    this.lastResetDate = new Date().toISOString().split('T')[0];

    this.initializeProviders();

    logger.info('SmartAIRouter v2 initialized', {
      strategy: this.strategy,
      budget: this.budget,
      models: Object.keys(this.models),
    });
  }

  // ============================================================================
  // Core Routing Logic
  // ============================================================================

  /**
   * Route request with multi-dimensional scoring
   */
  async route(request: AIRequest): Promise<AIResponse> {
    this.resetDailyCountIfNeeded();
    this.requestCount++;
    const requestId = `req_${Date.now()}_${this.requestCount}`;

    // Check budget before processing
    const budgetCheck = await this.checkBudget();
    if (!budgetCheck.canProceed) {
      throw new Error(`Budget limit reached: ${budgetCheck.reason}`);
    }

    // Score all models for this request
    const scores = this.scoreModels(request);

    // Select best model
    const selectedScore = this.selectBestModel(scores, request);

    logger.info('Routing AI request v2', {
      requestId,
      requestNumber: this.requestCount,
      selectedModel: selectedScore.model,
      totalScore: selectedScore.totalScore,
      estimatedCost: selectedScore.estimatedCost,
      budgetRemaining: budgetCheck.remaining,
    });

    // Execute request
    const startTime = Date.now();
    let response: AIResponse;
    let success = true;
    let errorType: string | undefined;
    let fallbackUsed = false;
    let rateLimitHit = false;

    try {
      response = await this.executeRequest(selectedScore.model, request);
    } catch (error: any) {
      success = false;
      errorType = error.message;
      rateLimitHit = error.message?.includes('rate limit');

      // Attempt fallback
      logger.warn(`Primary model ${selectedScore.model} failed, attempting fallback`, {
        error: error.message,
      });

      const fallbackScore = this.selectFallbackModel(scores, selectedScore.model);
      if (fallbackScore) {
        fallbackUsed = true;
        response = await this.executeRequest(fallbackScore.model, request);
        success = true;
      } else {
        throw new Error(`All models failed: ${error.message}`);
      }
    }

    // Record telemetry
    this.recordTelemetry({
      timestamp: new Date().toISOString(),
      requestId,
      model: response!.model,
      provider: response!.provider,
      complexity: request.complexity || 'simple',
      inputTokens: response!.inputTokens,
      outputTokens: response!.outputTokens,
      cost: response!.cost,
      latencyMs: response!.latencyMs,
      success,
      errorType,
      fallbackUsed,
      rateLimitHit,
      budgetExceeded: false,
    });

    // Update model performance metrics
    this.updateModelMetrics(response!.model, response!.latencyMs, success);

    // Track cost
    await this.costTracker.trackRequest(response!);

    // Check if approaching budget limit
    const finalBudgetCheck = await this.checkBudget();
    if (finalBudgetCheck.shouldAlert) {
      logger.warn('Budget alert threshold reached', {
        percentUsed: finalBudgetCheck.percentUsed,
        remaining: finalBudgetCheck.remaining,
        limit: finalBudgetCheck.limit,
      });
    }

    return {
      ...response!,
      fallbackUsed,
      rateLimitHit,
      budgetRemaining: finalBudgetCheck.remaining,
    };
  }

  // ============================================================================
  // Scoring System
  // ============================================================================

  /**
   * Score all available models for a request
   */
  private scoreModels(request: AIRequest): ModelScore[] {
    const scores: ModelScore[] = [];

    for (const [key, model] of Object.entries(this.models)) {
      // Estimate tokens (rough approximation)
      const estimatedInputTokens = Math.ceil(request.prompt.length / 4);
      const estimatedOutputTokens = request.maxTokens || 500;

      // Calculate estimated cost
      const estimatedCost = this.calculateCost(
        model,
        estimatedInputTokens,
        estimatedOutputTokens
      );

      // Cost score (0-100, lower cost = higher score)
      const maxCost = 0.05; // $0.05 as reference
      const costScore = Math.max(0, 100 - (estimatedCost / maxCost) * 100);

      // Speed score (0-100, lower latency = higher score)
      const maxLatency = 3000; // 3s as reference
      const speedScore = Math.max(0, 100 - (model.avgLatencyMs / maxLatency) * 100);

      // Quality & reliability from model definition
      const qualityScore = model.qualityScore;
      const reliabilityScore = model.reliabilityScore;

      // Weights based on request complexity and priority
      let costWeight = 0.4;
      let speedWeight = 0.3;
      let qualityWeight = 0.2;
      let reliabilityWeight = 0.1;

      if (request.complexity === 'complex' || request.priority === 'high') {
        // Prioritize quality and reliability for complex/high-priority tasks
        qualityWeight = 0.4;
        reliabilityWeight = 0.3;
        costWeight = 0.2;
        speedWeight = 0.1;
      }

      // Calculate weighted total score
      const totalScore =
        costScore * costWeight +
        speedScore * speedWeight +
        qualityScore * qualityWeight +
        reliabilityScore * reliabilityWeight;

      // Check constraints
      let meetsConstraints = true;
      let reason: string | undefined;

      if (request.maxCost && estimatedCost > request.maxCost) {
        meetsConstraints = false;
        reason = `Cost ${estimatedCost.toFixed(4)} exceeds max ${request.maxCost}`;
      }

      if (request.maxLatencyMs && model.avgLatencyMs > request.maxLatencyMs) {
        meetsConstraints = false;
        reason = `Latency ${model.avgLatencyMs}ms exceeds max ${request.maxLatencyMs}ms`;
      }

      if (request.requireQuality && qualityScore < request.requireQuality) {
        meetsConstraints = false;
        reason = `Quality ${qualityScore} below required ${request.requireQuality}`;
      }

      scores.push({
        model: key,
        totalScore,
        breakdown: {
          costScore,
          speedScore,
          qualityScore,
          reliabilityScore,
        },
        estimatedCost,
        estimatedLatency: model.avgLatencyMs,
        meetsConstraints,
        reason,
      });
    }

    return scores.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Select best model from scores
   */
  private selectBestModel(scores: ModelScore[], request: AIRequest): ModelScore {
    // Filter to models that meet constraints
    const validScores = scores.filter((s) => s.meetsConstraints);

    if (validScores.length === 0) {
      throw new Error(
        'No models meet the specified constraints: ' + scores[0]?.reason
      );
    }

    // For complex tasks, always use Claude if available
    if (request.complexity === 'complex') {
      const claude = validScores.find((s) => s.model === 'claude-sonnet-4.5');
      if (claude) return claude;
    }

    // Check Gemini free tier
    const gemini = validScores.find((s) => s.model === 'gemini-flash');
    if (gemini && this.isGeminiFreeAvailable()) {
      this.geminiDailyCount++;
      return gemini;
    }

    // Otherwise return highest scoring model
    return validScores[0];
  }

  /**
   * Select fallback model (exclude failed model)
   */
  private selectFallbackModel(
    scores: ModelScore[],
    failedModel: string
  ): ModelScore | null {
    const fallbackScores = scores.filter(
      (s) => s.model !== failedModel && s.meetsConstraints
    );

    return fallbackScores.length > 0 ? fallbackScores[0] : null;
  }

  // ============================================================================
  // Budget Management
  // ============================================================================

  /**
   * Check budget status
   */
  private async checkBudget(): Promise<{
    canProceed: boolean;
    shouldAlert: boolean;
    remaining: number;
    percentUsed: number;
    limit: number;
    reason?: string;
  }> {
    const dailyCost = await this.costTracker.getDailyCost();
    const spent = dailyCost.totalCost;
    const limit = this.budget.dailyLimit;
    const remaining = limit - spent;
    const percentUsed = spent / limit;

    const shouldAlert = percentUsed >= this.budget.alertThreshold;
    const canProceed = this.budget.hardStop ? remaining > 0 : true;

    return {
      canProceed,
      shouldAlert,
      remaining,
      percentUsed,
      limit,
      reason: canProceed ? undefined : `Daily budget of $${limit} exceeded`,
    };
  }

  /**
   * Get budget status
   */
  async getBudgetStatus() {
    const check = await this.checkBudget();
    const dailyCost = await this.costTracker.getDailyCost();

    return {
      daily: {
        spent: dailyCost.totalCost,
        limit: this.budget.dailyLimit,
        remaining: check.remaining,
        percentUsed: check.percentUsed,
      },
      monthly: {
        estimated: dailyCost.totalCost * 30,
        limit: this.budget.monthlyLimit,
      },
      breakdown: dailyCost.breakdown,
      alertActive: check.shouldAlert,
    };
  }

  // ============================================================================
  // Telemetry
  // ============================================================================

  /**
   * Record telemetry for request
   */
  private recordTelemetry(entry: Telemetry): void {
    this.telemetry.push(entry);

    // Keep only last N entries
    if (this.telemetry.length > this.maxTelemetrySize) {
      this.telemetry = this.telemetry.slice(-this.maxTelemetrySize);
    }
  }

  /**
   * Get telemetry analytics
   */
  getTelemetryAnalytics(hours: number = 24) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const recentTelemetry = this.telemetry.filter(
      (t) => new Date(t.timestamp).getTime() > cutoff
    );

    if (recentTelemetry.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgLatency: 0,
        avgCost: 0,
        byModel: {},
        byComplexity: {},
        errorTypes: {},
      };
    }

    const totalRequests = recentTelemetry.length;
    const successCount = recentTelemetry.filter((t) => t.success).length;
    const successRate = successCount / totalRequests;

    const avgLatency =
      recentTelemetry.reduce((sum, t) => sum + t.latencyMs, 0) / totalRequests;
    const avgCost =
      recentTelemetry.reduce((sum, t) => sum + t.cost, 0) / totalRequests;

    // Group by model
    const byModel = recentTelemetry.reduce((acc, t) => {
      if (!acc[t.model]) {
        acc[t.model] = { count: 0, avgLatency: 0, avgCost: 0, successRate: 0 };
      }
      acc[t.model].count++;
      acc[t.model].avgLatency += t.latencyMs;
      acc[t.model].avgCost += t.cost;
      if (t.success) acc[t.model].successRate++;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    for (const model in byModel) {
      const count = byModel[model].count;
      byModel[model].avgLatency /= count;
      byModel[model].avgCost /= count;
      byModel[model].successRate /= count;
    }

    // Group by complexity
    const byComplexity = recentTelemetry.reduce((acc, t) => {
      const complexity = t.complexity;
      if (!acc[complexity]) acc[complexity] = 0;
      acc[complexity]++;
      return acc;
    }, {} as Record<string, number>);

    // Error types
    const errorTypes = recentTelemetry
      .filter((t) => !t.success && t.errorType)
      .reduce((acc, t) => {
        const type = t.errorType!;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalRequests,
      successRate,
      avgLatency,
      avgCost,
      byModel,
      byComplexity,
      errorTypes,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private initializeProviders(): void {
    // Same as v1 - omitted for brevity
    // Initialize Gemini, OpenAI, Anthropic, Mistral providers
    if (process.env.GEMINI_API_KEY) {
      this.geminiProvider = new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-1.5-flash-latest',
      });
    }
    if (process.env.OPENAI_API_KEY) {
      this.openaiProvider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
      });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-sonnet-4-20250514',
      });
    }
    if (process.env.MISTRAL_API_KEY) {
      this.mistralProvider = new MistralProvider({
        apiKey: process.env.MISTRAL_API_KEY,
        model: 'small',
      });
    }
  }

  private async executeRequest(
    modelKey: string,
    request: AIRequest
  ): Promise<AIResponse> {
    // Same as v1 - execute with provider
    const startTime = Date.now();
    const model = this.models[modelKey];

    const providerRequest: AIProviderRequest = {
      prompt: request.prompt,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      context: request.context,
    };

    let providerResponse: AIProviderResponse;

    switch (model.provider) {
      case 'gemini':
        if (!this.geminiProvider) throw new Error('Gemini not initialized');
        providerResponse = await this.geminiProvider.complete(providerRequest);
        break;
      case 'openai':
        if (!this.openaiProvider) throw new Error('OpenAI not initialized');
        providerResponse = await this.openaiProvider.complete(providerRequest);
        break;
      case 'anthropic':
        if (!this.anthropicProvider) throw new Error('Anthropic not initialized');
        providerResponse = await this.anthropicProvider.complete(providerRequest);
        break;
      case 'mistral':
        if (!this.mistralProvider) throw new Error('Mistral not initialized');
        providerResponse = await this.mistralProvider.complete(providerRequest);
        break;
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }

    const latency = Date.now() - startTime;
    const cost = this.calculateCost(
      model,
      providerResponse.inputTokens,
      providerResponse.outputTokens
    );

    return {
      model: model.name,
      provider: model.provider,
      response: providerResponse.content,
      inputTokens: providerResponse.inputTokens,
      outputTokens: providerResponse.outputTokens,
      cost,
      latencyMs: latency,
      cached: false,
      timestamp: new Date().toISOString(),
      qualityScore: model.qualityScore,
      fallbackUsed: false,
      rateLimitHit: false,
      budgetRemaining: 0, // Will be filled by caller
    };
  }

  private calculateCost(
    model: AIModel,
    inputTokens: number,
    outputTokens: number
  ): number {
    if (
      model.provider === 'gemini' &&
      model.freeRequestsPerDay &&
      this.geminiDailyCount <= model.freeRequestsPerDay
    ) {
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * model.costPerMillionInputTokens;
    const outputCost =
      (outputTokens / 1_000_000) * model.costPerMillionOutputTokens;

    return inputCost + outputCost;
  }

  private isGeminiFreeAvailable(): boolean {
    const gemini = this.models['gemini-flash'];
    return !!(
      gemini.freeRequestsPerDay &&
      this.geminiDailyCount < gemini.freeRequestsPerDay
    );
  }

  private resetDailyCountIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastResetDate) {
      logger.info('Resetting daily counters', {
        previousDate: this.lastResetDate,
        previousGeminiCount: this.geminiDailyCount,
      });
      this.geminiDailyCount = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * Update model metrics based on actual performance
   */
  private updateModelMetrics(
    modelKey: string,
    actualLatency: number,
    success: boolean
  ): void {
    const model = this.models[modelKey];
    if (!model) return;

    // Exponential moving average for latency
    const alpha = 0.2; // Weight for new data
    model.avgLatencyMs = model.avgLatencyMs * (1 - alpha) + actualLatency * alpha;

    // Update reliability score based on success
    if (success) {
      model.reliabilityScore = Math.min(100, model.reliabilityScore + 0.1);
    } else {
      model.reliabilityScore = Math.max(0, model.reliabilityScore - 1);
    }
  }

  /**
   * Get current usage statistics
   */
  getUsageStats() {
    return {
      totalRequests: this.requestCount,
      geminiDailyCount: this.geminiDailyCount,
      geminiFreeTierRemaining: Math.max(
        0,
        (this.models['gemini-flash'].freeRequestsPerDay || 0) -
          this.geminiDailyCount
      ),
      strategy: this.strategy,
      modelPerformance: Object.entries(this.models).map(([key, model]) => ({
        model: key,
        avgLatencyMs: model.avgLatencyMs,
        qualityScore: model.qualityScore,
        reliabilityScore: model.reliabilityScore,
      })),
    };
  }

  /**
   * Update routing strategy
   */
  updateStrategy(strategy: Partial<RoutingStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
    logger.info('Routing strategy updated', { strategy: this.strategy });
  }

  /**
   * Update budget configuration
   */
  updateBudget(budget: Partial<BudgetConfig>): void {
    this.budget = { ...this.budget, ...budget };
    logger.info('Budget configuration updated', { budget: this.budget });
  }
}

// Export singleton instance
export const smartAIRouterV2 = new SmartAIRouterV2();

export default SmartAIRouterV2;
