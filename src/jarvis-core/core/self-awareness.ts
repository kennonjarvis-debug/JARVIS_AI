/**
 * Jarvis Self-Awareness Engine
 * Tracks system vitality, satisfaction, and performance
 *
 * Monitors:
 * - Vitality Index (0-100)
 * - Uptime and availability
 * - Resource usage (CPU, memory, disk)
 * - Error rate and recovery
 * - Module health
 * - Action success rate
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { adaptiveEngine } from './adaptive-engine';
import { clearanceSystem } from './clearance-system';
import { moduleRegistry } from './module-registry';
import * as os from 'os';

/**
 * Vitality components that contribute to overall index
 */
export interface VitalityComponents {
  uptime: number; // 0-100 (based on uptime vs expected)
  resources: number; // 0-100 (inverse of resource usage)
  errorRate: number; // 0-100 (inverse of error rate)
  moduleHealth: number; // 0-100 (based on module health)
  actionSuccess: number; // 0-100 (based on action success rate)
}

/**
 * Self-evaluation result
 */
export interface SelfEvaluation {
  vitalityIndex: number; // 0-100
  components: VitalityComponents;
  satisfaction: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  mood: 'struggling' | 'recovering' | 'stable' | 'thriving' | 'excellent';
  concerns: string[];
  strengths: string[];
  suggestedImprovements: string[];
  timestamp: Date;
}

/**
 * Weekly vitality report
 */
export interface WeeklyVitalityReport {
  weekStart: Date;
  weekEnd: Date;
  avgVitalityIndex: number;
  peakVitality: number;
  lowestVitality: number;
  uptime: {
    totalSeconds: number;
    percentage: number;
    downtime: number;
  };
  resources: {
    avgCpuUsage: number;
    avgMemoryUsage: number;
    peakMemoryUsage: number;
  };
  performance: {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    successRate: number;
  };
  learnings: {
    totalLearnings: number;
    successRate: number;
    avgPerformanceImpact: number;
  };
  anomalies: {
    detected: number;
    resolved: number;
  };
  improvements: {
    suggested: number;
    applied: number;
  };
  satisfaction: string;
  weeklyHighlights: string[];
  areasForImprovement: string[];
  generatedAt: Date;
}

/**
 * Self-report for external queries
 */
export interface SelfReport {
  status: 'healthy' | 'degraded' | 'critical';
  vitalityIndex: number;
  uptime: string;
  currentMood: string;
  recentAccomplishments: string[];
  currentConcerns: string[];
  capabilities: {
    totalModules: number;
    activeModules: number;
    availableActions: number;
  };
  performance: {
    recentSuccessRate: number;
    actionsExecutedToday: number;
    learningsRecordedToday: number;
  };
  timestamp: Date;
}

/**
 * Self-Awareness Engine - Jarvis's consciousness layer
 */
export class SelfAwarenessEngine extends EventEmitter {
  private static instance: SelfAwarenessEngine;
  private startTime: Date = new Date();
  private lastDowntime?: Date;
  private totalDowntimeMs = 0;
  private errorCount = 0;
  private totalActionsTracked = 0;
  private vitalityHistory: Array<{ timestamp: Date; index: number }> = [];
  private maxHistorySize = 10000;
  private reportPath = path.join(process.cwd(), 'logs/jarvis/vitality-reports');

  private constructor() {
    super();
    this.ensureReportDirectory();
    this.startPeriodicEvaluation();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SelfAwarenessEngine {
    if (!SelfAwarenessEngine.instance) {
      SelfAwarenessEngine.instance = new SelfAwarenessEngine();
    }
    return SelfAwarenessEngine.instance;
  }

  /**
   * Ensure report directory exists
   */
  private async ensureReportDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.reportPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create vitality report directory', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Start periodic self-evaluation
   */
  private startPeriodicEvaluation(): void {
    // Evaluate every 10 minutes
    setInterval(async () => {
      const evaluation = await this.selfEvaluation();
      this.emit('self:evaluation', evaluation);

      // Log if vitality is concerning
      if (evaluation.vitalityIndex < 50) {
        logger.warn('Low vitality index detected', {
          vitalityIndex: evaluation.vitalityIndex,
          mood: evaluation.mood,
          concerns: evaluation.concerns,
        });
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Compute vitality index (0-100)
   */
  private async computeVitalityIndex(): Promise<{ index: number; components: VitalityComponents }> {
    // 1. Uptime component (0-100)
    const uptimeMs = Date.now() - this.startTime.getTime();
    const totalTimeMs = uptimeMs + this.totalDowntimeMs;
    const uptimePercentage = totalTimeMs > 0 ? (uptimeMs / totalTimeMs) * 100 : 100;
    const uptimeScore = Math.min(100, uptimePercentage);

    // 2. Resource component (0-100)
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const memoryPercentage = (memoryUsage.heapUsed / totalMemory) * 100;
    const cpuLoad = os.loadavg()[0]; // 1-minute average
    const cpuCount = os.cpus().length;
    const cpuPercentage = (cpuLoad / cpuCount) * 100;

    // Lower is better for resources, so invert
    const resourceScore = Math.max(0, 100 - Math.min(100, (memoryPercentage + cpuPercentage) / 2));

    // 3. Error rate component (0-100)
    const recentActions = this.totalActionsTracked || 1; // Avoid division by zero
    const errorRate = (this.errorCount / recentActions) * 100;
    const errorScore = Math.max(0, 100 - errorRate);

    // 4. Module health component (0-100)
    const stats = moduleRegistry.getStats();
    const healthyModules = stats.moduleList.filter(m => m.initialized).length;
    const totalModules = stats.totalModules || 1;
    const moduleHealthScore = (healthyModules / totalModules) * 100;

    // 5. Action success component (0-100)
    const clearanceStats = clearanceSystem.getStats();
    const actionSuccessScore = clearanceStats.successRate || 0;

    // Compute weighted average
    const components: VitalityComponents = {
      uptime: Math.round(uptimeScore),
      resources: Math.round(resourceScore),
      errorRate: Math.round(errorScore),
      moduleHealth: Math.round(moduleHealthScore),
      actionSuccess: Math.round(actionSuccessScore),
    };

    const vitalityIndex = Math.round(
      uptimeScore * 0.25 +
      resourceScore * 0.2 +
      errorScore * 0.2 +
      moduleHealthScore * 0.2 +
      actionSuccessScore * 0.15
    );

    return { index: vitalityIndex, components };
  }

  /**
   * Perform self-evaluation
   */
  async selfEvaluation(): Promise<SelfEvaluation> {
    const { index: vitalityIndex, components } = await this.computeVitalityIndex();

    // Record vitality history
    this.vitalityHistory.push({
      timestamp: new Date(),
      index: vitalityIndex,
    });

    // Trim history
    if (this.vitalityHistory.length > this.maxHistorySize) {
      this.vitalityHistory = this.vitalityHistory.slice(-this.maxHistorySize);
    }

    // Determine satisfaction level
    let satisfaction: SelfEvaluation['satisfaction'];
    if (vitalityIndex >= 90) satisfaction = 'very_high';
    else if (vitalityIndex >= 75) satisfaction = 'high';
    else if (vitalityIndex >= 50) satisfaction = 'moderate';
    else if (vitalityIndex >= 25) satisfaction = 'low';
    else satisfaction = 'very_low';

    // Determine mood
    let mood: SelfEvaluation['mood'];
    if (vitalityIndex >= 90) mood = 'excellent';
    else if (vitalityIndex >= 75) mood = 'thriving';
    else if (vitalityIndex >= 50) mood = 'stable';
    else if (vitalityIndex >= 25) mood = 'recovering';
    else mood = 'struggling';

    // Identify concerns
    const concerns: string[] = [];
    if (components.uptime < 90) concerns.push('System uptime below optimal levels');
    if (components.resources < 60) concerns.push('High resource usage detected');
    if (components.errorRate < 80) concerns.push('Elevated error rate observed');
    if (components.moduleHealth < 90) concerns.push('Some modules experiencing issues');
    if (components.actionSuccess < 70) concerns.push('Action success rate needs improvement');

    // Identify strengths
    const strengths: string[] = [];
    if (components.uptime >= 95) strengths.push('Excellent uptime and availability');
    if (components.resources >= 80) strengths.push('Efficient resource utilization');
    if (components.errorRate >= 90) strengths.push('Low error rate maintained');
    if (components.moduleHealth >= 95) strengths.push('All modules operating optimally');
    if (components.actionSuccess >= 85) strengths.push('High action success rate');

    // Generate improvement suggestions
    const suggestedImprovements: string[] = [];
    if (components.resources < 70) {
      suggestedImprovements.push('Consider optimizing memory usage or scaling resources');
    }
    if (components.errorRate < 80) {
      suggestedImprovements.push('Review error logs and implement error reduction strategies');
    }
    if (components.actionSuccess < 75) {
      suggestedImprovements.push('Analyze failed actions and improve action planning');
    }

    // Get learning insights
    const learningInsights = adaptiveEngine.getLearningInsights();
    if (learningInsights.avgPerformanceImpact < 0) {
      suggestedImprovements.push('Recent actions showing negative impact - review decision criteria');
    }

    const evaluation: SelfEvaluation = {
      vitalityIndex,
      components,
      satisfaction,
      mood,
      concerns,
      strengths,
      suggestedImprovements,
      timestamp: new Date(),
    };

    logger.info('Self-evaluation completed', {
      vitalityIndex,
      satisfaction,
      mood,
      concernsCount: concerns.length,
      strengthsCount: strengths.length,
    });

    return evaluation;
  }

  /**
   * Generate weekly vitality report
   */
  async generateWeeklyReport(): Promise<WeeklyVitalityReport> {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get vitality history for the week
    const weekHistory = this.vitalityHistory.filter(
      h => h.timestamp >= weekStart && h.timestamp <= now
    );

    const avgVitalityIndex = weekHistory.length > 0
      ? Math.round(weekHistory.reduce((sum, h) => sum + h.index, 0) / weekHistory.length)
      : 0;

    const peakVitality = weekHistory.length > 0
      ? Math.max(...weekHistory.map(h => h.index))
      : 0;

    const lowestVitality = weekHistory.length > 0
      ? Math.min(...weekHistory.map(h => h.index))
      : 0;

    // Uptime statistics
    const totalSeconds = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
    const downtimeSeconds = Math.floor(this.totalDowntimeMs / 1000);
    const uptimePercentage = totalSeconds > 0
      ? ((totalSeconds - downtimeSeconds) / totalSeconds) * 100
      : 100;

    // Resource statistics
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const avgMemoryUsage = Math.round((memoryUsage.heapUsed / totalMemory) * 100 * 100) / 100;
    const peakMemoryUsage = Math.round((memoryUsage.heapTotal / totalMemory) * 100 * 100) / 100;
    const cpuLoad = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    const avgCpuUsage = Math.round((cpuLoad / cpuCount) * 100 * 100) / 100;

    // Performance statistics
    const clearanceStats = clearanceSystem.getStats();
    const totalActions = clearanceStats.executionHistory;
    const successfulActions = Math.round(totalActions * (clearanceStats.successRate / 100));
    const failedActions = totalActions - successfulActions;

    // Learning statistics
    const learningInsights = adaptiveEngine.getLearningInsights();

    // Anomaly statistics
    const anomalies = adaptiveEngine.getAnomalies(false); // All anomalies
    const weekAnomalies = anomalies.filter(a => a.detectedAt >= weekStart);
    const resolvedAnomalies = weekAnomalies.filter(a => a.resolved);

    // Improvement statistics
    const improvements = adaptiveEngine.getImprovements(false); // All improvements
    const weekImprovements = improvements.filter(i => i.createdAt >= weekStart);
    const appliedImprovements = weekImprovements.filter(i => i.applied);

    // Determine satisfaction
    let satisfaction: string;
    if (avgVitalityIndex >= 90) satisfaction = 'Highly satisfied - performing excellently';
    else if (avgVitalityIndex >= 75) satisfaction = 'Satisfied - performing well';
    else if (avgVitalityIndex >= 50) satisfaction = 'Moderately satisfied - stable operation';
    else if (avgVitalityIndex >= 25) satisfaction = 'Concerned - performance needs attention';
    else satisfaction = 'Struggling - immediate attention required';

    // Generate highlights
    const weeklyHighlights: string[] = [];
    if (uptimePercentage >= 99) weeklyHighlights.push('Maintained exceptional uptime (>99%)');
    if (clearanceStats.successRate >= 90) weeklyHighlights.push('Achieved >90% action success rate');
    if (learningInsights.avgPerformanceImpact > 10) weeklyHighlights.push('Positive performance impact from learnings');
    if (appliedImprovements.length > 0) weeklyHighlights.push(`Applied ${appliedImprovements.length} autonomous improvements`);
    if (resolvedAnomalies.length > 0) weeklyHighlights.push(`Detected and resolved ${resolvedAnomalies.length} anomalies`);

    // Generate areas for improvement
    const areasForImprovement: string[] = [];
    if (uptimePercentage < 95) areasForImprovement.push('Improve system uptime and stability');
    if (avgMemoryUsage > 80) areasForImprovement.push('Optimize memory usage');
    if (clearanceStats.successRate < 80) areasForImprovement.push('Increase action success rate');
    if (learningInsights.avgPerformanceImpact < 0) areasForImprovement.push('Review decision-making criteria');
    if (weekAnomalies.length - resolvedAnomalies.length > 0) {
      areasForImprovement.push(`Resolve ${weekAnomalies.length - resolvedAnomalies.length} unresolved anomalies`);
    }

    const report: WeeklyVitalityReport = {
      weekStart,
      weekEnd: now,
      avgVitalityIndex,
      peakVitality,
      lowestVitality,
      uptime: {
        totalSeconds,
        percentage: Math.round(uptimePercentage * 100) / 100,
        downtime: downtimeSeconds,
      },
      resources: {
        avgCpuUsage,
        avgMemoryUsage,
        peakMemoryUsage,
      },
      performance: {
        totalActions,
        successfulActions,
        failedActions,
        successRate: clearanceStats.successRate,
      },
      learnings: {
        totalLearnings: learningInsights.totalLearnings,
        successRate: learningInsights.successRate,
        avgPerformanceImpact: learningInsights.avgPerformanceImpact,
      },
      anomalies: {
        detected: weekAnomalies.length,
        resolved: resolvedAnomalies.length,
      },
      improvements: {
        suggested: weekImprovements.length,
        applied: appliedImprovements.length,
      },
      satisfaction,
      weeklyHighlights,
      areasForImprovement,
      generatedAt: now,
    };

    // Save report to file
    await this.saveWeeklyReport(report);

    logger.info('Weekly vitality report generated', {
      avgVitalityIndex,
      satisfaction,
      highlightsCount: weeklyHighlights.length,
      improvementsCount: areasForImprovement.length,
    });

    this.emit('report:weekly', report);

    return report;
  }

  /**
   * Save weekly report to file
   */
  private async saveWeeklyReport(report: WeeklyVitalityReport): Promise<void> {
    try {
      const filename = `vitality-report-${report.weekStart.toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.reportPath, filename);

      await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf8');

      logger.info('Weekly vitality report saved', { filepath });
    } catch (error) {
      logger.error('Failed to save weekly vitality report', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get self-report for external queries
   */
  async getSelfReport(): Promise<SelfReport> {
    const evaluation = await this.selfEvaluation();
    const clearanceStats = clearanceSystem.getStats();
    const moduleStats = moduleRegistry.getStats();

    // Determine status
    let status: SelfReport['status'];
    if (evaluation.vitalityIndex >= 70) status = 'healthy';
    else if (evaluation.vitalityIndex >= 40) status = 'degraded';
    else status = 'critical';

    // Format uptime
    const uptimeMs = Date.now() - this.startTime.getTime();
    const days = Math.floor(uptimeMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptimeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((uptimeMs % (60 * 60 * 1000)) / (60 * 1000));
    const uptime = `${days}d ${hours}h ${minutes}m`;

    // Recent accomplishments
    const recentAccomplishments: string[] = [];
    if (evaluation.strengths.length > 0) {
      recentAccomplishments.push(...evaluation.strengths);
    }
    const learningInsights = adaptiveEngine.getLearningInsights();
    if (learningInsights.topLearnings.length > 0) {
      recentAccomplishments.push(...learningInsights.topLearnings.slice(-3));
    }

    // Current concerns
    const currentConcerns = evaluation.concerns.length > 0
      ? evaluation.concerns
      : ['No major concerns at this time'];

    // Capabilities
    const capabilities = {
      totalModules: moduleStats.totalModules,
      activeModules: moduleStats.initializedModules,
      availableActions: clearanceStats.pendingActions + clearanceStats.executionHistory,
    };

    // Performance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActions = clearanceSystem.getExecutionHistory(1000)
      .filter(a => a.requestedAt >= today);
    const todayLearnings = learningInsights.topLearnings.length; // Simplified

    const performance = {
      recentSuccessRate: clearanceStats.successRate,
      actionsExecutedToday: todayActions.length,
      learningsRecordedToday: todayLearnings,
    };

    const report: SelfReport = {
      status,
      vitalityIndex: evaluation.vitalityIndex,
      uptime,
      currentMood: `${evaluation.mood} (${evaluation.satisfaction})`,
      recentAccomplishments: recentAccomplishments.slice(0, 5),
      currentConcerns: currentConcerns.slice(0, 5),
      capabilities,
      performance,
      timestamp: new Date(),
    };

    logger.info('Self-report generated', {
      status,
      vitalityIndex: evaluation.vitalityIndex,
      mood: evaluation.mood,
    });

    return report;
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errorCount++;
  }

  /**
   * Record an action
   */
  recordAction(): void {
    this.totalActionsTracked++;
  }

  /**
   * Record downtime
   */
  recordDowntime(durationMs: number): void {
    this.totalDowntimeMs += durationMs;
    this.lastDowntime = new Date();
  }

  /**
   * Get current vitality index
   */
  async getCurrentVitality(): Promise<number> {
    const { index } = await this.computeVitalityIndex();
    return index;
  }

  /**
   * Get vitality history
   */
  getVitalityHistory(limit = 100): Array<{ timestamp: Date; index: number }> {
    return this.vitalityHistory.slice(-limit);
  }

  /**
   * Get uptime
   */
  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Get statistics
   */
  getStats(): {
    uptime: number;
    errorCount: number;
    totalActionsTracked: number;
    currentVitality: number;
    historySize: number;
  } {
    return {
      uptime: this.getUptime(),
      errorCount: this.errorCount,
      totalActionsTracked: this.totalActionsTracked,
      currentVitality: this.vitalityHistory.length > 0
        ? this.vitalityHistory[this.vitalityHistory.length - 1].index
        : 0,
      historySize: this.vitalityHistory.length,
    };
  }
}

// Export singleton instance
export const selfAwareness = SelfAwarenessEngine.getInstance();
