#!/usr/bin/env tsx
/**
 * Master Edge Case Test Runner
 *
 * Executes all edge case tests and generates comprehensive report
 */

import { runProjectCreationEdgeCases, results as projectResults } from './01-project-creation-edge-cases.test.js';
import { runBeatGenerationEdgeCases, results as beatResults } from './02-beat-generation-edge-cases.test.js';
import { runVocalRecordingEdgeCases, results as vocalResults } from './03-vocal-recording-edge-cases.test.js';
import { runServiceHealthEdgeCases, results as healthResults } from './04-service-health-edge-cases.test.js';
import { runCostTrackingEdgeCases, results as costResults } from './05-cost-tracking-edge-cases.test.js';
import fs from 'fs';
import path from 'path';

interface TestResult {
  scenario: string;
  category: string;
  passed: boolean;
  error?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

interface TestSuite {
  name: string;
  results: TestResult[];
  passed: number;
  failed: number;
  bugs: number;
  duration: number;
}

interface FinalReport {
  timestamp: string;
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalBugs: number;
  totalDuration: number;
  suites: TestSuite[];
  criticalBugs: TestResult[];
  highBugs: TestResult[];
  mediumBugs: TestResult[];
  lowBugs: TestResult[];
}

async function runAllEdgeCases(): Promise<FinalReport> {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        EDGE CASE TEST SUITE - JARVIS + AI DAWG           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const suites: TestSuite[] = [];
  const startTime = Date.now();

  // 1. Project Creation Edge Cases
  console.log('🔍 Running Project Creation edge cases...\n');
  const projectStart = Date.now();
  await runProjectCreationEdgeCases();
  suites.push({
    name: 'Project Creation',
    results: [...projectResults],
    passed: projectResults.filter(r => r.passed).length,
    failed: projectResults.filter(r => !r.passed).length,
    bugs: projectResults.filter(r => !r.passed && r.severity).length,
    duration: Date.now() - projectStart
  });

  // 2. Beat Generation Edge Cases
  console.log('\n🎵 Running Beat Generation edge cases...\n');
  const beatStart = Date.now();
  await runBeatGenerationEdgeCases();
  suites.push({
    name: 'Beat Generation',
    results: [...beatResults],
    passed: beatResults.filter(r => r.passed).length,
    failed: beatResults.filter(r => !r.passed).length,
    bugs: beatResults.filter(r => !r.passed && r.severity).length,
    duration: Date.now() - beatStart
  });

  // 3. Vocal Recording Edge Cases
  console.log('\n🎤 Running Vocal Recording edge cases...\n');
  const vocalStart = Date.now();
  await runVocalRecordingEdgeCases();
  suites.push({
    name: 'Vocal Recording',
    results: [...vocalResults],
    passed: vocalResults.filter(r => r.passed).length,
    failed: vocalResults.filter(r => !r.passed).length,
    bugs: vocalResults.filter(r => !r.passed && r.severity).length,
    duration: Date.now() - vocalStart
  });

  // 4. Service Health Edge Cases
  console.log('\n🏥 Running Service Health edge cases...\n');
  const healthStart = Date.now();
  await runServiceHealthEdgeCases();
  suites.push({
    name: 'Service Health',
    results: [...healthResults],
    passed: healthResults.filter(r => r.passed).length,
    failed: healthResults.filter(r => !r.passed).length,
    bugs: healthResults.filter(r => !r.passed && r.severity).length,
    duration: Date.now() - healthStart
  });

  // 5. Cost Tracking Edge Cases
  console.log('\n💰 Running Cost Tracking edge cases...\n');
  const costStart = Date.now();
  await runCostTrackingEdgeCases();
  suites.push({
    name: 'Cost Tracking',
    results: [...costResults],
    passed: costResults.filter(r => r.passed).length,
    failed: costResults.filter(r => !r.passed).length,
    bugs: costResults.filter(r => !r.passed && r.severity).length,
    duration: Date.now() - costStart
  });

  const totalDuration = Date.now() - startTime;

  // Aggregate results
  const allResults = [
    ...projectResults,
    ...beatResults,
    ...vocalResults,
    ...healthResults,
    ...costResults
  ];

  const criticalBugs = allResults.filter(r => !r.passed && r.severity === 'critical');
  const highBugs = allResults.filter(r => !r.passed && r.severity === 'high');
  const mediumBugs = allResults.filter(r => !r.passed && r.severity === 'medium');
  const lowBugs = allResults.filter(r => !r.passed && r.severity === 'low');

  const report: FinalReport = {
    timestamp: new Date().toISOString(),
    totalSuites: suites.length,
    totalTests: allResults.length,
    totalPassed: allResults.filter(r => r.passed).length,
    totalFailed: allResults.filter(r => !r.passed).length,
    totalBugs: allResults.filter(r => !r.passed && r.severity).length,
    totalDuration,
    suites,
    criticalBugs,
    highBugs,
    mediumBugs,
    lowBugs
  };

  return report;
}

function printReport(report: FinalReport): void {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   FINAL TEST REPORT                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`⏱️  Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
  console.log(`📦 Test Suites: ${report.totalSuites}`);
  console.log(`🧪 Total Tests: ${report.totalTests}`);
  console.log(`✅ Passed: ${report.totalPassed}`);
  console.log(`❌ Failed: ${report.totalFailed}`);
  console.log(`🐛 Bugs Found: ${report.totalBugs}\n`);

  // Suite breakdown
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('SUITE BREAKDOWN:\n');

  report.suites.forEach(suite => {
    const passRate = ((suite.passed / (suite.passed + suite.failed)) * 100).toFixed(1);
    console.log(`${suite.name}:`);
    console.log(`  Tests: ${suite.passed + suite.failed}`);
    console.log(`  Passed: ${suite.passed} (${passRate}%)`);
    console.log(`  Failed: ${suite.failed}`);
    console.log(`  Bugs: ${suite.bugs}`);
    console.log(`  Duration: ${(suite.duration / 1000).toFixed(2)}s\n`);
  });

  // Bug severity breakdown
  if (report.totalBugs > 0) {
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('BUG SEVERITY BREAKDOWN:\n');
    console.log(`🔴 Critical: ${report.criticalBugs.length}`);
    console.log(`🟠 High: ${report.highBugs.length}`);
    console.log(`🟡 Medium: ${report.mediumBugs.length}`);
    console.log(`🟢 Low: ${report.lowBugs.length}\n`);

    // Critical bugs
    if (report.criticalBugs.length > 0) {
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('🔴 CRITICAL BUGS:\n');
      report.criticalBugs.forEach(bug => {
        console.log(`[${bug.category.toUpperCase()}] ${bug.scenario}`);
        console.log(`  Error: ${bug.error}\n`);
      });
    }

    // High priority bugs
    if (report.highBugs.length > 0) {
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('🟠 HIGH PRIORITY BUGS:\n');
      report.highBugs.forEach(bug => {
        console.log(`[${bug.category.toUpperCase()}] ${bug.scenario}`);
        console.log(`  Error: ${bug.error}\n`);
      });
    }

    // Medium priority bugs
    if (report.mediumBugs.length > 0) {
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('🟡 MEDIUM PRIORITY BUGS:\n');
      report.mediumBugs.forEach(bug => {
        console.log(`[${bug.category.toUpperCase()}] ${bug.scenario}`);
        console.log(`  Error: ${bug.error}\n`);
      });
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('SUMMARY:\n');

  if (report.totalBugs === 0) {
    console.log('🎉 No bugs discovered! All edge cases handled correctly.\n');
  } else {
    console.log(`⚠️  Found ${report.totalBugs} potential bugs across ${report.totalSuites} test suites.`);
    console.log(`   Priority breakdown: ${report.criticalBugs.length} critical, ${report.highBugs.length} high, ${report.mediumBugs.length} medium, ${report.lowBugs.length} low\n`);
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run all tests
const testStartTime = Date.now();

runAllEdgeCases()
  .then(report => {
    printReport(report);

    // Save report to file
    const reportPath = path.join(
      '/Users/benkennon/Jarvis/tests/edge-cases',
      'edge-case-test-report.json'
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Full report saved to: ${reportPath}\n`);

    // Save markdown report
    const mdReport = generateMarkdownReport(report);
    const mdPath = path.join(
      '/Users/benkennon/Jarvis/tests/edge-cases',
      'EDGE_CASE_TEST_REPORT.md'
    );
    fs.writeFileSync(mdPath, mdReport);
    console.log(`📝 Markdown report saved to: ${mdPath}\n`);

    // Exit code based on bugs found
    const exitCode = report.criticalBugs.length > 0 ? 2 : report.totalBugs > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });

function generateMarkdownReport(report: FinalReport): string {
  const lines: string[] = [];

  lines.push('# Edge Case Test Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`);
  lines.push(`**Duration:** ${(report.totalDuration / 1000).toFixed(2)}s`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Test Suites:** ${report.totalSuites}`);
  lines.push(`- **Total Tests:** ${report.totalTests}`);
  lines.push(`- **Passed:** ${report.totalPassed} (${((report.totalPassed / report.totalTests) * 100).toFixed(1)}%)`);
  lines.push(`- **Failed:** ${report.totalFailed}`);
  lines.push(`- **Bugs Found:** ${report.totalBugs}`);
  lines.push('');

  lines.push('## Test Suites');
  lines.push('');
  report.suites.forEach(suite => {
    const passRate = ((suite.passed / (suite.passed + suite.failed)) * 100).toFixed(1);
    lines.push(`### ${suite.name}`);
    lines.push('');
    lines.push(`- Tests: ${suite.passed + suite.failed}`);
    lines.push(`- Passed: ${suite.passed} (${passRate}%)`);
    lines.push(`- Failed: ${suite.failed}`);
    lines.push(`- Bugs: ${suite.bugs}`);
    lines.push(`- Duration: ${(suite.duration / 1000).toFixed(2)}s`);
    lines.push('');
  });

  if (report.totalBugs > 0) {
    lines.push('## Bugs Discovered');
    lines.push('');

    if (report.criticalBugs.length > 0) {
      lines.push('### 🔴 Critical Bugs');
      lines.push('');
      report.criticalBugs.forEach(bug => {
        lines.push(`**[${bug.category}] ${bug.scenario}**`);
        lines.push(`- Error: ${bug.error}`);
        lines.push('');
      });
    }

    if (report.highBugs.length > 0) {
      lines.push('### 🟠 High Priority Bugs');
      lines.push('');
      report.highBugs.forEach(bug => {
        lines.push(`**[${bug.category}] ${bug.scenario}**`);
        lines.push(`- Error: ${bug.error}`);
        lines.push('');
      });
    }

    if (report.mediumBugs.length > 0) {
      lines.push('### 🟡 Medium Priority Bugs');
      lines.push('');
      report.mediumBugs.forEach(bug => {
        lines.push(`**[${bug.category}] ${bug.scenario}**`);
        lines.push(`- Error: ${bug.error}`);
        lines.push('');
      });
    }

    if (report.lowBugs.length > 0) {
      lines.push('### 🟢 Low Priority Bugs');
      lines.push('');
      report.lowBugs.forEach(bug => {
        lines.push(`**[${bug.category}] ${bug.scenario}**`);
        lines.push(`- Error: ${bug.error}`);
        lines.push('');
      });
    }
  }

  lines.push('## Detailed Results');
  lines.push('');
  report.suites.forEach(suite => {
    lines.push(`### ${suite.name} - Detailed Results`);
    lines.push('');
    lines.push('| Scenario | Status | Error |');
    lines.push('|----------|--------|-------|');
    suite.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : `❌ FAIL ${result.severity ? `(${result.severity})` : ''}`;
      const error = result.error ? result.error.replace(/\|/g, '\\|') : '-';
      lines.push(`| ${result.scenario} | ${status} | ${error} |`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

export { runAllEdgeCases };
