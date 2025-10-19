# JARVIS SYSTEM CONNECTION DIAGRAMS

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL CLIENTS                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────────────┐   │
│  │ ChatGPT  │  │  Claude  │  │ Web/App  │  │  Siri  │  │Mobile Devices│   │
│  │   GPT    │  │   (MCP)  │  │   UI     │  │  Alexa │  │  (iOS/Mac)   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  └─────┬────────┘   │
└───────┼─────────────┼─────────────┼────────────┼───────────────┼────────────┘
        │             │             │            │               │
        └─────────────┴─────────────┴────────────┴───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  JARVIS CONTROL PLANE       │
        │  (Port 4000 - Express)      │
        │  ┌─────────────────────────┐│
        │  │   API Gateway           ││
        │  │   • Auth & Rate Limit   ││
        │  │   • Request Logging     ││
        │  └──────────────┬──────────┘│
        │                 │           │
        │  ┌──────────────▼──────────┐│
        │  │   Module Router         ││
        │  │   • Retry logic (3x)    ││
        │  │   • Exponential backoff ││
        │  └──────────────┬──────────┘│
        │                 │           │
        │  ┌──────────────▼──────────┐│
        │  │  Smart AI Router v2     ││
        │  │  • Cost tracking        ││
        │  │  • Multi-provider       ││
        │  │  • Budget limits        ││
        │  └──────────────┬──────────┘│
        │                 │           │
        │  ┌──────────────▼──────────┐│
        │  │   WebSocket Hub         ││
        │  │   • Real-time sync      ││
        │  │   • Redis pub/sub       ││
        │  │   • Room-based routing  ││
        │  └──────────────┬──────────┘│
        │                 │           │
        │  ┌──────────────▼──────────┐│
        │  │  Event Emitters         ││
        │  │  • Activity Monitor     ││
        │  │  • Orchestrator         ││
        │  │  • Business Operator    ││
        │  └──────────────┬──────────┘│
        │                 │           │
        │  ┌──────────────▼──────────┐│
        │  │ Service Aggregation     ││
        │  │  • Health Monitoring    ││
        │  │  • Circuit Breakers     ││
        │  │  • Business Intelligence││
        │  └──────────────┬──────────┘│
        └─────────────────┼───────────┘
                          │
                          ▼
        ┌─────────────────────────────┐
        │  AI PROVIDERS               │
        │  ┌───────────────────────┐  │
        │  │ OpenAI (GPT-4o-mini)  │  │
        │  │ Anthropic (Claude)    │  │
        │  │ Google (Gemini)       │  │
        │  │ Mistral               │  │
        │  └───────────────────────┘  │
        └─────────────┬───────────────┘
                      │
        ┌─────────────┴───────────────┐
        │                             │
        ▼                             ▼
┌─────────────────────┐      ┌──────────────────┐
│ DATA LAYER          │      │ MICROSERVICES    │
│ • PostgreSQL        │      │ • Vocal Coach    │
│ • Redis             │      │ • Producer       │
│ • File Storage      │      │ • AI Brain       │
│ • S3 Backup         │      │ • Freestyle DAW  │
└─────────────────────┘      └──────────────────┘
```

---

## Service Connection Matrix

```
SERVICE CONNECTIONS:
===================

┌──────────────────┬──────────────────┬─────────────┐
│ SOURCE SERVICE   │ TARGET SERVICE   │ CONNECTION  │
├──────────────────┼──────────────────┼─────────────┤
│ API Gateway      │ Module Router    │ Calls       │
│ Module Router    │ AI Router v2     │ Calls       │
│ AI Router v2     │ AI Providers     │ Calls       │
│ Activity Monitor │ ProactiveActions │ Events      │
│ Activity Monitor │ DeviceSync       │ Events      │
│ Activity Monitor │ [MISSING]        │ ❌ Chat     │
│ Activity Monitor │ [MISSING]        │ ❌ Music    │
│ Activity Monitor │ [MISSING]        │ ❌ DAW      │
│ Chat System      │ [MISSING]        │ ❌ Music    │
│ Autonomous Orch  │ Domain Agents    │ Calls       │
│ Domain Agents    │ [MISSING]        │ ❌ Music    │
│ WebSocket Hub    │ Conversation     │ Stores      │
│ WebSocket Hub    │ Redis pub/sub    │ Broadcasts  │
│ Business Oper    │ Health Agg       │ Calls       │
│ Circuit Breaker  │ PostgreSQL       │ Persists    │
│ Music Generator  │ Storage          │ [STUB]      │
│ Music Generator  │ Chat Response    │ [MISSING]   │
└──────────────────┴──────────────────┴─────────────┘
```

---

## Event Flow Diagram

```
CURRENT EVENT FLOWS (Implemented):
==================================

Activity Detected
    ↓
ActivityMonitorService.emit('session:ended', session)
    ↓
    ├─→ ProactiveActions (listens)
    │       ↓
    │   Analyze activity
    │   Create opportunities
    │   Auto-approve low-risk
    │
    └─→ DeviceSync (listens)
            ↓
        Sync to iPhone
        Real-time notifications


MISSING EVENT FLOWS (Not Implemented):
======================================

Activity Monitor detects 'freestyle'
    ↓
[MISSING] Freestyle Event Routing
    ↓
[NO CONNECTION] to Chat System
[NO CONNECTION] to Music Generation
[NO CONNECTION] to DAW Service


User sends music request in chat
    ↓
[MISSING] Intent Detection
    ↓
[NO CONNECTION] to Music Generator
[STUB RESPONSE] Fake music URL
[NO CONNECTION] back to chat


Autonomous Orchestrator starts
    ↓
Domain agents register
    ↓
[MISSING] Event subscription
    ↓
[NO CONNECTION] to Activity Monitor
[NO CONNECTION] to Chat System
[NO CONNECTION] to Music Production domain
```

---

## Data Flow: Chat Request (Working)

```
USER MESSAGE:
"Hey Jarvis, what's the weather?"

    ↓
┌───────────────────────────────┐
│ POST /api/v1/chat            │
│ { message, conversationId }   │
└───────────┬───────────────────┘
            ↓
    ┌───────────────────────┐
    │ API Gateway           │
    │ • Validate auth token │
    │ • Check rate limits   │
    │ • Log request         │
    └───────────┬───────────┘
                ↓
        ┌───────────────────┐
        │ Module Router     │
        │ • Internal handler│
        └───────────┬───────┘
                    ↓
        ┌───────────────────────┐
        │ SmartAIRouterV2       │
        │ • Select provider     │
        │ • Track cost          │
        │ • Check budget        │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────────┐
        │ AI Provider               │
        │ • OpenAI (GPT-4o-mini)    │
        │ • Send request            │
        │ • Get response            │
        └───────────┬───────────────┘
                    ↓
        ┌───────────────────────────┐
        │ Response Processing       │
        │ • Cache in memory         │
        │ • Add metadata            │
        └───────────┬───────────────┘
                    ↓
        ┌───────────────────────────┐
        │ Conversation Store        │
        │ • Save message            │
        │ • Store history           │
        │ • User context            │
        └───────────┬───────────────┘
                    ↓
        ┌───────────────────────────┐
        │ WebSocket Hub             │
        │ • Broadcast to clients    │
        │ • Redis pub/sub           │
        │ • Room-based routing      │
        └───────────┬───────────────┘
                    ↓
        ┌───────────────────────────┐
        │ Client Response           │
        │ • Message received        │
        │ • Displayed to user       │
        └───────────────────────────┘

STATUS: ✅ FULLY WORKING
```

---

## Data Flow: Music Request (BROKEN)

```
USER MESSAGE:
"Generate me a hip-hop beat"

    ↓
┌───────────────────────────────┐
│ POST /api/v1/chat            │
│ { message, conversationId }   │
└───────────┬───────────────────┘
            ↓
    ┌───────────────────────┐
    │ API Gateway           │
    │ • Validate auth token │
    │ • Check rate limits   │
    │ • Log request         │
    └───────────┬───────────┘
                ↓
        ┌───────────────────────┐
        │ Module Router         │
        │ [NO MUSIC ROUTING]    │ ❌
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────────────┐
        │ SmartAIRouterV2               │
        │ • Select provider             │
        │ • Send to AI (not music gen!)  │
        │ ❌ NO INTENT DETECTION        │
        └───────────┬───────────────────┘
                    ↓
        ┌───────────────────────────────┐
        │ AI Provider Response:         │
        │ "Sure, I can help with that!" │
        │ [TEXT RESPONSE ONLY]          │
        │ ❌ NO ACTUAL MUSIC            │
        └───────────┬───────────────────┘
                    ↓
        ┌───────────────────────────────┐
        │ Conversation Store            │
        │ • Save text response          │
        │ ❌ NO AUDIO                   │
        └───────────┬───────────────────┘
                    ↓
        ┌───────────────────────────────┐
        │ Client Sees:                  │
        │ "Sure, I can help with that!" │
        │ ❌ NO MUSIC FILE LINK         │
        └───────────────────────────────┘

STATUS: ❌ COMPLETELY BROKEN

ROOT CAUSES:
• No music intent detection
• No routing to music generator
• No connection between chat and music services
• Music generator is stub only
• No callback mechanism
```

---

## Data Flow: Freestyle Auto-finish (BROKEN)

```
USER ACTION:
Freestyling in Logic Pro (detected by activity monitor)

    ↓
┌──────────────────────────────────┐
│ Activity Monitor                 │
│ • App: Logic Pro detected        │
│ • Audio input: Microphone active │
│ • Context: freestyling          │
│ • Action: Start monitoring       │
└──────────────┬───────────────────┘
               ↓
        [USER STOPS FREESTYLING]
               ↓
        ┌──────────────────────────┐
        │ Session ended event      │
        │ Session ID: xyz123       │
        │ Duration: 15 minutes     │
        │ Audio quality: good      │
        └──────────┬───────────────┘
                   ↓
        ┌──────────────────────────────┐
        │ ProactiveActions listener    │
        │ • Analyzes session          │
        │ • Creates opportunity:      │
        │   "Auto-finish freestyle"   │
        │ • Auto-approves (low risk)  │
        │ ✓ Action created           │
        └──────────┬───────────────────┘
                   ↓
        ┌──────────────────────────────┐
        │ [DEAD END]                   │
        │ ❌ NO CONNECTION TO:         │
        │    • Chat system            │
        │    • Music generation       │
        │    • DAW service            │
        │    • Freestyle module       │
        └──────────────────────────────┘

STATUS: ❌ COMPLETELY BROKEN

MISSING CONNECTIONS:
• Freestyle module not triggered
• Music generator not called
• Session audio not processed
• Chat not notified
• No file saved
```

---

## AI Provider Routing (Implemented but Limited)

```
MULTI-PROVIDER ROUTING:
======================

Chat Request
    ↓
┌─────────────────────────────────────┐
│ Smart AI Router v2                  │
│ (src/core/ai-router-v2.ts)         │
│                                     │
│ Routing Strategy (configurable):    │
│ • Gemini: 70%                       │
│ • GPT-4o-mini: 20%                  │
│ • Claude: 10%                       │
│ • Mistral: 0% (available)           │
│                                     │
│ Decision Factors:                   │
│ • Cost optimization                 │
│ • Request complexity                │
│ • Quality requirements              │
│ • Budget remaining                  │
│ • Rate limits                       │
│ • Latency targets                   │
└─────────────┬───────────────────────┘
              ↓
    ┌─────────────────────┐
    │ Provider Selected   │
    ├─────────────────────┤
    │ • Model version     │
    │ • Temperature       │
    │ • Token limits      │
    │ • Timeout (30s)     │
    └─────────┬───────────┘
              ↓
    ┌─────────────────────┐
    │ API Call            │
    │ ├─ Success: Cache   │
    │ └─ Failure: Retry   │
    │    (3 attempts)     │
    └─────────┬───────────┘
              ↓
    ┌─────────────────────┐
    │ Cost Tracking       │
    │ • Input tokens      │
    │ • Output tokens     │
    │ • Provider cost     │
    │ • Daily total       │
    │ • Monthly total     │
    │ • Budget alerts     │
    └─────────┬───────────┘
              ↓
        Response returned

LIMITATIONS:
❌ No streaming (complete only)
❌ No multimodal/vision
❌ No audio input
❌ No context from activity
❌ No adaptive learning
✅ Cost tracking works
✅ Multi-provider support
✅ Budget enforcement
```

---

## Service Health Monitoring (Working)

```
┌─────────────────────────────────────┐
│ Health Aggregator                   │
│ (Checks every 5 seconds)            │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────────┬──────────────┐
    │          │              │              │
    ▼          ▼              ▼              ▼
┌────────┐ ┌────────┐  ┌──────────┐ ┌─────────┐
│AI Dawg │ │Vocal   │  │Producer  │ │AI Brain │
│:3001   │ │Coach   │  │:8001     │ │:8002    │
│        │ │:8000   │  │          │ │         │
└───┬────┘ └───┬────┘  └────┬─────┘ └────┬────┘
    │          │            │            │
    └──────────┼────────────┼────────────┘
               ▼            ▼
        ┌──────────────────────┐
        │ Health Status        │
        │ • healthy/degraded   │
        │ • latency (ms)       │
        │ • timestamp          │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │ Circuit Breaker      │
        │ • Update state       │
        │ • Sync to DB         │
        │ • Emit events        │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │ Business Operator    │
        │ • Track uptime       │
        │ • Alert on failures  │
        │ • Auto-restart       │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │ Dashboard/Alerts     │
        │ WebSocket broadcast  │
        └──────────────────────┘

STATUS: ✅ FULLY WORKING
```

---

## Missing Link Summary

```
COMPONENT INTEGRATION STATUS:
============================

✅ Chat System
   ├─ ✅ Multiple AI providers
   ├─ ✅ Conversation history
   ├─ ✅ Real-time sync
   └─ ❌ Music integration

✅ Activity Monitoring
   ├─ ✅ App tracking
   ├─ ✅ Context detection
   ├─ ✅ Event emission
   ├─ ❌ Music integration
   ├─ ❌ DAW integration
   └─ ❌ Chat notification

⚠️  Music Generation
   ├─ ❌ Stub implementation only
   ├─ ❌ No real providers
   ├─ ❌ No actual audio generation
   ├─ ❌ No storage
   ├─ ❌ No chat integration
   ├─ ❌ No DAW integration
   └─ ❌ No callback to user

⚠️  DAW / Freestyle
   ├─ ✅ Module routing defined
   ├─ ❌ No chat integration
   ├─ ❌ No activity trigger
   ├─ ❌ No music generation
   └─ ❌ No user notification

❌ Plugin System
   ├─ ❌ No interface defined
   ├─ ❌ No plugin loader
   ├─ ❌ No hook system
   └─ ❌ No third-party support

✅ Infrastructure
   ├─ ✅ Health monitoring
   ├─ ✅ Circuit breakers
   ├─ ✅ Event emitters
   ├─ ✅ Conversation store
   ├─ ✅ WebSocket broadcasting
   └─ ✅ Multi-instance support
```

---

## Key Missing Bridges

```
1. INTENT DETECTION MISSING
   User says "Generate music"
   → AI routes to music provider instead of text AI
   [NOT IMPLEMENTED]

2. MUSIC GENERATION STUB
   Music request arrives
   → Returns fake URL (/tmp/music/{id}.mp3)
   → No actual audio file created
   [STUB IMPLEMENTATION]

3. NO CHAT-MUSIC CALLBACK
   Music generated
   → Chat system doesn't know about it
   → Can't send audio back to user
   [MISSING CONNECTION]

4. NO ACTIVITY-DAW BRIDGE
   Activity monitor detects freestyle
   → Should trigger DAW operations
   → Should call music generation
   [MISSING CONNECTION]

5. NO EVENT BUS
   Multiple services emit events
   → Other services can't reliably listen
   → EventEmitter is local, not distributed
   [FRAGMENTED ARCHITECTURE]

6. NO PLUGIN SYSTEM
   Want to add custom music provider?
   → No way to register it
   → No hook system
   [COMPLETELY MISSING]
```

