# Jarvis V2 Autonomous Testing Module

## Overview

The Jarvis V2 Testing Module provides **autonomous test orchestration** with intelligent auto-fix capabilities, adaptive learning from recurring failures, and seamless integration with S3 storage and Slack notifications.

## Features

### 🤖 Autonomous Test Execution
- **Daily Automated Runs**: Executes at 9 AM UTC every day
- **Debug Re-runs**: Automatically re-runs failed tests with debug flags enabled
- **Multi-Suite Support**: Runs Python orchestrator, Playwright E2E, Vitest unit tests

### 🔧 Intelligent Auto-Fix
- **Pattern Recognition**: Identifies common failure patterns (timeouts, undefined values, network issues, etc.)
- **Code Patch Generation**: Proposes code patches for failed tests
- **Confidence Scoring**: Rates fix proposals as low/medium/high confidence
- **Audit Logging**: All fix attempts logged to `logs/jarvis/test-autofix.log`

### 📊 S3 Integration
- **Daily Results Storage**: Uploads test results to `s3://jarvismemory/tests/YYYY-MM-DD.json`
- **Historical Tracking**: Maintains test history for trend analysis
- **Encrypted Storage**: Uses AES256 server-side encryption

### 📢 Slack Notifications
- **Real-time Alerts**: Sends summary after each test run
- **Auto-Fix Reports**: Includes proposed fixes in notifications
- **Recurring Failure Warnings**: Highlights tests that fail repeatedly

### 🧠 Adaptive Learning
- **Failure Pattern Detection**: Tracks recurring test failures
- **DevOps Recommendations**: Suggests infrastructure or code improvements
- **Learning Insights**: Builds knowledge base of test failure patterns

## API Endpoints

### 1. Get Test Status
```http
GET /api/v1/jarvis/testing/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suites": [...],
    "adaptiveLearning": [
      {
        "testName": "user-auth-flow",
        "failureCount": 3,
        "lastFailed": "2025-10-07T14:00:00Z",
        "patterns": ["timeout", "network-issue"],
        "recommendedAction": "Increase timeout values or mock network calls"
      }
    ],
    "devOpsRecommendations": [
      "[user-auth-flow] Increase timeout values (Failed 3 times)"
    ],
    "testHistory": [...]
  }
}
```

### 2. Run All Tests
```http
POST /api/v1/jarvis/testing/run-all
```

**Request Body:**
```json
{
  "autoFix": true,
  "priority": "high",
  "scheduledBy": "user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTests": 150,
    "passed": 145,
    "failed": 5,
    "passRate": 96.7,
    "duration": 45.3
  },
  "message": "All tests completed. Pass rate: 96.7%"
}
```

### 3. Fix Failed Tests
```http
POST /api/v1/jarvis/testing/fix-failed
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": {
      "timestamp": "2025-10-07T14:00:00Z",
      "totalTests": 150,
      "passed": 145,
      "failed": 5,
      "passRate": 96.7,
      "autoFixProposals": [
        {
          "testName": "api-timeout-test",
          "failureReason": "Exceeded timeout of 5000ms",
          "proposedPatch": "jest.setTimeout(30000);",
          "filePath": "tests/api.test.ts",
          "confidence": "high",
          "reasoning": "Increase test timeout or optimize async operations"
        }
      ],
      "recurringFailures": ["user-auth-flow", "database-connection"]
    },
    "message": "Auto-fix complete. 3 fix proposals generated."
  }
}
```

### 4. Get Adaptive Learning Insights
```http
GET /api/v1/jarvis/testing/adaptive-learning
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLearnings": 5,
    "learnings": [...],
    "recommendations": [
      "[user-auth-flow] Increase timeout values or mock network calls (Failed 3 times)",
      "[db-migration-test] Review database migrations (Failed 5 times)"
    ]
  }
}
```

## Configuration

### Environment Variables

```bash
# S3 Configuration
S3_BUCKET_NAME=ai-dawg-jarvis
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Test Settings
AUTO_FIX=1                    # Enable auto-fix by default
DEBUG=*                        # Debug mode for test re-runs
LOG_LEVEL=debug               # Logging level
```

### Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| **daily-test-suite** | `0 9 * * *` (9 AM UTC) | Full test suite with auto-fix |
| **hourly-health-check** | `0 * * * *` | Quick health status check |
| **pre-deploy-validation** | `0 9,17 * * 1-5` | Pre-deployment validation (9 AM, 5 PM weekdays) |
| **weekend-full-regression** | `0 2 * * 0` | Full regression on Sundays |

## Usage Examples

### Manual Test Run

```bash
# Via API
curl -X POST http://localhost:3001/api/v1/jarvis/testing/run-all \
  -H "Content-Type: application/json" \
  -d '{"autoFix": true, "priority": "high"}'

# Via npm script
npm run test:all
```

### Fix Failed Tests

```bash
curl -X POST http://localhost:3001/api/v1/jarvis/testing/fix-failed
```

### View Adaptive Learning

```bash
curl http://localhost:3001/api/v1/jarvis/testing/adaptive-learning
```

### Check Test Status

```bash
curl http://localhost:3001/api/v1/jarvis/testing/status
```

## Auto-Fix Patterns

The orchestrator recognizes and fixes these common patterns:

### 1. Timeout Errors
**Pattern:** `timeout|exceeded`
**Fix:** Increase timeout or add retry logic
```javascript
jest.setTimeout(30000); // 30 seconds
```

### 2. Module Not Found
**Pattern:** `cannot find module|module not found`
**Fix:** Check import path or install dependency
```javascript
// Install: npm install missing-module
import { ... } from './corrected-path';
```

### 3. Undefined/Null Errors
**Pattern:** `undefined.*property`
**Fix:** Add null checks or optional chaining
```javascript
if (obj && obj.property) { /* ... */ }
// OR
const value = obj?.property?.nested;
```

### 4. Network Errors
**Pattern:** `network request failed|econnrefused`
**Fix:** Mock network requests
```javascript
jest.mock('./api-client', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: 'mocked' }))
}));
```

## Adaptive Learning System

### How It Works

1. **Track Failures**: Monitors test failures across runs
2. **Detect Patterns**: Identifies recurring issues (3+ failures)
3. **Extract Insights**: Analyzes error types and patterns
4. **Generate Recommendations**: Provides actionable DevOps suggestions

### Learning Insights

The system tracks:
- **Failure Count**: Number of times a test has failed
- **Failure Patterns**: Common error types (timeout, undefined, network, etc.)
- **Recommended Actions**: Specific fixes for recurring issues

### DevOps Recommendations

After 3+ failures, the system recommends:
- Code improvements
- Infrastructure changes
- Test refactoring
- Dependency updates

## Slack Notification Format

```
✅ Jarvis Test Suite Results

Test Suite Summary
Total Tests: 150
Passed: 145
Failed: 5
Pass Rate: 96.7%
Duration: 45.3s
Timestamp: 2025-10-07T14:00:00Z

Auto-Fix Proposals:
1. `api-timeout-test` (high confidence)
   Reason: Increase test timeout or optimize async operations
2. `db-connection-test` (medium confidence)
   Reason: Mock external API calls

Recurring Failures:
• user-auth-flow
• database-connection
```

## S3 Storage Structure

```
s3://jarvismemory/tests/
  ├── 2025-10-07.json
  ├── 2025-10-08.json
  ├── 2025-10-09.json
  └── ...
```

Each file contains:
```json
{
  "timestamp": "2025-10-07T09:00:00Z",
  "totalTests": 150,
  "passed": 145,
  "failed": 5,
  "passRate": 96.7,
  "duration": 45.3,
  "failures": [...],
  "autoFixProposals": [...],
  "recurringFailures": [...]
}
```

## Integration with DevOps Agent (Claude #3)

The Testing Module provides recommendations to the DevOps Agent:

```typescript
// Get recommendations
const recommendations = testingOrchestrator.getDevOpsRecommendations();

// Example recommendations:
[
  "[user-auth-flow] Increase timeout values (Failed 3 times)",
  "[db-test] Use in-memory DB for tests (Failed 5 times)",
  "[api-integration] Mock external services (Failed 4 times)"
]
```

## Logs

### Auto-Fix Log Location
```
logs/jarvis/test-autofix.log
```

### Log Format
```
[2025-10-07T09:00:00Z] === New Test Run Started ===
[2025-10-07T09:00:15Z] Re-running 5 failed tests with debug mode
[2025-10-07T09:00:30Z] Fix proposed for "api-timeout-test": Increase test timeout
jest.setTimeout(30000);
[2025-10-07T09:00:45Z] Test run complete: 145/150 passed (96.7%), 3 fix proposals generated
```

## Architecture

```
┌─────────────────────────────────────────┐
│    Jarvis Testing Module (index.ts)     │
│  - Test suite management                │
│  - API endpoints                        │
│  - Scheduled jobs                       │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  Testing Orchestrator (orchestrator.ts) │
│  - Auto-fix logic                       │
│  - Pattern recognition                  │
│  - Adaptive learning                    │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┬──────────┬────────────┐
       ↓               ↓          ↓            ↓
   ┌───────┐      ┌────────┐  ┌─────┐    ┌─────────┐
   │ Tests │      │   S3   │  │Slack│    │  Logs   │
   └───────┘      └────────┘  └─────┘    └─────────┘
```

## Troubleshooting

### Auto-Fix Not Working
- Check `logs/jarvis/test-autofix.log` for errors
- Verify `AUTO_FIX=1` in environment
- Ensure test failures match known patterns

### S3 Upload Failing
- Verify AWS credentials in `.env`
- Check bucket exists: `ai-dawg-jarvis` or `S3_BUCKET_NAME`
- Ensure IAM permissions for `s3:PutObject`

### Slack Notifications Not Sent
- Verify `SLACK_WEBHOOK_URL` is set
- Test webhook manually with curl
- Check Slack app permissions

### Tests Not Running at 9 AM UTC
- Verify cron scheduler is running
- Check timezone configuration
- Review scheduler logs

## Future Enhancements

- [ ] ML-based fix prediction using historical data
- [ ] Integration with GitHub Actions for CI/CD
- [ ] Visual regression testing with screenshot comparison
- [ ] Performance regression detection
- [ ] Automated dependency updates based on test failures
- [ ] Real-time dashboard for test monitoring

## Contributing

To extend the Testing Module:

1. Add new auto-fix patterns in `orchestrator.ts`
2. Implement additional test runners
3. Enhance adaptive learning algorithms
4. Add new API endpoints as needed

---

**Built with ❤️ by Jarvis V2 Autonomous System**
