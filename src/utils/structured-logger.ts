/**
 * Structured Logger with Correlation IDs
 *
 * Features:
 * - Correlation ID tracking across async operations
 * - Structured JSON logging
 * - AWS CloudWatch compatible
 * - Request tracing across services
 *
 * AWS Integration: Logs automatically sent to CloudWatch Logs
 */

import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

// Context storage for correlation IDs
const asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();

interface LogContext {
  correlationId?: string;
  userId?: string;
  domain?: string;
  taskId?: string;
  service?: string;
  requestId?: string;
  sessionId?: string;
  [key: string]: any;
}

export class StructuredLogger {
  private logger: winston.Logger;

  constructor() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const environment = process.env.NODE_ENV || 'development';
    const isProduction = environment === 'production';

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'jarvis-control-plane',
        environment,
        version: process.env.APP_VERSION || '2.0.0'
      },
      transports: [
        // Console transport (for CloudWatch in AWS)
        new winston.transports.Console({
          format: isProduction
            ? winston.format.json() // JSON for CloudWatch
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  const correlationId = meta.correlationId || 'N/A';
                  const service = meta.service || 'jarvis';

                  // Remove internal fields from meta display
                  const { service: _, environment: __, version: ___, ...cleanMeta } = meta;
                  const metaStr = Object.keys(cleanMeta).length > 1
                    ? JSON.stringify(cleanMeta)
                    : '';

                  return `${timestamp} [${level}] [${service}] [${correlationId}] ${message} ${metaStr}`;
                })
              )
        })
      ]
    });

    // Add file transports for local development
    if (!isProduction) {
      this.logger.add(new winston.transports.File({
        filename: 'logs/jarvis-error.log',
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5
      }));

      this.logger.add(new winston.transports.File({
        filename: 'logs/jarvis-combined.log',
        maxsize: 10485760,
        maxFiles: 5
      }));
    }
  }

  /**
   * Get current context from async local storage
   */
  private getContext(): LogContext {
    const store = asyncLocalStorage.getStore();
    return store ? Object.fromEntries(store) : {};
  }

  /**
   * Log info message
   */
  info(message: string, meta: Record<string, any> = {}) {
    const context = this.getContext();
    this.logger.info(message, { ...context, ...meta });
  }

  /**
   * Log error message
   */
  error(message: string, meta: Record<string, any> = {}) {
    const context = this.getContext();
    this.logger.error(message, { ...context, ...meta });
  }

  /**
   * Log warning message
   */
  warn(message: string, meta: Record<string, any> = {}) {
    const context = this.getContext();
    this.logger.warn(message, { ...context, ...meta });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta: Record<string, any> = {}) {
    const context = this.getContext();
    this.logger.debug(message, { ...context, ...meta });
  }

  /**
   * Run code with correlation context
   */
  withCorrelation<T>(correlationId: string, fn: () => T | Promise<T>): T | Promise<T> {
    const store = new Map();
    store.set('correlationId', correlationId);
    store.set('timestamp', new Date().toISOString());
    return asyncLocalStorage.run(store, fn);
  }

  /**
   * Add context to current correlation
   */
  addContext(key: string, value: any) {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.set(key, value);
    }
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined {
    const store = asyncLocalStorage.getStore();
    return store?.get('correlationId');
  }

  /**
   * Create child logger with fixed context
   */
  child(context: Record<string, any>): StructuredLogger {
    const childLogger = new StructuredLogger();

    // Override methods to include fixed context
    const originalInfo = childLogger.info.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalDebug = childLogger.debug.bind(childLogger);

    childLogger.info = (message: string, meta: Record<string, any> = {}) => {
      originalInfo(message, { ...context, ...meta });
    };

    childLogger.error = (message: string, meta: Record<string, any> = {}) => {
      originalError(message, { ...context, ...meta });
    };

    childLogger.warn = (message: string, meta: Record<string, any> = {}) => {
      originalWarn(message, { ...context, ...meta });
    };

    childLogger.debug = (message: string, meta: Record<string, any> = {}) => {
      originalDebug(message, { ...context, ...meta });
    };

    return childLogger;
  }

  /**
   * Start timing an operation
   */
  startTimer(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration, label });
    };
  }

  /**
   * Log with performance metrics
   */
  async withPerformanceLogging<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    this.debug(`Starting: ${operation}`);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      this.info(`Completed: ${operation}`, {
        duration,
        memoryDelta,
        operation
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.error(`Failed: ${operation}`, {
        duration,
        error: error.message,
        stack: error.stack,
        operation
      });

      throw error;
    }
  }
}

/**
 * Create correlation ID from request or generate new one
 */
export function generateCorrelationId(prefix: string = 'req'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Middleware helper for Express
 */
export function correlationMiddleware(logger: StructuredLogger) {
  return (req: any, res: any, next: any) => {
    const correlationId =
      req.headers['x-correlation-id'] as string ||
      req.headers['x-request-id'] as string ||
      generateCorrelationId('req');

    // Add to response headers
    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Request-ID', correlationId);

    // Run request in correlation context
    logger.withCorrelation(correlationId, () => {
      logger.addContext('method', req.method);
      logger.addContext('path', req.path);
      logger.addContext('ip', req.ip || req.connection.remoteAddress);
      logger.addContext('userAgent', req.headers['user-agent']);

      // Log request
      logger.info(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
      });

      // Track response
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;

        logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('content-length')
        });
      });

      next();
    });
  };
}

// Singleton instance (backward compatible with existing logger)
export const logger = new StructuredLogger();

// Named export for new code
export default StructuredLogger;
