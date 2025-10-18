import crypto from 'crypto';
import { logger } from '../logger.service.js';

export interface CacheEntry {
  prompt: string;
  response: string;
  model: string;
  cost: number;
  timestamp: Date;
  hits: number;
  embedding?: number[];
}

export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache entries
  similarityThreshold?: number; // For semantic caching
  enableSemanticCache?: boolean;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalCostSaved: number;
}

/**
 * AI Model Response Cache Service
 * Supports exact match and semantic similarity caching
 */
export class ModelCacheService {
  private config: Required<CacheConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private semanticCache: CacheEntry[] = [];
  private stats = {
    hits: 0,
    misses: 0,
    totalCostSaved: 0,
  };

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl ?? 3600, // 1 hour default
      maxSize: config.maxSize ?? 1000,
      similarityThreshold: config.similarityThreshold ?? 0.95,
      enableSemanticCache: config.enableSemanticCache ?? false,
    };

    logger.info('Model cache service initialized', {
      ttl: this.config.ttl,
      maxSize: this.config.maxSize,
    });

    // Periodic cleanup
    setInterval(() => this.cleanup(), 300000); // Every 5 minutes
  }

  /**
   * Generate hash for exact matching
   */
  private hashPrompt(prompt: string, model: string): string {
    return crypto
      .createHash('sha256')
      .update(`${model}:${prompt}`)
      .digest('hex');
  }

  /**
   * Calculate cosine similarity between embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const ageSeconds = (Date.now() - entry.timestamp.getTime()) / 1000;
    return ageSeconds > this.config.ttl;
  }

  /**
   * Get cached response (exact match)
   */
  get(prompt: string, model: string): string | null {
    const hash = this.hashPrompt(prompt, model);
    const entry = this.cache.get(hash);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(hash);
      this.stats.misses++;
      return null;
    }

    // Cache hit
    entry.hits++;
    this.stats.hits++;
    this.stats.totalCostSaved += entry.cost;

    logger.debug('Cache hit', { model, hits: entry.hits });
    return entry.response;
  }

  /**
   * Get cached response using semantic similarity
   */
  getSemanticMatch(
    prompt: string,
    embedding: number[],
    model: string
  ): string | null {
    if (!this.config.enableSemanticCache) {
      return null;
    }

    for (const entry of this.semanticCache) {
      if (entry.model !== model) continue;
      if (this.isExpired(entry)) continue;
      if (!entry.embedding) continue;

      const similarity = this.cosineSimilarity(embedding, entry.embedding);

      if (similarity >= this.config.similarityThreshold) {
        entry.hits++;
        this.stats.hits++;
        this.stats.totalCostSaved += entry.cost;

        logger.debug('Semantic cache hit', {
          model,
          similarity,
          hits: entry.hits,
        });

        return entry.response;
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store response in cache
   */
  set(
    prompt: string,
    response: string,
    model: string,
    cost: number,
    embedding?: number[]
  ): void {
    const hash = this.hashPrompt(prompt, model);

    const entry: CacheEntry = {
      prompt,
      response,
      model,
      cost,
      timestamp: new Date(),
      hits: 0,
      embedding,
    };

    // Exact match cache
    this.cache.set(hash, entry);

    // Semantic cache
    if (this.config.enableSemanticCache && embedding) {
      this.semanticCache.push(entry);

      // Limit semantic cache size
      if (this.semanticCache.length > this.config.maxSize) {
        this.semanticCache.shift();
      }
    }

    // Enforce max size
    if (this.cache.size > this.config.maxSize) {
      this.evictLRU();
    }

    logger.debug('Response cached', { model, cost });
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    // Sort by timestamp and remove oldest
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime()
    );

    const toRemove = entries.slice(0, Math.floor(this.config.maxSize * 0.1));
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }

    logger.debug('Evicted LRU entries', { count: toRemove.length });
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    let removed = 0;

    // Clean exact match cache
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }

    // Clean semantic cache
    this.semanticCache = this.semanticCache.filter(
      entry => !this.isExpired(entry)
    );

    if (removed > 0) {
      logger.info('Cache cleanup completed', { removed });
    }
  }

  /**
   * Invalidate cache by pattern
   */
  invalidate(pattern: RegExp): number {
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (pattern.test(entry.prompt)) {
        this.cache.delete(key);
        removed++;
      }
    }

    this.semanticCache = this.semanticCache.filter(
      entry => !pattern.test(entry.prompt)
    );

    logger.info('Cache invalidated', { pattern: pattern.source, removed });
    return removed;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.semanticCache = [];
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalCostSaved: this.stats.totalCostSaved,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalCostSaved: 0,
    };
  }

  /**
   * Get most popular cached entries
   */
  getTopEntries(limit: number = 10): CacheEntry[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
  }

  /**
   * Warm cache with common queries
   */
  async warmCache(entries: Array<{
    prompt: string;
    response: string;
    model: string;
    cost: number;
    embedding?: number[];
  }>): Promise<void> {
    for (const entry of entries) {
      this.set(
        entry.prompt,
        entry.response,
        entry.model,
        entry.cost,
        entry.embedding
      );
    }

    logger.info('Cache warmed', { count: entries.length });
  }

  /**
   * Export cache for persistence
   */
  export(): any[] {
    return Array.from(this.cache.values()).map(entry => ({
      prompt: entry.prompt,
      response: entry.response,
      model: entry.model,
      cost: entry.cost,
      timestamp: entry.timestamp.toISOString(),
      hits: entry.hits,
    }));
  }

  /**
   * Import cache from persistence
   */
  import(data: any[]): void {
    for (const item of data) {
      const hash = this.hashPrompt(item.prompt, item.model);
      this.cache.set(hash, {
        prompt: item.prompt,
        response: item.response,
        model: item.model,
        cost: item.cost,
        timestamp: new Date(item.timestamp),
        hits: item.hits || 0,
      });
    }

    logger.info('Cache imported', { count: data.length });
  }
}

export default ModelCacheService;
