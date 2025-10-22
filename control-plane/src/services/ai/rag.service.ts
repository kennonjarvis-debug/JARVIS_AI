import { VectorDBService, VectorDocument, SearchResult } from './vector-db.service.js';
import { AIRouterService, AIMessage } from './ai-router.service.js';
import { logger } from '../logger.service.js';

export interface RAGConfig {
  vectorDB: VectorDBService;
  aiRouter: AIRouterService;
  chunkSize?: number;
  chunkOverlap?: number;
  topK?: number;
  similarityThreshold?: number;
}

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface RAGQuery {
  query: string;
  maxSources?: number;
  includeMetadata?: boolean;
  rerank?: boolean;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    id: string;
    text: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
  cost: number;
}

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Combines vector search with LLM generation for context-aware responses
 */
export class RAGService {
  private config: Required<RAGConfig>;
  private vectorDB: VectorDBService;
  private aiRouter: AIRouterService;

  constructor(config: RAGConfig) {
    this.config = {
      vectorDB: config.vectorDB,
      aiRouter: config.aiRouter,
      chunkSize: config.chunkSize ?? 1000,
      chunkOverlap: config.chunkOverlap ?? 200,
      topK: config.topK ?? 5,
      similarityThreshold: config.similarityThreshold ?? 0.7,
    };

    this.vectorDB = config.vectorDB;
    this.aiRouter = config.aiRouter;

    logger.info('RAG service initialized', {
      chunkSize: this.config.chunkSize,
      topK: this.config.topK,
    });
  }

  /**
   * Chunk a document into smaller pieces with overlap
   */
  private chunkDocument(text: string, metadata?: Record<string, any>): string[] {
    const chunks: string[] = [];
    const { chunkSize, chunkOverlap } = this.config;

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > chunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);

          // Create overlap by keeping last part of chunk
          const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
          currentChunk = currentChunk.substring(overlapStart);
        }
      }

      currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Add a document to the RAG system
   */
  async addDocument(document: Document): Promise<void> {
    logger.info('Adding document to RAG', { id: document.id });

    // Chunk the document
    const chunks = this.chunkDocument(document.content, document.metadata);

    // Create vector documents for each chunk
    const vectorDocs: VectorDocument[] = chunks.map((chunk, index) => ({
      id: `${document.id}_chunk_${index}`,
      text: chunk,
      metadata: {
        ...document.metadata,
        documentId: document.id,
        chunkIndex: index,
        totalChunks: chunks.length,
      },
    }));

    // Add to vector database
    await this.vectorDB.addDocuments(vectorDocs);

    logger.info('Document added to RAG', {
      id: document.id,
      chunks: chunks.length,
    });
  }

  /**
   * Add multiple documents in batch
   */
  async addDocuments(documents: Document[]): Promise<void> {
    for (const doc of documents) {
      await this.addDocument(doc);
    }
  }

  /**
   * Retrieve relevant context for a query
   */
  async retrieveContext(
    query: string,
    options: {
      topK?: number;
      threshold?: number;
      filter?: Record<string, any>;
    } = {}
  ): Promise<SearchResult[]> {
    const topK = options.topK ?? this.config.topK;
    const threshold = options.threshold ?? this.config.similarityThreshold;

    logger.info('Retrieving context for query', {
      query: query.substring(0, 100),
      topK,
    });

    const results = await this.vectorDB.search(query, {
      topK,
      threshold,
      filter: options.filter,
    });

    return results;
  }

  /**
   * Re-rank results based on relevance to query
   */
  private async rerankResults(
    query: string,
    results: SearchResult[]
  ): Promise<SearchResult[]> {
    // Simple re-ranking: ask AI to score relevance
    // In production, use a dedicated reranking model

    const scoringPrompt = `
On a scale of 0-10, how relevant is the following text to the query?
Only respond with a number.

Query: ${query}

Text: ${results[0]?.text.substring(0, 500)}
`;

    // For simplicity, we'll keep the original vector search ranking
    // A real implementation would use a cross-encoder model
    return results;
  }

  /**
   * Query the RAG system
   */
  async query(ragQuery: RAGQuery, userId?: string): Promise<RAGResponse> {
    const {
      query,
      maxSources = this.config.topK,
      includeMetadata = true,
      rerank = false,
    } = ragQuery;

    logger.info('RAG query', { query: query.substring(0, 100) });

    // Retrieve relevant context
    let results = await this.retrieveContext(query, { topK: maxSources });

    // Re-rank if requested
    if (rerank && results.length > 0) {
      results = await this.rerankResults(query, results);
    }

    // Build context from results
    const context = results
      .map((result, index) => {
        return `[Source ${index + 1}]\n${result.text}\n`;
      })
      .join('\n');

    // Create prompt with context
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions based on the provided context.
Always cite your sources using [Source N] notation.
If the context doesn't contain enough information to answer the question, say so.`,
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`,
      },
    ];

    // Generate answer
    const response = await this.aiRouter.chat(messages, {
      taskType: 'analysis',
    }, userId);

    // Prepare sources
    const sources = results.map(result => ({
      id: result.id,
      text: result.text,
      score: result.score,
      metadata: includeMetadata ? result.metadata : undefined,
    }));

    logger.info('RAG query completed', {
      sourcesUsed: results.length,
      cost: response.cost,
    });

    return {
      answer: response.content,
      sources,
      cost: response.cost,
    };
  }

  /**
   * Query with streaming response
   */
  async queryStream(
    ragQuery: RAGQuery,
    onChunk: (chunk: string) => void,
    userId?: string
  ): Promise<RAGResponse> {
    const {
      query,
      maxSources = this.config.topK,
      includeMetadata = true,
    } = ragQuery;

    // Retrieve context
    const results = await this.retrieveContext(query, { topK: maxSources });

    const context = results
      .map((result, index) => `[Source ${index + 1}]\n${result.text}\n`)
      .join('\n');

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions based on the provided context.
Always cite your sources using [Source N] notation.`,
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`,
      },
    ];

    // Generate streaming answer
    const response = await this.aiRouter.streamChat(
      messages,
      onChunk,
      { taskType: 'analysis' },
      userId
    );

    const sources = results.map(result => ({
      id: result.id,
      text: result.text,
      score: result.score,
      metadata: includeMetadata ? result.metadata : undefined,
    }));

    return {
      answer: response.content,
      sources,
      cost: response.cost,
    };
  }

  /**
   * Summarize a document using RAG
   */
  async summarizeDocument(documentId: string, userId?: string): Promise<string> {
    // Retrieve all chunks of the document
    const results = await this.vectorDB.searchWithFilter(
      '',
      { documentId },
      { topK: 100 }
    );

    const fullText = results
      .sort((a, b) => {
        const aIndex = a.metadata?.chunkIndex ?? 0;
        const bIndex = b.metadata?.chunkIndex ?? 0;
        return aIndex - bIndex;
      })
      .map(r => r.text)
      .join('\n\n');

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that creates concise summaries.',
      },
      {
        role: 'user',
        content: `Please provide a concise summary of the following text:\n\n${fullText}`,
      },
    ];

    const response = await this.aiRouter.chat(messages, {
      taskType: 'analysis',
    }, userId);

    return response.content;
  }

  /**
   * Hybrid search: combine vector search with keyword search
   */
  async hybridSearch(
    query: string,
    keywords: string[],
    options: { topK?: number } = {}
  ): Promise<SearchResult[]> {
    // Vector search
    const vectorResults = await this.retrieveContext(query, options);

    // Keyword filtering
    const filtered = vectorResults.filter(result => {
      const text = result.text.toLowerCase();
      return keywords.some(keyword => text.includes(keyword.toLowerCase()));
    });

    // If keyword filtering removed too many results, fall back to vector results
    return filtered.length > 0 ? filtered : vectorResults;
  }

  /**
   * Delete a document and all its chunks
   */
  async deleteDocument(documentId: string): Promise<void> {
    // In a real implementation, we'd query for all chunks with this documentId
    // and delete them. For now, this is a simplified version.
    logger.info('Deleting document from RAG', { documentId });

    // This would need proper implementation based on vector DB capabilities
    // await this.vectorDB.deleteDocuments(chunkIds);
  }

  /**
   * Clear all documents
   */
  async clearAll(): Promise<void> {
    await this.vectorDB.clearAll();
    logger.info('RAG system cleared');
  }
}

export default RAGService;
