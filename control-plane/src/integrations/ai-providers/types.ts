/**
 * Common types for AI provider integrations
 */

export interface AIProviderRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  context?: string;
}

export interface AIProviderResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  finishReason?: string;
}

export interface IProviderClient {
  complete(request: AIProviderRequest): Promise<AIProviderResponse>;
  stream?(request: AIProviderRequest): AsyncIterable<string>;
}
