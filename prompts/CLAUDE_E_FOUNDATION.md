# CLAUDE E - Foundation & Integration (START FIRST)

**Priority:** CRITICAL - Must finish before others start
**Duration:** 2-3 hours
**Working Directory:** `/Users/benkennon/Jarvis`

---

## 🎯 Your Mission

Build the FOUNDATION for Jarvis autonomous features with feature flags, so other Claude instances can work safely in parallel.

**Key Rule:** Build in `/src/autonomous/` - Do NOT modify existing `/src/core/` files except for 1 integration line.

---

## ✅ TASK 1: Feature Flag System

Create `/src/autonomous/integration/feature-flags.ts`:

```typescript
/**
 * Feature Flags for Jarvis Autonomous Features
 * All features disabled by default - enable gradually
 */

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
  // Check environment override first
  const envKey = `FEATURE_${feature}`;
  const override = process.env[envKey];
  if (override !== undefined) {
    return override === 'true';
  }

  // Fall back to default config
  return AUTONOMOUS_FEATURES[feature];
}

export function enableFeature(feature: keyof FeatureFlags): void {
  AUTONOMOUS_FEATURES[feature] = true;
}

export function disableFeature(feature: keyof FeatureFlags): void {
  AUTONOMOUS_FEATURES[feature] = false;
}

export function disableAllFeatures(): void {
  Object.keys(AUTONOMOUS_FEATURES).forEach(key => {
    AUTONOMOUS_FEATURES[key as keyof FeatureFlags] = false;
  });
}

export function getFeatureStatus(): Record<string, boolean> {
  const status: Record<string, boolean> = {};
  Object.keys(AUTONOMOUS_FEATURES).forEach(key => {
    status[key] = isFeatureEnabled(key as keyof FeatureFlags);
  });
  return status;
}
```

---

## ✅ TASK 2: Autonomous API Router

Create `/src/autonomous/integration/autonomous-api.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { isFeatureEnabled, getFeatureStatus, enableFeature, disableFeature, disableAllFeatures } from './feature-flags.js';
import { logger } from '../../utils/logger.js';

export const autonomousRouter = Router();

/**
 * Health check for autonomous features
 * GET /api/autonomous/health
 */
autonomousRouter.get('/health', (req: Request, res: Response) => {
  const features = getFeatureStatus();
  const enabledCount = Object.values(features).filter(Boolean).length;

  res.json({
    status: 'operational',
    enabled: enabledCount > 0,
    features,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get feature status
 * GET /api/autonomous/features
 */
autonomousRouter.get('/features', (req: Request, res: Response) => {
  res.json({
    success: true,
    features: getFeatureStatus(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Toggle specific feature (admin only)
 * POST /api/autonomous/features/:feature/toggle
 */
autonomousRouter.post('/features/:feature/toggle', (req: Request, res: Response) => {
  const { feature } = req.params;
  const { enabled } = req.body;

  try {
    if (enabled) {
      enableFeature(feature as any);
      logger.info(`Feature enabled: ${feature}`);
    } else {
      disableFeature(feature as any);
      logger.info(`Feature disabled: ${feature}`);
    }

    res.json({
      success: true,
      feature,
      enabled: isFeatureEnabled(feature as any),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Disable all autonomous features (emergency rollback)
 * POST /api/autonomous/features/disable-all
 */
autonomousRouter.post('/features/disable-all', (req: Request, res: Response) => {
  disableAllFeatures();
  logger.warn('All autonomous features disabled');

  res.json({
    success: true,
    message: 'All autonomous features disabled',
    features: getFeatureStatus(),
    timestamp: new Date().toISOString()
  });
});

export default autonomousRouter;
```

---

## ✅ TASK 3: Integration Point

Create `/src/autonomous/integration/mount.ts`:

```typescript
import { Express } from 'express';
import autonomousRouter from './autonomous-api.js';
import { logger } from '../../utils/logger.js';
import { getFeatureStatus } from './feature-flags.js';

export function mountAutonomousFeatures(app: Express): void {
  // Mount autonomous API
  app.use('/api/autonomous', autonomousRouter);

  const features = getFeatureStatus();
  const enabledCount = Object.values(features).filter(Boolean).length;

  logger.info('✅ Autonomous features mounted at /api/autonomous');
  logger.info(`📊 Enabled features: ${enabledCount}/5`);
  logger.info('All features disabled by default - use feature flags to enable');

  // Log each feature status
  Object.entries(features).forEach(([name, enabled]) => {
    logger.info(`  ${enabled ? '✅' : '⭕'} ${name}`);
  });
}
```

---

## ✅ TASK 4: Add to Gateway (ONLY MODIFICATION TO EXISTING FILES)

In `/src/core/gateway.ts`, add these lines:

**After existing imports (around line 19):**
```typescript
import { mountAutonomousFeatures } from '../autonomous/integration/mount.js';
```

**After ChatGPT integration mount (around line 93):**
```typescript
/**
 * Autonomous Features
 * All autonomous AI features (disabled by default)
 */
mountAutonomousFeatures(app);
```

---

## ✅ TASK 5: Create Directory Structure

Create these empty directories:

```bash
mkdir -p /Users/benkennon/Jarvis/src/autonomous/integration
mkdir -p /Users/benkennon/Jarvis/src/autonomous/adaptive
mkdir -p /Users/benkennon/Jarvis/src/autonomous/proactive
mkdir -p /Users/benkennon/Jarvis/src/autonomous/domains
mkdir -p /Users/benkennon/Jarvis/src/autonomous/intelligence
mkdir -p /Users/benkennon/Jarvis/src/autonomous/tests
```

---

## ✅ TASK 6: Build and Test

```bash
# Build TypeScript
npm run build

# Verify no errors
# Start services if not running
./launch-hybrid-services.sh restart

# Test autonomous API
curl http://localhost:4000/api/autonomous/health

# Should return:
# {
#   "status": "operational",
#   "enabled": false,
#   "features": {
#     "ADAPTIVE_ENGINE_V2": false,
#     "PROACTIVE_AGENT": false,
#     "DOMAIN_ROUTING": false,
#     "INSIGHT_ENGINE": false,
#     "AUTONOMOUS_NOTIFICATIONS": false
#   }
# }

# Test feature toggle
curl -X POST http://localhost:4000/api/autonomous/features/ADAPTIVE_ENGINE_V2/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Test disable all (rollback)
curl -X POST http://localhost:4000/api/autonomous/features/disable-all
```

---

## ✅ Deliverables

1. ✅ `/src/autonomous/integration/feature-flags.ts`
2. ✅ `/src/autonomous/integration/autonomous-api.ts`
3. ✅ `/src/autonomous/integration/mount.ts`
4. ✅ Updated `/src/core/gateway.ts` (2 lines added)
5. ✅ All directories created
6. ✅ TypeScript compiles
7. ✅ `/api/autonomous/health` returns 200

---

## ✅ Success Criteria

- [ ] No TypeScript errors
- [ ] Existing system still works
- [ ] Can access `/api/autonomous/health`
- [ ] All features show as disabled
- [ ] Can toggle features on/off
- [ ] Emergency disable-all works

---

## 🚨 When You're Done

**Post in chat:**
```
CLAUDE E COMPLETE ✅

Foundation ready:
- Feature flags: ✅
- Autonomous API: ✅
- Gateway integration: ✅
- Directory structure: ✅
- Tests passing: ✅

Other instances can now start in parallel!
```

**Then wait for:**
- Claude A (Adaptive)
- Claude B (Proactive)
- Claude C (Domains)
- Claude D (Intelligence)

To finish before final integration.
