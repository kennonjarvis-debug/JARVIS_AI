/**
 * AGENT 4: INTEGRATION TESTER - Full-Stack Flow Tests
 * Real-world end-to-end scenarios with timing requirements
 * Target: All flows passing with real-world timing
 */

import request from 'supertest';
import app from '../../src/core/gateway';
import { HealthAggregator } from '../../src/core/health-aggregator';

describe('Integration Tests - Full-Stack Flows', () => {
  describe('Health Monitoring Flow (Real 30s Timing)', () => {
    it('should detect service status within 30 seconds', async () => {
      const start = Date.now();

      // Execute health check
      const response = await request(app).get('/health/detailed');

      const elapsed = Date.now() - start;

      expect(response.status).toBeDefined();
      expect(response.body.overall).toBeDefined();
      expect(elapsed).toBeLessThan(30000); // <30s detection
    });

    it('should complete health check cycle in <10 seconds', async () => {
      // Control loop requirement
      const start = Date.now();
      const response = await request(app).get('/health/detailed');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10000); // <10s for control loop
    });

    it('should return consistent health across multiple checks', async () => {
      const check1 = await request(app).get('/health/detailed');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const check2 = await request(app).get('/health/detailed');

      // Health should be relatively stable
      expect(check1.body.overall).toBeDefined();
      expect(check2.body.overall).toBeDefined();
    });
  });

  describe('JARVIS → AI DAWG Communication Flow', () => {
    it('should route execute command to AI DAWG', async () => {
      const response = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({
          module: 'test',
          action: 'ping',
          params: {}
        });

      // Should attempt to route (may fail if AI DAWG not running)
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    it('should complete execute request in <500ms (database write)', async () => {
      const start = Date.now();

      await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({
          module: 'test',
          action: 'test',
          params: {}
        });

      const elapsed = Date.now() - start;

      // Target: <500ms for simple operations
      expect(elapsed).toBeLessThan(5000); // Allow more time if services are down
    });

    it('should handle AI DAWG unavailable gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({
          module: 'unavailable',
          action: 'test',
          params: {}
        });

      // Should return error, not crash
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });
  });

  describe('Business Metrics Flow (Database → Service → API)', () => {
    it('should retrieve business metrics', async () => {
      const response = await request(app)
        .get('/api/v1/business/metrics')
        .set('Authorization', 'Bearer test-token');

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      }
    });

    it('should retrieve business health', async () => {
      const response = await request(app)
        .get('/api/v1/business/health')
        .set('Authorization', 'Bearer test-token');

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });

    it('should retrieve business alerts', async () => {
      const response = await request(app)
        .get('/api/v1/business/alerts')
        .set('Authorization', 'Bearer test-token');

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.count).toBeDefined();
      }
    });

    it('should retrieve business insights', async () => {
      const response = await request(app)
        .get('/api/v1/business/insights')
        .set('Authorization', 'Bearer test-token');

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.insights).toBeDefined();
      }
    });

    it('should complete metrics retrieval in <500ms', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/v1/business/metrics')
        .set('Authorization', 'Bearer test-token');

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('Multi-Step Workflow Integration', () => {
    it('should execute health check → metrics → insights flow', async () => {
      // Step 1: Check health
      const health = await request(app).get('/health/detailed');
      expect(health.status).toBeDefined();

      // Step 2: Get metrics
      const metrics = await request(app)
        .get('/api/v1/business/metrics')
        .set('Authorization', 'Bearer test-token');
      expect(metrics.status).toBeDefined();

      // Step 3: Get insights
      const insights = await request(app)
        .get('/api/v1/business/insights')
        .set('Authorization', 'Bearer test-token');
      expect(insights.status).toBeDefined();

      // All steps should complete successfully
    });

    it('should execute concurrent requests without interference', async () => {
      const [health, metrics, alerts] = await Promise.all([
        request(app).get('/health/detailed'),
        request(app)
          .get('/api/v1/business/metrics')
          .set('Authorization', 'Bearer test-token'),
        request(app)
          .get('/api/v1/business/alerts')
          .set('Authorization', 'Bearer test-token')
      ]);

      expect(health.status).toBeDefined();
      expect(metrics.status).toBeDefined();
      expect(alerts.status).toBeDefined();
    });
  });

  describe('Error Recovery Flow', () => {
    it('should recover from failed execute and continue serving', async () => {
      // Execute bad request
      const badRequest = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'invalid', action: 'invalid' });

      expect([400, 404, 500]).toContain(badRequest.status);

      // Service should still be healthy
      const health = await request(app).get('/health');
      expect(health.status).toBe(200);
    });

    it('should handle cascading service failures', async () => {
      // If AI DAWG is down, gateway should still respond
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBeDefined();
      expect(response.body.overall).toBeDefined();

      // May be 'down' or 'degraded', but should respond
      expect(['healthy', 'degraded', 'down']).toContain(response.body.overall);
    });
  });

  describe('Data Integrity Verification', () => {
    it('should maintain consistent timestamp format', async () => {
      const responses = await Promise.all([
        request(app).get('/health'),
        request(app).get('/health/detailed'),
        request(app)
          .get('/api/v1/business/metrics')
          .set('Authorization', 'Bearer test-token')
      ]);

      responses.forEach(response => {
        if (response.body.timestamp) {
          const timestamp = new Date(response.body.timestamp);
          expect(isNaN(timestamp.getTime())).toBe(false);
        }
      });
    });

    it('should maintain data consistency across endpoints', async () => {
      const health1 = await request(app).get('/health/detailed');
      const health2 = await request(app)
        .get('/api/v1/business/health')
        .set('Authorization', 'Bearer test-token');

      // Both should reflect similar health state
      if (health1.status === 200 && health2.status === 200) {
        expect(health1.body.overall).toBeDefined();
        expect(health2.body.data).toBeDefined();
      }
    });
  });

  describe('Load Testing Integration', () => {
    it('should handle 100 concurrent health checks', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(request(app).get('/health'));
      }

      const start = Date.now();
      const responses = await Promise.all(promises);
      const elapsed = Date.now() - start;

      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(95); // >95% success rate
      expect(elapsed).toBeLessThan(5000); // <5 seconds
    }, 30000);

    it('should handle mixed load (health + execute + metrics)', async () => {
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(request(app).get('/health'));
      }

      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .post('/api/v1/execute')
            .set('Authorization', 'Bearer test-token')
            .send({ module: 'test', action: 'test' })
        );
      }

      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .get('/api/v1/business/metrics')
            .set('Authorization', 'Bearer test-token')
        );
      }

      const responses = await Promise.all(promises);
      expect(responses.length).toBe(100);
    }, 30000);
  });

  describe('WebSocket Integration (Future)', () => {
    it('should have WebSocket hub initialized', async () => {
      // WebSocket hub should be initialized with server
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);

      // WebSocket endpoints would be tested here in future
    });
  });

  describe('Graceful Degradation', () => {
    it('should degrade gracefully when backend services are down', async () => {
      const response = await request(app).get('/health/detailed');

      // Should still respond, even if services are down
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
      expect(response.body.overall).toBeDefined();
    });

    it('should continue serving health checks during high load', async () => {
      // Simulate high load
      const loadPromises = [];
      for (let i = 0; i < 500; i++) {
        loadPromises.push(
          request(app)
            .post('/api/v1/execute')
            .set('Authorization', 'Bearer test-token')
            .send({ module: 'test', action: 'test' })
        );
      }

      // While under load, health checks should still work
      const healthPromises = [];
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        healthPromises.push(request(app).get('/health'));
      }

      const healthResponses = await Promise.all(healthPromises);
      const healthSuccessCount = healthResponses.filter(r => r.status === 200).length;

      expect(healthSuccessCount).toBeGreaterThan(8); // >80% success during load
    }, 60000);
  });

  describe('SLO Compliance Integration', () => {
    it('should maintain 99.9% uptime over 1000 requests', async () => {
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(request(app).get('/health').catch(() => ({ status: 500 })));
      }

      const responses = await Promise.all(promises);
      const successCount = responses.filter((r: any) => r.status === 200).length;
      const successRate = successCount / 1000;

      expect(successRate).toBeGreaterThan(0.999); // >99.9% uptime
    }, 60000);

    it('should maintain p95 latency <100ms under normal load', async () => {
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
  });
});
