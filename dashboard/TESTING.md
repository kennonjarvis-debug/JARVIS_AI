# Jarvis Dashboard - Testing Documentation

## Overview

The Jarvis Dashboard has a comprehensive testing suite covering:
- ✅ **Backend API Tests** (Jest + Supertest)
- ✅ **Frontend Component Tests** (React Testing Library)
- ✅ **End-to-End Tests** (Playwright)
- ✅ **Integration Tests** (Health Check Script)
- ✅ **CI/CD Pipeline** (GitHub Actions)

## Test Coverage

### Backend Tests (~80% coverage target)
- API endpoint tests (all 8 endpoints)
- Data source tests
- Error handling tests
- SSE streaming tests
- Chat functionality tests

### Frontend Tests (~70% coverage target)
- Component unit tests (5 components)
- Rendering tests
- User interaction tests
- Data display tests
- Accessibility tests

### E2E Tests
- Dashboard loading and navigation
- Data fetching and display
- Chat interface interactions
- Voice input functionality
- Mobile/tablet responsiveness
- Error handling

### Integration Tests
- Service health checks
- API endpoint availability
- Response time monitoring
- Cross-service communication

---

## Running Tests

### Quick Start

```bash
# Run all tests
cd /Users/benkennon/Jarvis/dashboard
npm run test:all

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run E2E tests
npm run test:e2e

# Run integration health check
npm run health-check
```

### Backend Tests

```bash
cd dashboard/backend

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Verbose output
npm run test:verbose
```

**Test Files:**
- `__tests__/api/endpoints.test.ts` - API endpoint tests
- `__tests__/data-sources/collectors.test.ts` - Data collection tests
- `__tests__/utils/helpers.ts` - Test utilities

### Frontend Tests

```bash
cd dashboard/frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Verbose output
npm run test:verbose
```

**Test Files:**
- `__tests__/components/BusinessMetrics.test.tsx`
- `__tests__/components/InstanceMonitor.test.tsx`
- `__tests__/components/SystemHealth.test.tsx`
- `__tests__/components/WaveProgress.test.tsx`
- `__tests__/components/FinancialSummary.test.tsx`

### E2E Tests

```bash
cd dashboard

# Run all E2E tests (all browsers)
npx playwright test

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run specific test file
npx playwright test e2e/dashboard.spec.ts

# Run in headed mode (see the browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Generate report
npx playwright show-report
```

**Test Files:**
- `e2e/dashboard.spec.ts` - Dashboard E2E tests
- `e2e/chat.spec.ts` - Chat interface E2E tests

### Integration Tests

```bash
cd dashboard

# Run health check
./tests/health-check.sh

# Or via npm
npm run health-check
```

**Checks:**
- Port availability (3003, 5001, 4000, 3001)
- API endpoint health
- Response times
- Service integration
- Frontend loading

---

## Test Configuration

### Jest Configuration

**Backend:** `dashboard/backend/jest.config.js`
- ESM support
- TypeScript support
- Coverage thresholds
- Test matching patterns

**Frontend:** `dashboard/frontend/jest.config.js`
- Next.js integration
- React Testing Library setup
- jsdom environment
- Coverage collection

### Playwright Configuration

**File:** `dashboard/playwright.config.ts`
- Multiple browser support (Chrome, Firefox, Safari)
- Mobile device testing
- Screenshot on failure
- Trace on retry
- Automatic web server startup

### CI/CD Pipeline

**File:** `.github/workflows/dashboard-tests.yml`

**Jobs:**
1. **backend-tests** - Run backend unit tests
2. **frontend-tests** - Run frontend component tests
3. **e2e-tests** - Run Playwright E2E tests
4. **integration-tests** - Run health check script
5. **test-summary** - Aggregate results

**Triggers:**
- Pull requests to main
- Pushes to main/main-*
- Changes in dashboard directory

---

## Writing Tests

### Backend API Test Example

```typescript
describe('GET /api/dashboard/overview', () => {
  it('should return complete dashboard overview', async () => {
    const response = await request(app)
      .get('/api/dashboard/overview')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('instances');
    expect(response.body.data).toHaveProperty('business');
  });
});
```

### Frontend Component Test Example

```typescript
describe('BusinessMetrics Component', () => {
  it('should display all 5 business categories', () => {
    render(<BusinessMetrics data={mockData} />);

    expect(screen.getByText('Music Generation')).toBeInTheDocument();
    expect(screen.getByText('Marketing & Strategy')).toBeInTheDocument();
  });
});
```

### E2E Test Example

```typescript
test('should load the dashboard successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Jarvis/i);
  await expect(page.getByText('Business Performance')).toBeVisible();
});
```

---

## Coverage Reports

### Viewing Coverage

After running tests with coverage:

```bash
# Backend coverage
open dashboard/backend/coverage/index.html

# Frontend coverage
open dashboard/frontend/coverage/index.html
```

### Coverage Targets

- **Backend:** >80% line coverage
- **Frontend:** >70% line coverage
- **Critical paths:** 100% coverage

---

## Troubleshooting

### Tests Failing

1. **Check if all services are running:**
   ```bash
   lsof -i :3003  # Frontend
   lsof -i :5001  # Backend API
   lsof -i :4000  # Control Plane
   lsof -i :3001  # AI DAWG
   ```

2. **Install dependencies:**
   ```bash
   cd dashboard/backend && npm install
   cd dashboard/frontend && npm install
   cd dashboard && npm install
   ```

3. **Clear test cache:**
   ```bash
   cd dashboard/backend && npx jest --clearCache
   cd dashboard/frontend && npx jest --clearCache
   ```

4. **Update Playwright browsers:**
   ```bash
   cd dashboard && npx playwright install
   ```

### Mock Data

Mock data is located in `dashboard/backend/__tests__/utils/helpers.ts`

### Port Conflicts

If tests fail due to port conflicts:
```bash
# Kill processes on ports
pkill -f "port 3003"
pkill -f "port 5001"
```

---

## Test Checklist

### Backend
- ✅ API endpoints return correct data
- ✅ Error handling works
- ✅ CORS configured correctly
- ✅ SSE streaming functional
- ✅ Chat endpoints working

### Frontend
- ✅ Components render without errors
- ✅ User interactions work
- ✅ Data displays correctly
- ✅ Error states show properly
- ✅ Loading states implemented

### Integration
- ✅ Dashboard connects to backend API
- ✅ Chat sends messages through full stack
- ✅ All services communicate
- ✅ Health checks pass

### E2E
- ✅ Full user journey works
- ✅ Mobile layout responsive
- ✅ Cross-browser compatible
- ✅ Error handling graceful

---

## Continuous Integration

Tests run automatically on:
- Every pull request
- Every push to main branches
- Can be triggered manually via GitHub Actions

**View Results:**
- GitHub Actions tab
- Pull request checks
- codecov.io (when configured)

---

## Best Practices

1. **Write tests first** (TDD approach)
2. **Test user behavior**, not implementation
3. **Keep tests isolated** and independent
4. **Use meaningful test names**
5. **Mock external dependencies**
6. **Test error cases**
7. **Maintain >80% coverage** for critical code
8. **Run tests before committing**

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://testingjavascript.com/)

---

## Support

For issues or questions about testing:
1. Check this documentation
2. Review existing test files
3. Run health check script
4. Check GitHub Actions logs
