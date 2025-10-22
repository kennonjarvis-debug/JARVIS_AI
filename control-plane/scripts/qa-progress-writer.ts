#!/usr/bin/env ts-node
/**
 * QA Progress Writer
 * Atomic log updates for distributed QA testing
 * Prevents race conditions when multiple Claude instances write progress
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const appendFile = promisify(fs.appendFile);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

interface ProgressEntry {
  timestamp: string;
  instanceId: string;
  testSuite: string;
  status: 'started' | 'running' | 'passed' | 'failed' | 'skipped';
  message: string;
  duration?: number;
  details?: any;
}

interface ProgressSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  running: number;
  instances: Record<string, {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  }>;
}

export class QAProgressWriter {
  private logFile: string;
  private lockFile: string;
  private maxLockWaitMs: number = 5000;
  private lockRetryMs: number = 50;

  constructor(logFile?: string) {
    this.logFile = logFile || '/Users/benkennon/Jarvis/docs/QA_PROGRESS.log';
    this.lockFile = `${this.logFile}.lock`;
  }

  /**
   * Initialize progress log
   */
  async initialize(): Promise<void> {
    const logDir = path.dirname(this.logFile);

    try {
      await mkdir(logDir, { recursive: true });

      // Create initial log file with header
      const header = [
        '═══════════════════════════════════════════════════════════════',
        '  Jarvis v2 QA Testing Progress Log',
        '  Distributed Testing Across Multiple Claude Instances',
        `  Started: ${new Date().toISOString()}`,
        '═══════════════════════════════════════════════════════════════',
        '',
      ].join('\n');

      if (!fs.existsSync(this.logFile)) {
        await writeFile(this.logFile, header);
      }

      console.log(`[QAProgress] Log initialized: ${this.logFile}`);
    } catch (error) {
      throw new Error(`Failed to initialize progress log: ${error}`);
    }
  }

  /**
   * Write progress entry (atomic)
   */
  async write(entry: Omit<ProgressEntry, 'timestamp'>): Promise<void> {
    const fullEntry: ProgressEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    const logLine = this.formatLogLine(fullEntry);

    // Acquire write lock
    await this.acquireLock();

    try {
      await appendFile(this.logFile, logLine + '\n');
      console.log(`[QAProgress] ${logLine}`);
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Write test start
   */
  async testStarted(instanceId: string, testSuite: string, message: string): Promise<void> {
    await this.write({
      instanceId,
      testSuite,
      status: 'started',
      message,
    });
  }

  /**
   * Write test success
   */
  async testPassed(
    instanceId: string,
    testSuite: string,
    message: string,
    duration?: number
  ): Promise<void> {
    await this.write({
      instanceId,
      testSuite,
      status: 'passed',
      message,
      duration,
    });
  }

  /**
   * Write test failure
   */
  async testFailed(
    instanceId: string,
    testSuite: string,
    message: string,
    details?: any
  ): Promise<void> {
    await this.write({
      instanceId,
      testSuite,
      status: 'failed',
      message,
      details,
    });
  }

  /**
   * Write test skip
   */
  async testSkipped(instanceId: string, testSuite: string, message: string): Promise<void> {
    await this.write({
      instanceId,
      testSuite,
      status: 'skipped',
      message,
    });
  }

  /**
   * Get progress summary
   */
  async getSummary(): Promise<ProgressSummary> {
    try {
      const content = await readFile(this.logFile, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      const summary: ProgressSummary = {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        running: 0,
        instances: {},
      };

      for (const line of lines) {
        if (line.startsWith('═') || line.startsWith(' ') || !line.includes('│')) {
          continue;
        }

        const parts = line.split('│').map((p) => p.trim());
        if (parts.length < 4) continue;

        const instanceId = parts[1];
        const status = parts[3];

        if (!summary.instances[instanceId]) {
          summary.instances[instanceId] = { total: 0, passed: 0, failed: 0, skipped: 0 };
        }

        summary.totalTests++;
        summary.instances[instanceId].total++;

        switch (status) {
          case 'PASS':
            summary.passed++;
            summary.instances[instanceId].passed++;
            break;
          case 'FAIL':
            summary.failed++;
            summary.instances[instanceId].failed++;
            break;
          case 'SKIP':
            summary.skipped++;
            summary.instances[instanceId].skipped++;
            break;
          case 'RUN':
            summary.running++;
            break;
        }
      }

      return summary;
    } catch (error) {
      throw new Error(`Failed to read progress summary: ${error}`);
    }
  }

  /**
   * Format log line for consistent output
   */
  private formatLogLine(entry: ProgressEntry): string {
    const statusSymbol = this.getStatusSymbol(entry.status);
    const statusText = entry.status.toUpperCase().padEnd(7);
    const duration = entry.duration ? `(${entry.duration}ms)` : '';

    return [
      new Date(entry.timestamp).toLocaleTimeString(),
      '│',
      entry.instanceId.padEnd(8),
      '│',
      statusSymbol,
      statusText,
      '│',
      entry.testSuite.padEnd(30),
      '│',
      entry.message,
      duration,
    ]
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Get status symbol
   */
  private getStatusSymbol(status: ProgressEntry['status']): string {
    switch (status) {
      case 'started':
        return '🚀';
      case 'running':
        return '⏳';
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      default:
        return '❓';
    }
  }

  /**
   * Acquire write lock
   */
  private async acquireLock(): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.maxLockWaitMs) {
      try {
        await fs.promises.writeFile(this.lockFile, String(process.pid), { flag: 'wx' });
        return; // Lock acquired
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock exists, check if stale
          const isStale = await this.isLockStale();
          if (isStale) {
            await this.releaseLock();
            continue;
          }

          // Wait and retry
          await new Promise((resolve) => setTimeout(resolve, this.lockRetryMs));
        } else {
          throw error;
        }
      }
    }

    throw new Error('Failed to acquire write lock: timeout');
  }

  /**
   * Release write lock
   */
  private async releaseLock(): Promise<void> {
    try {
      await fs.promises.unlink(this.lockFile);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('[QAProgress] Error releasing lock:', error);
      }
    }
  }

  /**
   * Check if lock is stale
   */
  private async isLockStale(): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(this.lockFile);
      const age = Date.now() - stats.mtimeMs;
      return age > 10000; // 10 seconds
    } catch {
      return true;
    }
  }

  /**
   * Print summary to console
   */
  async printSummary(): Promise<void> {
    const summary = await this.getSummary();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  QA Testing Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Total Tests: ${summary.totalTests}`);
    console.log(`  ✅ Passed:   ${summary.passed}`);
    console.log(`  ❌ Failed:   ${summary.failed}`);
    console.log(`  ⏭️  Skipped:  ${summary.skipped}`);
    console.log(`  ⏳ Running:  ${summary.running}`);
    console.log('\n  By Instance:');

    for (const [instanceId, stats] of Object.entries(summary.instances)) {
      console.log(`    ${instanceId}: ${stats.total} tests (${stats.passed} passed, ${stats.failed} failed)`);
    }

    console.log('═══════════════════════════════════════════════════════════════\n');
  }
}

// CLI Usage
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const writer = new QAProgressWriter();

  (async () => {
    const command = process.argv[2];

    switch (command) {
      case 'init':
        await writer.initialize();
        break;

      case 'summary':
        await writer.printSummary();
        break;

      case 'test':
        await writer.initialize();
        await writer.testStarted('claude_a', 'Security Tests', 'Starting security test suite');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await writer.testPassed('claude_a', 'Security Tests', 'All security tests passed', 950);
        await writer.printSummary();
        break;

      default:
        console.log(`
Usage:
  ./qa-progress-writer.ts init     - Initialize progress log
  ./qa-progress-writer.ts summary  - Print testing summary
  ./qa-progress-writer.ts test     - Run test demo
        `);
    }
  })();
}

export default QAProgressWriter;
