/**
 * Pattern Detector
 *
 * Identifies recurring patterns in test failures and system issues
 */

import { logger } from '../../backend/utils/logger';

export interface TestPattern {
  pattern: string;
  frequency: number;
  affectedModules: string[];
  firstSeen: string;
  lastSeen: string;
  severity: 'high' | 'medium' | 'low';
}

export interface TestAnalysisResult {
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  patterns: TestPattern[];
  trends: {
    improving: boolean;
    changeRate: number;
  };
}

export class PatternDetector {
  /**
   * Analyze test results for patterns
   */
  async analyzeTestResults(testData: any[]): Promise<TestAnalysisResult> {
    if (!testData || testData.length === 0) {
      return {
        totalTests: 0,
        passed: 0,
        failed: 0,
        passRate: 100,
        patterns: [],
        trends: { improving: true, changeRate: 0 },
      };
    }

    // Aggregate all test results
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    const failuresByModule: Map<string, number> = new Map();
    const failureMessages: Map<string, { count: number; modules: Set<string>; timestamps: string[] }> = new Map();

    for (const testRun of testData) {
      if (testRun.assertions) {
        totalTests += testRun.assertions.total || 0;
        passed += testRun.assertions.passed || 0;
        failed += testRun.assertions.failed || 0;
      }

      // Track failures by suite/module
      if (testRun.suites) {
        for (const suite of testRun.suites) {
          if (suite.status === 'failed') {
            const moduleName = suite.name || suite.id;
            failuresByModule.set(moduleName, (failuresByModule.get(moduleName) || 0) + 1);

            // Track failure pattern
            const pattern = this.extractFailurePattern(suite);
            if (pattern) {
              if (!failureMessages.has(pattern)) {
                failureMessages.set(pattern, { count: 0, modules: new Set(), timestamps: [] });
              }
              const entry = failureMessages.get(pattern)!;
              entry.count++;
              entry.modules.add(moduleName);
              entry.timestamps.push(testRun.timestamp || new Date().toISOString());
            }
          }
        }
      }
    }

    const passRate = totalTests > 0 ? (passed / totalTests) * 100 : 100;

    // Identify recurring patterns
    const patterns: TestPattern[] = Array.from(failureMessages.entries())
      .filter(([_, data]) => data.count > 1) // Only recurring failures
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.count,
        affectedModules: Array.from(data.modules),
        firstSeen: data.timestamps[0],
        lastSeen: data.timestamps[data.timestamps.length - 1],
        severity: this.calculateSeverity(data.count, data.modules.size),
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Calculate trends
    const trends = this.calculateTrends(testData);

    logger.info(
      `🔍 Pattern detection: ${patterns.length} recurring patterns found, pass rate: ${passRate.toFixed(1)}%`
    );

    return {
      totalTests,
      passed,
      failed,
      passRate,
      patterns,
      trends,
    };
  }

  /**
   * Extract failure pattern from test suite
   */
  private extractFailurePattern(suite: any): string | null {
    // Look for error messages or descriptions
    if (suite.error) {
      return this.normalizePattern(suite.error);
    }

    if (suite.errorMessage) {
      return this.normalizePattern(suite.errorMessage);
    }

    if (suite.failures && suite.failures.length > 0) {
      return this.normalizePattern(suite.failures[0].message || suite.failures[0].error);
    }

    return null;
  }

  /**
   * Normalize error pattern (remove dynamic parts like IDs, timestamps)
   */
  private normalizePattern(message: string): string {
    return message
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '<TIMESTAMP>')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>')
      .replace(/\b\d+\b/g, '<NUM>')
      .replace(/line \d+/g, 'line <NUM>')
      .replace(/port \d+/g, 'port <NUM>')
      .trim();
  }

  /**
   * Calculate severity based on frequency and spread
   */
  private calculateSeverity(frequency: number, moduleCount: number): 'high' | 'medium' | 'low' {
    if (frequency > 5 || moduleCount > 3) {
      return 'high';
    }
    if (frequency > 2 || moduleCount > 1) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate trends from historical data
   */
  private calculateTrends(testData: any[]): { improving: boolean; changeRate: number } {
    if (testData.length < 2) {
      return { improving: true, changeRate: 0 };
    }

    // Sort by timestamp
    const sorted = [...testData].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });

    // Compare recent vs older pass rates
    const recent = sorted.slice(-3); // Last 3 runs
    const older = sorted.slice(0, 3); // First 3 runs

    const recentPassRate = this.calculateAveragePassRate(recent);
    const olderPassRate = this.calculateAveragePassRate(older);

    const changeRate = recentPassRate - olderPassRate;
    const improving = changeRate >= 0;

    return { improving, changeRate };
  }

  /**
   * Calculate average pass rate from test runs
   */
  private calculateAveragePassRate(runs: any[]): number {
    if (runs.length === 0) return 100;

    const rates = runs
      .filter(run => run.assertions && run.assertions.total > 0)
      .map(run => (run.assertions.passed / run.assertions.total) * 100);

    if (rates.length === 0) return 100;

    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  }
}
