# Jarvis Control Plane Architecture

**Version:** 2.0
**Last Updated:** 2025-10-08

---

## Overview

The Jarvis Control Plane is the central orchestration layer that sits between external clients (ChatGPT, Claude, Web UI, mobile apps) and the AI Dawg execution engine. It provides a unified API gateway, health monitoring, and integration points for multiple AI assistants.

---

## System Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        EXTERNAL CLIENTS                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ ChatGPT  │  │  Claude  │  │  Web UI  │  │  Mobile Apps │  │
│  │  Custom  │  │  Desktop │  │          │  │   (Siri)     │  │
│  │   GPT    │  │   (MCP)  │  │          │  │              │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬────────┘  │
└───────┼─────────────┼─────────────┼───────────────┼───────────┘
        │             │             │               │
        └──────┬──────┴──────┬──────┴───────┬───────┘
               │             │              │
        ┌──────▼─────────────▼──────────────▼───────┐
        │    JARVIS CONTROL PLANE (Port 4000)       │
        │  ┌─────────────────────────────────────┐  │
        │  │       API Gateway (Express)         │  │
        │  │  • CORS & Security (Helmet)         │  │
        │  │  • Rate Limiting                    │  │
        │  │  • Bearer Token Auth                │  │
        │  │  • Request Logging                  │  │
        │  └────────────┬────────────────────────┘  │
        │               │                            │
        │  ┌────────────▼────────────────────────┐  │
        │  │       Module Router                  │  │
        │  │  • Command routing                   │  │
        │  │  • Retry logic (3 attempts)          │  │
        │  │  • Exponential backoff              │  │
        │  │  • Error handling                    │  │
        │  └────────────┬────────────────────────┘  │
        │               │                            │
        │  ┌────────────▼────────────────────────┐  │
        │  │     Health Aggregator                │  │
        │  │  • Service health checks             │  │
        │  │  • Status aggregation                │  │
        │  │  • Performance monitoring            │  │
        │  └──────────────────────────────────────┘  │
        │                                             │
        │  ┌──────────────────────────────────────┐  │
        │  │    Integration Layer (Stubs)         │  │
        │  │  • ChatGPT Webhook Handler           │  │
        │  │  • Claude MCP Server                 │  │
        │  │  • (Future: Alexa, Google Assistant) │  │
        │  └──────────────────────────────────────┘  │
        └─────────────────┬───────────────────────────┘
                          │
    ┌─────────────────────▼──────────────────────┐
    │    HTTP Requests (with retry logic)        │
    └─────────────────────┬──────────────────────┘
                          │
        ┌─────────────────▼───────────────────┐
        │   AI DAWG EXECUTION ENGINE          │
        │        (Port 3001)                   │
        │  ┌───────────────────────────────┐  │
        │  │   Backend API                 │  │
        │  │   • Module execution          │  │
        │  │   • Business logic            │  │
        │  └───────────┬───────────────────┘  │
        │              │                       │
        │  ┌───────────▼───────────────────┐  │
        │  │   Python Microservices        │  │
        │  │   • Vocal Coach (8000)        │  │
        │  │   • Producer (8001)           │  │
        │  │   • AI Brain (8002)           │  │
        │  └───────────┬───────────────────┘  │
        │              │                       │
        │  ┌───────────▼───────────────────┐  │
        │  │   Data Layer                  │  │
        │  │   • PostgreSQL (5432)         │  │
        │  │   • Redis (6379)              │  │
        │  │   • MinIO S3 (9000/9001)      │  │
        │  └───────────────────────────────┘  │
        └─────────────────────────────────────┘
```

---

## Component Breakdown

### 1. API Gateway (`src/core/gateway.ts`)

**Responsibilities:**
- HTTP server (Express)
- Route handling
- Security (CORS, Helmet, rate limiting)
- Authentication (Bearer token)
- Request/response logging
- Error handling

**Endpoints:**
- `GET /health` - Basic health check
- `GET /health/detailed` - Aggregated service health
- `GET /status` - Controller status
- `POST /api/v1/execute` - Module command execution
- `POST /integrations/chatgpt/webhook` - ChatGPT integration
- (Future) MCP transport for Claude

**Port:** 4000

---

### 2. Module Router (`src/core/module-router.ts`)

**Responsibilities:**
- Route commands to AI Dawg backend
- Implement retry logic
- Handle errors and timeouts
- Direct service routing (for Python microservices)

**Retry Strategy:**
```
Attempt 1: Immediate
Attempt 2: After 1-2s (1000ms + jitter)
Attempt 3: After 2-3s (2000ms + jitter)
```

**Error Classification:**
- Retryable: 503, network errors, timeouts
- Non-retryable: 400, 404, 401

---

### 3. Health Aggregator (`src/core/health-aggregator.ts`)

**Responsibilities:**
- Check health of all services
- Determine overall system status
- Measure service latency
- Provide detailed health reports

**Checked Services:**
- AI Dawg Backend (3001)
- AI Dawg Docker (3000)
- Vocal Coach (8000)
- Producer (8001)
- AI Brain (8002)
- PostgreSQL (via AI Dawg)
- Redis (via AI Dawg)

**Health Statuses:**
- `healthy`: All services responding
- `degraded`: Some services down
- `down`: Critical services down

**Timeout:** 5 seconds per service

---

### 4. Integration Layer

#### ChatGPT Webhook Handler (`src/integrations/chatgpt/webhook-handler.ts`)

**Purpose:** Handle requests from ChatGPT Custom GPT

**Status:** Stub (for Instance 3)

**Flow:**
```
ChatGPT → Webhook → Parse request → Module Router → AI Dawg
                                              ↓
AI Dawg → Module Router → Format response → ChatGPT
```

#### Claude MCP Server (`src/integrations/claude/mcp-server.ts`)

**Purpose:** Expose Jarvis tools to Claude Desktop via MCP

**Status:** Stub (for Instance 4)

**MCP Capabilities:**
- `tools/list` - List available Jarvis modules
- `tools/call` - Execute Jarvis commands
- `resources/list` - List data sources
- `resources/read` - Read data
- `prompts/list` - List prompt templates

---

## Data Flow

### Typical Command Execution

```
1. Client sends command
   POST /api/v1/execute
   {
     "module": "music",
     "action": "create_beat",
     "params": { "bpm": 120 }
   }

2. Gateway validates auth
   Check Bearer token

3. Module Router routes to AI Dawg
   POST http://localhost:3001/api/v1/jarvis/execute
   (with retry logic)

4. AI Dawg executes command
   - Validates module/action
   - Calls appropriate service
   - Returns result

5. Module Router returns response
   {
     "success": true,
     "data": { "beat_id": "..." },
     "timestamp": "..."
   }

6. Gateway sends response to client
```

---

## Error Handling Strategy

### Retry Logic

```typescript
for (attempt = 1; attempt <= 3; attempt++) {
  try {
    result = await sendToAIDawg(command)
    return result
  } catch (error) {
    if (attempt < 3) {
      delay = min(baseDelay * 2^(attempt-1), maxDelay) + jitter
      await sleep(delay)
    }
  }
}
return { success: false, error: "All retries failed" }
```

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable message",
  "timestamp": "2025-10-08T17:00:00.000Z"
}
```

---

## Security Model

### Authentication

**Current:** Bearer token in `Authorization` header
```
Authorization: Bearer test-token
```

**Future Options:**
- JWT tokens with expiration
- API keys with rate limits
- OAuth 2.0 for external integrations

### Rate Limiting

- 100 requests per 15 minutes per IP
- Applied to `/api/*` routes
- Configurable via environment

### CORS

- Configurable allowed origins
- Default: `*` (development)
- Production: Specific domains only

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JARVIS_PORT` | 4000 | Gateway port |
| `AI_DAWG_BACKEND_URL` | http://localhost:3001 | AI Dawg URL |
| `JARVIS_AUTH_TOKEN` | test-token | Auth token |
| `NODE_ENV` | development | Environment |
| `LOG_LEVEL` | info | Log verbosity |

See `.env.example` for full list.

---

## Logging

**Logger:** Winston

**Log Levels:**
- `error`: Critical failures
- `warn`: Retry attempts, degraded health
- `info`: Startup, requests, responses
- `debug`: Detailed execution flow

**Log Files:**
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only

---

## Performance Considerations

### Latency Targets

| Operation | Target |
|-----------|--------|
| Health check | < 100ms |
| Command routing | < 10ms |
| Full request (simple) | < 500ms |
| Full request (complex) | < 30s |

### Scalability

**Current:** Single-instance Node.js server

**Future:**
- Horizontal scaling with load balancer
- Redis for distributed rate limiting
- Message queue for async operations

---

## Monitoring & Observability

### Health Checks

- Exposed at `/health` and `/health/detailed`
- Used by load balancers and orchestrators
- Includes service latency metrics

### Logging

- Structured JSON logs (production)
- Human-readable logs (development)
- Request ID tracking (future)

### Metrics (Future)

- Request rate
- Error rate
- Latency percentiles (p50, p95, p99)
- Service availability

---

## Deployment

### Development

```bash
npm run dev
```

Runs with `tsx watch` for hot reload.

### Production

```bash
npm run build
npm start
```

Runs compiled JavaScript from `dist/`.

### Docker (Future)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
CMD ["node", "dist/main.js"]
```

---

## Future Enhancements

### Short Term
- [ ] Request ID tracking
- [ ] Structured error codes
- [ ] API versioning (v2)
- [ ] WebSocket support

### Medium Term
- [ ] Prometheus metrics
- [ ] OpenTelemetry tracing
- [ ] Redis-backed rate limiting
- [ ] Message queue for async ops

### Long Term
- [ ] GraphQL API
- [ ] Kubernetes deployment
- [ ] Multi-region support
- [ ] Plugin system

---

## Dependencies

### Core
- `express` - HTTP server
- `axios` - HTTP client
- `winston` - Logging
- `dotenv` - Config management

### Security
- `helmet` - Security headers
- `cors` - CORS handling
- `express-rate-limit` - Rate limiting

### Development
- `tsx` - TypeScript execution
- `typescript` - Type system
- `jest` - Testing

---

## Testing Strategy

### Unit Tests
- Module Router retry logic
- Health Aggregator status determination
- Error handling

### Integration Tests
- Full request flow
- Health check endpoints
- Error scenarios

### E2E Tests
- Command execution against real AI Dawg
- Integration with external systems

---

## Maintenance

### Regular Tasks
- Monitor logs for errors
- Check health status
- Review rate limit hits

### Updates
- Keep dependencies current
- Update API contract when changes are made
- Sync with Instance 2 on breaking changes

---

## Contact & Coordination

**Instance 1 (This):** Jarvis Control Plane
**Instance 2:** AI Dawg Backend
**Sync Document:** `/Users/benkennon/SYNC.md`

Update sync document every 90 minutes with:
- Completed tasks
- In-progress work
- Blockers
- API contract changes
- Questions for other instances
