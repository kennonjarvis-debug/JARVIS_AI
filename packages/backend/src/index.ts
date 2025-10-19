/**
 * JARVIS Backend API
 * Express server for integration management and automation
 */

/**
 * Load environment variables BEFORE any other imports
 */
import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { Logger } from '@jarvis/shared';
import integrationRoutes from './routes/integrations.js';
import authRoutes from './routes/auth.js';
import stripeRoutes from './routes/stripe.js';
import { integrationManager } from './services/IntegrationManager.js';
import { TwitterIntegration } from './integrations/twitter/index.js';
import { IMessageIntegration } from './integrations/imessage/index.js';
import { NotesIntegration } from './integrations/notes/index.js';
import { VoiceMemosIntegration } from './integrations/voice-memos/index.js';

// Register integrations after dotenv is loaded
integrationManager.registerIntegration('twitter', TwitterIntegration);
integrationManager.registerIntegration('imessage', IMessageIntegration);
integrationManager.registerIntegration('notes', NotesIntegration);
integrationManager.registerIntegration('voice-memos', VoiceMemosIntegration);

const app = express();
const logger = new Logger('JARVIS-API');
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Stripe webhook needs raw body for signature verification
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON middleware for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API version endpoint
app.get('/api/version', (_req: Request, res: Response) => {
  res.json({
    version: '0.1.0',
    name: 'JARVIS API',
    description: 'Autonomous business operations platform',
  });
});

// OAuth routes
app.use('/api/auth', authRoutes);

// Integration routes
app.use('/api/integrations', integrationRoutes);

// Stripe subscription routes
app.use('/api/stripe', stripeRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 JARVIS API listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
