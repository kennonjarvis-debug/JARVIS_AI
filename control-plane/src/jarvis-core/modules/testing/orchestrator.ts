/**
 * Jarvis V2 Autonomous Testing Orchestrator
 *
 * Capabilities:
 * - Automatically runs all test suites daily (9 AM UTC)
 * - Detects failures and re-runs with debug flags
 * - Proposes code patches for failed tests
 * - Stores test results in S3 (jarvismemory/tests/YYYY-MM-DD.json)
 * - Integrates with Slack notifications
 * - Learns from recurring failures
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../../../utils/logger';

export interface TestFailure {
  testName: string;
  suite: string;
  error: string;
  stackTrace: string;
  attemptedFix?: string;
  fixSuccess?: boolean;
}

export interface AutoFixProposal {
  testName: string;
  failureReason: string;
  proposedPatch: string;
  filePath: string;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface TestRunResult {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  passRate: number;
  failures: TestFailure[];
  autoFixProposals: AutoFixProposal[];
  recurringFailures: string[];
}

export interface AdaptiveLearning {
  testName: string;
  failureCount: number;
  lastFailed: string;
  patterns: string[];
  recommendedAction: string;
}

export class TestingOrchestrator {
  private s3Client: S3Client;
  private projectRoot: string;
  private logPath: string;
  private failureHistory: Map<string, number> = new Map();
  private adaptiveLearning: Map<string, AdaptiveLearning> = new Map();

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../..');
    this.logPath = path.join(this.projectRoot, 'logs/jarvis/test-autofix.log');

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    });

    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    } catch (error) {
      logger.error('Failed to create log directory:', error);
    }
  }

  /**
   * Log auto-fix attempt
   */
  private async logAutoFix(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    try {
      await fs.appendFile(this.logPath, logEntry, 'utf-8');
    } catch (error) {
      logger.error('Failed to write to auto-fix log:', error);
    }
  }

  /**
   * Run tests with optional debug flags
   */
  private async runTests(
    command: string,
    args: string[],
    debug: boolean = false
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const env = { ...process.env };

      if (debug) {
        env.DEBUG = '*';
        env.VERBOSE = 'true';
        env.LOG_LEVEL = 'debug';
      }

      const proc = spawn(command, args, {
        cwd: this.projectRoot,
        env,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });
    });
  }

  /**
   * Parse test failures from output
   */
  private parseFailures(output: string, suite: string): TestFailure[] {
    const failures: TestFailure[] = [];

    // Parse Jest/Vitest failures
    const failureRegex = /(?:FAIL|✕)\s+(.+?)\n([\s\S]+?)(?=(?:PASS|FAIL|✕|\n\n|$))/g;
    let match;

    while ((match = failureRegex.exec(output)) !== null) {
      const testName = match[1].trim();
      const error = match[2].trim();

      // Extract stack trace
      const stackMatch = error.match(/at\s+.+/g);
      const stackTrace = stackMatch ? stackMatch.join('\n') : '';

      failures.push({
        testName,
        suite,
        error,
        stackTrace,
      });
    }

    return failures;
  }

  /**
   * Generate AI-powered fix proposal
   */
  private async generateFixProposal(failure: TestFailure): Promise<AutoFixProposal | null> {
    // Analyze error patterns
    const errorLower = failure.error.toLowerCase();

    // Common patterns and fixes
    const patterns = [
      {
        pattern: /expected.*received/i,
        fix: 'Update test assertion to match actual output',
        confidence: 'medium' as const,
      },
      {
        pattern: /timeout|exceeded/i,
        fix: 'Increase test timeout or optimize async operations',
        confidence: 'high' as const,
      },
      {
        pattern: /cannot find module|module not found/i,
        fix: 'Check import path or install missing dependency',
        confidence: 'high' as const,
      },
      {
        pattern: /undefined.*property/i,
        fix: 'Add null check or ensure object is initialized',
        confidence: 'medium' as const,
      },
      {
        pattern: /network request failed|econnrefused/i,
        fix: 'Mock network request or ensure service is running',
        confidence: 'high' as const,
      },
    ];

    for (const { pattern, fix, confidence } of patterns) {
      if (pattern.test(errorLower)) {
        // Extract file path from stack trace
        const fileMatch = failure.stackTrace.match(/at\s+.+?\((.+?):(\d+):/);
        const filePath = fileMatch ? fileMatch[1] : 'unknown';

        // Generate patch based on pattern
        const patch = await this.generatePatch(failure, fix);

        return {
          testName: failure.testName,
          failureReason: failure.error.substring(0, 200),
          proposedPatch: patch,
          filePath,
          confidence,
          reasoning: fix,
        };
      }
    }

    return null;
  }

  /**
   * Generate code patch
   */
  private async generatePatch(failure: TestFailure, fixReason: string): Promise<string> {
    // Simple patch generation based on error type
    const errorLower = failure.error.toLowerCase();

    if (errorLower.includes('timeout')) {
      return `
// Increase timeout for async operations
jest.setTimeout(30000); // 30 seconds

// OR optimize the async operation
await Promise.race([
  yourAsyncOperation(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Operation timeout')), 10000)
  )
]);
`;
    }

    if (errorLower.includes('cannot find module')) {
      const moduleMatch = failure.error.match(/['"](.+?)['"]/);
      const moduleName = moduleMatch ? moduleMatch[1] : 'missing-module';

      return `
// Install missing dependency
// npm install ${moduleName}

// OR fix import path
import { ... } from './${moduleName}'; // Adjust path as needed
`;
    }

    if (errorLower.includes('undefined')) {
      return `
// Add null/undefined check
if (obj && obj.property) {
  // Your code here
}

// OR use optional chaining
const value = obj?.property?.nestedProperty;
`;
    }

    return `
// Generic fix suggestion:
// ${fixReason}
// Review the error details and apply appropriate fix
`;
  }

  /**
   * Upload test results to S3
   */
  private async uploadToS3(result: TestRunResult): Promise<void> {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `jarvismemory/tests/${date}.json`;

    try {
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || 'ai-dawg-jarvis',
        Key: key,
        Body: JSON.stringify(result, null, 2),
        ContentType: 'application/json',
        ServerSideEncryption: 'AES256',
      });

      await this.s3Client.send(command);
      logger.info(`✅ Test results uploaded to S3: ${key}`);
    } catch (error) {
      logger.error('❌ Failed to upload test results to S3:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(result: TestRunResult): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return;
    }

    const status = result.passRate === 100 ? '✅' : result.passRate >= 90 ? '⚠️' : '❌';
    const color = result.passRate === 100 ? 'good' : result.passRate >= 90 ? 'warning' : 'danger';

    const fixProposals =
      result.autoFixProposals.length > 0
        ? `\n\n*Auto-Fix Proposals:*\n${result.autoFixProposals
            .map(
              (p, i) =>
                `${i + 1}. \`${p.testName}\` (${p.confidence} confidence)\n   Reason: ${p.reasoning}`
            )
            .join('\n')}`
        : '';

    const recurringIssues =
      result.recurringFailures.length > 0
        ? `\n\n*Recurring Failures:*\n${result.recurringFailures.map((f) => `• ${f}`).join('\n')}`
        : '';

    const message = {
      text: `${status} Jarvis Test Suite Results`,
      attachments: [
        {
          color,
          title: 'Test Suite Summary',
          fields: [
            { title: 'Total Tests', value: `${result.totalTests}`, short: true },
            { title: 'Passed', value: `${result.passed}`, short: true },
            { title: 'Failed', value: `${result.failed}`, short: true },
            { title: 'Pass Rate', value: `${result.passRate.toFixed(1)}%`, short: true },
            { title: 'Duration', value: `${result.duration.toFixed(2)}s`, short: true },
            { title: 'Timestamp', value: result.timestamp, short: true },
          ],
          text: fixProposals + recurringIssues,
        },
      ],
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        logger.info('✅ Slack notification sent successfully');
      } else {
        logger.error('❌ Slack notification failed:', await response.text());
      }
    } catch (error) {
      logger.error('❌ Error sending Slack notification:', error);
    }
  }

  /**
   * Update adaptive learning from failures
   */
  private updateAdaptiveLearning(failures: TestFailure[]): string[] {
    const recurring: string[] = [];

    for (const failure of failures) {
      const count = (this.failureHistory.get(failure.testName) || 0) + 1;
      this.failureHistory.set(failure.testName, count);

      if (count >= 3) {
        // Test has failed 3+ times
        recurring.push(failure.testName);

        const learning: AdaptiveLearning = {
          testName: failure.testName,
          failureCount: count,
          lastFailed: new Date().toISOString(),
          patterns: this.extractPatterns(failure),
          recommendedAction: this.getRecommendation(failure, count),
        };

        this.adaptiveLearning.set(failure.testName, learning);
      }
    }

    return recurring;
  }

  /**
   * Extract failure patterns for learning
   */
  private extractPatterns(failure: TestFailure): string[] {
    const patterns: string[] = [];

    if (failure.error.includes('timeout')) patterns.push('timeout');
    if (failure.error.includes('undefined')) patterns.push('undefined-value');
    if (failure.error.includes('network')) patterns.push('network-issue');
    if (failure.error.includes('database')) patterns.push('database-issue');
    if (failure.error.includes('assertion')) patterns.push('assertion-mismatch');

    return patterns;
  }

  /**
   * Get recommendation for DevOps Agent
   */
  private getRecommendation(failure: TestFailure, failureCount: number): string {
    if (failureCount >= 5) {
      return `CRITICAL: Test failing ${failureCount} times. Consider disabling or rewriting test entirely.`;
    }

    const patterns = this.extractPatterns(failure);

    if (patterns.includes('timeout')) {
      return 'Increase timeout values or optimize async operations. Consider adding retry logic.';
    }

    if (patterns.includes('network-issue')) {
      return 'Mock external API calls or ensure test environment has network access.';
    }

    if (patterns.includes('database-issue')) {
      return 'Review database migrations and seed data. Consider using in-memory DB for tests.';
    }

    return 'Review test implementation and update assertions based on actual behavior.';
  }

  /**
   * Main orchestration: Run all tests with auto-fix
   */
  async orchestrateTestRun(): Promise<TestRunResult> {
    logger.info('🚀 Starting autonomous test orchestration...');
    await this.logAutoFix('=== New Test Run Started ===');

    const startTime = Date.now();
    const failures: TestFailure[] = [];
    const autoFixProposals: AutoFixProposal[] = [];

    // 1. Run all test suites
    logger.info('📝 Running all test suites...');
    const testResult = await this.runTests('npm', ['run', 'test:all'], false);

    // 2. Parse failures
    const initialFailures = this.parseFailures(testResult.stdout + testResult.stderr, 'all');
    failures.push(...initialFailures);

    logger.info(`Found ${initialFailures.length} failing tests`);

    // 3. Re-run failed tests with debug flags
    if (initialFailures.length > 0) {
      logger.info('🔍 Re-running failed tests with debug flags...');
      await this.logAutoFix(`Re-running ${initialFailures.length} failed tests with debug mode`);

      const debugResult = await this.runTests('npm', ['run', 'test:all'], true);
      const debugFailures = this.parseFailures(debugResult.stdout + debugResult.stderr, 'debug');

      // 4. Generate fix proposals
      for (const failure of debugFailures) {
        const proposal = await this.generateFixProposal(failure);
        if (proposal) {
          autoFixProposals.push(proposal);
          await this.logAutoFix(
            `Fix proposed for "${failure.testName}": ${proposal.reasoning}\n${proposal.proposedPatch}`
          );
        }
      }
    }

    // 5. Calculate results
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    const passedMatch = testResult.stdout.match(/(\d+)\s+passed/i);
    const failedMatch = testResult.stdout.match(/(\d+)\s+failed/i);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : failures.length;
    const total = passed + failed;

    // 6. Update adaptive learning
    const recurring = this.updateAdaptiveLearning(failures);

    const result: TestRunResult = {
      timestamp: new Date().toISOString(),
      totalTests: total,
      passed,
      failed,
      duration,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      failures,
      autoFixProposals,
      recurringFailures: recurring,
    };

    // 7. Store results in S3
    await this.uploadToS3(result);

    // 8. Send Slack notification
    await this.sendSlackNotification(result);

    // 9. Log summary
    await this.logAutoFix(
      `Test run complete: ${passed}/${total} passed (${result.passRate.toFixed(1)}%), ${
        autoFixProposals.length
      } fix proposals generated`
    );

    logger.info(`✅ Test orchestration complete. Pass rate: ${result.passRate.toFixed(1)}%`);

    return result;
  }

  /**
   * Get adaptive learning insights
   */
  getAdaptiveLearning(): AdaptiveLearning[] {
    return Array.from(this.adaptiveLearning.values());
  }

  /**
   * Get recommendations for DevOps Agent
   */
  getDevOpsRecommendations(): string[] {
    const recommendations: string[] = [];

    for (const learning of this.adaptiveLearning.values()) {
      if (learning.failureCount >= 3) {
        recommendations.push(
          `[${learning.testName}] ${learning.recommendedAction} (Failed ${learning.failureCount} times)`
        );
      }
    }

    return recommendations;
  }
}

// Export singleton instance
export const testingOrchestrator = new TestingOrchestrator();
