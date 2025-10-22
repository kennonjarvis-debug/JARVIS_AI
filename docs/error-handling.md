# Error Handling in Jarvis

This document describes the centralized error handling system used throughout the Jarvis autonomous agent system.

## Overview

The Jarvis error handling system provides:

- **Consistent error categorization** with predefined error codes
- **Recovery strategy guidance** for different error types
- **Contextual error information** for debugging and monitoring
- **User-friendly error messages** for external communication
- **Severity-based logging** for appropriate alerting

## Components

### 1. Error Codes (`ErrorCode` enum)

Eight standardized error codes cover all failure scenarios:

| Code | Recoverable | Strategy | Severity | Use Case |
|------|-------------|----------|----------|----------|
| `VALIDATION_ERROR` | Yes | Fail gracefully | Low | Invalid user input |
| `INTEGRATION_ERROR` | Yes | Retry with backoff | Medium | External API failures |
| `DECISION_ERROR` | Depends | Escalate to human | Medium | Decision engine issues |
| `TASK_EXECUTION_ERROR` | No | Fail gracefully | High | Task processing failures |
| `RATE_LIMIT_ERROR` | Yes | Retry with backoff | Low | API rate limiting |
| `AUTHENTICATION_ERROR` | No | Alert admin | Critical | Auth/credential failures |
| `NOT_FOUND` | No | Fail gracefully | Medium | Resource not found |
| `INTERNAL_ERROR` | No | Alert admin | Critical | Unexpected system errors |

### 2. JarvisError Class

Custom error class extending `Error` with additional metadata:

```typescript
class JarvisError extends Error {
  code: ErrorCode;              // Error category
  details?: Record<string, any>; // Additional error details
  recoverable: boolean;          // Can this be retried?
  timestamp: Date;               // When did this occur?
  strategy: RecoveryStrategy;    // How should we handle this?
  context?: ErrorContext;        // Where did this happen?
}
```

### 3. ErrorHandler Class

Centralized error handling with consistent logging and recovery:

```typescript
class ErrorHandler {
  handle(error: Error, context?: Record<string, any>): void;
  isRecoverable(error: Error): boolean;
  getUserMessage(error: Error): string;
  getRecoveryStrategy(error: Error): RecoveryStrategy;
  wrapError(error: Error, code?: ErrorCode): JarvisError;
  reportCritical(error: Error, context: Record<string, any>): Promise<void>;
}
```

## Usage Examples

### Creating and Throwing Errors

```typescript
import { JarvisError, ErrorCode } from './utils/error-handler';

// Simple error
throw new JarvisError(
  ErrorCode.VALIDATION_ERROR,
  'Email address is required'
);

// Error with details
throw new JarvisError(
  ErrorCode.INTEGRATION_ERROR,
  'Failed to post to Buffer',
  { platform: 'twitter', statusCode: 500 },
  true, // recoverable
  { taskId: 'task-123', agentId: 'marketing-agent' }
);

// Using helper function
import { createError } from './utils/error-handler';

throw createError(
  ErrorCode.RATE_LIMIT_ERROR,
  'Buffer API rate limit exceeded',
  { retries: 3, waitTime: 60 },
  { integration: 'buffer' }
);
```

### Handling Errors

```typescript
import { ErrorHandler } from './utils/error-handler';
import { Logger } from './utils/logger';

const logger = new Logger('my-service');
const errorHandler = new ErrorHandler(logger);

try {
  await riskyOperation();
} catch (error) {
  // Log and handle
  errorHandler.handle(error, { taskId: 'task-123' });

  // Check if recoverable
  if (errorHandler.isRecoverable(error)) {
    const strategy = errorHandler.getRecoveryStrategy(error);

    if (strategy === RecoveryStrategy.RETRY_BACKOFF) {
      // Implement retry logic
      await retryWithBackoff(riskyOperation);
    }
  } else {
    // Get user-friendly message
    const message = errorHandler.getUserMessage(error);
    return { success: false, message };
  }
}
```

### Wrapping Standard Errors

```typescript
try {
  JSON.parse(invalidJson);
} catch (error) {
  // Wrap standard error in JarvisError
  const jarvisError = errorHandler.wrapError(
    error,
    ErrorCode.VALIDATION_ERROR
  );
  throw jarvisError;
}
```

### Checking Error Types

```typescript
import { isErrorCode } from './utils/error-handler';

try {
  await operation();
} catch (error) {
  if (isErrorCode(error, ErrorCode.RATE_LIMIT_ERROR)) {
    // Handle rate limiting specifically
    await sleep(60000);
    return retry();
  }

  throw error;
}
```

### Getting Error Context

```typescript
import { getErrorContext } from './utils/error-handler';

try {
  await operation();
} catch (error) {
  const context = getErrorContext(error);

  if (context?.taskId) {
    // Update task status in database
    await updateTaskStatus(context.taskId, 'failed');
  }
}
```

## Recovery Strategies

The error handler recommends recovery strategies for each error:

### `RETRY_IMMEDIATE`
Retry operation immediately without delay. Use for transient network blips.

### `RETRY_BACKOFF`
Retry with exponential backoff. Use for rate limits and service degradation.

```typescript
async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const strategy = errorHandler.getRecoveryStrategy(error);
      if (strategy === RecoveryStrategy.RETRY_BACKOFF) {
        await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
      }
    }
  }
}
```

### `ESCALATE_HUMAN`
Send to approval queue for human review. Use for complex decisions or ambiguous situations.

```typescript
if (strategy === RecoveryStrategy.ESCALATE_HUMAN) {
  await approvalQueue.requestApproval({
    taskId,
    reason: error.message,
    context: getErrorContext(error),
  });
}
```

### `FAIL_GRACEFULLY`
Stop operation but don't alert. Use for expected failures like validation errors.

### `ALERT_ADMIN`
Stop operation and send alert. Use for critical errors requiring immediate attention.

```typescript
if (strategy === RecoveryStrategy.ALERT_ADMIN) {
  await errorHandler.reportCritical(error, { taskId });
}
```

### `NO_RECOVERY`
No recovery possible. Use for fatal errors or when already wrapped.

## Error Context

Add context to errors for better debugging:

```typescript
const context: ErrorContext = {
  taskId: 'task-123',        // Task being processed
  agentId: 'marketing-agent', // Agent that encountered error
  integration: 'buffer',      // External service involved
  statusCode: 429,            // HTTP status if applicable
  retries: 3,                 // Number of retries attempted
  customField: 'any value',   // Any additional context
};

throw new JarvisError(
  ErrorCode.INTEGRATION_ERROR,
  'Operation failed',
  undefined,
  true,
  context
);
```

## Integration with Logging

The ErrorHandler integrates seamlessly with the Logger utility:

```typescript
const logger = new Logger('orchestrator');
const errorHandler = new ErrorHandler(logger);

// Errors are automatically logged at appropriate levels:
// - Critical errors → logger.error()
// - High errors → logger.error()
// - Medium errors → logger.warn()
// - Low errors → logger.info()

errorHandler.handle(error, { taskId: '123' });
// Logs to file and console with full context
```

## Error Reporting

Configure critical error reporting:

```typescript
const errorHandler = new ErrorHandler(logger, {
  enableReporting: true,
  reportFunction: async (error, context) => {
    // Send to monitoring service
    await sentry.captureException(error, {
      extra: context,
    });

    // Or send to Discord webhook
    await discord.send({
      content: `🚨 Critical error in ${context.agentId}`,
      embeds: [{
        title: error.message,
        fields: [
          { name: 'Task ID', value: context.taskId },
          { name: 'Code', value: error.code },
        ],
      }],
    });
  },
});
```

## Best Practices

### 1. Use Specific Error Codes
Choose the most specific error code for the situation:

```typescript
// Bad - too generic
throw new JarvisError(ErrorCode.INTERNAL_ERROR, 'Something failed');

// Good - specific
throw new JarvisError(ErrorCode.INTEGRATION_ERROR, 'Buffer API returned 500');
```

### 2. Include Helpful Details
Add context that helps debugging:

```typescript
throw new JarvisError(
  ErrorCode.VALIDATION_ERROR,
  'Invalid email address',
  {
    providedEmail: email,
    validationRule: 'RFC 5322',
    field: 'email',
  }
);
```

### 3. Preserve Error Context
Pass context through the call stack:

```typescript
async function executeTask(taskId: string) {
  try {
    await doWork();
  } catch (error) {
    // Add task context before re-throwing
    if (error instanceof JarvisError) {
      error.context = { ...error.context, taskId };
    }
    throw error;
  }
}
```

### 4. Handle Errors at Appropriate Level
Don't catch errors you can't handle:

```typescript
// Bad - catching and ignoring
try {
  await criticalOperation();
} catch (error) {
  console.log('Oops');
  // Error is lost!
}

// Good - let it propagate to appropriate handler
async function myFunction() {
  await criticalOperation(); // Let orchestrator handle errors
}
```

### 5. Use Helper Functions
Leverage provided utilities:

```typescript
import { createError, isErrorCode, getErrorContext } from './utils/error-handler';

// Clean error creation
throw createError(ErrorCode.NOT_FOUND, 'User not found', { userId });

// Type-safe error checking
if (isErrorCode(error, ErrorCode.RATE_LIMIT_ERROR)) {
  // Handle rate limiting
}

// Safe context extraction
const context = getErrorContext(error);
if (context?.taskId) {
  // Use context
}
```

## Testing Errors

Test error scenarios comprehensively:

```typescript
import { describe, it, expect } from 'vitest';
import { JarvisError, ErrorCode } from './utils/error-handler';

describe('MyService', () => {
  it('should throw validation error for invalid input', async () => {
    await expect(
      myService.process({ invalid: 'data' })
    ).rejects.toThrow(JarvisError);

    await expect(
      myService.process({ invalid: 'data' })
    ).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
      recoverable: true,
    });
  });
});
```

## Summary

The Jarvis error handling system provides:

✅ **Consistent** error categorization across all components
✅ **Informative** errors with context and details
✅ **Actionable** recovery strategies
✅ **User-friendly** messages for external communication
✅ **Integrated** logging and monitoring
✅ **Type-safe** error checking and handling

Use this system throughout Jarvis for robust, maintainable error handling.
