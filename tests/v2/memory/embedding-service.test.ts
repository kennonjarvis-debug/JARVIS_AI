/**
 * Embedding Service Unit Tests
 * Tests for OpenAI embedding generation with caching
 */

import axios from 'axios';
import { EmbeddingService } from '../../../src/core/memory/embedding-service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('EmbeddingService', () => {
  const mockApiKey = 'test-openai-key';
  const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with valid API key', () => {
      expect(() => new EmbeddingService(mockApiKey)).not.toThrow();
    });

    it('should throw error without API key', () => {
      expect(() => new EmbeddingService('')).toThrow('OpenAI API key is required');
    });
  });

  describe('Single Text Embedding', () => {
    let service: EmbeddingService;

    beforeEach(() => {
      service = new EmbeddingService(mockApiKey);
      mockedAxios.post.mockResolvedValue({
        data: {
          data: [{ embedding: mockEmbedding }]
        }
      });
    });

    it('should generate embedding for text', async () => {
      const text = 'This is a test sentence';
      const result = await service.embed(text);

      expect(result).toHaveLength(1536);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: 'text-embedding-ada-002'
        },
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should throw error for empty text', async () => {
      await expect(service.embed('')).rejects.toThrow('Text cannot be empty');
      await expect(service.embed('   ')).rejects.toThrow('Text cannot be empty');
    });

    it('should cache embedding results', async () => {
      const text = 'Cached text';

      // First call - should hit API
      await service.embed(text);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await service.embed(text);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No additional API call
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: { message: 'Invalid API key' } }
        }
      });

      await expect(service.embed('test')).rejects.toThrow('OpenAI API error: Invalid API key');
    });

    it('should handle network errors', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        request: {},
        message: 'Network timeout'
      });

      await expect(service.embed('test')).rejects.toThrow('Network error while generating embedding');
    });

    it('should handle invalid API response', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {}
      });

      await expect(service.embed('test')).rejects.toThrow('Invalid response from OpenAI API');
    });
  });

  describe('Batch Text Embedding', () => {
    let service: EmbeddingService;

    beforeEach(() => {
      service = new EmbeddingService(mockApiKey);
    });

    it('should generate embeddings for multiple texts', async () => {
      const embeddings = [
        new Array(1536).fill(0).map(() => Math.random()),
        new Array(1536).fill(0).map(() => Math.random()),
        new Array(1536).fill(0).map(() => Math.random())
      ];

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: embeddings.map(embedding => ({ embedding }))
        }
      });

      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const results = await service.embedBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveLength(1536);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        {
          input: texts,
          model: 'text-embedding-ada-002'
        },
        expect.anything()
      );
    });

    it('should return empty array for empty input', async () => {
      const results = await service.embedBatch([]);
      expect(results).toEqual([]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should filter out empty texts', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: [{ embedding: mockEmbedding }]
        }
      });

      const results = await service.embedBatch(['', 'Valid text', '   ']);
      expect(results).toHaveLength(1);
    });

    it('should use cache for previously embedded texts', async () => {
      // First batch
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: [
            { embedding: mockEmbedding },
            { embedding: mockEmbedding }
          ]
        }
      });

      await service.embedBatch(['Text 1', 'Text 2']);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Second batch with one cached text
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: [{ embedding: mockEmbedding }]
        }
      });

      const results = await service.embedBatch(['Text 1', 'Text 3']); // Text 1 is cached

      expect(results).toHaveLength(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);

      // Verify only uncached text was sent
      const lastCall = mockedAxios.post.mock.calls[1];
      expect(lastCall[1]).toEqual({
        input: ['Text 3'],
        model: 'text-embedding-ada-002'
      });
    });

    it('should handle partial cache hits', async () => {
      // Cache some embeddings
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: [{ embedding: mockEmbedding }]
        }
      });

      await service.embedBatch(['Cached']);

      // New batch with mix of cached and new
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: [{ embedding: mockEmbedding }]
        }
      });

      const results = await service.embedBatch(['Cached', 'New']);

      expect(results).toHaveLength(2);
      // Only 'New' should be sent to API
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors in batch mode', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 429,
          data: { error: { message: 'Rate limit exceeded' } }
        }
      });

      await expect(service.embedBatch(['Text 1', 'Text 2']))
        .rejects.toThrow('OpenAI API error: Rate limit exceeded');
    });
  });

  describe('Cache Management', () => {
    let service: EmbeddingService;

    beforeEach(() => {
      service = new EmbeddingService(mockApiKey);
      mockedAxios.post.mockResolvedValue({
        data: {
          data: [{ embedding: mockEmbedding }]
        }
      });
    });

    it('should clear cache', async () => {
      await service.embed('Test text');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      service.clearCache();

      await service.embed('Test text');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // Cache was cleared
    });

    it('should enforce cache size limit', async () => {
      service.setCacheSize(2);

      await service.embed('Text 1');
      await service.embed('Text 2');
      await service.embed('Text 3');

      const stats = service.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(2);
    });

    it('should evict oldest entries when cache is full', async () => {
      service.setCacheSize(2);

      await service.embed('First');
      await service.embed('Second');
      await service.embed('Third'); // Should evict 'First'

      // Clear mock calls
      mockedAxios.post.mockClear();

      // 'First' should require new API call
      await service.embed('First');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // 'Second' should still be cached
      await service.embed('Second');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should return cache statistics', async () => {
      await service.embed('Test 1');
      await service.embed('Test 2');

      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should set cache size', () => {
      expect(() => service.setCacheSize(500)).not.toThrow();

      const stats = service.getCacheStats();
      expect(stats.maxSize).toBe(500);
    });

    it('should throw error for negative cache size', () => {
      expect(() => service.setCacheSize(-1)).toThrow('Cache size must be non-negative');
    });

    it('should trim cache when reducing size', async () => {
      await service.embed('Text 1');
      await service.embed('Text 2');
      await service.embed('Text 3');

      service.setCacheSize(1);

      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('Cache Key Generation', () => {
    let service: EmbeddingService;

    beforeEach(() => {
      service = new EmbeddingService(mockApiKey);
      mockedAxios.post.mockResolvedValue({
        data: {
          data: [{ embedding: mockEmbedding }]
        }
      });
    });

    it('should use same cache key for identical texts', async () => {
      await service.embed('Same text');
      await service.embed('Same text');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should use different cache keys for different texts', async () => {
      await service.embed('Text A');
      await service.embed('Text B');

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle very long texts', async () => {
      const longText = 'a'.repeat(1000);
      await service.embed(longText);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery', () => {
    let service: EmbeddingService;

    beforeEach(() => {
      service = new EmbeddingService(mockApiKey);
    });

    it('should recover from transient API errors', async () => {
      // First call fails
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: { message: 'Internal server error' } }
        }
      });

      await expect(service.embed('Test')).rejects.toThrow();

      // Second call succeeds
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: [{ embedding: mockEmbedding }]
        }
      });

      await expect(service.embed('Test retry')).resolves.toBeDefined();
    });

    it('should handle timeout errors', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      await expect(service.embed('Test')).rejects.toThrow();
    });
  });
});
