/**
 * OpenAI Provider
 *
 * Supports GPT-4o, GPT-4o Mini, and other OpenAI models
 * GPT-4o Mini: $0.15/M input, $0.60/M output
 */

import OpenAI from 'openai';
import { logger } from '../../utils/logger.js';
import type { IProviderClient, AIProviderRequest, AIProviderResponse } from './types.js';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
}

export class OpenAIProvider implements IProviderClient {
  private client: OpenAI;
  private modelName: string;

  constructor(config: OpenAIConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    this.modelName = config.model || 'gpt-4o-mini';

    logger.info('OpenAIProvider initialized', {
      model: this.modelName,
    });
  }

  /**
   * Complete a chat request
   */
  async complete(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();

    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

      // Add context as system message if provided
      if (request.context) {
        messages.push({
          role: 'system',
          content: request.context,
        });
      }

      // Add user prompt
      messages.push({
        role: 'user',
        content: request.prompt,
      });

      logger.debug('OpenAI API request', {
        model: this.modelName,
        promptLength: request.prompt.length,
      });

      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
      });

      const latency = Date.now() - startTime;

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No choices in OpenAI response');
      }

      const choice = completion.choices[0];
      const usage = completion.usage;

      if (!choice.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      logger.debug('OpenAI API response received', {
        model: this.modelName,
        latency: `${latency}ms`,
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
      });

      return {
        content: choice.message.content,
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        finishReason: choice.finish_reason || undefined,
      };

    } catch (error: any) {
      logger.error('OpenAI API error', {
        model: this.modelName,
        error: error.message,
        stack: error.stack,
      });

      if (error.message?.includes('rate limit') || error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }

      if (error.message?.includes('authentication') || error.status === 401) {
        throw new Error('OpenAI authentication failed. Check API key.');
      }

      if (error.message?.includes('quota') || error.status === 429) {
        throw new Error('OpenAI quota exceeded. Check billing.');
      }

      throw error;
    }
  }

  /**
   * Stream a chat request
   */
  async *stream(request: AIProviderRequest): AsyncIterable<string> {
    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

      if (request.context) {
        messages.push({
          role: 'system',
          content: request.context,
        });
      }

      messages.push({
        role: 'user',
        content: request.prompt,
      });

      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }

    } catch (error: any) {
      logger.error('OpenAI streaming error', {
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

export default OpenAIProvider;
