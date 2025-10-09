# API Documentation

**Jarvis + AI DAWG Complete API Reference**
**Version:** 2.0.0
**Last Updated:** 2025-10-08

---

## Overview

This document provides complete API documentation for both Jarvis Control Plane and AI DAWG Backend.

## Jarvis Control Plane API

**Base URL:** `http://localhost:4000`

### Authentication

All `/api/*` endpoints require Bearer token authentication:

```
Authorization: Bearer <your-token-here>
```

Configure token via `JARVIS_AUTH_TOKEN` environment variable.

### Endpoints

#### GET /health

Basic health check.

**Response:**
```json
{
  "status": "healthy",
  "service": "jarvis-control-plane",
  "version": "2.0.0",
  "timestamp": "2025-10-08T17:00:00.000Z",
  "port": 4000
}
```

#### GET /health/detailed

Detailed health check of all services.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-08T17:00:00.000Z",
  "services": {
    "aidawg_backend": {
      "status": "healthy",
      "latency": 45,
      "url": "http://localhost:3001"
    },
    "aidawg_docker": {
      "status": "down",
      "error": "Connection refused"
    }
  },
  "summary": {
    "total": 7,
    "healthy": 5,
    "degraded": 1,
    "down": 1
  }
}
```

#### POST /api/v1/execute

Execute a module command.

**Request:**
```json
{
  "module": "music",
  "action": "generate-music",
  "params": {
    "prompt": "chill lofi beat",
    "duration": 60
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "music-gen-1234567890",
    "status": "started",
    "estimatedTime": 45
  },
  "timestamp": "2025-10-08T17:00:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Module 'music' not found",
  "timestamp": "2025-10-08T17:00:00.000Z"
}
```

---

## AI DAWG Backend API

**Base URL:** `http://localhost:3001`

### Jarvis Compatibility Endpoints

#### POST /api/v1/jarvis/execute

Execute module command (Jarvis-compatible endpoint).

**Request:** Same as Jarvis `/api/v1/execute`

**Response:** Same as Jarvis `/api/v1/execute`

### Module Registry Endpoints

#### GET /api/v1/modules

List all registered modules.

**Response:**
```json
{
  "modules": [
    {
      "name": "music",
      "version": "1.0.0",
      "description": "Music generation and analysis",
      "commands": 5,
      "jobs": 3,
      "status": "healthy"
    }
  ],
  "count": 5
}
```

#### GET /api/v1/modules/:name

Get specific module info.

**Response:**
```json
{
  "name": "music",
  "version": "1.0.0",
  "description": "Music generation and analysis",
  "commands": [
    {
      "name": "generate-music",
      "description": "Generate music from text",
      "params": ["prompt", "genre", "duration"]
    }
  ],
  "jobs": [
    {
      "name": "model-health-check",
      "schedule": "*/5 * * * *",
      "enabled": true
    }
  ],
  "health": {
    "status": "healthy",
    "lastCheck": "2025-10-08T17:00:00.000Z"
  }
}
```

#### POST /api/v1/modules/:name/execute

Execute module command directly.

**Request:**
```json
{
  "action": "generate-music",
  "params": {
    "prompt": "lofi beat",
    "duration": 60
  }
}
```

#### GET /api/v1/modules/:name/health

Get module health status.

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "externalApi": "healthy"
  },
  "lastCheck": "2025-10-08T17:00:00.000Z"
}
```

#### GET /api/v1/modules/health/all

Get aggregated health for all modules.

**Response:**
```json
{
  "overall": "healthy",
  "modules": {
    "music": { "status": "healthy" },
    "marketing": { "status": "healthy" },
    "engagement": { "status": "healthy" },
    "automation": { "status": "healthy" },
    "testing": { "status": "healthy" }
  },
  "timestamp": "2025-10-08T17:00:00.000Z"
}
```

#### GET /api/v1/modules/jobs

List all scheduled jobs across modules.

**Response:**
```json
{
  "jobs": [
    {
      "module": "music",
      "name": "model-health-check",
      "schedule": "*/5 * * * *",
      "enabled": true,
      "lastRun": "2025-10-08T16:55:00.000Z"
    }
  ],
  "total": 20
}
```

---

## Module Commands Reference

### Music Module

| Command | Description | Parameters |
|---------|-------------|------------|
| `generate-music` | Generate music from text | prompt, genre?, duration? |
| `analyze-vocal` | Analyze vocal quality | audioUrl |
| `validate-quality` | Validate audio quality | audioUrl, criteria? |
| `get-usage-stats` | Get usage statistics | startDate?, endDate? |
| `get-model-health` | Check model health | - |

### Marketing Module

| Command | Description | Parameters |
|---------|-------------|------------|
| `get-metrics` | Get marketing metrics | - |
| `get-revenue` | Get revenue breakdown | period? |
| `run-campaign` | Launch campaign | campaignType, targetAudience?, budget? |
| `analyze-growth` | Analyze growth trends | period? |
| `forecast-revenue` | Forecast revenue | months |
| `get-cac` | Get customer acquisition cost | - |

### Engagement Module

| Command | Description | Parameters |
|---------|-------------|------------|
| `analyze-sentiment` | Analyze user sentiment | days? |
| `check-churn-risk` | Check churn risk | userId |
| `get-churned-users` | Get churned users | days?, limit? |
| `send-engagement` | Send engagement message | userId, messageType, content? |
| `get-nps` | Get NPS score | - |
| `track-event` | Track user event | userId, eventType, metadata? |
| `get-cohort` | Get cohort analysis | cohortId |

### Automation Module

| Command | Description | Parameters |
|---------|-------------|------------|
| `aggregate-metrics` | Aggregate system metrics | - |
| `execute-workflow` | Execute workflow | workflowId, params? |
| `scale-resources` | Scale resources | resourceType, scaleFactor |
| `get-stats` | Get automation stats | - |
| `list-workflows` | List workflows | - |
| `get-metrics-history` | Get metrics history | days? |

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing/invalid auth token |
| 404 | Not Found - Module/command not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Backend down |

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes
- **Scope:** Per IP address
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

---

## OpenAPI Specification

See `docs/openapi.yaml` for complete OpenAPI 3.0 specification.

---

## Examples

### Generate Music

```bash
curl -X POST http://localhost:4000/api/v1/execute \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "music",
    "action": "generate-music",
    "params": {
      "prompt": "energetic rock anthem",
      "genre": "rock",
      "duration": 180
    }
  }'
```

### Get Marketing Metrics

```bash
curl -X POST http://localhost:4000/api/v1/execute \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "marketing",
    "action": "get-metrics",
    "params": {}
  }'
```

### Check System Health

```bash
curl http://localhost:4000/health/detailed
```

---

## SDK Usage

### Node.js/TypeScript

```typescript
import axios from 'axios';

const jarvis = axios.create({
  baseURL: 'http://localhost:4000',
  headers: {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  }
});

// Execute command
const response = await jarvis.post('/api/v1/execute', {
  module: 'music',
  action: 'generate-music',
  params: { prompt: 'lofi beat', duration: 60 }
});

console.log(response.data);
```

### Python

```python
import requests

JARVIS_URL = "http://localhost:4000"
AUTH_TOKEN = "test-token"

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

response = requests.post(
    f"{JARVIS_URL}/api/v1/execute",
    headers=headers,
    json={
        "module": "music",
        "action": "generate-music",
        "params": {
            "prompt": "lofi beat",
            "duration": 60
        }
    }
)

print(response.json())
```

---

## Webhooks (Future)

Support for webhooks will be added in future versions for:
- Job completion notifications
- System alerts
- Event streaming

