#!/usr/bin/env tsx
/**
 * Testing Engine CLI
 * Command-line interface for automated endpoint testing
 */

import { TestingEngine } from './index';

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  const engine = new TestingEngine();

  try {
    await engine.initialize();

    switch (command) {
      case 'start':
        console.log('Starting automated testing with scheduled runs...');
        await engine.start();

        // Keep process running
        process.on('SIGINT', () => {
          console.log('\nReceived SIGINT, stopping...');
          engine.stop();
          process.exit(0);
        });

        process.on('SIGTERM', () => {
          console.log('\nReceived SIGTERM, stopping...');
          engine.stop();
          process.exit(0);
        });

        break;

      case 'run':
        if (arg) {
          // Run specific suite
          await engine.runSuite(arg);
        } else {
          // Run all suites once
          await engine.runOnce();
        }
        process.exit(0);

      case 'summary':
        if (!arg) {
          console.error('Error: Suite name required for summary command');
          printUsage();
          process.exit(1);
        }

        const days = parseInt(process.argv[4]) || 7;
        const summary = await engine.getSummary(arg, days);

        if (!summary) {
          console.log(`No test data found for suite: ${arg}`);
        } else {
          console.log('\n=Ê Test Summary');
          console.log(`   Suite: ${summary.suite}`);
          console.log(`   Period: Last ${summary.period_days} days`);
          console.log(`   Total Runs: ${summary.total_runs}`);
          console.log(`   Total Tests: ${summary.total_tests}`);
          console.log(`    Passed: ${summary.total_passed}`);
          console.log(`   L Failed: ${summary.total_failed}`);
          console.log(`   Success Rate: ${summary.success_rate.toFixed(2)}%`);
          console.log(`   Avg Response Time: ${summary.avg_response_time.toFixed(2)}ms\n`);
        }

        process.exit(0);

      case 'help':
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);

      default:
        if (!command) {
          printUsage();
          process.exit(1);
        }
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
Jarvis Automated Testing Engine CLI

Usage:
  tsx cli.ts <command> [options]

Commands:
  start                       Start automated testing with scheduled runs
  run [suite]                 Run all tests once, or run specific suite
  summary <suite> [days]      Show test summary for suite (default: 7 days)
  help                        Show this help message

Examples:
  tsx cli.ts start                          # Start with scheduled runs
  tsx cli.ts run                            # Run all tests once
  tsx cli.ts run ai-dawg-health             # Run specific suite
  tsx cli.ts summary ai-dawg-health         # Show 7-day summary
  tsx cli.ts summary ai-dawg-health 30      # Show 30-day summary

Test Suites:
  - ai-dawg-health              Health checks (every 5 minutes)
  - ai-dawg-api                 API tests (hourly)
  - vocal-coach-integration     Vocal Coach tests (every 2 hours)
  - producer-integration        Producer tests (every 2 hours)

Press Ctrl+C to stop when running in start mode.
`);
}

main();
