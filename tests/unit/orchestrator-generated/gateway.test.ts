/**
 * Unit Tests for Gateway (Express API)
 * Tests routing, authentication, error handling, and business endpoints
 */

import request from 'supertest';
import express from 'express';
import { config } from '../../../src/utils/config';
import { logger } from '../../../src/utils/logger';
import { ModuleRouter } from '../../../src/core/module-router';
import { HealthAggregator } from '../../../src/core/health-aggregator';
import { businessOperator } from '../../../src/core/business-operator';
import { businessIntelligence } from '../../../src/core/business-intelligence';

// Mock all dependencies
jest.mock('../../../src/utils/config');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/core/module-router');
jest.mock('../../../src/core/health-aggregator');
jest.mock('../../../src/core/business-operator');
jest.mock('../../../src/core/business-intelligence');
jest.mock('../../../src/core/websocket-hub');

const mockedConfig = config as jest.Mocked<typeof config>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedBusinessOperator = businessOperator as jest.Mocked<typeof businessOperator>;
const mockedBusinessIntelligence = businessIntelligence as jest.Mocked<typeof businessIntelligence>;

describe('Gateway API', () => {
  let app: express.Application;
  let mockModuleRouter: jest.Mocked<ModuleRouter>;
  let mockHealthAggregator: jest.Mocked<HealthAggregator>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup config mocks
    mockedConfig.port = 4000;
    mockedConfig.authToken = 'test-token';
    mockedConfig.nodeEnv = 'test';
    mockedConfig.aiDawgBackendUrl = 'http://localhost:3001';

    // Setup logger mocks
    mockedLogger.info = jest.fn();
    mockedLogger.error = jest.fn();
    mockedLogger.warn = jest.fn();

    // Setup module router mock
    mockModuleRouter = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        data: { result: 'test' },
        timestamp: new Date().toISOString()
      })
    } as any;

    // Setup health aggregator mock
    mockHealthAggregator = {
      checkAll: jest.fn().mockResolvedValue({
        overall: 'healthy',
        services: {
          aiDawgBackend: { status: 'healthy' },
          aiDawgDocker: { status: 'healthy' },
          vocalCoach: { status: 'healthy' },
          producer: { status: 'healthy' },
          aiBrain: { status: 'healthy' },
          postgres: { status: 'healthy' },
          redis: { status: 'healthy' }
        },
        timestamp: new Date().toISOString()
      })
    } as any;

    // Mock constructors
    (ModuleRouter as jest.MockedClass<typeof ModuleRouter>).mockImplementation(() => mockModuleRouter);
    (HealthAggregator as jest.MockedClass<typeof HealthAggregator>).mockImplementation(() => mockHealthAggregator);

    // Setup business operator mocks
    mockedBusinessOperator.getCurrentMetrics = jest.fn().mockResolvedValue({
      uptime: { overall: 3600, byService: {} },
      performance: { responseTime: {}, requestsPerMinute: 10, errorRate: 0.01 },
      costs: { total: 5.50, aiApiCalls: { openai: 2.50, anthropic: 2.00, gemini: 1.00 } },
      users: { active: 5, sessions: 10, newUsers: 2 },
      timestamp: new Date().toISOString()
    });

    mockedBusinessOperator.getAlerts = jest.fn().mockReturnValue([]);
    mockedBusinessOperator.getCurrentHealth = jest.fn().mockResolvedValue({
      overall: 'healthy',
      services: {
        aiDawgBackend: { status: 'healthy' },
        aiDawgDocker: { status: 'healthy' },
        vocalCoach: { status: 'healthy' },
        producer: { status: 'healthy' },
        aiBrain: { status: 'healthy' },
        postgres: { status: 'healthy' },
        redis: { status: 'healthy' }
      },
      timestamp: new Date().toISOString()
    });

    // Setup business intelligence mocks
    mockedBusinessIntelligence.getInsights = jest.fn().mockReturnValue([
      '10 AI API calls in last 60min ($5.50)',
      '5 active sessions (10 total)'
    ]);

    mockedBusinessIntelligence.trackRequest = jest.fn();

    // Import app after mocks are setup
    jest.resetModules();
    app = require('../../../src/core/gateway').default;
  });

  describe('GET /health', () => {
    it('should return 200 with health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('service', 'jarvis-control-plane');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should not require authentication', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
    });

    it('should include port in response', async () => {
      const res = await request(app).get('/health');

      expect(res.body).toHaveProperty('port', 4000);
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health status', async () => {
      const res = await request(app).get('/health/detailed');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('overall', 'healthy');
      expect(res.body).toHaveProperty('services');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should return 207 for degraded status', async () => {
      mockHealthAggregator.checkAll.mockResolvedValueOnce({
        overall: 'degraded',
        services: {
          aiDawgBackend: { status: 'healthy' },
          aiDawgDocker: { status: 'healthy' },
          vocalCoach: { status: 'down' },
          producer: { status: 'healthy' },
          aiBrain: { status: 'healthy' },
          postgres: { status: 'healthy' },
          redis: { status: 'healthy' }
        },
        timestamp: new Date().toISOString()
      });

      const res = await request(app).get('/health/detailed');

      expect(res.status).toBe(207);
      expect(res.body.overall).toBe('degraded');
    });

    it('should return 503 for down status', async () => {
      mockHealthAggregator.checkAll.mockResolvedValueOnce({
        overall: 'down',
        services: {
          aiDawgBackend: { status: 'down' },
          aiDawgDocker: { status: 'down' },
          vocalCoach: { status: 'down' },
          producer: { status: 'down' },
          aiBrain: { status: 'down' },
          postgres: { status: 'down' },
          redis: { status: 'down' }
        },
        timestamp: new Date().toISOString()
      });

      const res = await request(app).get('/health/detailed');

      expect(res.status).toBe(503);
    });

    it('should handle health check errors', async () => {
      mockHealthAggregator.checkAll.mockRejectedValueOnce(new Error('Health check failed'));

      const res = await request(app).get('/health/detailed');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('overall', 'down');
      expect(res.body).toHaveProperty('error', 'Health check failed');
    });
  });

  describe('POST /api/v1/execute - Authentication', () => {
    it('should reject requests without token', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .send({ module: 'test', action: 'test' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Missing authentication token');
    });

    it('should reject requests with invalid token', async () => {
      mockedConfig.nodeEnv = 'production';

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer invalid-token')
        .send({ module: 'test', action: 'test' });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Invalid authentication token');
    });

    it('should accept requests with valid token', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test', action: 'test' });

      expect(res.status).toBe(200);
    });

    it('should accept any token in development mode', async () => {
      mockedConfig.nodeEnv = 'development';

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer any-token')
        .send({ module: 'test', action: 'test' });

      expect(res.status).toBe(200);
    });

    it('should handle malformed Authorization header', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'InvalidFormat')
        .send({ module: 'test', action: 'test' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/execute - Validation', () => {
    it('should reject requests without module', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ action: 'test' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing required fields');
    });

    it('should reject requests without action', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing required fields');
    });

    it('should accept requests without params', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test', action: 'test' });

      expect(res.status).toBe(200);
    });

    it('should handle empty module name', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: '', action: 'test' });

      expect(res.status).toBe(400);
    });

    it('should handle null module', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: null, action: 'test' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/execute - Execution', () => {
    it('should execute module action', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test', action: 'run', params: { key: 'value' } });

      expect(res.status).toBe(200);
      expect(mockModuleRouter.execute).toHaveBeenCalledWith({
        module: 'test',
        action: 'run',
        params: { key: 'value' }
      });
    });

    it('should return execution result', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test', action: 'test' });

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });

    it('should handle execution errors', async () => {
      mockModuleRouter.execute.mockRejectedValueOnce(new Error('Execution failed'));

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test', action: 'test' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Execution failed');
    });
  });

  describe('GET /status', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/status');

      expect(res.status).toBe(401);
    });

    it('should return status with valid token', async () => {
      const res = await request(app)
        .get('/status')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'active');
      expect(res.body).toHaveProperty('controller', 'running');
    });

    it('should include environment info', async () => {
      const res = await request(app)
        .get('/status')
        .set('Authorization', 'Bearer test-token');

      expect(res.body).toHaveProperty('environment');
      expect(res.body).toHaveProperty('aiDawgBackend');
    });
  });

  describe('GET /api/v1/business/metrics', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/v1/business/metrics');

      expect(res.status).toBe(401);
    });

    it('should return business metrics', async () => {
      const res = await request(app)
        .get('/api/v1/business/metrics')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('performance');
      expect(res.body.data).toHaveProperty('costs');
      expect(res.body.data).toHaveProperty('users');
    });

    it('should handle metrics fetch errors', async () => {
      mockedBusinessOperator.getCurrentMetrics.mockRejectedValueOnce(new Error('Metrics failed'));

      const res = await request(app)
        .get('/api/v1/business/metrics')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/business/alerts', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/v1/business/alerts');

      expect(res.status).toBe(401);
    });

    it('should return alerts', async () => {
      mockedBusinessOperator.getAlerts.mockReturnValueOnce([
        {
          service: 'vocalCoach',
          severity: 'warning',
          message: 'Service degraded',
          action: 'Monitoring',
          timestamp: new Date().toISOString()
        }
      ]);

      const res = await request(app)
        .get('/api/v1/business/alerts')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.count).toBe(1);
    });

    it('should respect limit query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/business/alerts?limit=10')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(mockedBusinessOperator.getAlerts).toHaveBeenCalledWith(10);
    });

    it('should use default limit', async () => {
      const res = await request(app)
        .get('/api/v1/business/alerts')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(mockedBusinessOperator.getAlerts).toHaveBeenCalledWith(50);
    });

    it('should handle invalid limit', async () => {
      const res = await request(app)
        .get('/api/v1/business/alerts?limit=invalid')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(mockedBusinessOperator.getAlerts).toHaveBeenCalledWith(NaN);
    });
  });

  describe('GET /api/v1/business/health', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/v1/business/health');

      expect(res.status).toBe(401);
    });

    it('should return health status', async () => {
      const res = await request(app)
        .get('/api/v1/business/health')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('overall');
      expect(res.body.data).toHaveProperty('services');
    });

    it('should handle health check errors', async () => {
      mockedBusinessOperator.getCurrentHealth.mockRejectedValueOnce(new Error('Health failed'));

      const res = await request(app)
        .get('/api/v1/business/health')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/business/insights', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/v1/business/insights');

      expect(res.status).toBe(401);
    });

    it('should return business insights', async () => {
      const res = await request(app)
        .get('/api/v1/business/insights')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('insights');
      expect(Array.isArray(res.body.data.insights)).toBe(true);
    });

    it('should respect timeWindow query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/business/insights?timeWindow=120')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(mockedBusinessIntelligence.getInsights).toHaveBeenCalledWith(120);
    });

    it('should use default timeWindow', async () => {
      const res = await request(app)
        .get('/api/v1/business/insights')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(mockedBusinessIntelligence.getInsights).toHaveBeenCalledWith(60);
    });

    it('should handle insights errors', async () => {
      mockedBusinessIntelligence.getInsights.mockImplementationOnce(() => {
        throw new Error('Insights failed');
      });

      const res = await request(app)
        .get('/api/v1/business/insights')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown/route');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Not found');
    });

    it('should include route in error message', async () => {
      const res = await request(app).get('/unknown/route');

      expect(res.body.message).toContain('/unknown/route');
      expect(res.body.message).toContain('GET');
    });
  });

  describe('Error Handler', () => {
    it('should handle unexpected errors', async () => {
      mockModuleRouter.execute.mockRejectedValueOnce(new Error('Unexpected error'));

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test', action: 'test' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });

    it('should hide error details in production', async () => {
      mockedConfig.nodeEnv = 'production';
      mockModuleRouter.execute.mockRejectedValueOnce(new Error('Secret error'));

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test', action: 'test' });

      expect(res.body.message).toBe('An error occurred');
    });

    it('should show error details in development', async () => {
      mockedConfig.nodeEnv = 'development';
      mockModuleRouter.execute.mockRejectedValueOnce(new Error('Debug error'));

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test', action: 'test' });

      expect(res.body.message).toBe('Debug error');
    });
  });

  describe('Request Logging', () => {
    it('should track requests in business intelligence', async () => {
      await request(app).get('/health');

      expect(mockedBusinessIntelligence.trackRequest).toHaveBeenCalled();
    });

    it('should log request details', async () => {
      await request(app).get('/health');

      expect(mockedLogger.info).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API routes', async () => {
      // This test would require making many requests
      // For unit testing, we just verify the middleware is applied
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test', action: 'test' });

      expect(res.headers).toHaveProperty('ratelimit-limit');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle empty request body', async () => {
      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send();

      expect(res.status).toBe(400);
    });

    it('should handle very large request bodies', async () => {
      const largeParams = { data: 'x'.repeat(10000) };

      const res = await request(app)
        .post('/api/v1/execute')
        .set('Authorization', 'Bearer test-token')
        .send({ module: 'test', action: 'test', params: largeParams });

      expect(res.status).toBeLessThan(500);
    });
  });
});
