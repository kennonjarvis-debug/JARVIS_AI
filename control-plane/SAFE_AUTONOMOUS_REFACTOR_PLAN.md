# Safe Autonomous Jarvis V2 - Incremental Refactor Plan

**Strategy:** Build NEW autonomous features ALONGSIDE existing system
**Timeline:** 2-3 weeks (realistic, safe, reversible)
**Risk Level:** LOW (existing system stays working)

---

## 🎯 Core Principles

1. ✅ **Build alongside, not replace** - New features in `/src/autonomous/`
2. ✅ **Feature flags** - Gradual rollout, easy rollback
3. ✅ **No conflicts** - Each Claude instance works on separate files
4. ✅ **Preserve Enhanced Hybrid** - Keep cost monitoring, smart routing
5. ✅ **Test before integration** - Each component standalone first
6. ✅ **Rollback ready** - Can disable features instantly

---

## 📁 New Directory Structure (No Breaking Changes)

```
/Users/benkennon/Jarvis/src/
├── core/                          ← EXISTING (don't touch)
│   ├── gateway.ts                 ← Keep working
│   ├── module-router.ts           ← Keep working
│   ├── smart-ai-router.ts         ← Keep working (Enhanced Hybrid)
│   └── cost-monitoring-api.ts     ← Keep working
│
├── autonomous/                    ← NEW (build here)
│   ├── adaptive/
│   │   ├── adaptive-engine-v2.ts  ← Claude A builds
│   │   ├── learning-store.ts
│   │   └── preference-analyzer.ts
│   │
│   ├── proactive/
│   │   ├── proactive-agent.ts     ← Claude B builds
│   │   ├── context-monitor.ts
│   │   ├── notification-scheduler.ts
│   │   └── anticipation-engine.ts
│   │
│   ├── domains/                   ← NEW domain layer
│   │   ├── registry.ts            ← Claude C builds
│   │   ├── base-domain.ts
│   │   └── adapters/
│   │       ├── music-adapter.ts   ← Wraps existing modules
│   │       ├── marketing-adapter.ts
│   │       └── engagement-adapter.ts
│   │
│   ├── intelligence/
│   │   ├── insight-engine.ts      ← Claude D builds
│   │   ├── pattern-detector.ts
│   │   └── goal-tracker.ts
│   │
│   └── integration/
│       ├── feature-flags.ts       ← Claude E builds
│       ├── autonomous-api.ts
│       └── health-monitor.ts
│
└── integrations/                  ← EXISTING (don't touch)
    ├── claude/
    └── chatgpt/
```

---

## 🔧 Feature Flag System (Build First)

This enables safe gradual rollout:

```typescript
// src/autonomous/integration/feature-flags.ts
export const AUTONOMOUS_FEATURES = {
  ADAPTIVE_ENGINE_V2: false,      // Toggle on when ready
  PROACTIVE_AGENT: false,         // Toggle on when ready
  DOMAIN_ROUTING: false,          // Toggle on when ready
  INSIGHT_ENGINE: false,          // Toggle on when ready
  AUTONOMOUS_NOTIFICATIONS: false // Toggle on when ready
};

export function isFeatureEnabled(feature: keyof typeof AUTONOMOUS_FEATURES): boolean {
  return AUTONOMOUS_FEATURES[feature] ?? false;
}
```

---

## 👥 Parallel Claude Instance Plan

**Key:** Each instance works on **SEPARATE files** - NO conflicts!

### Dependencies:
```
Claude E (Foundation) → Must finish first (2 hours)
    ↓
Claude A, B, C, D → Run in parallel (6-8 hours each)
    ↓
Integration & Testing (Claude E returns) → Final 4-6 hours
```

---

## 🤖 CLAUDE E - Foundation & Integration (START HERE)

**Duration:** 2-3 hours
**Files:** All in `/src/autonomous/integration/`
**Priority:** CRITICAL - Must finish before others start

### Prompt:

```
You are building the FOUNDATION for Jarvis autonomous features.

CONTEXT:
- Working directory: /Users/benkennon/Jarvis
- Current system is WORKING and must stay working
- Build in /src/autonomous/ (new directory)
- Do NOT modify any files in /src/core/

TASK 1: Feature Flag System

Create /src/autonomous/integration/feature-flags.ts:

export interface FeatureFlags {
  ADAPTIVE_ENGINE_V2: boolean;
  PROACTIVE_AGENT: boolean;
  DOMAIN_ROUTING: boolean;
  INSIGHT_ENGINE: boolean;
  AUTONOMOUS_NOTIFICATIONS: boolean;
}

export const AUTONOMOUS_FEATURES: FeatureFlags = {
  ADAPTIVE_ENGINE_V2: false,
  PROACTIVE_AGENT: false,
  DOMAIN_ROUTING: false,
  INSIGHT_ENGINE: false,
  AUTONOMOUS_NOTIFICATIONS: false
};

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const override = process.env[`FEATURE_${feature}`];
  if (override !== undefined) return override === 'true';
  return AUTONOMOUS_FEATURES[feature];
}

export function enableFeature(feature: keyof FeatureFlags): void {
  AUTONOMOUS_FEATURES[feature] = true;
}

export function disableFeature(feature: keyof FeatureFlags): void {
  AUTONOMOUS_FEATURES[feature] = false;
}

TASK 2: Autonomous API Router

Create /src/autonomous/integration/autonomous-api.ts:

import { Router } from 'express';
import { isFeatureEnabled } from './feature-flags.js';

export const autonomousRouter = Router();

// Health check for autonomous features
autonomousRouter.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    features: {
      adaptiveV2: isFeatureEnabled('ADAPTIVE_ENGINE_V2'),
      proactive: isFeatureEnabled('PROACTIVE_AGENT'),
      domains: isFeatureEnabled('DOMAIN_ROUTING'),
      insights: isFeatureEnabled('INSIGHT_ENGINE'),
      notifications: isFeatureEnabled('AUTONOMOUS_NOTIFICATIONS')
    },
    timestamp: new Date().toISOString()
  });
});

// Feature toggle endpoint (admin only)
autonomousRouter.post('/features/:feature/toggle', authenticate, (req, res) => {
  const { feature } = req.params;
  const { enabled } = req.body;

  // Toggle feature flag
  // Return new state
});

export default autonomousRouter;

TASK 3: Integration Point

Create /src/autonomous/integration/mount.ts:

import { Express } from 'express';
import autonomousRouter from './autonomous-api.js';
import { logger } from '../../utils/logger.js';

export function mountAutonomousFeatures(app: Express): void {
  app.use('/api/autonomous', autonomousRouter);
  logger.info('✅ Autonomous features mounted at /api/autonomous');
  logger.info('All features disabled by default - use feature flags to enable');
}

TASK 4: Add to Gateway

Modify ONLY this section in /src/core/gateway.ts:

// ADD after existing integrations:
import { mountAutonomousFeatures } from '../autonomous/integration/mount.js';

// ADD after ChatGPT integration:
mountAutonomousFeatures(app);

DELIVERABLES:
1. /src/autonomous/integration/feature-flags.ts
2. /src/autonomous/integration/autonomous-api.ts
3. /src/autonomous/integration/mount.ts
4. Updated gateway.ts (only add import + 1 line)
5. Test: curl http://localhost:4000/api/autonomous/health

SUCCESS CRITERIA:
- Existing system still works
- New /api/autonomous/health endpoint returns 200
- All features show as disabled
- No TypeScript errors
```

**WAIT FOR CLAUDE E TO FINISH BEFORE STARTING A, B, C, D**

---

## 🧠 CLAUDE A - Adaptive Engine V2 (Isolated)

**Duration:** 6-8 hours
**Files:** All in `/src/autonomous/adaptive/`
**Dependencies:** Claude E finished

### Prompt:

```
You are building Adaptive Engine V2 for Jarvis autonomous intelligence.

CONTEXT:
- Working directory: /Users/benkennon/Jarvis
- Build in /src/autonomous/adaptive/ (new directory)
- Do NOT modify existing /src/jarvis-core/ files
- Feature is disabled by default (feature flag)

TASK 1: Learning Data Store

Create /src/autonomous/adaptive/learning-store.ts:

import Redis from 'ioredis';

export interface UserPreference {
  userId: string;
  feature: string;
  score: number;
  interactions: number;
  lastUpdated: string;
}

export interface InteractionEvent {
  userId: string;
  feature: string;
  action: 'accepted' | 'dismissed' | 'modified' | 'ignored';
  context: {
    timeOfDay: number;
    dayOfWeek: number;
    userActivity: string;
  };
  sentiment?: number;
  latency?: number;
  timestamp: string;
}

export class LearningStore {
  private redis: Redis;

  async recordInteraction(event: InteractionEvent): Promise<void> {
    // Store in Redis with TTL
    // Update preference scores
  }

  async getUserPreferences(userId: string): Promise<UserPreference[]> {
    // Retrieve from Redis
  }

  async getFeatureEffectiveness(feature: string): Promise<number> {
    // Calculate acceptance rate
  }
}

TASK 2: Preference Analyzer

Create /src/autonomous/adaptive/preference-analyzer.ts:

export interface PreferenceAnalysis {
  userId: string;
  preferredTimes: number[]; // Hours of day
  preferredFeatures: string[];
  dismissedFeatures: string[];
  optimalNotificationTime: number;
  learningConfidence: number;
}

export class PreferenceAnalyzer {
  async analyze(userId: string): Promise<PreferenceAnalysis> {
    // Analyze interaction patterns
    // Detect time preferences
    // Calculate confidence scores
  }

  async getTimingScore(userId: string, hour: number): Promise<number> {
    // Return 0-1 score for notification at this hour
  }

  async shouldSuggest(userId: string, feature: string): Promise<boolean> {
    // Use learned preferences to decide
  }
}

TASK 3: Adaptive Engine V2

Create /src/autonomous/adaptive/adaptive-engine-v2.ts:

import { LearningStore } from './learning-store.js';
import { PreferenceAnalyzer } from './preference-analyzer.js';
import { logger } from '../../utils/logger.js';

export class AdaptiveEngineV2 {
  private learningStore: LearningStore;
  private analyzer: PreferenceAnalyzer;
  private learningRate: number = 0.1;

  constructor() {
    this.learningStore = new LearningStore();
    this.analyzer = new PreferenceAnalyzer();
    logger.info('AdaptiveEngineV2 initialized');
  }

  async recordFeedback(event: InteractionEvent): Promise<void> {
    await this.learningStore.recordInteraction(event);
    this.updatePreferenceScores(event);
  }

  private updatePreferenceScores(event: InteractionEvent): void {
    // Reinforcement learning style update
    const reward = this.calculateReward(event.action);
    // Update scores with learning rate
  }

  private calculateReward(action: string): number {
    const rewards = {
      accepted: 1.0,
      modified: 0.5,
      ignored: -0.2,
      dismissed: -0.5
    };
    return rewards[action] ?? 0;
  }

  async getRecommendations(userId: string): Promise<string[]> {
    const preferences = await this.analyzer.analyze(userId);
    // Return top recommended features
  }

  async shouldNotifyNow(userId: string): Promise<boolean> {
    const hour = new Date().getHours();
    const score = await this.analyzer.getTimingScore(userId, hour);
    return score > 0.7; // Threshold
  }
}

export const adaptiveEngineV2 = new AdaptiveEngineV2();

TASK 4: API Integration

Create /src/autonomous/adaptive/api.ts:

import { Router } from 'express';
import { adaptiveEngineV2 } from './adaptive-engine-v2.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';

export const adaptiveRouter = Router();

// Record user feedback
adaptiveRouter.post('/feedback', async (req, res) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({ error: 'Feature disabled' });
  }

  const event = req.body;
  await adaptiveEngineV2.recordFeedback(event);
  res.json({ success: true });
});

// Get recommendations
adaptiveRouter.get('/recommendations/:userId', async (req, res) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({ error: 'Feature disabled' });
  }

  const recommendations = await adaptiveEngineV2.getRecommendations(req.params.userId);
  res.json({ recommendations });
});

export default adaptiveRouter;

TASK 5: Mount to Autonomous API

Update /src/autonomous/integration/autonomous-api.ts:

import adaptiveRouter from '../adaptive/api.js';
autonomousRouter.use('/adaptive', adaptiveRouter);

DELIVERABLES:
1. Complete /src/autonomous/adaptive/ directory
2. All TypeScript compiles
3. Feature flag integration
4. API endpoints (disabled by default)

TEST (after enabling feature):
curl -X POST http://localhost:4000/api/autonomous/adaptive/feedback \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","feature":"proactive","action":"accepted"}'
```

---

## 🔔 CLAUDE B - Proactive Agent (Isolated)

**Duration:** 6-8 hours
**Files:** All in `/src/autonomous/proactive/`
**Dependencies:** Claude E finished

### Prompt:

```
You are building the Proactive Agent for Jarvis autonomous notifications.

CONTEXT:
- Working directory: /Users/benkennon/Jarvis
- Build in /src/autonomous/proactive/ (new directory)
- Do NOT modify existing files
- Feature is disabled by default

TASK 1: Context Monitor

Create /src/autonomous/proactive/context-monitor.ts:

export interface UserContext {
  userId: string;
  isActive: boolean;
  currentActivity: 'idle' | 'coding' | 'meeting' | 'focus' | 'break';
  lastInteraction: string;
  focusScore: number; // 0-1, higher = more focused
  doNotDisturb: boolean;
}

export class ContextMonitor {
  private contexts = new Map<string, UserContext>();

  updateContext(userId: string, activity: string): void {
    // Update user's current state
  }

  async canInterrupt(userId: string): Promise<boolean> {
    const context = this.contexts.get(userId);
    if (!context) return true;

    if (context.doNotDisturb) return false;
    if (context.currentActivity === 'meeting') return false;
    if (context.focusScore > 0.8) return false; // Deep focus

    return true;
  }

  async getOptimalInterruptTime(userId: string): Promise<Date | null> {
    // Predict next good time to interrupt
    // Based on typical patterns
  }
}

export const contextMonitor = new ContextMonitor();

TASK 2: Anticipation Engine

Create /src/autonomous/proactive/anticipation-engine.ts:

export interface Prediction {
  action: string;
  confidence: number;
  predictedTime: string;
  reasoning: string;
}

export class AnticipationEngine {
  async predictNextAction(userId: string): Promise<Prediction[]> {
    // Analyze historical patterns
    // "User usually deploys at 2pm on Tuesdays"
    // "User checks metrics every morning at 9am"

    // Return top 3 predictions
  }

  async suggestProactiveAction(userId: string): Promise<string | null> {
    const predictions = await this.predictNextAction(userId);
    const topPrediction = predictions[0];

    if (topPrediction.confidence > 0.75) {
      return topPrediction.action;
    }

    return null;
  }
}

export const anticipationEngine = new AnticipationEngine();

TASK 3: Notification Scheduler

Create /src/autonomous/proactive/notification-scheduler.ts:

export interface ProactiveNotification {
  id: string;
  userId: string;
  type: 'suggestion' | 'reminder' | 'alert' | 'insight';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  action?: {
    label: string;
    endpoint: string;
    params: any;
  };
  scheduledFor?: string;
  expiresAt?: string;
}

export class NotificationScheduler {
  private queue: ProactiveNotification[] = [];

  async schedule(notification: ProactiveNotification): Promise<void> {
    // Check if user can be interrupted
    const canInterrupt = await contextMonitor.canInterrupt(notification.userId);

    if (canInterrupt || notification.priority === 'urgent') {
      await this.sendNow(notification);
    } else {
      // Schedule for later
      const optimalTime = await contextMonitor.getOptimalInterruptTime(notification.userId);
      notification.scheduledFor = optimalTime?.toISOString();
      this.queue.push(notification);
    }
  }

  private async sendNow(notification: ProactiveNotification): Promise<void> {
    // Send via WebSocket to dashboard
    // Send to mobile app if connected
    // Log in conversation store
  }

  async processPendingNotifications(): Promise<void> {
    // Run every 5 minutes
    // Check queue for notifications ready to send
  }
}

export const notificationScheduler = new NotificationScheduler();

TASK 4: Proactive Agent

Create /src/autonomous/proactive/proactive-agent.ts:

import { anticipationEngine } from './anticipation-engine.js';
import { notificationScheduler } from './notification-scheduler.js';
import { contextMonitor } from './context-monitor.js';
import { adaptiveEngineV2 } from '../adaptive/adaptive-engine-v2.js';
import { logger } from '../../utils/logger.js';

export class ProactiveAgent {
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('ProactiveAgent started');

    // Run periodic checks
    setInterval(() => this.checkForProactiveActions(), 5 * 60 * 1000); // Every 5 min
  }

  private async checkForProactiveActions(): Promise<void> {
    // Get active users
    const activeUsers = await this.getActiveUsers();

    for (const userId of activeUsers) {
      // Check if adaptive engine recommends action
      const shouldNotify = await adaptiveEngineV2.shouldNotifyNow(userId);
      if (!shouldNotify) continue;

      // Get anticipated actions
      const suggestion = await anticipationEngine.suggestProactiveAction(userId);
      if (!suggestion) continue;

      // Schedule notification
      await notificationScheduler.schedule({
        id: `proactive-${Date.now()}`,
        userId,
        type: 'suggestion',
        priority: 'low',
        title: 'Proactive Suggestion',
        message: suggestion,
      });
    }

    // Process pending notifications
    await notificationScheduler.processPendingNotifications();
  }

  private async getActiveUsers(): Promise<string[]> {
    // Get from WebSocket hub or conversation store
    return [];
  }

  stop(): void {
    this.isRunning = false;
    logger.info('ProactiveAgent stopped');
  }
}

export const proactiveAgent = new ProactiveAgent();

TASK 5: API Integration

Create /src/autonomous/proactive/api.ts:

import { Router } from 'express';
import { proactiveAgent } from './proactive-agent.js';
import { notificationScheduler } from './notification-scheduler.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';

export const proactiveRouter = Router();

// Send manual notification
proactiveRouter.post('/notify', async (req, res) => {
  if (!isFeatureEnabled('PROACTIVE_AGENT')) {
    return res.status(503).json({ error: 'Feature disabled' });
  }

  await notificationScheduler.schedule(req.body);
  res.json({ success: true });
});

// Get suggestions for user
proactiveRouter.get('/suggestions/:userId', async (req, res) => {
  if (!isFeatureEnabled('PROACTIVE_AGENT')) {
    return res.status(503).json({ error: 'Feature disabled' });
  }

  const predictions = await anticipationEngine.predictNextAction(req.params.userId);
  res.json({ suggestions: predictions });
});

// Update user context
proactiveRouter.post('/context/:userId', async (req, res) => {
  const { activity } = req.body;
  contextMonitor.updateContext(req.params.userId, activity);
  res.json({ success: true });
});

export default proactiveRouter;

TASK 6: Mount to Autonomous API

Update /src/autonomous/integration/autonomous-api.ts:

import proactiveRouter from '../proactive/api.js';
autonomousRouter.use('/proactive', proactiveRouter);

DELIVERABLES:
1. Complete /src/autonomous/proactive/ directory
2. Integration with adaptive engine
3. Feature flag integration
4. API endpoints

TEST:
curl http://localhost:4000/api/autonomous/proactive/suggestions/test-user
```

---

## 🎨 CLAUDE C - Domain Layer (Non-Breaking Adapters)

**Duration:** 6-8 hours
**Files:** All in `/src/autonomous/domains/`
**Dependencies:** Claude E finished

### Prompt:

```
You are building the Domain Layer for Jarvis - ADAPTERS ONLY (not replacements).

CONTEXT:
- Working directory: /Users/benkennon/Jarvis
- Build in /src/autonomous/domains/ (new directory)
- Do NOT modify existing /src/jarvis-core/modules/
- Build adapters that WRAP existing modules
- Feature is disabled by default

TASK 1: Base Domain Interface

Create /src/autonomous/domains/base-domain.ts:

export interface DomainCommand {
  action: string;
  params: Record<string, any>;
  userId?: string;
  context?: Record<string, any>;
}

export interface DomainResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration: number;
    model?: string;
    cost?: number;
  };
}

export interface BaseDomain {
  name: string;
  version: string;
  capabilities: string[];

  execute(command: DomainCommand): Promise<DomainResponse>;
  health(): Promise<{ status: string; details: any }>;
}

TASK 2: Domain Registry

Create /src/autonomous/domains/registry.ts:

import { BaseDomain } from './base-domain.js';
import { logger } from '../../utils/logger.js';

export class DomainRegistry {
  private domains = new Map<string, BaseDomain>();

  register(domain: BaseDomain): void {
    this.domains.set(domain.name, domain);
    logger.info(`Domain registered: ${domain.name} v${domain.version}`);
  }

  get(name: string): BaseDomain | undefined {
    return this.domains.get(name);
  }

  getAll(): BaseDomain[] {
    return Array.from(this.domains.values());
  }

  async execute(domainName: string, command: DomainCommand): Promise<DomainResponse> {
    const domain = this.get(domainName);
    if (!domain) {
      return {
        success: false,
        error: `Domain not found: ${domainName}`
      };
    }

    return await domain.execute(command);
  }

  async healthCheck(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};

    for (const [name, domain] of this.domains) {
      health[name] = await domain.health();
    }

    return health;
  }
}

export const domainRegistry = new DomainRegistry();

TASK 3: Music Domain Adapter

Create /src/autonomous/domains/adapters/music-adapter.ts:

import { BaseDomain, DomainCommand, DomainResponse } from '../base-domain.js';
import { moduleRouter } from '../../../core/module-router.js';

export class MusicDomainAdapter implements BaseDomain {
  name = 'music';
  version = '2.0.0';
  capabilities = [
    'generate-music',
    'analyze-vocal',
    'validate-quality',
    'get-usage-stats',
    'get-model-health'
  ];

  async execute(command: DomainCommand): Promise<DomainResponse> {
    const startTime = Date.now();

    try {
      // Route to existing music module via module-router
      const result = await moduleRouter.execute({
        module: 'music',
        action: command.action,
        params: command.params
      });

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          duration: Date.now() - startTime,
          // Add cost tracking if available
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime
        }
      };
    }
  }

  async health(): Promise<{ status: string; details: any }> {
    try {
      const result = await moduleRouter.execute({
        module: 'music',
        action: 'health',
        params: {}
      });

      return {
        status: result.success ? 'healthy' : 'degraded',
        details: result.data
      };
    } catch (error: any) {
      return {
        status: 'down',
        details: { error: error.message }
      };
    }
  }
}

TASK 4: Marketing Domain Adapter

Create /src/autonomous/domains/adapters/marketing-adapter.ts:

import { BaseDomain, DomainCommand, DomainResponse } from '../base-domain.js';
import { moduleRouter } from '../../../core/module-router.js';

export class MarketingDomainAdapter implements BaseDomain {
  name = 'marketing';
  version = '2.0.0';
  capabilities = [
    'get-metrics',
    'get-revenue',
    'run-campaign',
    'analyze-growth',
    'forecast-revenue'
  ];

  async execute(command: DomainCommand): Promise<DomainResponse> {
    const startTime = Date.now();

    try {
      const result = await moduleRouter.execute({
        module: 'marketing',
        action: command.action,
        params: command.params
      });

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          duration: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime
        }
      };
    }
  }

  async health(): Promise<{ status: string; details: any }> {
    try {
      const result = await moduleRouter.execute({
        module: 'marketing',
        action: 'health',
        params: {}
      });

      return {
        status: result.success ? 'healthy' : 'degraded',
        details: result.data
      };
    } catch (error: any) {
      return {
        status: 'down',
        details: { error: error.message }
      };
    }
  }
}

TASK 5: Auto-Registration

Create /src/autonomous/domains/auto-register.ts:

import { domainRegistry } from './registry.js';
import { MusicDomainAdapter } from './adapters/music-adapter.js';
import { MarketingDomainAdapter } from './adapters/marketing-adapter.js';
import { logger } from '../../utils/logger.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';

export function registerDomains(): void {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    logger.info('Domain routing disabled by feature flag');
    return;
  }

  // Register adapters
  domainRegistry.register(new MusicDomainAdapter());
  domainRegistry.register(new MarketingDomainAdapter());
  // Add more as needed

  logger.info(`Registered ${domainRegistry.getAll().length} domains`);
}

TASK 6: API Integration

Create /src/autonomous/domains/api.ts:

import { Router } from 'express';
import { domainRegistry } from './registry.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';

export const domainsRouter = Router();

// Execute domain command
domainsRouter.post('/:domain/execute', async (req, res) => {
  if (!isFeatureEnabled('DOMAIN_ROUTING')) {
    return res.status(503).json({ error: 'Feature disabled' });
  }

  const result = await domainRegistry.execute(req.params.domain, req.body);
  res.json(result);
});

// Get domain capabilities
domainsRouter.get('/:domain/capabilities', async (req, res) => {
  const domain = domainRegistry.get(req.params.domain);
  if (!domain) {
    return res.status(404).json({ error: 'Domain not found' });
  }

  res.json({ capabilities: domain.capabilities });
});

// Domain health
domainsRouter.get('/:domain/health', async (req, res) => {
  const domain = domainRegistry.get(req.params.domain);
  if (!domain) {
    return res.status(404).json({ error: 'Domain not found' });
  }

  const health = await domain.health();
  res.json(health);
});

// All domains health
domainsRouter.get('/health', async (req, res) => {
  const health = await domainRegistry.healthCheck();
  res.json(health);
});

export default domainsRouter;

TASK 7: Mount to Autonomous API

Update /src/autonomous/integration/autonomous-api.ts:

import domainsRouter from '../domains/api.js';
import { registerDomains } from '../domains/auto-register.js';

autonomousRouter.use('/domains', domainsRouter);

// In mountAutonomousFeatures:
registerDomains();

DELIVERABLES:
1. Complete /src/autonomous/domains/ directory
2. Adapters wrap existing modules (no breaking changes)
3. Feature flag integration
4. API endpoints

TEST:
curl http://localhost:4000/api/autonomous/domains/health
```

---

## 📊 CLAUDE D - Intelligence & Insights (Isolated)

**Duration:** 6-8 hours
**Files:** All in `/src/autonomous/intelligence/`
**Dependencies:** Claude E finished

### Prompt:

```
You are building the Intelligence Layer for Jarvis analytics and insights.

CONTEXT:
- Working directory: /Users/benkennon/Jarvis
- Build in /src/autonomous/intelligence/ (new directory)
- Do NOT modify existing files
- Feature is disabled by default

TASK 1: Pattern Detector

Create /src/autonomous/intelligence/pattern-detector.ts:

export interface Pattern {
  type: 'temporal' | 'behavioral' | 'anomaly' | 'trend';
  description: string;
  confidence: number;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export class PatternDetector {
  async detectPatterns(userId: string, timeRange: string): Promise<Pattern[]> {
    // Analyze interaction history
    // Detect:
    // - Usage patterns (time of day, frequency)
    // - Feature preferences
    // - Anomalies (unusual behavior)
    // - Trends (increasing/decreasing usage)

    return [];
  }

  async findAnomalies(data: any[]): Promise<Pattern[]> {
    // Statistical anomaly detection
    // Return unusual patterns
  }
}

export const patternDetector = new PatternDetector();

TASK 2: Goal Tracker

Create /src/autonomous/intelligence/goal-tracker.ts:

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate?: string;
  progress: number; // 0-100
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

export class GoalTracker {
  async createGoal(goal: Omit<Goal, 'id'>): Promise<Goal> {
    // Create and store goal
  }

  async updateProgress(goalId: string, progress: number): Promise<void> {
    // Update goal progress
    // Check if milestones achieved
  }

  async getActiveGoals(userId: string): Promise<Goal[]> {
    // Return active goals for user
  }

  async checkDeadlines(): Promise<Goal[]> {
    // Find goals approaching deadline
    // Return for proactive reminders
  }
}

export const goalTracker = new GoalTracker();

TASK 3: Insight Engine

Create /src/autonomous/intelligence/insight-engine.ts:

import { patternDetector } from './pattern-detector.js';
import { goalTracker } from './goal-tracker.js';
import { adaptiveEngineV2 } from '../adaptive/adaptive-engine-v2.js';

export interface Insight {
  id: string;
  userId: string;
  type: 'pattern' | 'goal' | 'recommendation' | 'alert';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionable: boolean;
  action?: {
    label: string;
    endpoint: string;
  };
  createdAt: string;
}

export class InsightEngine {
  async generateInsights(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // 1. Pattern-based insights
    const patterns = await patternDetector.detectPatterns(userId, '7d');
    for (const pattern of patterns) {
      if (pattern.confidence > 0.7 && pattern.impact !== 'low') {
        insights.push(this.patternToInsight(userId, pattern));
      }
    }

    // 2. Goal-based insights
    const goals = await goalTracker.getActiveGoals(userId);
    for (const goal of goals) {
      if (this.isGoalAtRisk(goal)) {
        insights.push(this.goalToInsight(userId, goal));
      }
    }

    // 3. Adaptive recommendations
    const recommendations = await adaptiveEngineV2.getRecommendations(userId);
    for (const rec of recommendations) {
      insights.push(this.recommendationToInsight(userId, rec));
    }

    // Sort by priority
    return insights.sort((a, b) =>
      this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority)
    );
  }

  private patternToInsight(userId: string, pattern: Pattern): Insight {
    return {
      id: `pattern-${Date.now()}`,
      userId,
      type: 'pattern',
      priority: pattern.impact === 'high' ? 'high' : 'medium',
      title: `Pattern Detected: ${pattern.type}`,
      description: pattern.description,
      actionable: !!pattern.recommendation,
      createdAt: new Date().toISOString()
    };
  }

  private goalToInsight(userId: string, goal: Goal): Insight {
    return {
      id: `goal-${goal.id}`,
      userId,
      type: 'goal',
      priority: 'medium',
      title: `Goal Update: ${goal.title}`,
      description: `Progress: ${goal.progress}%`,
      actionable: true,
      createdAt: new Date().toISOString()
    };
  }

  private recommendationToInsight(userId: string, rec: string): Insight {
    return {
      id: `rec-${Date.now()}`,
      userId,
      type: 'recommendation',
      priority: 'low',
      title: 'Recommendation',
      description: rec,
      actionable: false,
      createdAt: new Date().toISOString()
    };
  }

  private isGoalAtRisk(goal: Goal): boolean {
    if (!goal.targetDate) return false;

    const daysUntilDeadline = Math.floor(
      (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilDeadline <= 7 && goal.progress < 80;
  }

  private getPriorityValue(priority: string): number {
    return { low: 1, medium: 2, high: 3 }[priority] ?? 0;
  }
}

export const insightEngine = new InsightEngine();

TASK 4: API Integration

Create /src/autonomous/intelligence/api.ts:

import { Router } from 'express';
import { insightEngine } from './insight-engine.js';
import { goalTracker } from './goal-tracker.js';
import { patternDetector } from './pattern-detector.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';

export const intelligenceRouter = Router();

// Get insights for user
intelligenceRouter.get('/insights/:userId', async (req, res) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({ error: 'Feature disabled' });
  }

  const insights = await insightEngine.generateInsights(req.params.userId);
  res.json({ insights });
});

// Goals CRUD
intelligenceRouter.post('/goals', async (req, res) => {
  const goal = await goalTracker.createGoal(req.body);
  res.json({ goal });
});

intelligenceRouter.get('/goals/:userId', async (req, res) => {
  const goals = await goalTracker.getActiveGoals(req.params.userId);
  res.json({ goals });
});

intelligenceRouter.patch('/goals/:id/progress', async (req, res) => {
  await goalTracker.updateProgress(req.params.id, req.body.progress);
  res.json({ success: true });
});

// Pattern detection
intelligenceRouter.get('/patterns/:userId', async (req, res) => {
  const timeRange = req.query.timeRange as string || '7d';
  const patterns = await patternDetector.detectPatterns(req.params.userId, timeRange);
  res.json({ patterns });
});

export default intelligenceRouter;

TASK 5: Mount to Autonomous API

Update /src/autonomous/integration/autonomous-api.ts:

import intelligenceRouter from '../intelligence/api.js';
autonomousRouter.use('/intelligence', intelligenceRouter);

DELIVERABLES:
1. Complete /src/autonomous/intelligence/ directory
2. Integration with adaptive engine
3. Feature flag integration
4. API endpoints

TEST:
curl http://localhost:4000/api/autonomous/intelligence/insights/test-user
```

---

## 🔗 Integration & Testing Phase

**After A, B, C, D finish, Claude E returns for integration**

### CLAUDE E - Final Integration Prompt:

```
You are completing the Jarvis autonomous features integration.

ALL OTHER INSTANCES HAVE FINISHED. Your tasks:

TASK 1: Verify All Components

Run these checks:
1. TypeScript compiles: npm run build
2. All endpoints respond: curl tests for each API
3. Feature flags work: toggle on/off tests
4. No conflicts with existing system

TASK 2: Create Integration Tests

Create /src/autonomous/tests/integration.test.ts:

import { describe, it, expect } from '@jest/globals';
// Test each autonomous component
// Test feature flag toggles
// Test adapter wrapping of existing modules

TASK 3: Create Enablement Script

Create /scripts/enable-autonomous-features.sh:

#!/bin/bash
# Safely enable autonomous features one at a time
# With rollback capability

TASK 4: Documentation

Create /docs/AUTONOMOUS_FEATURES.md:
- How to enable each feature
- API documentation
- Rollback procedures
- Monitoring dashboards

TASK 5: Dashboard Integration

Update dashboard to show:
- Autonomous feature status
- Adaptive learning stats
- Proactive notifications panel
- Insights feed

DELIVERABLES:
1. Full integration verified
2. Tests passing
3. Documentation complete
4. Dashboard updated
5. Rollback script ready
```

---

## 🚀 Execution Timeline

### Week 1
- **Day 1-2:** Claude E builds foundation (6 hours)
- **Day 2-4:** Claude A, B, C, D work in parallel (24 hours total, ~3 days)
- **Day 5:** Integration issues resolved

### Week 2
- **Day 6-7:** Claude E final integration (8 hours)
- **Day 8-9:** Testing with features disabled
- **Day 10:** Enable features one at a time

### Week 3
- **Day 11-15:** Monitor in production
- **Day 16-17:** Optimize based on metrics
- **Day 18-21:** Documentation and training

---

## ✅ Success Criteria

**Each feature must:**
1. ✅ Compile with no TypeScript errors
2. ✅ Work when enabled (feature flag = true)
3. ✅ Not break anything when disabled (feature flag = false)
4. ✅ Have API endpoints that return 503 when disabled
5. ✅ Have rollback script ready
6. ✅ Have monitoring/logging
7. ✅ Preserve Enhanced Hybrid cost monitoring

---

## 🎯 Rollback Plan

If anything breaks:

```bash
# Instant rollback - disable all features
curl -X POST http://localhost:4000/api/autonomous/features/disable-all

# Or via env:
export FEATURE_ADAPTIVE_ENGINE_V2=false
export FEATURE_PROACTIVE_AGENT=false
export FEATURE_DOMAIN_ROUTING=false
export FEATURE_INSIGHT_ENGINE=false

# Restart
./launch-hybrid-services.sh restart
```

System returns to working state immediately.

---

This plan gives you autonomous features while keeping your system safe!

Want me to generate the actual prompts ready to copy-paste into 5 Claude instances?
