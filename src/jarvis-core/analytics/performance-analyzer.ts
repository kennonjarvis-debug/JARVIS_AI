/**
 * Performance Analyzer
 *
 * Detects performance regressions and module health degradation
 */

import { logger } from '../../backend/utils/logger';

export interface ModuleHealth {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  metrics: {
    avgResponseTime?: number;
    successRate?: number;
    errorRate?: number;
    throughput?: number;
  };
}

export interface PerformanceAnalysisResult {
  moduleHealth: {
    [moduleName: string]: ModuleHealth;
  };
  regressions: Array<{
    module: string;
    metric: string;
    degradation: number;
    timestamp: string;
  }>;
  improvements: Array<{
    module: string;
    metric: string;
    improvement: number;
  }>;
}

export class PerformanceAnalyzer {
  /**
   * Analyze performance data for regressions
   */
  async analyze(performanceData: any[]): Promise<PerformanceAnalysisResult> {
    if (!performanceData || performanceData.length === 0) {
      return {
        moduleHealth: {},
        regressions: [],
        improvements: [],
      };
    }

    // Group data by module
    const moduleData = this.groupByModule(performanceData);

    // Analyze each module
    const moduleHealth: PerformanceAnalysisResult['moduleHealth'] = {};
    const regressions: PerformanceAnalysisResult['regressions'] = [];
    const improvements: PerformanceAnalysisResult['improvements'] = [];

    for (const [moduleName, data] of Object.entries(moduleData)) {
      const health = this.analyzeModuleHealth(moduleName, data);
      moduleHealth[moduleName] = health;

      // Detect regressions
      const moduleRegressions = this.detectRegressions(moduleName, data);
      regressions.push(...moduleRegressions);

      // Detect improvements
      const moduleImprovements = this.detectImprovements(moduleName, data);
      improvements.push(...moduleImprovements);
    }

    logger.info(
      `📈 Performance analysis: ${Object.keys(moduleHealth).length} modules, ` +
      `${regressions.length} regressions, ${improvements.length} improvements`
    );

    return {
      moduleHealth,
      regressions,
      improvements,
    };
  }

  /**
   * Group performance data by module
   */
  private groupByModule(data: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();

    for (const entry of data) {
      if (entry.type === 'metric' && entry.data) {
        const moduleName = entry.data.moduleName || 'unknown';
        if (!grouped.has(moduleName)) {
          grouped.set(moduleName, []);
        }
        grouped.get(moduleName)!.push(entry);
      }

      if (entry.type === 'performance_analysis' && entry.data?.moduleScores) {
        for (const [modName, score] of Object.entries(entry.data.moduleScores)) {
          if (!grouped.has(modName)) {
            grouped.set(modName, []);
          }
          grouped.get(modName)!.push({
            ...entry,
            data: { ...entry.data, moduleName: modName, score },
          });
        }
      }
    }

    return grouped;
  }

  /**
   * Analyze health of a single module
   */
  private analyzeModuleHealth(moduleName: string, data: any[]): ModuleHealth {
    if (data.length === 0) {
      return {
        score: 0,
        status: 'critical',
        issues: ['No performance data available'],
        recommendations: ['Enable performance monitoring for this module'],
        metrics: {},
      };
    }

    // Extract metrics
    const recentData = data.slice(-10); // Last 10 data points
    const scores: number[] = [];
    let successRateSum = 0;
    let successRateCount = 0;

    for (const entry of recentData) {
      if (entry.data?.score !== undefined) {
        scores.push(entry.data.score);
      }
      if (entry.data?.value !== undefined) {
        successRateSum += entry.data.value;
        successRateCount++;
      }
    }

    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
    const avgSuccessRate = successRateCount > 0 ? successRateSum / successRateCount : 100;

    // Determine status and issues
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (avgScore < 70) {
      issues.push('Module score significantly below target (< 70)');
      recommendations.push('Investigate root cause of performance degradation');
      recommendations.push('Consider scaling resources or optimizing code');
    } else if (avgScore < 85) {
      issues.push('Module score below optimal range (< 85)');
      recommendations.push('Monitor for further degradation');
    }

    if (avgSuccessRate < 95) {
      issues.push(`Success rate below target: ${avgSuccessRate.toFixed(1)}%`);
      recommendations.push('Review error logs and failure patterns');
    }

    const status: ModuleHealth['status'] =
      avgScore >= 85 ? 'healthy' : avgScore >= 70 ? 'warning' : 'critical';

    return {
      score: Math.round(avgScore),
      status,
      issues,
      recommendations,
      metrics: {
        successRate: avgSuccessRate,
      },
    };
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(moduleName: string, data: any[]): Array<{
    module: string;
    metric: string;
    degradation: number;
    timestamp: string;
  }> {
    if (data.length < 10) return [];

    const regressions: any[] = [];
    const recent = data.slice(-5);
    const baseline = data.slice(-15, -10);

    if (baseline.length === 0 || recent.length === 0) return [];

    // Compare average scores
    const recentAvg = this.calculateAverage(recent, 'score');
    const baselineAvg = this.calculateAverage(baseline, 'score');

    if (recentAvg !== null && baselineAvg !== null && baselineAvg - recentAvg > 10) {
      regressions.push({
        module: moduleName,
        metric: 'overall_score',
        degradation: baselineAvg - recentAvg,
        timestamp: recent[recent.length - 1].timestamp || new Date().toISOString(),
      });
    }

    return regressions;
  }

  /**
   * Detect performance improvements
   */
  private detectImprovements(moduleName: string, data: any[]): Array<{
    module: string;
    metric: string;
    improvement: number;
  }> {
    if (data.length < 10) return [];

    const improvements: any[] = [];
    const recent = data.slice(-5);
    const baseline = data.slice(-15, -10);

    if (baseline.length === 0 || recent.length === 0) return [];

    const recentAvg = this.calculateAverage(recent, 'score');
    const baselineAvg = this.calculateAverage(baseline, 'score');

    if (recentAvg !== null && baselineAvg !== null && recentAvg - baselineAvg > 5) {
      improvements.push({
        module: moduleName,
        metric: 'overall_score',
        improvement: recentAvg - baselineAvg,
      });
    }

    return improvements;
  }

  /**
   * Calculate average of a metric
   */
  private calculateAverage(data: any[], field: string): number | null {
    const values = data
      .map(entry => {
        if (entry.data && typeof entry.data[field] === 'number') {
          return entry.data[field];
        }
        if (entry.data && entry.data.value !== undefined) {
          return entry.data.value;
        }
        return null;
      })
      .filter(v => v !== null) as number[];

    if (values.length === 0) return null;

    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}
