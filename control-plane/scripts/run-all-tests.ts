#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SlackReporter } from './test-reporter';

interface TestSuite {
  name: string;
  command: string;
  enabled: boolean;
  parallel: boolean;
}

interface TestResult {
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  coverage?: number;
  errors?: string[];
  timestamp: string;
}

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();
  private logDir: string = path.join(process.cwd(), 'logs', 'tests');
  private slackReporter: SlackReporter;

  constructor() {
    this.ensureLogDirectory();
    this.slackReporter = new SlackReporter(
      process.env.SLACK_WEBHOOK_URL || ''
    );
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getTestSuites(): TestSuite[] {
    return [
      {
        name: 'Unit Tests (Vitest)',
        command: 'vitest run --coverage',
        enabled: true,
        parallel: true,
      },
      {
        name: 'Unit Tests (Jest)',
        command: 'jest --coverage --maxWorkers=50%',
        enabled: true,
        parallel: true,
      },
      {
        name: 'E2E Tests (Playwright)',
        command: 'playwright test',
        enabled: true,
        parallel: true,
      },
      {
        name: 'API Tests',
        command: 'playwright test --project=api',
        enabled: true,
        parallel: false,
      },
      {
        name: 'Automation Tests',
        command: 'ts-node tests/automation/run-automation-tests.ts',
        enabled: true,
        parallel: false,
      },
      {
        name: 'Journey Tests',
        command: 'ts-node tests/journeys/run-journey-tests.ts',
        enabled: true,
        parallel: false,
      },
    ];
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 Running: ${suite.name}`);
    console.log(`${'='.repeat(80)}\n`);

    const startTime = Date.now();
    const logFile = path.join(
      this.logDir,
      `${suite.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.log`
    );

    try {
      const output = execSync(suite.command, {
        encoding: 'utf-8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024,
      });

      // Save log
      fs.writeFileSync(logFile, output);

      // Parse coverage if available
      const coverage = this.parseCoverage(output);

      const duration = Date.now() - startTime;
      console.log(`✅ ${suite.name} passed in ${duration}ms`);

      return {
        suite: suite.name,
        status: 'passed',
        duration,
        coverage,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorOutput = error.stdout || error.stderr || error.message;

      // Save error log
      fs.writeFileSync(logFile, errorOutput);

      console.error(`❌ ${suite.name} failed in ${duration}ms`);
      console.error(errorOutput);

      return {
        suite: suite.name,
        status: 'failed',
        duration,
        errors: [errorOutput],
        timestamp: new Date().toISOString(),
      };
    }
  }

  private parseCoverage(output: string): number | undefined {
    // Parse coverage from Jest/Vitest output
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      return parseFloat(coverageMatch[1]);
    }

    // Parse coverage from lcov summary
    const statementsMatch = output.match(/Statements\s+:\s+([\d.]+)%/);
    if (statementsMatch) {
      return parseFloat(statementsMatch[1]);
    }

    return undefined;
  }

  private async runSequential(suites: TestSuite[]): Promise<void> {
    for (const suite of suites) {
      if (!suite.enabled) {
        this.results.push({
          suite: suite.name,
          status: 'skipped',
          duration: 0,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      const result = await this.runTestSuite(suite);
      this.results.push(result);

      // Fail fast on critical failures
      if (result.status === 'failed' && process.env.FAIL_FAST === 'true') {
        console.error('\n⚠️  Fail-fast enabled. Stopping test execution.');
        break;
      }
    }
  }

  private async runParallel(suites: TestSuite[]): Promise<void> {
    const promises = suites
      .filter((s) => s.enabled)
      .map((suite) => this.runTestSuite(suite));

    this.results = await Promise.all(promises);
  }

  private generateSummary(): string {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const total = this.results.length;

    const avgCoverage =
      this.results
        .filter((r) => r.coverage !== undefined)
        .reduce((sum, r) => sum + (r.coverage || 0), 0) /
      this.results.filter((r) => r.coverage !== undefined).length;

    let summary = `\n${'='.repeat(80)}\n`;
    summary += `📊 TEST SUMMARY\n`;
    summary += `${'='.repeat(80)}\n\n`;
    summary += `Total Suites: ${total}\n`;
    summary += `✅ Passed: ${passed}\n`;
    summary += `❌ Failed: ${failed}\n`;
    summary += `⏭️  Skipped: ${skipped}\n`;
    summary += `⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s\n`;

    if (avgCoverage) {
      summary += `📈 Average Coverage: ${avgCoverage.toFixed(2)}%\n`;
    }

    summary += `\n${'='.repeat(80)}\n`;
    summary += `DETAILED RESULTS:\n`;
    summary += `${'='.repeat(80)}\n\n`;

    this.results.forEach((result) => {
      const icon =
        result.status === 'passed'
          ? '✅'
          : result.status === 'failed'
          ? '❌'
          : '⏭️';
      summary += `${icon} ${result.suite}\n`;
      summary += `   Status: ${result.status.toUpperCase()}\n`;
      summary += `   Duration: ${(result.duration / 1000).toFixed(2)}s\n`;
      if (result.coverage) {
        summary += `   Coverage: ${result.coverage.toFixed(2)}%\n`;
      }
      if (result.errors && result.errors.length > 0) {
        summary += `   Errors: ${result.errors.length}\n`;
      }
      summary += '\n';
    });

    return summary;
  }

  private async saveResults(): Promise<void> {
    const resultsFile = path.join(
      this.logDir,
      `test-results-${Date.now()}.json`
    );

    const reportData = {
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.status === 'passed').length,
        failed: this.results.filter((r) => r.status === 'failed').length,
        skipped: this.results.filter((r) => r.status === 'skipped').length,
      },
    };

    fs.writeFileSync(resultsFile, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Results saved to: ${resultsFile}`);
  }

  async run(): Promise<void> {
    console.log('🚀 Starting Jarvis V2 Test Suite');
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    const suites = this.getTestSuites();
    const mode = process.env.TEST_MODE || 'sequential';

    if (mode === 'parallel') {
      console.log('Running tests in PARALLEL mode\n');
      await this.runParallel(suites);
    } else {
      console.log('Running tests in SEQUENTIAL mode\n');
      await this.runSequential(suites);
    }

    const summary = this.generateSummary();
    console.log(summary);

    await this.saveResults();

    // Send to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.slackReporter.sendReport(this.results, summary);
    }

    // Exit with error code if any tests failed
    const hasFailures = this.results.some((r) => r.status === 'failed');
    if (hasFailures) {
      console.error('\n❌ Test suite failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch((error) => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  });
}

export { TestRunner, TestResult, TestSuite };
