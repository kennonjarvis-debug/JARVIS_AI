# Jarvis Testing Infrastructure

Complete automated testing infrastructure for Jarvis AI Control Plane.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [New Testing Setup (Week 4)](#new-testing-setup-week-4)
- [CI/CD Integration](#cicd-integration)
- [Coverage Requirements](#coverage-requirements)
- [Writing Tests](#writing-tests)

## 🎯 Overview

This testing infrastructure provides comprehensive test coverage across multiple layers:

- **Unit Tests**: Component-level testing with Vitest and Jest
- **E2E Tests**: End-to-end testing with Playwright
- **API Tests**: API endpoint validation
- **Automation Tests**: System orchestration testing
- **Journey Tests**: Complete user workflow simulations

### Coverage Target

**≥90% code coverage** across all test suites

## 📁 Test Structure

```
tests/
├── unit/                    # Unit tests (Vitest + Jest)
│   ├── vitality.test.ts
│   └── api-client.test.ts
├── e2e/                     # End-to-end tests (Playwright)
│   ├── vitality-dashboard.spec.ts
│   └── api/
│       └── jarvis-api.api.spec.ts
├── automation/              # Orchestration tests
│   └── run-automation-tests.ts
├── journeys/                # Persona-based workflow tests
│   └── run-journey-tests.ts
├── fixtures/                # Test data and fixtures
├── helpers/                 # Test utilities
│   ├── jest.setup.ts
│   └── vitest.setup.ts
└── README.md
```

## New Testing Setup (Week 4)

### Key Files Added

1. **`/jest.config.js`** - Main Jest configuration for unit and integration tests
2. **`/tests/setup.ts`** - Global test setup with utilities
3. **`/tests/unit/auth.test.ts`** - Example unit test for authentication
4. **`/tests/integration/api.test.ts`** - Example integration test for API Gateway
5. **`/docs/TESTING.md`** - Comprehensive testing documentation

### Test Commands

```bash
# All tests
npm test

# Unit tests only
npm test -- --testPathPattern=tests/unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Dependencies Installed

All required dependencies are already installed:
- jest (^29.7.0)
- @types/jest (^29.5.14)
- ts-jest (^29.1.1)
- supertest (^7.1.4)
- @types/supertest (^6.0.3)

## Running Tests

### All Tests

```bash
npm test                    # Run all test suites
```

### Unit Tests

```bash
npm test -- --testPathPattern=tests/unit  # Run unit tests
npm test -- --watch                       # Watch mode
```

### E2E Tests

```bash
npm run test:e2e           # Run all E2E tests
```

### API Tests

```bash
npm run test:api           # Run API tests only
```

### Automation Tests

```bash
npm run test:automation    # Run orchestration tests
```

### Journey Tests

```bash
npm run test:journeys      # Run user journey tests
```

### Coverage

```bash
npm run test:coverage      # Generate coverage reports
```

### Parallel Execution

```bash
npm run test:parallel      # Run all tests in parallel
```

### Cleanup

```bash
npm run test:clean         # Remove all test artifacts
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- **Push** to `main` or `develop` branches
- **Pull Requests** to `main` or `develop`
- **Daily Schedule** at 6 AM UTC
- **Manual trigger** via workflow_dispatch

### Workflow Jobs

1. **unit-tests-vitest** - Unit tests with Vitest
2. **unit-tests-jest** - Unit tests with Jest
3. **e2e-tests** - E2E tests with Playwright
4. **api-tests** - API endpoint tests
5. **automation-tests** - System orchestration tests
6. **journey-tests** - User workflow tests
7. **test-summary** - Aggregate results and report

### Required Secrets

Set these in GitHub repository secrets:

- `SLACK_WEBHOOK_URL` - Slack webhook for test notifications

## 📊 Coverage Requirements

### Global Thresholds

- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%
- **Statements**: 90%

### Configuration Files

- **Vitest**: `vitest.config.ts`
- **Jest**: `jest.config.ts`
- **Playwright**: `playwright.config.ts`

### Coverage Reports

Coverage reports are generated in:
- `coverage/unit-vitest/` - Vitest coverage
- `coverage/unit/` - Jest coverage
- `playwright-report/` - Playwright HTML report
- `test-results/` - Test execution results

## 📢 Slack Reporting

### Test Execution Reports

Automatic Slack notifications are sent after each test run with:
- Overall success/failure status
- Individual test suite results
- Coverage percentages
- Execution duration
- Links to detailed reports

### Daily Summary Reports

A comprehensive daily report is generated including:
- Total test runs
- Success rate trends
- Average execution time
- Top failures
- Performance metrics
- Category breakdown

### Sample Slack Message Format

```
🤖 Jarvis V2 Test Results

Repository: jarvis/v2
Branch: main
Trigger: push
Actor: developer

Total Suites: 6
Success Rate: 95.5%
✅ Passed: 5
❌ Failed: 1

Detailed Results:
✅ Unit Tests (Vitest) - 2.3s - 94.2% coverage
✅ Unit Tests (Jest) - 3.1s - 92.8% coverage
✅ E2E Tests - 45.2s
❌ API Tests - 12.5s - 2 errors
✅ Automation Tests - 8.7s
✅ Journey Tests - 18.3s
```

## ✍️ Writing Tests

### Unit Test Example (Vitest)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', () => {
    const result = doSomething();
    expect(result).toBe(expected);
  });
});
```

### E2E Test Example (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature E2E', () => {
  test('should display correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });
});
```

### API Test Example

```typescript
test('GET /api/endpoint - should return data', async ({ request }) => {
  const response = await request.get('/api/endpoint');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data).toHaveProperty('expectedField');
});
```

### Test Naming Conventions

- Unit test files: `*.test.ts`
- E2E test files: `*.spec.ts`
- API test files: `*.api.spec.ts`

### Test Organization

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {});
    it('should handle edge case', () => {});
    it('should throw error on invalid input', () => {});
  });
});
```

## 🎭 Journey Tests

Journey tests simulate complete user workflows from different personas:

### Available Personas

1. **DevOps Engineer** - Daily health checks and system monitoring
2. **Site Reliability Engineer** - Performance investigation and optimization
3. **On-Call Engineer** - Incident response and resolution

### Journey Structure

```typescript
{
  name: 'Journey Name',
  persona: 'Persona Name',
  description: 'What this journey tests',
  steps: [
    {
      name: 'Step description',
      action: async () => { /* API calls */ },
      validate: (result) => { /* Assertions */ }
    }
  ]
}
```

## 🤖 Automation Tests

Automation tests verify system orchestration:

- **Vitality Calculation Pipeline** - Full data flow validation
- **Quick Action Execution** - Action orchestration
- **Alerting System** - Alert generation and acknowledgment
- **Recommendation Engine** - Recommendation generation
- **Data Persistence** - State management across requests

## 📈 Test Metrics

### Performance Benchmarks

- Unit tests: < 5 seconds total
- E2E tests: < 2 minutes total
- API tests: < 30 seconds total
- Automation tests: < 20 seconds total
- Journey tests: < 1 minute total

### Monitoring

Test execution logs are stored in:
```
logs/tests/
├── test-results-{timestamp}.json
├── daily-report-{date}.json
└── {suite-name}-{timestamp}.log
```

## 🔧 Troubleshooting

### Tests Failing Locally

1. Ensure all dependencies are installed: `npm ci`
2. Start dev server: `npm run dev`
3. Check environment variables in `.env.test`
4. Clear test cache: `npm run test:clean`

### Coverage Below Threshold

1. Identify uncovered code: `npm run test:coverage`
2. Review coverage reports in `coverage/` directories
3. Add missing test cases
4. Check for dead code that can be removed

### Playwright Tests Failing

1. Install browsers: `npx playwright install --with-deps`
2. Run in UI mode: `npm run test:e2e:ui`
3. Check screenshots in `test-results/`
4. Verify server is running: `curl http://localhost:3001/health`

### Slack Notifications Not Sending

1. Verify `SLACK_WEBHOOK_URL` is set
2. Test webhook manually: `curl -X POST -H 'Content-type: application/json' --data '{"text":"Test"}' $SLACK_WEBHOOK_URL`
3. Check webhook permissions in Slack workspace

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure ≥90% coverage
3. Run all tests locally before pushing
4. Update test documentation if needed
5. Add journey tests for user-facing features

---

**Built with ❤️ for Jarvis V2**
