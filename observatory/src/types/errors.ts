/**
 * Error type definitions for Jarvis
 *
 * This file defines all error codes, custom error classes, and error-related types
 * used throughout the Jarvis system for consistent error handling.
 */

/**
 * Enumeration of all possible error codes in the Jarvis system
 *
 * Each error code represents a specific category of failure and includes
 * information about recoverability and handling strategy.
 */
export enum ErrorCode {
  /**
   * Input validation failures
   * Recoverable: Yes - User can correct input
   * Strategy: Return validation error to user
   */
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  /**
   * External API/integration failures
   * Recoverable: Yes - Retry with exponential backoff
   * Strategy: Retry with backoff, then escalate if persistent
   */
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',

  /**
   * Decision engine evaluation failures
   * Recoverable: Depends - May need human review
   * Strategy: Escalate to human for decision
   */
  DECISION_ERROR = 'DECISION_ERROR',

  /**
   * Task execution failures during agent operations
   * Recoverable: Depends - Based on underlying cause
   * Strategy: Analyze cause and retry or escalate
   */
  TASK_EXECUTION_ERROR = 'TASK_EXECUTION_ERROR',

  /**
   * API rate limiting errors
   * Recoverable: Yes - Wait and retry
   * Strategy: Exponential backoff with rate limit awareness
   */
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',

  /**
   * Authentication/authorization failures
   * Recoverable: No - Requires configuration fix
   * Strategy: Alert administrator, halt operation
   */
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',

  /**
   * Resource not found errors
   * Recoverable: Depends - On context
   * Strategy: Check if resource should exist, create or fail gracefully
   */
  NOT_FOUND = 'NOT_FOUND',

  /**
   * Unexpected internal errors
   * Recoverable: No - Indicates bug or system issue
   * Strategy: Log details, alert team, fail safely
   */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Recovery strategies for different error types
 */
export enum RecoveryStrategy {
  /** Retry operation immediately */
  RETRY_IMMEDIATE = 'RETRY_IMMEDIATE',

  /** Retry with exponential backoff */
  RETRY_BACKOFF = 'RETRY_BACKOFF',

  /** Request human approval/intervention */
  ESCALATE_HUMAN = 'ESCALATE_HUMAN',

  /** Fail operation gracefully */
  FAIL_GRACEFULLY = 'FAIL_GRACEFULLY',

  /** Alert administrators */
  ALERT_ADMIN = 'ALERT_ADMIN',

  /** No recovery possible */
  NO_RECOVERY = 'NO_RECOVERY',
}

/**
 * Metadata about error handling for each error code
 */
export interface ErrorMetadata {
  code: ErrorCode;
  recoverable: boolean;
  defaultStrategy: RecoveryStrategy;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
}

/**
 * Map of error codes to their handling metadata
 */
export const ERROR_METADATA: Record<ErrorCode, ErrorMetadata> = {
  [ErrorCode.VALIDATION_ERROR]: {
    code: ErrorCode.VALIDATION_ERROR,
    recoverable: true,
    defaultStrategy: RecoveryStrategy.FAIL_GRACEFULLY,
    severity: 'low',
    userMessage: 'The provided input is invalid. Please check your data and try again.',
  },
  [ErrorCode.INTEGRATION_ERROR]: {
    code: ErrorCode.INTEGRATION_ERROR,
    recoverable: true,
    defaultStrategy: RecoveryStrategy.RETRY_BACKOFF,
    severity: 'medium',
    userMessage: 'We encountered an issue connecting to an external service. Retrying...',
  },
  [ErrorCode.DECISION_ERROR]: {
    code: ErrorCode.DECISION_ERROR,
    recoverable: true,
    defaultStrategy: RecoveryStrategy.ESCALATE_HUMAN,
    severity: 'medium',
    userMessage: 'We need human review to proceed with this decision.',
  },
  [ErrorCode.TASK_EXECUTION_ERROR]: {
    code: ErrorCode.TASK_EXECUTION_ERROR,
    recoverable: false,
    defaultStrategy: RecoveryStrategy.FAIL_GRACEFULLY,
    severity: 'high',
    userMessage: 'Failed to complete the requested task. Please try again later.',
  },
  [ErrorCode.RATE_LIMIT_ERROR]: {
    code: ErrorCode.RATE_LIMIT_ERROR,
    recoverable: true,
    defaultStrategy: RecoveryStrategy.RETRY_BACKOFF,
    severity: 'low',
    userMessage: 'We are rate limited. Your request will be retried shortly.',
  },
  [ErrorCode.AUTHENTICATION_ERROR]: {
    code: ErrorCode.AUTHENTICATION_ERROR,
    recoverable: false,
    defaultStrategy: RecoveryStrategy.ALERT_ADMIN,
    severity: 'critical',
    userMessage: 'Authentication failed. Please check your API credentials.',
  },
  [ErrorCode.NOT_FOUND]: {
    code: ErrorCode.NOT_FOUND,
    recoverable: false,
    defaultStrategy: RecoveryStrategy.FAIL_GRACEFULLY,
    severity: 'medium',
    userMessage: 'The requested resource was not found.',
  },
  [ErrorCode.INTERNAL_ERROR]: {
    code: ErrorCode.INTERNAL_ERROR,
    recoverable: false,
    defaultStrategy: RecoveryStrategy.ALERT_ADMIN,
    severity: 'critical',
    userMessage: 'An unexpected error occurred. Our team has been notified.',
  },
};

/**
 * Additional context that can be attached to errors
 */
export interface ErrorContext {
  /** ID of the task that generated the error */
  taskId?: string;

  /** ID of the agent that encountered the error */
  agentId?: string;

  /** Integration name that failed */
  integration?: string;

  /** HTTP status code if applicable */
  statusCode?: number;

  /** Number of retry attempts made */
  retries?: number;

  /** Additional arbitrary context data */
  [key: string]: any;
}

/**
 * Custom error class for Jarvis
 *
 * Extends the standard Error class with additional context and metadata
 * specific to Jarvis operations.
 */
export class JarvisError extends Error {
  /** Error code */
  public readonly code: ErrorCode;
  /** Additional error details */
  public readonly details?: Record<string, any>;
  /** Whether the error is recoverable */
  public readonly recoverable: boolean;
  /** Error context */
  public readonly context?: ErrorContext;
  /** When the error occurred */
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    recoverable: boolean = true,
    context?: ErrorContext
  ) {
    super(message);
    this.name = 'JarvisError';
    this.code = code;
    this.details = details;
    this.recoverable = recoverable;
    this.context = context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JarvisError);
    }
  }

  /**
   * Convert error to JSON for logging/storage
   */
  toJSON(): ErrorJSON {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Create JarvisError from JSON
   */
  static fromJSON(json: ErrorJSON): JarvisError {
    const error = new JarvisError(
      json.code,
      json.message,
      json.details,
      json.recoverable,
      json.context
    );
    if (json.stack) {
      error.stack = json.stack;
    }
    return error;
  }
}

/**
 * JSON representation of a JarvisError
 */
export interface ErrorJSON {
  /** Error class name */
  name: string;
  /** Error code */
  code: ErrorCode;
  /** Error message */
  message: string;
  /** Additional details */
  details?: Record<string, any>;
  /** Whether recoverable */
  recoverable: boolean;
  /** Error context */
  context?: ErrorContext;
  /** When error occurred */
  timestamp: Date;
  /** Stack trace */
  stack?: string;
}

/**
 * Error statistics for monitoring
 */
export interface ErrorStats {
  /** Total error count */
  total: number;
  /** Errors by code */
  byCode: Record<ErrorCode, number>;
  /** Errors by agent */
  byAgent: Record<string, number>;
  /** Errors by integration */
  byIntegration: Record<string, number>;
  /** Recoverable vs non-recoverable */
  recoverable: number;
  nonRecoverable: number;
  /** Time period for stats */
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Type guard to check if an error is a JarvisError
 */
export function isJarvisError(error: any): error is JarvisError {
  return error instanceof JarvisError;
}

/**
 * Type guard to check if error code is valid
 */
export function isErrorCode(value: any): value is ErrorCode {
  return Object.values(ErrorCode).includes(value);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error | JarvisError): string {
  if (isJarvisError(error)) {
    const metadata = ERROR_METADATA[error.code];
    return metadata?.userMessage || error.message;
  }
  return error.message || 'An unexpected error occurred.';
}

/**
 * Get recovery strategy for an error
 */
export function getRecoveryStrategy(error: Error | JarvisError): RecoveryStrategy {
  if (isJarvisError(error)) {
    return ERROR_METADATA[error.code]?.defaultStrategy || RecoveryStrategy.NO_RECOVERY;
  }
  return RecoveryStrategy.ALERT_ADMIN;
}

/**
 * Check if error is recoverable
 */
export function isRecoverable(error: Error | JarvisError): boolean {
  if (isJarvisError(error)) {
    return error.recoverable;
  }
  return false;
}

/**
 * Wrap a standard Error in a JarvisError
 */
export function wrapError(
  error: Error,
  code: ErrorCode = ErrorCode.INTERNAL_ERROR,
  details?: Record<string, any>,
  context?: ErrorContext
): JarvisError {
  if (isJarvisError(error)) {
    return error;
  }

  return new JarvisError(
    code,
    error.message,
    {
      ...details,
      originalError: error.name,
      originalStack: error.stack,
    },
    ERROR_METADATA[code]?.recoverable ?? false,
    context
  );
}
