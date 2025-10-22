/**
 * Google Gemini Provider
 *
 * Free tier: 1,500 requests/day
 * Pricing: $0.15/M input, $0.60/M output
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../utils/logger.js';
import type { IProviderClient, AIProviderRequest, AIProviderResponse } from './types.js';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export class GeminiProvider implements IProviderClient {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.client = new GoogleGenerativeAI(config.apiKey);
    // Use correct Gemini model name format
    this.modelName = config.model || 'gemini-1.5-flash-latest';

    logger.info('GeminiProvider initialized', {
      model: this.modelName,
    });
  }

  /**
   * Complete a chat request
   */
  async complete(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });

      // Build prompt with context if provided
      let fullPrompt = request.prompt;
      if (request.context) {
        fullPrompt = `Context: ${request.context}\n\n${request.prompt}`;
      }

      logger.debug('Gemini API request', {
        model: this.modelName,
        promptLength: fullPrompt.length,
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 2000,
        },
      });

      const latency = Date.now() - startTime;
      const response = result.response;
      const text = response.text();

      // Gemini doesn't always provide token counts, so estimate
      const inputTokens = Math.ceil(fullPrompt.length / 4);
      const outputTokens = Math.ceil(text.length / 4);

      logger.debug('Gemini API response received', {
        model: this.modelName,
        latency: `${latency}ms`,
        inputTokens,
        outputTokens,
      });

      return {
        content: text,
        inputTokens,
        outputTokens,
        finishReason: response.candidates?.[0]?.finishReason,
      };

    } catch (error: any) {
      logger.error('Gemini API error', {
        model: this.modelName,
        error: error.message,
        stack: error.stack,
      });

      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new Error('Gemini rate limit exceeded. Free tier may be exhausted.');
      }

      if (error.message?.includes('API key')) {
        throw new Error('Gemini authentication failed. Check API key.');
      }

      throw error;
    }
  }

  /**
   * Stream a chat request
   */
  async *stream(request: AIProviderRequest): AsyncIterable<string> {
    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });

      let fullPrompt = request.prompt;
      if (request.context) {
        fullPrompt = `Context: ${request.context}\n\n${request.prompt}`;
      }

      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 2000,
        },
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }

    } catch (error: any) {
      logger.error('Gemini streaming error', {
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

export default GeminiProvider;
