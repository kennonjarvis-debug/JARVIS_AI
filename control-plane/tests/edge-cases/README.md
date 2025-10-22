# Edge Case Test Suite

Comprehensive edge case testing for critical user journeys in Jarvis + AI DAWG.

## Test Coverage

### 1. AI DAWG Project Creation (25+ scenarios)
- Special characters (emoji, unicode, SQL injection, XSS)
- Empty/null/undefined values
- Max length strings (10000+ chars)
- Duplicate names
- Invalid characters
- Race conditions
- Case sensitivity

### 2. Beat Generation (27+ scenarios)
- Invalid BPM values (0, -1, 99999, NaN, null, Infinity)
- Timeout scenarios
- Quota exceeded (rate limiting)
- Malformed requests
- Concurrent generation requests
- Invalid genres and parameters

### 3. Vocal Recording (12+ scenarios)
- No microphone access
- Interrupted WebSocket connections
- Buffer overflow (extremely long recordings)
- Zero-length recordings
- Corrupt audio data
- Malformed WebSocket messages
- Duplicate session IDs
- Rapid reconnection
- Large message handling

### 4. Service Health Monitoring (15+ scenarios)
- All services down simultaneously
- Partial failures (50% services down)
- Cascade failures
- Health check timeout
- Stale health data
- Concurrent health checks
- Network errors
- Circular dependencies

### 5. Cost Tracking (17+ scenarios)
- Negative costs
- Extreme values (billions, MAX_SAFE_INTEGER)
- Extreme decimals (10+ places)
- Division by zero in averages
- Null/undefined cost entries
- Calculation consistency (ARR = MRR * 12)
- Runway calculations
- Zero customer handling

## Running Tests

### Prerequisites
Ensure all services are running:
```bash
# Terminal 1: Jarvis Control Plane
cd /Users/benkennon/Jarvis
npm run dev

# Terminal 2: Dashboard API
cd /Users/benkennon/Jarvis/dashboard/backend
tsx dashboard-api.ts

# Terminal 3: AI DAWG Backend
cd /Users/benkennon/ai-dawg-v0.1
npm start
```

### Run All Edge Case Tests
```bash
cd /Users/benkennon/Jarvis/tests/edge-cases
tsx run-all-edge-cases.ts
```

### Run Individual Test Suites
```bash
# Project Creation
tsx 01-project-creation-edge-cases.test.ts

# Beat Generation
tsx 02-beat-generation-edge-cases.test.ts

# Vocal Recording
tsx 03-vocal-recording-edge-cases.test.ts

# Service Health
tsx 04-service-health-edge-cases.test.ts

# Cost Tracking
tsx 05-cost-tracking-edge-cases.test.ts
```

## Output

The test suite generates:

1. **Console Output**: Detailed results for each test
2. **JSON Reports**: Individual results files
   - `results-project-creation.json`
   - `results-beat-generation.json`
   - `results-vocal-recording.json`
   - `results-service-health.json`
   - `results-cost-tracking.json`
   - `edge-case-test-report.json` (comprehensive)

3. **Markdown Report**: `EDGE_CASE_TEST_REPORT.md`

## Exit Codes

- `0`: All tests passed, no bugs found
- `1`: Bugs found (high/medium/low priority)
- `2`: Critical bugs found

## Test Result Structure

```typescript
interface TestResult {
  scenario: string;          // Description of test scenario
  category: string;          // Test category
  passed: boolean;           // Whether test passed
  error?: string;            // Error message if failed
  severity?: 'critical' | 'high' | 'medium' | 'low';  // Bug severity
}
```

## Adding New Tests

To add new edge case tests:

1. Create a new test file: `06-new-feature-edge-cases.test.ts`
2. Follow the same structure as existing tests
3. Export `runNewFeatureEdgeCases()` function and `results` array
4. Import and run in `run-all-edge-cases.ts`

Example:
```typescript
import { runNewFeatureEdgeCases, results as newResults } from './06-new-feature-edge-cases.test.js';

// In runAllEdgeCases():
await runNewFeatureEdgeCases();
suites.push({
  name: 'New Feature',
  results: [...newResults],
  // ...
});
```

## Creative Edge Cases Tested

### Race Conditions
- 10 concurrent project creation requests with same name
- 5 concurrent beat generation requests
- 100 simultaneous health checks

### Extreme Load
- 20 rapid beat generation requests (quota testing)
- 100MB audio recording (buffer overflow)
- 10MB single WebSocket message

### Malformed Input
- SQL injection in project names and genres
- XSS attempts in all text fields
- Invalid JSON in API requests
- Corrupt base64 audio data

### Boundary Cases
- BPM values: 0, -1, 1, 99999, Infinity, -Infinity, NaN
- String lengths: 0, 1, 255, 256, 10000+ characters
- Decimal precision: 0, 2, 10+ decimal places
- Division by zero scenarios

### State Management
- Duplicate session IDs in WebSocket
- Rapid reconnection (10 times)
- Interrupted connections mid-operation
- Stale cache data detection

## Bug Severity Levels

- **Critical**: System crashes, data corruption, security vulnerabilities
- **High**: Features broken, incorrect calculations, data loss risk
- **Medium**: Degraded UX, minor calculation errors, validation gaps
- **Low**: Edge cases that don't affect typical users

## Test Metrics

- **Total Scenarios**: 96+ edge cases
- **Coverage Areas**: 5 critical user journeys
- **Test Types**: API testing, WebSocket testing, concurrent testing, boundary testing
- **Estimated Runtime**: 2-5 minutes (depending on timeouts)
