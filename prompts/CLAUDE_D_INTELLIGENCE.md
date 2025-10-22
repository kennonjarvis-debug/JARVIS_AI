# CLAUDE D - Intelligence & Insights Engine

**Wait for:** Claude E to complete foundation
**Duration:** 6-8 hours
**Working Directory:** `/Users/benkennon/Jarvis`

---

## 🎯 Your Mission

Build Intelligence Engine - pattern detection, goal tracking, and insight generation from user interactions.

**Build in:** `/src/autonomous/intelligence/` (isolated, no conflicts)

---

## ✅ TASK 1: Pattern Detector

Create `/src/autonomous/intelligence/pattern-detector.ts`:

```typescript
import { learningStore } from '../adaptive/learning-store.js';
import { logger } from '../../utils/logger.js';

export interface Pattern {
  id: string;
  type: 'temporal' | 'behavioral' | 'usage' | 'preference';
  description: string;
  confidence: number; // 0-1
  frequency: number;
  lastSeen: string;
  examples: string[];
}

export interface UserPattern {
  userId: string;
  patterns: Pattern[];
  detectedAt: string;
}

export class PatternDetector {
  /**
   * Detect patterns in user behavior
   */
  async detectPatterns(userId: string): Promise<Pattern[]> {
    const preferences = await learningStore.getAllUserPreferences(userId);
    const patterns: Pattern[] = [];

    // Detect usage patterns
    const usagePattern = this.detectUsagePattern(preferences);
    if (usagePattern) patterns.push(usagePattern);

    // Detect preference clusters
    const prefPattern = this.detectPreferencePattern(preferences);
    if (prefPattern) patterns.push(prefPattern);

    logger.debug(`Detected ${patterns.length} patterns for user ${userId}`);
    return patterns;
  }

  /**
   * Detect high-usage features
   */
  private detectUsagePattern(preferences: any[]): Pattern | null {
    const highUsage = preferences.filter(p => p.interactions > 10);

    if (highUsage.length === 0) return null;

    return {
      id: `usage-${Date.now()}`,
      type: 'usage',
      description: `User frequently uses ${highUsage.length} features`,
      confidence: Math.min(1, highUsage.length / 10),
      frequency: highUsage.reduce((sum, p) => sum + p.interactions, 0),
      lastSeen: new Date().toISOString(),
      examples: highUsage.slice(0, 3).map(p => p.feature)
    };
  }

  /**
   * Detect preference clusters (liked vs disliked)
   */
  private detectPreferencePattern(preferences: any[]): Pattern | null {
    const liked = preferences.filter(p => p.score > 0.7);
    const disliked = preferences.filter(p => p.score < 0.3);

    if (liked.length === 0 && disliked.length === 0) return null;

    return {
      id: `pref-${Date.now()}`,
      type: 'preference',
      description: `User has ${liked.length} preferred features and avoids ${disliked.length} features`,
      confidence: Math.min(1, (liked.length + disliked.length) / 10),
      frequency: liked.length + disliked.length,
      lastSeen: new Date().toISOString(),
      examples: [
        ...liked.slice(0, 2).map(p => `Likes: ${p.feature}`),
        ...disliked.slice(0, 2).map(p => `Avoids: ${p.feature}`)
      ]
    };
  }

  /**
   * Detect temporal patterns (time-of-day usage)
   */
  async detectTemporalPattern(userId: string): Promise<Pattern | null> {
    // TODO: Analyze event timestamps to find preferred times
    // For now, return placeholder
    return {
      id: `temporal-${Date.now()}`,
      type: 'temporal',
      description: 'Most active during business hours (9am-5pm)',
      confidence: 0.6,
      frequency: 30,
      lastSeen: new Date().toISOString(),
      examples: ['Morning sessions', 'Afternoon peaks']
    };
  }
}

export const patternDetector = new PatternDetector();
```

---

## ✅ TASK 2: Goal Tracker

Create `/src/autonomous/intelligence/goal-tracker.ts`:

```typescript
import Redis from 'ioredis';
import { logger } from '../../utils/logger.js';

export interface Goal {
  id: string;
  userId: string;
  type: 'task' | 'metric' | 'habit' | 'achievement';
  description: string;
  target?: number;
  current?: number;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GoalProgress {
  goal: Goal;
  progress: number; // 0-100
  isOnTrack: boolean;
  estimatedCompletion?: string;
}

export class GoalTracker {
  private redis: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    logger.info('GoalTracker initialized');
  }

  /**
   * Create a new goal for user
   */
  async createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const newGoal: Goal = {
      ...goal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const key = `goal:${goal.userId}:${newGoal.id}`;
    await this.redis.set(key, JSON.stringify(newGoal), 'EX', 60 * 60 * 24 * 90); // 90 day TTL

    logger.info(`Goal created: ${newGoal.id} for user ${goal.userId}`);
    return newGoal;
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(userId: string, goalId: string, current: number): Promise<void> {
    const key = `goal:${userId}:${goalId}`;
    const data = await this.redis.get(key);

    if (!data) {
      logger.warn(`Goal not found: ${goalId}`);
      return;
    }

    const goal: Goal = JSON.parse(data);
    goal.current = current;
    goal.updatedAt = new Date().toISOString();

    // Auto-complete if target reached
    if (goal.target && current >= goal.target) {
      goal.status = 'completed';
      goal.completedAt = new Date().toISOString();
      logger.info(`Goal completed: ${goalId}`);
    }

    await this.redis.set(key, JSON.stringify(goal), 'EX', 60 * 60 * 24 * 90);
  }

  /**
   * Get all goals for user
   */
  async getUserGoals(userId: string, status?: Goal['status']): Promise<Goal[]> {
    const pattern = `goal:${userId}:*`;
    const keys = await this.redis.keys(pattern);

    const goals: Goal[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const goal: Goal = JSON.parse(data);
        if (!status || goal.status === status) {
          goals.push(goal);
        }
      }
    }

    return goals.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Calculate goal progress
   */
  async getGoalProgress(userId: string, goalId: string): Promise<GoalProgress | null> {
    const key = `goal:${userId}:${goalId}`;
    const data = await this.redis.get(key);

    if (!data) return null;

    const goal: Goal = JSON.parse(data);

    let progress = 0;
    let isOnTrack = true;

    if (goal.target && goal.current !== undefined) {
      progress = Math.min(100, (goal.current / goal.target) * 100);

      // Check if on track based on time elapsed
      const daysElapsed = (Date.now() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const expectedProgress = Math.min(100, (daysElapsed / 30) * 100); // Assume 30-day goal
      isOnTrack = progress >= expectedProgress * 0.8; // Within 80% of expected
    }

    return {
      goal,
      progress,
      isOnTrack,
      estimatedCompletion: isOnTrack ? this.estimateCompletion(goal) : undefined
    };
  }

  /**
   * Estimate completion date based on current rate
   */
  private estimateCompletion(goal: Goal): string | undefined {
    if (!goal.target || !goal.current || goal.current === 0) return undefined;

    const daysElapsed = (Date.now() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const rate = goal.current / daysElapsed;
    const daysRemaining = (goal.target - goal.current) / rate;

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + Math.ceil(daysRemaining));

    return estimatedDate.toISOString();
  }
}

export const goalTracker = new GoalTracker();
```

---

## ✅ TASK 3: Insight Engine

Create `/src/autonomous/intelligence/insight-engine.ts`:

```typescript
import { patternDetector, Pattern } from './pattern-detector.js';
import { goalTracker, GoalProgress } from './goal-tracker.js';
import { preferenceAnalyzer } from '../adaptive/preference-analyzer.js';
import { logger } from '../../utils/logger.js';

export interface Insight {
  id: string;
  userId: string;
  type: 'observation' | 'recommendation' | 'warning' | 'celebration';
  title: string;
  message: string;
  confidence: number; // 0-1
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedAction?: string;
  createdAt: string;
  expiresAt: string;
}

export class InsightEngine {
  /**
   * Generate insights for user based on patterns and goals
   */
  async generateInsights(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Pattern-based insights
    const patterns = await patternDetector.detectPatterns(userId);
    insights.push(...this.insightsFromPatterns(userId, patterns));

    // Goal-based insights
    const goals = await goalTracker.getUserGoals(userId, 'active');
    for (const goal of goals) {
      const progress = await goalTracker.getGoalProgress(userId, goal.id);
      if (progress) {
        const goalInsight = this.insightFromGoal(userId, progress);
        if (goalInsight) insights.push(goalInsight);
      }
    }

    // Preference-based insights
    const analysis = await preferenceAnalyzer.analyze(userId);
    const prefInsight = this.insightFromPreferences(userId, analysis);
    if (prefInsight) insights.push(prefInsight);

    logger.info(`Generated ${insights.length} insights for user ${userId}`);
    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate insights from detected patterns
   */
  private insightsFromPatterns(userId: string, patterns: Pattern[]): Insight[] {
    const insights: Insight[] = [];

    for (const pattern of patterns) {
      if (pattern.confidence < 0.5) continue; // Only high-confidence patterns

      insights.push({
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'observation',
        title: 'Usage Pattern Detected',
        message: pattern.description,
        confidence: pattern.confidence,
        priority: pattern.confidence > 0.8 ? 'high' : 'medium',
        actionable: pattern.type === 'preference',
        suggestedAction: pattern.type === 'preference'
          ? 'Configure notifications based on your preferences'
          : undefined,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });
    }

    return insights;
  }

  /**
   * Generate insight from goal progress
   */
  private insightFromGoal(userId: string, progress: GoalProgress): Insight | null {
    const { goal, progress: percent, isOnTrack } = progress;

    if (goal.status === 'completed') {
      return {
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'celebration',
        title: 'Goal Completed! 🎉',
        message: `You've completed your goal: ${goal.description}`,
        confidence: 1.0,
        priority: 'high',
        actionable: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
      };
    }

    if (!isOnTrack && percent < 50) {
      return {
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'warning',
        title: 'Goal At Risk',
        message: `Your goal "${goal.description}" is behind schedule (${percent.toFixed(0)}% complete)`,
        confidence: 0.8,
        priority: 'high',
        actionable: true,
        suggestedAction: 'Review your goal timeline or adjust expectations',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    if (isOnTrack && percent > 75) {
      return {
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'observation',
        title: 'Making Great Progress',
        message: `You're ${percent.toFixed(0)}% of the way to: ${goal.description}`,
        confidence: 0.9,
        priority: 'medium',
        actionable: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    return null;
  }

  /**
   * Generate insight from preference analysis
   */
  private insightFromPreferences(userId: string, analysis: any): Insight | null {
    if (analysis.learningConfidence < 0.3) {
      return {
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'observation',
        title: 'Still Learning Your Preferences',
        message: 'I\'m learning what you like. Keep interacting to get better recommendations!',
        confidence: 0.7,
        priority: 'low',
        actionable: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
      };
    }

    if (analysis.preferredFeatures.length > 0) {
      return {
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'recommendation',
        title: 'Personalized Recommendations Ready',
        message: `Based on your preferences, you might enjoy: ${analysis.preferredFeatures.slice(0, 3).join(', ')}`,
        confidence: analysis.learningConfidence,
        priority: 'medium',
        actionable: true,
        suggestedAction: 'Try these recommended features',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    return null;
  }

  /**
   * Get actionable insights for dashboard
   */
  async getActionableInsights(userId: string): Promise<Insight[]> {
    const insights = await this.generateInsights(userId);
    return insights.filter(i => i.actionable && i.priority !== 'low');
  }
}

export const insightEngine = new InsightEngine();
```

---

## ✅ TASK 4: API Routes

Create `/src/autonomous/intelligence/api.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { patternDetector } from './pattern-detector.js';
import { goalTracker } from './goal-tracker.js';
import { insightEngine } from './insight-engine.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';

export const intelligenceRouter = Router();

/**
 * Get user patterns
 * GET /api/autonomous/intelligence/patterns/:userId
 */
intelligenceRouter.get('/patterns/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const patterns = await patternDetector.detectPatterns(req.params.userId);
    res.json({
      success: true,
      patterns
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create a goal
 * POST /api/autonomous/intelligence/goals
 */
intelligenceRouter.post('/goals', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const goal = await goalTracker.createGoal(req.body);
    res.json({
      success: true,
      goal
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user goals
 * GET /api/autonomous/intelligence/goals/:userId
 */
intelligenceRouter.get('/goals/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const status = req.query.status as any;
    const goals = await goalTracker.getUserGoals(req.params.userId, status);
    res.json({
      success: true,
      goals
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update goal progress
 * POST /api/autonomous/intelligence/goals/:userId/:goalId/progress
 */
intelligenceRouter.post('/goals/:userId/:goalId/progress', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const { userId, goalId } = req.params;
    const { current } = req.body;

    await goalTracker.updateGoalProgress(userId, goalId, current);
    const progress = await goalTracker.getGoalProgress(userId, goalId);

    res.json({
      success: true,
      progress
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get insights for user
 * GET /api/autonomous/intelligence/insights/:userId
 */
intelligenceRouter.get('/insights/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const insights = await insightEngine.generateInsights(req.params.userId);
    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get actionable insights
 * GET /api/autonomous/intelligence/insights/:userId/actionable
 */
intelligenceRouter.get('/insights/:userId/actionable', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('INSIGHT_ENGINE')) {
    return res.status(503).json({
      success: false,
      error: 'Insight Engine is disabled'
    });
  }

  try {
    const insights = await insightEngine.getActionableInsights(req.params.userId);
    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default intelligenceRouter;
```

---

## ✅ TASK 5: Mount to Autonomous API

Update `/src/autonomous/integration/autonomous-api.ts`:

Add at the top:
```typescript
import intelligenceRouter from '../intelligence/api.js';
```

Add in the router setup:
```typescript
// Mount intelligence engine routes
autonomousRouter.use('/intelligence', intelligenceRouter);
```

---

## ✅ TASK 6: Build and Test

```bash
# Build
npm run build

# Restart services
./launch-hybrid-services.sh restart

# Enable feature
curl -X POST http://localhost:4000/api/autonomous/features/INSIGHT_ENGINE/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Test pattern detection
curl http://localhost:4000/api/autonomous/intelligence/patterns/test-user

# Test goal creation
curl -X POST http://localhost:4000/api/autonomous/intelligence/goals \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "type": "task",
    "description": "Complete 50 music sessions",
    "target": 50,
    "current": 10,
    "status": "active"
  }'

# Test goal retrieval
curl http://localhost:4000/api/autonomous/intelligence/goals/test-user

# Test goal progress update
curl -X POST http://localhost:4000/api/autonomous/intelligence/goals/test-user/[GOAL_ID]/progress \
  -H "Content-Type: application/json" \
  -d '{"current": 25}'

# Test insight generation
curl http://localhost:4000/api/autonomous/intelligence/insights/test-user

# Test actionable insights
curl http://localhost:4000/api/autonomous/intelligence/insights/test-user/actionable
```

---

## ✅ Deliverables

1. ✅ `/src/autonomous/intelligence/pattern-detector.ts`
2. ✅ `/src/autonomous/intelligence/goal-tracker.ts`
3. ✅ `/src/autonomous/intelligence/insight-engine.ts`
4. ✅ `/src/autonomous/intelligence/api.ts`
5. ✅ Updated autonomous-api.ts
6. ✅ TypeScript compiles
7. ✅ API endpoints work when enabled

---

## 🚨 When You're Done

Post completion status and wait for integration phase.
