/**
 * Model Fallback Tests
 * Tests for AI router fallback logic when API calls fail
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { SmartAIRouter, type AIRequest } from '../../../src/core/smart-ai-router.js';

// Mock providers with failure scenarios
// @ts-ignore - Mock implementation for testing
const createMockGeminiProvider = (shouldFail = false) => ({
  complete: jest.fn().mockImplementation(() => {
    if (shouldFail) {
      return Promise.reject(new Error('Gemini API Error: Rate limit exceeded'));
    }
    return Promise.resolve({
      content: 'Gemini response',
      inputTokens: 100,
      outputTokens: 50,
    });
  }),
});

// @ts-ignore - Mock implementation for testing
const createMockOpenAIProvider = (shouldFail = false) => ({
  complete: jest.fn().mockImplementation(() => {
    if (shouldFail) {
      return Promise.reject(new Error('OpenAI API Error: Invalid API key'));
    }
    return Promise.resolve({
      content: 'OpenAI response',
      inputTokens: 100,
      outputTokens: 50,
    });
  }),
});

// @ts-ignore - Mock implementation for testing
const createMockAnthropicProvider = (shouldFail = false) => ({
  complete: jest.fn().mockImplementation(() => {
    if (shouldFail) {
      return Promise.reject(new Error('Claude API Error: Service unavailable'));
    }
    return Promise.resolve({
      content: 'Claude response',
      inputTokens: 100,
      outputTokens: 50,
    });
  }),
});

// Mock the provider module
jest.mock('../../../src/integrations/ai-providers/index.js', () => ({
  GeminiProvider: jest.fn().mockImplementation(() => createMockGeminiProvider(false)),
  OpenAIProvider: jest.fn().mockImplementation(() => createMockOpenAIProvider(false)),
  AnthropicProvider: jest.fn().mockImplementation(() => createMockAnthropicProvider(false)),
  MistralProvider: jest.fn(),
}));

// Mock logger
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock cost tracker
// @ts-ignore - Mock implementation for testing
jest.mock('../../../src/core/ai-cost-tracker.js', () => ({
  AICostTracker: jest.fn().mockImplementation(() => ({
    trackRequest: jest.fn().mockResolvedValue(undefined),
    getDailyCost: jest.fn().mockReturnValue({
      totalCost: 1.50,
      breakdown: { gemini: 0.30, openai: 0.70, anthropic: 0.50 },
    }),
  })),
}));

describe('SmartAIRouter - Fallback Logic', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    jest.clearAllMocks();
  });

  test('should fallback from Claude to GPT-4o Mini on failure', async () => {
    // Mock Anthropic to fail, OpenAI to succeed
    const mockProviders = require('../../../src/integrations/ai-providers/index.js');
    mockProviders.AnthropicProvider.mockImplementation(() => createMockAnthropicProvider(true));
    mockProviders.OpenAIProvider.mockImplementation(() => createMockOpenAIProvider(false));

    const router = new SmartAIRouter({
      geminiPercentage: 0,
      gptMiniPercentage: 0,
      claudePercentage: 100, // Force Claude selection
    });

    const request: AIRequest = {
      prompt: 'Test fallback from Claude',
      complexity: 'simple',
    };

    const response = await router.route(request);

    // Should fall back to GPT-4o Mini
    expect(response).toBeDefined();
    expect(response.model).toBe('GPT-4o Mini');
    expect(response.provider).toBe('openai');
  });

  test('should throw error if Claude fails and no fallback available', async () => {
    // Mock both Anthropic and OpenAI to fail
    const mockProviders = require('../../../src/integrations/ai-providers/index.js');
    mockProviders.AnthropicProvider.mockImplementation(() => createMockAnthropicProvider(true));
    mockProviders.OpenAIProvider.mockImplementation(() => createMockOpenAIProvider(true));

    const router = new SmartAIRouter({
      geminiPercentage: 0,
      gptMiniPercentage: 0,
      claudePercentage: 100,
    });

    const request: AIRequest = {
      prompt: 'Test with no fallback',
      complexity: 'simple',
    };

    await expect(router.route(request)).rejects.toThrow();
  });

  test('should not fallback for non-Claude providers', async () => {
    // Mock Gemini to fail
    const mockProviders = require('../../../src/integrations/ai-providers/index.js');
    mockProviders.GeminiProvider.mockImplementation(() => createMockGeminiProvider(true));

    const router = new SmartAIRouter({
      geminiPercentage: 100,
      gptMiniPercentage: 0,
      claudePercentage: 0,
    });

    const request: AIRequest = {
      prompt: 'Test Gemini failure',
      complexity: 'simple',
    };

    // Gemini failures should throw immediately (no fallback implemented for Gemini)
    await expect(router.route(request)).rejects.toThrow('Gemini API Error');
  });
});

describe('SmartAIRouter - Provider Initialization Failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle missing Gemini API key gracefully', () => {
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    // Should not throw during initialization
    const router = new SmartAIRouter();
    expect(router).toBeDefined();

    const stats = router.getUsageStats();
    expect(stats).toBeDefined();
  });

  test('should handle missing OpenAI API key gracefully', () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    delete process.env.OPENAI_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    const router = new SmartAIRouter();
    expect(router).toBeDefined();
  });

  test('should handle missing Anthropic API key gracefully', () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    delete process.env.ANTHROPIC_API_KEY;

    const router = new SmartAIRouter();
    expect(router).toBeDefined();
  });

  test('should throw error when using provider without API key', async () => {
    // Remove Gemini API key
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    const router = new SmartAIRouter({
      geminiPercentage: 100,
      gptMiniPercentage: 0,
      claudePercentage: 0,
    });

    const request: AIRequest = {
      prompt: 'Test without Gemini key',
      complexity: 'simple',
    };

    await expect(router.route(request)).rejects.toThrow(/Gemini provider not initialized/);
  });
});

describe('SmartAIRouter - Retry Logic', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    jest.clearAllMocks();
  });

  test('should successfully fallback after provider failure', async () => {
    const mockProviders = require('../../../src/integrations/ai-providers/index.js');

    // Claude fails, but GPT succeeds
    mockProviders.AnthropicProvider.mockImplementation(() => createMockAnthropicProvider(true));
    mockProviders.OpenAIProvider.mockImplementation(() => createMockOpenAIProvider(false));

    const router = new SmartAIRouter({
      geminiPercentage: 0,
      gptMiniPercentage: 0,
      claudePercentage: 100,
    });

    const request: AIRequest = {
      prompt: 'Test successful fallback',
      complexity: 'simple',
    };

    const response = await router.route(request);

    expect(response).toBeDefined();
    expect(response.provider).toBe('openai'); // Fell back to OpenAI
    expect(response.response).toBeDefined();
  });

  test('should preserve request parameters during fallback', async () => {
    const mockProviders = require('../../../src/integrations/ai-providers/index.js');

    mockProviders.AnthropicProvider.mockImplementation(() => createMockAnthropicProvider(true));

    // @ts-ignore - Mock implementation for testing
    const mockOpenAIComplete = jest.fn().mockResolvedValue({
      content: 'OpenAI response',
      inputTokens: 100,
      outputTokens: 50,
    });

    mockProviders.OpenAIProvider.mockImplementation(() => ({
      complete: mockOpenAIComplete,
    }));

    const router = new SmartAIRouter({
      geminiPercentage: 0,
      gptMiniPercentage: 0,
      claudePercentage: 100,
    });

    const request: AIRequest = {
      prompt: 'Test prompt preservation',
      maxTokens: 500,
      temperature: 0.7,
      complexity: 'simple',
    };

    await router.route(request);

    // Verify the fallback request preserved original parameters
    expect(mockOpenAIComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Test prompt preservation',
        maxTokens: 500,
        temperature: 0.7,
      })
    );
  });
});

describe('SmartAIRouter - Error Handling', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    jest.clearAllMocks();
  });

  test('should propagate error details when all providers fail', async () => {
    const mockProviders = require('../../../src/integrations/ai-providers/index.js');

    mockProviders.AnthropicProvider.mockImplementation(() => createMockAnthropicProvider(true));
    mockProviders.OpenAIProvider.mockImplementation(() => createMockOpenAIProvider(true));

    const router = new SmartAIRouter({
      geminiPercentage: 0,
      gptMiniPercentage: 0,
      claudePercentage: 100,
    });

    const request: AIRequest = {
      prompt: 'Test error propagation',
      complexity: 'simple',
    };

    try {
      await router.route(request);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.message).toContain('OpenAI API Error');
    }
  });

  test('should handle network timeout errors', async () => {
    const mockProviders = require('../../../src/integrations/ai-providers/index.js');

    // @ts-ignore - Mock implementation for testing
    mockProviders.GeminiProvider.mockImplementation(() => ({
      complete: jest.fn().mockRejectedValue(new Error('Network timeout')),
    }));

    const router = new SmartAIRouter({
      geminiPercentage: 100,
      gptMiniPercentage: 0,
      claudePercentage: 0,
    });

    const request: AIRequest = {
      prompt: 'Test timeout',
      complexity: 'simple',
    };

    await expect(router.route(request)).rejects.toThrow('Network timeout');
  });
});
