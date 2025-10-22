/**
 * Centralized error handling system for Jarvis
 *
 * Provides custom error classes, error handling utilities, and recovery strategies
 * for consistent error management across the entire system.
 */

import { ErrorCode, ERROR_METADATA, ErrorContext, RecoveryStrategy } from '../types/errors';

/**
 * Custom error class for Jarvis-specific errors
 *
 * Extends the standard Error class with additional context and metadata
 * specific to the Jarvis system.
 */
export class JarvisError extends Error {
  /** Error code identifying the type of error */
  public readonly code: ErrorCode;

  /** Additional context details about the error */
  public readonly details?: Record<string, any>;

  /** Whether the error is potentially recoverable */
  public readonly recoverable: boolean;

  /** Timestamp when the error occurred */
  public readonly timestamp: Date;

  /** Recommended recovery strategy */
  public readonly strategy: RecoveryStrategy;

  /** Context information (taskId, agentId, etc.) */
  public readonly context?: ErrorContext;

  /**
   * Create a new JarvisError
   *
   * @param code - Error code from ErrorCode enum
   * @param message - Human-readable error message
   * @param details - Additional error details
   * @param recoverable - Whether the error can be recovered from (overrides default)
   * @param context - Contextual information about where the error occurred
   */
  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    recoverable?: boolean,
    context?: ErrorContext
  ) {
    super(message);

    // Maintains proper stack trace for where our error was thrown
    this.name = 'JarvisError';
    Object.setPrototypeOf(this, JarvisError.prototype);

    const metadata = ERROR_METADATA[code];

    this.code = code;
    this.details = details;
    this.recoverable = recoverable ?? metadata?.recoverable ?? true;
    this.timestamp = new Date();
    this.strategy = metadata?.defaultStrategy ?? 'failFast';
    this.context = context;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JarvisError);
    }
  }

  /**
   * Convert error to a JSON-serializable object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
      strategy: this.strategy,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return ERROR_METADATA[this.code].userMessage;
  }

  /**
   * Get error severity level
   */
  getSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    return ERROR_METADATA[this.code].severity;
  }
}

/**
 * Configuration for ErrorHandler
 */
export interface ErrorHandlerConfig {
  /** Enable detailed error logging */
  verbose?: boolean;

  /** Enable error reporting to external service */
  enableReporting?: boolean;

  /** Custom error reporting function */
  reportFunction?: (error: Error, context?: Record<string, any>) => Promise<void>;
}

/**
 * Centralized error handler for the Jarvis system
 *
 * Provides consistent error handling, logging, and recovery across all components.
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;

  // Logger will be imported from ./logger once it's created by Instance 2
  // For now, we'll use console logging as a fallback
  private logger: any;

  /**
   * Create a new ErrorHandler
   *
   * @param logger - Logger instance for error logging
   * @param config - Configuration options
   */
  constructor(logger: any, config: ErrorHandlerConfig = {}) {
    this.logger = logger;
    this.config = {
      verbose: false,
      enableReporting: false,
      ...config,
    };
  }

  /**
   * Handle an error with logging and appropriate response
   *
   * @param error - The error to handle
   * @param context - Additional context about where the error occurred
   */
  handle(error: Error | JarvisError, context?: Record<string, any>): void {
    const jarvisError = this.ensureJarvisError(error);

    // Build full context
    const fullContext = {
      ...jarvisError.context,
      ...context,
      code: jarvisError.code,
      recoverable: jarvisError.recoverable,
      strategy: jarvisError.strategy,
      severity: jarvisError.getSeverity(),
    };

    // Log based on severity
    switch (jarvisError.getSeverity()) {
      case 'critical':
        this.logError('Critical error occurred', jarvisError, fullContext);
        if (this.config.enableReporting) {
          this.reportCritical(jarvisError, fullContext);
        }
        break;

      case 'high':
        this.logError('High severity error', jarvisError, fullContext);
        break;

      case 'medium':
        this.logWarn('Medium severity error', jarvisError, fullContext);
        break;

      case 'low':
        this.logInfo('Low severity error', jarvisError, fullContext);
        break;
    }
  }

  /**
   * Check if an error is recoverable
   *
   * @param error - The error to check
   * @returns true if the error can potentially be recovered from
   */
  isRecoverable(error: Error): boolean {
    if (error instanceof JarvisError) {
      return error.recoverable;
    }

    // Unknown errors are considered non-recoverable
    return false;
  }

  /**
   * Get a user-friendly error message
   *
   * @param error - The error to get a message for
   * @returns User-friendly error message
   */
  getUserMessage(error: Error): string {
    if (error instanceof JarvisError) {
      return error.getUserMessage();
    }

    // Generic message for non-JarvisError
    return 'An unexpected error occurred. Please try again later.';
  }

  /**
   * Get the recovery strategy for an error
   *
   * @param error - The error to get strategy for
   * @returns Recommended recovery strategy
   */
  getRecoveryStrategy(error: Error): RecoveryStrategy {
    if (error instanceof JarvisError) {
      return error.strategy;
    }

    // Default to no recovery for unknown errors
    return RecoveryStrategy.NO_RECOVERY;
  }

  /**
   * Report critical errors to monitoring service
   *
   * @param error - The error to report
   * @param context - Additional context
   */
  async reportCritical(error: Error, context: Record<string, any>): Promise<void> {
    try {
      if (this.config.reportFunction) {
        await this.config.reportFunction(error, context);
      } else {
        // Default reporting: just log it
        this.logError('Critical error (no reporting configured)', error, context);
      }
    } catch (reportError) {
      // Don't let error reporting cause additional failures
      this.logError('Failed to report critical error', reportError as Error, {
        originalError: error.message,
      });
    }
  }

  /**
   * Wrap a standard Error in a JarvisError
   *
   * @param error - Error to wrap
   * @returns JarvisError instance
   */
  wrapError(error: Error, code: ErrorCode = ErrorCode.INTERNAL_ERROR): JarvisError {
    if (error instanceof JarvisError) {
      return error;
    }

    return new JarvisError(
      code,
      error.message,
      { originalError: error.name, stack: error.stack },
      false
    );
  }

  /**
   * Ensure error is a JarvisError, wrapping if necessary
   */
  private ensureJarvisError(error: Error): JarvisError {
    if (error instanceof JarvisError) {
      return error;
    }

    return this.wrapError(error);
  }

  /**
   * Log error with appropriate level
   */
  private logError(message: string, error: Error, context?: Record<string, any>): void {
    if (this.logger && typeof this.logger.error === 'function') {
      this.logger.error(message, error, context);
    } else {
      console.error(message, {
        error: error.message,
        stack: this.config.verbose ? error.stack : undefined,
        context,
      });
    }
  }

  /**
   * Log warning
   */
  private logWarn(message: string, error: Error, context?: Record<string, any>): void {
    if (this.logger && typeof this.logger.warn === 'function') {
      this.logger.warn(message, { error: error.message, context });
    } else {
      console.warn(message, {
        error: error.message,
        context,
      });
    }
  }

  /**
   * Log info
   */
  private logInfo(message: string, error: Error, context?: Record<string, any>): void {
    if (this.logger && typeof this.logger.info === 'function') {
      this.logger.info(message, { error: error.message, context });
    } else {
      console.info(message, {
        error: error.message,
        context,
      });
    }
  }
}

/**
 * Helper function to create JarvisErrors quickly
 */
export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  context?: ErrorContext
): JarvisError {
  return new JarvisError(code, message, details, undefined, context);
}

/**
 * Helper to check if an error matches a specific code
 */
export function isErrorCode(error: Error, code: ErrorCode): boolean {
  return error instanceof JarvisError && error.code === code;
}

/**
 * Helper to extract context from error
 */
export function getErrorContext(error: Error): ErrorContext | undefined {
  if (error instanceof JarvisError) {
    return error.context;
  }
  return undefined;
}

// Re-export types already imported above
export type { ErrorContext };
export { ErrorCode, ERROR_METADATA, RecoveryStrategy };
