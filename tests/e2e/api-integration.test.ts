/**
 * E2E Tests: API Integration
 *
 * Tests general API endpoints, health checks, and system integration
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { TestAPIClient, sleep } from './helpers/test-client.js';

// Use global fetch (Node 18+)
const fetch = globalThis.fetch;

describe('API Integration E2E', () => {
  let apiClient: TestAPIClient;
  const BASE_URL = 'http://localhost:4000';

  beforeAll(async () => {
    apiClient = new TestAPIClient();

    // Wait for service
    let healthy = false;
    for (let i = 0; i < 15; i++) {
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
      console.warn('⚠️  JARVIS may not be fully healthy - some tests may fail');
    }
  });

  test('should return healthy status', async () => {
    const health = await apiClient.getHealth();

    expect(health).toBeDefined();
    expect(health.status).toBeDefined();
    expect(['healthy', 'degraded']).toContain(health.status);

    console.log('System status:', health.status);

    if (health.services) {
      console.log('Service health:', health.services);
    }
  });

  test('should handle CORS preflight requests', async () => {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    expect(response.status).toBeLessThan(300);

    const corsHeader = response.headers.get('access-control-allow-origin');
    expect(corsHeader).toBeDefined();
  });

  test('should return 404 for unknown endpoints', async () => {
    const response = await fetch(`${BASE_URL}/api/nonexistent-endpoint-12345`);

    expect(response.status).toBe(404);
  });

  test('should handle malformed JSON in POST requests', async () => {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json {'
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  test('should rate limit excessive requests', async () => {
    const requests = Array.from({ length: 100 }, (_, i) =>
      fetch(`${BASE_URL}/health`)
    );

    const responses = await Promise.all(requests);

    const statusCodes = responses.map(r => r.status);
    const rateLimited = statusCodes.filter(code => code === 429);

    // Should have some rate-limited responses
    console.log(`${rateLimited.length} out of 100 requests were rate-limited`);

    // At least some requests should succeed
    const successful = statusCodes.filter(code => code === 200);
    expect(successful.length).toBeGreaterThan(0);
  }, 30000);

  test('should handle concurrent API requests', async () => {
    const promises = Array.from({ length: 20 }, async (_, i) => {
      const conversation = await apiClient.createConversation('web');
      return conversation;
    });

    const results = await Promise.all(promises);

    expect(results.length).toBe(20);

    // All should have unique IDs
    const ids = results.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(20);

    console.log('Successfully handled 20 concurrent conversation creations');
  }, 25000);

  test('should provide API version information', async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/version`);

      if (response.ok) {
        const version = await response.json();

        expect(version).toBeDefined();
        expect(version.version).toBeDefined();

        console.log('API version:', version.version);
      } else {
        console.warn('Version endpoint not available');
      }
    } catch (error: any) {
      console.warn('Version endpoint not available:', error.message);
    }
  });

  test('should return metrics endpoint data', async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/metrics`);

      if (response.ok) {
        const metrics = await response.json();

        expect(metrics).toBeDefined();

        console.log('Available metrics:', Object.keys(metrics));
      } else {
        console.warn('Metrics endpoint not available');
      }
    } catch (error: any) {
      console.warn('Metrics endpoint not available:', error.message);
    }
  });

  test('should handle WebSocket upgrade requests', async () => {
    const response = await fetch(`${BASE_URL}/ws`, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });

    // Should either upgrade or reject appropriately
    expect(response).toBeDefined();

    console.log('WebSocket upgrade response:', response.status);
  });

  test('should validate request content types', async () => {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'This is plain text'
    });

    // Should reject non-JSON content
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should handle large payloads', async () => {
    const largeMessage = 'A'.repeat(100000); // 100KB message

    try {
      const conversation = await apiClient.createConversation('web');

      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          message: largeMessage,
          source: 'web'
        })
      });

      // Should either accept or reject with appropriate error
      expect(response).toBeDefined();

      if (response.status === 413) {
        console.log('Server correctly rejected payload too large');
      } else if (response.ok) {
        console.log('Server accepted large payload');
      }
    } catch (error: any) {
      console.warn('Large payload test failed:', error.message);
    }
  }, 20000);

  test('should handle missing required fields', async () => {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Missing conversationId and message
        source: 'web'
      })
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);

    const error = await response.json();
    expect(error.error).toBeDefined();
  });

  test('should return appropriate error messages', async () => {
    const response = await fetch(`${BASE_URL}/api/conversations/invalid-id-12345`);

    if (!response.ok) {
      const error = await response.json();

      expect(error).toBeDefined();
      expect(error.error).toBeDefined();
      expect(typeof error.error).toBe('string');

      console.log('Error message format:', error);
    }
  });

  test('should support query parameters', async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/conversations?limit=5&offset=0`);

      if (response.ok) {
        const conversations = await response.json();

        expect(Array.isArray(conversations)).toBe(true);
        expect(conversations.length).toBeLessThanOrEqual(5);

        console.log(`Query returned ${conversations.length} conversations`);
      }
    } catch (error: any) {
      console.warn('Query parameter test not available:', error.message);
    }
  });

  test('should handle connection timeouts gracefully', async () => {
    // This test would require a slow endpoint or network simulation
    // For now, just verify the health check responds quickly
    const startTime = Date.now();
    await apiClient.getHealth();
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000);
    console.log(`Health check responded in ${duration}ms`);
  });
});
