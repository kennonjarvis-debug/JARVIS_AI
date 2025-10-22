import { patternDetector, Pattern } from './pattern-detector.js';
import { goalTracker, GoalProgress } from './goal-tracker.js';
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

    // Mock preference-based insight (since adaptive engine doesn't exist yet)
    const prefInsight = this.mockPreferenceInsight(userId);
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
   * Mock preference insight (will be replaced when adaptive engine exists)
   */
  private mockPreferenceInsight(userId: string): Insight | null {
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

  /**
   * Get actionable insights for dashboard
   */
  async getActionableInsights(userId: string): Promise<Insight[]> {
    const insights = await this.generateInsights(userId);
    return insights.filter(i => i.actionable && i.priority !== 'low');
  }
}

export const insightEngine = new InsightEngine();
