/**
 * Integration Tests: API Gateway
 *
 * Tests for the Jarvis API Gateway endpoints and integration flows
 */

import request from 'supertest';
import express from 'express';
import { ModuleRouter } from '../../src/core/module-router.js';
import { HealthAggregator } from '../../src/core/health-aggregator.js';

// Mock dependencies
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../src/core/business-intelligence.js', () => ({
  businessIntelligence: {
    trackRequest: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
    }),
  },
}));

describe('API Gateway Integration Tests', () => {
  let app: express.Application;
  let moduleRouter: ModuleRouter;
  let healthAggregator: HealthAggregator;

  beforeAll(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Initialize services
    moduleRouter = new ModuleRouter();
    healthAggregator = new HealthAggregator();
  });

  afterAll(() => {
    // Cleanup
    jest.clearAllMocks();
  });

  describe('Health Check Endpoints', () => {
    beforeAll(() => {
      // Setup health check routes
      app.get('/api/health', (req, res) => {
        res.json({
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'test',
        });
      });

      app.get('/api/health/detailed', async (req, res) => {
        try {
          const healthStatus = await healthAggregator.getAggregatedHealth();
          res.json({
            success: true,
            ...healthStatus,
          });
        } catch (error: any) {
          res.status(500).json({
            success: false,
            error: error.message,
          });
        }
      });
    });

    it('should return basic health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        status: 'healthy',
        environment: 'test',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should return detailed health status', async () => {
      // Mock health aggregator response
      jest.spyOn(healthAggregator, 'getAggregatedHealth').mockResolvedValue({
        overall: 'healthy',
        services: {
          gateway: { status: 'healthy', uptime: 100 },
          database: { status: 'healthy', latency: 10 },
        },
        timestamp: new Date().toISOString(),
      });

      const response = await request(app).get('/api/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        overall: 'healthy',
        services: expect.any(Object),
      });
    });

    it('should handle health check errors gracefully', async () => {
      jest
        .spyOn(healthAggregator, 'getAggregatedHealth')
        .mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app).get('/api/health/detailed');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Service unavailable',
      });
    });
  });

  describe('Authentication Middleware', () => {
    beforeAll(() => {
      // Setup protected route
      const authMiddleware = (req: any, res: any, next: any) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
          return res.status(401).json({
            success: false,
            error: 'Missing authentication token',
          });
        }

        if (token !== 'test-token') {
          return res.status(403).json({
            success: false,
            error: 'Invalid authentication token',
          });
        }

        next();
      };

      app.get('/api/protected', authMiddleware, (req, res) => {
        res.json({
          success: true,
          message: 'Access granted',
        });
      });
    });

    it('should reject requests without authentication token', async () => {
      const response = await request(app).get('/api/protected');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Missing authentication token',
      });
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid authentication token',
      });
    });

    it('should allow requests with valid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Access granted',
      });
    });
  });

  describe('Error Handling', () => {
    beforeAll(() => {
      // Setup error routes
      app.get('/api/error/500', (req, res) => {
        throw new Error('Internal server error');
      });

      app.get('/api/error/custom', (req, res) => {
        res.status(400).json({
          success: false,
          error: 'Bad request',
          details: 'Missing required parameters',
        });
      });

      // Global error handler
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({
          success: false,
          error: err.message || 'Internal server error',
        });
      });
    });

    it('should handle custom error responses', async () => {
      const response = await request(app).get('/api/error/custom');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Bad request',
        details: 'Missing required parameters',
      });
    });

    it('should handle thrown errors with global handler', async () => {
      const response = await request(app).get('/api/error/500');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('Request/Response Flow', () => {
    beforeAll(() => {
      // Setup test routes
      app.post('/api/command', (req, res) => {
        const { command, parameters } = req.body;

        if (!command) {
          return res.status(400).json({
            success: false,
            error: 'Command is required',
          });
        }

        res.json({
          success: true,
          command,
          parameters: parameters || {},
          executedAt: new Date().toISOString(),
        });
      });
    });

    it('should accept and process valid POST requests', async () => {
      const commandData = {
        command: 'test-command',
        parameters: { foo: 'bar' },
      };

      const response = await request(app)
        .post('/api/command')
        .send(commandData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        command: 'test-command',
        parameters: { foo: 'bar' },
      });
      expect(response.body.executedAt).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/command')
        .send({ parameters: { foo: 'bar' } })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Command is required',
      });
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/command')
        .send({})
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });

  describe('Module Router Integration', () => {
    it('should route commands to appropriate modules', async () => {
      const routeSpy = jest.spyOn(moduleRouter, 'route').mockResolvedValue({
        success: true,
        module: 'test-module',
        result: { data: 'test' },
      });

      app.post('/api/route', async (req, res) => {
        try {
          const result = await moduleRouter.route(req.body.command, req.body);
          res.json(result);
        } catch (error: any) {
          res.status(500).json({
            success: false,
            error: error.message,
          });
        }
      });

      const response = await request(app)
        .post('/api/route')
        .send({ command: 'test', data: 'value' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        module: 'test-module',
        result: { data: 'test' },
      });

      expect(routeSpy).toHaveBeenCalledWith('test', {
        command: 'test',
        data: 'value',
      });

      routeSpy.mockRestore();
    });
  });

  describe('CORS and Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should accept JSON content type', async () => {
      const response = await request(app)
        .post('/api/command')
        .send({ command: 'test' })
        .set('Content-Type', 'application/json');

      expect(response.status).not.toBe(415); // Not "Unsupported Media Type"
    });
  });
});
