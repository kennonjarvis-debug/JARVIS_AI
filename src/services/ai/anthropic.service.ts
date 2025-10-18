import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import { logger } from '../logger.service.js';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image' | 'tool_use' | 'tool_result';
    text?: string;
    source?: any;
    id?: string;
    name?: string;
    input?: any;
    content?: any;
  }>;
}

export interface ClaudeOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
  tools?: Tool[];
  stream?: boolean;
  metadata?: {
    userId?: string;
  };
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  totalTokens: number;
  cost: number;
}

// Pricing per 1M tokens (as of 2024)
const MODEL_PRICING: Record<string, {
  input: number;
  output: number;
  cacheWrite?: number;
  cacheRead?: number;
}> = {
  'claude-3-5-sonnet-20241022': {
    input: 3.00,
    output: 15.00,
    cacheWrite: 3.75,
    cacheRead: 0.30,
  },
  'claude-3-opus-20240229': {
    input: 15.00,
    output: 75.00,
    cacheWrite: 18.75,
    cacheRead: 1.50,
  },
  'claude-3-sonnet-20240229': {
    input: 3.00,
    output: 15.00,
    cacheWrite: 3.75,
    cacheRead: 0.30,
  },
  'claude-3-haiku-20240307': {
    input: 0.25,
    output: 1.25,
    cacheWrite: 0.30,
    cacheRead: 0.03,
  },
};

// Context window limits
const CONTEXT_WINDOWS: Record<string, number> = {
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
};

export class AnthropicService {
  private client: Anthropic;
  private config: Required<AnthropicConfig>;
  private requestCount: number = 0;
  private tokenUsage: Map<string, TokenUsage> = new Map();
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 100; // 100ms between requests

  constructor(config: AnthropicConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'claude-3-5-sonnet-20241022',
      maxTokens: config.maxTokens ?? 4096,
      temperature: config.temperature ?? 1.0,
      topP: config.topP ?? 1,
      topK: config.topK ?? -1,
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });

    logger.info('Anthropic service initialized', { model: this.config.model });
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
    inputTokens: number,
    outputTokens: number,
    cacheCreationTokens: number = 0,
    cacheReadTokens: number = 0
  ): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-3-haiku-20240307'];

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const cacheWriteCost = pricing.cacheWrite
      ? (cacheCreationTokens / 1_000_000) * pricing.cacheWrite
      : 0;
    const cacheReadCost = pricing.cacheRead
      ? (cacheReadTokens / 1_000_000) * pricing.cacheRead
      : 0;

    return inputCost + outputCost + cacheWriteCost + cacheReadCost;
  }

  /**
   * Track token usage and costs
   */
  private trackUsage(
    userId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cacheCreationTokens: number = 0,
    cacheReadTokens: number = 0
  ): void {
    const cost = this.calculateCost(
      model,
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens
    );

    const existing = this.tokenUsage.get(userId) || {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
      cost: 0,
    };

    this.tokenUsage.set(userId, {
      inputTokens: existing.inputTokens + inputTokens,
      outputTokens: existing.outputTokens + outputTokens,
      cacheCreationTokens: (existing.cacheCreationTokens || 0) + cacheCreationTokens,
      cacheReadTokens: (existing.cacheReadTokens || 0) + cacheReadTokens,
      totalTokens: existing.totalTokens + inputTokens + outputTokens,
      cost: existing.cost + cost,
    });
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Claude uses similar tokenization to GPT (~4 chars per token)
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if messages fit within context window
   */
  checkContextWindow(messages: ClaudeMessage[], model?: string): boolean {
    const modelName = model || this.config.model;
    const contextLimit = CONTEXT_WINDOWS[modelName] || 200000;

    const totalTokens = messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string'
        ? msg.content
        : msg.content.filter(c => c.type === 'text').map(c => c.text).join('');
      return sum + this.estimateTokens(content);
    }, 0);

    return totalTokens < contextLimit;
  }

  /**
   * Create a message with Claude
   */
  async createMessage(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {},
    userId?: string
  ): Promise<{
    content: string;
    stopReason: string;
    toolUse?: ToolUseBlock[];
    usage: TokenUsage;
  }> {
    await this.enforceRateLimit();
    this.requestCount++;

    const model = options.model || this.config.model;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        temperature: options.temperature ?? this.config.temperature,
        top_p: this.config.topP,
        top_k: this.config.topK === -1 ? undefined : this.config.topK,
        system: options.system,
        messages: messages as MessageParam[],
        tools: options.tools,
        metadata: options.metadata,
      });

      const usage = response.usage;
      const userId_ = userId || options.metadata?.userId;

      // Track usage with prompt caching if available
      if (userId_) {
        this.trackUsage(
          userId_,
          model,
          usage.input_tokens,
          usage.output_tokens,
          usage.cache_creation_input_tokens || 0,
          usage.cache_read_input_tokens || 0
        );
      }

      const tokenUsageData: TokenUsage = {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheCreationTokens: usage.cache_creation_input_tokens,
        cacheReadTokens: usage.cache_read_input_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
        cost: this.calculateCost(
          model,
          usage.input_tokens,
          usage.output_tokens,
          usage.cache_creation_input_tokens || 0,
          usage.cache_read_input_tokens || 0
        ),
      };

      // Extract text content and tool uses
      const textContent = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      const toolUses = response.content.filter(
        (block: any) => block.type === 'tool_use'
      ) as ToolUseBlock[];

      logger.info('Claude message created', {
        model,
        tokens: usage.input_tokens + usage.output_tokens,
        cost: tokenUsageData.cost,
        cacheHit: (usage.cache_read_input_tokens || 0) > 0,
      });

      return {
        content: textContent,
        stopReason: response.stop_reason || 'end_turn',
        toolUse: toolUses.length > 0 ? toolUses : undefined,
        usage: tokenUsageData,
      };
    } catch (error: any) {
      logger.error('Anthropic API error', { error: error.message });

      // Retry logic for rate limits
      if (error.status === 429) {
        const retryAfter = parseInt(error.headers?.['retry-after'] || '60');
        logger.warn(`Rate limited, retrying after ${retryAfter}s`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.createMessage(messages, options, userId);
      }

      throw error;
    }
  }

  /**
   * Create a streaming message
   */
  async createStreamingMessage(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {},
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
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const stream = await this.client.messages.create({
        model,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        temperature: options.temperature ?? this.config.temperature,
        top_p: this.config.topP,
        top_k: this.config.topK === -1 ? undefined : this.config.topK,
        system: options.system,
        messages: messages as MessageParam[],
        tools: options.tools,
        metadata: options.metadata,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if ('delta' in event && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullContent += text;
            if (onChunk) {
              onChunk(text);
            }
          }
        } else if (event.type === 'message_start') {
          inputTokens = event.message.usage.input_tokens;
        } else if (event.type === 'message_delta') {
          outputTokens = event.usage.output_tokens;
        }
      }

      const cost = this.calculateCost(model, inputTokens, outputTokens);
      const userId_ = userId || options.metadata?.userId;

      if (userId_) {
        this.trackUsage(userId_, model, inputTokens, outputTokens);
      }

      return {
        content: fullContent,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
        },
      };
    } catch (error: any) {
      logger.error('Anthropic streaming error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a message with prompt caching
   * Useful for long system prompts or repeated context
   */
  async createCachedMessage(
    messages: ClaudeMessage[],
    systemPrompt: string,
    options: ClaudeOptions = {},
    userId?: string
  ): Promise<{
    content: string;
    usage: TokenUsage;
    cacheHit: boolean;
  }> {
    // Add cache_control breakpoint to system prompt
    const systemWithCache = [
      {
        type: 'text' as const,
        text: systemPrompt,
        cache_control: { type: 'ephemeral' as const },
      },
    ];

    const response = await this.createMessage(
      messages,
      {
        ...options,
        system: systemWithCache as any,
      },
      userId
    );

    return {
      content: response.content,
      usage: response.usage,
      cacheHit: (response.usage.cacheReadTokens || 0) > 0,
    };
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
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
      cost: 0,
    };

    for (const usage of this.tokenUsage.values()) {
      total.inputTokens += usage.inputTokens;
      total.outputTokens += usage.outputTokens;
      total.cacheCreationTokens = (total.cacheCreationTokens || 0) + (usage.cacheCreationTokens || 0);
      total.cacheReadTokens = (total.cacheReadTokens || 0) + (usage.cacheReadTokens || 0);
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

  /**
   * Get context window size for model
   */
  getContextWindow(model?: string): number {
    return CONTEXT_WINDOWS[model || this.config.model] || 200000;
  }
}

export default AnthropicService;
