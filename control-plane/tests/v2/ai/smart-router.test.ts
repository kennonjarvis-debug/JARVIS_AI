/**
 * Smart AI Router Tests
 * Tests for AI router initialization and model selection logic
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { SmartAIRouter, type AIRequest, type RoutingStrategy } from '../../../src/core/smart-ai-router.js';

// Mock providers to avoid real API calls
// @ts-ignore - Mock implementation for testing
jest.mock('../../../src/integrations/ai-providers/index.js', () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    complete: jest.fn().mockResolvedValue({
      content: 'Mocked Gemini response',
      inputTokens: 100,
      outputTokens: 50,
    }),
  })),
  OpenAIProvider: jest.fn().mockImplementation(() => ({
    complete: jest.fn().mockResolvedValue({
      content: 'Mocked OpenAI response',
      inputTokens: 100,
      outputTokens: 50,
    }),
  })),
  AnthropicProvider: jest.fn().mockImplementation(() => ({
    complete: jest.fn().mockResolvedValue({
      content: 'Mocked Claude response',
      inputTokens: 100,
      outputTokens: 50,
    }),
  })),
  MistralProvider: jest.fn(),
}));

// Mock logger to suppress console output during tests
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

describe('SmartAIRouter - Initialization', () => {
  beforeEach(() => {
    // Set mock API keys
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  });

  test('should initialize with default routing strategy', () => {
    const router = new SmartAIRouter();
    const stats = router.getUsageStats();

    expect(stats.strategy).toEqual({
      geminiPercentage: 70,
      gptMiniPercentage: 20,
      claudePercentage: 10,
    });
    expect(stats.totalRequests).toBe(0);
    expect(stats.geminiDailyCount).toBe(0);
  });

  test('should initialize with custom routing strategy', () => {
    const customStrategy: RoutingStrategy = {
      geminiPercentage: 50,
      gptMiniPercentage: 30,
      claudePercentage: 20,
    };

    const router = new SmartAIRouter(customStrategy);
    const stats = router.getUsageStats();

    expect(stats.strategy).toEqual(customStrategy);
  });

  test('should track Gemini free tier remaining', () => {
    const router = new SmartAIRouter();
    const stats = router.getUsageStats();

    // Default Gemini free tier is 1500 requests/day
    expect(stats.geminiFreeTierRemaining).toBe(1500);
  });
});

describe('SmartAIRouter - Model Selection', () => {
  let router: SmartAIRouter;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    router = new SmartAIRouter();
  });

  test('should route simple requests through strategy distribution', async () => {
    const request: AIRequest = {
      prompt: 'What is 2 + 2?',
      complexity: 'simple',
    };

    const response = await router.route(request);

    expect(response).toBeDefined();
    expect(response.model).toBeDefined();
    expect(response.provider).toBeDefined();
    expect(response.response).toBeDefined();
    expect(response.inputTokens).toBeGreaterThan(0);
    expect(response.outputTokens).toBeGreaterThan(0);
  });

  test('should always use Claude for complex tasks', async () => {
    const request: AIRequest = {
      prompt: 'Explain quantum entanglement in detail',
      complexity: 'complex',
    };

    const response = await router.route(request);

    expect(response.model).toBe('Claude Sonnet 4.5');
    expect(response.provider).toBe('anthropic');
  });

  test('should increment request count after routing', async () => {
    const request: AIRequest = {
      prompt: 'Test prompt',
      complexity: 'simple',
    };

    const statsBefore = router.getUsageStats();
    expect(statsBefore.totalRequests).toBe(0);

    await router.route(request);

    const statsAfter = router.getUsageStats();
    expect(statsAfter.totalRequests).toBe(1);
  });

  test('should track Gemini daily count when using Gemini', async () => {
    // Force Gemini selection by using 100% Gemini strategy
    const geminiRouter = new SmartAIRouter({
      geminiPercentage: 100,
      gptMiniPercentage: 0,
      claudePercentage: 0,
    });

    const request: AIRequest = {
      prompt: 'Simple question',
      complexity: 'simple',
    };

    await geminiRouter.route(request);

    const stats = geminiRouter.getUsageStats();
    expect(stats.geminiDailyCount).toBeGreaterThan(0);
    expect(stats.geminiFreeTierRemaining).toBeLessThan(1500);
  });
});

describe('SmartAIRouter - Strategy Updates', () => {
  let router: SmartAIRouter;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    router = new SmartAIRouter();
  });

  test('should update routing strategy dynamically', () => {
    const newStrategy: Partial<RoutingStrategy> = {
      geminiPercentage: 60,
      gptMiniPercentage: 30,
      claudePercentage: 10,
    };

    router.updateStrategy(newStrategy);

    const stats = router.getUsageStats();
    expect(stats.strategy).toEqual(newStrategy);
  });

  test('should allow partial strategy updates', () => {
    router.updateStrategy({ claudePercentage: 25 });

    const stats = router.getUsageStats();
    expect(stats.strategy.claudePercentage).toBe(25);
    expect(stats.strategy.geminiPercentage).toBe(70); // Unchanged
    expect(stats.strategy.gptMiniPercentage).toBe(20); // Unchanged
  });
});

describe('SmartAIRouter - Usage Statistics', () => {
  let router: SmartAIRouter;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    router = new SmartAIRouter();
  });

  test('should return current usage statistics', () => {
    const stats = router.getUsageStats();

    expect(stats).toHaveProperty('totalRequests');
    expect(stats).toHaveProperty('geminiDailyCount');
    expect(stats).toHaveProperty('geminiFreeTierRemaining');
    expect(stats).toHaveProperty('strategy');
    expect(stats).toHaveProperty('costs');
  });

  test('should return monthly cost projection', async () => {
    const projection = await router.getMonthlyProjection();

    expect(projection).toHaveProperty('estimatedMonthlyCost');
    expect(projection).toHaveProperty('breakdown');
    expect(projection.breakdown).toHaveProperty('gemini');
    expect(projection.breakdown).toHaveProperty('openai');
    expect(projection.breakdown).toHaveProperty('anthropic');

    // Based on mock: $1.50/day * 30 = $45
    expect(projection.estimatedMonthlyCost).toBe(45);
  });
});

describe('SmartAIRouter - Latency Measurement', () => {
  let router: SmartAIRouter;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    router = new SmartAIRouter();
  });

  test('should measure request latency', async () => {
    const request: AIRequest = {
      prompt: 'Test latency measurement',
      complexity: 'simple',
    };

    const response = await router.route(request);

    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof response.latencyMs).toBe('number');
  });

  test('should include timestamp in response', async () => {
    const request: AIRequest = {
      prompt: 'Test timestamp',
      complexity: 'simple',
    };

    const response = await router.route(request);

    expect(response.timestamp).toBeDefined();
    expect(new Date(response.timestamp).getTime()).toBeGreaterThan(0);
  });
});

describe('SmartAIRouter - Token Counting', () => {
  let router: SmartAIRouter;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    router = new SmartAIRouter();
  });

  test('should return accurate token counts', async () => {
    const request: AIRequest = {
      prompt: 'Count my tokens',
      complexity: 'simple',
    };

    const response = await router.route(request);

    expect(response.inputTokens).toBe(100); // From mock
    expect(response.outputTokens).toBe(50); // From mock
    expect(typeof response.inputTokens).toBe('number');
    expect(typeof response.outputTokens).toBe('number');
  });
});
