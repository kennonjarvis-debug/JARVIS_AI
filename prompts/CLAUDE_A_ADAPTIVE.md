# CLAUDE A - Adaptive Engine V2

**Wait for:** Claude E to complete foundation
**Duration:** 6-8 hours
**Working Directory:** `/Users/benkennon/Jarvis`

---

## 🎯 Your Mission

Build Adaptive Engine V2 - learning system that adapts to user preferences and behavior patterns.

**Build in:** `/src/autonomous/adaptive/` (isolated, no conflicts)

---

## ✅ TASK 1: Learning Data Store

Create `/src/autonomous/adaptive/learning-store.ts`:

```typescript
import Redis from 'ioredis';
import { logger } from '../../utils/logger.js';

export interface UserPreference {
  userId: string;
  feature: string;
  score: number; // 0-1, higher = more preferred
  interactions: number;
  acceptanceRate: number;
  lastUpdated: string;
}

export interface InteractionEvent {
  userId: string;
  feature: string;
  action: 'accepted' | 'dismissed' | 'modified' | 'ignored';
  context: {
    timeOfDay: number; // 0-23
    dayOfWeek: number; // 0-6
    userActivity: string;
  };
  sentiment?: number; // 0-1
  latency?: number; // ms
  timestamp: string;
}

export class LearningStore {
  private redis: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    logger.info('LearningStore initialized');
  }

  /**
   * Record user interaction for learning
   */
  async recordInteraction(event: InteractionEvent): Promise<void> {
    const key = `learning:${event.userId}:${event.feature}`;

    // Store event in time-series
    await this.redis.zadd(
      `${key}:events`,
      Date.now(),
      JSON.stringify(event)
    );

    // Keep last 1000 events per feature
    await this.redis.zremrangebyrank(`${key}:events`, 0, -1001);

    // Update preference score
    await this.updatePreferenceScore(event);
  }

  /**
   * Update preference score based on interaction
   */
  private async updatePreferenceScore(event: InteractionEvent): Promise<void> {
    const key = `learning:${event.userId}:${event.feature}:score`;

    // Get current score
    const currentData = await this.redis.get(key);
    const current = currentData ? JSON.parse(currentData) : {
      score: 0.5,
      interactions: 0,
      accepted: 0
    };

    // Update based on action
    const rewards = {
      accepted: 1.0,
      modified: 0.5,
      ignored: -0.2,
      dismissed: -0.5
    };

    const reward = rewards[event.action] ?? 0;
    const learningRate = 0.1;

    // Calculate new score
    current.score = Math.max(0, Math.min(1,
      current.score + (reward * learningRate)
    ));

    current.interactions++;
    if (event.action === 'accepted') current.accepted++;

    // Store updated score
    await this.redis.set(key, JSON.stringify(current), 'EX', 60 * 60 * 24 * 90); // 90 day TTL
  }

  /**
   * Get user preferences for a specific feature
   */
  async getUserPreference(userId: string, feature: string): Promise<UserPreference | null> {
    const key = `learning:${userId}:${feature}:score`;
    const data = await this.redis.get(key);

    if (!data) return null;

    const parsed = JSON.parse(data);
    return {
      userId,
      feature,
      score: parsed.score,
      interactions: parsed.interactions,
      acceptanceRate: parsed.interactions > 0 ? parsed.accepted / parsed.interactions : 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get all preferences for a user
   */
  async getAllUserPreferences(userId: string): Promise<UserPreference[]> {
    const pattern = `learning:${userId}:*:score`;
    const keys = await this.redis.keys(pattern);

    const preferences: UserPreference[] = [];

    for (const key of keys) {
      const feature = key.split(':')[2];
      const pref = await this.getUserPreference(userId, feature);
      if (pref) preferences.push(pref);
    }

    return preferences.sort((a, b) => b.score - a.score);
  }

  /**
   * Get feature effectiveness across all users
   */
  async getFeatureEffectiveness(feature: string): Promise<number> {
    const pattern = `learning:*:${feature}:score`;
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) return 0.5;

    let totalScore = 0;
    let count = 0;

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        totalScore += parsed.score;
        count++;
      }
    }

    return count > 0 ? totalScore / count : 0.5;
  }
}

export const learningStore = new LearningStore();
```

---

## ✅ TASK 2: Preference Analyzer

Create `/src/autonomous/adaptive/preference-analyzer.ts`:

```typescript
import { learningStore, InteractionEvent } from './learning-store.js';
import { logger } from '../../utils/logger.js';

export interface PreferenceAnalysis {
  userId: string;
  preferredTimes: number[]; // Hours of day (0-23)
  preferredFeatures: string[];
  dismissedFeatures: string[];
  optimalNotificationTime: number;
  learningConfidence: number; // 0-1
}

export class PreferenceAnalyzer {
  /**
   * Analyze user preferences from interaction history
   */
  async analyze(userId: string): Promise<PreferenceAnalysis> {
    const preferences = await learningStore.getAllUserPreferences(userId);

    // Separate preferred vs dismissed
    const preferredFeatures = preferences
      .filter(p => p.score > 0.6)
      .map(p => p.feature);

    const dismissedFeatures = preferences
      .filter(p => p.score < 0.4)
      .map(p => p.feature);

    // Calculate confidence based on interaction count
    const totalInteractions = preferences.reduce((sum, p) => sum + p.interactions, 0);
    const learningConfidence = Math.min(1, totalInteractions / 100); // Confident after 100 interactions

    // TODO: Analyze time preferences from event timestamps
    const preferredTimes = [9, 10, 11, 14, 15, 16]; // Placeholder

    return {
      userId,
      preferredTimes,
      preferredFeatures,
      dismissedFeatures,
      optimalNotificationTime: 10, // Placeholder: 10 AM
      learningConfidence
    };
  }

  /**
   * Get timing score for notification at specific hour
   */
  async getTimingScore(userId: string, hour: number): Promise<number> {
    const analysis = await this.analyze(userId);

    // If hour is in preferred times, return high score
    if (analysis.preferredTimes.includes(hour)) {
      return 0.8;
    }

    // Outside work hours (8am-6pm), return low score
    if (hour < 8 || hour > 18) {
      return 0.2;
    }

    // Default: moderate score during work hours
    return 0.5;
  }

  /**
   * Should we suggest this feature to this user?
   */
  async shouldSuggest(userId: string, feature: string): Promise<boolean> {
    const preference = await learningStore.getUserPreference(userId, feature);

    // No data yet - try it
    if (!preference) return true;

    // If user has dismissed it consistently, don't suggest
    if (preference.score < 0.3 && preference.interactions > 5) {
      logger.debug(`User ${userId} has dismissed ${feature}, skipping suggestion`);
      return false;
    }

    // If user likes it, suggest
    if (preference.score > 0.6) {
      return true;
    }

    // Give it more chances if we don't have much data
    if (preference.interactions < 3) {
      return true;
    }

    // Default: respect the learned preference
    return preference.score > 0.5;
  }
}

export const preferenceAnalyzer = new PreferenceAnalyzer();
```

---

## ✅ TASK 3: Adaptive Engine V2

Create `/src/autonomous/adaptive/adaptive-engine-v2.ts`:

```typescript
import { learningStore, InteractionEvent } from './learning-store.js';
import { preferenceAnalyzer } from './preference-analyzer.js';
import { logger } from '../../utils/logger.js';

export class AdaptiveEngineV2 {
  private learningRate: number = 0.1;

  constructor() {
    logger.info('AdaptiveEngineV2 initialized');
  }

  /**
   * Record user feedback for learning
   */
  async recordFeedback(event: InteractionEvent): Promise<void> {
    await learningStore.recordInteraction(event);
    logger.debug(`Feedback recorded: ${event.userId} ${event.action} ${event.feature}`);
  }

  /**
   * Get personalized recommendations for user
   */
  async getRecommendations(userId: string): Promise<string[]> {
    const preferences = await learningStore.getAllUserPreferences(userId);

    // Return top features they like
    return preferences
      .filter(p => p.score > 0.6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(p => p.feature);
  }

  /**
   * Should we notify user now based on learned timing preferences?
   */
  async shouldNotifyNow(userId: string): Promise<boolean> {
    const hour = new Date().getHours();
    const score = await preferenceAnalyzer.getTimingScore(userId, hour);

    // Only notify if timing score is good
    return score > 0.7;
  }

  /**
   * Get learning stats for dashboard
   */
  async getStats(userId?: string): Promise<any> {
    if (userId) {
      const preferences = await learningStore.getAllUserPreferences(userId);
      const analysis = await preferenceAnalyzer.analyze(userId);

      return {
        userId,
        totalPreferences: preferences.length,
        learningConfidence: analysis.learningConfidence,
        preferredFeatures: analysis.preferredFeatures,
        dismissedFeatures: analysis.dismissedFeatures
      };
    }

    // Global stats
    return {
      message: 'Global adaptive stats not yet implemented'
    };
  }
}

export const adaptiveEngineV2 = new AdaptiveEngineV2();
```

---

## ✅ TASK 4: API Routes

Create `/src/autonomous/adaptive/api.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { adaptiveEngineV2 } from './adaptive-engine-v2.js';
import { learningStore } from './learning-store.js';
import { preferenceAnalyzer } from './preference-analyzer.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';

export const adaptiveRouter = Router();

/**
 * Record user feedback
 * POST /api/autonomous/adaptive/feedback
 */
adaptiveRouter.post('/feedback', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  try {
    await adaptiveEngineV2.recordFeedback(req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get recommendations for user
 * GET /api/autonomous/adaptive/recommendations/:userId
 */
adaptiveRouter.get('/recommendations/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  try {
    const recommendations = await adaptiveEngineV2.getRecommendations(req.params.userId);
    res.json({
      success: true,
      recommendations
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user preferences
 * GET /api/autonomous/adaptive/preferences/:userId
 */
adaptiveRouter.get('/preferences/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  try {
    const preferences = await learningStore.getAllUserPreferences(req.params.userId);
    const analysis = await preferenceAnalyzer.analyze(req.params.userId);

    res.json({
      success: true,
      preferences,
      analysis
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get adaptive stats
 * GET /api/autonomous/adaptive/stats/:userId?
 */
adaptiveRouter.get('/stats/:userId?', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('ADAPTIVE_ENGINE_V2')) {
    return res.status(503).json({
      success: false,
      error: 'Adaptive Engine V2 is disabled'
    });
  }

  try {
    const stats = await adaptiveEngineV2.getStats(req.params.userId);
    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default adaptiveRouter;
```

---

## ✅ TASK 5: Mount to Autonomous API

Update `/src/autonomous/integration/autonomous-api.ts`:

Add at the top:
```typescript
import adaptiveRouter from '../adaptive/api.js';
```

Add in the router setup:
```typescript
// Mount adaptive engine routes
autonomousRouter.use('/adaptive', adaptiveRouter);
```

---

## ✅ TASK 6: Build and Test

```bash
# Build
npm run build

# Restart services
./launch-hybrid-services.sh restart

# Enable feature
curl -X POST http://localhost:4000/api/autonomous/features/ADAPTIVE_ENGINE_V2/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Test feedback recording
curl -X POST http://localhost:4000/api/autonomous/adaptive/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "feature": "proactive-suggestions",
    "action": "accepted",
    "context": {
      "timeOfDay": 10,
      "dayOfWeek": 1,
      "userActivity": "coding"
    },
    "timestamp": "'$(date -Iseconds)'"
  }'

# Test recommendations
curl http://localhost:4000/api/autonomous/adaptive/recommendations/test-user

# Test preferences
curl http://localhost:4000/api/autonomous/adaptive/preferences/test-user
```

---

## ✅ Deliverables

1. ✅ `/src/autonomous/adaptive/learning-store.ts`
2. ✅ `/src/autonomous/adaptive/preference-analyzer.ts`
3. ✅ `/src/autonomous/adaptive/adaptive-engine-v2.ts`
4. ✅ `/src/autonomous/adaptive/api.ts`
5. ✅ Updated autonomous-api.ts
6. ✅ TypeScript compiles
7. ✅ API endpoints work when enabled

---

## 🚨 When You're Done

Post completion status and wait for integration phase.
