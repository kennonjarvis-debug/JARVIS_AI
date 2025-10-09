# 🎯 INSTANCE 2: AI DAWG CLEANUP & MODULARIZATION

**Branch:** `rearch/instance-2-aidawg-modules`
**Duration:** 3-4 hours
**Working Directory:** `/Users/benkennon/ai-dawg-v0.1`

---

## 🎯 YOUR MISSION

Transform AI Dawg from a monolith with embedded Jarvis controller into a **clean execution engine** with standardized module interfaces. Remove Jarvis controller logic since it now lives in the Jarvis repo (Instance 1 is building it).

### Current State (Already Running ✅)
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`
- AI Brain: `http://localhost:8002`
- PostgreSQL: port 5432 ✅
- Redis: port 6379 ✅
- MinIO: ports 9000-9001 ✅

---

## 📋 TASKS

### **Task 1: Remove Embedded Jarvis Controller**

```bash
cd /Users/benkennon/ai-dawg-v0.1

# Create backup branch first
git checkout -b backup-before-cleanup
git add -A && git commit -m "Backup before Jarvis extraction"

# Switch to working branch
git checkout -b rearch/instance-2-aidawg-modules

# Move Jarvis code out to archive (don't delete yet, for reference)
mkdir -p .archive/jarvis-old
mv src/jarvis .archive/jarvis-old/

# Keep only JIT controller as a service endpoint
mkdir -p src/services/jit-bridge
# We'll recreate this as a lightweight service in Task 2
```

### **Task 2: Create Module SDK**

Create `/Users/benkennon/ai-dawg-v0.1/src/modules/sdk/interfaces.ts`:

```typescript
/**
 * AI Dawg Module SDK
 * Standardized interface for all AI Dawg execution modules
 */

export interface ModuleMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  healthEndpoint: string;
  executeEndpoint: string;
}

export interface ModuleExecutionRequest {
  action: string;
  parameters: Record<string, any>;
  userId?: string;
  requestId: string;
  timeout?: number;
}

export interface ModuleExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  timestamp: string;
  requestId: string;
}

export interface ModuleHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastCheck: string;
  metrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    activeRequests?: number;
    errorRate?: number;
  };
  issues?: string[];
}

export abstract class BaseModule {
  abstract metadata: ModuleMetadata;

  abstract initialize(): Promise<void>;
  abstract execute(request: ModuleExecutionRequest): Promise<ModuleExecutionResult>;
  abstract getHealth(): Promise<ModuleHealthStatus>;
  abstract shutdown(): Promise<void>;
}
```

### **Task 3: Create Module Registry API**

Create `/Users/benkennon/ai-dawg-v0.1/src/backend/routes/modules.routes.ts`:

```typescript
import { Router } from 'express';
import { ModuleRegistry } from '../services/module-registry.service';

const router = Router();
const registry = ModuleRegistry.getInstance();

// List all available modules
router.get('/modules', (req, res) => {
  const modules = registry.getAllModules();
  res.json({
    count: modules.length,
    modules: modules.map(m => m.metadata)
  });
});

// Get specific module info
router.get('/modules/:name', (req, res) => {
  const module = registry.getModule(req.params.name);
  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }
  res.json(module.metadata);
});

// Execute module command
router.post('/modules/:name/execute', async (req, res) => {
  const module = registry.getModule(req.params.name);
  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }

  try {
    const result = await module.execute({
      action: req.body.action,
      parameters: req.body.parameters || {},
      userId: req.user?.id,
      requestId: req.headers['x-request-id'] as string || Date.now().toString(),
      timeout: req.body.timeout || 30000
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      requestId: req.headers['x-request-id']
    });
  }
});

// Get module health
router.get('/modules/:name/health', async (req, res) => {
  const module = registry.getModule(req.params.name);
  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }

  const health = await module.getHealth();
  res.json(health);
});

export default router;
```

### **Task 4: Create Module Registry Service**

Create `/Users/benkennon/ai-dawg-v0.1/src/backend/services/module-registry.service.ts`:

```typescript
import { BaseModule, ModuleMetadata } from '../../modules/sdk/interfaces';
import { logger } from '../utils/logger';

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<string, BaseModule> = new Map();

  private constructor() {}

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  async registerModule(module: BaseModule): Promise<void> {
    try {
      await module.initialize();
      this.modules.set(module.metadata.name, module);
      logger.info(`Module registered: ${module.metadata.name}`);
    } catch (error: any) {
      logger.error(`Failed to register module ${module.metadata.name}:`, error);
      throw error;
    }
  }

  getModule(name: string): BaseModule | undefined {
    return this.modules.get(name);
  }

  getAllModules(): BaseModule[] {
    return Array.from(this.modules.values());
  }

  async shutdown(): Promise<void> {
    for (const [name, module] of this.modules) {
      try {
        await module.shutdown();
        logger.info(`Module shutdown: ${name}`);
      } catch (error: any) {
        logger.error(`Error shutting down module ${name}:`, error);
      }
    }
    this.modules.clear();
  }
}
```

### **Task 5: Refactor AI Brain as Module**

Create `/Users/benkennon/ai-dawg-v0.1/src/modules/ai-brain/ai-brain.module.ts`:

```typescript
import { BaseModule, ModuleMetadata, ModuleExecutionRequest, ModuleExecutionResult, ModuleHealthStatus } from '../sdk/interfaces';
import axios from 'axios';

export class AIBrainModule extends BaseModule {
  metadata: ModuleMetadata = {
    name: 'ai-brain',
    version: '1.0.0',
    description: 'GPT-4o powered AI assistant for DAW control',
    capabilities: ['chat', 'voice-chat', 'music-generation', 'audio-analysis'],
    healthEndpoint: 'http://localhost:8002/health',
    executeEndpoint: 'http://localhost:8002/api/chat'
  };

  private brainUrl = process.env.AI_BRAIN_URL || 'http://localhost:8002';
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      const response = await axios.get(`${this.brainUrl}/health`);
      if (response.status === 200) {
        this.initialized = true;
      }
    } catch (error) {
      throw new Error('AI Brain service is not available');
    }
  }

  async execute(request: ModuleExecutionRequest): Promise<ModuleExecutionResult> {
    const startTime = Date.now();

    try {
      let response;

      switch (request.action) {
        case 'chat':
          response = await axios.post(`${this.brainUrl}/api/chat`, request.parameters);
          break;
        case 'voice-chat':
          response = await axios.post(`${this.brainUrl}/api/voice-chat`, request.parameters);
          break;
        default:
          throw new Error(`Unknown action: ${request.action}`);
      }

      return {
        success: true,
        data: response.data,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        requestId: request.requestId
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        requestId: request.requestId
      };
    }
  }

  async getHealth(): Promise<ModuleHealthStatus> {
    try {
      const response = await axios.get(`${this.brainUrl}/health`);
      return {
        status: 'healthy',
        uptime: process.uptime() * 1000,
        lastCheck: new Date().toISOString(),
        metrics: response.data.metrics
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        uptime: 0,
        lastCheck: new Date().toISOString(),
        issues: ['AI Brain service unreachable']
      };
    }
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }
}
```

### **Task 6: Update Server.ts to Use Module System**

Edit `/Users/benkennon/ai-dawg-v0.1/src/backend/server.ts`:

Add after existing imports:
```typescript
import moduleRoutes from './routes/modules.routes';
import { ModuleRegistry } from './services/module-registry.service';
import { AIBrainModule } from '../modules/ai-brain/ai-brain.module';
```

Add before `app.listen()`:
```typescript
// Initialize module registry
const moduleRegistry = ModuleRegistry.getInstance();

// Register modules
await moduleRegistry.registerModule(new AIBrainModule());

// Mount module routes
app.use('/api/v1', moduleRoutes);

// Add to shutdown handler
process.on('SIGTERM', async () => {
  await moduleRegistry.shutdown();
  process.exit(0);
});
```

### **Task 7: Test Module System**

```bash
# Restart the backend
cd /Users/benkennon/ai-dawg-v0.1
npm run dev:server

# Test module registry
curl http://localhost:3001/api/v1/modules
curl http://localhost:3001/api/v1/modules/ai-brain
curl http://localhost:3001/api/v1/modules/ai-brain/health

# Test module execution
curl -X POST http://localhost:3001/api/v1/modules/ai-brain/execute \
  -H "Content-Type: application/json" \
  -d '{
    "action": "chat",
    "parameters": {
      "message": "Test message"
    }
  }'
```

---

## ✅ DELIVERABLES

1. ✅ Jarvis controller extracted from AI Dawg
2. ✅ Module SDK interfaces created
3. ✅ Module Registry service implemented
4. ✅ Module routes API created
5. ✅ AI Brain converted to module
6. ✅ Backend updated to use module system
7. ✅ Tests passing

---

## 🔗 COORDINATION

- **Merge Conflicts:** Medium (editing server.ts)
- **Dependencies:** Instance 1 (but can work in parallel)
- **Sync Points:**
  - After Task 7: Share module API endpoints with Instance 1

---

## 📊 PROGRESS TRACKING

Update `/Users/benkennon/Jarvis/.claude/rearch-prompts/PROGRESS.md`:

```markdown
## Instance 2 Progress
- [ ] Task 1: Jarvis extracted
- [ ] Task 2: Module SDK created
- [ ] Task 3: Module routes created
- [ ] Task 4: Registry service created
- [ ] Task 5: AI Brain as module
- [ ] Task 6: Server updated
- [ ] Task 7: Tests passing
```

---

**START NOW! 🚀**
