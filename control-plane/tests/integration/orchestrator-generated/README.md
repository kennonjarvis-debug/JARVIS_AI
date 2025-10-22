# Orchestrator-Generated Integration Tests

Comprehensive end-to-end integration tests for the JARVIS AI system, covering all critical integration paths from frontend to database, including real-time WebSocket communication, S3 uploads, health monitoring, and business intelligence.

## Test Coverage

### 🔄 Path 1: JARVIS Control Plane → AI DAWG Backend → Database
**File:** `01-jarvis-to-database.test.ts`

Tests the full flow from JARVIS control plane commands to database persistence:
- ✅ Create project and verify database persistence
- ✅ Update project and verify propagation
- ✅ Concurrent project operations (data consistency)
- ✅ Error handling for invalid data
- ✅ Delete project and verify cleanup

**Target:** 5 scenarios | **Expected Duration:** ~10-15 seconds

---

### 🎵 Path 2: AI DAWG Backend → AI Producer → S3 Upload
**File:** `02-ai-producer-s3.test.ts`

Tests audio generation pipeline from request to S3 storage:
- ✅ Generate beat and verify S3 upload
- ✅ Concurrent audio generations
- ✅ Verify audio metadata preservation
- ✅ Error handling for invalid requests
- ✅ Producer health and metrics

**Target:** 5 scenarios | **Expected Duration:** ~60-120 seconds (audio generation)

---

### 🎤 Path 3: AI DAWG Frontend → Backend → Vocal Coach → WebSocket
**File:** `03-vocal-coach-websocket.test.ts`

Tests real-time vocal feedback via WebSocket:
- ✅ Real-time vocal feedback with < 100ms latency
- ✅ Multiple concurrent WebSocket connections
- ✅ WebSocket reconnection resilience
- ✅ High-frequency events (10+ events/sec throughput)
- ✅ Vocal Coach health and capabilities

**Target:** 5 scenarios | **Expected Duration:** ~20-30 seconds

---

### 🏥 Path 4: JARVIS Dashboard → Health Aggregator → All Services
**File:** `04-dashboard-health-aggregator.test.ts`

Tests health monitoring and service aggregation:
- ✅ Dashboard health check aggregation
- ✅ Detailed health from Control Plane
- ✅ Individual service health checks
- ✅ Health check caching and performance (< 5s)
- ✅ Business Intelligence health endpoint
- ✅ Health status code validation
- ✅ Dashboard overview aggregation

**Target:** 7 scenarios | **Expected Duration:** ~15-20 seconds

---

### 💰 Path 5: Business Intelligence → Cost Calculator → Metrics Storage
**File:** `05-business-intelligence-costs.test.ts`

Tests business metrics tracking and cost calculation:
- ✅ Track API usage and calculate costs
- ✅ Business intelligence insights
- ✅ Dashboard intelligence metrics
- ✅ Service alerts tracking
- ✅ Financial summary calculations (MRR, ARR, burn rate)
- ✅ Cost per provider breakdown
- ✅ Metrics timestamp validation
- ✅ Cache performance for metrics

**Target:** 8 scenarios | **Expected Duration:** ~20-30 seconds

---

## Total Test Coverage

- **Integration Paths:** 5
- **Test Scenarios:** 30+
- **Expected Total Duration:** 2-4 minutes

## Running the Tests

### Prerequisites

Ensure all services are running:
```bash
# JARVIS Control Plane (port 4000)
npm run start:gateway

# Dashboard API (port 5001)
npm run start:dashboard

# AI DAWG Backend (port 3001) - Optional
# Vocal Coach (port 8000) - Optional
# Producer (port 8001) - Optional
```

### Run All Tests

```bash
# Run all integration tests with detailed reporting
./tests/integration/orchestrator-generated/run-all-tests.sh
```

This will:
1. Check service availability
2. Run all 5 test suites sequentially
3. Generate a comprehensive test report
4. Display summary with pass/fail counts and execution times

### Run Individual Test Suites

```bash
# Test specific integration path
npm test tests/integration/orchestrator-generated/01-jarvis-to-database.test.ts
npm test tests/integration/orchestrator-generated/02-ai-producer-s3.test.ts
npm test tests/integration/orchestrator-generated/03-vocal-coach-websocket.test.ts
npm test tests/integration/orchestrator-generated/04-dashboard-health-aggregator.test.ts
npm test tests/integration/orchestrator-generated/05-business-intelligence-costs.test.ts
```

### Run with Watch Mode

```bash
# Watch mode for development
npm test -- --watch tests/integration/orchestrator-generated/
```

### Run with Coverage

```bash
# Generate coverage report
npm test -- --coverage tests/integration/orchestrator-generated/
```

## Test Reports

After running `run-all-tests.sh`, a detailed report is generated:

```
tests/integration/orchestrator-generated/test-report-YYYYMMDD-HHMMSS.txt
```

The report includes:
- Test execution summary
- Pass/fail counts per scenario
- Execution times for each test
- Error messages for failed tests
- Performance metrics (latency, throughput, etc.)

## Environment Variables

Tests can be configured via environment variables:

```bash
# Authentication
export JARVIS_AUTH_TOKEN="your-auth-token"

# Service URLs (defaults shown)
export JARVIS_API="http://localhost:4000"
export DASHBOARD_API="http://localhost:5001"
export AI_DAWG_API="http://localhost:3001"
export VOCAL_COACH_API="http://localhost:8000"
export PRODUCER_API="http://localhost:8001"
```

## Performance Targets

| Test | Target | Metric |
|------|--------|--------|
| Database operations | < 1s | Per operation |
| Audio generation | < 60s | Per track |
| WebSocket latency | < 100ms | Per message |
| Health aggregation | < 5s | Full check |
| Metrics retrieval | < 2s | Per request |

## Failure Scenarios Tested

Each integration path tests both success and failure cases:

- ✅ Invalid request data (400 errors)
- ✅ Missing authentication (401 errors)
- ✅ Service unavailability (503 errors)
- ✅ Timeout handling
- ✅ Concurrent operations and race conditions
- ✅ Data integrity and consistency
- ✅ Retry logic and resilience

## CI/CD Integration

To integrate with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    # Start services
    npm run start:services &
    sleep 10

    # Run tests
    ./tests/integration/orchestrator-generated/run-all-tests.sh

    # Upload report
    - uses: actions/upload-artifact@v3
      with:
        name: integration-test-report
        path: tests/integration/orchestrator-generated/test-report-*.txt
```

## Debugging Failed Tests

1. **Check service logs:**
   ```bash
   # JARVIS Control Plane logs
   tail -f logs/jarvis-gateway.log

   # Dashboard API logs
   tail -f dashboard/backend/logs/dashboard.log
   ```

2. **Verify service health manually:**
   ```bash
   curl http://localhost:4000/health
   curl http://localhost:5001/health
   ```

3. **Run individual test with verbose output:**
   ```bash
   npm test -- --verbose tests/integration/orchestrator-generated/01-jarvis-to-database.test.ts
   ```

4. **Check database state:**
   ```bash
   # If using PostgreSQL
   psql -d ai_dawg -c "SELECT * FROM projects WHERE id LIKE 'test-%';"
   ```

## Maintenance

- Tests are automatically generated by the orchestrator
- Update tests when API contracts change
- Keep test data isolated (use `test-*` prefixes)
- Clean up test data after each run
- Monitor test execution times and optimize as needed

## Support

For issues or questions:
- Check the main test report for detailed error messages
- Review service logs for stack traces
- Verify all dependencies are installed: `npm install`
- Ensure Node.js version >= 18.0.0

## License

Part of the JARVIS AI system. Internal use only.
