import { OpenAIService } from './openai.service.js';
import { logger } from '../logger.service.js';

export interface VectorDBConfig {
  provider: 'pinecone' | 'weaviate' | 'memory';
  apiKey?: string;
  environment?: string;
  indexName?: string;
  embeddingModel?: string;
  openaiApiKey: string;
}

export interface VectorDocument {
  id: string;
  text: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  topK?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

/**
 * In-memory vector database for development
 */
class MemoryVectorDB {
  private documents: Map<string, VectorDocument> = new Map();

  async upsert(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      this.documents.set(doc.id, doc);
    }
  }

  async search(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { topK = 5, threshold = 0.7 } = options;

    const results: SearchResult[] = [];

    for (const [id, doc] of this.documents.entries()) {
      if (!doc.embedding) continue;

      const score = this.cosineSimilarity(queryEmbedding, doc.embedding);

      if (score >= threshold) {
        results.push({
          id,
          text: doc.text,
          score,
          metadata: doc.metadata,
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
  }

  async clear(): Promise<void> {
    this.documents.clear();
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Vector Database Service
 * Supports Pinecone, Weaviate, or in-memory storage
 */
export class VectorDBService {
  private config: Required<VectorDBConfig>;
  private openai: OpenAIService;
  private db: MemoryVectorDB;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(config: VectorDBConfig) {
    this.config = {
      provider: config.provider,
      apiKey: config.apiKey || '',
      environment: config.environment || '',
      indexName: config.indexName || 'jarvis-vectors',
      embeddingModel: config.embeddingModel || 'text-embedding-3-small',
      openaiApiKey: config.openaiApiKey,
    };

    this.openai = new OpenAIService({ apiKey: this.config.openaiApiKey });

    // For now, use in-memory DB (can be extended to Pinecone/Weaviate)
    this.db = new MemoryVectorDB();

    logger.info('Vector DB service initialized', {
      provider: this.config.provider,
      model: this.config.embeddingModel,
    });
  }

  /**
   * Generate embeddings for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    const embeddings = await this.openai.createEmbedding(
      text,
      this.config.embeddingModel
    );

    const embedding = embeddings[0];
    this.embeddingCache.set(text, embedding);

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  private async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    // Check cache for all texts
    const uncached: string[] = [];
    const embeddings: number[][] = new Array(texts.length);

    for (let i = 0; i < texts.length; i++) {
      const cached = this.embeddingCache.get(texts[i]);
      if (cached) {
        embeddings[i] = cached;
      } else {
        uncached.push(texts[i]);
      }
    }

    // Generate embeddings for uncached texts
    if (uncached.length > 0) {
      const newEmbeddings = await this.openai.createEmbedding(
        uncached,
        this.config.embeddingModel
      );

      let uncachedIndex = 0;
      for (let i = 0; i < texts.length; i++) {
        if (!embeddings[i]) {
          embeddings[i] = newEmbeddings[uncachedIndex];
          this.embeddingCache.set(texts[i], newEmbeddings[uncachedIndex]);
          uncachedIndex++;
        }
      }
    }

    return embeddings;
  }

  /**
   * Add documents to vector database
   */
  async addDocuments(documents: VectorDocument[]): Promise<void> {
    logger.info('Adding documents to vector DB', { count: documents.length });

    // Generate embeddings for documents without them
    const textsToEmbed = documents
      .filter(doc => !doc.embedding)
      .map(doc => doc.text);

    if (textsToEmbed.length > 0) {
      const embeddings = await this.generateEmbeddingsBatch(textsToEmbed);

      let embeddingIndex = 0;
      for (const doc of documents) {
        if (!doc.embedding) {
          doc.embedding = embeddings[embeddingIndex++];
        }
      }
    }

    // Store in database
    await this.db.upsert(documents);

    logger.info('Documents added to vector DB', { count: documents.length });
  }

  /**
   * Search for similar documents
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    logger.info('Searching vector DB', { query: query.substring(0, 100) });

    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Search database
    const results = await this.db.search(queryEmbedding, options);

    logger.info('Vector search completed', {
      resultCount: results.length,
      topScore: results[0]?.score,
    });

    return results;
  }

  /**
   * Semantic search with metadata filtering
   */
  async searchWithFilter(
    query: string,
    filter: Record<string, any>,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const results = await this.search(query, {
      ...options,
      filter,
    });

    // Apply metadata filtering
    return results.filter(result => {
      if (!result.metadata) return false;

      for (const [key, value] of Object.entries(filter)) {
        if (result.metadata[key] !== value) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Find similar documents to a given document
   */
  async findSimilar(
    documentId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    // This would need to be implemented based on the vector DB provider
    // For now, return empty array
    return [];
  }

  /**
   * Delete documents by IDs
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    await this.db.delete(ids);
    logger.info('Documents deleted from vector DB', { count: ids.length });
  }

  /**
   * Clear all documents
   */
  async clearAll(): Promise<void> {
    await this.db.clear();
    this.embeddingCache.clear();
    logger.info('Vector DB cleared');
  }

  /**
   * Batch upsert with automatic chunking
   */
  async batchUpsert(documents: VectorDocument[], batchSize: number = 100): Promise<void> {
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.addDocuments(batch);
    }
  }

  /**
   * Get embedding cache stats
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.embeddingCache.size,
      hitRate: 0, // Would need to track hits/misses
    };
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }
}

export default VectorDBService;
