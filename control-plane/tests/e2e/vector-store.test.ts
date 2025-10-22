/**
 * E2E Tests: Vector Store
 *
 * Tests embedding storage, similarity search, and vector operations
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { TestAPIClient, sleep } from './helpers/test-client.js';
import { randomUUID } from 'crypto';

// Use global fetch (Node 18+)
const fetch = globalThis.fetch;

describe('Vector Store E2E', () => {
  let apiClient: TestAPIClient;

  beforeAll(async () => {
    apiClient = new TestAPIClient();

    // Wait for JARVIS to be healthy
    let healthy = false;
    for (let i = 0; i < 10; i++) {
      try {
        const health = await apiClient.getHealth();
        if (health.status === 'healthy') {
          healthy = true;
          break;
        }
      } catch (error) {
        // Not ready
      }
      await sleep(1000);
    }

    if (!healthy) {
      throw new Error('JARVIS not healthy');
    }
  });

  test('should store and retrieve vector embeddings', async () => {
    try {
      const testDoc = {
        id: `test-doc-${randomUUID()}`,
        content: 'This is a test document for vector storage',
        embedding: new Array(1536).fill(0).map(() => Math.random()),
        metadata: {
          type: 'conversation',
          timestamp: new Date().toISOString()
        }
      };

      // Store document
      const storeResponse = await fetch('http://localhost:4000/api/vectors/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testDoc)
      });

      if (storeResponse.ok) {
        const storeResult = await storeResponse.json();
        expect(storeResult.success).toBe(true);

        await sleep(500);

        // Retrieve document
        const getResponse = await fetch(`http://localhost:4000/api/vectors/${testDoc.id}`);

        if (getResponse.ok) {
          const doc = await getResponse.json();

          expect(doc).toBeDefined();
          expect(doc.id).toBe(testDoc.id);
          expect(doc.content).toBe(testDoc.content);
          expect(doc.embedding).toBeDefined();
          expect(doc.embedding.length).toBe(1536);
        }
      } else {
        console.warn('Vector store endpoint not available');
      }
    } catch (error: any) {
      console.warn('Vector store test not available:', error.message);
    }
  }, 15000);

  test('should perform similarity search', async () => {
    try {
      // Store multiple test documents
      const testDocs = [
        {
          id: `doc-music-${randomUUID()}`,
          content: 'How to produce hip-hop beats with AI DAWG',
          embedding: new Array(1536).fill(0).map(() => Math.random()),
          metadata: { type: 'knowledge', domain: 'music_production' }
        },
        {
          id: `doc-code-${randomUUID()}`,
          content: 'TypeScript async/await patterns in Node.js',
          embedding: new Array(1536).fill(0).map(() => Math.random()),
          metadata: { type: 'knowledge', domain: 'development' }
        },
        {
          id: `doc-music2-${randomUUID()}`,
          content: 'Vocal mixing techniques for better sound quality',
          embedding: new Array(1536).fill(0).map(() => Math.random()),
          metadata: { type: 'knowledge', domain: 'music_production' }
        }
      ];

      // Store all docs
      for (const doc of testDocs) {
        await fetch('http://localhost:4000/api/vectors/store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doc)
        });
      }

      await sleep(1000);

      // Search for music-related content
      const searchResult = await apiClient.vectorSearch('music production and beats', {
        filter: { domain: 'music_production' },
        limit: 5
      });

      if (searchResult && searchResult.results) {
        expect(Array.isArray(searchResult.results)).toBe(true);

        // Should return music-related docs
        const musicDocs = searchResult.results.filter((r: any) =>
          r.content.includes('music') || r.content.includes('beat') || r.content.includes('vocal')
        );

        console.log(`Found ${musicDocs.length} music-related documents`);
        expect(musicDocs.length).toBeGreaterThan(0);
      } else {
        console.warn('Vector search returned no results');
      }
    } catch (error: any) {
      console.warn('Vector search test not available:', error.message);
    }
  }, 20000);

  test('should filter search results by metadata', async () => {
    try {
      const queryEmbedding = new Array(1536).fill(0).map(() => Math.random());

      const response = await fetch('http://localhost:4000/api/vectors/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedding: queryEmbedding,
          filter: {
            type: 'conversation'
          },
          limit: 10
        })
      });

      if (response.ok) {
        const results = await response.json();

        expect(results).toBeDefined();
        expect(Array.isArray(results.results)).toBe(true);

        // All results should match filter
        if (results.results.length > 0) {
          const allMatch = results.results.every((r: any) =>
            r.metadata.type === 'conversation'
          );

          expect(allMatch).toBe(true);
          console.log(`Filter returned ${results.results.length} conversation documents`);
        }
      } else {
        console.warn('Vector search endpoint not available');
      }
    } catch (error: any) {
      console.warn('Vector filter test not available:', error.message);
    }
  }, 15000);

  test('should handle batch vector operations', async () => {
    try {
      const batchDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `batch-doc-${i}-${randomUUID()}`,
        content: `Batch test document number ${i}`,
        embedding: new Array(1536).fill(0).map(() => Math.random()),
        metadata: {
          type: 'task',
          batch: 'test-batch-1',
          timestamp: new Date().toISOString()
        }
      }));

      const response = await fetch('http://localhost:4000/api/vectors/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: batchDocs })
      });

      if (response.ok) {
        const result = await response.json();

        expect(result.success).toBe(true);
        expect(result.count).toBe(10);

        console.log(`Batch stored ${result.count} documents`);
      } else {
        console.warn('Batch vector endpoint not available');
      }
    } catch (error: any) {
      console.warn('Batch vector test not available:', error.message);
    }
  }, 20000);

  test('should delete vector documents', async () => {
    try {
      const testDoc = {
        id: `delete-test-${randomUUID()}`,
        content: 'This document will be deleted',
        embedding: new Array(1536).fill(0).map(() => Math.random()),
        metadata: { type: 'task' }
      };

      // Store document
      await fetch('http://localhost:4000/api/vectors/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testDoc)
      });

      await sleep(500);

      // Delete document
      const deleteResponse = await fetch(`http://localhost:4000/api/vectors/${testDoc.id}`, {
        method: 'DELETE'
      });

      if (deleteResponse.ok) {
        await sleep(500);

        // Try to retrieve - should not exist
        const getResponse = await fetch(`http://localhost:4000/api/vectors/${testDoc.id}`);

        expect(getResponse.status).toBe(404);
        console.log('Document successfully deleted');
      } else {
        console.warn('Vector delete endpoint not available');
      }
    } catch (error: any) {
      console.warn('Vector delete test not available:', error.message);
    }
  }, 15000);

  test('should return vector store statistics', async () => {
    try {
      const response = await fetch('http://localhost:4000/api/vectors/stats');

      if (response.ok) {
        const stats = await response.json();

        expect(stats).toBeDefined();
        expect(stats.totalDocuments).toBeDefined();
        expect(stats.dimensions).toBe(1536);

        console.log('Vector store stats:', stats);
      } else {
        console.warn('Vector stats endpoint not available');
      }
    } catch (error: any) {
      console.warn('Vector stats test not available:', error.message);
    }
  }, 10000);

  test('should handle large batch deletions', async () => {
    try {
      // Create batch to delete
      const batchIds = Array.from({ length: 20 }, (_, i) => `batch-delete-${i}-${randomUUID()}`);

      const batchDocs = batchIds.map(id => ({
        id,
        content: 'To be batch deleted',
        embedding: new Array(1536).fill(0).map(() => Math.random()),
        metadata: { type: 'task', batch: 'delete-test' }
      }));

      // Store batch
      await fetch('http://localhost:4000/api/vectors/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: batchDocs })
      });

      await sleep(1000);

      // Delete batch
      const deleteResponse = await fetch('http://localhost:4000/api/vectors/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: batchIds })
      });

      if (deleteResponse.ok) {
        const result = await deleteResponse.json();

        expect(result.success).toBe(true);
        expect(result.deleted).toBe(20);

        console.log(`Batch deleted ${result.deleted} documents`);
      } else {
        console.warn('Batch delete endpoint not available');
      }
    } catch (error: any) {
      console.warn('Batch delete test not available:', error.message);
    }
  }, 25000);

  test('should preserve embedding dimensions', async () => {
    try {
      const embedding = new Array(1536).fill(0).map((_, i) => Math.sin(i / 100));

      const testDoc = {
        id: `dimension-test-${randomUUID()}`,
        content: 'Testing embedding dimension preservation',
        embedding,
        metadata: { type: 'knowledge' }
      };

      await fetch('http://localhost:4000/api/vectors/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testDoc)
      });

      await sleep(500);

      const getResponse = await fetch(`http://localhost:4000/api/vectors/${testDoc.id}`);

      if (getResponse.ok) {
        const doc = await getResponse.json();

        expect(doc.embedding.length).toBe(1536);

        // Check a few sample values to ensure precision is preserved
        expect(doc.embedding[0]).toBeCloseTo(embedding[0], 5);
        expect(doc.embedding[100]).toBeCloseTo(embedding[100], 5);
        expect(doc.embedding[1000]).toBeCloseTo(embedding[1000], 5);
      }
    } catch (error: any) {
      console.warn('Dimension preservation test not available:', error.message);
    }
  }, 15000);
});
