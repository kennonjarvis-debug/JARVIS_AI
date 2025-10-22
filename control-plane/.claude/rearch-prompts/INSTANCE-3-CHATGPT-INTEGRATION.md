# 🎯 INSTANCE 3: CHATGPT INTEGRATION

**Branch:** `rearch/instance-3-chatgpt`
**Duration:** 3-4 hours
**Working Directory:** `/Users/benkennon/Jarvis`

---

## 🎯 YOUR MISSION

Build a **production-ready ChatGPT GPT Actions integration** that allows ChatGPT to control AI Dawg through the Jarvis gateway. Enable natural language music production.

### Current State (Already Running ✅)
- Jarvis Gateway: `http://localhost:4000` (Instance 1 is building this)
- AI Dawg Backend: `http://localhost:3001`
- AI Dawg AI Brain: `http://localhost:8002`

**Dependencies:** Wait for Instance 1 to complete Task 2 (Gateway creation)

---

## 📋 TASKS

### **Task 1: Create OpenAPI Schema for GPT Actions**

Create `/Users/benkennon/Jarvis/integrations/chatgpt/openapi.yaml`:

```yaml
openapi: 3.0.0
info:
  title: Jarvis AI Control API
  description: Control AI Dawg music production system via natural language
  version: 2.0.0
servers:
  - url: http://localhost:4000
    description: Local development
  - url: https://jarvis-api.yourdomain.com
    description: Production (update when deployed)

paths:
  /api/v1/jarvis/health/all:
    get:
      operationId: checkSystemHealth
      summary: Check health of all services
      description: Returns health status of Jarvis and all AI Dawg modules
      responses:
        '200':
          description: System health status
          content:
            application/json:
              schema:
                type: object
                properties:
                  jarvis:
                    type: object
                  aiDawgBackend:
                    type: object
                  aiDawgBrain:
                    type: object

  /api/v1/jarvis/modules:
    get:
      operationId: listModules
      summary: List all available AI Dawg modules
      description: Get a list of all AI modules and their capabilities
      responses:
        '200':
          description: List of modules
          content:
            application/json:
              schema:
                type: object
                properties:
                  modules:
                    type: array
                    items:
                      type: object
                      properties:
                        name:
                          type: string
                        status:
                          type: string
                        endpoint:
                          type: string

  /api/v1/jarvis/execute:
    post:
      operationId: executeCommand
      summary: Execute a command on an AI Dawg module
      description: Run music generation, audio processing, or other AI operations
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - module
                - action
                - parameters
              properties:
                module:
                  type: string
                  enum: [ai-brain, audio-engine, vocal-coach, producer]
                  description: Target module name
                action:
                  type: string
                  description: Action to perform
                parameters:
                  type: object
                  description: Action-specific parameters
      responses:
        '200':
          description: Command executed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                  module:
                    type: string
                  action:
                    type: string

  /api/v1/chatgpt/chat:
    post:
      operationId: sendChatMessage
      summary: Send a message to AI Dawg Brain
      description: Natural language chat with AI music production assistant
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - message
              properties:
                message:
                  type: string
                  description: User's message
                context:
                  type: object
                  description: Optional conversation context
      responses:
        '200':
          description: AI response
          content:
            application/json:
              schema:
                type: object
                properties:
                  response:
                    type: string
                  actions:
                    type: array
                    items:
                      type: object

  /api/v1/chatgpt/generate-music:
    post:
      operationId: generateMusic
      summary: Generate music from natural language prompt
      description: Create music using AI based on text description
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - prompt
              properties:
                prompt:
                  type: string
                  description: Music generation prompt (e.g., "Create a pop song in C major")
                genre:
                  type: string
                  description: Music genre
                duration:
                  type: integer
                  description: Duration in seconds
                bpm:
                  type: integer
                  description: Beats per minute
      responses:
        '200':
          description: Music generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  audioUrl:
                    type: string
                  metadata:
                    type: object

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-Jarvis-API-Key

security:
  - ApiKeyAuth: []
```

### **Task 2: Create ChatGPT-Specific API Routes**

Create `/Users/benkennon/Jarvis/src/integrations/chatgpt/routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../../utils/logger';

const router = Router();

const AI_DAWG_BACKEND = process.env.AI_DAWG_BACKEND || 'http://localhost:3001';
const AI_DAWG_AI_BRAIN = process.env.AI_DAWG_AI_BRAIN || 'http://localhost:8002';

// ChatGPT-friendly chat endpoint
router.post('/chat', async (req: Request, res: Response) => {
  const { message, context } = req.body;

  try {
    logger.info('ChatGPT chat request', { message });

    const response = await axios.post(`${AI_DAWG_AI_BRAIN}/api/chat`, {
      message,
      context,
      source: 'chatgpt'
    });

    res.json({
      response: response.data.response || response.data.message,
      actions: response.data.actions || [],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Chat request failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

// Music generation endpoint
router.post('/generate-music', async (req: Request, res: Response) => {
  const { prompt, genre, duration, bpm } = req.body;

  try {
    logger.info('Music generation request', { prompt, genre });

    // Route through module system
    const response = await axios.post(`${AI_DAWG_BACKEND}/api/v1/modules/producer/execute`, {
      action: 'generate',
      parameters: {
        prompt,
        genre,
        duration: duration || 30,
        bpm: bpm || 120
      }
    });

    res.json({
      success: true,
      audioUrl: response.data.data?.audioUrl,
      metadata: {
        genre,
        duration,
        bpm,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('Music generation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate music',
      details: error.message
    });
  }
});

// Audio processing endpoint
router.post('/process-audio', async (req: Request, res: Response) => {
  const { audioUrl, effects } = req.body;

  try {
    logger.info('Audio processing request', { audioUrl, effects });

    const response = await axios.post(`${AI_DAWG_BACKEND}/api/v1/modules/audio-engine/execute`, {
      action: 'process',
      parameters: {
        audioUrl,
        effects: effects || []
      }
    });

    res.json({
      success: true,
      processedAudioUrl: response.data.data?.processedAudioUrl,
      metadata: response.data.data?.metadata
    });
  } catch (error: any) {
    logger.error('Audio processing failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to process audio',
      details: error.message
    });
  }
});

export default router;
```

### **Task 3: Add ChatGPT Routes to Gateway**

Edit `/Users/benkennon/Jarvis/src/core/gateway.ts`:

Add import:
```typescript
import chatgptRoutes from '../integrations/chatgpt/routes';
```

Add before `app.listen()`:
```typescript
// Mount ChatGPT-specific routes
app.use('/api/v1/chatgpt', chatgptRoutes);
```

### **Task 4: Create API Key Authentication Middleware**

Create `/Users/benkennon/Jarvis/src/integrations/chatgpt/auth-middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

const VALID_API_KEYS = [
  process.env.JARVIS_API_KEY || 'dev-key-12345',
  process.env.CHATGPT_API_KEY || 'chatgpt-key-67890'
];

export function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-jarvis-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    logger.warn('API request without key', { path: req.path });
    return res.status(401).json({
      error: 'API key required',
      message: 'Include X-Jarvis-API-Key header'
    });
  }

  if (!VALID_API_KEYS.includes(apiKey as string)) {
    logger.warn('Invalid API key', { key: apiKey });
    return res.status(403).json({
      error: 'Invalid API key'
    });
  }

  next();
}
```

Update gateway.ts to use auth:
```typescript
import { authenticateApiKey } from '../integrations/chatgpt/auth-middleware';

// Apply auth to ChatGPT routes
app.use('/api/v1/chatgpt', authenticateApiKey, chatgptRoutes);
app.use('/api/v1/jarvis/execute', authenticateApiKey);
```

### **Task 5: Create .env File**

Create `/Users/benkennon/Jarvis/.env`:

```bash
# Jarvis Gateway
JARVIS_GATEWAY_PORT=4000
JARVIS_API_KEY=jarvis-dev-key-$(openssl rand -hex 16)
CHATGPT_API_KEY=chatgpt-key-$(openssl rand -hex 16)

# AI Dawg Services
AI_DAWG_BACKEND=http://localhost:3001
AI_DAWG_AI_BRAIN=http://localhost:8002

# Environment
NODE_ENV=development
```

### **Task 6: Test ChatGPT Integration**

```bash
# Start gateway with ChatGPT routes
cd /Users/benkennon/Jarvis
npm run gateway

# Test chat endpoint
curl -X POST http://localhost:4000/api/v1/chatgpt/chat \
  -H "Content-Type: application/json" \
  -H "X-Jarvis-API-Key: dev-key-12345" \
  -d '{
    "message": "Generate a pop song in C major with 120 BPM"
  }'

# Test music generation
curl -X POST http://localhost:4000/api/v1/chatgpt/generate-music \
  -H "Content-Type: application/json" \
  -H "X-Jarvis-API-Key: dev-key-12345" \
  -d '{
    "prompt": "Upbeat pop song with catchy melody",
    "genre": "pop",
    "duration": 30,
    "bpm": 120
  }'
```

### **Task 7: Create ChatGPT Setup Guide**

Create `/Users/benkennon/Jarvis/docs/CHATGPT_SETUP.md`:

```markdown
# ChatGPT Integration Setup Guide

## 1. Create Custom GPT

1. Go to https://chat.openai.com/gpts/editor
2. Click "Create a GPT"
3. Name: "AI Dawg Music Producer"
4. Description: "AI-powered music production assistant using AI Dawg"

## 2. Configure Actions

1. Click "Configure" → "Actions" → "Create new action"
2. Import schema from `/Users/benkennon/Jarvis/integrations/chatgpt/openapi.yaml`
3. Set Authentication:
   - Type: API Key
   - Header name: X-Jarvis-API-Key
   - API Key: [Copy from .env file]

## 3. Test Integration

In ChatGPT, try:
- "Check system health"
- "List available modules"
- "Generate a pop song in C major"
- "Process audio with reverb effect"

## 4. Production Deployment

1. Deploy Jarvis gateway to a public URL (e.g., Render, Railway)
2. Update OpenAPI schema with production URL
3. Add HTTPS
4. Use secure API keys
5. Enable rate limiting
```

---

## ✅ DELIVERABLES

1. ✅ OpenAPI schema created
2. ✅ ChatGPT-specific routes implemented
3. ✅ API key authentication added
4. ✅ .env file configured
5. ✅ Tests passing
6. ✅ Setup guide created
7. ✅ ChatGPT Actions configured (manual step)

---

## 🔗 COORDINATION

- **Dependencies:** Instance 1 must complete Task 2 first
- **Sync Points:**
  - After Task 1: Share OpenAPI schema with team
  - After Task 6: Share API key with Instance 4 for testing

---

## 📊 PROGRESS TRACKING

Update `/Users/benkennon/Jarvis/.claude/rearch-prompts/PROGRESS.md`:

```markdown
## Instance 3 Progress
- [ ] Task 1: OpenAPI schema
- [ ] Task 2: ChatGPT routes
- [ ] Task 3: Routes mounted
- [ ] Task 4: Auth middleware
- [ ] Task 5: .env configured
- [ ] Task 6: Tests passing
- [ ] Task 7: Setup guide
```

---

**START NOW! 🚀**
