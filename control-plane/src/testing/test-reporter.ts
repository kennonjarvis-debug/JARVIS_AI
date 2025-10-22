/**
 * Test Reporter
 * Generates and saves test reports
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { TestReport, TestResult } from './types';

export class TestReporter {
  private readonly reportPath: string;

  constructor(reportPath: string = '/Users/benkennon/Jarvis/data/test-reports') {
    this.reportPath = reportPath;
  }

  /**
   * Generate and save test report
   */
  async generateReport(report: TestReport): Promise<void> {
    // Ensure report directory exists
    await this.ensureDirectoryExists();

    // Save JSON report
    await this.saveJsonReport(report);

    // Append to audit log
    await this.appendToAuditLog(report);
  }

  /**
   * Save report as JSON file
   */
  private async saveJsonReport(report: TestReport): Promise<void> {
    const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
    const filename = `${report.suite}_${timestamp}.json`;
    const filepath = path.join(this.reportPath, filename);

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`   =Ä Report saved: ${filepath}`);
  }

  /**
   * Append to audit log
   */
  private async appendToAuditLog(report: TestReport): Promise<void> {
    const logPath = path.join(this.reportPath, 'test-audit.log');

    const logEntry = `${report.timestamp.toISOString()} | ${report.suite} | ` +
      `TOTAL: ${report.total_tests} | PASSED: ${report.passed} | FAILED: ${report.failed} | ` +
      `AVG_TIME: ${report.avg_response_time.toFixed(2)}ms\n`;

    await fs.appendFile(logPath, logEntry);
  }

  /**
   * Get all test reports for a suite
   */
  async getReportsForSuite(suiteName: string): Promise<TestReport[]> {
    const files = await fs.readdir(this.reportPath);
    const suiteFiles = files.filter(f => f.startsWith(suiteName) && f.endsWith('.json'));

    const reports: TestReport[] = [];

    for (const file of suiteFiles) {
      const content = await fs.readFile(path.join(this.reportPath, file), 'utf-8');
      reports.push(JSON.parse(content));
    }

    return reports.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get test summary statistics
   */
  async getTestSummary(suiteName: string, days: number = 7): Promise<any> {
    const reports = await this.getReportsForSuite(suiteName);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentReports = reports.filter(r => new Date(r.timestamp) >= cutoffDate);

    if (recentReports.length === 0) {
      return null;
    }

    const totalTests = recentReports.reduce((sum, r) => sum + r.total_tests, 0);
    const totalPassed = recentReports.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = recentReports.reduce((sum, r) => sum + r.failed, 0);
    const avgResponseTime = recentReports.reduce((sum, r) =>
      sum + r.avg_response_time, 0) / recentReports.length;

    return {
      suite: suiteName,
      period_days: days,
      total_runs: recentReports.length,
      total_tests: totalTests,
      total_passed: totalPassed,
      total_failed: totalFailed,
      success_rate: (totalPassed / totalTests) * 100,
      avg_response_time: avgResponseTime
    };
  }

  /**
   * Ensure report directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.reportPath);
    } catch {
      await fs.mkdir(this.reportPath, { recursive: true });
    }
  }
}
