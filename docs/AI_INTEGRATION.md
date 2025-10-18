# Jarvis AI Integration Guide

## Overview

The Jarvis AI integration system provides comprehensive artificial intelligence capabilities including:

- **Multi-Provider Support**: OpenAI (GPT-4, GPT-3.5) and Anthropic (Claude 3.5)
- **Intelligent Routing**: Automatic model selection based on task requirements
- **Vector Search**: Semantic search with embeddings
- **RAG**: Retrieval-Augmented Generation for context-aware responses
- **Multi-modal AI**: Vision, audio transcription, image generation, text-to-speech
- **AI Agents**: Autonomous task execution
- **Memory System**: Conversation context and personalization
- **Response Caching**: Cost optimization through intelligent caching

## Quick Start

### 1. Install Dependencies

```bash
npm install openai @anthropic-ai/sdk
```

### 2. Configure API Keys

Set your API keys in environment variables:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Initialize Services

```typescript
import { OpenAIService } from './services/ai/openai.service';
import { AnthropicService } from './services/ai/anthropic.service';
import { AIRouterService } from './services/ai/ai-router.service';

// Initialize providers
const openai = new OpenAIService({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new AnthropicService({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize router
const aiRouter = new AIRouterService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  defaultProvider: 'auto',
  fallbackEnabled: true,
  costOptimization: true,
});
```

### 4. Make Your First AI Request

```typescript
// Simple chat
const response = await aiRouter.chat([
  { role: 'user', content: 'Hello, how can you help me?' }
], {
  taskType: 'chat',
});

console.log(response.content);
console.log(`Cost: $${response.cost}`);
```

## Core Services

### OpenAI Service

Features:
- GPT-4 and GPT-4 Turbo support
- GPT-3.5 Turbo for cost-effective tasks
- Function calling
- Streaming responses
- Token counting and cost tracking
- Context window management (up to 128k tokens)
- Rate limiting with automatic retry

Example:
```typescript
const openai = new OpenAIService({ apiKey: process.env.OPENAI_API_KEY });

const result = await openai.createChatCompletion([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Explain quantum computing.' }
], {
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 500,
}, 'user123');

console.log(result.content);
console.log(`Tokens used: ${result.usage.totalTokens}`);
console.log(`Cost: $${result.usage.cost}`);
```

### Anthropic Claude Service

Features:
- Claude 3.5 Sonnet support
- Extended context window (200k tokens)
- Tool use capability
- Prompt caching for cost optimization
- Streaming responses

Example:
```typescript
const anthropic = new AnthropicService({ apiKey: process.env.ANTHROPIC_API_KEY });

const result = await anthropic.createMessage([
  { role: 'user', content: 'Write a technical blog post about microservices.' }
], {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 4096,
  temperature: 0.7,
}, 'user123');

console.log(result.content);
console.log(`Cost: $${result.usage.cost}`);
```

### AI Router

Intelligent routing based on:
- Task type (chat, coding, creative, analysis)
- Cost constraints
- Speed requirements
- Provider availability

Example:
```typescript
// Automatic provider selection
const response = await aiRouter.chat([
  { role: 'user', content: 'Review this Python code: ...' }
], {
  taskType: 'coding',  // Will prefer GPT-4
  maxCost: 0.05,       // Budget constraint
});

// Fallback on failure
const response2 = await aiRouter.chat([
  { role: 'user', content: 'Generate a creative story' }
], {
  taskType: 'creative',  // Will prefer Claude
  provider: 'auto',      // Auto-select with fallback
});
```

### Vector Database Service

Features:
- In-memory vector storage (extensible to Pinecone/Weaviate)
- OpenAI text-embedding-3 for embeddings
- Semantic search
- Metadata filtering
- Batch operations
- Embedding caching

Example:
```typescript
import { VectorDBService } from './services/ai/vector-db.service';
import { OpenAIService } from './services/ai/openai.service';

const vectorDB = new VectorDBService({
  provider: 'memory',
  openaiApiKey: process.env.OPENAI_API_KEY,
  embeddingModel: 'text-embedding-3-small',
});

// Add documents
await vectorDB.addDocuments([
  {
    id: 'doc1',
    text: 'Jarvis is an AI-powered business automation platform.',
    metadata: { category: 'product' },
  },
  {
    id: 'doc2',
    text: 'The platform supports email, social media, and customer service automation.',
    metadata: { category: 'features' },
  },
]);

// Search
const results = await vectorDB.search('What is Jarvis?', {
  topK: 3,
  threshold: 0.7,
});

console.log(results);
```

### RAG (Retrieval-Augmented Generation)

Features:
- Document chunking with overlap
- Semantic search for relevant context
- Context injection into prompts
- Source attribution
- Re-ranking support
- Streaming responses

Example:
```typescript
import { RAGService } from './services/ai/rag.service';

const rag = new RAGService({
  vectorDB,
  aiRouter,
  chunkSize: 1000,
  topK: 5,
});

// Add documents
await rag.addDocument({
  id: 'user-manual',
  content: 'Long document content here...',
  metadata: { type: 'manual', version: '1.0' },
});

// Query with RAG
const response = await rag.query({
  query: 'How do I reset my password?',
  maxSources: 3,
  includeMetadata: true,
}, 'user123');

console.log('Answer:', response.answer);
console.log('Sources:', response.sources);
console.log('Cost:', response.cost);
```

### Memory Service

Features:
- Short-term memory (session-based)
- Long-term memory (persistent in vector DB)
- Conversation summarization
- Personalization based on history
- GDPR-compliant data export/deletion

Example:
```typescript
import { MemoryService } from './services/ai/memory.service';

const memory = new MemoryService({
  vectorDB,
  aiRouter,
  shortTermLimit: 20,
  enableLongTerm: true,
});

// Add messages
await memory.addMessage('conv123', {
  role: 'user',
  content: 'What is machine learning?',
});

await memory.addMessage('conv123', {
  role: 'assistant',
  content: 'Machine learning is...',
});

// Build context with memory
const messages = await memory.buildContextWithMemory(
  'conv123',
  'Tell me more about neural networks'
);

// The messages now include relevant past context
const response = await aiRouter.chat(messages);
```

### Multi-modal Service

Features:
- GPT-4 Vision for image analysis
- Whisper for audio transcription
- DALL-E for image generation
- Text-to-speech
- Document parsing (PDFs, images with OCR)

Example:
```typescript
import { MultimodalService } from './services/ai/multimodal.service';

const multimodal = new MultimodalService({
  openaiApiKey: process.env.OPENAI_API_KEY,
});

// Analyze image
const vision = await multimodal.analyzeImage(
  'https://example.com/image.jpg',
  'What is in this image?'
);

// Transcribe audio
const transcription = await multimodal.transcribeAudio(
  './audio.mp3',
  'en'
);

// Generate image
const images = await multimodal.generateImage(
  'A futuristic cityscape at sunset',
  '1024x1024',
  'hd'
);

// Text to speech
const audio = await multimodal.textToSpeech(
  'Hello, welcome to Jarvis!',
  'alloy'
);
```

### AI Agent Framework

Features:
- ReAct (Reasoning + Acting) pattern
- Tool use and function calling
- Multi-step reasoning
- Self-correction
- Pre-configured agents: email, social media, customer service

Example:
```typescript
import { AgentService } from './services/ai/agent.service';

const agentService = new AgentService(aiRouter, memory);

// Create email agent
agentService.createEmailAgent();

// Execute task
const execution = await agentService.executeTask(
  'email-assistant',
  {
    id: 'task1',
    goal: 'Find and respond to all urgent customer emails from today',
    constraints: ['Maintain professional tone', 'Keep responses under 200 words'],
  },
  'user123'
);

console.log('Result:', execution.result);
console.log('Steps:', execution.steps.length);
console.log('Cost:', execution.cost);
```

## API Endpoints

### Chat Completions

```
POST /api/ai/chat
```

Request:
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "options": {
    "taskType": "chat",
    "temperature": 0.7
  },
  "conversationId": "conv123",
  "userId": "user123"
}
```

Response:
```json
{
  "content": "Hello! How can I help you today?",
  "provider": "openai",
  "model": "gpt-4-turbo",
  "cost": 0.0012,
  "tokens": 45
}
```

### Streaming Chat

```
POST /api/ai/chat/stream
```

Returns Server-Sent Events (SSE) stream.

### Semantic Search

```
POST /api/ai/search
```

Request:
```json
{
  "query": "How do I configure authentication?",
  "maxSources": 5,
  "userId": "user123"
}
```

### Image Analysis

```
POST /api/ai/analyze/image
```

Request:
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "prompt": "Describe this image in detail"
}
```

### Agent Execution

```
POST /api/ai/agents/:agentName/execute
```

Request:
```json
{
  "task": {
    "goal": "Draft a response to the customer inquiry",
    "context": { "customerId": "123" }
  },
  "userId": "user123"
}
```

## Cost Optimization

### 1. Use Model Caching

```typescript
import { ModelCacheService } from './services/ai/model-cache.service';

const cache = new ModelCacheService({
  ttl: 3600,              // 1 hour
  maxSize: 1000,
  enableSemanticCache: true,
  similarityThreshold: 0.95,
});

// Check cache before API call
const cached = cache.get(prompt, model);
if (cached) {
  return cached;
}

// Make API call
const response = await aiRouter.chat(messages);

// Store in cache
cache.set(prompt, response.content, model, response.cost);
```

### 2. Use Cheaper Models for Simple Tasks

```typescript
// Use GPT-3.5 for simple tasks
const response = await aiRouter.chat(messages, {
  taskType: 'simple',  // Will use gpt-3.5-turbo
});

// Use Claude Haiku for fast, cheap responses
const response2 = await anthropic.createMessage(messages, {
  model: 'claude-3-haiku-20240307',
});
```

### 3. Enable Prompt Caching (Claude)

```typescript
const response = await anthropic.createCachedMessage(
  messages,
  longSystemPrompt,  // This will be cached
  options,
  userId
);

console.log('Cache hit:', response.cacheHit);
```

### 4. Track and Monitor Costs

```typescript
import { AIAnalyticsService } from './services/ai/ai-analytics.service';

const analytics = new AIAnalyticsService();

// Track every request
analytics.trackRequest({
  userId: 'user123',
  model: 'gpt-4-turbo',
  provider: 'openai',
  endpoint: '/api/ai/chat',
  tokens: 450,
  cost: 0.0135,
  responseTime: 1200,
  success: true,
  timestamp: new Date(),
});

// Get cost breakdown
const costs = analytics.getTotalCost();
console.log('Total:', costs.total);
console.log('By provider:', costs.byProvider);
console.log('By user:', costs.byUser);

// Monitor top users
const topUsers = analytics.getTopUsers(10);
```

## Security & Privacy

### 1. Encrypt AI Data

All AI-related data (prompts, responses, user data) should be encrypted using AWS KMS (configured in Phase 1).

### 2. GDPR Compliance

```typescript
// Export user data
const data = await memory.exportUserMemory('user123');

// Delete user data
await memory.clearUserMemory('user123');
```

### 3. Rate Limiting

Use existing rate limiting from Phase 1 for AI endpoints to prevent abuse.

### 4. Spending Limits

```typescript
// Check user spending before request
const usage = openai.getUserUsage('user123');
if (usage && usage.cost > USER_MONTHLY_LIMIT) {
  throw new Error('Monthly AI spending limit exceeded');
}
```

## Best Practices

1. **Always track costs** - Use analytics service to monitor spending
2. **Use appropriate models** - Don't use GPT-4 for simple tasks
3. **Implement caching** - Reduce costs by 50-80% with intelligent caching
4. **Set user limits** - Prevent unexpected bills with per-user spending limits
5. **Monitor performance** - Track response times and error rates
6. **Handle errors gracefully** - Implement fallbacks and retries
7. **Optimize prompts** - Use prompt manager for versioning and testing
8. **Enable streaming** - Better UX for long responses
9. **Use context wisely** - Don't exceed context windows unnecessarily
10. **Test thoroughly** - Validate AI outputs before production use

## Troubleshooting

### High Costs
- Check analytics for expensive users/endpoints
- Enable caching
- Use cheaper models for appropriate tasks
- Implement stricter rate limits

### Slow Responses
- Use streaming for better perceived performance
- Check network latency
- Consider using faster models (GPT-3.5, Claude Haiku)
- Monitor API status

### Low Quality Outputs
- Improve prompts using prompt manager
- Use appropriate models for tasks
- Add more context/examples
- Adjust temperature and other parameters

### Rate Limiting Issues
- Implement exponential backoff
- Use multiple API keys
- Balance load across providers
- Queue requests during peak times

## Next Steps

1. Review [AI_MODELS.md](./AI_MODELS.md) for model selection guide
2. Check [RAG_SETUP.md](./RAG_SETUP.md) for RAG implementation details
3. Explore business automation templates in `/src/templates/ai/`
4. Test UI components in `/web/jarvis-web/components/ai/`
5. Monitor costs and performance with analytics service
