import { vectorStore, VectorDocument, SearchResult } from './vector-store.js';
import { graphStore, GraphNode, GraphEdge, GraphPath } from './graph-store.js';
import { EmbeddingService } from './embedding-service.js';
import { logger } from '../../utils/logger.js';

export interface MemoryStats {
  vector: {
    totalDocuments: number;
    indexSize: number;
    dimensions: number;
  };
  graph: {
    nodes: number;
    edges: number;
    nodeTypes: Record<string, number>;
    edgeTypes: Record<string, number>;
    avgDegree: number;
  };
  embedding: {
    size: number;
    maxSize: number;
    hitRate: number;
  };
}

export interface AgentContext {
  recentTasks: SearchResult[];
  relatedDecisions: GraphNode[];
  knowledgeBase: SearchResult[];
  relatedAgents: GraphNode[];
  conversationHistory: SearchResult[];
}

export class MemoryManager {
  private embeddingService: EmbeddingService;
  private initialized = false;

  constructor(openaiApiKey: string) {
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is required for MemoryManager');
    }
    this.embeddingService = new EmbeddingService(openaiApiKey);
    logger.info('[MemoryManager] Initialized');
  }

  /**
   * Initialize memory layer components
   */
  async initialize(redisUrl?: string): Promise<void> {
    if (this.initialized) {
      logger.warn('[MemoryManager] Already initialized');
      return;
    }

    try {
      await vectorStore.initialize(redisUrl);
      logger.info('[MemoryManager] Vector store initialized');

      this.initialized = true;
      logger.info('[MemoryManager] Fully initialized');
    } catch (error: any) {
      logger.error('[MemoryManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Store a memory (text + embedding + graph node)
   */
  async remember(
    content: string,
    metadata: Omit<VectorDocument['metadata'], 'timestamp'>
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized');
    }

    try {
      // Generate embedding
      const embedding = await this.embeddingService.embed(content);

      // Generate ID
      const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create vector document
      const doc: VectorDocument = {
        id,
        content,
        embedding,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      };

      // Store in vector database
      await vectorStore.store(doc);

      // Add to graph
      const nodeType = this.mapMetadataTypeToNodeType(metadata.type);
      graphStore.addNode({
        id,
        type: nodeType,
        properties: {
          content: content.substring(0, 200), // Store truncated content
          ...metadata
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      logger.info(`[MemoryManager] Stored memory: ${id} (${metadata.type})`);
      return id;
    } catch (error: any) {
      logger.error('[MemoryManager] Failed to remember:', error);
      throw error;
    }
  }

  /**
   * Recall memories using semantic search
   */
  async recall(
    query: string,
    options?: {
      limit?: number;
      filter?: { type?: string; domain?: string; userId?: string };
    }
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized');
    }

    try {
      const queryEmbedding = await this.embeddingService.embed(query);
      const results = await vectorStore.search(queryEmbedding, options);

      logger.debug(`[MemoryManager] Recalled ${results.length} memories for query`);
      return results;
    } catch (error: any) {
      logger.error('[MemoryManager] Failed to recall:', error);
      throw error;
    }
  }

  /**
   * Get a specific memory by ID
   */
  async getMemory(id: string): Promise<VectorDocument | null> {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized');
    }

    return await vectorStore.get(id);
  }

  /**
   * Delete a memory
   */
  async forget(id: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized');
    }

    await vectorStore.delete(id);
    graphStore.deleteNode(id);

    logger.info(`[MemoryManager] Forgot memory: ${id}`);
  }

  /**
   * Add a relationship between memories
   */
  addRelationship(fromId: string, toId: string, type: string, properties?: Record<string, any>): void {
    graphStore.addEdge({
      from: fromId,
      to: toId,
      type,
      properties,
      createdAt: new Date()
    });

    logger.debug(`[MemoryManager] Added relationship: ${fromId} --[${type}]--> ${toId}`);
  }

  /**
   * Find related memories via graph relationships
   */
  findRelated(memoryId: string, relationshipType?: string, maxDepth: number = 2): GraphNode[] {
    return graphStore.findRelated(memoryId, relationshipType, maxDepth);
  }

  /**
   * Find path between two memories
   */
  findPath(fromId: string, toId: string): GraphPath | null {
    return graphStore.getPath(fromId, toId);
  }

  /**
   * Get context for an agent (combines vector + graph data)
   */
  async getContextForAgent(agentDomain: string, limit: number = 5): Promise<AgentContext> {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized');
    }

    try {
      // Get recent tasks for this domain
      const recentTasks = await this.recall('', {
        limit,
        filter: { type: 'task', domain: agentDomain }
      });

      // Get related decisions from graph
      const relatedDecisions = graphStore.queryByType('decision')
        .filter(node => node.properties.domain === agentDomain)
        .slice(0, limit);

      // Get knowledge base entries
      const knowledgeBase = await this.recall('', {
        limit,
        filter: { type: 'knowledge', domain: agentDomain }
      });

      // Get related agents
      const relatedAgents = graphStore.queryByType('agent')
        .filter(node => node.properties.domain === agentDomain || node.properties.relatedDomains?.includes(agentDomain))
        .slice(0, limit);

      // Get conversation history
      const conversationHistory = await this.recall('', {
        limit: limit * 2,
        filter: { type: 'conversation', domain: agentDomain }
      });

      return {
        recentTasks,
        relatedDecisions,
        knowledgeBase,
        relatedAgents,
        conversationHistory
      };
    } catch (error: any) {
      logger.error('[MemoryManager] Failed to get agent context:', error);
      return {
        recentTasks: [],
        relatedDecisions: [],
        knowledgeBase: [],
        relatedAgents: [],
        conversationHistory: []
      };
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const vectorStats = await vectorStore.getStats();
    const graphStats = graphStore.getStats();
    const embeddingStats = this.embeddingService.getCacheStats();

    return {
      vector: vectorStats,
      graph: graphStats,
      embedding: embeddingStats
    };
  }

  /**
   * Export all memory data
   */
  async export(): Promise<{
    graph: { nodes: GraphNode[]; edges: GraphEdge[] };
    timestamp: string;
  }> {
    const graphData = graphStore.export();

    return {
      graph: graphData,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import memory data
   */
  async import(data: {
    graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  }): Promise<void> {
    graphStore.import(data.graph);
    logger.info('[MemoryManager] Imported memory data');
  }

  /**
   * Clear all memory data (use with caution!)
   */
  async clear(): Promise<void> {
    graphStore.clear();
    this.embeddingService.clearCache();
    logger.warn('[MemoryManager] Cleared all memory data');
  }

  /**
   * Shutdown memory manager
   */
  async shutdown(): Promise<void> {
    await vectorStore.shutdown();
    logger.info('[MemoryManager] Shutdown complete');
  }

  /**
   * Map metadata type to graph node type
   */
  private mapMetadataTypeToNodeType(type: VectorDocument['metadata']['type']): GraphNode['type'] {
    const mapping: Record<VectorDocument['metadata']['type'], GraphNode['type']> = {
      'conversation': 'conversation',
      'task': 'task',
      'knowledge': 'project', // Map knowledge to project
      'code': 'project',
      'decision': 'decision'
    };

    return mapping[type] || 'task';
  }

  /**
   * Check if memory manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Factory function to create a memory manager instance
 */
export const createMemoryManager = (openaiApiKey: string): MemoryManager => {
  return new MemoryManager(openaiApiKey);
};
