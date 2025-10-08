# Jarvis Control Plane v2.0

Central orchestration layer for AI Dawg execution engine. Provides API gateway, module routing, health aggregation, and integration points for external AI assistants.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 External Clients                    │
│  (ChatGPT, Claude, Web UI, Mobile Apps, etc.)      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│          JARVIS CONTROL PLANE (Port 4000)           │
│  ┌──────────────────────────────────────────────┐  │
│  │          API Gateway & Router                 │  │
│  │  - Authentication                             │  │
│  │  - Rate Limiting                              │  │
│  │  - Request Routing                            │  │
│  │  - Health Monitoring                          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │        Integration Layer                      │  │
│  │  - ChatGPT Webhooks                          │  │
│  │  - Claude MCP Server                          │  │
│  │  - Siri Shortcuts                             │  │
│  └──────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│        AI DAWG EXECUTION ENGINE (Port 3001)         │
│  - Music Production Modules                         │
│  - Voice Processing                                 │
│  - AI Brain (GPT-4o)                                │
│  - Database & Storage                               │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start the Control Plane

```bash
npm run dev
```

The gateway will start on port 4000.

### 4. Test Health Check

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "jarvis-control-plane",
  "version": "2.0.0",
  "timestamp": "2025-10-08T17:00:00.000Z",
  "port": 4000
}
```

## API Endpoints

### Health Checks

#### GET /health
Basic health check

```bash
curl http://localhost:4000/health
```

#### GET /health/detailed
Detailed health of all services

```bash
curl http://localhost:4000/health/detailed
```

Returns status of:
- AI Dawg Backend (3001)
- AI Dawg Docker (3000)
- Vocal Coach (8000)
- Producer (8001)
- AI Brain (8002)
- PostgreSQL
- Redis

### Module Execution

#### POST /api/v1/execute
Execute a module command

```bash
curl -X POST http://localhost:4000/api/v1/execute \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "music",
    "action": "create_beat",
    "params": {
      "genre": "hip-hop",
      "bpm": 120
    }
  }'
```

### System Status

#### GET /status
Get current controller status

```bash
curl -H "Authorization: Bearer test-token" \
  http://localhost:4000/status
```

## Module Command Format

Commands sent to `/api/v1/execute` must follow this schema:

```typescript
{
  module: string;    // Module name (e.g., "music", "vocal", "ai")
  action: string;    // Action to perform (e.g., "create_beat", "analyze")
  params: object;    // Action-specific parameters
}
```

## Project Structure

```
/Users/benkennon/Jarvis/
├── src/
│   ├── main.ts                    # Entry point
│   ├── core/
│   │   ├── gateway.ts             # API Gateway (Express server)
│   │   ├── module-router.ts       # Routes commands to AI Dawg
│   │   ├── health-aggregator.ts   # Health check aggregation
│   │   └── types.ts               # TypeScript type definitions
│   ├── jarvis-core/               # Extracted Jarvis controller logic
│   │   └── [from AI Dawg]
│   ├── integrations/
│   │   ├── chatgpt/
│   │   │   └── webhook-handler.ts # ChatGPT webhook (stub)
│   │   └── claude/
│   │       └── mcp-server.ts      # Claude MCP server (stub)
│   └── utils/
│       ├── logger.ts              # Winston logger
│       └── config.ts              # Configuration management
├── docs/
│   ├── API_CONTRACT.md            # API contract for Instance 2
│   └── ARCHITECTURE.md            # Architecture documentation
├── package.json
├── tsconfig.json
└── .env.example
```

## Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Run Tests
```bash
npm test
```

### Type Check
```bash
npm run type-check
```

## Integration Points

### ChatGPT Custom GPT
Webhook endpoint for ChatGPT integration (stub):
- POST `/integrations/chatgpt/webhook`
- See `src/integrations/chatgpt/webhook-handler.ts`
- **TODO: Instance 3 to implement**

### Claude MCP Server
Model Context Protocol server (stub):
- Exposes Jarvis tools to Claude Desktop
- See `src/integrations/claude/mcp-server.ts`
- **TODO: Instance 4 to implement**

## Error Handling

The module router includes retry logic:
- 3 attempts with exponential backoff
- Base delay: 1000ms
- Max delay: 10000ms
- Jitter added to prevent thundering herd

## Monitoring

Health checks run with 5-second timeout per service.
Overall status:
- `healthy`: All services responding
- `degraded`: Some services responding
- `down`: No services responding

## Security

- Bearer token authentication
- Rate limiting (100 requests per 15 minutes)
- Helmet security headers
- CORS configuration

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `JARVIS_PORT`: Gateway port (default: 4000)
- `AI_DAWG_BACKEND_URL`: AI Dawg backend URL
- `JARVIS_AUTH_TOKEN`: Authentication token
- `NODE_ENV`: Environment (development/production)

## Coordination with Instance 2

This control plane communicates with AI Dawg backend at:
- Primary: `http://localhost:3001`
- Docker: `http://localhost:3000`

See `docs/API_CONTRACT.md` for the expected API contract.

## License

MIT
