/**
 * Tests for error-handler module
 *
 * Comprehensive test suite for JarvisError and ErrorHandler classes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  JarvisError,
  ErrorHandler,
  createError,
  isErrorCode,
  getErrorContext,
  ErrorCode,
  RecoveryStrategy,
  ERROR_METADATA,
} from './error-handler';

describe('JarvisError', () => {
  describe('constructor', () => {
    it('should create a JarvisError with all properties', () => {
      const error = new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        { field: 'email' },
        true,
        { taskId: 'task-123' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(JarvisError);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.recoverable).toBe(true);
      expect(error.context).toEqual({ taskId: 'task-123' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should use default recoverability from metadata when not specified', () => {
      const error = new JarvisError(ErrorCode.INTEGRATION_ERROR, 'API failed');

      expect(error.recoverable).toBe(ERROR_METADATA[ErrorCode.INTEGRATION_ERROR].recoverable);
    });

    it('should override default recoverability when specified', () => {
      const error = new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'API failed',
        undefined,
        false // Override default
      );

      expect(error.recoverable).toBe(false);
    });

    it('should set strategy from metadata', () => {
      const error = new JarvisError(ErrorCode.RATE_LIMIT_ERROR, 'Rate limited');

      expect(error.strategy).toBe(RecoveryStrategy.RETRY_BACKOFF);
    });

    it('should have proper error name', () => {
      const error = new JarvisError(ErrorCode.INTERNAL_ERROR, 'Internal error');

      expect(error.name).toBe('JarvisError');
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new JarvisError(
        ErrorCode.TASK_EXECUTION_ERROR,
        'Task failed',
        { reason: 'timeout' },
        false,
        { taskId: 'task-456', agentId: 'agent-1' }
      );

      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'JarvisError',
        code: ErrorCode.TASK_EXECUTION_ERROR,
        message: 'Task failed',
        details: { reason: 'timeout' },
        recoverable: false,
        strategy: RecoveryStrategy.FAIL_GRACEFULLY,
        context: { taskId: 'task-456', agentId: 'agent-1' },
      });
      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(json.stack).toBeDefined();
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly message for validation error', () => {
      const error = new JarvisError(ErrorCode.VALIDATION_ERROR, 'Invalid data');

      expect(error.getUserMessage()).toBe(
        'The provided input is invalid. Please check your data and try again.'
      );
    });

    it('should return user-friendly message for authentication error', () => {
      const error = new JarvisError(ErrorCode.AUTHENTICATION_ERROR, 'Auth failed');

      expect(error.getUserMessage()).toBe('Authentication failed. Please check your API credentials.');
    });
  });

  describe('getSeverity', () => {
    it('should return correct severity for low-severity errors', () => {
      const error = new JarvisError(ErrorCode.VALIDATION_ERROR, 'Invalid');

      expect(error.getSeverity()).toBe('low');
    });

    it('should return correct severity for critical errors', () => {
      const error = new JarvisError(ErrorCode.AUTHENTICATION_ERROR, 'Auth failed');

      expect(error.getSeverity()).toBe('critical');
    });

    it('should return correct severity for medium errors', () => {
      const error = new JarvisError(ErrorCode.INTEGRATION_ERROR, 'API failed');

      expect(error.getSeverity()).toBe('medium');
    });

    it('should return correct severity for high errors', () => {
      const error = new JarvisError(ErrorCode.TASK_EXECUTION_ERROR, 'Task failed');

      expect(error.getSeverity()).toBe('high');
    });
  });
});

describe('ErrorHandler', () => {
  let mockLogger: any;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };
    errorHandler = new ErrorHandler(mockLogger);
  });

  describe('constructor', () => {
    it('should create ErrorHandler with logger', () => {
      expect(errorHandler).toBeInstanceOf(ErrorHandler);
    });

    it('should accept configuration options', () => {
      const handler = new ErrorHandler(mockLogger, {
        verbose: true,
        enableReporting: true,
      });

      expect(handler).toBeInstanceOf(ErrorHandler);
    });
  });

  describe('handle', () => {
    it('should log critical errors with error level', () => {
      const error = new JarvisError(ErrorCode.AUTHENTICATION_ERROR, 'Auth failed');

      errorHandler.handle(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Critical error occurred',
        error,
        expect.objectContaining({
          code: ErrorCode.AUTHENTICATION_ERROR,
          recoverable: false,
          severity: 'critical',
        })
      );
    });

    it('should log high severity errors with error level', () => {
      const error = new JarvisError(ErrorCode.TASK_EXECUTION_ERROR, 'Task failed');

      errorHandler.handle(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'High severity error',
        error,
        expect.objectContaining({
          code: ErrorCode.TASK_EXECUTION_ERROR,
          severity: 'high',
        })
      );
    });

    it('should log medium severity errors with warn level', () => {
      const error = new JarvisError(ErrorCode.INTEGRATION_ERROR, 'API failed');

      errorHandler.handle(error);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Medium severity error',
        error,
        expect.objectContaining({
          code: ErrorCode.INTEGRATION_ERROR,
          severity: 'medium',
        })
      );
    });

    it('should log low severity errors with info level', () => {
      const error = new JarvisError(ErrorCode.VALIDATION_ERROR, 'Invalid input');

      errorHandler.handle(error);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Low severity error',
        error,
        expect.objectContaining({
          code: ErrorCode.VALIDATION_ERROR,
          severity: 'low',
        })
      );
    });

    it('should merge context from error and parameter', () => {
      const error = new JarvisError(
        ErrorCode.TASK_EXECUTION_ERROR,
        'Task failed',
        undefined,
        undefined,
        { taskId: 'task-123' }
      );

      errorHandler.handle(error, { agentId: 'agent-1' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'High severity error',
        error,
        expect.objectContaining({
          taskId: 'task-123',
          agentId: 'agent-1',
        })
      );
    });

    it('should handle standard Error objects', () => {
      const error = new Error('Standard error');

      errorHandler.handle(error);

      // Should wrap and handle as internal error
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('isRecoverable', () => {
    it('should return true for recoverable JarvisError', () => {
      const error = new JarvisError(ErrorCode.INTEGRATION_ERROR, 'API failed');

      expect(errorHandler.isRecoverable(error)).toBe(true);
    });

    it('should return false for non-recoverable JarvisError', () => {
      const error = new JarvisError(ErrorCode.AUTHENTICATION_ERROR, 'Auth failed');

      expect(errorHandler.isRecoverable(error)).toBe(false);
    });

    it('should return false for standard Error', () => {
      const error = new Error('Standard error');

      expect(errorHandler.isRecoverable(error)).toBe(false);
    });

    it('should respect explicit recoverable override', () => {
      const error = new JarvisError(
        ErrorCode.AUTHENTICATION_ERROR,
        'Auth failed',
        undefined,
        true // Override to make recoverable
      );

      expect(errorHandler.isRecoverable(error)).toBe(true);
    });
  });

  describe('getUserMessage', () => {
    it('should return user message for JarvisError', () => {
      const error = new JarvisError(ErrorCode.RATE_LIMIT_ERROR, 'Rate limited');

      const message = errorHandler.getUserMessage(error);

      expect(message).toBe('We are rate limited. Your request will be retried shortly.');
    });

    it('should return generic message for standard Error', () => {
      const error = new Error('Unknown error');

      const message = errorHandler.getUserMessage(error);

      expect(message).toBe('An unexpected error occurred. Please try again later.');
    });
  });

  describe('getRecoveryStrategy', () => {
    it('should return strategy for JarvisError', () => {
      const error = new JarvisError(ErrorCode.RATE_LIMIT_ERROR, 'Rate limited');

      const strategy = errorHandler.getRecoveryStrategy(error);

      expect(strategy).toBe(RecoveryStrategy.RETRY_BACKOFF);
    });

    it('should return NO_RECOVERY for standard Error', () => {
      const error = new Error('Unknown error');

      const strategy = errorHandler.getRecoveryStrategy(error);

      expect(strategy).toBe(RecoveryStrategy.NO_RECOVERY);
    });
  });

  describe('wrapError', () => {
    it('should wrap standard Error in JarvisError', () => {
      const error = new Error('Original error');

      const wrapped = errorHandler.wrapError(error);

      expect(wrapped).toBeInstanceOf(JarvisError);
      expect(wrapped.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(wrapped.message).toBe('Original error');
      expect(wrapped.details?.originalError).toBe('Error');
    });

    it('should accept custom error code', () => {
      const error = new Error('Validation failed');

      const wrapped = errorHandler.wrapError(error, ErrorCode.VALIDATION_ERROR);

      expect(wrapped.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should return JarvisError unchanged', () => {
      const error = new JarvisError(ErrorCode.VALIDATION_ERROR, 'Invalid');

      const wrapped = errorHandler.wrapError(error);

      expect(wrapped).toBe(error);
    });
  });

  describe('reportCritical', () => {
    it('should call custom report function if provided', async () => {
      const reportFn = vi.fn().mockResolvedValue(undefined);
      const handler = new ErrorHandler(mockLogger, {
        enableReporting: true,
        reportFunction: reportFn,
      });

      const error = new JarvisError(ErrorCode.INTERNAL_ERROR, 'Critical error');
      const context = { taskId: 'task-123' };

      await handler.reportCritical(error, context);

      expect(reportFn).toHaveBeenCalledWith(error, context);
    });

    it('should log error if no report function provided', async () => {
      const handler = new ErrorHandler(mockLogger, { enableReporting: true });

      const error = new JarvisError(ErrorCode.INTERNAL_ERROR, 'Critical error');
      const context = { taskId: 'task-123' };

      await handler.reportCritical(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Critical error (no reporting configured)',
        error,
        context
      );
    });

    it('should handle report function errors gracefully', async () => {
      const reportFn = vi.fn().mockRejectedValue(new Error('Report failed'));
      const handler = new ErrorHandler(mockLogger, {
        enableReporting: true,
        reportFunction: reportFn,
      });

      const error = new JarvisError(ErrorCode.INTERNAL_ERROR, 'Critical error');

      await handler.reportCritical(error, {});

      // Should log the reporting failure
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to report critical error',
        expect.any(Error),
        expect.objectContaining({
          originalError: 'Critical error',
        })
      );
    });
  });

  describe('fallback logging', () => {
    let consoleErrorSpy: any;
    let consoleWarnSpy: any;
    let consoleInfoSpy: any;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    });

    it('should fall back to console.error when logger not available', () => {
      const handler = new ErrorHandler(null);
      const error = new JarvisError(ErrorCode.INTERNAL_ERROR, 'Error');

      handler.handle(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should fall back to console.warn for medium errors', () => {
      const handler = new ErrorHandler(null);
      const error = new JarvisError(ErrorCode.INTEGRATION_ERROR, 'Error');

      handler.handle(error);

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should fall back to console.info for low errors', () => {
      const handler = new ErrorHandler(null);
      const error = new JarvisError(ErrorCode.VALIDATION_ERROR, 'Error');

      handler.handle(error);

      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });
});

describe('Helper Functions', () => {
  describe('createError', () => {
    it('should create JarvisError with all parameters', () => {
      const error = createError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        { field: 'email' },
        { taskId: 'task-123' }
      );

      expect(error).toBeInstanceOf(JarvisError);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.context).toEqual({ taskId: 'task-123' });
    });

    it('should create JarvisError with minimal parameters', () => {
      const error = createError(ErrorCode.NOT_FOUND, 'Resource not found');

      expect(error).toBeInstanceOf(JarvisError);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe('Resource not found');
    });
  });

  describe('isErrorCode', () => {
    it('should return true for matching error code', () => {
      const error = new JarvisError(ErrorCode.RATE_LIMIT_ERROR, 'Rate limited');

      expect(isErrorCode(error, ErrorCode.RATE_LIMIT_ERROR)).toBe(true);
    });

    it('should return false for non-matching error code', () => {
      const error = new JarvisError(ErrorCode.RATE_LIMIT_ERROR, 'Rate limited');

      expect(isErrorCode(error, ErrorCode.VALIDATION_ERROR)).toBe(false);
    });

    it('should return false for standard Error', () => {
      const error = new Error('Standard error');

      expect(isErrorCode(error, ErrorCode.INTERNAL_ERROR)).toBe(false);
    });
  });

  describe('getErrorContext', () => {
    it('should return context from JarvisError', () => {
      const context = { taskId: 'task-123', agentId: 'agent-1' };
      const error = new JarvisError(
        ErrorCode.TASK_EXECUTION_ERROR,
        'Failed',
        undefined,
        undefined,
        context
      );

      expect(getErrorContext(error)).toEqual(context);
    });

    it('should return undefined for JarvisError without context', () => {
      const error = new JarvisError(ErrorCode.VALIDATION_ERROR, 'Invalid');

      expect(getErrorContext(error)).toBeUndefined();
    });

    it('should return undefined for standard Error', () => {
      const error = new Error('Standard error');

      expect(getErrorContext(error)).toBeUndefined();
    });
  });
});

describe('Error Metadata', () => {
  it('should have metadata for all error codes', () => {
    const errorCodes = Object.values(ErrorCode);

    errorCodes.forEach((code) => {
      expect(ERROR_METADATA[code]).toBeDefined();
      expect(ERROR_METADATA[code].code).toBe(code);
      expect(ERROR_METADATA[code].recoverable).toBeDefined();
      expect(ERROR_METADATA[code].defaultStrategy).toBeDefined();
      expect(ERROR_METADATA[code].severity).toBeDefined();
      expect(ERROR_METADATA[code].userMessage).toBeDefined();
    });
  });

  it('should have appropriate strategies for recoverable errors', () => {
    expect(ERROR_METADATA[ErrorCode.INTEGRATION_ERROR].recoverable).toBe(true);
    expect(ERROR_METADATA[ErrorCode.INTEGRATION_ERROR].defaultStrategy).toBe(
      RecoveryStrategy.RETRY_BACKOFF
    );

    expect(ERROR_METADATA[ErrorCode.RATE_LIMIT_ERROR].recoverable).toBe(true);
    expect(ERROR_METADATA[ErrorCode.RATE_LIMIT_ERROR].defaultStrategy).toBe(
      RecoveryStrategy.RETRY_BACKOFF
    );
  });

  it('should have appropriate strategies for non-recoverable errors', () => {
    expect(ERROR_METADATA[ErrorCode.AUTHENTICATION_ERROR].recoverable).toBe(false);
    expect(ERROR_METADATA[ErrorCode.AUTHENTICATION_ERROR].defaultStrategy).toBe(
      RecoveryStrategy.ALERT_ADMIN
    );

    expect(ERROR_METADATA[ErrorCode.INTERNAL_ERROR].recoverable).toBe(false);
    expect(ERROR_METADATA[ErrorCode.INTERNAL_ERROR].defaultStrategy).toBe(
      RecoveryStrategy.ALERT_ADMIN
    );
  });
});
