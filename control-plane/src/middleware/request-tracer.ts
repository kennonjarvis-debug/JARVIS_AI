import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../services/logger.service.js';

// Extend Express Request to include tracing data
declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
      tracing?: RequestTracing;
    }
  }
}

export interface RequestTracing {
  requestId: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  method: string;
  url: string;
  startTime: number;
  spans: TraceSpan[];
  metadata: Record<string, any>;
}

export interface TraceSpan {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Request tracing middleware
 * Generates unique request IDs and tracks request flow
 */
export function requestTracer(req: Request, res: Response, next: NextFunction) {
  // Generate or use existing request ID
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  req.id = requestId;
  req.startTime = Date.now();

  // Initialize tracing
  req.tracing = {
    requestId,
    userId: (req as any).user?.id,
    ip: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'],
    method: req.method,
    url: req.originalUrl || req.url,
    startTime: req.startTime,
    spans: [],
    metadata: {},
  };

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Create logger with request context
  const logger = new Logger({
    requestId,
    userId: (req as any).user?.id,
  });

  // Attach logger to request
  (req as any).logger = logger;

  // Log request start
  logger.info('Request started', {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.tracing.ip,
    userAgent: req.tracing.userAgent,
  });

  // Track response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - req.startTime!;

    // Log request completion
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration,
    });

    // Restore original send
    res.send = originalSend;
    return originalSend.call(this, body);
  };

  next();
}

/**
 * Create a trace span for a specific operation
 */
export function createSpan(req: Request, name: string, metadata?: Record<string, any>): () => void {
  if (!req.tracing) {
    return () => {}; // No-op if tracing not initialized
  }

  const span: TraceSpan = {
    name,
    startTime: Date.now(),
    metadata,
  };

  req.tracing.spans.push(span);

  // Return function to end span
  return (error?: Error) => {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;

    if (error) {
      span.error = {
        message: error.message,
        stack: error.stack,
      };
    }
  };
}

/**
 * Middleware to create automatic spans for route handlers
 */
export function spanMiddleware(spanName?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const name = spanName || `${req.method} ${req.route?.path || req.path}`;
    const endSpan = createSpan(req, name);

    // End span on response finish
    res.on('finish', () => {
      if (res.statusCode >= 400) {
        endSpan(new Error(`HTTP ${res.statusCode}`));
      } else {
        endSpan();
      }
    });

    next();
  };
}

/**
 * Get tracing data from request
 */
export function getTracing(req: Request): RequestTracing | undefined {
  return req.tracing;
}

/**
 * Add metadata to current trace
 */
export function addTracingMetadata(req: Request, key: string, value: any) {
  if (req.tracing) {
    req.tracing.metadata[key] = value;
  }
}

/**
 * Database query span wrapper
 */
export async function traceDbQuery<T>(
  req: Request,
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const endSpan = createSpan(req, `DB: ${operation} ${table}`, {
    operation,
    table,
  });

  try {
    const result = await queryFn();
    endSpan();
    return result;
  } catch (error) {
    endSpan(error as Error);
    throw error;
  }
}

/**
 * Redis command span wrapper
 */
export async function traceRedisCommand<T>(
  req: Request,
  command: string,
  commandFn: () => Promise<T>
): Promise<T> {
  const endSpan = createSpan(req, `Redis: ${command}`, {
    command,
  });

  try {
    const result = await commandFn();
    endSpan();
    return result;
  } catch (error) {
    endSpan(error as Error);
    throw error;
  }
}

/**
 * External API call span wrapper
 */
export async function traceExternalCall<T>(
  req: Request,
  service: string,
  endpoint: string,
  callFn: () => Promise<T>
): Promise<T> {
  const endSpan = createSpan(req, `External: ${service}`, {
    service,
    endpoint,
  });

  try {
    const result = await callFn();
    endSpan();
    return result;
  } catch (error) {
    endSpan(error as Error);
    throw error;
  }
}

/**
 * Generic operation span wrapper
 */
export async function traceOperation<T>(
  req: Request,
  operationName: string,
  operationFn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const endSpan = createSpan(req, operationName, metadata);

  try {
    const result = await operationFn();
    endSpan();
    return result;
  } catch (error) {
    endSpan(error as Error);
    throw error;
  }
}

/**
 * Get performance summary from tracing data
 */
export function getPerformanceSummary(req: Request): {
  totalDuration: number;
  spans: { name: string; duration: number; error?: string }[];
  slowestSpans: { name: string; duration: number }[];
} {
  if (!req.tracing || !req.startTime) {
    return {
      totalDuration: 0,
      spans: [],
      slowestSpans: [],
    };
  }

  const totalDuration = Date.now() - req.startTime;
  const spans = req.tracing.spans.map(span => ({
    name: span.name,
    duration: span.duration || 0,
    error: span.error?.message,
  }));

  const slowestSpans = [...spans]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  return {
    totalDuration,
    spans,
    slowestSpans,
  };
}

/**
 * Middleware to log slow requests
 */
export function slowRequestLogger(threshold: number = 500) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (!req.startTime) return;

      const duration = Date.now() - req.startTime;
      if (duration > threshold) {
        const logger = (req as any).logger || new Logger();
        const summary = getPerformanceSummary(req);

        logger.warn('Slow request detected', {
          method: req.method,
          url: req.originalUrl || req.url,
          duration,
          threshold,
          performance: summary,
        });
      }
    });

    next();
  };
}

export default requestTracer;
