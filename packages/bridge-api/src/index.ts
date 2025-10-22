import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './utils/config';
import { Logger } from './utils/logger';
import { authenticate } from './middleware/auth';
import { healthCheck } from './routes/health';
import { runCommand } from './routes/run';
import { readFile } from './routes/read';
import { writeFile } from './routes/write';

// Validate configuration on startup
try {
  validateConfig();
  Logger.info('Configuration validated successfully');
} catch (error) {
  Logger.error('Configuration validation failed', error);
  process.exit(1);
}

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => {
        Logger.info(message.trim(), { source: 'http' });
      },
    },
  })
);

// Routes
app.get('/health', healthCheck);
app.post('/run', authenticate, runCommand);
app.post('/read', authenticate, readFile);
app.post('/write', authenticate, writeFile);

// 404 handler
app.use((req: Request, res: Response) => {
  Logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  Logger.error('Unhandled error', err, {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
});

// Start server
const server = app.listen(config.port, () => {
  Logger.info('JARVIS Bridge API started', {
    port: config.port,
    environment: process.env.NODE_ENV || 'development',
    allowedCommands: config.allowedCommands.length,
    allowedPaths: config.allowedPaths.length,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    Logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    Logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
