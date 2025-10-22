/**
 * Audit System Test
 *
 * Tests the audit system's ability to track progress and generate reports
 * for both Jarvis and AI DAWG projects.
 */

import { AuditSystem } from '../src/systems/audit-system.js';
import dotenv from 'dotenv';
import * as path from 'path';
import * as os from 'os';

dotenv.config();

async function test() {
  console.log('📊 Audit System Test\n');

  const audit = new AuditSystem();

  try {
    // Initialize
    console.log('Initializing audit system...');
    await audit.initialize();
    console.log('✅ Audit system initialized\n');

    // Log some sample activities
    console.log('Logging sample activities...\n');

    await audit.logActivity(
      'jarvis',
      'milestone',
      'Content automation system deployed',
      { features: ['DALL-E 3 integration', 'Twitter API', 'LinkedIn API'] },
      'info'
    );

    await audit.logActivity(
      'jarvis',
      'activity',
      'iMessage agent processed 15 messages',
      { messagesProcessed: 15, avgResponseTime: 45000 },
      'info'
    );

    await audit.logActivity(
      'ai-dawg',
      'milestone',
      'ChatGPT-style interface deployed to production',
      { deployment: 'Vercel', url: 'https://ai-dawg-v0-1.vercel.app' },
      'info'
    );

    await audit.logActivity(
      'jarvis',
      'error',
      'Failed to post to Twitter - credentials not configured',
      { error: 'Authentication failed' },
      'warning'
    );

    console.log('✅ Sample activities logged\n');

    // Generate progress reports
    console.log('📈 Generating progress reports...\n');

    console.log('='.repeat(50));
    console.log('JARVIS PROGRESS REPORT (Last 7 Days)');
    console.log('='.repeat(50));
    const jarvisReport = await audit.generateProgressReport('jarvis', 7);

    console.log(`\nPeriod: ${jarvisReport.period.start.toLocaleDateString()} - ${jarvisReport.period.end.toLocaleDateString()}\n`);

    console.log('Summary:');
    console.log(`  Total Activities: ${jarvisReport.summary.totalActivities}`);
    console.log(`  Milestones: ${jarvisReport.summary.milestones}`);
    console.log(`  Errors: ${jarvisReport.summary.errors}`);
    console.log(`  Avg Performance: ${Math.round(jarvisReport.summary.avgPerformance)}ms\n`);

    console.log('Metrics:');
    console.log(`  Total Commits: ${jarvisReport.metrics.totalCommits}`);
    console.log(`  Lines of Code: ${jarvisReport.metrics.linesOfCode.toLocaleString()}`);
    console.log(`  Files: ${jarvisReport.metrics.filesCount}`);
    console.log(`  Contributors: ${jarvisReport.metrics.contributors.join(', ')}\n`);

    if (jarvisReport.highlights.length > 0) {
      console.log('Highlights:');
      jarvisReport.highlights.forEach((h) => console.log(`  ✓ ${h}`));
      console.log('');
    }

    if (jarvisReport.concerns.length > 0) {
      console.log('Concerns:');
      jarvisReport.concerns.forEach((c) => console.log(`  ⚠  ${c}`));
      console.log('');
    }

    if (jarvisReport.recommendations.length > 0) {
      console.log('Recommendations:');
      jarvisReport.recommendations.forEach((r) => console.log(`  →  ${r}`));
      console.log('');
    }

    console.log('\n' + '='.repeat(50));
    console.log('AI DAWG PROGRESS REPORT (Last 7 Days)');
    console.log('='.repeat(50));
    const aiDawgReport = await audit.generateProgressReport('ai-dawg', 7);

    console.log(`\nPeriod: ${aiDawgReport.period.start.toLocaleDateString()} - ${aiDawgReport.period.end.toLocaleDateString()}\n`);

    console.log('Summary:');
    console.log(`  Total Activities: ${aiDawgReport.summary.totalActivities}`);
    console.log(`  Milestones: ${aiDawgReport.summary.milestones}`);
    console.log(`  Errors: ${aiDawgReport.summary.errors}\n`);

    console.log('Metrics:');
    console.log(`  Total Commits: ${aiDawgReport.metrics.totalCommits}`);
    console.log(`  Lines of Code: ${aiDawgReport.metrics.linesOfCode.toLocaleString()}`);
    console.log(`  Files: ${aiDawgReport.metrics.filesCount}`);
    console.log(`  Contributors: ${aiDawgReport.metrics.contributors.join(', ')}`);
    console.log(`  Last Activity: ${aiDawgReport.metrics.lastActivity.toLocaleDateString()}\n`);

    console.log(`  Features (${aiDawgReport.metrics.features.length}):`);
    aiDawgReport.metrics.features.slice(0, 5).forEach((feature, index) => {
      console.log(`    ${index + 1}. ${feature.name} [${feature.significance}]`);
    });

    if (aiDawgReport.highlights.length > 0) {
      console.log('\nHighlights:');
      aiDawgReport.highlights.forEach((h) => console.log(`  ✓ ${h}`));
    }

    if (aiDawgReport.concerns.length > 0) {
      console.log('\nConcerns:');
      aiDawgReport.concerns.forEach((c) => console.log(`  ⚠  ${c}`));
    }

    if (aiDawgReport.recommendations.length > 0) {
      console.log('\nRecommendations:');
      aiDawgReport.recommendations.forEach((r) => console.log(`  →  ${r}`));
    }

    console.log('\n' + '='.repeat(50));
    console.log('');

    // Export reports
    const reportsDir = path.join(os.homedir(), '.jarvis', 'reports');
    await audit.exportReport(
      jarvisReport,
      path.join(reportsDir, 'jarvis-progress-report.txt')
    );
    await audit.exportReport(
      aiDawgReport,
      path.join(reportsDir, 'ai-dawg-progress-report.txt')
    );

    console.log('✅ Reports exported to ~/.jarvis/reports/\n');

    console.log('✅ Test complete!\n');

    console.log('💡 Next steps:');
    console.log('   1. Review reports in ~/.jarvis/reports/');
    console.log('   2. Integrate audit logging into all Jarvis agents');
    console.log('   3. Set up automated weekly report generation\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

test().catch(console.error);
