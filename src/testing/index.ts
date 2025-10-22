/**
 * Automated Endpoint Testing Engine
 * Main entry point for test automation
 */

import { EndpointTester } from './endpoint-tester';
import { TestScheduler } from './test-scheduler';
import { TestReporter } from './test-reporter';
import { TestConfig } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TestingEngine {
  private readonly tester: EndpointTester;
  private readonly reporter: TestReporter;
  private readonly scheduler: TestScheduler;
  private config: TestConfig | null = null;

  constructor() {
    this.tester = new EndpointTester();
    this.reporter = new TestReporter();
    this.scheduler = new TestScheduler(this.tester, this.reporter);
  }

  /**
   * Initialize testing engine with configuration
   */
  async initialize(configPath?: string): Promise<void> {
    const defaultConfigPath = path.join(__dirname, 'test-config.json');
    const finalConfigPath = configPath || defaultConfigPath;

    console.log(`=� Loading test configuration from: ${finalConfigPath}`);

    const configContent = await fs.readFile(finalConfigPath, 'utf-8');
    this.config = JSON.parse(configContent);

    console.log(` Loaded ${this.config!.test_suites.length} test suites`);
  }

  /**
   * Start automated testing (scheduled)
   */
  async start(): Promise<void> {
    if (!this.config) {
      throw new Error('Testing engine not initialized. Call initialize() first.');
    }

    console.log('\n=� Starting Automated Testing Engine...\n');

    // Run all tests once immediately
    console.log('>� Running initial test pass...\n');
    await this.scheduler.runAllTestSuites(this.config.test_suites);

    // Start scheduled tests
    this.scheduler.startAll(this.config.test_suites);

    console.log(' Automated Testing Engine is now running');
    console.log('   Tests will run according to their schedules\n');
  }

  /**
   * Stop automated testing
   */
  stop(): void {
    this.scheduler.stopAll();
    console.log(' Automated Testing Engine stopped\n');
  }

  /**
   * Run tests once without scheduling
   */
  async runOnce(): Promise<void> {
    if (!this.config) {
      throw new Error('Testing engine not initialized. Call initialize() first.');
    }

    console.log('\n>� Running all test suites once...\n');
    await this.scheduler.runAllTestSuites(this.config.test_suites);
  }

  /**
   * Run a specific test suite
   */
  async runSuite(suiteName: string): Promise<void> {
    if (!this.config) {
      throw new Error('Testing engine not initialized. Call initialize() first.');
    }

    const suite = this.config.test_suites.find(s => s.name === suiteName);

    if (!suite) {
      throw new Error(`Test suite not found: ${suiteName}`);
    }

    await this.scheduler.runTestSuite(suite);
  }

  /**
   * Get test summary for a suite
   */
  async getSummary(suiteName: string, days: number = 7): Promise<any> {
    return this.reporter.getTestSummary(suiteName, days);
  }
}

// Export all types and classes
export * from './types';
export { EndpointTester } from './endpoint-tester';
export { TestScheduler } from './test-scheduler';
export { TestReporter } from './test-reporter';
