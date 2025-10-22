/**
 * Test script for AI provider integrations
 *
 * Usage: npx tsx test-providers.ts
 */

import dotenv from 'dotenv';
import { smartAIRouter } from './src/core/smart-ai-router.js';
import { logger } from './src/utils/logger.js';

// Load environment variables
dotenv.config();

async function testProviders() {
  console.log('\n🧪 Testing AI Provider Integrations\n');
  console.log('='.repeat(60));

  try {
    // Test simple request
    const testPrompt = 'What is 2+2? Answer in one short sentence.';

    console.log('\n📝 Test Request:', testPrompt);
    console.log('\n⏳ Routing to optimal model...\n');

    const response = await smartAIRouter.route({
      prompt: testPrompt,
      complexity: 'simple',
      maxTokens: 100,
    });

    console.log('✅ Response received!\n');
    console.log('Model:', response.model);
    console.log('Provider:', response.provider);
    console.log('Response:', response.response);
    console.log('\n📊 Metrics:');
    console.log('  - Input tokens:', response.inputTokens);
    console.log('  - Output tokens:', response.outputTokens);
    console.log('  - Cost: $' + response.cost.toFixed(6));
    console.log('  - Latency:', response.latencyMs + 'ms');

    // Get usage stats
    console.log('\n📈 Usage Statistics:\n');
    const stats = smartAIRouter.getUsageStats();
    console.log('Total Requests:', stats.totalRequests);
    console.log('Gemini Daily Count:', stats.geminiDailyCount);
    console.log('Gemini Free Tier Remaining:', stats.geminiFreeTierRemaining);
    console.log('\nRouting Strategy:');
    console.log('  - Gemini:', stats.strategy.geminiPercentage + '%');
    console.log('  - GPT-4o Mini:', stats.strategy.gptMiniPercentage + '%');
    console.log('  - Claude:', stats.strategy.claudePercentage + '%');

    console.log('\n✅ Provider integration test successful!\n');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Provider test failed:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Run test
testProviders().catch(console.error);
