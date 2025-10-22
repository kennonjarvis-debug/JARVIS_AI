/**
 * Smoke Tests - Post-Deployment Verification
 *
 * These tests verify critical functionality after deployment
 * to ensure the system is operational and healthy.
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 10000;

describe('Smoke Tests - Critical Path Verification', () => {
  let client: AxiosInstance;

  beforeAll(() => {
    client = axios.create({
      baseURL: BASE_URL,
      timeout: TIMEOUT,
      validateStatus: () => true, // Don't throw on any status
    });
  });

  describe('Health Checks', () => {
    test('should return healthy status', async () => {
      const response = await client.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('timestamp');
    });

    test('should pass readiness check', async () => {
      const response = await client.get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('ready', true);
    });

    test('should pass liveness check', async () => {
      const response = await client.get('/health/live');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('alive', true);
    });

    test('should report system metrics', async () => {
      const response = await client.get('/health');

      expect(response.data).toHaveProperty('uptime');
      expect(response.data).toHaveProperty('memory');
      expect(response.data.memory).toHaveProperty('used');
      expect(response.data.memory).toHaveProperty('total');
    });
  });

  describe('Database Connectivity', () => {
    test('should connect to database', async () => {
      const response = await client.get('/health');

      expect(response.data).toHaveProperty('database');
      expect(response.data.database).toHaveProperty('connected', true);
      expect(response.data.database.latency).toBeLessThan(100);
    });

    test('should execute database queries', async () => {
      const response = await client.get('/api/agents');

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Cache Connectivity', () => {
    test('should connect to Redis', async () => {
      const response = await client.get('/health');

      expect(response.data).toHaveProperty('cache');
      expect(response.data.cache).toHaveProperty('connected', true);
      expect(response.data.cache.latency).toBeLessThan(50);
    });
  });

  describe('API Endpoints', () => {
    test('should respond to API root', async () => {
      const response = await client.get('/api');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('name', 'Jarvis API');
    });

    test('should handle authentication endpoint', async () => {
      const response = await client.post('/api/auth/login', {
        email: 'test@example.com',
        password: 'invalid',
      });

      // Should return 401 or 400, not 500
      expect([400, 401]).toContain(response.status);
    });

    test('should list agents endpoint', async () => {
      const response = await client.get('/api/agents');

      // Should require auth or return data
      expect([200, 401]).toContain(response.status);
    });

    test('should handle websocket endpoint', async () => {
      const response = await client.get('/ws');

      // WebSocket upgrade or error
      expect([101, 400, 426]).toContain(response.status);
    });
  });

  describe('External Service Integration', () => {
    test('should have AI service configured', async () => {
      const response = await client.get('/health');

      expect(response.data).toHaveProperty('services');
      expect(response.data.services).toHaveProperty('openai');
      expect(response.data.services).toHaveProperty('anthropic');
    });

    test('should connect to storage service', async () => {
      const response = await client.get('/health');

      expect(response.data.services).toHaveProperty('s3');
      expect(response.data.services.s3).toHaveProperty('configured', true);
    });
  });

  describe('Performance Baselines', () => {
    test('should respond to health check within 200ms', async () => {
      const start = Date.now();
      const response = await client.get('/health');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });

    test('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map(() =>
        client.get('/health')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should have acceptable memory usage', async () => {
      const response = await client.get('/health');

      const memoryUsagePercent =
        (response.data.memory.used / response.data.memory.total) * 100;

      expect(memoryUsagePercent).toBeLessThan(90);
    });
  });

  describe('Security Headers', () => {
    test('should set security headers', async () => {
      const response = await client.get('/health');

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should not expose sensitive information', async () => {
      const response = await client.get('/health');

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await client.get('/this-route-does-not-exist');

      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('error');
    });

    test('should handle malformed requests', async () => {
      const response = await client.post('/api/agents', 'invalid-json', {
        headers: { 'Content-Type': 'application/json' }
      });

      expect([400, 401]).toContain(response.status);
    });

    test('should rate limit excessive requests', async () => {
      // Make many requests rapidly
      const promises = Array(150).fill(null).map(() =>
        client.get('/health')
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);

      // Should eventually rate limit
      expect(rateLimited).toBe(true);
    }, 30000);
  });

  describe('Data Integrity', () => {
    test('should return valid JSON', async () => {
      const response = await client.get('/api');

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.data).toBeDefined();
      expect(typeof response.data).toBe('object');
    });

    test('should include API version', async () => {
      const response = await client.get('/api');

      expect(response.data).toHaveProperty('version');
      expect(response.data.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Monitoring & Observability', () => {
    test('should expose metrics endpoint', async () => {
      const response = await client.get('/metrics');

      expect([200, 401]).toContain(response.status);
    });

    test('should include request tracing headers', async () => {
      const response = await client.get('/health');

      expect(response.headers).toHaveProperty('x-request-id');
    });
  });
});

describe('Smoke Tests - Critical Features', () => {
  let client: AxiosInstance;

  beforeAll(() => {
    client = axios.create({
      baseURL: BASE_URL,
      timeout: TIMEOUT,
      validateStatus: () => true,
    });
  });

  describe('Agent System', () => {
    test('should list available agent types', async () => {
      const response = await client.get('/api/agents/types');

      expect([200, 401]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
      }
    });
  });

  describe('File Upload', () => {
    test('should accept file upload endpoint', async () => {
      const response = await client.post('/api/upload');

      // Should require auth or file
      expect([400, 401, 413]).toContain(response.status);
    });
  });

  describe('WebSocket', () => {
    test('should have WebSocket server running', async () => {
      const response = await client.get('/ws');

      // Should indicate WebSocket is available
      expect([101, 400, 426]).toContain(response.status);
    });
  });
});
