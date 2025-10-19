/**
 * Error handling for JARVIS
 */

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Authentication errors
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',

  // Integration errors
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  API_ERROR = 'API_ERROR',

  // Task errors
  TASK_EXECUTION_ERROR = 'TASK_EXECUTION_ERROR',
  TASK_TIMEOUT = 'TASK_TIMEOUT',

  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export class JarvisError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, any>;
  public readonly recoverable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    recoverable: boolean = false
  ) {
    super(message);
    this.name = 'JarvisError';
    this.code = code;
    this.context = context;
    this.recoverable = recoverable;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JarvisError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

export class ErrorHandler {
  constructor(private logger?: any) {}

  isRecoverable(error: Error | JarvisError): boolean {
    if (error instanceof JarvisError) {
      return error.recoverable;
    }
    return false;
  }

  handle(error: Error | JarvisError, context?: Record<string, any>): void {
    if (this.logger) {
      this.logger.error('Error occurred', error, context);
    } else {
      console.error('Error occurred:', error, context);
    }
  }

  wrap(error: unknown, code: ErrorCode, message?: string, context?: Record<string, any>): JarvisError {
    if (error instanceof JarvisError) {
      return error;
    }

    const errorMessage = message || (error instanceof Error ? error.message : 'Unknown error');
    const errorContext = {
      originalError: error instanceof Error ? error.message : error,
      ...context,
    };

    return new JarvisError(code, errorMessage, errorContext);
  }
}
