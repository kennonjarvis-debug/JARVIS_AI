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
