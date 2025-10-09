import { createClient, RedisClientType } from 'redis';
import { logger } from '../../utils/logger.js';

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];  // 1536 dimensions for OpenAI embeddings
  metadata: {
    type: 'conversation' | 'task' | 'knowledge' | 'code' | 'decision';
    domain?: string;
    userId?: string;
    timestamp: string;
    tags?: string[];
  };
}

export interface SearchResult extends VectorDocument {
  score: number;
}

export class VectorStore {
  private client: RedisClientType | null = null;
  private indexName = 'jarvis:vectors';
  private embeddingDimension = 1536;

  async initialize(redisUrl: string = 'redis://localhost:6379'): Promise<void> {
    this.client = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      logger.error('[VectorStore] Redis error:', err);
    });

    await this.client.connect();
    await this.createVectorIndex();
    logger.info('[VectorStore] Initialized successfully');
  }

  private async createVectorIndex(): Promise<void> {
    if (!this.client) throw new Error('VectorStore not initialized');

    try {
      // Try to create FT.CREATE index with vector field
      // Note: This requires Redis Stack or RediSearch module
      await this.client.sendCommand([
        'FT.CREATE', this.indexName,
        'ON', 'JSON',
        'PREFIX', '1', 'vec:',
        'SCHEMA',
        '$.content', 'AS', 'content', 'TEXT',
        '$.metadata.type', 'AS', 'type', 'TAG',
        '$.metadata.domain', 'AS', 'domain', 'TAG',
        '$.metadata.userId', 'AS', 'userId', 'TAG',
        '$.metadata.timestamp', 'AS', 'timestamp', 'NUMERIC', 'SORTABLE',
        '$.embedding', 'AS', 'embedding', 'VECTOR', 'FLAT', '6',
          'TYPE', 'FLOAT32',
          'DIM', this.embeddingDimension.toString(),
          'DISTANCE_METRIC', 'COSINE'
      ]);
      logger.info('[VectorStore] Vector index created');
    } catch (error: any) {
      if (error.message?.includes('Index already exists')) {
        logger.info('[VectorStore] Using existing vector index');
      } else if (error.message?.includes('unknown command') || error.message?.includes('FT.CREATE')) {
        logger.warn('[VectorStore] RediSearch not available, using fallback mode');
        // Fallback: Use regular Redis without vector search
      } else {
        throw error;
      }
    }
  }

  async store(doc: VectorDocument): Promise<void> {
    if (!this.client) throw new Error('VectorStore not initialized');

    const key = `vec:${doc.id}`;

    try {
      await this.client.json.set(key, '$', {
        content: doc.content,
        embedding: doc.embedding,
        metadata: doc.metadata
      });
      logger.debug(`[VectorStore] Stored document: ${doc.id}`);
    } catch (error: any) {
      // Fallback to regular set if JSON not available
      if (error.message?.includes('unknown command')) {
        await this.client.set(key, JSON.stringify(doc));
        logger.debug(`[VectorStore] Stored document (fallback): ${doc.id}`);
      } else {
        throw error;
      }
    }
  }

  async search(
    queryEmbedding: number[],
    options?: {
      limit?: number;
      filter?: { type?: string; domain?: string; userId?: string };
    }
  ): Promise<SearchResult[]> {
    if (!this.client) throw new Error('VectorStore not initialized');

    const limit = options?.limit || 10;

    try {
      // Build KNN query
      let query = `*=>[KNN ${limit} @embedding $vec AS score]`;

      // Add filters
      const filters: string[] = [];
      if (options?.filter?.type) {
        filters.push(`@type:{${options.filter.type}}`);
      }
      if (options?.filter?.domain) {
        filters.push(`@domain:{${options.filter.domain}}`);
      }
      if (options?.filter?.userId) {
        filters.push(`@userId:{${options.filter.userId}}`);
      }

      if (filters.length > 0) {
        query = `(${filters.join(' ')}) ${query}`;
      }

      // Convert embedding to bytes
      const embeddingBytes = Buffer.from(new Float32Array(queryEmbedding).buffer);

      const results = await this.client.sendCommand([
        'FT.SEARCH', this.indexName,
        query,
        'PARAMS', '2', 'vec', embeddingBytes,
        'SORTBY', 'score', 'ASC',
        'RETURN', '5', 'content', 'embedding', 'metadata', 'score', '$',
        'LIMIT', '0', limit.toString(),
        'DIALECT', '2'
      ]) as any;

      // Parse results
      return this.parseSearchResults(results);
    } catch (error: any) {
      logger.error('[VectorStore] Search failed:', error.message);

      // Fallback: Manual cosine similarity search
      return this.fallbackSearch(queryEmbedding, options);
    }
  }

  private parseSearchResults(results: any): SearchResult[] {
    if (!results || results.length < 2) return [];

    const numResults = results[0];
    const docs: SearchResult[] = [];

    // Parse RediSearch response format
    for (let i = 1; i < results.length; i += 2) {
      try {
        const key = results[i];
        const fields = results[i + 1];

        // Extract fields
        let content = '', embedding = [], metadata = {}, score = 1.0;

        for (let j = 0; j < fields.length; j += 2) {
          const fieldName = fields[j];
          const fieldValue = fields[j + 1];

          if (fieldName === 'content') content = fieldValue;
          else if (fieldName === 'embedding') embedding = JSON.parse(fieldValue);
          else if (fieldName === 'metadata') metadata = JSON.parse(fieldValue);
          else if (fieldName === 'score') score = parseFloat(fieldValue);
        }

        docs.push({
          id: key.replace('vec:', ''),
          content,
          embedding,
          metadata: metadata as any,
          score
        });
      } catch (error) {
        logger.error('[VectorStore] Failed to parse result:', error);
      }
    }

    return docs;
  }

  private async fallbackSearch(
    queryEmbedding: number[],
    options?: {
      limit?: number;
      filter?: { type?: string; domain?: string; userId?: string };
    }
  ): Promise<SearchResult[]> {
    logger.info('[VectorStore] Using fallback search');

    if (!this.client) throw new Error('VectorStore not initialized');

    // Get all vector keys
    const keys = await this.client.keys('vec:*');
    const results: SearchResult[] = [];

    for (const key of keys) {
      try {
        const data = await this.client.get(key);
        if (!data) continue;

        const doc: VectorDocument = JSON.parse(data);

        // Apply filters
        if (options?.filter?.type && doc.metadata.type !== options.filter.type) continue;
        if (options?.filter?.domain && doc.metadata.domain !== options.filter.domain) continue;
        if (options?.filter?.userId && doc.metadata.userId !== options.filter.userId) continue;

        // Calculate cosine similarity
        const score = this.cosineSimilarity(queryEmbedding, doc.embedding);

        results.push({ ...doc, score });
      } catch (error) {
        logger.error(`[VectorStore] Failed to process key ${key}:`, error);
      }
    }

    // Sort by score (descending) and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options?.limit || 10);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  async get(id: string): Promise<VectorDocument | null> {
    if (!this.client) throw new Error('VectorStore not initialized');

    try {
      const key = `vec:${id}`;
      const data = await this.client.json.get(key);

      if (!data) return null;

      return data as any as VectorDocument;
    } catch (error: any) {
      // Fallback
      const key = `vec:${id}`;
      const data = await this.client.get(key);

      if (!data) return null;

      return JSON.parse(data);
    }
  }

  async delete(id: string): Promise<void> {
    if (!this.client) throw new Error('VectorStore not initialized');
    await this.client.del(`vec:${id}`);
    logger.debug(`[VectorStore] Deleted document: ${id}`);
  }

  async getStats(): Promise<{
    totalDocuments: number;
    indexSize: number;
    dimensions: number;
  }> {
    if (!this.client) throw new Error('VectorStore not initialized');

    try {
      const info = await this.client.sendCommand([
        'FT.INFO', this.indexName
      ]) as any;

      // Parse info array
      let numDocs = 0;
      let indexSize = 0;

      for (let i = 0; i < info.length; i += 2) {
        if (info[i] === 'num_docs') numDocs = parseInt(info[i + 1]);
        if (info[i] === 'inverted_sz_mb') indexSize = parseFloat(info[i + 1]);
      }

      return {
        totalDocuments: numDocs,
        indexSize,
        dimensions: this.embeddingDimension
      };
    } catch (error) {
      // Fallback: count keys
      const keys = await this.client.keys('vec:*');
      return {
        totalDocuments: keys.length,
        indexSize: 0,
        dimensions: this.embeddingDimension
      };
    }
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      logger.info('[VectorStore] Shutdown complete');
    }
  }
}

export const vectorStore = new VectorStore();
