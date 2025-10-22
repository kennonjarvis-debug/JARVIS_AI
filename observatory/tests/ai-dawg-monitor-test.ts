/**
 * AI DAWG Monitor Test
 *
 * Tests the AI DAWG monitoring agent's ability to track repository changes
 * and generate marketing content.
 */

import { AIDawgMonitorAgent } from '../src/agents/ai-dawg-monitor-agent.js';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  console.log('🔍 AI DAWG Monitor Agent Test\n');

  const agent = new AIDawgMonitorAgent('/Users/benkennon/ai-dawg-v0.1');

  try {
    // Initialize
    console.log('Initializing agent...');
    await agent.initialize();
    console.log('✅ Agent initialized\n');

    // Get project metrics
    console.log('📊 Fetching project metrics...\n');
    const metrics = await agent.getProjectMetrics();

    console.log('Project Metrics:');
    console.log(`  Total Commits: ${metrics.totalCommits}`);
    console.log(`  Lines of Code: ${metrics.linesOfCode.toLocaleString()}`);
    console.log(`  Files Count: ${metrics.filesCount}`);
    console.log(`  Last Activity: ${metrics.lastActivity.toLocaleDateString()}`);
    console.log(`  Contributors: ${metrics.contributors.join(', ')}`);
    console.log(`\n  Features (${metrics.features.length}):`);

    metrics.features.forEach((feature, index) => {
      console.log(`    ${index + 1}. ${feature.name} [${feature.significance}]`);
      console.log(`       ${feature.description}`);
    });

    console.log('\n');

    // Example: Generate marketing content on demand
    console.log('🎨 Testing manual content generation...\n');
    console.log('⚠️  This will generate and attempt to post content to social media');
    console.log('    (Will fail if Twitter/LinkedIn credentials not configured)\n');

    // Uncomment to actually generate and post:
    // await agent.generateMarketingContent(
    //   'AI DAWG just hit a major milestone with new audio processing features!',
    //   'twitter'
    // );

    console.log('✅ Test complete!\n');

    console.log('💡 Next steps:');
    console.log('   1. Set up Twitter/LinkedIn API credentials in .env');
    console.log('   2. Start monitoring with: agent.startMonitoring({ autoPost: true })');
    console.log('   3. The agent will automatically post about significant updates\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

test().catch(console.error);
