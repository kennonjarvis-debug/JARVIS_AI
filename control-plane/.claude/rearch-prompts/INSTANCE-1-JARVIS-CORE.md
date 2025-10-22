# 🎯 INSTANCE 1: JARVIS CORE CONTROL PLANE

**Branch:** `rearch/instance-1-jarvis-core`
**Duration:** 3-4 hours
**Working Directory:** `/Users/benkennon/Jarvis`

---

## 🎯 YOUR MISSION

Build the **true Jarvis Control Plane** that orchestrates AI Dawg modules. Currently AI Dawg contains Jarvis code - we're inverting this so Jarvis controls AI Dawg.

### Current State (Already Running ✅)
- AI Dawg Backend: `http://localhost:3001`
- AI Dawg Frontend: `http://localhost:5173`
- AI Dawg AI Brain: `http://localhost:8002`
- Jarvis Web: `http://localhost:3002`
- JIT Controller: Port 4000

---

## 📋 TASKS

### **Task 1: Create Package.json & Project Structure**
```bash
cd /Users/benkennon/Jarvis

# Create package.json from template
cat > package.json << 'EOF'
{
  "name": "jarvis-control-plane",
  "version": "2.0.0",
  "description": "Jarvis AI Control Plane - Orchestrates AI Dawg & Agent Modules",
  "main": "dist/main.js",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "test": "jest",
    "gateway": "tsx src/core/gateway.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.12.2",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.0.0",
    "tsx": "^4.20.6",
    "typescript": "^5.3.0"
  }
}
EOF

npm install
```

### **Task 2: Create Core API Gateway**

Create `/Users/benkennon/Jarvis/src/core/gateway.ts`:

```typescript
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { logger } from '../utils/logger';

const app: Express = express();
const PORT = process.env.JARVIS_GATEWAY_PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// AI Dawg services configuration
const AI_DAWG_BACKEND = process.env.AI_DAWG_BACKEND || 'http://localhost:3001';
const AI_DAWG_AI_BRAIN = process.env.AI_DAWG_AI_BRAIN || 'http://localhost:8002';

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'jarvis-gateway',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Health aggregation from all services
app.get('/api/v1/jarvis/health/all', async (req: Request, res: Response) => {
  try {
    const [backendHealth, brainHealth] = await Promise.allSettled([
      axios.get(`${AI_DAWG_BACKEND}/api/v1/health`),
      axios.get(`${AI_DAWG_AI_BRAIN}/health`)
    ]);

    res.json({
      jarvis: { status: 'healthy' },
      aiDawgBackend: backendHealth.status === 'fulfilled' ? backendHealth.value.data : { status: 'unhealthy' },
      aiDawgBrain: brainHealth.status === 'fulfilled' ? brainHealth.value.data : { status: 'unhealthy' }
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Module registry endpoint
app.get('/api/v1/jarvis/modules', (req: Request, res: Response) => {
  res.json({
    modules: [
      { name: 'audio-engine', status: 'available', endpoint: `${AI_DAWG_BACKEND}/api/v1/audio` },
      { name: 'ai-brain', status: 'available', endpoint: `${AI_DAWG_AI_BRAIN}` },
      { name: 'vocal-coach', status: 'building', endpoint: `${AI_DAWG_BACKEND}/api/v1/vocal-coach` },
      { name: 'producer', status: 'available', endpoint: `${AI_DAWG_BACKEND}/api/v1/producer` }
    ]
  });
});

// Command execution proxy
app.post('/api/v1/jarvis/execute', async (req: Request, res: Response) => {
  const { module, action, parameters } = req.body;

  logger.info('Executing command', { module, action });

  try {
    let response;

    switch (module) {
      case 'ai-brain':
        response = await axios.post(`${AI_DAWG_AI_BRAIN}/api/chat`, parameters);
        break;
      case 'audio-engine':
        response = await axios.post(`${AI_DAWG_BACKEND}/api/v1/audio/${action}`, parameters);
        break;
      default:
        return res.status(404).json({ error: `Module '${module}' not found` });
    }

    res.json({
      success: true,
      data: response.data,
      module,
      action
    });
  } catch (error: any) {
    logger.error('Command execution failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Jarvis Gateway listening on port ${PORT}`);
  logger.info(`📡 AI Dawg Backend: ${AI_DAWG_BACKEND}`);
  logger.info(`🧠 AI Dawg Brain: ${AI_DAWG_AI_BRAIN}`);
});

export default app;
```

### **Task 3: Create Logger Utility**

Create `/Users/benkennon/Jarvis/src/utils/logger.ts`:

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/jarvis-gateway.log' })
  ]
});
```

### **Task 4: Create TypeScript Config**

Create `/Users/benkennon/Jarvis/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### **Task 5: Test the Gateway**

```bash
# Terminal 1: Start the gateway
cd /Users/benkennon/Jarvis
npm run gateway

# Terminal 2: Test endpoints
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/jarvis/health/all
curl http://localhost:4000/api/v1/jarvis/modules

# Test command execution
curl -X POST http://localhost:4000/api/v1/jarvis/execute \
  -H "Content-Type: application/json" \
  -d '{
    "module": "ai-brain",
    "action": "chat",
    "parameters": {
      "message": "Hello from Jarvis gateway!"
    }
  }'
```

---

## ✅ DELIVERABLES

1. ✅ `package.json` created and dependencies installed
2. ✅ API Gateway running on port 4000
3. ✅ Health aggregation endpoint working
4. ✅ Module registry endpoint responding
5. ✅ Command proxy to AI Dawg services functional
6. ✅ Logger utility created
7. ✅ TypeScript config set up

---

## 🔗 COORDINATION

- **Merge Conflicts:** Minimal (you're creating new files)
- **Dependencies:** None - you can start immediately
- **Sync Points:**
  - After Task 2: Share gateway URL with Instance 3 & 4
  - After Task 5: Report test results

---

## 📊 PROGRESS TRACKING

Update `/Users/benkennon/Jarvis/.claude/rearch-prompts/PROGRESS.md`:

```markdown
## Instance 1 Progress
- [ ] Task 1: Package.json created
- [ ] Task 2: Gateway created
- [ ] Task 3: Logger created
- [ ] Task 4: TypeScript config
- [ ] Task 5: Tests passing
```

---

**START NOW! 🚀**
