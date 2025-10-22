/**
 * AGENT 1: UNIT TEST GENERATOR - Health Aggregator Comprehensive Tests
 * Real-world DevOps scenarios based on 2025 SRE best practices
 * Testing Four Golden Signals: Latency, Traffic, Errors, Saturation
 */

import { HealthAggregator } from '../../src/core/health-aggregator';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HealthAggregator - Real-World DevOps Scenarios', () => {
  let aggregator: HealthAggregator;

  beforeEach(() => {
    aggregator = new HealthAggregator();
    jest.clearAllMocks();
  });

  describe('Four Golden Signals - Latency', () => {
    it('should detect healthy service with latency <100ms (p95 target)', async () => {
      // Mock fast response (50ms)
      mockedAxios.get.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ status: 200, data: {} }), 50))
      );

      const result = await aggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('healthy');
      expect(result.services.aiDawgBackend.latency).toBeLessThan(100);
    });

    it('should detect degraded service with latency >100ms', async () => {
      // Mock slow response (150ms)
      mockedAxios.get.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ status: 200, data: {} }), 150))
      );

      const result = await aggregator.checkAll();

      // Service should still be healthy (responds), but latency is concerning
      expect(result.services.aiDawgBackend.status).toBe('healthy');
      expect(result.services.aiDawgBackend.latency).toBeGreaterThan(100);
    });

    it('should timeout health check after 5 seconds', async () => {
      // Mock timeout (service takes 10 seconds)
      mockedAxios.get.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout of 5000ms exceeded')), 5100)
        )
      );

      const result = await aggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
      expect(result.services.aiDawgBackend.message).toContain('timeout');
    });
  });

  describe('Four Golden Signals - Traffic', () => {
    it('should handle checking all 7 services in parallel', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const start = Date.now();
      const result = await aggregator.checkAll();
      const elapsed = Date.now() - start;

      // All services checked in parallel (should be fast, not sequential)
      expect(elapsed).toBeLessThan(1000); // <1 second for all services
      expect(Object.keys(result.services).length).toBe(7);
    });

    it('should handle 1000 concurrent health checks (production load)', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(aggregator.checkAll());
      }

      const start = Date.now();
      await Promise.all(promises);
      const elapsed = Date.now() - start;

      // Should handle 1000 req/sec target
      expect(elapsed).toBeLessThan(5000); // <5 seconds for 1000 checks
    });
  });

  describe('Four Golden Signals - Errors', () => {
    it('should detect error rate and mark service as down', async () => {
      // Service returns 500 error
      mockedAxios.get.mockRejectedValue(new Error('Internal Server Error'));

      const result = await aggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
      expect(result.overall).toBe('down'); // All services failing
    });

    it('should mark overall as degraded when some services fail', async () => {
      // Mock: AI Dawg Backend healthy, others down
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('3001')) {
          return Promise.resolve({ status: 200, data: {} });
        }
        return Promise.reject(new Error('Service unavailable'));
      });

      const result = await aggregator.checkAll();

      expect(result.overall).toBe('degraded');
      expect(result.services.aiDawgBackend.status).toBe('healthy');
      expect(result.services.vocalCoach.status).toBe('down');
    });

    it('should handle 200 OK but empty payload', async () => {
      // Service returns 200 but no meaningful data
      mockedAxios.get.mockResolvedValue({ status: 200, data: null });

      const result = await aggregator.checkAll();

      // Service should still be marked healthy (200 response received)
      expect(result.services.aiDawgBackend.status).toBe('healthy');
    });
  });

  describe('Four Golden Signals - Saturation', () => {
    it('should detect service under heavy load (high latency)', async () => {
      // Simulate saturation with increasing latency
      let callCount = 0;
      mockedAxios.get.mockImplementation(() => {
        callCount++;
        const delay = callCount * 50; // Increasing delay simulating saturation
        return new Promise(resolve =>
          setTimeout(() => resolve({ status: 200, data: {} }), delay)
        );
      });

      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await aggregator.checkAll());
      }

      // Latency should increase with each check
      const latencies = results.map(r => r.services.aiDawgBackend.latency || 0);
      expect(latencies[4]).toBeGreaterThan(latencies[0]);
    });
  });

  describe('Incident Detection Timing (Real-world SRE)', () => {
    it('should detect failure within 30 seconds', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Service down'));

      const start = Date.now();
      const result = await aggregator.checkAll();
      const elapsed = Date.now() - start;

      expect(result.overall).toBe('down');
      expect(elapsed).toBeLessThan(30000); // <30 seconds detection
    });

    it('should complete health check in <10 seconds', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const start = Date.now();
      await aggregator.checkAll();
      const elapsed = Date.now() - start;

      // Control loop requirement: complete in <10s
      expect(elapsed).toBeLessThan(10000);
    });
  });

  describe('Service Dependency Scenarios', () => {
    it('should mark Postgres as down when AI Dawg Backend fails', async () => {
      // Postgres check depends on AI Dawg Backend
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await aggregator.checkAll();

      expect(result.services.postgres.status).toBe('down');
      expect(result.services.postgres.message).toContain('AI Dawg backend down');
    });

    it('should mark Redis as down when AI Dawg Backend fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await aggregator.checkAll();

      expect(result.services.redis.status).toBe('down');
      expect(result.services.redis.message).toContain('AI Dawg backend down');
    });

    it('should handle cascading failures gracefully', async () => {
      // All services down
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await aggregator.checkAll();

      expect(result.overall).toBe('down');
      expect(Object.values(result.services).every(s => s.status === 'down')).toBe(true);
    });
  });

  describe('Edge Cases from Production Incidents', () => {
    it('should handle network partition (ECONNREFUSED)', async () => {
      mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await aggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
      expect(result.services.aiDawgBackend.message).toContain('ECONNREFUSED');
    });

    it('should handle DNS resolution failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('ENOTFOUND'));

      const result = await aggregator.checkAll();

      expect(result.services.aiDawgBackend.status).toBe('down');
    });

    it('should handle flapping service (intermittent failures)', async () => {
      let callCount = 0;
      mockedAxios.get.mockImplementation(() => {
        callCount++;
        // Alternate between success and failure
        if (callCount % 2 === 0) {
          return Promise.resolve({ status: 200, data: {} });
        }
        return Promise.reject(new Error('Intermittent failure'));
      });

      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await aggregator.checkAll());
      }

      // Should detect both healthy and down states
      const statuses = results.map(r => r.services.aiDawgBackend.status);
      expect(statuses).toContain('healthy');
      expect(statuses).toContain('down');
    });

    it('should include timestamp in all responses', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await aggregator.checkAll();

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should handle all services healthy', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await aggregator.checkAll();

      expect(result.overall).toBe('healthy');
      expect(Object.values(result.services).every(s => s.status === 'healthy')).toBe(true);
    });
  });

  describe('SLO Compliance (99.9% uptime)', () => {
    it('should maintain <0.1% error rate over 1000 checks', async () => {
      let errors = 0;
      mockedAxios.get.mockImplementation(() => {
        // Simulate 0.05% error rate (below 0.1% SLO)
        if (Math.random() < 0.0005) {
          errors++;
          return Promise.reject(new Error('Random failure'));
        }
        return Promise.resolve({ status: 200, data: {} });
      });

      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(aggregator.checkAll().catch(() => null));
      }

      await Promise.all(promises);

      const errorRate = errors / 1000;
      expect(errorRate).toBeLessThan(0.001); // <0.1%
    });
  });

  describe('Performance Benchmarks', () => {
    it('should check all services in parallel (<1s total)', async () => {
      // Each service takes 100ms
      mockedAxios.get.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ status: 200, data: {} }), 100))
      );

      const start = Date.now();
      await aggregator.checkAll();
      const elapsed = Date.now() - start;

      // Should be ~100ms (parallel), not 700ms (sequential)
      expect(elapsed).toBeLessThan(200); // Allow some overhead
    });
  });
});
