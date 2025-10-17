/**
 * Jarvis Testing Module
 *
 * Autonomous test orchestration and quality assurance
 * Integrates with Python Test Orchestrator and Journey Orchestrator
 */

import { Router } from 'express';
import { BaseModule } from '../../core/base-module';
import { ScheduledJob } from '../../core/jarvis.interfaces';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { testingOrchestrator, TestRunResult } from './orchestrator';

export interface TestSuite {
  id: string;
  name: string;
  type: 'python' | 'e2e' | 'integration' | 'unit';
  status: 'idle' | 'running' | 'passed' | 'failed';
  lastRun?: Date;
  passRate?: number;
  duration?: number;
  failedTests?: string[];
}

export interface TestExecutionRequest {
  suites?: string[]; // Specific suites to run, or all if empty
  autoFix?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  scheduledBy?: 'jarvis' | 'user' | 'cron';
}

export interface TestResult {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  passRate: number;
  report: any;
  autoFixed?: number;
}

class TestingModule extends BaseModule {
  name = 'testing';
  version = '1.0.0';
  description = 'Autonomous test orchestration and quality assurance';
  dependencies: string[] = [];

  private router: Router;
  private projectRoot: string;
  private activeSuites: Map<string, TestSuite> = new Map();
  private testHistory: TestResult[] = [];

  constructor() {
    super();
    this.router = Router();
    this.projectRoot = path.resolve(__dirname, '../../../..');
    this.setupRoutes();
  }

  protected async onInitialize(): Promise<void> {
    // Discover available test suites
    await this.discoverTestSuites();
    this.logger.info(`Found ${this.activeSuites.size} test suites`);
  }

  protected async onShutdown(): Promise<void> {
    this.logger.info('Shutting down Testing Module...');
  }

  protected onRegisterRoutes(router: Router): void {
    // Routes are already set up in setupRoutes()
    // Mount them on the provided router
    router.use(this.router);
  }

  /**
   * Get scheduled jobs for this module
   */
  protected onGetScheduledJobs(): ScheduledJob[] {
    return [
      {
        id: 'daily-test-suite',
        name: 'Daily Test Suite',
        schedule: '0 9 * * *', // 9 AM UTC (changed from 3 AM)
        timezone: 'UTC',
        description: 'Run comprehensive daily test suite with auto-fix',
        enabled: true,
        handler: async () => {
          await this.autonomousTestRun();
        },
      },
      {
        id: 'hourly-health-check',
        name: 'Hourly Test Health Check',
        schedule: '0 * * * *', // Every hour
        timezone: 'UTC',
        description: 'Check test suite health status',
        enabled: true,
        handler: async () => {
          const suites = Array.from(this.activeSuites.values());
          const failedSuites = suites.filter(s => s.status === 'failed');
          if (failedSuites.length > 0) {
            this.logger.warn(`⚠️ ${failedSuites.length} test suites currently failing`);
          }
        },
      },
      {
        id: 'pre-deploy-validation',
        name: 'Pre-Deploy Validation',
        schedule: '0 9,17 * * 1-5', // 9 AM and 5 PM on weekdays
        timezone: 'America/Los_Angeles',
        description: 'Pre-deployment validation before typical deploy windows',
        enabled: true,
        handler: async () => {
          const isValid = await this.preDeployValidation();
          if (!isValid) {
            this.logger.error('❌ Pre-deploy validation FAILED - do not deploy!');
          }
        },
      },
      {
        id: 'weekend-full-regression',
        name: 'Weekend Full Regression',
        schedule: '0 2 * * 0', // 2 AM on Sundays
        timezone: 'UTC',
        description: 'Full regression test suite on weekends',
        enabled: true,
        handler: async () => {
          this.logger.info('Running weekend full regression...');
          await this.scheduledDailyTests();
        },
      },
    ];
  }

  /**
   * Discover all test suites in the project
   */
  private async discoverTestSuites(): Promise<void> {
    // Python Test Orchestrator
    this.activeSuites.set('python-orchestrator', {
      id: 'python-orchestrator',
      name: 'Python Test Orchestrator',
      type: 'python',
      status: 'idle',
    });

    // E2E Journey Tests
    this.activeSuites.set('e2e-journeys', {
      id: 'e2e-journeys',
      name: 'E2E Journey Tests',
      type: 'e2e',
      status: 'idle',
    });

    // Playwright E2E
    this.activeSuites.set('playwright-e2e', {
      id: 'playwright-e2e',
      name: 'Playwright E2E Tests',
      type: 'e2e',
      status: 'idle',
    });

    // Vitest Unit Tests
    this.activeSuites.set('vitest-unit', {
      id: 'vitest-unit',
      name: 'Vitest Unit Tests',
      type: 'unit',
      status: 'idle',
    });
  }

  /**
   * Execute Python Test Orchestrator
   */
  private async runPythonOrchestrator(autoFix: boolean = true): Promise<TestResult> {
    this.logger.info('🐍 Running Python Test Orchestrator...');

    const suite = this.activeSuites.get('python-orchestrator');
    if (suite) {
      suite.status = 'running';
      suite.lastRun = new Date();
    }

    return new Promise((resolve, reject) => {
      const pythonPath = path.join(this.projectRoot, 'venv/bin/python3');
      const scriptPath = path.join(this.projectRoot, 'tests/automation/test_orchestrator.py');

      const python = spawn(pythonPath, [scriptPath], {
        cwd: this.projectRoot,
        env: { ...process.env, AUTO_FIX: autoFix ? '1' : '0' },
      });

      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
        this.logger.info(data.toString().trim());
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', async (code) => {
        const success = code === 0;

        // Parse output for results
        const passedMatch = output.match(/(\d+) tests? passed/i);
        const failedMatch = output.match(/(\d+) tests? failed/i);
        const durationMatch = output.match(/(\d+\.?\d*)s/);

        const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
        const total = passed + failed;
        const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;

        // Load report if exists
        const reportPath = path.join(
          this.projectRoot,
          'test-results/automation/health_report_latest.json'
        );

        let report = null;
        try {
          const reportData = await fs.readFile(reportPath, 'utf-8');
          report = JSON.parse(reportData);
        } catch {
          // Report file might not exist
        }

        const result: TestResult = {
          success,
          totalTests: total,
          passed,
          failed,
          duration,
          passRate: total > 0 ? (passed / total) * 100 : 0,
          report,
        };

        if (suite) {
          suite.status = success ? 'passed' : 'failed';
          suite.passRate = result.passRate;
          suite.duration = duration;
        }

        this.testHistory.push(result);

        resolve(result);
      });
    });
  }

  /**
   * Execute Playwright E2E tests
   */
  private async runPlaywrightTests(): Promise<TestResult> {
    this.logger.info('🎭 Running Playwright E2E Tests...');

    const suite = this.activeSuites.get('playwright-e2e');
    if (suite) {
      suite.status = 'running';
      suite.lastRun = new Date();
    }

    return new Promise((resolve) => {
      const npm = spawn('npm', ['run', 'test:e2e'], {
        cwd: this.projectRoot,
        shell: true,
      });

      let output = '';

      npm.stdout.on('data', (data) => {
        output += data.toString();
        this.logger.info(data.toString().trim());
      });

      npm.on('close', (code) => {
        const success = code === 0;

        // Parse Playwright output
        const passedMatch = output.match(/(\d+) passed/);
        const failedMatch = output.match(/(\d+) failed/);

        const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
        const total = passed + failed;

        const result: TestResult = {
          success,
          totalTests: total,
          passed,
          failed,
          duration: 0,
          passRate: total > 0 ? (passed / total) * 100 : 0,
          report: null,
        };

        if (suite) {
          suite.status = success ? 'passed' : 'failed';
          suite.passRate = result.passRate;
        }

        this.testHistory.push(result);
        resolve(result);
      });
    });
  }

  /**
   * Execute all test suites
   */
  private async runAllTests(request: TestExecutionRequest): Promise<TestResult> {
    this.logger.info('🧪 Running all test suites...');
    this.logger.info(`Auto-fix: ${request.autoFix ? 'enabled' : 'disabled'}`);

    const results: TestResult[] = [];

    // Run Python orchestrator
    const pythonResult = await this.runPythonOrchestrator(request.autoFix ?? true);
    results.push(pythonResult);

    // Run Playwright tests
    const playwrightResult = await this.runPlaywrightTests();
    results.push(playwrightResult);

    // Aggregate results
    const totalTests = results.reduce((sum, r) => sum + r.totalTests, 0);
    const passed = results.reduce((sum, r) => sum + r.passed, 0);
    const failed = results.reduce((sum, r) => sum + r.failed, 0);
    const duration = results.reduce((sum, r) => sum + r.duration, 0);

    return {
      success: failed === 0,
      totalTests,
      passed,
      failed,
      duration,
      passRate: totalTests > 0 ? (passed / totalTests) * 100 : 0,
      report: {
        timestamp: new Date().toISOString(),
        suites: results,
      },
    };
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Get all test suites
    this.router.get('/suites', async (req, res) => {
      const suites = Array.from(this.activeSuites.values());
      res.json({
        success: true,
        data: {
          suites,
          total: suites.length,
        },
      });
    });

    // Get test history
    this.router.get('/history', async (req, res) => {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = this.testHistory.slice(-limit);

      res.json({
        success: true,
        data: {
          history,
          total: this.testHistory.length,
        },
      });
    });

    // Run specific suite
    this.router.post('/run/:suiteId', async (req, res) => {
      const { suiteId } = req.params;
      const { autoFix = true } = req.body;

      const suite = this.activeSuites.get(suiteId);
      if (!suite) {
        return res.status(404).json({
          success: false,
          error: `Suite not found: ${suiteId}`,
        });
      }

      let result: TestResult;

      try {
        if (suiteId === 'python-orchestrator') {
          result = await this.runPythonOrchestrator(autoFix);
        } else if (suiteId === 'playwright-e2e') {
          result = await this.runPlaywrightTests();
        } else {
          return res.status(400).json({
            success: false,
            error: `Suite not implemented: ${suiteId}`,
          });
        }

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Run all tests
    this.router.post('/run-all', async (req, res) => {
      const request: TestExecutionRequest = {
        autoFix: req.body.autoFix ?? true,
        priority: req.body.priority || 'medium',
        scheduledBy: req.body.scheduledBy || 'user',
      };

      try {
        const result = await this.runAllTests(request);

        res.json({
          success: true,
          data: result,
          message: `All tests completed. Pass rate: ${result.passRate.toFixed(1)}%`,
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get health status
    this.router.get('/health', async (req, res) => {
      const suites = Array.from(this.activeSuites.values());
      const avgPassRate = suites
        .filter(s => s.passRate !== undefined)
        .reduce((sum, s) => sum + (s.passRate || 0), 0) / suites.length || 0;

      const status =
        avgPassRate === 100 ? '✅ ALL PASSING' :
        avgPassRate >= 90 ? '⚠️ SOME FAILURES' :
        '❌ CRITICAL';

      res.json({
        success: true,
        data: {
          status,
          avgPassRate: avgPassRate.toFixed(1),
          totalSuites: suites.length,
          runningSuites: suites.filter(s => s.status === 'running').length,
          passedSuites: suites.filter(s => s.status === 'passed').length,
          failedSuites: suites.filter(s => s.status === 'failed').length,
          recentRuns: this.testHistory.slice(-5),
        },
      });
    });

    // NEW: Get comprehensive status with adaptive learning
    this.router.get('/status', async (req, res) => {
      const suites = Array.from(this.activeSuites.values());
      const learning = testingOrchestrator.getAdaptiveLearning();
      const recommendations = testingOrchestrator.getDevOpsRecommendations();

      res.json({
        success: true,
        data: {
          suites,
          adaptiveLearning: learning,
          devOpsRecommendations: recommendations,
          testHistory: this.testHistory.slice(-10),
        },
      });
    });

    // NEW: Fix failed tests with orchestrator
    this.router.post('/fix-failed', async (req, res) => {
      try {
        this.logger.info('🔧 Running autonomous test fix...');

        const result = await testingOrchestrator.orchestrateTestRun();

        res.json({
          success: true,
          data: {
            result,
            message: `Auto-fix complete. ${result.autoFixProposals.length} fix proposals generated.`,
          },
        });
      } catch (error: any) {
        this.logger.error('Error during auto-fix:', error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // NEW: Get adaptive learning insights
    this.router.get('/adaptive-learning', async (req, res) => {
      const learning = testingOrchestrator.getAdaptiveLearning();
      const recommendations = testingOrchestrator.getDevOpsRecommendations();

      res.json({
        success: true,
        data: {
          totalLearnings: learning.length,
          learnings: learning,
          recommendations,
        },
      });
    });
  }

  /**
   * Scheduled job: Daily comprehensive test run
   */
  async scheduledDailyTests(): Promise<void> {
    this.logger.info('🕐 Running scheduled daily tests...');

    const result = await this.runAllTests({
      autoFix: true,
      priority: 'high',
      scheduledBy: 'cron',
    });

    this.logger.info(`Daily tests complete. Pass rate: ${result.passRate.toFixed(1)}%`);

    // If pass rate drops below 90%, create alert
    if (result.passRate < 90) {
      this.logger.warn(`⚠️ Low pass rate detected: ${result.passRate.toFixed(1)}%`);
      // Could trigger Jarvis notification here
    }
  }

  /**
   * Scheduled job: Pre-deploy validation
   */
  async preDeployValidation(): Promise<boolean> {
    this.logger.info('🚀 Running pre-deploy validation...');

    const result = await this.runAllTests({
      autoFix: false, // No auto-fix for deploy validation
      priority: 'critical',
      scheduledBy: 'jarvis',
    });

    const isValid = result.passRate === 100;

    if (!isValid) {
      this.logger.error(`❌ Deploy validation failed: ${result.failed} tests failing`);
    } else {
      this.logger.info(`✅ Deploy validation passed: All ${result.totalTests} tests passing`);
    }

    return isValid;
  }

  /**
   * NEW: Autonomous test run with orchestrator
   * Runs at 9 AM UTC daily
   */
  async autonomousTestRun(): Promise<void> {
    this.logger.info('🤖 Starting autonomous test orchestration (9 AM UTC)...');

    try {
      const result: TestRunResult = await testingOrchestrator.orchestrateTestRun();

      this.logger.info(
        `✅ Autonomous test run complete: ${result.passed}/${result.totalTests} passed (${result.passRate.toFixed(
          1
        )}%)`
      );

      if (result.autoFixProposals.length > 0) {
        this.logger.info(`💡 Generated ${result.autoFixProposals.length} auto-fix proposals`);
      }

      if (result.recurringFailures.length > 0) {
        this.logger.warn(
          `⚠️ Recurring failures detected: ${result.recurringFailures.join(', ')}`
        );
      }

      // Update test history
      this.testHistory.push({
        success: result.passRate === 100,
        totalTests: result.totalTests,
        passed: result.passed,
        failed: result.failed,
        duration: result.duration,
        passRate: result.passRate,
        report: {
          timestamp: result.timestamp,
          autoFixProposals: result.autoFixProposals,
          recurringFailures: result.recurringFailures,
        },
      });
    } catch (error) {
      this.logger.error('❌ Autonomous test run failed:', { error: error as Record<string, any> });
    }
  }
}

// Create and export module instance
const testingModule = new TestingModule();

// Default export for module loading
export default testingModule;

// Named export for direct access
export { testingModule };

// Export types
export type { TestingModule };
