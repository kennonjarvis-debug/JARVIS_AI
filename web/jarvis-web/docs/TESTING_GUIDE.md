# Jarvis Platform Testing Guide

## Overview

This guide covers all testing strategies, tools, and procedures for the Jarvis AI platform. Our testing pyramid ensures quality at every level from unit tests to production monitoring.

## Testing Pyramid

```
           ┌─────────────┐
           │   Manual    │ < 5%
           │   Testing   │
           ├─────────────┤
           │    E2E      │ 10%
           │   Tests     │
           ├─────────────┤
           │ Integration │ 20%
           │   Tests     │
           ├─────────────┤
           │    Unit     │ 70%
           │   Tests     │
           └─────────────┘
```

## 1. Unit Tests

### Coverage Requirements
- **Minimum:** 70% overall code coverage
- **Critical Paths:** 100% coverage
- **New Features:** 80%+ coverage required

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test auth.test.ts

# Watch mode
npm run test:watch
```

### Writing Unit Tests

**File Structure:**
```
src/
  services/
    user.service.ts
    user.service.test.ts    # Co-located test file
```

**Example Test:**
```typescript
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      const result = await service.createUser(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
    });

    it('should throw error for duplicate email', async () => {
      await expect(
        service.createUser({ email: 'existing@example.com' })
      ).rejects.toThrow('Email already exists');
    });
  });
});
```

## 2. Integration Tests

### Purpose
Test interactions between components, databases, APIs, and external services.

### Running Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm run test:integration database.test.ts

# Run with database cleanup
npm run test:integration:clean
```

### Test Categories

#### Database Tests (`tests/integration/database.test.ts`)
- Connection pooling
- Transaction handling
- Query performance
- Data integrity

#### Redis Tests (`tests/integration/redis.test.ts`)
- Caching operations
- Session storage
- Pub/sub messaging
- Key expiration

#### S3 Tests (`tests/integration/s3.test.ts`)
- File upload/download
- Signed URLs
- Bucket operations
- Multipart uploads

#### Email Tests (`tests/integration/email.test.ts`)
- Template rendering
- Send verification
- Attachment handling
- Bounce handling

#### Webhooks Tests (`tests/integration/webhooks.test.ts`)
- Webhook delivery
- Retry logic
- Signature verification
- Error handling

### Example Integration Test

```typescript
import { Database } from '@/lib/database';
import { Redis } from '@/lib/redis';

describe('User Cache Integration', () => {
  let db: Database;
  let redis: Redis;

  beforeAll(async () => {
    db = await Database.connect();
    redis = await Redis.connect();
  });

  afterAll(async () => {
    await db.disconnect();
    await redis.disconnect();
  });

  it('should cache user data after database fetch', async () => {
    const userId = 'test-user-123';

    // First fetch - should query database
    const user1 = await getUserWithCache(userId);
    expect(user1).toBeDefined();

    // Second fetch - should use cache
    const user2 = await getUserWithCache(userId);
    expect(user2).toEqual(user1);

    // Verify cache was used
    const cacheHit = await redis.get(`user:${userId}`);
    expect(cacheHit).toBeDefined();
  });
});
```

## 3. End-to-End (E2E) Tests

### Purpose
Test complete user journeys across the application.

### Technology
- **Framework:** Playwright
- **Browsers:** Chromium, Firefox, WebKit
- **Devices:** Desktop, Mobile, Tablet

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test auth.spec.ts

# Run specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug

# Generate report
npx playwright show-report
```

### Test Files

| File | Coverage |
|------|----------|
| `auth.spec.ts` | Registration, Login, 2FA, Password Reset |
| `observatory.spec.ts` | Observatory CRUD, Monitoring, Alerts |
| `integrations.spec.ts` | Third-party integrations |
| `ai-features.spec.ts` | AI chat, Insights, Automation |
| `billing.spec.ts` | Subscriptions, Payments, Invoices |

### Example E2E Test

```typescript
import { test, expect } from '@playwright/test';

test('user can create observatory', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to create observatory
  await page.click('text=Create Observatory');

  // Fill form
  await page.fill('[name="name"]', 'My Observatory');
  await page.fill('[name="description"]', 'Test observatory');

  // Submit
  await page.click('button:text("Create")');

  // Verify success
  await expect(page).toHaveURL(/\/observatory\/[a-z0-9-]+/);
  await expect(page.locator('text=My Observatory')).toBeVisible();
});
```

### Visual Regression Testing

```typescript
test('dashboard looks correct', async ({ page }) => {
  await page.goto('/dashboard');

  // Take screenshot and compare
  await expect(page).toHaveScreenshot('dashboard.png');
});
```

## 4. Load Testing

### Purpose
Verify system performance under expected and peak load conditions.

### Technology
- **Framework:** k6
- **Targets:** API, WebSocket, Database

### Running Load Tests

```bash
# API load test
k6 run tests/load/api-load.test.ts

# WebSocket load test
k6 run tests/load/websocket-load.test.ts

# Database stress test
k6 run tests/load/database-load.test.ts

# Run with specific VUs (virtual users)
k6 run --vus 1000 --duration 10m tests/load/api-load.test.ts
```

### Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Throughput | > 10,000 req/s | > 5,000 req/s |
| Response Time (P95) | < 200ms | < 500ms |
| Response Time (P99) | < 500ms | < 1000ms |
| Error Rate | < 0.1% | < 1% |
| Concurrent Users | 5,000+ | 3,000+ |
| WebSocket Connections | 5,000+ | 3,000+ |

### Test Scenarios

1. **Ramp-up Test:** Gradually increase load
2. **Spike Test:** Sudden traffic increase
3. **Soak Test:** Sustained load (24 hours)
4. **Stress Test:** Push to breaking point

## 5. Security Testing

### Running Security Audit

```bash
# Run comprehensive security audit
./scripts/security-audit.sh

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000

# Dependency audit
npm audit
npm audit fix

# Secrets scanning
trufflehog filesystem . --json
```

### Security Checklist

- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Authentication properly enforced
- [ ] SSL/TLS properly configured
- [ ] Security headers present
- [ ] No exposed secrets
- [ ] Dependencies up to date
- [ ] OWASP Top 10 addressed

## 6. Performance Testing

### Running Performance Audit

```bash
# Run comprehensive performance audit
./scripts/performance-audit.sh

# Lighthouse CI
lhci autorun

# WebPageTest
webpagetest test http://localhost:3000 --key YOUR_API_KEY
```

### Performance Metrics

**Lighthouse Scores (Target: 90+)**
- Performance
- Accessibility
- Best Practices
- SEO

**Core Web Vitals**
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

## 7. Accessibility Testing

### Running Accessibility Tests

```bash
# Run Axe-core tests
npm run test:a11y

# Playwright accessibility tests
npx playwright test accessibility.spec.ts
```

### WCAG 2.1 AA Compliance

- [ ] All images have alt text
- [ ] Color contrast meets standards
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Focus indicators visible
- [ ] No auto-playing media
- [ ] Forms properly labeled

## 8. Smoke Tests

### Purpose
Quick verification that critical features work after deployment.

### Running Smoke Tests

```bash
# Run smoke tests
npm run test:smoke

# Post-deployment verification
./scripts/post-deploy-check.sh
```

### Critical Paths

✅ User Registration
✅ User Login
✅ Observatory Creation
✅ Metric Ingestion
✅ AI Chat
✅ Integration Connection
✅ Subscription Purchase

## 9. Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:integration
      - run: npx playwright install
      - run: npm run test:e2e
      - run: ./scripts/security-audit.sh
      - run: ./scripts/performance-audit.sh
```

### Required Checks

All PRs must pass:
1. Unit tests (70%+ coverage)
2. Integration tests
3. E2E tests (critical paths)
4. Security scan (no critical issues)
5. Linting
6. Type checking

## 10. Test Data Management

### Test Database

```bash
# Seed test data
npm run db:seed:test

# Reset test database
npm run db:reset:test

# Create test fixtures
npm run test:fixtures:generate
```

### Test Users

```typescript
export const TEST_USERS = {
  regular: {
    email: 'user@example.com',
    password: 'Test123!'
  },
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!'
  },
  premium: {
    email: 'premium@example.com',
    password: 'Premium123!'
  }
};
```

## 11. Debugging Tests

### Playwright Debugging

```bash
# Run with debugger
npx playwright test --debug

# Trace viewer
npx playwright show-trace trace.zip

# Screenshots on failure
npx playwright test --screenshot=on

# Video recording
npx playwright test --video=on
```

### Jest Debugging

```bash
# Run single test
npm test -- --testNamePattern="user creation"

# Debug in VS Code
# Add breakpoint and press F5
```

## 12. Test Reporting

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### E2E Reports

```bash
# Generate Playwright report
npx playwright show-report

# View in browser
open playwright-report/index.html
```

## 13. Best Practices

### DO ✅

- Write tests before code (TDD)
- Keep tests independent
- Use descriptive test names
- Test edge cases
- Mock external dependencies
- Clean up after tests
- Use test fixtures
- Run tests in CI/CD

### DON'T ❌

- Don't test implementation details
- Don't share state between tests
- Don't use production data
- Don't skip cleanup
- Don't ignore flaky tests
- Don't hardcode values
- Don't test external services directly

## 14. Quick Reference

### Common Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run integration tests
npm run test:integration

# Run load tests
k6 run tests/load/api-load.test.ts

# Security audit
./scripts/security-audit.sh

# Performance audit
./scripts/performance-audit.sh

# Run smoke tests
npm run test:smoke
```

### Environment Variables

```bash
# Test environment
NODE_ENV=test
DATABASE_URL=postgresql://localhost/jarvis_test
REDIS_URL=redis://localhost:6379/1

# E2E test configuration
PLAYWRIGHT_BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# Load test configuration
BASE_URL=http://localhost:3000
TARGET_VUS=5000
DURATION=10m
```

## 15. Troubleshooting

### Common Issues

**Tests timing out**
```bash
# Increase timeout in jest.config.js
testTimeout: 30000
```

**Flaky E2E tests**
```bash
# Add explicit waits
await page.waitForSelector('[data-testid="element"]');
await page.waitForLoadState('networkidle');
```

**Database connection issues**
```bash
# Check database is running
docker ps | grep postgres

# Reset test database
npm run db:reset:test
```

## Support

For testing questions or issues:
- 📧 Email: dev-team@jarvis.ai
- 💬 Slack: #testing
- 📖 Docs: https://docs.jarvis.ai/testing

---

**Last Updated:** {{DATE}}
**Next Review:** Weekly during development
