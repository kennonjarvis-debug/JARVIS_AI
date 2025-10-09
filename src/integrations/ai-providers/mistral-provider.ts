/**
 * Mistral AI Provider
 *
 * Implements Mistral AI integration with support for:
 * - Mistral Large (complex reasoning)
 * - Mistral Small (fast, cost-effective)
 * - Codestral (code generation)
 */

import { Mistral } from '@mistralai/mistralai';
import { logger } from '../../utils/logger.js';
import type { IProviderClient, AIProviderRequest, AIProviderResponse } from './types.js';

export type MistralModelType = 'large' | 'small' | 'codestral';

export interface MistralConfig {
  apiKey: string;
  model?: MistralModelType;
}

export class MistralProvider implements IProviderClient {
  private client: Mistral;
  private modelMap: Record<MistralModelType, string> = {
    large: 'mistral-large-latest',
    small: 'mistral-small-latest',
    codestral: 'codestral-latest',
  };
  private currentModel: MistralModelType;

  // Pricing per 1M tokens (USD)
  private pricing: Record<MistralModelType, { input: number; output: number }> = {
    large: { input: 2.00, output: 6.00 },
    small: { input: 0.20, output: 0.60 },
    codestral: { input: 0.20, output: 0.60 },
  };

  constructor(config: MistralConfig) {
    if (!config.apiKey) {
      throw new Error('Mistral API key is required');
    }

    this.client = new Mistral({
      apiKey: config.apiKey,
    });

    this.currentModel = config.model || 'small';

    logger.info('MistralProvider initialized', {
      model: this.modelMap[this.currentModel],
    });
  }

  /**
   * Complete a chat request
   */
  async complete(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const modelId = this.modelMap[this.currentModel];

    try {
      logger.debug('Mistral API request', {
        model: modelId,
        promptLength: request.prompt.length,
      });

      const messages = [];

      // Add context as system message if provided
      if (request.context) {
        messages.push({
          role: 'system' as const,
          content: request.context,
        });
      }

      // Add user prompt
      messages.push({
        role: 'user' as const,
        content: request.prompt,
      });

      const response = await this.client.chat.complete({
        model: modelId,
        messages,
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || 2000,
      });

      const latency = Date.now() - startTime;

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No choices in Mistral response');
      }

      const choice = response.choices[0];
      const usage = response.usage;

      if (!choice.message?.content) {
        throw new Error('No content in Mistral response');
      }

      logger.debug('Mistral API response received', {
        model: modelId,
        latency: `${latency}ms`,
        inputTokens: usage?.promptTokens,
        outputTokens: usage?.completionTokens,
      });

      return {
        content: choice.message.content,
        inputTokens: usage?.promptTokens || 0,
        outputTokens: usage?.completionTokens || 0,
        finishReason: choice.finishReason,
      };

    } catch (error: any) {
      logger.error('Mistral API error', {
        model: modelId,
        error: error.message,
        stack: error.stack,
      });

      // Handle specific error types
      if (error.message?.includes('rate limit')) {
        throw new Error('Mistral rate limit exceeded. Please try again later.');
      }

      if (error.message?.includes('authentication') || error.message?.includes('API key')) {
        throw new Error('Mistral authentication failed. Check API key.');
      }

      throw error;
    }
  }

  /**
   * Stream a chat request (returns async iterator)
   */
  async *stream(request: AIProviderRequest): AsyncIterable<string> {
    const modelId = this.modelMap[this.currentModel];

    try {
      const messages = [];

      if (request.context) {
        messages.push({
          role: 'system' as const,
          content: request.context,
        });
      }

      messages.push({
        role: 'user' as const,
        content: request.prompt,
      });

      const stream = await this.client.chat.stream({
        model: modelId,
        messages,
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || 2000,
      });

      for await (const chunk of stream) {
        const content = chunk.data?.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }

    } catch (error: any) {
      logger.error('Mistral streaming error', {
        model: modelId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(inputTokens: number, outputTokens: number): number {
    const modelPricing = this.pricing[this.currentModel];
    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
    return inputCost + outputCost;
  }

  /**
   * Get current model name
   */
  getModelName(): string {
    return this.modelMap[this.currentModel];
  }

  /**
   * Switch to different Mistral model
   */
  setModel(model: MistralModelType): void {
    this.currentModel = model;
    logger.info('Switched Mistral model', {
      model: this.modelMap[model],
    });
  }
}

export default MistralProvider;
