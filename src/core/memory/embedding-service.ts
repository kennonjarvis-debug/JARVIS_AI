import axios from 'axios';
import { logger } from '../../utils/logger.js';

export class EmbeddingService {
  private apiKey: string;
  private model = 'text-embedding-ada-002';
  private cache: Map<string, number[]> = new Map();
  private maxCacheSize = 1000;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required for EmbeddingService');
    }
    this.apiKey = apiKey;
    logger.info('[EmbeddingService] Initialized');
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Check cache
    const cacheKey = this.getCacheKey(text);
    if (this.cache.has(cacheKey)) {
      logger.debug('[EmbeddingService] Cache hit');
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: this.model
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!response.data || !response.data.data || response.data.data.length === 0) {
        throw new Error('Invalid response from OpenAI API');
      }

      const embedding = response.data.data[0].embedding;

      // Cache result
      this.cacheEmbedding(cacheKey, embedding);

      logger.debug(`[EmbeddingService] Generated embedding (${embedding.length} dimensions)`);
      return embedding;
    } catch (error: any) {
      if (error.response) {
        logger.error('[EmbeddingService] API error:', {
          status: error.response.status,
          message: error.response.data?.error?.message || 'Unknown error'
        });
        throw new Error(`OpenAI API error: ${error.response.data?.error?.message || 'Unknown error'}`);
      } else if (error.request) {
        logger.error('[EmbeddingService] Network error:', error.message);
        throw new Error('Network error while generating embedding');
      } else {
        logger.error('[EmbeddingService] Error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Filter out empty texts
    const validTexts = texts.filter(t => t && t.trim().length > 0);
    if (validTexts.length === 0) {
      return [];
    }

    // Check cache for all texts
    const results: (number[] | null)[] = validTexts.map(text => {
      const cacheKey = this.getCacheKey(text);
      return this.cache.get(cacheKey) || null;
    });

    // Find texts that need embeddings
    const textsToEmbed: string[] = [];
    const indicesToFetch: number[] = [];

    validTexts.forEach((text, idx) => {
      if (results[idx] === null) {
        textsToEmbed.push(text);
        indicesToFetch.push(idx);
      }
    });

    if (textsToEmbed.length === 0) {
      logger.debug('[EmbeddingService] All embeddings from cache');
      return results as number[][];
    }

    try {
      logger.debug(`[EmbeddingService] Generating ${textsToEmbed.length} embeddings`);

      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: textsToEmbed,
          model: this.model
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from OpenAI API');
      }

      const embeddings = response.data.data.map((item: any) => item.embedding);

      // Cache and update results
      embeddings.forEach((embedding: number[], idx: number) => {
        const originalIdx = indicesToFetch[idx];
        const text = validTexts[originalIdx];
        const cacheKey = this.getCacheKey(text);

        this.cacheEmbedding(cacheKey, embedding);
        results[originalIdx] = embedding;
      });

      logger.debug(`[EmbeddingService] Generated ${embeddings.length} embeddings`);
      return results as number[][];
    } catch (error: any) {
      if (error.response) {
        logger.error('[EmbeddingService] Batch API error:', {
          status: error.response.status,
          message: error.response.data?.error?.message || 'Unknown error'
        });
        throw new Error(`OpenAI API error: ${error.response.data?.error?.message || 'Unknown error'}`);
      } else {
        logger.error('[EmbeddingService] Batch error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Get cache key for text
   */
  private getCacheKey(text: string | undefined): string {
    if (!text) return '';
    // Simple hash for cache key
    return text.substring(0, Math.min(100, text.length));
  }

  /**
   * Cache an embedding
   */
  private cacheEmbedding(key: string, embedding: number[]): void {
    // Implement LRU cache behavior
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, embedding);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('[EmbeddingService] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0 // TODO: Track hits vs misses
    };
  }

  /**
   * Set cache size limit
   */
  setCacheSize(size: number): void {
    if (size < 0) {
      throw new Error('Cache size must be non-negative');
    }

    this.maxCacheSize = size;

    // Trim cache if needed
    while (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      } else {
        break;
      }
    }

    logger.debug(`[EmbeddingService] Cache size set to ${size}`);
  }
}
