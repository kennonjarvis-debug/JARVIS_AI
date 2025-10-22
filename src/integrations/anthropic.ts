/**
 * Anthropic Claude Integration Helper
 *
 * Centralized Anthropic client and model configuration.
 * Single source of truth for Claude model selection.
 *
 * @module integrations/anthropic
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { CONFIG } from '../config/tools';
import { Logger } from '../utils/logger';

const logger = new Logger('anthropic');

let _anthropicClient: Anthropic | null = null;
let _openaiClient: OpenAI | null = null;

/**
 * Get Anthropic client instance (lazy initialization)
 */
export function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    _anthropicClient = new Anthropic({ apiKey });
    logger.info('Anthropic client initialized');
  }
  return _anthropicClient;
}

/**
 * Get OpenAI client instance (lazy initialization)
 */
export function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    _openaiClient = new OpenAI({ apiKey });
    logger.info('OpenAI client initialized');
  }
  return _openaiClient;
}

/**
 * Legacy export for backward compatibility
 */
export const anthropic = new Proxy({} as Anthropic, {
  get(_, prop) {
    return (getAnthropicClient() as any)[prop];
  }
});

/**
 * Centralized model configuration - single source of truth
 */
export const DEFAULT_MODEL = CONFIG.anthropicModel;

/**
 * Verify Anthropic API key is configured
 */
export function validateAnthropicConfig(): boolean {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  if (!hasKey) {
    logger.error('ANTHROPIC_API_KEY not configured');
  }
  return hasKey;
}

/**
 * Verify OpenAI API key is configured
 */
export function validateOpenAIConfig(): boolean {
  const hasKey = !!process.env.OPENAI_API_KEY;
  if (!hasKey) {
    logger.warn('OPENAI_API_KEY not configured');
  }
  return hasKey;
}

// Note: Actual API clients are initialized lazily when first used
// This ensures environment variables are loaded via dotenv first
