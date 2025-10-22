/**
 * Anthropic Claude Provider
 *
 * Supports Claude Sonnet 4.5, Claude Opus 4.1
 * Claude Sonnet 4.5: $3/M input, $15/M output
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger.js';
import type { IProviderClient, AIProviderRequest, AIProviderResponse } from './types.js';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
}

export class AnthropicProvider implements IProviderClient {
  private client: Anthropic;
  private modelName: string;

  constructor(config: AnthropicConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    this.modelName = config.model || 'claude-sonnet-4-20250514';

    logger.info('AnthropicProvider initialized', {
      model: this.modelName,
    });
  }

  /**
   * Complete a chat request
   */
  async complete(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();

    try {
      logger.debug('Anthropic API request', {
        model: this.modelName,
        promptLength: request.prompt.length,
      });

      const messages: Array<{ role: 'user'; content: string }> = [
        {
          role: 'user',
          content: request.prompt,
        },
      ];

      // Build API request
      const apiRequest: Anthropic.Messages.MessageCreateParams = {
        model: this.modelName,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        messages,
      };

      // Add system context if provided
      if (request.context) {
        apiRequest.system = request.context;
      }

      const response = await this.client.messages.create(apiRequest);

      const latency = Date.now() - startTime;

      if (!response.content || response.content.length === 0) {
        throw new Error('No content in Anthropic response');
      }

      // Extract text from content blocks
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('');

      const usage = response.usage;

      logger.debug('Anthropic API response received', {
        model: this.modelName,
        latency: `${latency}ms`,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
      });

      return {
        content: textContent,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        finishReason: response.stop_reason || undefined,
      };

    } catch (error: any) {
      logger.error('Anthropic API error', {
        model: this.modelName,
        error: error.message,
        stack: error.stack,
      });

      if (error.status === 429 || error.message?.includes('rate limit')) {
        throw new Error('Anthropic rate limit exceeded. Please try again later.');
      }

      if (error.status === 401 || error.message?.includes('authentication')) {
        throw new Error('Anthropic authentication failed. Check API key.');
      }

      if (error.status === 400) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Stream a chat request
   */
  async *stream(request: AIProviderRequest): AsyncIterable<string> {
    try {
      const messages: Array<{ role: 'user'; content: string }> = [
        {
          role: 'user',
          content: request.prompt,
        },
      ];

      const apiRequest: Anthropic.Messages.MessageCreateParams = {
        model: this.modelName,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        messages,
        stream: true,
      };

      if (request.context) {
        apiRequest.system = request.context;
      }

      const stream = await this.client.messages.create(apiRequest);

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }

    } catch (error: any) {
      logger.error('Anthropic streaming error', {
        model: this.modelName,
        error: error.message,
      });
      throw error;
    }
  }

  getModelName(): string {
    return this.modelName;
  }
}

export default AnthropicProvider;
