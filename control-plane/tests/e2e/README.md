# JARVIS E2E Test Suite

Comprehensive end-to-end tests for the JARVIS Control Plane and AI DAWG ecosystem.

## Overview

This E2E test suite validates the complete system integration across:
- **Conversation Synchronization**: Multi-client WebSocket message sync
- **Music Production**: AI DAWG beat generation, vocal analysis, and mixing workflows
- **Autonomous System**: Domain agents, task detection, and execution
- **Vector Store**: Embedding storage and similarity search
- **Session Management**: Distributed session persistence across instances
- **API Integration**: General API endpoints and system health

## Test Files

```
tests/e2e/
├── helpers/
│   └── test-client.ts          # Test utilities (TestClient, TestAPIClient)
├── conversation-sync.test.ts   # WebSocket message synchronization (8 tests)
├── music-production.test.ts    # AI DAWG production workflows (8 tests)
├── autonomous-system.test.ts   # Autonomous agents and task execution (8 tests)
├── vector-store.test.ts        # Embedding storage and search (8 tests)
├── session-management.test.ts  # Session lifecycle and persistence (8 tests)
├── api-integration.test.ts     # General API endpoints (15 tests)
├── jest.config.js              # Jest configuration for E2E tests
├── setup.ts                    # Global test setup and teardown
└── README.md                   # This file
```

**Total Tests**: 55+ comprehensive E2E tests

## Prerequisites

### Required Services

All services must be running before executing E2E tests:

1. **JARVIS Control Plane** (port 4000)
   ```bash
   npm run dev
   ```

2. **PostgreSQL** (port 5432)
   ```bash
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
   ```

3. **Redis** (port 6379)
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

4. **AI DAWG Services**:
   - **Backend** (port 3001)
   - **Producer** (port 8001)
   - **Vocal Coach** (port 8000)
   - **AI Brain** (port 8002)

   ```bash
   # Navigate to AI DAWG directory and start services
   cd ../ai-dawg
   npm run dev
   ```

### Environment Variables

Create `.env.test` for E2E test configuration:

```bash
# JARVIS
JARVIS_URL=http://localhost:4000
NODE_ENV=test

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jarvis_test
REDIS_URL=redis://localhost:6379

# AI DAWG Services
BACKEND_URL=http://localhost:3001
PRODUCER_URL=http://localhost:8001
VOCAL_COACH_URL=http://localhost:8000
AI_BRAIN_URL=http://localhost:8002
```

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test Suite

```bash
# Conversation sync tests
npm run test:e2e -- conversation-sync

# Music production tests
npm run test:e2e -- music-production

# Autonomous system tests
npm run test:e2e -- autonomous-system

# Vector store tests
npm run test:e2e -- vector-store

# Session management tests
npm run test:e2e -- session-management

# API integration tests
npm run test:e2e -- api-integration
```

### Run Single Test

```bash
npm run test:e2e -- -t "should sync messages across desktop and web clients"
```

### Run with Coverage

```bash
npm run test:e2e -- --coverage
```

### Watch Mode (for development)

```bash
npm run test:e2e -- --watch
```

## Test Categories

### 1. Conversation Synchronization (8 tests)

Tests real-time message synchronization across multiple clients:

- ✅ Sync messages between desktop and web
- ✅ Sync messages across all three clients (desktop, web, iPhone)
- ✅ Handle client join/leave presence updates
- ✅ Maintain message order across clients
- ✅ Sync conversation history on late join
- ✅ Handle typing indicators across clients
- ✅ Persist messages across client reconnections

**Key scenarios**: Multi-client WebSocket communication, presence tracking, message ordering

### 2. Music Production Workflow (8 tests)

Tests complete AI DAWG music production pipeline:

- ✅ Generate beats via Producer service
- ✅ Analyze vocals via Vocal Coach service
- ✅ Optimize mixing via AI Brain service
- ✅ Fetch incomplete projects from Backend
- ✅ Detect autonomous music production opportunities
- ✅ Complete full music production workflow
- ✅ Sync projects across services
- ✅ Automate workflows via Backend

**Key scenarios**: Beat generation, vocal analysis, mixing optimization, project management

### 3. Autonomous System (8 tests)

Tests autonomous domain agents and task execution:

- ✅ Detect opportunities across all domains
- ✅ Detect music production opportunities
- ✅ Execute autonomous tasks with proper clearance
- ✅ Respect clearance levels for task execution
- ✅ Analyze system health and suggest fixes
- ✅ Prioritize tasks correctly
- ✅ Handle task execution failures gracefully
- ✅ Provide task execution results with metrics

**Key scenarios**: Opportunity detection, task prioritization, clearance levels, error handling

### 4. Vector Store (8 tests)

Tests embedding storage and similarity search:

- ✅ Store and retrieve vector embeddings
- ✅ Perform similarity search
- ✅ Filter search results by metadata
- ✅ Handle batch vector operations
- ✅ Delete vector documents
- ✅ Return vector store statistics
- ✅ Handle large batch deletions
- ✅ Preserve embedding dimensions

**Key scenarios**: Vector CRUD operations, similarity search, batch operations, filtering

### 5. Session Management (8 tests)

Tests distributed session persistence:

- ✅ Create and retrieve sessions
- ✅ Update session data
- ✅ Expire sessions after TTL
- ✅ Extend session TTL on access
- ✅ Handle multiple concurrent sessions
- ✅ Delete sessions
- ✅ Get all sessions for a user
- ✅ Clear all user sessions

**Key scenarios**: Session lifecycle, TTL management, multi-session support, cleanup

### 6. API Integration (15 tests)

Tests general API endpoints and system behavior:

- ✅ Return healthy status
- ✅ Handle CORS preflight requests
- ✅ Return 404 for unknown endpoints
- ✅ Handle malformed JSON
- ✅ Rate limit excessive requests
- ✅ Handle concurrent API requests
- ✅ Provide API version information
- ✅ Return metrics endpoint data
- ✅ Handle WebSocket upgrade requests
- ✅ Validate request content types
- ✅ Handle large payloads
- ✅ Handle missing required fields
- ✅ Return appropriate error messages
- ✅ Support query parameters
- ✅ Handle connection timeouts gracefully

**Key scenarios**: API reliability, error handling, rate limiting, CORS, validation

## Test Utilities

### TestClient

WebSocket client for simulating different JARVIS sources:

```typescript
const client = new TestClient('http://localhost:4000', 'desktop');
await client.connect();
await client.joinConversation(conversationId);
await client.sendMessage({ role: 'user', content: 'Hello!', conversationId });
const msg = await client.waitForMessage(msg => msg.type === 'message');
await client.disconnect();
```

### TestAPIClient

HTTP client for API endpoint testing:

```typescript
const api = new TestAPIClient();
const health = await api.getHealth();
const conversation = await api.createConversation('web');
const results = await api.vectorSearch('music production');
```

### Helper Functions

```typescript
// Wait for a condition
await waitFor(() => someCondition(), 5000);

// Sleep
await sleep(1000);
```

## Debugging Tests

### Enable Verbose Logging

```bash
npm run test:e2e -- --verbose
```

### Run Tests in Band (sequential)

```bash
npm run test:e2e -- --runInBand
```

### Increase Timeout

```bash
npm run test:e2e -- --testTimeout=60000
```

### Debug with Node Inspector

```bash
node --inspect-brk node_modules/.bin/jest tests/e2e/conversation-sync.test.ts
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm install
      - run: npm run build
      - run: npm run dev &
      - run: npm run test:e2e
```

## Best Practices

1. **Service Health Checks**: Always wait for services to be healthy before running tests
2. **Test Isolation**: Each test should be independent and clean up after itself
3. **Realistic Timeouts**: Use appropriate timeouts for async operations (default: 30s)
4. **Graceful Degradation**: Tests should warn but not fail if optional services are unavailable
5. **Cleanup**: Always disconnect clients and delete test data in `afterAll/afterEach`
6. **Logging**: Use console.log for debugging but keep production tests clean
7. **Sequential Execution**: E2E tests run sequentially (maxWorkers: 1) to avoid conflicts

## Troubleshooting

### "JARVIS not healthy" Error

```bash
# Check if JARVIS is running
curl http://localhost:4000/health

# Check logs
npm run dev
```

### "Connection refused" Errors

Ensure all required services are running:

```bash
# Check service ports
lsof -i :4000  # JARVIS
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :3001  # Backend
lsof -i :8000  # Vocal Coach
lsof -i :8001  # Producer
lsof -i :8002  # AI Brain
```

### WebSocket Connection Failures

```bash
# Test WebSocket manually
wscat -c ws://localhost:4000/ws?source=web
```

### Redis Connection Issues

```bash
# Test Redis
redis-cli ping

# Check Redis logs
docker logs <redis-container-id>
```

### Test Timeout Issues

Increase timeout in jest.config.js or for specific tests:

```typescript
test('long running test', async () => {
  // test code
}, 60000); // 60 second timeout
```

## Coverage Reports

After running tests with `--coverage`, view the report:

```bash
# Open HTML coverage report
open coverage/e2e/index.html

# View terminal coverage summary
cat coverage/e2e/lcov-report/index.html
```

## Contributing

When adding new E2E tests:

1. Follow existing test patterns and structure
2. Use descriptive test names: `should [expected behavior]`
3. Include appropriate timeouts for async operations
4. Add graceful fallbacks for optional services
5. Update this README with new test descriptions
6. Ensure tests are idempotent and can run multiple times
7. Add appropriate logging for debugging

## Performance Benchmarks

Expected E2E test execution times:

- Conversation Sync: ~30s
- Music Production: ~60s (requires AI DAWG services)
- Autonomous System: ~45s
- Vector Store: ~40s
- Session Management: ~35s
- API Integration: ~40s

**Total Suite**: ~4-5 minutes (with all services running)

## License

Part of the JARVIS Control Plane project. See root LICENSE file.
