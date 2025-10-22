/**
 * Insight Engine - Intelligent Analysis & Recommendations
 *
 * Generates actionable insights from learned patterns,
 * detects anomalies, and identifies optimization opportunities.
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { logger } from '../../utils/logger.js';
import {
  InsightGeneration,
  DataPoint,
  Action,
  Impact,
  LearningPattern
} from './types.js';

export class InsightEngine extends EventEmitter {
  private static instance: InsightEngine;
  private insights: InsightGeneration[] = [];
  private dataHistory: DataPoint[] = [];
  private readonly MAX_INSIGHTS = 50;
  private readonly MAX_DATA_POINTS = 1000;

  private constructor() {
    super();
  }

  public static getInstance(): InsightEngine {
    if (!InsightEngine.instance) {
      InsightEngine.instance = new InsightEngine();
    }
    return InsightEngine.instance;
  }

  /**
   * Generate insights from patterns and data
   */
  public generateInsights(
    patterns: LearningPattern[],
    context: Record<string, any>
  ): InsightGeneration[] {
    const newInsights: InsightGeneration[] = [];

    // Detect optimization opportunities
    const optimizations = this.findOptimizations(patterns, context);
    newInsights.push(...optimizations);

    // Detect anomalies
    if (this.dataHistory.length > 10) {
      const anomalies = this.detectAnomalies(this.dataHistory);
      newInsights.push(...anomalies);
    }

    // Identify efficiency improvements
    const efficiencies = this.identifyEfficiencies(patterns);
    newInsights.push(...efficiencies);

    // Store new insights
    for (const insight of newInsights) {
      this.addInsight(insight);
    }

    return newInsights;
  }

  /**
   * Record data point for analysis
   */
  public recordDataPoint(dataPoint: DataPoint): void {
    this.dataHistory.push(dataPoint);

    // Keep history limited
    if (this.dataHistory.length > this.MAX_DATA_POINTS) {
      this.dataHistory = this.dataHistory.slice(-this.MAX_DATA_POINTS);
    }

    // Check for real-time anomalies
    this.checkRealtimeAnomalies(dataPoint);
  }

  /**
   * Find optimization opportunities
   */
  private findOptimizations(
    patterns: LearningPattern[],
    context: Record<string, any>
  ): InsightGeneration[] {
    const insights: InsightGeneration[] = [];

    // Find repetitive patterns that could be automated
    const repetitivePatterns = patterns.filter(
      p => p.occurrences > 5 && p.confidence > 0.8
    );

    for (const pattern of repetitivePatterns) {
      if (this.shouldSuggestAutomation(pattern)) {
        insights.push({
          id: randomUUID(),
          type: 'optimization',
          title: `Automate ${pattern.pattern.action || 'recurring task'}`,
          description: `This action has been performed ${pattern.occurrences} times with ${(pattern.confidence * 100).toFixed(0)}% consistency. Consider automating it.`,
          severity: 'medium',
          confidence: pattern.confidence,
          dataPoints: [],
          suggestedActions: [{
            id: randomUUID(),
            type: 'automate',
            description: `Create automation rule for: ${pattern.pattern.action}`,
            parameters: pattern.pattern,
            risk: 'low',
            reversible: true
          }],
          predictedImpact: {
            metric: 'time_saved',
            currentValue: 0,
            predictedValue: pattern.occurrences * 2, // Assume 2 min per action
            improvement: 100,
            timeframe: '1 week',
            confidence: 0.85
          },
          created: new Date()
        });
      }
    }

    return insights;
  }

  /**
   * Detect anomalies in data
   */
  public detectAnomalies(dataPoints: DataPoint[]): InsightGeneration[] {
    const insights: InsightGeneration[] = [];

    // Group by metric
    const byMetric = this.groupByMetric(dataPoints);

    for (const [metric, points] of byMetric.entries()) {
      if (points.length < 5) continue;

      const stats = this.calculateStats(points);
      const anomalies = points.filter(p =>
        this.isAnomaly(p.value as number, stats.mean, stats.stdDev)
      );

      if (anomalies.length > 0) {
        const latestAnomaly = anomalies[anomalies.length - 1];
        const deviation = Math.abs((latestAnomaly.value as number - stats.mean) / stats.mean * 100);

        insights.push({
          id: randomUUID(),
          type: 'anomaly',
          title: `Unusual ${metric} detected`,
          description: `${metric} is ${deviation.toFixed(1)}% ${(latestAnomaly.value as number) > stats.mean ? 'above' : 'below'} normal (${stats.mean.toFixed(2)})`,
          severity: this.determineSeverity(deviation),
          confidence: 0.9,
          dataPoints: anomalies.slice(-5),
          suggestedActions: [{
            id: randomUUID(),
            type: 'investigate',
            description: `Investigate cause of ${metric} anomaly`,
            risk: 'none',
            reversible: true
          }],
          predictedImpact: {
            metric,
            currentValue: latestAnomaly.value as number,
            predictedValue: stats.mean,
            improvement: -deviation,
            timeframe: 'immediate',
            confidence: 0.75
          },
          created: new Date()
        });
      }
    }

    return insights;
  }

  /**
   * Identify efficiency improvements
   */
  private identifyEfficiencies(patterns: LearningPattern[]): InsightGeneration[] {
    const insights: InsightGeneration[] = [];

    // Find patterns with negative reinforcement (failures)
    const problematicPatterns = patterns.filter(
      p => p.reinforcement < 0 && p.occurrences > 2
    );

    for (const pattern of problematicPatterns) {
      insights.push({
        id: randomUUID(),
        type: 'warning',
        title: `Repeated failure in ${pattern.pattern.domain || 'workflow'}`,
        description: `The action "${pattern.pattern.action}" has failed ${pattern.occurrences} times. This may indicate a systemic issue.`,
        severity: pattern.occurrences > 5 ? 'high' : 'medium',
        confidence: 0.85,
        dataPoints: [],
        suggestedActions: [
          {
            id: randomUUID(),
            type: 'investigate',
            description: 'Review logs and identify root cause',
            risk: 'none',
            reversible: true
          },
          {
            id: randomUUID(),
            type: 'adjust',
            description: 'Modify approach or parameters',
            parameters: pattern.pattern,
            risk: 'low',
            reversible: true
          }
        ],
        predictedImpact: {
          metric: 'success_rate',
          currentValue: 0,
          predictedValue: 85,
          improvement: 85,
          timeframe: '1 day',
          confidence: 0.7
        },
        created: new Date()
      });
    }

    return insights;
  }

  /**
   * Check for real-time anomalies
   */
  private checkRealtimeAnomalies(dataPoint: DataPoint): void {
    const recentPoints = this.dataHistory
      .filter(p => p.metric === dataPoint.metric)
      .slice(-20);

    if (recentPoints.length < 5) return;

    const stats = this.calculateStats(recentPoints);
    if (this.isAnomaly(dataPoint.value as number, stats.mean, stats.stdDev)) {
      this.emit('anomaly-detected', {
        metric: dataPoint.metric,
        value: dataPoint.value,
        expected: stats.mean,
        deviation: Math.abs(dataPoint.value as number - stats.mean)
      });
    }
  }

  /**
   * Add insight to collection
   */
  private addInsight(insight: InsightGeneration): void {
    // Check if similar insight already exists
    const exists = this.insights.some(i =>
      i.type === insight.type &&
      i.title === insight.title &&
      this.isRecent(i.created)
    );

    if (!exists) {
      this.insights.push(insight);

      // Keep limited
      if (this.insights.length > this.MAX_INSIGHTS) {
        this.insights = this.insights.slice(-this.MAX_INSIGHTS);
      }

      this.emit('insight-generated', insight);
      logger.info(`💡 Generated ${insight.type} insight: ${insight.title}`);
    }
  }

  /**
   * Get recent insights
   */
  public getRecentInsights(limit: number = 10): InsightGeneration[] {
    return this.insights
      .filter(i => !i.expiresAt || i.expiresAt > new Date())
      .sort((a, b) => b.created.getTime() - a.created.getTime())
      .slice(0, limit);
  }

  /**
   * Get insights by type
   */
  public getInsightsByType(type: InsightGeneration['type']): InsightGeneration[] {
    return this.insights.filter(i => i.type === type);
  }

  /**
   * Get high priority insights
   */
  public getHighPriorityInsights(): InsightGeneration[] {
    return this.insights.filter(
      i => (i.severity === 'high' || i.severity === 'critical') &&
           (!i.expiresAt || i.expiresAt > new Date())
    );
  }

  /**
   * Dismiss insight
   */
  public dismissInsight(insightId: string): void {
    const index = this.insights.findIndex(i => i.id === insightId);
    if (index !== -1) {
      this.insights.splice(index, 1);
      this.emit('insight-dismissed', insightId);
    }
  }

  // Helper methods

  private shouldSuggestAutomation(pattern: LearningPattern): boolean {
    return pattern.type === 'behavioral' &&
           pattern.occurrences >= 5 &&
           pattern.confidence >= 0.8;
  }

  private groupByMetric(dataPoints: DataPoint[]): Map<string, DataPoint[]> {
    const groups = new Map<string, DataPoint[]>();

    for (const point of dataPoints) {
      if (!groups.has(point.metric)) {
        groups.set(point.metric, []);
      }
      groups.get(point.metric)!.push(point);
    }

    return groups;
  }

  private calculateStats(points: DataPoint[]): { mean: number; stdDev: number } {
    const values = points.map(p => p.value as number);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  private isAnomaly(value: number, mean: number, stdDev: number): boolean {
    const threshold = 2; // 2 standard deviations
    return Math.abs(value - mean) > threshold * stdDev;
  }

  private determineSeverity(deviation: number): InsightGeneration['severity'] {
    if (deviation > 50) return 'critical';
    if (deviation > 30) return 'high';
    if (deviation > 15) return 'medium';
    return 'low';
  }

  private isRecent(date: Date): boolean {
    const hoursSince = (Date.now() - date.getTime()) / (1000 * 60 * 60);
    return hoursSince < 24;
  }

  /**
   * Clear old insights
   */
  public clearExpiredInsights(): void {
    const now = new Date();
    const before = this.insights.length;

    this.insights = this.insights.filter(
      i => !i.expiresAt || i.expiresAt > now
    );

    const removed = before - this.insights.length;
    if (removed > 0) {
      logger.debug(`🧹 Cleared ${removed} expired insights`);
    }
  }

  /**
   * Get statistics
   */
  public getStats(): {
    totalInsights: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const insight of this.insights) {
      byType[insight.type] = (byType[insight.type] || 0) + 1;
      bySeverity[insight.severity] = (bySeverity[insight.severity] || 0) + 1;
    }

    return {
      totalInsights: this.insights.length,
      byType,
      bySeverity
    };
  }
}

// Export singleton
export const insightEngine = InsightEngine.getInstance();
