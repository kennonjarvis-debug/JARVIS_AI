# JARVIS SYSTEM ARCHITECTURE INVESTIGATION REPORT

## Executive Summary

The Jarvis system is a **centralized, event-driven, multi-layered orchestration platform** connecting AI Chat, DAW (Digital Audio Workstation), Music Generation, and Plugin systems through a unified control plane. This report details the major systems, their interconnections, and identifies critical architectural gaps.

---

## 1. SERVICE LAYER ARCHITECTURE

### 1.1 Core Control Plane (Port 4000)

**Primary Entry Point:** `src/core/gateway.ts`
- Express.js HTTP server
- Security: Helmet, CORS, Bearer token auth
- Rate limiting (5000 req/15min for non-localhost)
- Request logging and business intelligence tracking

**Key Routes:**
- `GET /health` - Basic health check
- `GET /health/detailed` - Aggregated service health  
- `POST /api/v1/execute` - Module command execution
- `POST /api/v1/chat` - Direct AI chat (fallback)
- `GET /api/v1/business/metrics` - Business metrics
- `GET /api/v1/business/health` - Service health status
- `GET /api/v1/circuit-breakers` - Circuit breaker status

### 1.2 Service Stack

**AI Chat Layer:**
- `src/services/ai/openai.service.ts` - OpenAI provider
- `src/services/ai/anthropic.service.ts` - Anthropic/Claude provider
- `src/services/ai/ai-router.service.ts` - Multi-provider routing
- `src/core/ai-router-v2.ts` - Smart router with cost tracking
- `src/services/ai/memory.service.ts` - Conversation memory
- `src/services/ai/langchain.service.ts` - LangChain integration

**DAW/Music Generation:**
- `src/services/music-generator.ts` - Beat/music generation stub
- `src/services/audio-mixer.ts` - Audio mixing service
- `src/services/voice-cloner.ts` - Voice cloning
- `src/services/suno-style-generator.ts` - Suno style generation
- `src/services/audio-generator.ts` - Audio synthesis
- `src/services/replicate-music-generator.ts` - Replicate integration

**AI DAWG Integration:**
- `src/services/dawg-ai.service.ts` - Core DAWG AI service
- `src/services/dawg-ai-projects.service.ts` - Project management
- `src/services/dawg-ai-workflows.service.ts` - Workflow automation
- `src/services/dawg-ai-analytics.service.ts` - Analytics tracking

**Activity Monitoring:**
- `src/services/activity-monitor.service.ts` - Main monitor (EventEmitter-based)
- `src/services/screen-recorder.service.ts` - Screen capture
- `src/services/audio-monitor.service.ts` - Audio detection
- `src/services/app-usage-tracker.service.ts` - App tracking
- `src/services/context-detector.service.ts` - Context detection

**Infrastructure Services:**
- `src/services/cache.service.ts` - Caching layer
- `src/services/logger.service.ts` - Structured logging
- `src/services/metrics.service.ts` - Metrics collection
- `src/services/error-tracker.service.ts` - Error tracking
- `src/services/backup.service.ts`, `s3-backup.service.ts` - Data backup

---

## 2. EVENT SYSTEM & MESSAGE BUS

### 2.1 Event Emitter Architecture

**Foundation:** Node.js native `EventEmitter` class

**Key Event-Driven Services:**

1. **ActivityMonitorService** (`extends EventEmitter`)
   ```typescript
   - Event: 'session:ended'
   - Event: 'monitoring:started'
   - Event: 'context:changed'
   - Emits: app:switched, screen:captured, audio:detected, context:changed
   ```
   - Broadcasts to: ProactiveActions, DeviceSync
   - Used in: `src/main.ts` (line 115-134 for event listeners)

2. **AutonomousOrchestrator** (`extends EventEmitter`)
   ```typescript
   - Event: 'started'
   - Event: 'stopped'
   - Event: 'taskStarted'
   - Event: 'taskCompleted'
   - Event: 'taskFailed'
   ```
   - Manages: Domain agents (Code Optimization, Cost Optimization, System Health, etc.)

3. **BusinessOperator** (`extends EventEmitter`)
   ```typescript
   - Event: 'health-update'
   - Emits health status changes from Health Aggregator
   ```

4. **WebSocketHub** (Multi-instance pub/sub)
   ```typescript
   - Transport: Redis pub/sub for distributed instances
   - Channel: 'jarvis:broadcasts'
   - Messages: Real-time chat sync, presence, typing indicators
   - Room-based routing: Per-conversation broadcast
   ```

### 2.2 WebSocket Communication System

**Real-time Hub:** `src/core/websocket-hub.ts`

```
Message Flow:
┌─────────────┐
│   WebSocket  │ → Message parsing → Room routing
│   Clients    │
└─────────────┘
       ↓
    Local broadcast or Redis pub
       ↓
    ┌─────────────────────┐
    │  redis:broadcasts   │ (Multi-instance)
    └─────────────────────┘
       ↓
    Distribute to all connected clients
```

**Client Management:**
- Client ID tracking (UUID)
- Message source tracking (web, desktop, mobile, chatgpt)
- Conversation-based room subscription
- Presence tracking (lastSeen, metadata)

**Message Types:**
- `message` - Chat messages
- `sync` - Conversation sync
- `presence` - User presence
- `typing` - Typing indicators
- `join`/`leave` - Room events
- `ping`/`pong` - Heartbeat

---

## 3. STATE MANAGEMENT ACROSS COMPONENTS

### 3.1 Conversation State Store

**Dual-Backend Store:** `src/core/conversation-store/`

```
┌─────────────────────────────┐
│  Conversation Store          │
│  (Pluggable Backend)         │
├─────────────────────────────┤
│                              │
│  PostgreSQL Store (Prod)     │ ← getConversationStore()
│  ├─ Message persistence      │
│  ├─ Conversation history     │
│  └─ User context             │
│                              │
│  File Store (Dev/Test)       │
│  ├─ Local JSON files         │
│  └─ Easy development         │
└─────────────────────────────┘
```

**Types Exported:**
- `Message` - Individual chat messages
- `MessageSource` - Origin tracking (web, desktop, chatgpt, claude)
- `Conversation` - Full conversation context

### 3.2 Activity Session State

**ActivityMonitorService maintains:**
- `currentSession: ActivitySession` - Current work session
- `currentContext: ActivityContext` - Work type detection
- `activityEvents: ActivityEvent[]` - Event log
- `sessions: Map<string, ActivitySession>` - Session history

**Session lifecycle:**
```
Session Start → App usage tracking
              → Screenshot capture (on interval)
              → Audio sampling
              → Context detection
              → Event emission (session:ended)
              → Opportunity analysis
              → Auto-action creation
Session End
```

### 3.3 Business Metrics State

**BusinessOperator maintains:**
- Service uptime tracking (per-service timestamps)
- Restart attempt counters
- Alert history (last 50 alerts)
- Cached metrics (10-second TTL)

**Metrics collection interval:** 5 minutes
```typescript
interface BusinessMetrics {
  uptime: { overall: number, byService: Record<string, number> }
  performance: { responseTime, rpm, errorRate }
  costs: { total, byProvider }
  users: { active, sessions, newUsers }
}
```

### 3.4 Circuit Breaker State (Multi-instance)

**Persistence:** PostgreSQL + in-memory sync
- Model: `CircuitBreakerState` (Prisma)
- Sync interval: 10 seconds
- Purpose: Coordinate across ECS instances

```typescript
interface CircuitBreakerState {
  serviceName: string
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failureCount: number
  lastFailureTime: DateTime?
  nextAttemptTime: DateTime?
}
```

---

## 4. API BOUNDARIES BETWEEN SERVICES

### 4.1 Internal Service Routing

**ModuleRouter** (`src/core/module-router.ts`):
```
Command Execution Flow:
┌─────────────────────────────────────────┐
│ POST /api/v1/execute                    │
│ { module, action, params }              │
└──────────────┬──────────────────────────┘
               ↓
    ┌──────────────────────────┐
    │ Route by module type     │
    ├──────────────────────────┤
    │ ai-brain → /api/v1/chat  │
    │ freestyle → /api/v1/...  │
    │ other → AI Dawg Backend  │
    └──────────────┬───────────┘
               ↓
         Retry Logic (3 attempts)
         Exponential backoff + jitter
               ↓
         Response or Error
```

### 4.2 External Service Endpoints

**Service Registry:**
```typescript
// src/utils/config.ts
{
  aiDawgBackendUrl: 'http://localhost:3001'
  aiDawgDockerUrl: 'http://localhost:3000'
  vocalCoachUrl: 'http://localhost:8000'
  producerUrl: 'http://localhost:8001'
  aiBrainUrl: 'http://localhost:8002'
}
```

**Mapped Routes:**
| Module | Action | Endpoint |
|--------|--------|----------|
| ai-brain | chat | /api/v1/chat (internal) or :8002/api/chat |
| freestyle | start-session | /api/v1/freestyle/session/start |
| freestyle | upload-beat | /api/v1/freestyle/beat/upload |
| vocal-coach | analyze | Routed to :8000 |
| producer | mix | Routed to :8001 |

### 4.3 Integration Layer APIs

**ChatGPT Webhook** → Module Router
- Receives ChatGPT actions
- Routes to Jarvis commands
- Returns formatted responses

**Claude MCP Server** → Module Router  
- Exposes Jarvis tools to Claude Desktop
- Implements MCP protocol
- Calls underlying services

**DAWG AI OAuth** → API Routes
```
/api/dawg-ai/connect       POST - Store OAuth credentials
/api/dawg-ai/disconnect    POST - Remove credentials
/api/dawg-ai/sync          POST - Sync user data
/api/dawg-ai/status        GET  - Connection status
/api/dawg-ai/projects/*    GET  - Project operations
/api/dawg-ai/workflows/*   GET  - Workflow operations
```

---

## 5. DATABASE & STORAGE INTEGRATION

### 5.1 Primary Data Storage

**PostgreSQL (Primary):**
- Connection pooling via Prisma Client
- Models tracked in `prisma/schema.prisma`

**Key Data Models:**
```
CircuitBreakerState        (Service resilience)
TaskHistory                (Autonomous task tracking)
AIUsage                    (Cost optimization)
MusicProjectVersion        (Music creation history)
HealthMetric               (Service monitoring)
AgentPerformanceSnapshot   (Agent performance tracking)
User / Subscription        (User management)
```

### 5.2 Caching Layer

**Redis:**
- URL: `redis://localhost:6379` (configurable)
- Primary use: WebSocket pub/sub for multi-instance support
- Pub/sub channel: `jarvis:broadcasts`

**In-Memory Cache:**
- `src/core/cache.ts` - Simple cache layer
- TTL support for time-based expiration
- Used for: Config caching, temporary state

### 5.3 Conversation Storage (Dual-backend)

**PostgreSQL Backend:**
- Persistent conversation storage
- Full message history
- Multi-user support

**File Backend (Fallback):**
- JSON-based local storage
- Path: Configurable
- Used for development/testing

---

## 6. IDENTIFIED ARCHITECTURAL GAPS & BROKEN CONNECTIONS

### CRITICAL MISSING LINKS

#### 6.1 **Music Generation ↔ Chat System (BROKEN)**
**Status:** ⚠️ DISCONNECTED

**Issue:**
```typescript
// src/services/music-generator.ts - STUB ONLY
async generateMusic(options: GenerateMusicOptions): Promise<MusicGenerationResult> {
  // Returns mock result - NO REAL INTEGRATION
  const id = `music-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return {
    id,
    audioUrl: `https://example.com/music/${id}.mp3`, // FAKE URL
    localPath: `/tmp/music/${id}.mp3`,
    // ...
  };
}
```

**Missing:**
- No connection to actual music APIs (Suno, Replicate, or custom generator)
- No audio file generation
- No storage of generated files
- No callback to chat system with results

**Should connect to:**
- Chat system → Detects music intent → Music Generator → Chat responds with audio

---

#### 6.2 **DAW Integration Incomplete (PARTIAL)**
**Status:** ⚠️ INCOMPLETE

**Issues:**

1. **Freestyle Module Not Connected to Chat:**
   ```typescript
   // src/core/module-router.ts - Has routing but NO chat integration
   if (command.module === 'freestyle') {
     // Maps to /api/v1/freestyle/session/start
     // But HOW does chat request trigger freestyle?
     // NO INTENT DETECTION IN CHAT SYSTEM
   }
   ```

2. **Activity Monitor Detects Freestyling but Doesn't Trigger DAW:**
   ```typescript
   // src/main.ts line 115-134
   // detects 'session:ended' but then what?
   // Suggests "auto-finish songs" but has NO connection to freestyle module
   ```

3. **Audio Files Generated But Not Synced:**
   - Screen recorder saves screenshots
   - Audio monitor records audio
   - But NO connection between audio capture and music generation

**Should be:**
```
Activity Monitor (detects freestyle)
    ↓
Autonomous Orchestrator (music domain agent)
    ↓
Music Generator Service
    ↓
Storage + Chat notification
```

---

#### 6.3 **Plugin System Missing Entirely**
**Status:** ❌ DOES NOT EXIST

**Expected architecture:**
```typescript
interface IPlugin {
  name: string
  version: string
  hooks: {
    'onMessage'?: (message: Message) => Promise<void>
    'onMusicGenerated'?: (result: MusicResult) => Promise<void>
    'onServiceStatusChanged'?: (status: HealthStatus) => Promise<void>
  }
  commands?: {
    [key: string]: (params: any) => Promise<any>
  }
}
```

**Current state:** 
- No plugin interface
- No plugin loader
- No hook system
- No third-party extensibility

**Affects:**
- Custom AI providers
- Custom music generation backends
- Custom automation rules

---

#### 6.4 **Cross-System Event Propagation Incomplete**
**Status:** ⚠️ FRAGMENTED

**Current state:**
```typescript
// Activity Monitor emits events
activityMonitor.on('session:ended', async (session) => {
  // → ProactiveActions (creates opportunities)
  // → But NO connection to:
  //    - Chat system (no message to user)
  //    - Music generation (no beat creation)
  //    - DAW (no freestyle finish)
  //    - Autonomous agents (no task creation)
})
```

**Missing:**
- No central event bus
- No event routing to interested services
- EventEmitter is local only (not distributed)
- No event versioning/compatibility
- No event replay for debugging

---

#### 6.5 **Music Generation Providers Not Connected**
**Status:** ⚠️ STUBS ONLY

**Files present but not wired:**
- `src/services/suno-style-generator.ts`
- `src/services/replicate-music-generator.ts`
- `src/services/audio-generator.ts`

**Current implementation:**
```typescript
// All return mock/stub results
// No real API calls
// No actual audio generation
// No fallback between providers
```

**Should have:**
```
Music Request
    ↓
Provider Selection (Suno / Replicate / Custom)
    ↓
Generate audio
    ↓
Cache/store
    ↓
Notify chat system
```

---

#### 6.6 **AI Providers Not Robustly Connected**
**Status:** ⚠️ BASIC ONLY

**AI Router Limitations:**
```typescript
// src/core/ai-router-v2.ts
// Routes between: Gemini, GPT-4o-mini, Claude, Mistral
// But:
// - No streaming support (only complete() not stream())
// - No vision/multimodal for chat with images
// - No audio input processing
// - No integration with activity context
```

**Missing:**
- Activity context not fed to chat system
- No conversation context from DAW events
- No music preference learning
- No adaptive routing based on user context

---

#### 6.7 **Storage Not Unified**
**Status:** ⚠️ FRAGMENTED

**Issue:**
```
Generated Music Files → /tmp/music/{id}.mp3 (TEMP - LOST ON RESTART)
Conversation History  → PostgreSQL
Activity Logs         → /Users/benkennon/Jarvis/data/activity-logs
Screenshots           → Configurable storage path
Audio Samples         → Configurable storage path
Music Project Data    → DB + external DAWG AI
```

**Missing:**
- No unified storage abstraction
- Generated files not persisted properly
- S3 backup exists but not integrated into music pipeline
- No CDN integration for audio delivery

---

#### 6.8 **Error Recovery Between Services**
**Status:** ⚠️ PARTIAL

**What works:**
- Circuit breakers prevent cascading failures
- Retry logic with exponential backoff
- Health monitoring and alerts

**What's missing:**
- No error context passed between services
- When music generation fails, chat doesn't know
- When DAW times out, activity monitor keeps going
- No correlation IDs for tracing errors across services
- No automated recovery workflows

---

## 7. DETAILED CONNECTION MAP

### 7.1 Working Connections ✅

```
Chat Request
    ↓
API Gateway (Port 4000)
    ↓
Module Router
    ↓
AI Router v2
    ↓
AI Provider (OpenAI/Anthropic/Gemini/Mistral)
    ↓
Response cached in Memory Service
    ↓
Conversation stored
    ↓
WebSocket broadcast to clients
    ✅ COMPLETE
```

```
Activity Monitoring
    ↓
App usage tracking
    ↓
Context detection
    ↓
Event emission (session:ended)
    ↓
Proactive Action analysis
    ✅ COMPLETE (but limited to proactive actions only)
```

```
Service Health
    ↓
Health Aggregator checks all endpoints
    ↓
Circuit Breaker state updated
    ↓
Business Operator alerts on failures
    ✅ COMPLETE
```

### 7.2 Broken/Missing Connections ❌

```
Activity Monitor
    ↓
[MISSING] → Freestyle Detection
    ↓
[MISSING] → DAW Trigger
    ↓
[MISSING] → Music Generation
    ❌ DISCONNECTED
```

```
Chat System
    ↓
[MISSING] → Music Intent Detection
    ↓
[MISSING] → Route to Music Generator
    ↓
[MISSING] → Stream results back to chat
    ❌ DISCONNECTED
```

```
Autonomous Orchestrator (Domain Agents)
    ↓
[MISSING] → Real-time event subscription
    ↓
[MISSING] → Music production domain
    ❌ DISCONNECTED
```

```
Plugin System
    ↓
[DOES NOT EXIST]
    ❌ MISSING
```

---

## 8. SERVICE INITIALIZATION & DEPENDENCY INJECTION

### 8.1 Service Initialization Pattern

**Current approach:** Direct instantiation + Singleton pattern

```typescript
// src/main.ts - Boot sequence
1. Config loaded (environment variables)
2. Gateway started (Express server)
3. Business Operator started (service monitoring)
4. Autonomous Orchestrator started (domain agents)
5. Activity Monitor started (if enabled)

// No formal DI container
// Services are initialized on-demand
// Each service manages own state
```

### 8.2 Service Initialization Issues

**Problem 1: No Explicit Dependency Resolution**
```typescript
// Services don't declare dependencies
// If a service fails to init, dependent services may still start
// Example: Music Generator depends on Storage, but not declared
```

**Problem 2: Initialization Order Fragile**
```typescript
// If Activity Monitor starts before Chat System, 
// events emitted before listeners attached will be lost
```

**Problem 3: No Service Registry**
```typescript
// Services are scattered across files
// No central place to find/manage all services
// Makes cross-service wiring difficult
```

---

## 9. CONFIGURATION & ENVIRONMENT SETUP

### 9.1 Configuration System

**Dual-mode configuration:**
```typescript
// src/utils/config.ts

// Mode 1: Development (direct env vars)
const config: Config = {
  port: 5001,
  aiDawgBackendUrl: 'http://localhost:3001',
  authToken: 'test-token',
  // ...
}

// Mode 2: Production (AWS Secrets Manager)
async function loadConfig(): Promise<Config> {
  // Loads from AWS Secrets Manager + env vars
  // Caches config in memory
}
```

**Configuration scope:**
- Service endpoints (hardcoded fallbacks)
- API keys (from secrets manager)
- Feature flags (from env vars)
- Authentication tokens

### 9.2 Environment Variables

**Required:**
```
NODE_ENV=development|production|staging
JARVIS_PORT=5001
JARVIS_AUTH_TOKEN=...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=...
```

**Optional:**
```
ANTHROPIC_API_KEY=...
GOOGLE_AI_API_KEY=...
MISTRAL_API_KEY=...
ENABLE_BUSINESS_OPERATOR=true
ENABLE_MCP=true
ACTIVITY_MONITORING_ENABLED=true
AUTONOMOUS_ENABLED=true
```

---

## 10. RECOMMENDATIONS FOR FIXES

### Priority 1: Critical (Breaks core functionality)

1. **Wire Music Generation to Chat System**
   ```typescript
   // Add to chat handler
   if (userIntention.includes('music') || context.isFreestyling) {
     const result = await musicGenerator.generateMusic(intent)
     // Return audio to user via chat
   }
   ```

2. **Connect Activity Monitor to Music Generation**
   ```typescript
   activityMonitor.on('freestyle:detected', async (session) => {
     await autonomousOrchestrator.submitTask({
       domain: 'music-production',
       action: 'finish-freestyle',
       context: session
     })
   })
   ```

3. **Create Central Event Bus**
   ```typescript
   interface EventBus {
     subscribe(eventType, listener)
     emit(eventType, data)
     // Redis-backed for distributed systems
   }
   
   // Replace scattered EventEmitters with centralized bus
   ```

### Priority 2: High (Improves reliability)

4. **Implement Formal Dependency Injection**
   - Use tsyringe or similar
   - Declare service dependencies
   - Validate initialization order

5. **Add Plugin System**
   ```typescript
   interface IPlugin {
     init(context: PluginContext): Promise<void>
     hooks: PluginHooks
   }
   ```

6. **Unify Storage Layer**
   ```typescript
   interface StorageBackend {
     save(key, data, ttl?): Promise<void>
     get(key): Promise<any>
     delete(key): Promise<void>
   }
   // Support: LocalFS, S3, PostgreSQL
   ```

### Priority 3: Medium (Operational improvements)

7. **Add Service Registry**
   - Central service location
   - Health status per service
   - Dependency tracking

8. **Implement Correlation IDs**
   - Trace requests across services
   - Better error debugging
   - Performance analysis

9. **Add Integration Tests**
   - Test cross-service flows
   - Test event propagation
   - Test failure scenarios

---

## 11. CONCLUSION

The Jarvis system has a **solid control plane foundation** with good service monitoring and event basics, but suffers from **critical disconnects** between major systems:

**Working well:**
- ✅ API Gateway & routing
- ✅ Service health monitoring
- ✅ Circuit breaker pattern
- ✅ Real-time chat via WebSockets
- ✅ Autonomous orchestrator foundation
- ✅ Activity monitoring infrastructure

**Severely broken:**
- ❌ Music generation completely disconnected
- ❌ Chat-to-DAW pipeline non-existent
- ❌ Plugin system missing entirely
- ❌ Event propagation fragmented
- ❌ Storage layer fragmented

**To achieve full system integration, focus on:**
1. Creating a central event bus
2. Wiring music generation to intent detection
3. Connecting activity monitoring to autonomous agents
4. Implementing plugin architecture
5. Unifying storage layer

The foundation is solid; the connections need work.
