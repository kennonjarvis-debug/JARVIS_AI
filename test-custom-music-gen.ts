/**
 * Test YOUR Custom MusicGen Model on Replicate
 *
 * This script tests your custom-trained musicgen-fine-tuner model
 * Cost: ~$0.07 per song (vs $4-5 with old system!)
 *
 * Usage:
 *   npx tsx test-custom-music-gen.ts
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { replicateMusicGenerator } from './src/services/replicate-music-generator.js';
import { logger } from './src/utils/logger.js';

async function testCustomMusicGeneration() {
  console.log('🎵 Testing YOUR Custom MusicGen Model on Replicate\n');
  console.log('=' .repeat(60));

  const testPrompts = [
    {
      name: 'Epic Orchestral',
      prompt: 'epic orchestral music with powerful drums and strings',
      duration: 30
    },
    {
      name: 'Chill Lo-Fi',
      prompt: 'chill lofi hip hop beat with vinyl crackle and mellow piano',
      duration: 30
    },
    {
      name: 'Electronic Dance',
      prompt: 'upbeat electronic dance music with heavy bass and synth leads',
      duration: 30
    }
  ];

  let totalCost = 0;

  for (const test of testPrompts) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎤 Test: ${test.name}`);
    console.log(`📝 Prompt: "${test.prompt}"`);
    console.log(`⏱️  Duration: ${test.duration}s`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const startTime = Date.now();

      // Generate music using YOUR custom model
      const result = await replicateMusicGenerator.generate({
        prompt: test.prompt,
        duration: test.duration,
        temperature: 1.0
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      totalCost += result.cost;

      console.log(`\n✅ Generation Complete! (${elapsed}s)\n`);
      console.log('📊 Results:');
      console.log(`   Model: ${result.model}`);
      console.log(`   Cost: $${result.cost.toFixed(4)}`);
      console.log(`   Duration: ${result.duration}s`);
      console.log(`   Audio URL: ${result.audioUrl}`);
      console.log(`   Local Path: ${result.localPath}`);
      console.log(`   Generated: ${result.metadata.generatedAt.toLocaleString()}`);

    } catch (error) {
      console.error(`\n❌ Test Failed: ${test.name}`);
      console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);
  console.log(`🎉 All tests complete!`);
  console.log(`${'='.repeat(60)}\n`);

  // Cost comparison
  console.log('\n💡 COST COMPARISON:');
  console.log(`   Old System (Stable Audio + ElevenLabs): $${(testPrompts.length * 4.5).toFixed(2)}`);
  console.log(`   Your Custom Model: $${totalCost.toFixed(4)}`);
  console.log(`   Savings: $${((testPrompts.length * 4.5) - totalCost).toFixed(2)} (${(((testPrompts.length * 4.5 - totalCost) / (testPrompts.length * 4.5)) * 100).toFixed(0)}% cheaper!)\n`);
}

// Run test
testCustomMusicGeneration()
  .then(() => {
    console.log('✅ Test script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
