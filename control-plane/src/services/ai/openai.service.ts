import OpenAI from 'openai';
import type { ChatCompletionCreateParamsStreaming, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { logger } from '../logger.service.js';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  functions?: any[];
  functionCall?: 'auto' | 'none' | { name: string };
  user?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export interface FunctionCall {
  name: string;
  arguments: string;
}

// Pricing per 1K tokens (as of 2024)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-32k': { input: 0.06, output: 0.12 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
};

// Context window limits
const CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-preview': 128000,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-3.5-turbo': 16385,
  'gpt-3.5-turbo-16k': 16385,
};

export class OpenAIService {
  private client: OpenAI;
  private config: Required<OpenAIConfig>;
  private requestCount: number = 0;
  private tokenUsage: Map<string, TokenUsage> = new Map();
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 100; // 100ms between requests

  constructor(config: OpenAIConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gpt-4-turbo',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4096,
      topP: config.topP ?? 1,
      frequencyPenalty: config.frequencyPenalty ?? 0,
      presencePenalty: config.presencePenalty ?? 0,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });

    logger.info('OpenAI service initialized', { model: this.config.model });
  }

  /**
   * Rate limiting - ensure minimum interval between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-3.5-turbo'];
    const inputCost = (promptTokens / 1000) * pricing.input;
    const outputCost = (completionTokens / 1000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Track token usage and costs
   */
  private trackUsage(
    userId: string,
    model: string,
    promptTokens: number,
    completionTokens: number
  ): void {
    const cost = this.calculateCost(model, promptTokens, completionTokens);
    const existing = this.tokenUsage.get(userId) || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cost: 0,
    };

    this.tokenUsage.set(userId, {
      promptTokens: existing.promptTokens + promptTokens,
      completionTokens: existing.completionTokens + completionTokens,
      totalTokens: existing.totalTokens + promptTokens + completionTokens,
      cost: existing.cost + cost,
    });
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if messages fit within context window
   */
  checkContextWindow(messages: ChatMessage[], model?: string): boolean {
    const modelName = model || this.config.model;
    const contextLimit = CONTEXT_WINDOWS[modelName] || 16385;

    const totalTokens = messages.reduce((sum, msg) => {
      return sum + this.estimateTokens(msg.content);
    }, 0);

    return totalTokens < contextLimit;
  }

  /**
   * Truncate messages to fit context window
   */
  truncateToContextWindow(
    messages: ChatMessage[],
    model?: string
  ): ChatMessage[] {
    const modelName = model || this.config.model;
    const contextLimit = CONTEXT_WINDOWS[modelName] || 16385;
    const reserveTokens = 1000; // Reserve for completion
    const maxInputTokens = contextLimit - reserveTokens;

    let totalTokens = 0;
    const truncated: ChatMessage[] = [];

    // Always keep system message
    if (messages[0]?.role === 'system') {
      truncated.push(messages[0]);
      totalTokens += this.estimateTokens(messages[0].content);
    }

    // Add messages from end (most recent) until we hit limit
    for (let i = messages.length - 1; i >= 1; i--) {
      const msgTokens = this.estimateTokens(messages[i].content);
      if (totalTokens + msgTokens > maxInputTokens) break;

      truncated.unshift(messages[i]);
      totalTokens += msgTokens;
    }

    return truncated;
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
    userId?: string
  ): Promise<{
    content: string;
    role: string;
    functionCall?: FunctionCall;
    usage: TokenUsage;
  }> {
    await this.enforceRateLimit();
    this.requestCount++;

    const model = options.model || this.config.model;

    // Check and truncate if needed
    let finalMessages = messages;
    if (!this.checkContextWindow(messages, model)) {
      logger.warn('Messages exceed context window, truncating', {
        model,
        originalCount: messages.length,
      });
      finalMessages = this.truncateToContextWindow(messages, model);
    }

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: finalMessages as ChatCompletionMessageParam[],
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        functions: options.functions,
        function_call: options.functionCall,
        user: options.user || userId,
      });

      const choice = completion.choices[0];
      const usage = completion.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };

      // Track usage
      if (userId) {
        this.trackUsage(
          userId,
          model,
          usage.prompt_tokens,
          usage.completion_tokens
        );
      }

      const tokenUsageData: TokenUsage = {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost: this.calculateCost(
          model,
          usage.prompt_tokens,
          usage.completion_tokens
        ),
      };

      logger.info('Chat completion created', {
        model,
        tokens: usage.total_tokens,
        cost: tokenUsageData.cost,
      });

      return {
        content: choice.message.content || '',
        role: choice.message.role,
        functionCall: choice.message.function_call ? {
          name: choice.message.function_call.name,
          arguments: choice.message.function_call.arguments,
        } : undefined,
        usage: tokenUsageData,
      };
    } catch (error: any) {
      logger.error('OpenAI API error', { error: error.message });

      // Retry logic for rate limits
      if (error.status === 429) {
        const retryAfter = parseInt(error.headers?.['retry-after'] || '5');
        logger.warn(`Rate limited, retrying after ${retryAfter}s`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.createChatCompletion(messages, options, userId);
      }

      throw error;
    }
  }

  /**
   * Create a streaming chat completion
   */
  async createStreamingChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
    onChunk?: (chunk: string) => void,
    userId?: string
  ): Promise<{
    content: string;
    usage: TokenUsage;
  }> {
    await this.enforceRateLimit();
    this.requestCount++;

    const model = options.model || this.config.model;
    let fullContent = '';

    // Check and truncate if needed
    let finalMessages = messages;
    if (!this.checkContextWindow(messages, model)) {
      finalMessages = this.truncateToContextWindow(messages, model);
    }

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: finalMessages as ChatCompletionMessageParam[],
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        stream: true,
        user: options.user || userId,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }

      // Estimate usage for streaming
      const promptTokens = finalMessages.reduce(
        (sum, msg) => sum + this.estimateTokens(msg.content),
        0
      );
      const completionTokens = this.estimateTokens(fullContent);
      const cost = this.calculateCost(model, promptTokens, completionTokens);

      if (userId) {
        this.trackUsage(userId, model, promptTokens, completionTokens);
      }

      return {
        content: fullContent,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          cost,
        },
      };
    } catch (error: any) {
      logger.error('OpenAI streaming error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create embeddings for text
   */
  async createEmbedding(
    text: string | string[],
    model: string = 'text-embedding-3-small'
  ): Promise<number[][]> {
    await this.enforceRateLimit();

    try {
      const response = await this.client.embeddings.create({
        model,
        input: text,
      });

      return response.data.map(item => item.embedding);
    } catch (error: any) {
      logger.error('OpenAI embedding error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get usage statistics for a user
   */
  getUserUsage(userId: string): TokenUsage | undefined {
    return this.tokenUsage.get(userId);
  }

  /**
   * Get total usage across all users
   */
  getTotalUsage(): TokenUsage {
    let total: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cost: 0,
    };

    for (const usage of this.tokenUsage.values()) {
      total.promptTokens += usage.promptTokens;
      total.completionTokens += usage.completionTokens;
      total.totalTokens += usage.totalTokens;
      total.cost += usage.cost;
    }

    return total;
  }

  /**
   * Reset usage tracking for a user
   */
  resetUserUsage(userId: string): void {
    this.tokenUsage.delete(userId);
  }

  /**
   * Get request count
   */
  getRequestCount(): number {
    return this.requestCount;
  }
}

export default OpenAIService;
