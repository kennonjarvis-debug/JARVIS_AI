import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Log directory
const logDir = path.join(path.dirname(__dirname), '..', 'logs');

// Create transports
const transports: winston.transport[] = [];

// Console transport
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
    })
  );
}

// File transports with rotation
transports.push(
  // Error logs
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
  }),
  // Combined logs
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
  }),
  // HTTP logs
  new DailyRotateFile({
    filename: path.join(logDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Enhanced logging functions with context
export class Logger {
  private context: Record<string, any> = {};

  constructor(defaultContext?: Record<string, any>) {
    this.context = defaultContext || {};
  }

  private formatMessage(message: string, meta?: Record<string, any>): [string, Record<string, any>] {
    const combinedMeta = {
      ...this.context,
      ...meta,
      timestamp: new Date().toISOString(),
    };
    return [message, combinedMeta];
  }

  error(message: string, error?: Error | any, meta?: Record<string, any>) {
    const [msg, combinedMeta] = this.formatMessage(message, meta);
    if (error instanceof Error) {
      logger.error(msg, {
        ...combinedMeta,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    } else if (error) {
      logger.error(msg, { ...combinedMeta, error });
    } else {
      logger.error(msg, combinedMeta);
    }
  }

  warn(message: string, meta?: Record<string, any>) {
    const [msg, combinedMeta] = this.formatMessage(message, meta);
    logger.warn(msg, combinedMeta);
  }

  info(message: string, meta?: Record<string, any>) {
    const [msg, combinedMeta] = this.formatMessage(message, meta);
    logger.info(msg, combinedMeta);
  }

  http(message: string, meta?: Record<string, any>) {
    const [msg, combinedMeta] = this.formatMessage(message, meta);
    logger.http(msg, combinedMeta);
  }

  debug(message: string, meta?: Record<string, any>) {
    const [msg, combinedMeta] = this.formatMessage(message, meta);
    logger.debug(msg, combinedMeta);
  }

  // Create a child logger with additional context
  child(context: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...context });
  }

  // Log with request context
  withRequest(requestId: string, userId?: string, ip?: string): Logger {
    return this.child({
      requestId,
      userId,
      ip,
    });
  }

  // Performance logging
  startTimer(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`Performance: ${label}`, { duration, label });
    };
  }
}

// Default logger instance
export const defaultLogger = new Logger({
  service: 'jarvis-control-plane',
});

// Alias for backwards compatibility
export const logger = defaultLogger;

// HTTP request logging middleware
export function httpLogger(req: any, res: any, next: any) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logger = new Logger({
      requestId: req.id || req.headers['x-request-id'],
      userId: req.user?.id,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    });

    logger.http('HTTP Request', {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}

// Error logging middleware
export function errorLogger(err: Error, req: any, res: any, next: any) {
  const logger = new Logger({
    requestId: req.id || req.headers['x-request-id'],
    userId: req.user?.id,
    ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
  });

  logger.error('Request Error', err, {
    method: req.method,
    url: req.originalUrl || req.url,
    body: req.body,
    query: req.query,
  });

  next(err);
}

export default defaultLogger;
