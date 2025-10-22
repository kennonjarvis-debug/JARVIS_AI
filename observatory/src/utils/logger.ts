/**
 * Structured logging utility for Jarvis
 * Provides production-ready logging with Winston
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Log levels supported by the logger
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Structured log entry format
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  agentId?: string;
  taskId?: string;
  error?: Error;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  serviceName?: string;
  level?: LogLevel;
  enableFileLogging?: boolean;
  enableConsoleLogging?: boolean;
  logDirectory?: string;
}

/**
 * Production-ready structured logger with Winston
 *
 * Features:
 * - JSON structured logging
 * - Console and file transports
 * - Log rotation (daily, max 14 days)
 * - Contextual logging (agentId, taskId, etc.)
 * - Child logger support for context propagation
 */
export class Logger {
  private winstonLogger: winston.Logger;
  private serviceName: string;
  private defaultContext: Record<string, any>;

  /**
   * Create a new logger instance
   * @param serviceName - Name of the service/component using this logger
   * @param config - Optional logger configuration
   */
  constructor(serviceName: string, config: LoggerConfig = {}) {
    this.serviceName = serviceName;
    this.defaultContext = {};

    const {
      level = LogLevel.INFO,
      enableFileLogging = true,
      enableConsoleLogging = true,
      logDirectory = 'logs',
    } = config;

    // Determine if we're in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Create transports array
    const transports: winston.transport[] = [];

    // Console transport with appropriate formatting
    if (enableConsoleLogging) {
      transports.push(
        new winston.transports.Console({
          format: isDevelopment
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length
                    ? `\n${JSON.stringify(meta, null, 2)}`
                    : '';
                  return `${timestamp} [${level}] ${message}${metaStr}`;
                })
              )
            : winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
        })
      );
    }

    // File transport with daily rotation
    if (enableFileLogging) {
      // Combined log file (all levels)
      transports.push(
        new DailyRotateFile({
          dirname: logDirectory,
          filename: 'jarvis-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d', // Keep logs for 14 days
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );

      // Error-only log file
      transports.push(
        new DailyRotateFile({
          level: 'error',
          dirname: logDirectory,
          filename: 'jarvis-error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );
    }

    // Create Winston logger
    this.winstonLogger = winston.createLogger({
      level: level,
      defaultMeta: { service: this.serviceName },
      transports,
    });
  }

  /**
   * Log a debug message
   * @param message - The log message
   * @param context - Additional context data
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, undefined, context);
  }

  /**
   * Log an info message
   * @param message - The log message
   * @param context - Additional context data
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, undefined, context);
  }

  /**
   * Log a warning message
   * @param message - The log message
   * @param context - Additional context data
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, undefined, context);
  }

  /**
   * Log an error message
   * @param message - The log message
   * @param error - Optional Error object
   * @param context - Additional context data
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, error, context);
  }

  /**
   * Internal logging method
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): void {
    const logData: any = {
      ...this.defaultContext,
      ...context,
    };

    // Add error details if present
    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.winstonLogger.log(level, message, logData);
  }

  /**
   * Create a child logger with additional context
   * Child loggers inherit the parent's context and can add more
   * @param context - Additional context to add to all logs from this child
   * @returns A new Logger instance with merged context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(this.serviceName, {
      level: this.winstonLogger.level as LogLevel,
      enableFileLogging: false, // Don't create new file transports
      enableConsoleLogging: false, // Don't create new console transports
    });

    // Use the same Winston logger instance
    childLogger.winstonLogger = this.winstonLogger;

    // Merge parent context with new context
    childLogger.defaultContext = {
      ...this.defaultContext,
      ...context,
    };

    return childLogger;
  }

  /**
   * Set the minimum log level
   * Messages below this level will not be logged
   * @param level - The minimum log level to output
   */
  setLevel(level: LogLevel): void {
    this.winstonLogger.level = level;
  }

  /**
   * Get the current log level
   * @returns The current minimum log level
   */
  getLevel(): string {
    return this.winstonLogger.level;
  }

  /**
   * Close the logger and flush all transports
   * Call this during graceful shutdown
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.winstonLogger.close();
      // Give transports a moment to flush
      setTimeout(resolve, 100);
    });
  }
}

/**
 * Create a default logger instance for the application
 * @param serviceName - Name of the service
 * @returns A new Logger instance
 */
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}
