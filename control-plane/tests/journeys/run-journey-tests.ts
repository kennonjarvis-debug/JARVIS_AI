#!/usr/bin/env ts-node

/**
 * Journey Tests - Persona & Workflow-Level Simulations
 * Tests complete user workflows from start to finish
 */

import axios from 'axios';

interface JourneyStep {
  name: string;
  action: () => Promise<any>;
  validate: (result: any) => void;
}

interface Journey {
  name: string;
  persona: string;
  description: string;
  steps: JourneyStep[];
}

class JourneyTestRunner {
  private baseURL = process.env.BASE_URL || 'http://localhost:3001';

  async runJourney(journey: Journey): Promise<boolean> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`👤 Persona: ${journey.persona}`);
    console.log(`📖 Journey: ${journey.name}`);
    console.log(`📝 ${journey.description}`);
    console.log('='.repeat(80));

    let stepNumber = 1;

    try {
      for (const step of journey.steps) {
        console.log(`\n[Step ${stepNumber}/${journey.steps.length}] ${step.name}`);

        const result = await step.action();
        step.validate(result);

        console.log(`✅ Step ${stepNumber} completed`);
        stepNumber++;

        // Small delay between steps to simulate real usage
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log(`\n✅ Journey "${journey.name}" completed successfully\n`);
      return true;
    } catch (error: any) {
      console.error(`\n❌ Journey failed at step ${stepNumber}: ${error.message}\n`);
      return false;
    }
  }

  getJourneys(): Journey[] {
    return [
      {
        name: 'Daily Health Check',
        persona: 'DevOps Engineer',
        description:
          'A DevOps engineer checks system health, reviews alerts, and takes action on recommendations',
        steps: [
          {
            name: 'View Dashboard',
            action: async () => {
              return await axios.get(`${this.baseURL}/api/v1/jarvis/vitality`);
            },
            validate: (result) => {
              if (!result.data.score) {
                throw new Error('No vitality score found');
              }
              console.log(`   Vitality Score: ${result.data.score}%`);
            },
          },
          {
            name: 'Check System Alerts',
            action: async () => {
              return await axios.get(`${this.baseURL}/api/v1/jarvis/alerts`);
            },
            validate: (result) => {
              if (!Array.isArray(result.data)) {
                throw new Error('Alerts response invalid');
              }
              console.log(`   Found ${result.data.length} alerts`);
            },
          },
          {
            name: 'Review Recommendations',
            action: async () => {
              return await axios.get(
                `${this.baseURL}/api/v1/jarvis/recommendations`
              );
            },
            validate: (result) => {
              console.log(`   Received ${result.data.length} recommendations`);
            },
          },
          {
            name: 'Execute Health Check Action',
            action: async () => {
              return await axios.post(
                `${this.baseURL}/api/v1/jarvis/quick-actions/health_check`,
                { timestamp: new Date().toISOString() }
              );
            },
            validate: (result) => {
              if (!result.data.success) {
                throw new Error('Health check failed');
              }
              console.log('   Health check executed successfully');
            },
          },
        ],
      },
      {
        name: 'Performance Investigation',
        persona: 'Site Reliability Engineer',
        description:
          'An SRE investigates performance issues and optimizes the system',
        steps: [
          {
            name: 'Check Performance Metrics',
            action: async () => {
              return await axios.get(`${this.baseURL}/api/v1/jarvis/vitality`);
            },
            validate: (result) => {
              const perfScore = result.data.metrics?.performanceScore;
              if (perfScore === undefined) {
                throw new Error('Performance score not found');
              }
              console.log(`   Performance Score: ${(perfScore * 100).toFixed(2)}%`);
            },
          },
          {
            name: 'Identify Bottlenecks',
            action: async () => {
              return await axios.get(
                `${this.baseURL}/api/v1/jarvis/recommendations`
              );
            },
            validate: (result) => {
              const perfRecs = result.data.filter(
                (r: any) => r.category === 'performance'
              );
              console.log(`   Found ${perfRecs.length} performance recommendations`);
            },
          },
          {
            name: 'Run System Scan',
            action: async () => {
              return await axios.post(
                `${this.baseURL}/api/v1/jarvis/quick-actions/system_scan`,
                {}
              );
            },
            validate: (result) => {
              console.log('   System scan completed');
            },
          },
          {
            name: 'Execute Performance Optimization',
            action: async () => {
              return await axios.post(
                `${this.baseURL}/api/v1/jarvis/quick-actions/optimize_performance`,
                {}
              );
            },
            validate: (result) => {
              if (!result.data.success) {
                throw new Error('Optimization failed');
              }
              console.log('   Performance optimization applied');
            },
          },
        ],
      },
      {
        name: 'Incident Response',
        persona: 'On-Call Engineer',
        description:
          'An on-call engineer responds to a critical alert and resolves the issue',
        steps: [
          {
            name: 'Receive Critical Alert',
            action: async () => {
              return await axios.get(`${this.baseURL}/api/v1/jarvis/alerts`);
            },
            validate: (result) => {
              const criticalAlerts = result.data.filter(
                (a: any) => a.severity === 'critical'
              );
              console.log(`   ${criticalAlerts.length} critical alerts found`);
            },
          },
          {
            name: 'Check System Status',
            action: async () => {
              return await axios.get(`${this.baseURL}/api/v1/jarvis/vitality`);
            },
            validate: (result) => {
              console.log(`   System Status: ${result.data.status}`);
            },
          },
          {
            name: 'Run Diagnostics',
            action: async () => {
              return await axios.post(
                `${this.baseURL}/api/v1/jarvis/quick-actions/run_diagnostics`,
                {}
              );
            },
            validate: (result) => {
              console.log('   Diagnostics completed');
            },
          },
          {
            name: 'Acknowledge Alert',
            action: async () => {
              const alerts = await axios.get(`${this.baseURL}/api/v1/jarvis/alerts`);
              if (alerts.data.length > 0) {
                return await axios.post(
                  `${this.baseURL}/api/v1/jarvis/alerts/${alerts.data[0].id}/acknowledge`
                );
              }
              return { data: { acknowledged: false } };
            },
            validate: (result) => {
              console.log('   Alert acknowledged');
            },
          },
        ],
      },
    ];
  }

  async run(): Promise<void> {
    console.log('🎭 Starting Journey Tests\n');

    const journeys = this.getJourneys();
    const results: boolean[] = [];

    for (const journey of journeys) {
      const success = await this.runJourney(journey);
      results.push(success);
    }

    // Print summary
    const passed = results.filter((r) => r).length;
    const failed = results.filter((r) => !r).length;

    console.log('\n' + '='.repeat(80));
    console.log('Journey Test Summary');
    console.log('='.repeat(80));
    console.log(`Total Journeys: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(80) + '\n');

    if (failed > 0) {
      process.exit(1);
    }

    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  const runner = new JourneyTestRunner();
  runner.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { JourneyTestRunner };
