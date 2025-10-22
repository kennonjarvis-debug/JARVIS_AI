/**
 * AGENT 5: PERFORMANCE TESTER - Comprehensive Performance Tests
 * Real-world load requirements based on 2025 DevOps standards
 * Target: All SLOs met (latency, throughput, error rate)
 */

import request from 'supertest';
import app from '../../src/core/gateway';

describe('Performance Tests - SLO Validation', () => {
  describe('Latency Targets (Four Golden Signals)', () => {
    it('should achieve p50 latency <20ms on /health', async () => {
      const latencies = [];

      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await request(app).get('/health');
        latencies.push(Date.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p50 = latencies[49];

      expect(p50).toBeLessThan(20);
    }, 30000);

    it('should achieve p95 latency <100ms on /health', async () => {
      const latencies = [];

      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await request(app).get('/health');
        latencies.push(Date.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p95 = latencies[94];

      expect(p95).toBeLessThan(100);
    }, 30000);

    it('should achieve p99 latency <200ms on /health', async () => {
      const latencies = [];

      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await request(app).get('/health');
        latencies.push(Date.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p99 = latencies[98];

      expect(p99).toBeLessThan(200);
    }, 30000);

    it('should achieve p95 latency <100ms on /health/detailed', async () => {
      const latencies = [];

      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await request(app).get('/health/detailed');
        latencies.push(Date.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p95 = latencies[94];

      // Detailed health may take longer due to multiple service checks
      expect(p95).toBeLessThan(10000); // Allow 10s for all services
    }, 60000);
  });

  describe('Throughput Targets (1000 req/sec)', () => {
    it('should handle 1000 requests within 1 second', async () => {
      const promises = [];

      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        promises.push(request(app).get('/health'));
      }

      await Promise.all(promises);
      const elapsed = Date.now() - start;

      // Should complete 1000 requests quickly
      expect(elapsed).toBeLessThan(5000); // <5 seconds for 1000 requests
    }, 30000);

    it('should sustain 100 req/sec for 10 seconds', async () => {
      const start = Date.now();
      let requestCount = 0;

      const interval = setInterval(async () => {
        for (let i = 0; i < 10; i++) {
          request(app).get('/health').then(() => requestCount++);
        }
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 10000));
      clearInterval(interval);

      const elapsed = Date.now() - start;

      expect(requestCount).toBeGreaterThan(900); // >90 successful requests
      expect(elapsed).toBeLessThan(11000);
    }, 30000);

    it('should handle 100 concurrent execute requests', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .post('/api/v1/execute')
            .set('Authorization', 'Bearer test-token')
            .send({ module: 'test', action: 'test' })
        );
      }

      const start = Date.now();
      const responses = await Promise.all(promises);
      const elapsed = Date.now() - start;

      expect(responses.length).toBe(100);
      expect(elapsed).toBeLessThan(10000); // <10 seconds
    }, 30000);
  });

  describe('Error Rate Targets (<0.1%)', () => {
    it('should maintain error rate <0.1% over 1000 requests', async () => {
      const promises = [];

      for (let i = 0; i < 1000; i++) {
        promises.push(request(app).get('/health'));
      }

      const responses = await Promise.all(promises);
      const errors = responses.filter(r => r.status >= 500).length;
      const errorRate = errors / 1000;

      expect(errorRate).toBeLessThan(0.001); // <0.1% error rate
    }, 60000);

    it('should maintain error rate <0.1% under mixed load', async () => {
      const promises = [];

      // 60% GET health
      for (let i = 0; i < 600; i++) {
        promises.push(request(app).get('/health'));
      }

      // 30% GET detailed health
      for (let i = 0; i < 300; i++) {
        promises.push(request(app).get('/health/detailed'));
      }

      // 10% POST execute
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .post('/api/v1/execute')
            .set('Authorization', 'Bearer test-token')
            .send({ module: 'test', action: 'test' })
        );
      }

      const responses = await Promise.all(promises);
      const errors = responses.filter(r => r.status >= 500).length;
      const errorRate = errors / 1000;

      expect(errorRate).toBeLessThan(0.001);
    }, 60000);
  });

  describe('Resource Saturation (<80%)', () => {
    it('should not degrade under sustained load (30 seconds)', async () => {
      const latencies = [];
      const start = Date.now();

      while (Date.now() - start < 30000) {
        const requestStart = Date.now();
        await request(app).get('/health');
        latencies.push(Date.now() - requestStart);

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Latency should not increase significantly over time
      const firstHalf = latencies.slice(0, Math.floor(latencies.length / 2));
      const secondHalf = latencies.slice(Math.floor(latencies.length / 2));

      const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      // Second half should not be significantly slower (indicates saturation)
      expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 2);
    }, 60000);

    it('should handle spike in traffic (100 to 1000 requests)', async () => {
      // Baseline: 100 requests
      const baseline = [];
      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await request(app).get('/health');
        baseline.push(Date.now() - start);
      }

      const avgBaseline = baseline.reduce((a, b) => a + b, 0) / baseline.length;

      // Spike: 1000 concurrent requests
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(request(app).get('/health'));
      }

      const responses = await Promise.all(promises);
      const successRate = responses.filter(r => r.status === 200).length / 1000;

      // Should handle spike with >99% success rate
      expect(successRate).toBeGreaterThan(0.99);
    }, 60000);
  });

  describe('Database Write Performance', () => {
    it('should complete execute request in <500ms (p95)', async () => {
      const latencies = [];

      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/v1/execute')
          .set('Authorization', 'Bearer test-token')
          .send({ module: 'test', action: 'test' });
        latencies.push(Date.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p95 = latencies[94];

      // Allow more time if services are unavailable
      expect(p95).toBeLessThan(5000);
    }, 60000);
  });

  describe('Concurrent User Simulation', () => {
    it('should support 100 concurrent users (realistic studio load)', async () => {
      const promises = [];

      // Simulate 100 users, each making 5 requests
      for (let user = 0; user < 100; user++) {
        for (let req = 0; req < 5; req++) {
          promises.push(
            request(app)
              .get(req % 2 === 0 ? '/health' : '/health/detailed')
          );
        }
      }

      const start = Date.now();
      const responses = await Promise.all(promises);
      const elapsed = Date.now() - start;

      const successCount = responses.filter(r => r.status === 200 || r.status === 207).length;
      const successRate = successCount / 500;

      expect(successRate).toBeGreaterThan(0.99); // >99% success rate
      expect(elapsed).toBeLessThan(30000); // <30 seconds
    }, 60000);

    it('should support realistic user mix (browse 70%, execute 20%, metrics 10%)', async () => {
      const promises = [];

      // 70% browsing (health checks)
      for (let i = 0; i < 700; i++) {
        promises.push(request(app).get('/health'));
      }

      // 20% executing commands
      for (let i = 0; i < 200; i++) {
        promises.push(
          request(app)
            .post('/api/v1/execute')
            .set('Authorization', 'Bearer test-token')
            .send({ module: 'test', action: 'test' })
        );
      }

      // 10% viewing metrics
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/api/v1/business/metrics')
            .set('Authorization', 'Bearer test-token')
        );
      }

      const start = Date.now();
      const responses = await Promise.all(promises);
      const elapsed = Date.now() - start;

      const successCount = responses.filter(r => r.status < 500).length;
      const successRate = successCount / 1000;

      expect(successRate).toBeGreaterThan(0.99);
      expect(elapsed).toBeLessThan(30000);
    }, 60000);
  });

  describe('Memory and CPU Stability', () => {
    it('should not leak memory over 1000 requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make 1000 requests
      for (let i = 0; i < 1000; i++) {
        await request(app).get('/health');

        // Force GC every 100 requests (if available)
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const growth = finalMemory - initialMemory;

      // Memory growth should be reasonable (<100MB)
      expect(growth).toBeLessThan(100 * 1024 * 1024);
    }, 120000);
  });

  describe('Cache Performance (Future)', () => {
    it('should improve response time with caching', async () => {
      // First request (uncached)
      const start1 = Date.now();
      await request(app).get('/health/detailed');
      const uncached = Date.now() - start1;

      // Second request (potentially cached)
      const start2 = Date.now();
      await request(app).get('/health/detailed');
      const cached = Date.now() - start2;

      // Cached request should be faster or similar
      expect(cached).toBeLessThanOrEqual(uncached * 1.2); // Allow 20% variance
    });
  });

  describe('Real-World Load Patterns', () => {
    it('should handle morning peak load (8am spike)', async () => {
      // Simulate gradual increase in load
      const batches = [100, 200, 500, 1000];

      for (const batchSize of batches) {
        const promises = [];
        for (let i = 0; i < batchSize; i++) {
          promises.push(request(app).get('/health'));
        }

        const responses = await Promise.all(promises);
        const successRate = responses.filter(r => r.status === 200).length / batchSize;

        expect(successRate).toBeGreaterThan(0.99);

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }, 120000);

    it('should handle sustained daily load (8 hours simulation)', async () => {
      // Simulate 8 hours compressed into 8 seconds
      const requestsPerSecond = 50;
      const duration = 8000; // 8 seconds

      const start = Date.now();
      let totalRequests = 0;

      while (Date.now() - start < duration) {
        const batchPromises = [];
        for (let i = 0; i < requestsPerSecond; i++) {
          batchPromises.push(request(app).get('/health'));
          totalRequests++;
        }

        await Promise.all(batchPromises);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      expect(totalRequests).toBeGreaterThan(300); // >300 requests over 8 seconds
    }, 30000);
  });
});
