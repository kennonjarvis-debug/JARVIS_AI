# API Contract: Jarvis Control Plane ↔ AI Dawg Backend

**Version:** 2.0
**Last Updated:** 2025-10-08
**For Instance 2:** This document defines the expected API that AI Dawg backend must implement.

---

## Overview

The Jarvis Control Plane (port 4000) acts as an orchestration layer that routes commands to the AI Dawg execution engine (port 3001). This document defines the API contract between these two systems.

---

## AI Dawg Backend Requirements

### Base URL
```
http://localhost:3001/api/v1/jarvis
```

---

## Required Endpoints

### 1. Health Check

**Endpoint:** `GET /api/v1/jarvis/desktop/health`

**Purpose:** Verify backend is running and ready

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-08T17:00:00.000Z"
}
```

**Status Codes:**
- `200`: Healthy
- `503`: Service unavailable

---

### 2. Module Execution

**Endpoint:** `POST /api/v1/jarvis/execute`

**Purpose:** Execute a module command

**Request Body:**
```typescript
{
  module: string;     // Module name (e.g., "music", "vocal", "ai")
  action: string;     // Action to perform
  params: object;     // Action-specific parameters
}
```

**Example Request:**
```json
{
  "module": "music",
  "action": "create_beat",
  "params": {
    "genre": "hip-hop",
    "bpm": 120,
    "duration": 30
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: any;         // Command result data
  error?: string;     // Error message if success=false
  timestamp: string;  // ISO 8601 timestamp
}
```

**Example Success Response:**
```json
{
  "success": true,
  "data": {
    "beat_id": "beat_abc123",
    "url": "https://storage.example.com/beats/abc123.mp3",
    "duration": 30,
    "bpm": 120
  },
  "timestamp": "2025-10-08T17:00:00.000Z"
}
```

**Example Error Response:**
```json
{
  "success": false,
  "error": "Invalid genre specified",
  "timestamp": "2025-10-08T17:00:00.000Z"
}
```

**Status Codes:**
- `200`: Success or handled error (check `success` field)
- `400`: Invalid request format
- `401`: Unauthorized (if auth is required)
- `500`: Internal server error
- `503`: Service temporarily unavailable

**Timeout:** Jarvis will wait 30 seconds before timing out

---

## Module Specifications

### Available Modules

Instance 2 should implement or expose these modules:

#### 1. Music Production
```typescript
module: "music"
actions: [
  "create_beat",      // Generate a beat
  "analyze_track",    // Analyze audio file
  "generate_melody"   // Create melody
]
```

#### 2. Vocal Processing
```typescript
module: "vocal"
actions: [
  "analyze_pitch",    // Analyze vocal pitch
  "apply_effects",    // Apply vocal effects
  "clone_voice"       // Voice cloning
]
```

#### 3. AI Brain
```typescript
module: "ai"
actions: [
  "generate_text",    // GPT-4o text generation
  "analyze_sentiment" // Sentiment analysis
]
```

---

## Error Handling

### Standard Error Format

All errors should follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",       // Optional: Machine-readable code
  "details": {},              // Optional: Additional error details
  "timestamp": "2025-10-08T17:00:00.000Z"
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `MODULE_NOT_FOUND` | Requested module doesn't exist |
| `ACTION_NOT_FOUND` | Action not available for this module |
| `INVALID_PARAMS` | Invalid parameters provided |
| `EXECUTION_FAILED` | Command execution failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `SERVICE_UNAVAILABLE` | Backend service down |

---

## Retry Logic

Jarvis Control Plane implements automatic retries:
- **Max Attempts:** 3
- **Backoff:** Exponential with jitter
- **Base Delay:** 1000ms
- **Max Delay:** 10000ms

AI Dawg backend should:
- Return `503` for temporary failures (will be retried)
- Return `400`/`404` for permanent failures (won't be retried)
- Be idempotent where possible

---

## Authentication

**Current:** No authentication required between Jarvis and AI Dawg (localhost)

**Future:** May add shared secret or JWT tokens

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Health check response | < 100ms |
| Simple command (e.g., status) | < 500ms |
| Complex command (e.g., audio generation) | < 30s |
| Throughput | 10 req/s sustained |

---

## Backwards Compatibility

Instance 2 must maintain compatibility with:
- Existing AI Dawg frontend (port 5173)
- Existing AI Dawg backend consumers
- Database schema

**Migration Strategy:**
1. Add new `/api/v1/jarvis/*` endpoints
2. Keep existing endpoints functional
3. Gradually deprecate old endpoints

---

## Testing Contract

### Test Endpoint

**Endpoint:** `POST /api/v1/jarvis/execute`

**Test Command:**
```json
{
  "module": "test",
  "action": "ping",
  "params": {}
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "pong",
    "timestamp": "2025-10-08T17:00:00.000Z"
  },
  "timestamp": "2025-10-08T17:00:00.000Z"
}
```

This endpoint must be implemented for integration testing.

---

## Questions for Instance 2

1. Do you need any changes to the request/response format?
2. Are there additional modules that should be exposed?
3. Do you need authentication between Jarvis and AI Dawg?
4. Should we implement request ID tracking for debugging?

---

## Change Log

| Date | Change |
|------|--------|
| 2025-10-08 | Initial API contract v2.0 |

---

## Contact

**Instance 1:** Jarvis Control Plane team
**Instance 2:** AI Dawg Backend team
**Sync Document:** `/Users/benkennon/SYNC.md`
