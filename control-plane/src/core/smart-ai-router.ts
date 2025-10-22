/**
 * Smart AI Router
 *
 * Implements cost-optimized AI routing strategy for Enhanced Hybrid deployment:
 * - 70% Gemini Flash (free tier: 1,500 req/day)
 * - 20% GPT-4o Mini (low cost)
 * - 10% Claude Sonnet 4.5 (complex tasks)
 *
 * Saves ~$165/month compared to full cloud with heavy Claude usage
 * Target monthly cost: $35-50 for moderate usage (100 interactions/day)
 */

import { logger } from '../utils/logger.js';
import { AICostTracker } from './ai-cost-tracker.js';
import {
  GeminiProvider,
  OpenAIProvider,
  AnthropicProvider,
  MistralProvider,
  type AIProviderRequest,
  type AIProviderResponse
} from '../integrations/ai-providers/index.js';

export interface AIModel {
  name: string;
  provider: 'gemini' | 'openai' | 'anthropic';
  costPerMillionInputTokens: number;
  costPerMillionOutputTokens: number;
  freeRequestsPerDay?: number;
}

export interface AIRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  context?: string;
  complexity?: 'simple' | 'moderate' | 'complex';
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
}

export interface RoutingStrategy {
  geminiPercentage: number;
  gptMiniPercentage: number;
  claudePercentage: number;
}

export class SmartAIRouter {
  private costTracker: AICostTracker;
  private strategy: RoutingStrategy;
  private requestCount: number = 0;
  private geminiDailyCount: number = 0;
  private lastResetDate: string;

  // Provider instances
  private geminiProvider?: GeminiProvider;
  private openaiProvider?: OpenAIProvider;
  private anthropicProvider?: AnthropicProvider;
  private mistralProvider?: MistralProvider;

  // Model definitions
  private models: Record<string, AIModel> = {
    'gemini-flash': {
      name: 'Gemini 1.5 Flash',
      provider: 'gemini',
      costPerMillionInputTokens: 0.15,
      costPerMillionOutputTokens: 0.60,
      freeRequestsPerDay: 1500,
    },
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      provider: 'openai',
      costPerMillionInputTokens: 0.15,
      costPerMillionOutputTokens: 0.60,
    },
    'claude-sonnet-4.5': {
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      costPerMillionInputTokens: 3.00,
      costPerMillionOutputTokens: 15.00,
    },
  };

  constructor(strategy?: RoutingStrategy) {
    this.strategy = strategy || {
      geminiPercentage: 70,
      gptMiniPercentage: 20,
      claudePercentage: 10,
    };

    this.costTracker = new AICostTracker();
    this.lastResetDate = new Date().toISOString().split('T')[0];

    // Initialize providers with API keys from environment
    this.initializeProviders();

    logger.info('SmartAIRouter initialized', {
      strategy: this.strategy,
      models: Object.keys(this.models),
      providersEnabled: {
        gemini: !!this.geminiProvider,
        openai: !!this.openaiProvider,
        anthropic: !!this.anthropicProvider,
        mistral: !!this.mistralProvider,
      },
    });
  }

  /**
   * Initialize AI provider clients
   */
  private initializeProviders(): void {
    try {
      // Gemini
      if (process.env.GEMINI_API_KEY) {
        this.geminiProvider = new GeminiProvider({
          apiKey: process.env.GEMINI_API_KEY,
          model: 'gemini-1.5-flash-latest',
        });
      } else {
        logger.warn('GEMINI_API_KEY not set - Gemini provider disabled');
      }

      // OpenAI
      if (process.env.OPENAI_API_KEY) {
        this.openaiProvider = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4o-mini',
        });
      } else {
        logger.warn('OPENAI_API_KEY not set - OpenAI provider disabled');
      }

      // Anthropic
      if (process.env.ANTHROPIC_API_KEY) {
        this.anthropicProvider = new AnthropicProvider({
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: 'claude-sonnet-4-20250514',
        });
      } else {
        logger.warn('ANTHROPIC_API_KEY not set - Anthropic provider disabled');
      }

      // Mistral (optional)
      if (process.env.MISTRAL_API_KEY) {
        this.mistralProvider = new MistralProvider({
          apiKey: process.env.MISTRAL_API_KEY,
          model: 'small',
        });
      } else {
        logger.debug('MISTRAL_API_KEY not set - Mistral provider disabled');
      }

    } catch (error: any) {
      logger.error('Error initializing AI providers:', error);
    }
  }

  /**
   * Route request to optimal model based on strategy and constraints
   */
  async route(request: AIRequest): Promise<AIResponse> {
    this.resetDailyCountIfNeeded();
    this.requestCount++;

    // Select model based on strategy
    const selectedModel = this.selectModel(request);

    logger.info('Routing AI request', {
      requestNumber: this.requestCount,
      selectedModel,
      complexity: request.complexity || 'simple',
      geminiDailyCount: this.geminiDailyCount,
    });

    // Execute request with selected model
    const response = await this.executeRequest(selectedModel, request);

    // Track usage and cost
    await this.costTracker.trackRequest(response);

    return response;
  }

  /**
   * Select model based on routing strategy and constraints
   */
  private selectModel(request: AIRequest): string {
    // Force Claude for complex tasks regardless of percentage
    if (request.complexity === 'complex') {
      logger.debug('Using Claude for complex task');
      return 'claude-sonnet-4.5';
    }

    // Check if Gemini free tier is available
    const geminiModel = this.models['gemini-flash'];
    const isGeminiFreeAvailable =
      geminiModel.freeRequestsPerDay &&
      this.geminiDailyCount < geminiModel.freeRequestsPerDay;

    // If Gemini free tier available, prefer it heavily
    if (isGeminiFreeAvailable) {
      // Use weighted random selection, but bias toward Gemini
      const rand = Math.random() * 100;

      if (rand < this.strategy.geminiPercentage) {
        this.geminiDailyCount++;
        return 'gemini-flash';
      } else if (rand < this.strategy.geminiPercentage + this.strategy.gptMiniPercentage) {
        return 'gpt-4o-mini';
      } else {
        return 'claude-sonnet-4.5';
      }
    }

    // Gemini free tier exhausted, fall back to GPT-4o Mini and Claude
    const adjustedGptPercentage = this.strategy.gptMiniPercentage + this.strategy.geminiPercentage;
    const rand = Math.random() * 100;

    if (rand < adjustedGptPercentage) {
      logger.debug('Gemini free tier exhausted, using GPT-4o Mini');
      return 'gpt-4o-mini';
    } else {
      logger.debug('Using Claude for high-value request');
      return 'claude-sonnet-4.5';
    }
  }

  /**
   * Execute request with selected model using real provider
   */
  private async executeRequest(modelKey: string, request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = this.models[modelKey];

    try {
      logger.debug(`Executing request with ${model.name}`);

      // Build provider request
      const providerRequest: AIProviderRequest = {
        prompt: request.prompt,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        context: request.context,
      };

      // Call appropriate provider based on model
      let providerResponse: AIProviderResponse;

      switch (model.provider) {
        case 'gemini':
          if (!this.geminiProvider) {
            throw new Error('Gemini provider not initialized. Check GEMINI_API_KEY.');
          }
          providerResponse = await this.geminiProvider.complete(providerRequest);
          break;

        case 'openai':
          if (!this.openaiProvider) {
            throw new Error('OpenAI provider not initialized. Check OPENAI_API_KEY.');
          }
          providerResponse = await this.openaiProvider.complete(providerRequest);
          break;

        case 'anthropic':
          if (!this.anthropicProvider) {
            throw new Error('Anthropic provider not initialized. Check ANTHROPIC_API_KEY.');
          }
          providerResponse = await this.anthropicProvider.complete(providerRequest);
          break;

        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }

      const latency = Date.now() - startTime;

      // Calculate cost (free tier for Gemini if within limit)
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
      };
    } catch (error: any) {
      logger.error(`Request failed for ${model.name}:`, error);

      // Attempt fallback to cheaper model on failure
      if (modelKey === 'claude-sonnet-4.5' && this.openaiProvider) {
        logger.warn('Claude failed, falling back to GPT-4o Mini');
        return this.executeRequest('gpt-4o-mini', request);
      }

      throw error;
    }
  }


  /**
   * Calculate cost for request
   */
  private calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    // Check if using free tier
    if (model.provider === 'gemini' &&
        model.freeRequestsPerDay &&
        this.geminiDailyCount <= model.freeRequestsPerDay) {
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * model.costPerMillionInputTokens;
    const outputCost = (outputTokens / 1_000_000) * model.costPerMillionOutputTokens;

    return inputCost + outputCost;
  }

  /**
   * Reset daily counters if new day
   */
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
   * Get current usage statistics
   */
  getUsageStats() {
    return {
      totalRequests: this.requestCount,
      geminiDailyCount: this.geminiDailyCount,
      geminiFreeTierRemaining: Math.max(0, (this.models['gemini-flash'].freeRequestsPerDay || 0) - this.geminiDailyCount),
      strategy: this.strategy,
      costs: this.costTracker.getDailyCost(),
    };
  }

  /**
   * Get cost projection for month
   */
  async getMonthlyProjection(): Promise<{
    estimatedMonthlyCost: number;
    breakdown: Record<string, number>;
  }> {
    const dailyCosts = await this.costTracker.getDailyCost();
    const avgDailyCost = dailyCosts.totalCost;

    // Project for 30 days
    const estimatedMonthlyCost = avgDailyCost * 30;

    return {
      estimatedMonthlyCost,
      breakdown: {
        gemini: dailyCosts.breakdown.gemini * 30,
        openai: dailyCosts.breakdown.openai * 30,
        anthropic: dailyCosts.breakdown.anthropic * 30,
      },
    };
  }

  /**
   * Update routing strategy dynamically
   */
  updateStrategy(strategy: Partial<RoutingStrategy>): void {
    this.strategy = {
      ...this.strategy,
      ...strategy,
    };

    // Validate percentages sum to 100
    const total = this.strategy.geminiPercentage +
                  this.strategy.gptMiniPercentage +
                  this.strategy.claudePercentage;

    if (Math.abs(total - 100) > 0.01) {
      logger.warn('Routing strategy percentages do not sum to 100', {
        strategy: this.strategy,
        total,
      });
    }

    logger.info('Routing strategy updated', { strategy: this.strategy });
  }
}

// Export singleton instance
export const smartAIRouter = new SmartAIRouter();

export default SmartAIRouter;
