# JARVIS Architecture Documentation
**AI Business Operator for AI DAWG Platform**

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [Service Separation](#service-separation)
4. [Service Ports & Responsibilities](#service-ports--responsibilities)
5. [How JARVIS Manages AI DAWG](#how-jarvis-manages-ai-dawg)
6. [API Endpoints](#api-endpoints)
7. [User Interaction Flow](#user-interaction-flow)
8. [Data Flow](#data-flow)
9. [Technology Stack](#technology-stack)
10. [Testing & Monitoring](#testing--monitoring)

---

## System Overview

**JARVIS** is an autonomous AI Business Operator that manages **AI DAWG** (a music production platform) as a business. The system consists of two distinct layers:

### Two-Tier Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    JARVIS LAYER                         │
│              (AI Business Operator)                     │
│                                                         │
│  Responsibilities:                                      │
│  • Monitor AI DAWG service health                      │
│  • Provide business metrics and analytics              │
│  • Auto-scale resources based on demand                │
│  • Handle deployments and rollbacks                    │
│  • Manage operations and alerts                        │
│  • User support and issue resolution                   │
│                                                         │
│         "I run the business"                           │
└─────────────────────────────────────────────────────────┘
                          │
                          │ manages & monitors
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   AI DAWG LAYER                         │
│            (Music Production Platform)                  │
│                                                         │
│  Responsibilities:                                      │
│  • Generate beats and melodies                         │
│  • Provide real-time vocal coaching                    │
│  • Arrange and mix audio tracks                        │
│  • Professional DAW interface                          │
│  • Help users create music                             │
│                                                         │
│         "I help users make music"                      │
└─────────────────────────────────────────────────────────┘
```

**Key Principle:** JARVIS manages the business; AI DAWG creates the music.

---

## Core Architecture

### JARVIS Components

#### 1. Control Plane (Port 4000)
**Location:** `/Users/benkennon/Jarvis/src/core/`

**Purpose:** Central orchestration hub for all JARVIS operations

**Key Files:**
- `gateway.ts` - Main entry point and HTTP server
- `health-aggregator.ts` - Monitors AI DAWG service health
- `module-router.ts` - Routes requests to AI DAWG services
- `proactive/agent.ts` - Autonomous monitoring and business intelligence
- `proactive/action-tracker.ts` - Tracks automated actions
- `proactive/pattern-detector.ts` - Detects performance patterns

**Capabilities:**
- Health monitoring of all AI DAWG services
- Request routing and load balancing
- Service discovery and registration
- Proactive issue detection
- Auto-restart failed services
- Business intelligence gathering

#### 2. Dashboard Backend (Port 5001)
**Location:** `/Users/benkennon/Jarvis/dashboard/backend/`

**Purpose:** API for business metrics and operations control

**Key Files:**
- `dashboard-api.ts` - REST API for Dashboard frontend
- `business-metrics.ts` - Business analytics and KPIs (planned)

**Endpoints:**
- `/health` - Dashboard backend health check
- `/api/dashboard/overview` - Business metrics overview
- `/api/chat` - Chat interface for business queries

#### 3. Dashboard Frontend (Port 3003)
**Location:** `/Users/benkennon/Jarvis/dashboard/frontend/`

**Purpose:** Web UI for JARVIS business operations

**Features:**
- Real-time service health monitoring
- Business metrics visualization
- AI DAWG service control panel
- Chat interface with JARVIS AI Brain
- Alert and notification system
- Deployment management

#### 4. JARVIS AI Brain (Port 8002)
**Location:** `/Users/benkennon/ai-dawg-v0.1/src/ai/brain/` (shared with AI DAWG)

**Purpose:** Conversational AI for business operations

**Identity:** "I'm Jarvis, your AI Business Operator managing AI DAWG"

**Capabilities:**
- Answer business queries (metrics, health, costs)
- Execute operational commands (restart services, deploy)
- Provide business insights and recommendations
- Route music production queries to AI DAWG services

---

### AI DAWG Components

#### 1. DAW Backend (Port 3001)
**Location:** `/Users/benkennon/ai-dawg-v0.1/src/backend/`

**Purpose:** Music production API and data management

**Capabilities:**
- Project and session management
- Audio file handling
- User authentication
- AI service orchestration

#### 2. DAW Frontend (Port 3000)
**Location:** `/Users/benkennon/ai-dawg-v0.1/web/`

**Purpose:** Professional music production interface

**Features:**
- Timeline and mixer UI
- Real-time vocal feedback visualization
- Beat generation controls
- Audio playback and editing

#### 3. AI Producer (Port 8001)
**Location:** `/Users/benkennon/ai-dawg-v0.1/src/ai/producer/`

**Purpose:** AI-powered beat and melody generation

**Capabilities:**
- Generate beats in multiple genres
- Create melodic patterns
- Arrange song structures
- Export audio files

#### 4. Vocal Coach (Port 8000)
**Location:** `/Users/benkennon/ai-dawg-v0.1/src/ai/vocal_coach/`

**Purpose:** Real-time vocal analysis and feedback

**Capabilities:**
- Pitch accuracy analysis
- Rhythm evaluation
- Vocal technique suggestions
- Performance scoring

#### 5. AI DAWG Brain (Port 8003, Planned)
**Purpose:** Conversational AI for music production

**Identity:** "I'm your AI music assistant, here to help you create"

**Capabilities:**
- Music production guidance
- Theory and composition advice
- AI feature control
- Session management

---

## Service Separation

### JARVIS Services
| Service | Port | Location | Purpose |
|---------|------|----------|---------|
| Control Plane | 4000 | `/Users/benkennon/Jarvis/src/core/` | Orchestration hub |
| Dashboard Backend | 5001 | `/Users/benkennon/Jarvis/dashboard/backend/` | Business API |
| Dashboard Frontend | 3003 | `/Users/benkennon/Jarvis/dashboard/frontend/` | Business UI |
| JARVIS AI Brain | 8002 | `/Users/benkennon/ai-dawg-v0.1/src/ai/brain/` | Business chat |

### AI DAWG Services
| Service | Port | Location | Purpose |
|---------|------|----------|---------|
| DAW Backend | 3001 | `/Users/benkennon/ai-dawg-v0.1/src/backend/` | Music API |
| DAW Frontend | 3000 | `/Users/benkennon/ai-dawg-v0.1/web/` | Music UI |
| AI Producer | 8001 | `/Users/benkennon/ai-dawg-v0.1/src/ai/producer/` | Beat generation |
| Vocal Coach | 8000 | `/Users/benkennon/ai-dawg-v0.1/src/ai/vocal_coach/` | Vocal feedback |
| AI DAWG Brain | 8003 | Planned | Music chat |

### Critical Distinction

**❌ WRONG:**
- "Add beat generation to JARVIS" (That's AI DAWG's feature)
- "Add business metrics to AI DAWG" (That's JARVIS's job)

**✅ CORRECT:**
- "JARVIS monitors if AI DAWG's beat generator is working"
- "AI DAWG uses its beat generator to help users make music"

---

## Service Ports & Responsibilities

### Port Allocation Strategy

```
JARVIS Ports (4000-5999):
├── 4000: Control Plane (orchestration)
├── 5001: Dashboard Backend (business API)
└── 3003: Dashboard Frontend (business UI)

AI DAWG Ports (3000-3999, 8000-8999):
├── 3000: DAW Frontend (user-facing UI)
├── 3001: DAW Backend (music API)
├── 8000: Vocal Coach (AI service)
├── 8001: AI Producer (AI service)
├── 8002: AI Brain (shared - JARVIS identity)
└── 8003: AI DAWG Brain (planned - music identity)
```

### Responsibility Matrix

| Concern | JARVIS | AI DAWG |
|---------|--------|---------|
| Service Health | ✅ Monitors | ❌ |
| Business Metrics | ✅ Tracks | ❌ |
| User Analytics | ✅ Aggregates | Generates events |
| Cost Management | ✅ Tracks | Reports usage |
| Auto-Scaling | ✅ Manages | ❌ |
| Deployments | ✅ Executes | ❌ |
| Beat Generation | ❌ | ✅ Provides |
| Vocal Coaching | ❌ | ✅ Provides |
| Music Production | Routes requests | ✅ Executes |
| Business Support | ✅ Provides | ❌ |

---

## How JARVIS Manages AI DAWG

### 1. Health Monitoring

**Mechanism:** Control Plane polls AI DAWG services every 30 seconds

```typescript
// /Users/benkennon/Jarvis/src/core/health-aggregator.ts
const aiDawgServices = [
  { name: 'vocal-coach', url: 'http://localhost:8000/health' },
  { name: 'ai-producer', url: 'http://localhost:8001/health' },
  { name: 'ai-brain', url: 'http://localhost:8002/api/health' },
  { name: 'daw-backend', url: 'http://localhost:3001/api/health' }
];
```

**Actions:**
- Green status: Service healthy, no action
- Yellow status: Service degraded, send alert
- Red status: Service down, attempt auto-restart

### 2. Service Routing

**Mechanism:** Control Plane routes requests to appropriate AI DAWG services

```typescript
// /Users/benkennon/Jarvis/src/core/module-router.ts
POST /api/v1/execute
{
  "module": "ai-producer",
  "action": "generate-beat",
  "params": { "genre": "trap", "bpm": 140 }
}

// Routes to: http://localhost:8001/api/generate-beat
```

### 3. Business Intelligence

**Data Collected:**
- API call counts per service
- Response times and latencies
- Error rates and types
- User session metrics
- AI model usage and costs

**Analysis:**
- Usage patterns and trends
- Performance bottlenecks
- Cost optimization opportunities
- User behavior insights

### 4. Auto-Scaling (Planned)

**Triggers:**
- High CPU/memory usage on AI DAWG services
- Increased request volume
- Response time degradation

**Actions:**
- Scale up Docker containers
- Load balance across instances
- Queue requests during peak times

### 5. Deployment Management (Planned)

**Capabilities:**
- Blue-green deployments
- Rollback on failure
- Health check validation
- Zero-downtime updates

---

## API Endpoints

### JARVIS Control Plane (Port 4000)

#### Health & Status
```bash
GET /health
Response: { "status": "healthy", "service": "jarvis-control-plane", "version": "1.0.0" }

GET /api/v1/health
Response: { "services": [...], "overallHealth": "healthy" }
```

#### Service Orchestration
```bash
POST /api/v1/execute
Body: { "module": "ai-producer", "action": "generate-beat", "params": {...} }
Response: { "result": {...} }

GET /api/v1/modules
Response: { "modules": [...] }
```

#### Business Operations (Planned)
```bash
POST /api/v1/operations/restart
Body: { "service": "ai-producer" }
Response: { "status": "restarting", "service": "ai-producer" }

POST /api/v1/operations/deploy
Body: { "service": "ai-dawg-backend", "version": "1.2.0" }
Response: { "status": "deploying", "eta": "2 minutes" }
```

### JARVIS Dashboard Backend (Port 5001)

#### Health & Metrics
```bash
GET /health
Response: { "status": "healthy", "service": "jarvis-dashboard-api" }

GET /api/dashboard/overview
Response: {
  "instances": [...],
  "metrics": { "totalUsers": 150, "activeSessions": 12 },
  "alerts": [...]
}
```

#### Chat Interface
```bash
POST /api/chat
Body: { "text": "How is AI DAWG performing?" }
Response: { "response": "AI DAWG is running well. All 4 services are healthy..." }
```

### AI DAWG Services

#### Vocal Coach (Port 8000)
```bash
GET /health
Response: { "status": "ok" }

POST /api/analyze-recording
Body: { "audio_file": "vocal.wav" }
Response: { "pitch_accuracy": 85, "suggestions": [...] }
```

#### AI Producer (Port 8001)
```bash
GET /health
Response: { "status": "ok" }

POST /api/generate-beat
Body: { "genre": "trap", "bpm": 140 }
Response: { "beat_url": "...", "duration": 120 }
```

#### DAW Backend (Port 3001)
```bash
GET /api/health
Response: { "status": "healthy", "database": "connected" }

POST /api/projects
Body: { "name": "My Song", "userId": "..." }
Response: { "projectId": "...", "created": "..." }
```

---

## User Interaction Flow

### Business Operator Interaction

```
User (Business/Operations Team)
    │
    ├─> Access Dashboard (http://localhost:3003)
    │       │
    │       ├─> View business metrics
    │       ├─> Monitor AI DAWG services
    │       ├─> Check alerts and issues
    │       └─> Chat with JARVIS AI Brain
    │
    └─> JARVIS Dashboard Backend (Port 5001)
            │
            ├─> Fetch metrics from Control Plane
            ├─> Query AI Brain for insights
            └─> Execute operational commands
                    │
                    └─> Control Plane (Port 4000)
                            │
                            ├─> Monitor AI DAWG health
                            ├─> Route commands to AI DAWG
                            └─> Execute auto-scaling/deployments
```

### Music Production User Interaction

```
User (Music Creator)
    │
    ├─> Access AI DAWG DAW (http://localhost:3000)
    │       │
    │       ├─> Create music projects
    │       ├─> Record vocals
    │       ├─> Generate beats
    │       └─> Chat with AI DAWG Brain (planned)
    │
    └─> DAW Backend (Port 3001)
            │
            ├─> Authenticate user
            ├─> Manage projects/sessions
            └─> Orchestrate AI services
                    │
                    ├─> Vocal Coach (Port 8000)
                    │       └─> Analyze vocal recordings
                    │
                    └─> AI Producer (Port 8001)
                            └─> Generate beats/melodies
```

### Cross-Layer Interaction

```
Business Query Flow:
User → Dashboard → JARVIS AI Brain (8002) → "How is AI DAWG performing?"
                                           → Returns business metrics

Music Query Flow (routed):
User → Dashboard → JARVIS AI Brain (8002) → "Make me a beat"
                                           → Routes to AI Producer (8001)
                                           → Returns beat generation result
```

---

## Data Flow

### Health Monitoring Flow

```
┌─────────────────────────────────────────────────────────┐
│  Control Plane (Port 4000)                              │
│  Every 30 seconds:                                      │
│    1. Poll AI DAWG services                            │
│    2. Aggregate health status                          │
│    3. Detect issues                                    │
│    4. Store metrics                                    │
│    5. Send alerts if needed                            │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         │ (HTTP GET)         │ (HTTP GET)         │ (HTTP GET)
         ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐         ┌──────────┐
    │ Vocal    │        │ AI       │         │ DAW      │
    │ Coach    │        │ Producer │         │ Backend  │
    │ :8000    │        │ :8001    │         │ :3001    │
    └──────────┘        └──────────┘         └──────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                    (Health status returned)
                              │
                              ▼
                      ┌──────────────┐
                      │  Dashboard   │
                      │  Frontend    │
                      │  :3003       │
                      └──────────────┘
```

### Request Routing Flow

```
User Request: "Generate a trap beat"
         │
         ▼
┌──────────────────┐
│  Control Plane   │
│  :4000           │
│  /api/v1/execute │
└──────────────────┘
         │
         │ (Identifies module: ai-producer)
         │ (Routes request)
         │
         ▼
┌──────────────────┐
│  AI Producer     │
│  :8001           │
│  /api/generate   │
└──────────────────┘
         │
         │ (Generates beat)
         │
         ▼
┌──────────────────┐
│  Response        │
│  { beat_url }    │
└──────────────────┘
         │
         │ (Returns through Control Plane)
         │
         ▼
┌──────────────────┐
│  User            │
└──────────────────┘
```

---

## Technology Stack

### JARVIS Stack

**Backend:**
- TypeScript/Node.js
- Express.js (REST API)
- Docker (service management)

**Frontend:**
- Next.js (React framework)
- TypeScript
- TailwindCSS

**AI:**
- OpenAI GPT-4 (business intelligence)
- Anthropic Claude (strategic planning)

**Infrastructure:**
- Docker Compose (local orchestration)
- PostgreSQL (metrics storage, planned)
- Redis (caching, planned)

### AI DAWG Stack

**Backend:**
- TypeScript/Node.js
- Prisma ORM
- PostgreSQL
- Socket.IO (WebSocket, disabled temporarily)

**Frontend:**
- Vite + React
- TypeScript
- TailwindCSS

**AI Services:**
- Python/FastAPI (AI microservices)
- OpenAI API (music generation)
- Web Speech API (voice transcription)

**Audio:**
- Tone.js (audio synthesis)
- Web Audio API

---

## Testing & Monitoring

### Integration Testing

**Test Suite:** `/Users/benkennon/Jarvis/tests/jarvis-integration-test.sh`

**Test Coverage:**
1. **Phase 1: JARVIS Core Services**
   - Control Plane health and version
   - Dashboard Backend health and service name
   - Dashboard Frontend accessibility

2. **Phase 2: AI DAWG Services**
   - Vocal Coach service health
   - AI Producer service health
   - AI Brain service health

3. **Phase 3: Integration & Routing**
   - Control Plane routes to module registry
   - Dashboard metrics endpoint

4. **Phase 4: JARVIS Identity**
   - AI Brain identifies as JARVIS (not AI DAWG)

**Run Tests:**
```bash
cd /Users/benkennon/Jarvis
./tests/jarvis-integration-test.sh
```

**Expected Result:**
```
Tests Passed: 11
Tests Failed: 0
✓ All core JARVIS systems operational!
```

### Monitoring Strategy

**Metrics Collected:**
- Service uptime and availability
- API response times
- Error rates by service
- User session counts
- AI model usage and costs

**Alerting:**
- Service health degradation
- High error rates
- Performance threshold breaches
- Cost anomalies

**Dashboards:**
- Real-time service health
- Business KPIs
- User activity metrics
- Cost analysis

---

## Next Steps & Roadmap

### Phase 1: Core Fixes ✅ (Completed)
- ✅ Fixed AI Brain identity (identifies as JARVIS)
- ✅ Verified chat works without duplication
- ✅ Integration test suite created
- ✅ All services operational

### Phase 2: Business Operator (In Progress)
- ⏳ Enhance Control Plane monitoring
- ⏳ Add business intelligence agents
- ⏳ Create auto-scaling logic
- ⏳ Implement auto-restart for failed services

### Phase 3: Dashboard Enhancement (Planned)
- ⏳ Add business metrics views
- ⏳ Create operations control panel
- ⏳ Implement alert system
- ⏳ Add deployment management UI

### Phase 4: Advanced Features (Future)
- 🔮 Predictive scaling based on patterns
- 🔮 Cost optimization recommendations
- 🔮 A/B testing for AI DAWG features
- 🔮 Automated deployment pipelines

---

## Contact & Support

**Repository:** `/Users/benkennon/Jarvis/`

**Related Projects:**
- AI DAWG: `/Users/benkennon/ai-dawg-v0.1/`

**Documentation:**
- Quick Reference: `/tmp/JARVIS_VS_AI_DAWG_GUIDE.md`
- Execution Prompts: `/tmp/JARVIS_EXECUTION_PROMPTS.md`
- Integration Tests: `/Users/benkennon/Jarvis/tests/jarvis-integration-test.sh`

---

**Last Updated:** 2025-10-08

**Version:** 1.0.0

**Status:** ✅ All core systems operational
