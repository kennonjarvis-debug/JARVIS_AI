#!/usr/bin/env ts-node

/**
 * Automation Tests - Orchestration and Integration Testing
 * Tests the orchestration of multiple Jarvis subsystems
 */

import axios from 'axios';

interface AutomationTestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class AutomationTestRunner {
  private baseURL = process.env.BASE_URL || 'http://localhost:3001';
  private results: AutomationTestResult[] = [];

  async runTest(
    name: string,
    testFn: () => Promise<void>
  ): Promise<AutomationTestResult> {
    const startTime = Date.now();
    console.log(`\n🔧 Running: ${name}`);

    try {
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`✅ Passed in ${duration}ms`);

      return {
        name,
        passed: true,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed in ${duration}ms: ${error.message}`);

      return {
        name,
        passed: false,
        duration,
        error: error.message,
      };
    }
  }

  async testVitalityCalculationPipeline(): Promise<void> {
    // Test the full pipeline of vitality calculation
    const response = await axios.get(`${this.baseURL}/api/v1/jarvis/vitality`);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    const vitality = response.data;

    // Verify all required fields
    if (!vitality.score || !vitality.metrics) {
      throw new Error('Missing required vitality fields');
    }

    // Verify metrics are within valid ranges
    Object.values(vitality.metrics).forEach((value: any) => {
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error(`Invalid metric value: ${value}`);
      }
    });
  }

  async testQuickActionExecution(): Promise<void> {
    // Test quick action orchestration
    const actions = await axios.get(`${this.baseURL}/api/v1/jarvis/quick-actions`);

    if (!Array.isArray(actions.data) || actions.data.length === 0) {
      throw new Error('No quick actions available');
    }

    // Execute first available action
    const firstAction = actions.data[0];
    const result = await axios.post(
      `${this.baseURL}/api/v1/jarvis/quick-actions/${firstAction.action.rawValue || firstAction.action}`,
      { timestamp: new Date().toISOString() }
    );

    if (!result.data.success) {
      throw new Error('Quick action execution failed');
    }
  }

  async testAlertingSystem(): Promise<void> {
    // Test the alerting system integration
    const alerts = await axios.get(`${this.baseURL}/api/v1/jarvis/alerts`);

    if (!Array.isArray(alerts.data)) {
      throw new Error('Alerts response is not an array');
    }

    // If there are alerts, test acknowledgment
    if (alerts.data.length > 0) {
      const alertId = alerts.data[0].id;
      const ackResult = await axios.post(
        `${this.baseURL}/api/v1/jarvis/alerts/${alertId}/acknowledge`
      );

      if (ackResult.status !== 200) {
        throw new Error('Alert acknowledgment failed');
      }
    }
  }

  async testRecommendationEngine(): Promise<void> {
    // Test recommendation generation
    const recommendations = await axios.get(
      `${this.baseURL}/api/v1/jarvis/recommendations`
    );

    if (!Array.isArray(recommendations.data)) {
      throw new Error('Recommendations response is not an array');
    }

    // Verify recommendation structure
    if (recommendations.data.length > 0) {
      const rec = recommendations.data[0];
      if (!rec.title || !rec.priority || !rec.category) {
        throw new Error('Invalid recommendation structure');
      }
    }
  }

  async testDataPersistence(): Promise<void> {
    // Test data persistence across requests
    const vitality1 = await axios.get(`${this.baseURL}/api/v1/jarvis/vitality`);
    const timestamp1 = vitality1.data.timestamp;

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const vitality2 = await axios.get(`${this.baseURL}/api/v1/jarvis/vitality`);
    const timestamp2 = vitality2.data.timestamp;

    // Timestamps should be different if data is being updated
    if (timestamp1 === timestamp2) {
      console.warn('⚠️  Warning: Data may not be updating');
    }
  }

  async run(): Promise<void> {
    console.log('🤖 Starting Automation Tests\n');

    const tests = [
      {
        name: 'Vitality Calculation Pipeline',
        fn: () => this.testVitalityCalculationPipeline(),
      },
      {
        name: 'Quick Action Execution',
        fn: () => this.testQuickActionExecution(),
      },
      {
        name: 'Alerting System Integration',
        fn: () => this.testAlertingSystem(),
      },
      {
        name: 'Recommendation Engine',
        fn: () => this.testRecommendationEngine(),
      },
      {
        name: 'Data Persistence',
        fn: () => this.testDataPersistence(),
      },
    ];

    for (const test of tests) {
      const result = await this.runTest(test.name, test.fn);
      this.results.push(result);
    }

    // Print summary
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;

    console.log('\n' + '='.repeat(80));
    console.log('Automation Test Summary');
    console.log('='.repeat(80));
    console.log(`Total: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\nFailed tests:');
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.error}`);
        });

      process.exit(1);
    }

    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  const runner = new AutomationTestRunner();
  runner.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { AutomationTestRunner };
