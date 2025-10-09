# Claude Agent System Prompts

**Version:** 1.0.0
**Date:** 2025-10-08
**Purpose:** Define specialized Claude agents for Jarvis operations

---

## Agent Architecture

Jarvis uses multiple specialized Claude instances, each with a specific role:

```
┌─────────────────────────────────────────────────────────┐
│                    Jarvis System                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Claude A: Gateway & Routing                             │
│  Claude B: Cost & Analytics                              │
│  Claude C: Autonomous Operations                         │
│  Claude D: Deployment & Infrastructure                   │
│  Claude E: AI Model Integration                          │
│  Claude F: Testing & Quality Assurance                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Claude E: AI Model Integration Agent

**Role:** Multi-model orchestration, provider management, fallback handling

**System Prompt:**
```
You are Claude E, the AI Model Integration specialist for the Jarvis AI system.

Your primary responsibilities:
1. Integrate and manage multiple AI model providers
2. Implement intelligent model routing and selection
3. Handle API authentication and rate limits
4. Implement fallback strategies for reliability
5. Optimize prompt engineering for each model

Key Skills:
- Multi-model API integration (OpenAI, Anthropic, Google, Mistral, etc.)
- Prompt engineering and optimization
- Token counting and cost calculation
- Rate limit handling and backoff strategies
- Model capability matching (vision, function calling, reasoning)
- Response quality evaluation

Supported Providers:
- OpenAI (GPT-4o, GPT-4o Mini)
- Anthropic (Claude Sonnet 4.5, Claude Opus 4.1)
- Google (Gemini 1.5 Flash, Gemini 1.5 Pro, Gemini 2.5 Pro)
- Mistral (Mistral Large, Mistral Small, Codestral)
- Others as needed

Decision Framework:
- Match model capabilities to task requirements
- Consider cost vs quality tradeoffs
- Implement retry logic with exponential backoff
- Use free tiers when available
- Fallback to cheaper models on rate limit errors
- Cache responses when appropriate

When integrating a new model:
1. Review API documentation and pricing
2. Implement authentication and client
3. Add error handling and retries
4. Test with sample requests
5. Configure routing rules
6. Document capabilities and limitations

Remember: Different models excel at different tasks. Choose wisely
based on cost, speed, and capability requirements.
```

---

## Mistral AI Integration

### Supported Models

| Model | Context | Input Cost | Output Cost | Best For |
|-------|---------|------------|-------------|----------|
| Mistral Large | 128K | $2/M | $6/M | Complex reasoning, multilingual |
| Mistral Small | 32K | $0.20/M | $0.60/M | Fast tasks, cost-effective |
| Codestral | 32K | $0.20/M | $0.60/M | Code generation, debugging |
| Mistral Nemo | 128K | $0.15/M | $0.15/M | Lightweight tasks |

### API Integration Pattern

```typescript
import { Mistral } from '@mistralai/mistralai';

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

// Stream completion
const stream = await client.chat.stream({
  model: 'mistral-large-latest',
  messages: [
    { role: 'user', content: 'Explain quantum computing' }
  ],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.data.choices[0]?.delta?.content || '');
}
```

### Use Cases

**Mistral Large:**
- Complex reasoning tasks
- Multilingual support (English, French, German, Spanish, Italian)
- Function calling
- JSON mode

**Mistral Small:**
- Simple queries and classifications
- Fast response requirements
- High-volume, low-cost scenarios

**Codestral:**
- Code completion and generation
- Code explanation and documentation
- Bug detection and fixing
- Test generation

---

## Model Selection Matrix

### By Cost Tier

**Free Tier (Target: 70% of requests)**
- Gemini 1.5 Flash: 1,500 req/day free
- Use for: Simple queries, monitoring, health checks

**Budget Tier ($0.15-$1.25 per 1M tokens)**
- GPT-4o Mini: $0.15/$0.60
- Gemini 1.5 Flash: $0.15/$0.60
- Mistral Small: $0.20/$0.60
- Mistral Nemo: $0.15/$0.15
- Use for: Most production queries

**Performance Tier ($2-5 per 1M tokens)**
- Mistral Large: $2/$6
- GPT-4o: $3/$15
- Claude Sonnet 4.5: $3/$15
- Gemini 1.5 Pro: $1.25/$5
- Use for: Complex reasoning, critical tasks

**Premium Tier ($15+ per 1M tokens)**
- Claude Opus 4.1: $15/$75
- Use for: Mission-critical, highest quality

### By Capability

**Vision (Image Understanding):**
- GPT-4o ⭐
- Claude Sonnet 4.5
- Gemini 1.5 Pro

**Function Calling:**
- GPT-4o ⭐
- Claude Sonnet 4.5
- Mistral Large

**Code Generation:**
- Codestral ⭐ (specialized)
- GPT-4o
- Claude Sonnet 4.5

**Reasoning:**
- Claude Opus 4.1 ⭐ (extended thinking)
- Mistral Large
- GPT-4o

**Speed:**
- Gemini 1.5 Flash ⭐
- Mistral Nemo
- GPT-4o Mini

**Multilingual:**
- Mistral Large ⭐
- GPT-4o
- Gemini 1.5 Pro

---

## Implementation Roadmap

### Phase 1: Foundation ✅
- [x] Smart AI Router with weighted selection
- [x] OpenAI integration (GPT-4o, GPT-4o Mini)
- [x] Anthropic integration (Claude Sonnet 4.5)
- [x] Google integration (Gemini 1.5 Flash, Pro)
- [x] Cost tracking and monitoring

### Phase 2: Enhanced Providers (Now - Claude E)
- [ ] Mistral AI integration
  - [ ] Mistral Large client
  - [ ] Mistral Small client
  - [ ] Codestral client
  - [ ] Cost tracking integration
- [ ] Provider fallback chains
- [ ] Response caching layer
- [ ] Token usage optimization

### Phase 3: Advanced Features
- [ ] Multi-modal support (vision, audio)
- [ ] Function calling router
- [ ] Prompt optimization engine
- [ ] A/B testing framework
- [ ] Quality scoring system

---

## Provider Implementation Template

```typescript
// src/integrations/ai-providers/mistral-provider.ts

import { Mistral } from '@mistralai/mistralai';
import { logger } from '../../utils/logger.js';
import type { AIRequest, AIResponse } from '../../core/smart-ai-router.js';

export class MistralProvider {
  private client: Mistral;
  private models = {
    large: 'mistral-large-latest',
    small: 'mistral-small-latest',
    codestral: 'codestral-latest',
  };

  constructor() {
    this.client = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }

  async complete(
    request: AIRequest,
    model: 'large' | 'small' | 'codestral' = 'small'
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.complete({
        model: this.models[model],
        messages: [
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || 2000,
      });

      const choice = response.choices[0];
      const usage = response.usage;

      return {
        model: `Mistral ${model}`,
        provider: 'mistral',
        response: choice.message.content,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        cost: this.calculateCost(model, usage.promptTokens, usage.completionTokens),
        latencyMs: Date.now() - startTime,
        cached: false,
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      logger.error('Mistral API error:', error);
      throw error;
    }
  }

  private calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = {
      large: { input: 2.00, output: 6.00 },
      small: { input: 0.20, output: 0.60 },
      codestral: { input: 0.20, output: 0.60 },
    };

    const modelPricing = pricing[model];
    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('MistralProvider', () => {
  it('should complete a simple request', async () => {
    const provider = new MistralProvider();
    const response = await provider.complete({
      prompt: 'What is 2+2?',
      complexity: 'simple',
    });

    expect(response.success).toBe(true);
    expect(response.provider).toBe('mistral');
    expect(response.cost).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    const provider = new MistralProvider();
    // Test with invalid API key
    await expect(provider.complete({
      prompt: 'test',
    })).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
describe('Smart Router with Mistral', () => {
  it('should route code tasks to Codestral', async () => {
    const request: AIRequest = {
      prompt: 'Write a function to check if a number is prime',
      complexity: 'moderate',
      context: 'code-generation',
    };

    const response = await smartRouter.route(request);
    expect(response.model).toContain('Codestral');
  });
});
```

---

## Monitoring & Metrics

Track these metrics for Mistral integration:

```typescript
interface MistralMetrics {
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  totalCost: number;
  modelDistribution: {
    large: number;
    small: number;
    codestral: number;
  };
  errorRate: number;
  cacheHitRate: number;
}
```

---

## Next Steps for Claude E

1. **Implement Mistral Clients** (2 hours)
   - Create provider classes for each model
   - Add authentication and error handling
   - Test with sample requests

2. **Integrate with Smart Router** (1 hour)
   - Add Mistral models to routing config
   - Update cost calculation
   - Configure fallback chains

3. **Add Response Caching** (2 hours)
   - Implement Redis-based cache
   - Add cache key generation
   - Configure TTL policies

4. **Optimize Routing Logic** (1 hour)
   - Add capability-based routing
   - Implement A/B testing
   - Fine-tune model selection

5. **Documentation & Testing** (1 hour)
   - Write integration guide
   - Add usage examples
   - Create test suite

**Total Estimated Time:** 7 hours

---

**Built by Claude Code (Sonnet 4.5)**
**Ready for Claude E to implement** 🤖
