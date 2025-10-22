# CLAUDE B - Proactive Agent

**Wait for:** Claude E to complete foundation
**Duration:** 6-8 hours
**Working Directory:** `/Users/benkennon/Jarvis`

---

## 🎯 Your Mission

Build the Proactive Agent - autonomous notification system that learns when and what to suggest to users.

**Build in:** `/src/autonomous/proactive/` (isolated, no conflicts)

---

## ✅ TASK 1: Context Monitor

Create `/src/autonomous/proactive/context-monitor.ts`:

```typescript
import { logger } from '../../utils/logger.js';

export interface UserContext {
  userId: string;
  isActive: boolean;
  currentActivity: 'idle' | 'coding' | 'meeting' | 'focus' | 'break' | 'unknown';
  lastInteraction: string;
  focusScore: number; // 0-1, higher = more focused/busy
  doNotDisturb: boolean;
  timezone?: string;
}

export class ContextMonitor {
  private contexts = new Map<string, UserContext>();
  private activityTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Update user's current context
   */
  updateContext(userId: string, activity: string, doNotDisturb: boolean = false): void {
    const existing = this.contexts.get(userId);

    const context: UserContext = {
      userId,
      isActive: true,
      currentActivity: activity as any,
      lastInteraction: new Date().toISOString(),
      focusScore: this.calculateFocusScore(activity),
      doNotDisturb,
      timezone: existing?.timezone
    };

    this.contexts.set(userId, context);

    // Auto-mark inactive after 30 minutes
    this.resetInactivityTimer(userId);

    logger.debug(`Context updated for ${userId}: ${activity} (focus: ${context.focusScore})`);
  }

  /**
   * Calculate focus score based on activity
   */
  private calculateFocusScore(activity: string): number {
    const scores: Record<string, number> = {
      'focus': 1.0,      // Deep work, don't interrupt
      'coding': 0.8,     // High focus
      'meeting': 0.9,    // Don't interrupt
      'idle': 0.1,       // Low focus, good time
      'break': 0.0,      // Perfect time
      'unknown': 0.5     // Uncertain
    };

    return scores[activity] ?? 0.5;
  }

  /**
   * Reset inactivity timer for user
   */
  private resetInactivityTimer(userId: string): void {
    // Clear existing timer
    const existing = this.activityTimeouts.get(userId);
    if (existing) clearTimeout(existing);

    // Set new timer
    const timeout = setTimeout(() => {
      const context = this.contexts.get(userId);
      if (context) {
        context.isActive = false;
        context.currentActivity = 'idle';
        this.contexts.set(userId, context);
        logger.debug(`User ${userId} marked inactive`);
      }
    }, 30 * 60 * 1000); // 30 minutes

    this.activityTimeouts.set(userId, timeout);
  }

  /**
   * Check if we can interrupt user now
   */
  async canInterrupt(userId: string): Promise<boolean> {
    const context = this.contexts.get(userId);

    // No context = assume we can interrupt
    if (!context) return true;

    // Explicit DND
    if (context.doNotDisturb) {
      logger.debug(`Cannot interrupt ${userId}: DND enabled`);
      return false;
    }

    // In meeting
    if (context.currentActivity === 'meeting') {
      logger.debug(`Cannot interrupt ${userId}: in meeting`);
      return false;
    }

    // Deep focus mode
    if (context.focusScore > 0.8) {
      logger.debug(`Cannot interrupt ${userId}: deep focus (${context.focusScore})`);
      return false;
    }

    // Check time of day
    const hour = new Date().getHours();
    if (hour < 8 || hour > 20) {
      logger.debug(`Cannot interrupt ${userId}: outside work hours (${hour})`);
      return false;
    }

    return true;
  }

  /**
   * Predict next good time to interrupt user
   */
  async getOptimalInterruptTime(userId: string): Promise<Date | null> {
    const context = this.contexts.get(userId);
    if (!context) return new Date(); // Now is fine

    // If they're in deep focus, predict when they'll take a break
    if (context.focusScore > 0.8) {
      // Assume 90-minute focus sessions
      const nextBreak = new Date();
      nextBreak.setMinutes(nextBreak.getMinutes() + 90);
      return nextBreak;
    }

    // If in meeting, estimate 1 hour
    if (context.currentActivity === 'meeting') {
      const nextBreak = new Date();
      nextBreak.setHours(nextBreak.getHours() + 1);
      return nextBreak;
    }

    // Otherwise, now is fine
    return new Date();
  }

  /**
   * Get current context for user
   */
  getContext(userId: string): UserContext | null {
    return this.contexts.get(userId) || null;
  }

  /**
   * Get all active users
   */
  getActiveUsers(): string[] {
    return Array.from(this.contexts.entries())
      .filter(([_, context]) => context.isActive)
      .map(([userId]) => userId);
  }
}

export const contextMonitor = new ContextMonitor();
```

---

## ✅ TASK 2: Anticipation Engine

Create `/src/autonomous/proactive/anticipation-engine.ts`:

```typescript
import { logger } from '../../utils/logger.js';

export interface Prediction {
  action: string;
  confidence: number; // 0-1
  predictedTime: string;
  reasoning: string;
  category: 'routine' | 'deadline' | 'pattern' | 'suggestion';
}

export class AnticipationEngine {
  private patterns = new Map<string, any[]>();

  /**
   * Predict next actions user is likely to take
   */
  async predictNextAction(userId: string): Promise<Prediction[]> {
    const predictions: Prediction[] = [];

    // Time-based patterns
    const hour = new Date().getHours();
    const day = new Date().getDay();

    // Morning routine (9-10 AM, weekdays)
    if (hour === 9 && day >= 1 && day <= 5) {
      predictions.push({
        action: 'Check daily metrics',
        confidence: 0.85,
        predictedTime: new Date().toISOString(),
        reasoning: 'User typically checks metrics at 9 AM on weekdays',
        category: 'routine'
      });
    }

    // Pre-deployment check (2-3 PM, Tuesday/Thursday)
    if (hour === 14 && (day === 2 || day === 4)) {
      predictions.push({
        action: 'Run deployment checks',
        confidence: 0.75,
        predictedTime: new Date().toISOString(),
        reasoning: 'User usually deploys on Tuesday/Thursday afternoons',
        category: 'pattern'
      });
    }

    // End of day review (5-6 PM)
    if (hour === 17) {
      predictions.push({
        action: 'Review daily progress',
        confidence: 0.70,
        predictedTime: new Date().toISOString(),
        reasoning: 'Common end-of-day activity',
        category: 'routine'
      });
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Suggest a proactive action based on predictions
   */
  async suggestProactiveAction(userId: string): Promise<string | null> {
    const predictions = await this.predictNextAction(userId);

    // Only suggest if confidence is high
    const topPrediction = predictions[0];
    if (!topPrediction || topPrediction.confidence < 0.75) {
      return null;
    }

    logger.info(`Suggesting proactive action for ${userId}: ${topPrediction.action}`);
    return `Would you like to ${topPrediction.action.toLowerCase()}? ${topPrediction.reasoning}`;
  }

  /**
   * Record actual action to improve predictions
   */
  async recordAction(userId: string, action: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const hour = new Date().getHours();
    const day = new Date().getDay();

    // Store pattern
    const key = `${userId}:${action}`;
    const existing = this.patterns.get(key) || [];
    existing.push({ timestamp, hour, day });

    // Keep last 100 occurrences
    if (existing.length > 100) existing.shift();

    this.patterns.set(key, existing);
  }
}

export const anticipationEngine = new AnticipationEngine();
```

---

## ✅ TASK 3: Notification Scheduler

Create `/src/autonomous/proactive/notification-scheduler.ts`:

```typescript
import { contextMonitor } from './context-monitor.js';
import { logger } from '../../utils/logger.js';

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
    params?: any;
  };
  scheduledFor?: string;
  expiresAt?: string;
  createdAt: string;
}

export class NotificationScheduler {
  private queue: ProactiveNotification[] = [];
  private sentNotifications = new Set<string>();

  /**
   * Schedule a proactive notification
   */
  async schedule(notification: ProactiveNotification): Promise<void> {
    // Check if already sent
    if (this.sentNotifications.has(notification.id)) {
      logger.debug(`Notification ${notification.id} already sent`);
      return;
    }

    // Check if user can be interrupted
    const canInterrupt = await contextMonitor.canInterrupt(notification.userId);

    if (canInterrupt || notification.priority === 'urgent') {
      // Send immediately
      await this.sendNow(notification);
    } else {
      // Schedule for later
      const optimalTime = await contextMonitor.getOptimalInterruptTime(notification.userId);
      notification.scheduledFor = optimalTime?.toISOString();
      this.queue.push(notification);

      logger.info(`Notification ${notification.id} scheduled for ${notification.scheduledFor}`);
    }
  }

  /**
   * Send notification immediately
   */
  private async sendNow(notification: ProactiveNotification): Promise<void> {
    logger.info(`Sending notification ${notification.id} to ${notification.userId}`);

    // TODO: Integrate with WebSocket hub to push to dashboard
    // TODO: Integrate with conversation store
    // TODO: Send to mobile app if connected

    // Mark as sent
    this.sentNotifications.add(notification.id);

    // Remove from queue if it was there
    this.queue = this.queue.filter(n => n.id !== notification.id);

    // Expire old sent notifications after 24 hours
    setTimeout(() => {
      this.sentNotifications.delete(notification.id);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Process pending notifications in queue
   */
  async processPendingNotifications(): Promise<void> {
    const now = new Date();
    const toSend: ProactiveNotification[] = [];

    // Find notifications ready to send
    for (const notification of this.queue) {
      // Check if expired
      if (notification.expiresAt && new Date(notification.expiresAt) < now) {
        logger.debug(`Notification ${notification.id} expired, removing from queue`);
        continue;
      }

      // Check if scheduled time has passed
      if (notification.scheduledFor && new Date(notification.scheduledFor) <= now) {
        // Check if user can be interrupted now
        const canInterrupt = await contextMonitor.canInterrupt(notification.userId);
        if (canInterrupt) {
          toSend.push(notification);
        } else {
          // Reschedule
          const optimalTime = await contextMonitor.getOptimalInterruptTime(notification.userId);
          notification.scheduledFor = optimalTime?.toISOString();
          logger.debug(`Rescheduled notification ${notification.id} for ${notification.scheduledFor}`);
        }
      }
    }

    // Send all ready notifications
    for (const notification of toSend) {
      await this.sendNow(notification);
    }

    // Remove sent and expired from queue
    this.queue = this.queue.filter(n =>
      !toSend.includes(n) &&
      (!n.expiresAt || new Date(n.expiresAt) >= now)
    );

    if (toSend.length > 0) {
      logger.info(`Processed ${toSend.length} pending notifications`);
    }
  }

  /**
   * Get pending notifications for user
   */
  getPendingNotifications(userId: string): ProactiveNotification[] {
    return this.queue.filter(n => n.userId === userId);
  }

  /**
   * Cancel a notification
   */
  cancelNotification(notificationId: string): boolean {
    const length = this.queue.length;
    this.queue = this.queue.filter(n => n.id !== notificationId);
    return this.queue.length < length;
  }
}

export const notificationScheduler = new NotificationScheduler();
```

---

## ✅ TASK 4: Proactive Agent

Create `/src/autonomous/proactive/proactive-agent.ts`:

```typescript
import { anticipationEngine } from './anticipation-engine.js';
import { notificationScheduler, ProactiveNotification } from './notification-scheduler.js';
import { contextMonitor } from './context-monitor.js';
import { logger } from '../../utils/logger.js';

export class ProactiveAgent {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Start the proactive agent
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('ProactiveAgent already running');
      return;
    }

    this.isRunning = true;
    logger.info('🤖 ProactiveAgent started');

    // Run periodic checks every 5 minutes
    this.checkInterval = setInterval(
      () => this.checkForProactiveActions(),
      5 * 60 * 1000
    );

    // Run initial check
    await this.checkForProactiveActions();
  }

  /**
   * Stop the proactive agent
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    logger.info('ProactiveAgent stopped');
  }

  /**
   * Main loop - check for proactive actions to suggest
   */
  private async checkForProactiveActions(): Promise<void> {
    try {
      logger.debug('Checking for proactive actions...');

      // Get active users
      const activeUsers = contextMonitor.getActiveUsers();
      logger.debug(`Found ${activeUsers.length} active users`);

      for (const userId of activeUsers) {
        await this.processUserProactivity(userId);
      }

      // Process pending notifications
      await notificationScheduler.processPendingNotifications();

    } catch (error: any) {
      logger.error(`Error in proactive check: ${error.message}`);
    }
  }

  /**
   * Process proactive suggestions for a single user
   */
  private async processUserProactivity(userId: string): Promise<void> {
    // Check if user can be interrupted
    const canInterrupt = await contextMonitor.canInterrupt(userId);
    if (!canInterrupt) {
      logger.debug(`User ${userId} cannot be interrupted right now`);
      return;
    }

    // Get anticipated actions
    const suggestion = await anticipationEngine.suggestProactiveAction(userId);
    if (!suggestion) {
      logger.debug(`No high-confidence suggestions for ${userId}`);
      return;
    }

    // Create notification
    const notification: ProactiveNotification = {
      id: `proactive-${userId}-${Date.now()}`,
      userId,
      type: 'suggestion',
      priority: 'low',
      title: 'Proactive Suggestion',
      message: suggestion,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
    };

    // Schedule it
    await notificationScheduler.schedule(notification);
    logger.info(`Scheduled proactive notification for ${userId}`);
  }

  /**
   * Manually trigger a proactive check for user
   */
  async triggerCheckForUser(userId: string): Promise<void> {
    await this.processUserProactivity(userId);
  }

  /**
   * Get agent status
   */
  getStatus(): any {
    return {
      running: this.isRunning,
      activeUsers: contextMonitor.getActiveUsers().length,
      checkInterval: this.checkInterval ? '5 minutes' : 'stopped'
    };
  }
}

export const proactiveAgent = new ProactiveAgent();
```

---

## ✅ TASK 5: API Routes

Create `/src/autonomous/proactive/api.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { proactiveAgent } from './proactive-agent.js';
import { notificationScheduler } from './notification-scheduler.js';
import { contextMonitor } from './context-monitor.js';
import { anticipationEngine } from './anticipation-engine.js';
import { isFeatureEnabled } from '../integration/feature-flags.js';

export const proactiveRouter = Router();

/**
 * Send manual notification
 * POST /api/autonomous/proactive/notify
 */
proactiveRouter.post('/notify', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('PROACTIVE_AGENT')) {
    return res.status(503).json({
      success: false,
      error: 'Proactive Agent is disabled'
    });
  }

  try {
    await notificationScheduler.schedule(req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get suggestions for user
 * GET /api/autonomous/proactive/suggestions/:userId
 */
proactiveRouter.get('/suggestions/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('PROACTIVE_AGENT')) {
    return res.status(503).json({
      success: false,
      error: 'Proactive Agent is disabled'
    });
  }

  try {
    const predictions = await anticipationEngine.predictNextAction(req.params.userId);
    res.json({
      success: true,
      suggestions: predictions
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update user context
 * POST /api/autonomous/proactive/context/:userId
 */
proactiveRouter.post('/context/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('PROACTIVE_AGENT')) {
    return res.status(503).json({
      success: false,
      error: 'Proactive Agent is disabled'
    });
  }

  try {
    const { activity, doNotDisturb } = req.body;
    contextMonitor.updateContext(req.params.userId, activity, doNotDisturb);

    res.json({
      success: true,
      context: contextMonitor.getContext(req.params.userId)
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user context
 * GET /api/autonomous/proactive/context/:userId
 */
proactiveRouter.get('/context/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('PROACTIVE_AGENT')) {
    return res.status(503).json({
      success: false,
      error: 'Proactive Agent is disabled'
    });
  }

  try {
    const context = contextMonitor.getContext(req.params.userId);
    res.json({
      success: true,
      context
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pending notifications
 * GET /api/autonomous/proactive/pending/:userId
 */
proactiveRouter.get('/pending/:userId', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('PROACTIVE_AGENT')) {
    return res.status(503).json({
      success: false,
      error: 'Proactive Agent is disabled'
    });
  }

  try {
    const pending = notificationScheduler.getPendingNotifications(req.params.userId);
    res.json({
      success: true,
      notifications: pending
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Start/stop proactive agent
 * POST /api/autonomous/proactive/agent/:action
 */
proactiveRouter.post('/agent/:action', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('PROACTIVE_AGENT')) {
    return res.status(503).json({
      success: false,
      error: 'Proactive Agent is disabled'
    });
  }

  try {
    const { action } = req.params;

    if (action === 'start') {
      await proactiveAgent.start();
    } else if (action === 'stop') {
      proactiveAgent.stop();
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use "start" or "stop"'
      });
    }

    res.json({
      success: true,
      status: proactiveAgent.getStatus()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get agent status
 * GET /api/autonomous/proactive/status
 */
proactiveRouter.get('/status', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('PROACTIVE_AGENT')) {
    return res.status(503).json({
      success: false,
      error: 'Proactive Agent is disabled'
    });
  }

  res.json({
    success: true,
    status: proactiveAgent.getStatus()
  });
});

export default proactiveRouter;
```

---

## ✅ TASK 6: Mount to Autonomous API

Update `/src/autonomous/integration/autonomous-api.ts`:

Add at the top:
```typescript
import proactiveRouter from '../proactive/api.js';
```

Add in the router setup:
```typescript
// Mount proactive agent routes
autonomousRouter.use('/proactive', proactiveRouter);
```

---

## ✅ TASK 7: Auto-Start When Enabled

Update `/src/autonomous/integration/mount.ts`:

Add at the top:
```typescript
import { proactiveAgent } from '../proactive/proactive-agent.js';
import { isFeatureEnabled } from './feature-flags.js';
```

Add at the end of `mountAutonomousFeatures`:
```typescript
  // Auto-start proactive agent if enabled
  if (isFeatureEnabled('PROACTIVE_AGENT')) {
    proactiveAgent.start();
    logger.info('🤖 ProactiveAgent auto-started');
  }
```

---

## ✅ TASK 8: Build and Test

```bash
# Build
npm run build

# Restart services
./launch-hybrid-services.sh restart

# Enable feature
curl -X POST http://localhost:4000/api/autonomous/features/PROACTIVE_AGENT/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Start proactive agent
curl -X POST http://localhost:4000/api/autonomous/proactive/agent/start

# Check status
curl http://localhost:4000/api/autonomous/proactive/status

# Update context
curl -X POST http://localhost:4000/api/autonomous/proactive/context/test-user \
  -H "Content-Type: application/json" \
  -d '{"activity": "coding", "doNotDisturb": false}'

# Get suggestions
curl http://localhost:4000/api/autonomous/proactive/suggestions/test-user

# Get pending notifications
curl http://localhost:4000/api/autonomous/proactive/pending/test-user
```

---

## ✅ Deliverables

1. ✅ `/src/autonomous/proactive/context-monitor.ts`
2. ✅ `/src/autonomous/proactive/anticipation-engine.ts`
3. ✅ `/src/autonomous/proactive/notification-scheduler.ts`
4. ✅ `/src/autonomous/proactive/proactive-agent.ts`
5. ✅ `/src/autonomous/proactive/api.ts`
6. ✅ Updated autonomous-api.ts
7. ✅ Updated mount.ts (auto-start)
8. ✅ TypeScript compiles
9. ✅ API endpoints work when enabled
10. ✅ Agent auto-starts when feature enabled

---

## 🚨 When You're Done

Post completion status:
```
CLAUDE B COMPLETE ✅

Proactive Agent built:
- Context monitoring: ✅
- Anticipation engine: ✅
- Notification scheduler: ✅
- Auto-start on enable: ✅
- API endpoints: ✅
```
