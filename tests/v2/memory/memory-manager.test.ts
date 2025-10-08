/**
 * Memory Manager Unit Tests
 * Tests for integrated memory management with vector + graph storage
 */

import { MemoryManager, createMemoryManager } from '../../../src/core/memory/memory-manager';

// Mock vector store
jest.mock('../../../src/core/memory/vector-store', () => ({
  vectorStore: {
    initialize: jest.fn().mockResolvedValue(undefined),
    store: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockResolvedValue({
      totalDocuments: 0,
      indexSize: 0,
      dimensions: 1536
    }),
    shutdown: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock graph store
jest.mock('../../../src/core/memory/graph-store', () => ({
  graphStore: {
    addNode: jest.fn(),
    addEdge: jest.fn(),
    deleteNode: jest.fn(),
    findRelated: jest.fn().mockReturnValue([]),
    getPath: jest.fn().mockReturnValue(null),
    queryByType: jest.fn().mockReturnValue([]),
    getStats: jest.fn().mockReturnValue({
      nodes: 0,
      edges: 0,
      nodeTypes: {},
      edgeTypes: {},
      avgDegree: 0
    }),
    export: jest.fn().mockReturnValue({ nodes: [], edges: [] }),
    import: jest.fn(),
    clear: jest.fn()
  }
}));

// Mock embedding service
jest.mock('../../../src/core/memory/embedding-service', () => ({
  EmbeddingService: jest.fn().mockImplementation(() => ({
    embed: jest.fn().mockResolvedValue(new Array(1536).fill(0.5)),
    embedBatch: jest.fn().mockResolvedValue([]),
    clearCache: jest.fn(),
    getCacheStats: jest.fn().mockReturnValue({
      size: 0,
      maxSize: 1000,
      hitRate: 0
    })
  }))
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('MemoryManager', () => {
  const mockApiKey = 'test-openai-key';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create instance with API key', () => {
      expect(() => new MemoryManager(mockApiKey)).not.toThrow();
    });

    it('should throw error without API key', () => {
      expect(() => new MemoryManager('')).toThrow('OpenAI API key is required');
    });

    it('should initialize vector store', async () => {
      const manager = new MemoryManager(mockApiKey);
      await expect(manager.initialize()).resolves.not.toThrow();

      const { vectorStore } = require('../../../src/core/memory/vector-store');
      expect(vectorStore.initialize).toHaveBeenCalled();
    });

    it('should initialize with custom Redis URL', async () => {
      const manager = new MemoryManager(mockApiKey);
      await manager.initialize('redis://custom:6379');

      const { vectorStore } = require('../../../src/core/memory/vector-store');
      expect(vectorStore.initialize).toHaveBeenCalledWith('redis://custom:6379');
    });

    it('should not reinitialize when already initialized', async () => {
      const manager = new MemoryManager(mockApiKey);
      await manager.initialize();
      await manager.initialize();

      const { vectorStore } = require('../../../src/core/memory/vector-store');
      expect(vectorStore.initialize).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const { vectorStore } = require('../../../src/core/memory/vector-store');
      vectorStore.initialize.mockRejectedValueOnce(new Error('Redis connection failed'));

      const manager = new MemoryManager(mockApiKey);
      await expect(manager.initialize()).rejects.toThrow('Redis connection failed');
    });

    it('should check if initialized', async () => {
      const manager = new MemoryManager(mockApiKey);
      expect(manager.isInitialized()).toBe(false);

      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
    });
  });

  describe('Remember (Store Memory)', () => {
    let manager: MemoryManager;

    beforeEach(async () => {
      manager = new MemoryManager(mockApiKey);
      await manager.initialize();
    });

    it('should store a memory with embedding', async () => {
      const content = 'Important decision about project architecture';
      const metadata = {
        type: 'decision' as const,
        domain: 'engineering',
        userId: 'user-123'
      };

      const memoryId = await manager.remember(content, metadata);

      expect(memoryId).toBeTruthy();
      expect(memoryId).toMatch(/^mem_/);

      const { vectorStore } = require('../../../src/core/memory/vector-store');
      expect(vectorStore.store).toHaveBeenCalled();
    });

    it('should add node to graph store', async () => {
      const content = 'Test memory';
      const metadata = {
        type: 'conversation' as const,
        domain: 'chat'
      };

      await manager.remember(content, metadata);

      const { graphStore } = require('../../../src/core/memory/graph-store');
      expect(graphStore.addNode).toHaveBeenCalled();
    });

    it('should generate embedding for content', async () => {
      const { EmbeddingService } = require('../../../src/core/memory/embedding-service');
      const mockEmbed = jest.fn().mockResolvedValue(new Array(1536).fill(0.5));
      EmbeddingService.mockImplementation(() => ({ embed: mockEmbed }));

      const newManager = new MemoryManager(mockApiKey);
      await newManager.initialize();

      await newManager.remember('Test', { type: 'task' });
      expect(mockEmbed).toHaveBeenCalledWith('Test');
    });

    it('should throw error when not initialized', async () => {
      const uninitializedManager = new MemoryManager(mockApiKey);

      await expect(
        uninitializedManager.remember('Test', { type: 'knowledge' })
      ).rejects.toThrow('MemoryManager not initialized');
    });

    it('should truncate content in graph node', async () => {
      const longContent = 'a'.repeat(500);
      await manager.remember(longContent, { type: 'code' });

      const { graphStore } = require('../../../src/core/memory/graph-store');
      const addNodeCall = graphStore.addNode.mock.calls[0][0];

      expect(addNodeCall.properties.content.length).toBe(200); // Truncated
    });

    it('should map metadata types to graph node types', async () => {
      const testCases = [
        { metadataType: 'conversation' as const, expectedNodeType: 'conversation' },
        { metadataType: 'task' as const, expectedNodeType: 'task' },
        { metadataType: 'knowledge' as const, expectedNodeType: 'project' },
        { metadataType: 'code' as const, expectedNodeType: 'project' },
        { metadataType: 'decision' as const, expectedNodeType: 'decision' }
      ];

      for (const { metadataType, expectedNodeType } of testCases) {
        jest.clearAllMocks();
        await manager.remember('Test', { type: metadataType });

        const { graphStore } = require('../../../src/core/memory/graph-store');
        const addNodeCall = graphStore.addNode.mock.calls[0][0];
        expect(addNodeCall.type).toBe(expectedNodeType);
      }
    });
  });

  describe('Recall (Search Memory)', () => {
    let manager: MemoryManager;

    beforeEach(async () => {
      manager = new MemoryManager(mockApiKey);
      await manager.initialize();
    });

    it('should recall memories by semantic search', async () => {
      const query = 'What decisions were made about architecture?';
      const mockResults = [
        {
          id: 'mem-1',
          content: 'Architecture decision',
          embedding: new Array(1536).fill(0.5),
          metadata: { type: 'decision' as const, timestamp: new Date().toISOString() },
          score: 0.95
        }
      ];

      const { vectorStore } = require('../../../src/core/memory/vector-store');
      vectorStore.search.mockResolvedValueOnce(mockResults);

      const results = await manager.recall(query);

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Architecture decision');
    });

    it('should recall with filters', async () => {
      const { vectorStore } = require('../../../src/core/memory/vector-store');
      vectorStore.search.mockResolvedValueOnce([]);

      await manager.recall('test query', {
        limit: 5,
        filter: { type: 'conversation', domain: 'chat' }
      });

      expect(vectorStore.search).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          limit: 5,
          filter: { type: 'conversation', domain: 'chat' }
        })
      );
    });

    it('should throw error when not initialized', async () => {
      const uninitializedManager = new MemoryManager(mockApiKey);

      await expect(uninitializedManager.recall('test')).rejects.toThrow(
        'MemoryManager not initialized'
      );
    });

    it('should generate embedding for query', async () => {
      const { EmbeddingService } = require('../../../src/core/memory/embedding-service');
      const mockEmbed = jest.fn().mockResolvedValue(new Array(1536).fill(0.5));
      EmbeddingService.mockImplementation(() => ({ embed: mockEmbed, getCacheStats: jest.fn().mockReturnValue({}) }));

      const newManager = new MemoryManager(mockApiKey);
      await newManager.initialize();

      await newManager.recall('test query');
      expect(mockEmbed).toHaveBeenCalledWith('test query');
    });
  });

  describe('Get and Forget Memory', () => {
    let manager: MemoryManager;

    beforeEach(async () => {
      manager = new MemoryManager(mockApiKey);
      await manager.initialize();
    });

    it('should get memory by ID', async () => {
      const mockMemory = {
        id: 'mem-123',
        content: 'Test memory',
        embedding: new Array(1536).fill(0.5),
        metadata: { type: 'task' as const, timestamp: new Date().toISOString() }
      };

      const { vectorStore } = require('../../../src/core/memory/vector-store');
      vectorStore.get.mockResolvedValueOnce(mockMemory);

      const result = await manager.getMemory('mem-123');

      expect(result).toEqual(mockMemory);
      expect(vectorStore.get).toHaveBeenCalledWith('mem-123');
    });

    it('should return null for non-existent memory', async () => {
      const { vectorStore } = require('../../../src/core/memory/vector-store');
      vectorStore.get.mockResolvedValueOnce(null);

      const result = await manager.getMemory('non-existent');
      expect(result).toBeNull();
    });

    it('should forget (delete) memory', async () => {
      await manager.forget('mem-to-delete');

      const { vectorStore } = require('../../../src/core/memory/vector-store');
      const { graphStore } = require('../../../src/core/memory/graph-store');

      expect(vectorStore.delete).toHaveBeenCalledWith('mem-to-delete');
      expect(graphStore.deleteNode).toHaveBeenCalledWith('mem-to-delete');
    });

    it('should throw error when forgetting without initialization', async () => {
      const uninitializedManager = new MemoryManager(mockApiKey);

      await expect(uninitializedManager.forget('test')).rejects.toThrow(
        'MemoryManager not initialized'
      );
    });
  });

  describe('Relationships', () => {
    let manager: MemoryManager;

    beforeEach(async () => {
      manager = new MemoryManager(mockApiKey);
      await manager.initialize();
    });

    it('should add relationship between memories', () => {
      manager.addRelationship('mem-1', 'mem-2', 'caused-by', { confidence: 0.9 });

      const { graphStore } = require('../../../src/core/memory/graph-store');
      expect(graphStore.addEdge).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'mem-1',
          to: 'mem-2',
          type: 'caused-by',
          properties: { confidence: 0.9 }
        })
      );
    });

    it('should find related memories', () => {
      const mockRelated = [
        {
          id: 'related-1',
          type: 'task' as const,
          properties: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const { graphStore } = require('../../../src/core/memory/graph-store');
      graphStore.findRelated.mockReturnValueOnce(mockRelated);

      const results = manager.findRelated('mem-1', 'depends-on', 2);

      expect(results).toEqual(mockRelated);
      expect(graphStore.findRelated).toHaveBeenCalledWith('mem-1', 'depends-on', 2);
    });

    it('should find path between memories', () => {
      const mockPath = {
        nodes: [],
        edges: [],
        length: 0
      };

      const { graphStore } = require('../../../src/core/memory/graph-store');
      graphStore.getPath.mockReturnValueOnce(mockPath);

      const result = manager.findPath('mem-1', 'mem-2');

      expect(result).toEqual(mockPath);
      expect(graphStore.getPath).toHaveBeenCalledWith('mem-1', 'mem-2');
    });
  });

  describe('Agent Context', () => {
    let manager: MemoryManager;

    beforeEach(async () => {
      manager = new MemoryManager(mockApiKey);
      await manager.initialize();
    });

    it('should get context for agent', async () => {
      const { vectorStore } = require('../../../src/core/memory/vector-store');
      const { graphStore } = require('../../../src/core/memory/graph-store');

      vectorStore.search.mockResolvedValue([]);
      graphStore.queryByType.mockReturnValue([]);

      const context = await manager.getContextForAgent('engineering', 5);

      expect(context).toHaveProperty('recentTasks');
      expect(context).toHaveProperty('relatedDecisions');
      expect(context).toHaveProperty('knowledgeBase');
      expect(context).toHaveProperty('relatedAgents');
      expect(context).toHaveProperty('conversationHistory');
    });

    it('should filter context by domain', async () => {
      const { vectorStore } = require('../../../src/core/memory/vector-store');

      await manager.getContextForAgent('marketing', 3);

      const calls = vectorStore.search.mock.calls;
      expect(calls.some((call: any) =>
        call[1]?.filter?.domain === 'marketing'
      )).toBe(true);
    });

    it('should return empty context on error', async () => {
      const { vectorStore } = require('../../../src/core/memory/vector-store');
      vectorStore.search.mockRejectedValueOnce(new Error('Search failed'));

      const context = await manager.getContextForAgent('test');

      expect(context.recentTasks).toEqual([]);
      expect(context.relatedDecisions).toEqual([]);
    });
  });

  describe('Statistics and Export', () => {
    let manager: MemoryManager;

    beforeEach(async () => {
      manager = new MemoryManager(mockApiKey);
      await manager.initialize();
    });

    it('should get combined statistics', async () => {
      const stats = await manager.getStats();

      expect(stats).toHaveProperty('vector');
      expect(stats).toHaveProperty('graph');
      expect(stats).toHaveProperty('embedding');
    });

    it('should export memory data', async () => {
      const exported = await manager.export();

      expect(exported).toHaveProperty('graph');
      expect(exported).toHaveProperty('timestamp');
      expect(exported.graph).toHaveProperty('nodes');
      expect(exported.graph).toHaveProperty('edges');
    });

    it('should import memory data', async () => {
      const data = {
        graph: {
          nodes: [],
          edges: []
        }
      };

      await manager.import(data);

      const { graphStore } = require('../../../src/core/memory/graph-store');
      expect(graphStore.import).toHaveBeenCalledWith(data.graph);
    });

    it('should clear all memory data', async () => {
      await manager.clear();

      const { graphStore } = require('../../../src/core/memory/graph-store');
      const { EmbeddingService } = require('../../../src/core/memory/embedding-service');

      expect(graphStore.clear).toHaveBeenCalled();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      const manager = new MemoryManager(mockApiKey);
      await manager.initialize();
      await manager.shutdown();

      const { vectorStore } = require('../../../src/core/memory/vector-store');
      expect(vectorStore.shutdown).toHaveBeenCalled();
    });
  });

  describe('Factory Function', () => {
    it('should create memory manager instance', () => {
      const manager = createMemoryManager(mockApiKey);
      expect(manager).toBeInstanceOf(MemoryManager);
    });
  });

  describe('Integration Scenarios', () => {
    let manager: MemoryManager;

    beforeEach(async () => {
      manager = new MemoryManager(mockApiKey);
      await manager.initialize();
    });

    it('should handle complete remember-recall flow', async () => {
      // Store memories
      const id1 = await manager.remember('First decision', { type: 'decision' });
      const id2 = await manager.remember('Second decision', { type: 'decision' });

      // Add relationship
      manager.addRelationship(id1, id2, 'leads-to');

      // Recall should work
      const { vectorStore } = require('../../../src/core/memory/vector-store');
      vectorStore.search.mockResolvedValueOnce([{
        id: id1,
        content: 'First decision',
        embedding: [],
        metadata: { type: 'decision', timestamp: new Date().toISOString() },
        score: 0.9
      }]);

      const results = await manager.recall('decision');
      expect(results).toHaveLength(1);
    });

    it('should handle error in remember and recover', async () => {
      const { vectorStore } = require('../../../src/core/memory/vector-store');
      vectorStore.store.mockRejectedValueOnce(new Error('Storage failed'));

      await expect(
        manager.remember('Test', { type: 'task' })
      ).rejects.toThrow('Storage failed');

      // Should still work on next attempt
      vectorStore.store.mockResolvedValueOnce(undefined);
      await expect(
        manager.remember('Test again', { type: 'task' })
      ).resolves.toBeTruthy();
    });
  });
});
