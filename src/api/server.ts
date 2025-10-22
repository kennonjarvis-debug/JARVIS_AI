/**
 * API Server for Jarvis Observatory Dashboard
 * Provides REST endpoints for agent activity monitoring
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { createAPIRoutes } from './routes.js';
import { Logger } from '../utils/logger.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const logger = new Logger('API:Server');

const PORT = process.env.API_PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment');
}

export async function startAPIServer() {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [
        'http://localhost:5174',
        'http://localhost:5173',
        'http://localhost:3000',
      ],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      query: req.query,
      body: req.method === 'POST' || req.method === 'PATCH' ? req.body : undefined,
    });
    next();
  });

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Mount API routes
  const apiRoutes = createAPIRoutes(supabase);
  app.use('/api', apiRoutes);

  // API Documentation (Swagger UI)
  try {
    const swaggerDocument = YAML.load(join(__dirname, '../../docs/api/openapi.yaml'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'JARVIS API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
    }));
    logger.info('📚 API Documentation available at /api-docs');
  } catch (error) {
    logger.warn('Could not load OpenAPI spec - /api-docs will not be available', error);
  }

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'Jarvis API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      documentation: '/api-docs',
      endpoints: {
        activities: '/api/agents/activities',
        metrics: '/api/agents/metrics',
        approvalQueue: '/api/agents/approval-queue',
        health: '/api/health',
      },
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.path,
    });
  });

  // Start server
  return new Promise<{ app: express.Application; server: any }>((resolve) => {
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Jarvis API Server running on http://localhost:${PORT}`);
      logger.info(`📊 Observatory Dashboard: http://localhost:5174`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`📡 API Endpoints:`);
      logger.info(`   - GET  /api/agents/activities`);
      logger.info(`   - GET  /api/agents/metrics`);
      logger.info(`   - GET  /api/agents/approval-queue`);
      logger.info(`   - POST /api/agents/approve/:id`);
      logger.info(`   - POST /api/agents/reject/:id`);
      logger.info(`   - GET  /api/health`);

      resolve({ app, server });
    });
  });
}

// Run standalone if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  startAPIServer().catch((error) => {
    logger.error('Failed to start API server', error);
    process.exit(1);
  });
}
