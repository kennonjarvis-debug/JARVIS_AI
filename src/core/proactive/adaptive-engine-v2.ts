/**
 * Jarvis Adaptive Engine V2
 * Enhanced self-learning system with proactive capabilities
 *
 * New capabilities:
 * - User interaction tracking
 * - Preference learning
 * - Timing analytics
 * - Context awareness
 * - Proactive suggestions
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  UserInteraction,
  UserPreference,
  TimingPattern,
  WorkContext,
  SystemEvent,
  LearningRecord,
  UserPattern
} from './types';

export interface PerformanceMetric {
  id: string;
  moduleName: string;
  metricName: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Anomaly {
  id: string;
  moduleName: string;
  type: 'performance' | 'error' | 'resource' | 'behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metrics?: Record<string, any>;
}

export interface Improvement {
  id: string;
  moduleName: string;
  type: 'optimization' | 'configuration' | 'architecture' | 'workflow';
  clearanceLevel: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact: string;
  implementationSteps?: string[];
  autoApplicable: boolean;
  applied: boolean;
  appliedAt?: Date;
  createdAt: Date;
}

/**
 * Adaptive Engine V2 - Enhanced with proactive capabilities
 */
export class AdaptiveEngineV2 extends EventEmitter {
  private static instance: AdaptiveEngineV2;
  
  // Existing capabilities
  private metrics: PerformanceMetric[] = [];
  private anomalies: Anomaly[] = [];
  private improvements: Improvement[] = [];
  private learningHistory: LearningRecord[] = [];
  
  // New capabilities
  private userInteractions: UserInteraction[] = [];
  private userPreferences: Map<string, UserPreference> = new Map();
  private timingPatterns: Map<string, TimingPattern> = new Map();
  private userPatterns: Map<string, UserPattern> = new Map();
  private contextHistory: WorkContext[] = [];
  
  // Configuration
  private maxHistorySize = 10000;
  private dataPath = path.join(process.cwd(), 'logs/jarvis/adaptive-data');
  private minInteractionsForPattern = 3;
  private minConfidenceThreshold = 0.6;

  private constructor() {
    super();
    this.ensureDataDirectory();
    this.loadPersistedData();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AdaptiveEngineV2 {
    if (!AdaptiveEngineV2.instance) {
      AdaptiveEngineV2.instance = new AdaptiveEngineV2();
    }
    return AdaptiveEngineV2.instance;
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create adaptive data directory:', error);
    }
  }

  /**
   * Load persisted data from disk
   */
  private async loadPersistedData() {
    try {
      // Load interactions
      const interactionsPath = path.join(this.dataPath, 'interactions.json');
      try {
        const data = await fs.readFile(interactionsPath, 'utf-8');
        this.userInteractions = JSON.parse(data);
      } catch {}

      // Load preferences
      const preferencesPath = path.join(this.dataPath, 'preferences.json');
      try {
        const data = await fs.readFile(preferencesPath, 'utf-8');
        const prefs = JSON.parse(data);
        this.userPreferences = new Map(Object.entries(prefs));
      } catch {}

      // Load timing patterns
      const timingPath = path.join(this.dataPath, 'timing.json');
      try {
        const data = await fs.readFile(timingPath, 'utf-8');
        const timing = JSON.parse(data);
        this.timingPatterns = new Map(Object.entries(timing));
      } catch {}

      console.log('✅ Adaptive data loaded from disk');
    } catch (error) {
      console.error('Error loading persisted data:', error);
    }
  }

  /**
   * Persist data to disk
   */
  private async persistData() {
    try {
      // Save interactions (last 1000)
      const recentInteractions = this.userInteractions.slice(-1000);
      await fs.writeFile(
        path.join(this.dataPath, 'interactions.json'),
        JSON.stringify(recentInteractions, null, 2)
      );

      // Save preferences
      const prefsObj = Object.fromEntries(this.userPreferences);
      await fs.writeFile(
        path.join(this.dataPath, 'preferences.json'),
        JSON.stringify(prefsObj, null, 2)
      );

      // Save timing patterns
      const timingObj = Object.fromEntries(this.timingPatterns);
      await fs.writeFile(
        path.join(this.dataPath, 'timing.json'),
        JSON.stringify(timingObj, null, 2)
      );
    } catch (error) {
      console.error('Error persisting data:', error);
    }
  }

  /**
   * Track user interaction
   */
  async trackInteraction(interaction: UserInteraction) {
    this.userInteractions.push(interaction);

    // Trim if too large
    if (this.userInteractions.length > this.maxHistorySize) {
      this.userInteractions = this.userInteractions.slice(-this.maxHistorySize);
    }

    // Emit event
    this.emit('interaction', interaction);

    // Analyze for patterns
    await this.analyzeInteractionPatterns();

    // Persist periodically
    if (this.userInteractions.length % 10 === 0) {
      await this.persistData();
    }
  }

  /**
   * Analyze interaction patterns to learn preferences
   */
  private async analyzeInteractionPatterns() {
    // Group interactions by target/category
    const interactionsByTarget = new Map<string, UserInteraction[]>();
    
    for (const interaction of this.userInteractions) {
      const target = interaction.target;
      if (!interactionsByTarget.has(target)) {
        interactionsByTarget.set(target, []);
      }
      interactionsByTarget.get(target)!.push(interaction);
    }

    // Detect preferences
    for (const [target, interactions] of interactionsByTarget) {
      if (interactions.length >= this.minInteractionsForPattern) {
        // Calculate preference strength based on actions
        const positiveActions = interactions.filter(
          i => i.actionType === 'act_on_suggestion' || i.actionType === 'click'
        ).length;
        const negativeActions = interactions.filter(
          i => i.actionType === 'dismiss' || i.actionType === 'ignore'
        ).length;
        const totalActions = positiveActions + negativeActions;

        if (totalActions > 0) {
          const strength = (positiveActions / totalActions) * 100;
          const confidence = Math.min(totalActions / 10, 1); // Max confidence at 10 interactions

          // Create or update preference
          const category = this.categorizeTarget(target);
          const prefKey = `${category}:${target}`;

          this.userPreferences.set(prefKey, {
            category,
            preference: target,
            strength,
            confidence,
            learnedFrom: interactions.map(i => i.id),
            lastUpdated: new Date()
          });
        }
      }
    }
  }

  /**
   * Categorize interaction target
   */
  private categorizeTarget(target: string): string {
    if (target.includes('dashboard')) return 'dashboard';
    if (target.includes('metrics')) return 'metrics';
    if (target.includes('music')) return 'music';
    if (target.includes('marketing')) return 'marketing';
    if (target.includes('debug')) return 'debugging';
    if (target.includes('deploy')) return 'deployment';
    return 'general';
  }

  /**
   * Learn timing patterns from interactions
   */
  async learnTimingPatterns() {
    const patternsByActivity = new Map<string, Date[]>();

    // Group interactions by activity type
    for (const interaction of this.userInteractions) {
      const activity = interaction.context.activityType || 'general';
      if (!patternsByActivity.has(activity)) {
        patternsByActivity.set(activity, []);
      }
      patternsByActivity.get(activity)!.push(interaction.timestamp);
    }

    // Analyze each activity's timing
    for (const [activity, timestamps] of patternsByActivity) {
      if (timestamps.length >= this.minInteractionsForPattern) {
        // Calculate preferred times (hour of day)
        const hourCounts = new Array(24).fill(0);
        const dayOfWeekCounts = new Array(7).fill(0);

        for (const ts of timestamps) {
          const date = new Date(ts);
          hourCounts[date.getHours()]++;
          dayOfWeekCounts[date.getDay()]++;
        }

        // Find peak hours (top 3)
        const preferredHours = hourCounts
          .map((count, hour) => ({ hour, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(({ hour }) => {
            const d = new Date();
            d.setHours(hour, 0, 0, 0);
            return d;
          });

        // Find preferred days
        const preferredDays = dayOfWeekCounts
          .map((count, day) => ({ day, count }))
          .filter(({ count }) => count > 0)
          .sort((a, b) => b.count - a.count)
          .map(({ day }) => day);

        // Calculate average response time (time between interactions)
        let totalResponseTime = 0;
        for (let i = 1; i < timestamps.length; i++) {
          const diff = new Date(timestamps[i]).getTime() - new Date(timestamps[i - 1]).getTime();
          totalResponseTime += diff;
        }
        const avgResponseTime = totalResponseTime / (timestamps.length - 1);

        // Store pattern
        this.timingPatterns.set(activity, {
          activityType: activity,
          preferredTimes: preferredHours,
          doNotDisturbTimes: [], // TODO: Detect from dismissals
          avgResponseTime,
          daysOfWeek: preferredDays,
          confidence: Math.min(timestamps.length / 10, 1)
        });
      }
    }

    await this.persistData();
  }

  /**
   * Get user preferences for a category
   */
  getUserPreferences(category?: string): UserPreference[] {
    const prefs = Array.from(this.userPreferences.values());
    
    if (category) {
      return prefs.filter(p => p.category === category);
    }
    
    return prefs.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Get timing patterns for activity
   */
  getTimingPattern(activityType: string): TimingPattern | null {
    return this.timingPatterns.get(activityType) || null;
  }

  /**
   * Check if current time is good for notifications
   */
  isGoodTimeForNotification(activityType?: string): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    // General do-not-disturb hours (late night / early morning)
    if (currentHour < 7 || currentHour > 22) {
      return false;
    }

    // Check activity-specific timing if provided
    if (activityType) {
      const pattern = this.timingPatterns.get(activityType);
      if (pattern) {
        // Check if current hour matches preferred times
        const isPreferredTime = pattern.preferredTimes.some(
          time => time.getHours() === currentHour
        );
        
        // Check do-not-disturb times
        const isDND = pattern.doNotDisturbTimes.some(
          time => Math.abs(time.getHours() - currentHour) < 1
        );

        if (isDND) return false;
        if (pattern.confidence > 0.7 && !isPreferredTime) return false;
      }
    }

    return true;
  }

  /**
   * Track performance metric (existing capability)
   */
  trackMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.maxHistorySize);
    }

    this.emit('metric', metric);

    // Check for anomalies
    this.detectAnomalies(metric);
  }

  /**
   * Detect anomalies in metrics
   */
  private detectAnomalies(metric: PerformanceMetric) {
    // Get historical data for this metric
    const historicalData = this.metrics.filter(
      m => m.moduleName === metric.moduleName && m.metricName === metric.metricName
    );

    if (historicalData.length < 10) return; // Not enough data

    // Calculate statistics
    const values = historicalData.map(m => m.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Check if current value is an anomaly (> 2 standard deviations)
    const zScore = (metric.value - mean) / stdDev;
    
    if (Math.abs(zScore) > 2) {
      const anomaly: Anomaly = {
        id: `anomaly-${Date.now()}`,
        moduleName: metric.moduleName,
        type: 'performance',
        severity: Math.abs(zScore) > 3 ? 'high' : 'medium',
        description: `${metric.metricName} is ${zScore > 0 ? 'higher' : 'lower'} than normal`,
        detectedAt: new Date(),
        resolved: false,
        metrics: { value: metric.value, mean, stdDev, zScore }
      };

      this.anomalies.push(anomaly);
      this.emit('anomaly', anomaly);
    }
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(hours: number = 24): Anomaly[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.anomalies.filter(a => a.detectedAt >= cutoff && !a.resolved);
  }

  /**
   * Record learning from feedback
   */
  async recordLearning(record: LearningRecord) {
    this.learningHistory.push(record);

    if (this.learningHistory.length > this.maxHistorySize) {
      this.learningHistory = this.learningHistory.slice(-this.maxHistorySize);
    }

    this.emit('learning', record);
  }

  /**
   * Get system insights based on learned patterns
   */
  getSystemInsights(): string[] {
    const insights: string[] = [];

    // Insight from preferences
    const topPrefs = this.getUserPreferences().slice(0, 3);
    if (topPrefs.length > 0) {
      insights.push(`User frequently engages with: ${topPrefs.map(p => p.preference).join(', ')}`);
    }

    // Insight from timing
    const timingInsights = Array.from(this.timingPatterns.entries())
      .filter(([_, pattern]) => pattern.confidence > 0.7)
      .map(([activity, pattern]) => {
        const hours = pattern.preferredTimes.map(t => t.getHours()).join(', ');
        return `${activity} typically happens around ${hours}:00`;
      });
    insights.push(...timingInsights);

    // Insight from anomalies
    const recentAnomalies = this.getRecentAnomalies(24);
    if (recentAnomalies.length > 0) {
      insights.push(`${recentAnomalies.length} anomalies detected in last 24 hours`);
    }

    return insights;
  }

  /**
   * Export data for analysis
   */
  async exportData(): Promise<any> {
    return {
      interactions: this.userInteractions.slice(-100),
      preferences: Array.from(this.userPreferences.values()),
      timingPatterns: Array.from(this.timingPatterns.values()),
      recentAnomalies: this.getRecentAnomalies(168), // Last week
      insights: this.getSystemInsights()
    };
  }
}

// Export singleton instance
export const adaptiveEngine = AdaptiveEngineV2.getInstance();
export default AdaptiveEngineV2;

