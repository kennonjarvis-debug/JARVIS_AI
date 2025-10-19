/**
 * Netlify Function - API Gateway
 * Wraps the Express backend for serverless deployment
 */

import express, { Request, Response } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import integrationRoutes from '../../packages/backend/src/routes/integrations.js';
import authRoutes from '../../packages/backend/src/routes/auth.js';
import stripeRoutes from '../../packages/backend/src/routes/stripe.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://jarvis-ai.co',
  credentials: true,
}));

// Stripe webhook needs raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON middleware for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/stripe', stripeRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

// Export as serverless function
export const handler = serverless(app);
