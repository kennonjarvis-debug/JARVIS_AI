#!/usr/bin/env tsx
/**
 * Jarvis API Gateway
 * Central control plane for routing commands to AI Dawg execution engine
 * Port: 4000
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { ModuleRouter } from './module-router.js';
import { HealthAggregator } from './health-aggregator.js';

const app = express();
const moduleRouter = new ModuleRouter();
const healthAggregator = new HealthAggregator();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Missing authentication token',
      message: 'Please provide a Bearer token in the Authorization header'
    });
  }

  if (token !== config.authToken && config.nodeEnv !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }

  next();
};

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health Check - Basic
 * GET /health
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'jarvis-control-plane',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    port: config.port
  });
});

/**
 * Health Check - Detailed
 * GET /health/detailed
 * Returns aggregated health of all services
 */
app.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const health = await healthAggregator.checkAll();
    const statusCode = health.overall === 'healthy' ? 200 :
                       health.overall === 'degraded' ? 207 : 503;

    res.status(statusCode).json(health);
  } catch (error: any) {
    logger.error(`Health check failed: ${error.message}`);
    res.status(500).json({
      overall: 'down',
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Module Execution
 * POST /api/v1/execute
 * Routes commands to AI Dawg execution engine
 */
app.post('/api/v1/execute', authenticate, async (req: Request, res: Response) => {
  try {
    const { module, action, params } = req.body;

    if (!module || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'module and action are required'
      });
    }

    logger.info(`Executing command: ${module}.${action}`);

    const result = await moduleRouter.execute({
      module,
      action,
      params: params || {}
    });

    res.json(result);
  } catch (error: any) {
    logger.error(`Module execution failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Execution failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Status endpoint
 * GET /status
 * Returns current Jarvis controller status
 */
app.get('/status', authenticate, (req: Request, res: Response) => {
  res.json({
    status: 'active',
    controller: 'running',
    port: config.port,
    environment: config.nodeEnv,
    aiDawgBackend: config.aiDawgBackendUrl,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'An error occurred'
  });
});

// ============================================================================
// SERVER START
// ============================================================================

export function startGateway() {
  const server = app.listen(config.port, () => {
    logger.info(`🚀 Jarvis Control Plane started on port ${config.port}`);
    logger.info(`📡 AI Dawg Backend: ${config.aiDawgBackendUrl}`);
    logger.info(`🔐 Auth: ${config.authToken === 'test-token' ? 'Development mode' : 'Production mode'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  return server;
}

export default app;
