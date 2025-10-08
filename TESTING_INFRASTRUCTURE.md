# 🧪 Jarvis V2 Testing Infrastructure

**Complete Automated Testing System**

## 📊 Executive Summary

Comprehensive testing infrastructure for Jarvis V2 with:
- **6 test suite categories** (Unit, E2E, API, Automation, Journey)
- **≥90% code coverage requirement**
- **Automated CI/CD pipeline** with GitHub Actions
- **Real-time Slack reporting**
- **Daily automated test summaries**

---

## 📁 Directory Structure

```
Jarvis/
├── tests/
│   ├── unit/                           # Unit tests (Vitest + Jest)
│   │   ├── vitality.test.ts           # Vitality calculation tests
│   │   └── api-client.test.ts         # API client unit tests
│   ├── e2e/                            # End-to-end tests (Playwright)
│   │   ├── vitality-dashboard.spec.ts # Dashboard E2E tests
│   │   └── api/
│   │       └── jarvis-api.api.spec.ts # API endpoint tests
│   ├── automation/                     # System orchestration tests
│   │   └── run-automation-tests.ts    # Automation test runner
│   ├── journeys/                       # User workflow simulations
│   │   └── run-journey-tests.ts       # Journey test runner
│   ├── fixtures/                       # Test data and mocks
│   ├── helpers/                        # Test utilities
│   │   ├── jest.setup.ts              # Jest configuration
│   │   └── vitest.setup.ts            # Vitest configuration
│   └── README.md                       # Testing documentation
│
├── scripts/
│   ├── run-all-tests.ts               # Master test runner
│   ├── test-reporter.ts               # Slack integration
│   └── slack-daily-report.ts          # Daily summary generator
│
├── .github/
│   └── workflows/
│       └── tests.yml                   # GitHub Actions CI/CD
│
├── logs/
│   └── tests/                          # Test execution logs
│       ├── test-results-*.json
│       └── daily-report-*.json
│
├── jest.config.ts                      # Jest configuration
├── vitest.config.ts                    # Vitest configuration
└── playwright.config.ts                # Playwright configuration
```

---

## 🚀 Quick Start

### Install Dependencies

```bash
npm ci
npx playwright install --with-deps
```

### Run All Tests

```bash
npm test                # All test suites (sequential)
npm run test:parallel   # All test suites (parallel)
```

### Run Specific Suites

```bash
npm run test:unit       # Unit tests (Vitest + Jest)
npm run test:e2e        # E2E tests (Playwright)
npm run test:api        # API tests
npm run test:automation # Orchestration tests
npm run test:journeys   # User journey tests
```

---

## 🎯 Test Categories

### 1. Unit Tests (Vitest + Jest)

**Purpose**: Test individual components and functions in isolation

**Location**: `tests/unit/`

**Frameworks**:
- Vitest (modern, fast)
- Jest (traditional, robust)

**Coverage Target**: ≥90%

**Example Tests**:
- Vitality score calculations
- API client methods
- Data transformations
- Utility functions

**Run Command**:
```bash
npm run test:unit:vitest   # Vitest only
npm run test:unit:jest     # Jest only
npm run test:unit          # Both
```

### 2. E2E Tests (Playwright)

**Purpose**: Test complete user flows through the UI

**Location**: `tests/e2e/`

**Framework**: Playwright

**Browsers**: Chromium, Firefox, WebKit

**Example Tests**:
- Dashboard rendering
- User interactions
- Navigation flows
- Data updates

**Run Command**:
```bash
npm run test:e2e           # Headless mode
npm run test:e2e:ui        # UI mode
npm run test:e2e:debug     # Debug mode
```

### 3. API Tests

**Purpose**: Validate all API endpoints

**Location**: `tests/e2e/api/`

**Framework**: Playwright (API testing)

**Example Tests**:
- GET /api/v1/jarvis/vitality
- POST /api/v1/jarvis/quick-actions/:action
- GET /api/v1/jarvis/alerts
- POST /api/v1/jarvis/desktop/query

**Run Command**:
```bash
npm run test:api
```

### 4. Automation Tests

**Purpose**: Test system orchestration and integration

**Location**: `tests/automation/`

**Example Tests**:
- Vitality calculation pipeline
- Quick action execution flow
- Alerting system integration
- Recommendation engine
- Data persistence

**Run Command**:
```bash
npm run test:automation
```

### 5. Journey Tests

**Purpose**: Simulate complete user workflows by persona

**Location**: `tests/journeys/`

**Personas**:
- DevOps Engineer (daily health checks)
- Site Reliability Engineer (performance investigation)
- On-Call Engineer (incident response)

**Example Journeys**:
- Daily Health Check
- Performance Investigation
- Incident Response

**Run Command**:
```bash
npm run test:journeys
```

---

## 🔧 Configuration Files

### jest.config.ts

```typescript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
}
```

### vitest.config.ts

```typescript
{
  test: {
    coverage: {
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90
      }
    }
  }
}
```

### playwright.config.ts

```typescript
{
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  projects: ['chromium', 'firefox', 'webkit', 'api']
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

**File**: `.github/workflows/tests.yml`

**Triggers**:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Daily at 6 AM UTC
- Manual workflow dispatch

**Jobs**:

1. **unit-tests-vitest** (10 min timeout)
   - Checkout code
   - Install dependencies
   - Run Vitest with coverage
   - Upload coverage to Codecov

2. **unit-tests-jest** (10 min timeout)
   - Checkout code
   - Install dependencies
   - Run Jest with coverage
   - Upload coverage to Codecov

3. **e2e-tests** (20 min timeout)
   - Checkout code
   - Install dependencies
   - Install Playwright browsers
   - Run E2E tests
   - Upload Playwright report

4. **api-tests** (15 min timeout)
   - Checkout code
   - Install dependencies
   - Start test server
   - Run API tests

5. **automation-tests** (15 min timeout)
   - Checkout code
   - Install dependencies
   - Start test server
   - Run automation tests

6. **journey-tests** (20 min timeout)
   - Checkout code
   - Install dependencies
   - Start test server
   - Run journey tests

7. **test-summary** (Always runs)
   - Download all artifacts
   - Generate GitHub summary
   - Send Slack notification

8. **daily-report** (Schedule only)
   - Generate daily test report
   - Send to Slack

---

## 📢 Slack Integration

### Real-Time Test Reports

After each test run, a detailed Slack message is sent with:

```
🤖 Jarvis V2 Test Results

Repository: jarvis/v2
Branch: main
Trigger: push
Actor: developer

Total Suites: 6
Success Rate: 95.5%

✅ Unit Tests (Vitest): PASSED
✅ Unit Tests (Jest): PASSED
✅ E2E Tests: PASSED
❌ API Tests: FAILED
✅ Automation Tests: PASSED
✅ Journey Tests: PASSED

[View Details on GitHub]
```

### Daily Summary Report

**Schedule**: Every day at 6 AM UTC

**Contents**:
- Date
- Total test runs
- Success rate
- Average duration
- Trends analysis
- Tests by category
- Top failures
- Performance metrics (fastest/slowest tests)

**Sample Message**:

```
📊 Daily Test Summary - 2025-10-07

Total Runs: 12
Success Rate: 94.3%
Avg Duration: 87.2s

🟢 Excellent success rate! Fast execution times.

📦 Tests by Category:
  UNIT: 45/48 (93.8%)
  E2E: 23/24 (95.8%)
  API: 18/18 (100%)
  AUTOMATION: 5/5 (100%)
  JOURNEY: 9/9 (100%)

❌ Top Failures:
  1. Unit Tests (Vitest) - 3x
  2. E2E Dashboard Tests - 2x

⚡ Performance:
  Fastest: API Health Check (1.2s)
  Slowest: Journey Tests (18.3s)
```

---

## 📈 Coverage Reports

### Viewing Coverage

#### Vitest Coverage
```bash
npm run test:unit:vitest
open coverage/unit-vitest/index.html
```

#### Jest Coverage
```bash
npm run test:unit:jest
open coverage/unit/index.html
```

#### Playwright Report
```bash
npm run test:e2e
npx playwright show-report
```

### Coverage Artifacts

Coverage reports are uploaded to:
- **Codecov** (cloud coverage tracking)
- **GitHub Actions Artifacts** (downloadable)
- **Local** `coverage/` directory

---

## 🛠️ Test Runner

### Master Test Runner

**File**: `scripts/run-all-tests.ts`

**Features**:
- Sequential or parallel execution
- Real-time progress reporting
- Coverage aggregation
- Error collection
- Slack integration
- Log persistence

**Usage**:

```bash
# Sequential mode (default)
npm run test:all

# Parallel mode
npm run test:parallel

# With fail-fast
FAIL_FAST=true npm run test:all
```

**Output**:

```
🚀 Starting Jarvis V2 Test Suite
Timestamp: 2025-10-07T14:30:00.000Z

================================================================================
🧪 Running: Unit Tests (Vitest)
================================================================================

✅ Unit Tests (Vitest) passed in 2341ms

... [additional suites]

================================================================================
📊 TEST SUMMARY
================================================================================

Total Suites: 6
✅ Passed: 5
❌ Failed: 1
⏭️  Skipped: 0
⏱️  Duration: 87.42s
📈 Average Coverage: 93.2%

================================================================================
DETAILED RESULTS:
================================================================================

✅ Unit Tests (Vitest)
   Status: PASSED
   Duration: 2.34s
   Coverage: 94.20%

... [detailed results for each suite]

📄 Results saved to: logs/tests/test-results-1696689000000.json
✅ Test results sent to Slack
```

---

## 📝 Writing Tests

### Unit Test Template

```typescript
// tests/unit/feature.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureName', () => {
  let mockData: any;

  beforeEach(() => {
    mockData = { /* setup */ };
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      const result = doSomething(mockData);
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      const result = doSomething(edgeCase);
      expect(result).toBeDefined();
    });

    it('should throw on invalid input', () => {
      expect(() => doSomething(null)).toThrow();
    });
  });
});
```

### E2E Test Template

```typescript
// tests/e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display correctly', async ({ page }) => {
    const element = page.locator('[data-testid="element"]');
    await expect(element).toBeVisible();
    await expect(element).toContainText('Expected Text');
  });

  test('should handle user interaction', async ({ page }) => {
    await page.click('[data-testid="button"]');
    await expect(page).toHaveURL(/success/);
  });
});
```

### API Test Template

```typescript
// tests/e2e/api/feature.api.spec.ts
import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api/v1';

test('GET /endpoint - should return data', async ({ request }) => {
  const response = await request.get(`${API_BASE}/endpoint`);

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data).toHaveProperty('field');
});
```

---

## 🔍 Debugging

### Playwright UI Mode

```bash
npm run test:e2e:ui
```

### Playwright Debug Mode

```bash
npm run test:e2e:debug
```

### Vitest Watch Mode

```bash
npm run test:unit:watch
```

### View Test Logs

```bash
ls -la logs/tests/
cat logs/tests/test-results-*.json
```

---

## 🎯 Best Practices

1. **Write tests first** (TDD approach)
2. **Maintain ≥90% coverage**
3. **Use descriptive test names**
4. **Test edge cases and errors**
5. **Keep tests isolated and independent**
6. **Mock external dependencies**
7. **Use data-testid for E2E selectors**
8. **Run tests locally before pushing**
9. **Review coverage reports**
10. **Update tests with code changes**

---

## 🚨 Troubleshooting

### Common Issues

**Tests failing locally but passing in CI**:
- Check Node.js version matches CI
- Clear `node_modules` and reinstall
- Check for environment-specific code

**Coverage below threshold**:
- Run `npm run test:coverage`
- Review `coverage/` reports
- Add missing test cases

**Playwright browser errors**:
- Run `npx playwright install --with-deps`
- Check system dependencies

**Slack notifications not working**:
- Verify `SLACK_WEBHOOK_URL` secret
- Test webhook with curl
- Check Slack app permissions

---

## 📚 Resources

- [Vitest Docs](https://vitest.dev/)
- [Jest Docs](https://jestjs.io/)
- [Playwright Docs](https://playwright.dev/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Codecov Docs](https://docs.codecov.com/)

---

## 🤝 Contributing

When adding features:

1. Write tests alongside code
2. Ensure all tests pass locally
3. Verify coverage meets ≥90%
4. Add journey tests for user-facing features
5. Update test documentation
6. Run `npm run test:all` before committing

---

**Testing Infrastructure Status**: ✅ **READY**

**Last Updated**: 2025-10-07

**Maintained by**: Jarvis V2 QA Team
