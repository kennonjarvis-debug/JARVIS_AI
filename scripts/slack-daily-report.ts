#!/usr/bin/env ts-node

/**
 * Daily Slack Test Report Generator
 * Analyzes test logs and sends a comprehensive daily summary to Slack
 */

import * as fs from 'fs';
import * as path from 'path';
import { SlackReporter } from './test-reporter';

interface DailyStats {
  date: string;
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  trends: string;
  testsByCategory: {
    unit: { passed: number; failed: number; total: number };
    e2e: { passed: number; failed: number; total: number };
    api: { passed: number; failed: number; total: number };
    automation: { passed: number; failed: number; total: number };
    journey: { passed: number; failed: number; total: number };
  };
  topFailures: Array<{ test: string; count: number }>;
  performanceMetrics: {
    fastest: { test: string; duration: number };
    slowest: { test: string; duration: number };
  };
}

class DailyReportGenerator {
  private logDir: string = path.join(process.cwd(), 'logs', 'tests');
  private slackReporter: SlackReporter;

  constructor() {
    this.slackReporter = new SlackReporter(
      process.env.SLACK_WEBHOOK_URL || ''
    );
  }

  private getLogsForDate(date: string): any[] {
    if (!fs.existsSync(this.logDir)) {
      return [];
    }

    const files = fs.readdirSync(this.logDir);
    const logs: any[] = [];

    files.forEach((file) => {
      if (file.startsWith('test-results-') && file.endsWith('.json')) {
        const filePath = path.join(this.logDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Check if log is from the specified date
        const logDate = new Date(data.timestamp).toISOString().split('T')[0];
        if (logDate === date) {
          logs.push(data);
        }
      }
    });

    return logs;
  }

  private analyzeData(logs: any[]): DailyStats {
    const date = new Date().toISOString().split('T')[0];
    const totalRuns = logs.length;

    let totalPassed = 0;
    let totalTests = 0;
    let totalDuration = 0;

    const failures: { [key: string]: number } = {};
    let fastestTest = { test: '', duration: Infinity };
    let slowestTest = { test: '', duration: 0 };

    const categoryStats = {
      unit: { passed: 0, failed: 0, total: 0 },
      e2e: { passed: 0, failed: 0, total: 0 },
      api: { passed: 0, failed: 0, total: 0 },
      automation: { passed: 0, failed: 0, total: 0 },
      journey: { passed: 0, failed: 0, total: 0 },
    };

    logs.forEach((log) => {
      totalDuration += log.totalDuration;

      log.results.forEach((result: any) => {
        totalTests++;

        if (result.status === 'passed') {
          totalPassed++;
        }

        // Track failures
        if (result.status === 'failed') {
          failures[result.suite] = (failures[result.suite] || 0) + 1;
        }

        // Track performance
        if (result.duration < fastestTest.duration) {
          fastestTest = { test: result.suite, duration: result.duration };
        }
        if (result.duration > slowestTest.duration) {
          slowestTest = { test: result.suite, duration: result.duration };
        }

        // Categorize
        const suiteLower = result.suite.toLowerCase();
        if (suiteLower.includes('unit')) {
          categoryStats.unit.total++;
          if (result.status === 'passed') categoryStats.unit.passed++;
          else categoryStats.unit.failed++;
        } else if (suiteLower.includes('e2e')) {
          categoryStats.e2e.total++;
          if (result.status === 'passed') categoryStats.e2e.passed++;
          else categoryStats.e2e.failed++;
        } else if (suiteLower.includes('api')) {
          categoryStats.api.total++;
          if (result.status === 'passed') categoryStats.api.passed++;
          else categoryStats.api.failed++;
        } else if (suiteLower.includes('automation')) {
          categoryStats.automation.total++;
          if (result.status === 'passed') categoryStats.automation.passed++;
          else categoryStats.automation.failed++;
        } else if (suiteLower.includes('journey')) {
          categoryStats.journey.total++;
          if (result.status === 'passed') categoryStats.journey.passed++;
          else categoryStats.journey.failed++;
        }
      });
    });

    const successRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    const avgDuration = totalRuns > 0 ? totalDuration / totalRuns / 1000 : 0;

    // Generate trends
    const trends = this.generateTrends(successRate, avgDuration);

    // Top failures
    const topFailures = Object.entries(failures)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([test, count]) => ({ test, count }));

    return {
      date,
      totalRuns,
      successRate,
      avgDuration,
      trends,
      testsByCategory: categoryStats,
      topFailures,
      performanceMetrics: {
        fastest: fastestTest,
        slowest: slowestTest,
      },
    };
  }

  private generateTrends(successRate: number, avgDuration: number): string {
    let trends = '';

    if (successRate >= 95) {
      trends += '🟢 Excellent success rate! ';
    } else if (successRate >= 85) {
      trends += '🟡 Good success rate, room for improvement. ';
    } else {
      trends += '🔴 Low success rate - investigation needed. ';
    }

    if (avgDuration < 60) {
      trends += 'Fast execution times. ';
    } else if (avgDuration < 120) {
      trends += 'Moderate execution times. ';
    } else {
      trends += 'Slow execution - optimization recommended. ';
    }

    return trends;
  }

  async generateReport(): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    console.log(`📊 Generating daily report for ${date}...`);

    const logs = this.getLogsForDate(date);

    if (logs.length === 0) {
      console.warn('⚠️  No test logs found for today');
      return;
    }

    const stats = this.analyzeData(logs);

    // Save report
    const reportPath = path.join(
      this.logDir,
      `daily-report-${date}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));

    console.log(`\n📄 Daily Report Saved: ${reportPath}`);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 DAILY TEST SUMMARY - ${stats.date}`);
    console.log('='.repeat(80));
    console.log(`Total Runs: ${stats.totalRuns}`);
    console.log(`Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`Average Duration: ${stats.avgDuration.toFixed(2)}s`);
    console.log(`\nTrends: ${stats.trends}`);

    console.log(`\n📦 Tests by Category:`);
    Object.entries(stats.testsByCategory).forEach(([category, data]) => {
      if (data.total > 0) {
        const rate = ((data.passed / data.total) * 100).toFixed(1);
        console.log(
          `  ${category.toUpperCase()}: ${data.passed}/${data.total} (${rate}%)`
        );
      }
    });

    if (stats.topFailures.length > 0) {
      console.log(`\n❌ Top Failures:`);
      stats.topFailures.forEach((failure, i) => {
        console.log(`  ${i + 1}. ${failure.test} (${failure.count}x)`);
      });
    }

    console.log(`\n⚡ Performance:`);
    console.log(
      `  Fastest: ${stats.performanceMetrics.fastest.test} (${(
        stats.performanceMetrics.fastest.duration / 1000
      ).toFixed(2)}s)`
    );
    console.log(
      `  Slowest: ${stats.performanceMetrics.slowest.test} (${(
        stats.performanceMetrics.slowest.duration / 1000
      ).toFixed(2)}s)`
    );

    // Send to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.slackReporter.sendDailyReport(stats);
    }

    console.log('\n✅ Daily report generated and sent to Slack');
  }
}

// Run if executed directly
if (require.main === module) {
  const generator = new DailyReportGenerator();
  generator.generateReport().catch((error) => {
    console.error('Error generating daily report:', error);
    process.exit(1);
  });
}

export { DailyReportGenerator };
