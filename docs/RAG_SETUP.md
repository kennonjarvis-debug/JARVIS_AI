# RAG (Retrieval-Augmented Generation) Setup Guide

## Overview

RAG combines the power of semantic search with large language models to provide accurate, context-aware responses grounded in your specific documents and knowledge base.

## Architecture

```
User Query
    ↓
[Embedding Generation]
    ↓
[Vector Search] ← Vector Database (Embeddings)
    ↓
[Retrieve Top-K Documents]
    ↓
[Context Injection]
    ↓
[LLM Generation] ← AI Model (GPT-4/Claude)
    ↓
Response with Sources
```

## Quick Start

### 1. Initialize Services

```typescript
import { OpenAIService } from './services/ai/openai.service';
import { VectorDBService } from './services/ai/vector-db.service';
import { AIRouterService } from './services/ai/ai-router.service';
import { RAGService } from './services/ai/rag.service';

// Initialize OpenAI for embeddings
const openai = new OpenAIService({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Vector DB
const vectorDB = new VectorDBService({
  provider: 'memory', // or 'pinecone' / 'weaviate'
  openaiApiKey: process.env.OPENAI_API_KEY,
  embeddingModel: 'text-embedding-3-small',
});

// Initialize AI Router
const aiRouter = new AIRouterService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize RAG
const rag = new RAGService({
  vectorDB,
  aiRouter,
  chunkSize: 1000,
  chunkOverlap: 200,
  topK: 5,
  similarityThreshold: 0.7,
});
```

### 2. Add Documents

```typescript
// Single document
await rag.addDocument({
  id: 'product-docs-v1',
  content: `
    Jarvis Product Documentation

    Features:
    - AI-powered business automation
    - Email management and auto-response
    - Social media scheduling
    - Customer service automation
    - Document analysis and summarization

    Getting Started:
    1. Create an account
    2. Configure your integrations
    3. Set up automation rules
  `,
  metadata: {
    type: 'documentation',
    version: '1.0',
    category: 'product',
  },
});

// Multiple documents
const documents = [
  { id: 'faq-1', content: 'Q: How do I reset my password? A: ...', metadata: { type: 'faq' } },
  { id: 'faq-2', content: 'Q: What payment methods do you accept? A: ...', metadata: { type: 'faq' } },
  // ... more documents
];

await rag.addDocuments(documents);
```

### 3. Query with RAG

```typescript
const response = await rag.query({
  query: 'How do I get started with Jarvis?',
  maxSources: 3,
  includeMetadata: true,
}, 'user123');

console.log('Answer:', response.answer);
console.log('Sources used:');
response.sources.forEach((source, i) => {
  console.log(`${i + 1}. ${source.text.substring(0, 100)}...`);
  console.log(`   Relevance: ${(source.score * 100).toFixed(1)}%`);
});
console.log('Cost:', response.cost);
```

## Document Chunking Strategies

### Why Chunk?
- Context window limits
- Better precision in retrieval
- Reduced noise in results
- Lower costs

### Chunking Parameters

```typescript
const rag = new RAGService({
  // ...
  chunkSize: 1000,      // Characters per chunk
  chunkOverlap: 200,    // Overlap between chunks
});
```

### Recommended Chunk Sizes

| Document Type | Chunk Size | Overlap | Reason |
|---------------|-----------|---------|---------|
| FAQs | 500 | 50 | Small, self-contained |
| Technical Docs | 1000 | 200 | Medium complexity |
| Legal Documents | 1500 | 300 | Need context |
| Chat Logs | 800 | 100 | Conversational |
| Code Files | 1200 | 200 | Logical blocks |

### Chunking Strategies

**1. Fixed-Size Chunking** (Current Implementation)
```typescript
// Splits text into chunks of fixed size with overlap
const chunks = chunkDocument(text, { size: 1000, overlap: 200 });
```

**2. Paragraph-Based Chunking**
```typescript
// Splits on paragraphs, combines until size limit
// Good for maintaining coherent thoughts
```

**3. Semantic Chunking** (Future Enhancement)
```typescript
// Uses AI to identify logical breakpoints
// Best quality, highest cost
```

## Embedding Models

### OpenAI Embeddings

| Model | Dimensions | Cost per 1M tokens | Use Case |
|-------|-----------|-------------------|----------|
| text-embedding-3-small | 1536 | $0.02 | General purpose, cost-effective |
| text-embedding-3-large | 3072 | $0.13 | Higher quality, more expensive |
| text-embedding-ada-002 | 1536 | $0.10 | Legacy, avoid |

### Recommendation
Use `text-embedding-3-small` for most cases. It's 10x cheaper than ada-002 with better performance.

```typescript
const vectorDB = new VectorDBService({
  embeddingModel: 'text-embedding-3-small',
  // ...
});
```

## Vector Database Options

### In-Memory (Development)
```typescript
const vectorDB = new VectorDBService({
  provider: 'memory',
  // ...
});
```
- **Pros**: No setup, fast, free
- **Cons**: Not persistent, limited scale
- **Use**: Development, testing

### Pinecone (Production)
```typescript
const vectorDB = new VectorDBService({
  provider: 'pinecone',
  apiKey: process.env.PINECONE_API_KEY,
  environment: 'us-east-1-aws',
  indexName: 'jarvis-vectors',
  // ...
});
```
- **Pros**: Fully managed, scalable, fast
- **Cons**: Costs money (~$70/month starter)
- **Use**: Production, high volume

### Weaviate (Self-Hosted)
```typescript
const vectorDB = new VectorDBService({
  provider: 'weaviate',
  apiKey: process.env.WEAVIATE_API_KEY,
  environment: 'http://localhost:8080',
  // ...
});
```
- **Pros**: Self-hosted, no per-query costs
- **Cons**: Infrastructure management
- **Use**: On-premise, cost-sensitive

## Search Configuration

### Similarity Threshold

```typescript
const results = await vectorDB.search(query, {
  threshold: 0.7,  // Only return results with >70% similarity
});
```

**Recommended Thresholds**:
- 0.9+: Very high precision, may miss some relevant results
- 0.7-0.9: Balanced (recommended)
- 0.5-0.7: High recall, may include less relevant results
- <0.5: Too noisy, not recommended

### Top-K Selection

```typescript
const results = await vectorDB.search(query, {
  topK: 5,  // Return top 5 results
});
```

**Recommended Top-K**:
- FAQ lookup: 3-5
- Document Q&A: 5-10
- Code search: 5-8
- General knowledge: 3-5

### Metadata Filtering

```typescript
// Only search in specific document types
const results = await vectorDB.searchWithFilter(
  query,
  { type: 'faq', category: 'billing' },
  { topK: 5 }
);
```

## Re-Ranking

Re-ranking improves result quality by using a more sophisticated model after initial retrieval.

```typescript
const response = await rag.query({
  query: 'How do I configure email automation?',
  maxSources: 10,    // Retrieve more initially
  rerank: true,      // Apply re-ranking
});
```

**When to Use Re-Ranking**:
- Critical queries (customer support)
- Complex questions
- When precision is more important than speed

**Trade-offs**:
- Better quality (+10-20% accuracy)
- Slower response (+200-500ms)
- Higher cost (+$0.001 per query)

## Hybrid Search

Combines vector search with keyword search for best of both worlds.

```typescript
const results = await rag.hybridSearch(
  'password reset',
  ['password', 'reset', 'account'],
  { topK: 5 }
);
```

**Use Cases**:
- When exact keyword matches are important
- Technical terms that must appear
- Product names, codes, IDs

## Performance Optimization

### 1. Batch Embedding Generation

```typescript
// Instead of embedding one at a time
for (const doc of documents) {
  await vectorDB.addDocuments([doc]); // BAD: Multiple API calls
}

// Batch them
await vectorDB.addDocuments(documents); // GOOD: One API call
```

### 2. Embedding Caching

```typescript
// Embeddings are automatically cached
// Repeated queries for same text use cache (free!)
const stats = vectorDB.getCacheStats();
console.log('Cache hit rate:', stats.hitRate);
```

### 3. Optimize Chunk Size

```typescript
// Too small: More chunks, more API calls, higher cost
chunkSize: 300  // BAD for most docs

// Too large: Less precise retrieval, wasted context
chunkSize: 5000 // BAD unless very long documents

// Just right: Balance precision and cost
chunkSize: 1000 // GOOD for most use cases
```

## Cost Analysis

### Example: 1000-Document Knowledge Base

**Setup Costs** (one-time):
- Documents: 1000 docs × 5000 chars average = 5M chars
- Chunks: 5M / 1000 = 5000 chunks
- Embedding cost: 5000 chunks × $0.00002 = **$0.10**

**Query Costs** (per query):
- Embedding query: $0.000002
- LLM generation (5 sources, 500 tokens): $0.01
- **Total per query: ~$0.01**

**Monthly Costs** (1000 queries/day):
- 30,000 queries × $0.01 = **$300/month**

### Cost Optimization Tips

1. **Use smaller embedding model**: text-embedding-3-small (10x cheaper)
2. **Reduce topK**: Fewer sources = less context = lower cost
3. **Cache responses**: Can reduce costs by 60-80%
4. **Use cheaper LLM**: Claude Haiku instead of GPT-4
5. **Batch queries**: Combine similar questions

## Monitoring & Debugging

### Track RAG Performance

```typescript
// Log each RAG query
logger.info('RAG query', {
  query: query.substring(0, 100),
  sourcesUsed: response.sources.length,
  avgRelevance: response.sources.reduce((a, b) => a + b.score, 0) / response.sources.length,
  cost: response.cost,
  responseTime: Date.now() - startTime,
});
```

### Key Metrics

1. **Average Relevance Score**: Should be >0.7
2. **Sources Used**: Typically 3-5
3. **Response Time**: p95 should be <5s
4. **Cost per Query**: Target <$0.02
5. **User Satisfaction**: Track thumbs up/down

### Common Issues & Solutions

**Problem**: No relevant results found
- **Solution**: Lower similarity threshold, increase topK, improve document quality

**Problem**: Too many irrelevant results
- **Solution**: Raise similarity threshold, improve chunking, add metadata filtering

**Problem**: High costs
- **Solution**: Enable caching, use smaller embedding model, reduce topK

**Problem**: Slow responses
- **Solution**: Use faster LLM (Claude Haiku), reduce topK, enable streaming

## Advanced Patterns

### Multi-Query RAG

```typescript
// Generate multiple query variations for better recall
const queries = [
  'How do I reset my password?',
  'password reset steps',
  'forgotten password recovery',
];

const allResults = await Promise.all(
  queries.map(q => vectorDB.search(q, { topK: 3 }))
);

// Deduplicate and re-rank
const uniqueResults = deduplicateResults(allResults.flat());
```

### Conversational RAG

```typescript
// Maintain conversation history
const conversationHistory = await memory.getShortTermMemory(conversationId);

// Use history to refine query
const refinedQuery = `${query} (Context: Previous conversation about ${conversationHistory})`;

const response = await rag.query({ query: refinedQuery });
```

### Document Summarization with RAG

```typescript
// Summarize a specific document
const summary = await rag.summarizeDocument('product-docs-v1', 'user123');
```

## Best Practices

1. **Document Quality**: Well-written, clear documents = better results
2. **Metadata**: Add rich metadata for filtering
3. **Regular Updates**: Keep documents current
4. **Monitor Performance**: Track relevance and user feedback
5. **Test Thoroughly**: Validate with real user queries
6. **Optimize Costs**: Use caching and appropriate models
7. **Handle Failures**: Always have fallback responses
8. **Cite Sources**: Build trust with source attribution
9. **Iterate**: Continuously improve based on feedback
10. **Security**: Encrypt documents, respect permissions

## Production Checklist

- [ ] Vector database selected and configured
- [ ] Documents added and chunked appropriately
- [ ] Embedding model selected (text-embedding-3-small recommended)
- [ ] Similarity threshold tuned (0.7-0.9)
- [ ] Response caching enabled
- [ ] Cost monitoring in place
- [ ] Error handling implemented
- [ ] Sources citation working
- [ ] Performance acceptable (<5s p95)
- [ ] User feedback collection enabled
- [ ] Security and access controls configured
- [ ] Backup and recovery plan
- [ ] Documentation updated

## Next Steps

1. Test with sample documents
2. Tune parameters based on results
3. Implement in production
4. Monitor and optimize
5. Collect user feedback
6. Iterate and improve

For more information, see:
- [AI_INTEGRATION.md](./AI_INTEGRATION.md) - Full AI integration guide
- [AI_MODELS.md](./AI_MODELS.md) - Model selection guide
