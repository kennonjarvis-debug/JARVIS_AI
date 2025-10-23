/**
 * Claude AI Service - Direct Anthropic SDK integration
 * Provides a simple global Claude client for JARVIS Control Plane
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from './logger.service.js';

declare global {
  var businessAssistant: Anthropic | undefined;
}

/**
 * Initialize Claude AI service and make it globally available
 */
export const startClaude = () => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      logger.warn('⚠️  Claude API key not found in environment variables');
      logger.warn('   Set ANTHROPIC_API_KEY or CLAUDE_API_KEY in .env to enable Claude integration');
      return;
    }

    const anthropic = new Anthropic({
      apiKey,
    });

    // Make Claude globally available
    globalThis.businessAssistant = anthropic;

    logger.info('✅ Claude AI service initialized successfully');
    logger.info('   Global client available at: globalThis.businessAssistant');
  } catch (error: any) {
    logger.error(`❌ Failed to initialize Claude service: ${error.message}`);
  }
};

/**
 * Get the Claude client instance
 */
export const getClaude = (): Anthropic | undefined => {
  return globalThis.businessAssistant;
};

/**
 * Helper function to send a message to Claude
 */
export const sendMessage = async (
  message: string,
  options?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
    system?: string;
  }
): Promise<string> => {
  const claude = getClaude();

  if (!claude) {
    throw new Error('Claude AI service not initialized. Call startClaude() first.');
  }

  const response = await claude.messages.create({
    model: options?.model || 'claude-3-5-sonnet-20241022',
    max_tokens: options?.max_tokens || 4096,
    temperature: options?.temperature || 0.7,
    system: options?.system,
    messages: [
      {
        role: 'user',
        content: message,
      },
    ],
  });

  // Extract text content from response
  const textContent = response.content.find(block => block.type === 'text');
  return textContent && 'text' in textContent ? textContent.text : '';
};

export default {
  startClaude,
  getClaude,
  sendMessage,
};
