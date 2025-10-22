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
import axios from 'axios';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { ModuleRouter } from './module-router.js';
import { HealthAggregator } from './health-aggregator.js';
import { websocketHub } from './websocket-hub.js';
import { businessOperator } from './business-operator.js';
import { businessIntelligence } from './business-intelligence.js';
import { circuitBreakerManager } from './circuit-breaker.js';
import businessRoutes from '../business/routes.js';

const app = express();
const moduleRouter = new ModuleRouter();
const healthAggregator = new HealthAggregator();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting - Increased for dashboard backend polling
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 5000 requests per windowMs (high for local dashboard)
  message: 'Too many requests from this IP',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for localhost (dashboard backend)
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';
  }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging and business intelligence tracking
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);

    // Track in business intelligence
    businessIntelligence.trackRequest(
      req.path,
      req.method,
      res.statusCode,
      duration,
      res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined
    );
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
    aiDawgBackendUrl: config.aiDawgBackendUrl,
    timestamp: new Date().toISOString()
  });
});

/**
 * Chat endpoint with direct AI model integration (fallback when AI Brain service unavailable)
 * POST /api/v1/chat
 */
app.post('/api/v1/chat', authenticate, async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Build conversation context from history
    const messages = [
      {
        role: 'system',
        content: `You are Jarvis, an intelligent AI assistant helping manage the AI DAWG system. You can help with:
- System status and health monitoring
- Business metrics and analytics
- Music generation and creative tasks
- Code optimization and suggestions
- General questions about the platform

Respond in a helpful, concise manner. Use markdown for formatting when appropriate.`
      },
      ...(conversationHistory || []).slice(-5).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Use OpenAI as primary (with fallback to Gemini if fails)
    let response;
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (openaiKey) {
      try {
        const openaiResponse = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 1000
          },
          {
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        response = openaiResponse.data.choices[0].message.content;
      } catch (openaiError: any) {
        logger.warn(`OpenAI request failed: ${openaiError.message}, falling back to Gemini`);

        // Fallback to Gemini
        if (geminiKey) {
          const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
            {
              contents: [{
                parts: [{
                  text: messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
                }]
              }]
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 30000
            }
          );

          response = geminiResponse.data.candidates[0].content.parts[0].text;
        } else {
          throw openaiError;
        }
      }
    } else if (geminiKey) {
      // Use Gemini if OpenAI not available
      const geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
        {
          contents: [{
            parts: [{
              text: messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
            }]
          }]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      response = geminiResponse.data.candidates[0].content.parts[0].text;
    } else {
      // No API keys available - return mock response
      response = `I'm Jarvis, your AI assistant. I received your message: "${message}"\n\nI'm currently running in demo mode. To enable full AI chat capabilities, please configure OpenAI or Gemini API keys in your .env file.\n\nHow can I help you with your AI DAWG system?`;
    }

    res.json({
      success: true,
      data: {
        response
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error(`Chat request failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Chat request failed',
      message: error.message
    });
  }
});

/**
 * Business Metrics
 * GET /api/v1/business/metrics
 * Returns current business metrics (uptime, performance, costs, users)
 */
app.get('/api/v1/business/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    const metrics = await businessOperator.getCurrentMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Failed to get business metrics: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
      message: error.message
    });
  }
});

/**
 * Business Alerts
 * GET /api/v1/business/alerts
 * Returns recent service alerts
 */
app.get('/api/v1/business/alerts', authenticate, (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = businessOperator.getAlerts(limit);
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Failed to get alerts: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
      message: error.message
    });
  }
});

/**
 * Business Health
 * GET /api/v1/business/health
 * Returns current health status of all AI DAWG services
 */
app.get('/api/v1/business/health', authenticate, async (req: Request, res: Response) => {
  try {
    const health = await businessOperator.getCurrentHealth();
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Failed to get business health: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get health status',
      message: error.message
    });
  }
});

/**
 * Business Insights
 * GET /api/v1/business/insights
 * Returns AI-generated business insights
 */
app.get('/api/v1/business/insights', authenticate, (req: Request, res: Response) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 60;
    const insights = businessIntelligence.getInsights(timeWindow);
    res.json({
      success: true,
      data: {
        insights,
        timeWindow,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error(`Failed to get business insights: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get insights',
      message: error.message
    });
  }
});

// Business Assistant Routes
app.use('/api/v1', businessRoutes);

/**
 * Circuit Breakers Status
 * GET /api/v1/circuit-breakers
 * Returns status of all circuit breakers
 */
app.get('/api/v1/circuit-breakers', authenticate, (req: Request, res: Response) => {
  try {
    const statuses = circuitBreakerManager.getAllStatuses();
    res.json({
      success: true,
      data: statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Failed to get circuit breaker statuses: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit breaker statuses',
      message: error.message
    });
  }
});

/**
 * Reset Circuit Breaker
 * POST /api/v1/circuit-breakers/:service/reset
 * Manually reset a circuit breaker to closed state
 */
app.post('/api/v1/circuit-breakers/:service/reset', authenticate, async (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const breaker = circuitBreakerManager.getBreaker(service);

    if (!breaker) {
      return res.status(404).json({
        success: false,
        error: 'Circuit breaker not found',
        message: `No circuit breaker found for service: ${service}`
      });
    }

    await breaker.reset();

    logger.info(`Circuit breaker reset manually: ${service}`);

    res.json({
      success: true,
      message: `Circuit breaker for ${service} has been reset`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Failed to reset circuit breaker: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breaker',
      message: error.message
    });
  }
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

// Server instance for managing lifecycle
let serverInstance: any = null;

export function startServer() {
  if (serverInstance) {
    logger.warn('Server is already running');
    return serverInstance;
  }

  serverInstance = app.listen(config.port, () => {
    logger.info(`🚀 Jarvis Control Plane started on port ${config.port}`);
    logger.info(`📡 AI Dawg Backend: ${config.aiDawgBackendUrl}`);
    logger.info(`🔐 Auth: ${config.authToken === 'test-token' ? 'Development mode' : 'Production mode'}`);

    // Initialize WebSocket Hub
    websocketHub.initialize(serverInstance);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await stopServer();
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await stopServer();
  });

  return serverInstance;
}

export async function stopServer() {
  if (!serverInstance) {
    return;
  }

  await websocketHub.shutdown();

  return new Promise<void>((resolve) => {
    serverInstance.close(() => {
      logger.info('Server closed');
      serverInstance = null;
      resolve();
    });
  });
}

// Legacy alias for backward compatibility
export function startGateway() {
  return startServer();
}

// Named exports for testing
export { app };

export default app;

// Note: Server is started by src/main.ts or by test suites
// To run this file directly, use: tsx src/core/gateway.ts
// Uncomment the following line if you want to run this file standalone:
// startServer();
