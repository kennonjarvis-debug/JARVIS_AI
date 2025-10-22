/**
 * Test Scheduler
 * Schedules and runs automated endpoint tests
 */

import * as cron from 'node-cron';
import { EndpointTester } from './endpoint-tester';
import { TestReporter } from './test-reporter';
import { TestSuite, TestReport } from './types';

export class TestScheduler {
  private readonly tester: EndpointTester;
  private readonly reporter: TestReporter;
  private readonly scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor(tester: EndpointTester, reporter: TestReporter) {
    this.tester = tester;
    this.reporter = reporter;
  }

  /**
   * Schedule a test suite to run on cron schedule
   */
  scheduleTestSuite(suite: TestSuite): void {
    if (!suite.enabled) {
      console.log(`⏸️  Test suite "${suite.name}" is disabled, skipping schedule`);
      return;
    }

    if (!suite.schedule) {
      console.log(`⚠️  Test suite "${suite.name}" has no schedule, skipping`);
      return;
    }

    // Cancel existing job if any
    if (this.scheduledJobs.has(suite.name)) {
      this.scheduledJobs.get(suite.name)!.stop();
    }

    // Schedule new job
    const job = cron.schedule(suite.schedule, async () => {
      await this.runTestSuite(suite);
    });

    this.scheduledJobs.set(suite.name, job);
    console.log(`✅ Scheduled test suite "${suite.name}" with schedule: ${suite.schedule}`);
  }

  /**
   * Run a test suite immediately
   */
  async runTestSuite(suite: TestSuite): Promise<TestReport> {
    console.log(`\n🧪 Running test suite: ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log(`   Testing ${suite.endpoints.length} endpoints...\n`);

    const results = await this.tester.testEndpoints(suite.endpoints);

    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;
    const avgResponseTime = results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length;

    const report: TestReport = {
      suite: suite.name,
      timestamp: new Date(),
      total_tests: results.length,
      passed,
      failed,
      avg_response_time: avgResponseTime,
      results
    };

    // Generate and save report
    await this.reporter.generateReport(report);

    // Log summary
    console.log(`\n📊 Test Suite Results: ${suite.name}`);
    console.log(`   Total: ${report.total_tests}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms\n`);

    // Alert on failures if configured
    if (failed > 0) {
      this.handleFailures(report);
    }

    return report;
  }

  /**
   * Run all scheduled test suites immediately
   */
  async runAllTestSuites(suites: TestSuite[]): Promise<TestReport[]> {
    const reports: TestReport[] = [];

    for (const suite of suites) {
      if (suite.enabled) {
        const report = await this.runTestSuite(suite);
        reports.push(report);
      }
    }

    return reports;
  }

  /**
   * Start all scheduled test suites
   */
  startAll(suites: TestSuite[]): void {
    console.log(`\n🚀 Starting Test Scheduler...`);

    for (const suite of suites) {
      this.scheduleTestSuite(suite);
    }

    console.log(`\n✅ Test Scheduler started with ${this.scheduledJobs.size} active schedules\n`);
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    console.log(`\n⏹️  Stopping all scheduled tests...`);

    for (const [name, job] of this.scheduledJobs.entries()) {
      job.stop();
      console.log(`   Stopped: ${name}`);
    }

    this.scheduledJobs.clear();
    console.log(`\n✅ All scheduled tests stopped\n`);
  }

  /**
   * Handle test failures
   */
  private handleFailures(report: TestReport): void {
    console.error(`\n🚨 Test Failures Detected in ${report.suite}:`);

    const failedTests = report.results.filter(r => !r.success);

    for (const test of failedTests) {
      console.error(`   ❌ ${test.endpoint}`);
      if (test.error) {
        console.error(`      Error: ${test.error}`);
      }
      if (test.validation_errors) {
        console.error(`      Validation Errors:`);
        test.validation_errors.forEach(err => console.error(`        - ${err}`));
      }
    }

    // TODO: Trigger autonomous recovery or alert human
  }
}
