# Jarvis Testing Guide

Comprehensive testing documentation for the Jarvis AI Control Plane.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

Jarvis uses a comprehensive testing strategy with three levels of tests:

1. **Unit Tests** - Test individual functions and classes in isolation
2. **Integration Tests** - Test interactions between components
3. **E2E Tests** - Test complete user workflows end-to-end

### Testing Stack

- **Test Runner**: Jest
- **Test Framework**: Jest + TypeScript (ts-jest)
- **Assertion Library**: Jest (built-in)
- **Mocking**: Jest mocks
- **HTTP Testing**: Supertest
- **E2E Testing**: Playwright
- **Coverage**: Jest coverage reports

---

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── unit/                       # Unit tests
│   ├── auth.test.ts           # Authentication unit tests
│   ├── api-client.test.ts     # API client tests
│   └── ...                     # Other unit tests
├── integration/               # Integration tests
│   ├── api.test.ts           # API integration tests
│   ├── chatgpt-flow.test.ts  # ChatGPT integration
│   └── ...                    # Other integration tests
└── e2e/                       # End-to-end tests
    ├── jest.config.js         # E2E-specific config
    ├── setup.ts               # E2E setup
    ├── tsconfig.json          # E2E TypeScript config
    └── ...                     # E2E test files
```

### Configuration Files

- **`jest.config.js`** - Main Jest configuration for unit and integration tests
- **`tests/e2e/jest.config.js`** - Separate configuration for E2E tests
- **`tests/setup.ts`** - Global setup run before all tests

---

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm test -- --testPathPattern=tests/unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### E2E Tests Only

```bash
npm run test:e2e
```

### Watch Mode

```bash
npm test -- --watch
```

### With Coverage

```bash
npm test -- --coverage
```

### Specific Test File

```bash
npm test -- tests/unit/auth.test.ts
```

### Specific Test Suite

```bash
npm test -- --testNamePattern="Authentication Middleware"
```

---

## Writing Tests

### Unit Test Example

```typescript
/**
 * Unit Tests: Authentication Middleware
 */

import { authenticate } from '../../src/middleware/auth-middleware.js';
import { Request, Response, NextFunction } from 'express';

// Mock dependencies
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    apiKey: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  it('should authenticate user with valid API key', async () => {
    mockRequest.headers = {
      authorization: 'Bearer test-api-key',
    };

    // Test implementation...
  });
});
```

### Integration Test Example

```typescript
/**
 * Integration Tests: API Gateway
 */

import request from 'supertest';
import express from 'express';

describe('API Gateway Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Setup routes
    app.get('/api/health', (req, res) => {
      res.json({ status: 'healthy' });
    });
  });

  it('should return health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'healthy',
    });
  });
});
```

### E2E Test Example

```typescript
/**
 * E2E Tests: Conversation Sync
 */

import { test, expect } from '@playwright/test';

test.describe('Conversation Sync Flow', () => {
  test('should sync conversations across services', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3000/dashboard');

    // Perform actions
    await page.click('[data-testid="sync-button"]');

    // Verify results
    await expect(page.locator('.sync-status')).toContainText('Synced');
  });
});
```

---

## Test Utilities

### Global Test Utilities

Available in all tests via `global.testUtils`:

```typescript
// Sleep utility
await global.testUtils.sleep(1000);

// Mock date/time
global.testUtils.mockDate(new Date('2025-01-01'));

// Restore real date/time
global.testUtils.restoreDate();
```

### Custom Matchers

```typescript
// Custom Jest matchers can be added in tests/setup.ts
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () => `expected ${received} to be a valid UUID`,
    };
  },
});
```

---

## Coverage Requirements

### Coverage Thresholds

Minimum coverage requirements (configured in `jest.config.js`):

- **Branches**: 60%
- **Functions**: 60%
- **Lines**: 60%
- **Statements**: 60%

### Viewing Coverage Reports

After running tests with coverage, view the HTML report:

```bash
npm test -- --coverage
open coverage/index.html
```

### Coverage Exclusions

Files excluded from coverage:

- Type definition files (`*.d.ts`)
- Test files (`*.test.ts`, `*.spec.ts`)
- Main entry point (`src/main.ts`)
- Generated code

---

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:

- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

### Workflow Jobs

1. **Lint** - ESLint and TypeScript type checking
2. **Unit Tests** - Fast, isolated tests
3. **Integration Tests** - Tests with Postgres and Redis
4. **E2E Tests** - Full system tests with Playwright
5. **Build Verification** - Ensure code compiles
6. **Docker Build** - Test Docker image builds
7. **Security Scan** - npm audit and Snyk

### Environment Variables

Tests use environment variables from:

1. `.env.test` (if exists)
2. `.env` (fallback)
3. CI environment variables

Required environment variables for tests:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/jarvis_test
REDIS_URL=redis://localhost:6379
JARVIS_AUTH_TOKEN=test-token
```

---

## Best Practices

### 1. Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern

### 2. Mocking

```typescript
// Mock external dependencies
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

// Restore mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
```

### 3. Async Testing

```typescript
// Use async/await
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// Or use done callback
it('should handle callbacks', (done) => {
  callbackFunction((result) => {
    expect(result).toBe('expected');
    done();
  });
});
```

### 4. Setup and Teardown

```typescript
// Run before all tests in a suite
beforeAll(() => {
  // Setup that runs once
});

// Run before each test
beforeEach(() => {
  // Setup that runs before every test
});

// Run after each test
afterEach(() => {
  // Cleanup after each test
});

// Run after all tests
afterAll(() => {
  // Cleanup that runs once
});
```

### 5. Test Isolation

- Each test should be independent
- Don't rely on test execution order
- Clean up after each test
- Use fresh mocks for each test

### 6. Meaningful Assertions

```typescript
// Good - specific assertions
expect(response.status).toBe(200);
expect(response.body).toMatchObject({
  success: true,
  data: expect.any(Object),
});

// Avoid - too vague
expect(response).toBeTruthy();
```

---

## Troubleshooting

### Common Issues

#### 1. Module Resolution Errors

```bash
Cannot find module '@/core/module-router'
```

**Solution**: Check path mappings in `jest.config.js` match `tsconfig.json`:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@core/(.*)$': '<rootDir>/src/core/$1',
}
```

#### 2. ESM Import Errors

```bash
SyntaxError: Cannot use import statement outside a module
```

**Solution**: Ensure `jest.config.js` uses ESM preset:

```javascript
preset: 'ts-jest/presets/default-esm',
extensionsToTreatAsEsm: ['.ts'],
```

#### 3. Timeout Errors

```bash
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Solution**: Increase timeout for specific test:

```typescript
it('should handle long operation', async () => {
  // Test code...
}, 30000); // 30 second timeout
```

#### 4. Database Connection Errors

```bash
Error: connect ECONNREFUSED
```

**Solution**: Ensure test database is running:

```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:15
```

#### 5. Mock Not Working

```bash
Received: undefined
```

**Solution**: Ensure mock is hoisted before imports:

```typescript
// Mock before importing the module
jest.mock('../../src/utils/logger.js');

import { myFunction } from '../../src/module.js';
```

### Debug Mode

Run tests with debug output:

```bash
DEBUG=* npm test
```

Or set in test file:

```typescript
process.env.DEBUG = 'true';
```

### Verbose Output

```bash
npm test -- --verbose
```

### Run Single Test

```bash
npm test -- --testNamePattern="specific test name"
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Playwright Documentation](https://playwright.dev/)

---

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure all tests pass locally
3. Check coverage meets minimum thresholds
4. Update this documentation if needed

---

**Last Updated**: Week 4 - Task 4.1
**Maintained By**: Jarvis Team
