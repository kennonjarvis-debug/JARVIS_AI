# AI Model Selection Guide

## Model Comparison

### OpenAI Models

| Model | Context | Speed | Cost (per 1M tokens) | Best For |
|-------|---------|-------|----------------------|----------|
| GPT-4 Turbo | 128K | Medium | Input: $10, Output: $30 | Complex reasoning, analysis, coding |
| GPT-4 | 8K | Slow | Input: $30, Output: $60 | High-quality outputs, critical tasks |
| GPT-3.5 Turbo | 16K | Fast | Input: $0.50, Output: $1.50 | Simple tasks, high volume, cost-sensitive |
| GPT-4 Vision | 128K | Medium | Input: $10, Output: $30 | Image analysis, OCR, visual understanding |

### Anthropic Models

| Model | Context | Speed | Cost (per 1M tokens) | Best For |
|-------|---------|-------|----------------------|----------|
| Claude 3.5 Sonnet | 200K | Fast | Input: $3, Output: $15 | Balanced performance, long documents |
| Claude 3 Opus | 200K | Medium | Input: $15, Output: $75 | Complex tasks, high quality |
| Claude 3 Haiku | 200K | Very Fast | Input: $0.25, Output: $1.25 | Simple tasks, real-time responses |

## Task-Specific Recommendations

### Chat & General Conversation
- **Best Choice**: GPT-3.5 Turbo or Claude 3 Haiku
- **Why**: Fast, cost-effective, good quality for casual conversation
- **Cost**: ~$0.001 per conversation

### Code Generation & Review
- **Best Choice**: GPT-4 Turbo
- **Why**: Superior coding capabilities, understands multiple languages
- **Cost**: ~$0.02 per code review

### Creative Writing
- **Best Choice**: Claude 3.5 Sonnet or Claude 3 Opus
- **Why**: More creative and nuanced outputs
- **Cost**: ~$0.01-0.05 per article

### Document Analysis
- **Best Choice**: Claude 3.5 Sonnet
- **Why**: 200K context window, excellent at understanding long documents
- **Cost**: ~$0.03 per document

### Real-time Customer Service
- **Best Choice**: Claude 3 Haiku
- **Why**: Fastest response time, low cost, good quality
- **Cost**: ~$0.0005 per interaction

### Image Analysis
- **Only Choice**: GPT-4 Vision
- **Why**: Only model with vision capabilities
- **Cost**: ~$0.015 per image

### Business Email Drafting
- **Best Choice**: GPT-4 Turbo or Claude 3.5 Sonnet
- **Why**: Professional tone, good at formal writing
- **Cost**: ~$0.01 per email

### Social Media Posts
- **Best Choice**: GPT-3.5 Turbo or Claude 3 Haiku
- **Why**: Fast, creative enough, cost-effective for volume
- **Cost**: ~$0.001 per post

## Cost Optimization Strategies

### 1. Cascade Strategy
Start with cheap model, escalate if needed:

```typescript
async function cascadeQuery(query: string): Promise<string> {
  try {
    // Try cheap model first
    return await aiRouter.chat([{ role: 'user', content: query }], {
      provider: 'anthropic',
      model: 'claude-3-haiku',
    });
  } catch {
    // Fallback to mid-tier
    return await aiRouter.chat([{ role: 'user', content: query }], {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    });
  }
}
```

### 2. Prompt Caching (Claude Only)
Save 90% on repeated context:

```typescript
// First call: $3/M input tokens
// Cached calls: $0.30/M input tokens (10x cheaper!)
const response = await anthropic.createCachedMessage(
  messages,
  longSystemPrompt,
  options
);
```

### 3. Smart Context Management
Only include necessary context:

```typescript
// BAD: Include entire document (expensive)
const allMessages = getAllMessages(); // 100 messages

// GOOD: Include only relevant messages
const relevantMessages = await memory.retrieveRelevantMemories(
  conversationId,
  currentQuery,
  5  // Only top 5 relevant
);
```

### 4. Batch Processing
Process multiple items in one request:

```typescript
// Instead of 10 requests at $0.01 each = $0.10
// One batch request for $0.02

const batchPrompt = `
Analyze these 10 customer reviews:
1. "${review1}"
2. "${review2}"
...
10. "${review10}"
`;
```

## Performance Characteristics

### Response Times (Typical)

| Model | Streaming Start | Full Response (500 tokens) |
|-------|----------------|---------------------------|
| Claude 3 Haiku | <200ms | 2-3s |
| GPT-3.5 Turbo | <300ms | 3-4s |
| Claude 3.5 Sonnet | <300ms | 4-5s |
| GPT-4 Turbo | <500ms | 6-8s |
| Claude 3 Opus | <500ms | 8-12s |
| GPT-4 | <600ms | 10-15s |

### Quality Scores (Subjective, 1-10)

| Task | GPT-4 | GPT-4 Turbo | GPT-3.5 | Claude Opus | Claude Sonnet | Claude Haiku |
|------|-------|-------------|---------|-------------|---------------|--------------|
| Coding | 9 | 9 | 7 | 8 | 8 | 6 |
| Writing | 8 | 8 | 7 | 9 | 9 | 7 |
| Analysis | 9 | 9 | 7 | 9 | 8 | 6 |
| Math | 9 | 9 | 6 | 8 | 7 | 5 |
| Reasoning | 9 | 9 | 6 | 9 | 8 | 6 |
| Speed | 4 | 6 | 9 | 5 | 7 | 10 |
| Cost | 2 | 4 | 9 | 3 | 7 | 10 |

## Context Window Usage

### When to Use Large Context Windows

✅ **Good Use Cases**:
- Analyzing full documents (reports, contracts)
- Code repository analysis
- Long conversation history
- Multiple document comparison

❌ **Avoid**:
- Repeating same context across requests (use caching instead)
- Including irrelevant information
- Short, simple queries

### Context Window Limits

```typescript
const CONTEXT_LIMITS = {
  'gpt-4-turbo': 128000,      // ~96K words
  'gpt-4': 8192,               // ~6K words
  'gpt-3.5-turbo': 16385,      // ~12K words
  'claude-3-5-sonnet': 200000, // ~150K words
  'claude-3-opus': 200000,
  'claude-3-haiku': 200000,
};
```

## Streaming vs Non-Streaming

### Use Streaming When:
- Response > 100 tokens
- User-facing chat interface
- Long-form content generation
- Better UX needed

### Use Non-Streaming When:
- Programmatic API calls
- Response < 50 tokens
- Need complete response before processing
- Batch operations

## Error Handling & Retries

### Recommended Retry Strategy

```typescript
async function robustAICall(
  messages: Message[],
  maxRetries: number = 3
): Promise<string> {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try primary model
      return await aiRouter.chat(messages, {
        provider: 'auto',
        taskType: 'chat',
      });
    } catch (error) {
      lastError = error;

      if (error.status === 429) {
        // Rate limit: exponential backoff
        await sleep(Math.pow(2, i) * 1000);
      } else if (error.status === 503) {
        // Service unavailable: try different provider
        continue;
      } else {
        // Other errors: don't retry
        throw error;
      }
    }
  }

  throw lastError;
}
```

## Monthly Cost Estimates

### Small Business (100 users)
- 1000 customer service chats/day (Claude Haiku): $15/month
- 100 emails drafted/day (GPT-3.5): $10/month
- 50 document analyses/day (Claude Sonnet): $45/month
- **Total: ~$70/month**

### Medium Business (1000 users)
- 10,000 customer service chats/day: $150/month
- 1000 emails drafted/day: $100/month
- 500 document analyses/day: $450/month
- 100 code reviews/day: $60/month
- **Total: ~$760/month**

### Enterprise (10,000 users)
- 100,000 customer service chats/day: $1,500/month
- 10,000 emails drafted/day: $1,000/month
- 5,000 document analyses/day: $4,500/month
- 1,000 code reviews/day: $600/month
- **Total: ~$7,600/month**

## Decision Tree

```
Is it a simple task (FAQ, basic chat)?
├─ Yes → Claude 3 Haiku or GPT-3.5 Turbo
└─ No → Continue

Does it involve images/vision?
├─ Yes → GPT-4 Vision (only option)
└─ No → Continue

Does it require coding/technical work?
├─ Yes → GPT-4 Turbo
└─ No → Continue

Is it creative writing or long-form content?
├─ Yes → Claude 3.5 Sonnet or Opus
└─ No → Continue

Does it involve very long documents (>50K tokens)?
├─ Yes → Claude 3.5 Sonnet (200K context)
└─ No → Continue

Is speed critical?
├─ Yes → Claude 3 Haiku
└─ No → GPT-4 Turbo or Claude 3.5 Sonnet

Is quality more important than cost?
├─ Yes → GPT-4 or Claude 3 Opus
└─ No → GPT-3.5 Turbo or Claude 3 Haiku
```

## Monitoring & Optimization

### Key Metrics to Track

1. **Cost per User**: Total spend / Active users
2. **Cost per Endpoint**: Identify expensive features
3. **Average Tokens per Request**: Optimize prompt length
4. **Error Rate by Model**: Identify reliability issues
5. **Response Time p95**: Monitor performance
6. **Cache Hit Rate**: Optimize caching effectiveness

### Monthly Review Checklist

- [ ] Review top 10 users by cost
- [ ] Analyze most expensive endpoints
- [ ] Check cache hit rate (target: >60%)
- [ ] Review error rates by model
- [ ] Identify opportunities for model downgrade
- [ ] Test new prompt optimizations
- [ ] Update cost forecasts
- [ ] Implement new cost controls if needed

## Conclusion

The key to cost-effective AI integration is:
1. **Match model to task complexity**
2. **Use caching aggressively**
3. **Monitor and optimize continuously**
4. **Set appropriate limits**
5. **Leverage cheaper models when possible**

With proper model selection and optimization, you can provide powerful AI features while keeping costs under control.
