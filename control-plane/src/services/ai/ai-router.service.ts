import { OpenAIService, ChatMessage as OpenAIMessage, ChatCompletionOptions } from './openai.service.js';
import { AnthropicService, ClaudeMessage, ClaudeOptions } from './anthropic.service.js';
import { logger } from '../logger.service.js';

export type AIProvider = 'openai' | 'anthropic' | 'auto';

export interface AIRouterConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultProvider?: AIProvider;
  fallbackEnabled?: boolean;
  costOptimization?: boolean;
  loadBalancing?: boolean;
}

export interface RouteOptions {
  provider?: AIProvider;
  taskType?: 'chat' | 'analysis' | 'coding' | 'creative' | 'simple';
  maxCost?: number;
  preferFast?: boolean;
  requireVision?: boolean;
  requireFunctions?: boolean;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  cost: number;
  tokens: number;
}

interface ProviderMetrics {
  requests: number;
  failures: number;
  lastFailure?: number;
  avgResponseTime: number;
}

export class AIRouterService {
  private openai?: OpenAIService;
  private anthropic?: AnthropicService;
  private config: Required<AIRouterConfig>;
  private metrics: Map<AIProvider, ProviderMetrics> = new Map();
  private providerRotation: AIProvider[] = ['openai', 'anthropic'];
  private currentProviderIndex: number = 0;

  constructor(config: AIRouterConfig) {
    this.config = {
      openaiApiKey: config.openaiApiKey || '',
      anthropicApiKey: config.anthropicApiKey || '',
      defaultProvider: config.defaultProvider || 'auto',
      fallbackEnabled: config.fallbackEnabled ?? true,
      costOptimization: config.costOptimization ?? true,
      loadBalancing: config.loadBalancing ?? false,
    };

    // Initialize providers
    if (this.config.openaiApiKey) {
      this.openai = new OpenAIService({ apiKey: this.config.openaiApiKey });
      this.metrics.set('openai', {
        requests: 0,
        failures: 0,
        avgResponseTime: 0,
      });
    }

    if (this.config.anthropicApiKey) {
      this.anthropic = new AnthropicService({ apiKey: this.config.anthropicApiKey });
      this.metrics.set('anthropic', {
        requests: 0,
        failures: 0,
        avgResponseTime: 0,
      });
    }

    logger.info('AI Router initialized', {
      providers: Array.from(this.metrics.keys()),
      defaultProvider: this.config.defaultProvider,
    });
  }

  /**
   * Automatically select the best provider based on task and constraints
   */
  private selectProvider(options: RouteOptions): AIProvider {
    // If provider explicitly specified, use it
    if (options.provider && options.provider !== 'auto') {
      return options.provider;
    }

    // If load balancing enabled, round-robin between providers
    if (this.config.loadBalancing) {
      const available = Array.from(this.metrics.keys()).filter(
        p => !this.isProviderUnhealthy(p)
      );
      if (available.length > 0) {
        this.currentProviderIndex = (this.currentProviderIndex + 1) % available.length;
        return available[this.currentProviderIndex];
      }
    }

    // Cost optimization mode
    if (this.config.costOptimization) {
      // For simple tasks, prefer cheaper models
      if (options.taskType === 'simple' || options.maxCost !== undefined && options.maxCost < 0.01) {
        // Use GPT-3.5 or Claude Haiku (both cheap)
        return 'openai';
      }

      // For creative tasks, prefer Claude
      if (options.taskType === 'creative') {
        return this.anthropic ? 'anthropic' : 'openai';
      }

      // For coding tasks, prefer GPT-4
      if (options.taskType === 'coding') {
        return this.openai ? 'openai' : 'anthropic';
      }

      // For analysis with large context, prefer Claude (200k context)
      if (options.taskType === 'analysis') {
        return this.anthropic ? 'anthropic' : 'openai';
      }
    }

    // Vision tasks require OpenAI GPT-4V
    if (options.requireVision) {
      return 'openai';
    }

    // Function calling - both support it, prefer OpenAI
    if (options.requireFunctions) {
      return this.openai ? 'openai' : 'anthropic';
    }

    // Speed preference
    if (options.preferFast) {
      // Claude Haiku is fastest
      return this.anthropic ? 'anthropic' : 'openai';
    }

    // Default to configured default or first available
    if (this.config.defaultProvider !== 'auto') {
      return this.config.defaultProvider;
    }

    return this.openai ? 'openai' : 'anthropic';
  }

  /**
   * Check if provider is unhealthy (high failure rate)
   */
  private isProviderUnhealthy(provider: AIProvider): boolean {
    const metrics = this.metrics.get(provider);
    if (!metrics) return true;

    const failureRate = metrics.requests > 0
      ? metrics.failures / metrics.requests
      : 0;

    // Consider unhealthy if >50% failure rate in last hour
    const recentFailure = metrics.lastFailure
      ? Date.now() - metrics.lastFailure < 3600000
      : false;

    return failureRate > 0.5 && recentFailure;
  }

  /**
   * Update provider metrics
   */
  private updateMetrics(
    provider: AIProvider,
    success: boolean,
    responseTime: number
  ): void {
    const metrics = this.metrics.get(provider);
    if (!metrics) return;

    metrics.requests++;
    if (!success) {
      metrics.failures++;
      metrics.lastFailure = Date.now();
    }

    // Update moving average of response time
    metrics.avgResponseTime =
      (metrics.avgResponseTime * (metrics.requests - 1) + responseTime) /
      metrics.requests;

    this.metrics.set(provider, metrics);
  }

  /**
   * Convert generic messages to provider-specific format
   */
  private convertMessagesToOpenAI(messages: AIMessage[]): OpenAIMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  private convertMessagesToClaude(messages: AIMessage[]): ClaudeMessage[] {
    // Claude doesn't support system messages in messages array
    return messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
  }

  /**
   * Extract system message from messages
   */
  private extractSystemMessage(messages: AIMessage[]): string | undefined {
    const systemMsg = messages.find(msg => msg.role === 'system');
    return systemMsg?.content;
  }

  /**
   * Create a chat completion with automatic routing
   */
  async chat(
    messages: AIMessage[],
    options: RouteOptions = {},
    userId?: string
  ): Promise<AIResponse> {
    const provider = this.selectProvider(options);
    const startTime = Date.now();

    logger.info('Routing AI request', {
      provider,
      taskType: options.taskType,
      messageCount: messages.length,
    });

    try {
      let response: AIResponse;

      if (provider === 'openai') {
        if (!this.openai) {
          throw new Error('OpenAI not configured');
        }

        const openaiMessages = this.convertMessagesToOpenAI(messages);
        const result = await this.openai.createChatCompletion(
          openaiMessages,
          {
            model: options.taskType === 'simple' ? 'gpt-3.5-turbo' : 'gpt-4-turbo',
            temperature: options.taskType === 'creative' ? 0.9 : 0.7,
          },
          userId
        );

        response = {
          content: result.content,
          provider: 'openai',
          model: options.taskType === 'simple' ? 'gpt-3.5-turbo' : 'gpt-4-turbo',
          cost: result.usage.cost,
          tokens: result.usage.totalTokens,
        };
      } else {
        if (!this.anthropic) {
          throw new Error('Anthropic not configured');
        }

        const claudeMessages = this.convertMessagesToClaude(messages);
        const systemMessage = this.extractSystemMessage(messages);
        const result = await this.anthropic.createMessage(
          claudeMessages,
          {
            model: options.taskType === 'simple'
              ? 'claude-3-haiku-20240307'
              : 'claude-3-5-sonnet-20241022',
            system: systemMessage,
            temperature: options.taskType === 'creative' ? 1.0 : 0.7,
          },
          userId
        );

        response = {
          content: result.content,
          provider: 'anthropic',
          model: options.taskType === 'simple'
            ? 'claude-3-haiku-20240307'
            : 'claude-3-5-sonnet-20241022',
          cost: result.usage.cost,
          tokens: result.usage.totalTokens,
        };
      }

      const responseTime = Date.now() - startTime;
      this.updateMetrics(provider, true, responseTime);

      logger.info('AI request completed', {
        provider,
        cost: response.cost,
        tokens: response.tokens,
        responseTime,
      });

      return response;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(provider, false, responseTime);

      logger.error('AI request failed', {
        provider,
        error: error.message,
      });

      // Try fallback provider if enabled
      if (this.config.fallbackEnabled) {
        const fallbackProvider = provider === 'openai' ? 'anthropic' : 'openai';

        if (
          (fallbackProvider === 'openai' && this.openai) ||
          (fallbackProvider === 'anthropic' && this.anthropic)
        ) {
          logger.warn('Attempting fallback', { from: provider, to: fallbackProvider });

          return this.chat(
            messages,
            { ...options, provider: fallbackProvider },
            userId
          );
        }
      }

      throw error;
    }
  }

  /**
   * Create a streaming chat completion
   */
  async streamChat(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options: RouteOptions = {},
    userId?: string
  ): Promise<AIResponse> {
    const provider = this.selectProvider(options);
    const startTime = Date.now();

    try {
      let response: AIResponse;

      if (provider === 'openai') {
        if (!this.openai) {
          throw new Error('OpenAI not configured');
        }

        const openaiMessages = this.convertMessagesToOpenAI(messages);
        const result = await this.openai.createStreamingChatCompletion(
          openaiMessages,
          {
            model: options.taskType === 'simple' ? 'gpt-3.5-turbo' : 'gpt-4-turbo',
          },
          onChunk,
          userId
        );

        response = {
          content: result.content,
          provider: 'openai',
          model: options.taskType === 'simple' ? 'gpt-3.5-turbo' : 'gpt-4-turbo',
          cost: result.usage.cost,
          tokens: result.usage.totalTokens,
        };
      } else {
        if (!this.anthropic) {
          throw new Error('Anthropic not configured');
        }

        const claudeMessages = this.convertMessagesToClaude(messages);
        const systemMessage = this.extractSystemMessage(messages);
        const result = await this.anthropic.createStreamingMessage(
          claudeMessages,
          {
            model: options.taskType === 'simple'
              ? 'claude-3-haiku-20240307'
              : 'claude-3-5-sonnet-20241022',
            system: systemMessage,
          },
          onChunk,
          userId
        );

        response = {
          content: result.content,
          provider: 'anthropic',
          model: options.taskType === 'simple'
            ? 'claude-3-haiku-20240307'
            : 'claude-3-5-sonnet-20241022',
          cost: result.usage.cost,
          tokens: result.usage.totalTokens,
        };
      }

      const responseTime = Date.now() - startTime;
      this.updateMetrics(provider, true, responseTime);

      return response;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(provider, false, responseTime);
      throw error;
    }
  }

  /**
   * Get provider metrics
   */
  getMetrics(): Map<AIProvider, ProviderMetrics> {
    return this.metrics;
  }

  /**
   * Get total cost across all providers
   */
  getTotalCost(userId?: string): number {
    let total = 0;

    if (this.openai) {
      const usage = userId
        ? this.openai.getUserUsage(userId)
        : this.openai.getTotalUsage();
      if (usage) total += usage.cost;
    }

    if (this.anthropic) {
      const usage = userId
        ? this.anthropic.getUserUsage(userId)
        : this.anthropic.getTotalUsage();
      if (usage) total += usage.cost;
    }

    return total;
  }

  /**
   * A/B test different models
   */
  async abTest(
    messages: AIMessage[],
    providers: AIProvider[],
    userId?: string
  ): Promise<Map<AIProvider, AIResponse>> {
    const results = new Map<AIProvider, AIResponse>();

    await Promise.all(
      providers.map(async provider => {
        try {
          const response = await this.chat(
            messages,
            { provider },
            userId
          );
          results.set(provider, response);
        } catch (error) {
          logger.error('A/B test failed for provider', { provider, error });
        }
      })
    );

    return results;
  }
}

export default AIRouterService;
