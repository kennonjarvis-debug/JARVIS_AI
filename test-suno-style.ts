/**
 * Test Suno-Style Music Generation
 *
 * Quick test script to verify the Suno-style generator is working.
 *
 * Usage:
 *   npx tsx test-suno-style.ts
 */

import { sunoStyleGenerator } from './src/services/suno-style-generator.js';
import { logger } from './src/utils/logger.js';

async function testSunoStyleGeneration() {
  console.log('🎵 Testing Suno-Style Music Generation...\n');

  // Test prompts
  const testPrompts = [
    {
      name: 'Trap Beat',
      prompt: 'trap beat about hustling in the city',
      duration: 60 // 1 minute for quick test
    },
    {
      name: 'Sad Love Song',
      prompt: 'sad love song in the style of Drake',
      duration: 60
    },
    {
      name: 'Drill Track',
      prompt: 'aggressive drill track with heavy 808s',
      duration: 60
    }
  ];

  for (const test of testPrompts) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎤 Test: ${test.name}`);
    console.log(`📝 Prompt: "${test.prompt}"`);
    console.log(`⏱️  Duration: ${test.duration}s`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const startTime = Date.now();

      // Generate song
      const song = await sunoStyleGenerator.generate(test.prompt, {
        duration: test.duration,
        quality: 'draft' // Use draft for faster testing
      });

      const endTime = Date.now();
      const elapsed = ((endTime - startTime) / 1000).toFixed(1);

      // Display results
      console.log(`\n✅ Generation Complete! (${elapsed}s)\n`);

      console.log('📊 Musical Intent:');
      console.log(`   Genre: ${song.intent.genre} ${song.intent.subgenre || ''}`);
      console.log(`   BPM: ${song.intent.bpm}`);
      console.log(`   Key: ${song.intent.key}`);
      console.log(`   Mood: ${song.intent.mood}`);
      console.log(`   Vocals: ${song.intent.vocals}`);
      console.log(`   Energy: ${song.intent.energy}`);

      console.log('\n📝 Generated Lyrics:');
      console.log(`   Verses: ${song.lyrics.verses.length}`);
      console.log(`   Chorus: ${song.lyrics.chorus ? 'Yes' : 'No'}`);
      console.log(`   Total Lines: ${song.lyrics.fullText.split('\n').length}`);

      console.log('\n🎵 Audio:');
      console.log(`   Path: ${song.audioPath}`);
      console.log(`   Duration: ${song.metadata.duration}s`);

      console.log('\n📄 Lyrics Preview:');
      const lyricsPreview = song.lyrics.fullText.split('\n').slice(0, 8).join('\n');
      console.log(`   ${lyricsPreview.replace(/\n/g, '\n   ')}`);
      console.log('   ...\n');

    } catch (error) {
      console.error(`\n❌ Test Failed: ${test.name}`);
      console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (error instanceof Error && error.stack) {
        console.error(`\n   Stack Trace:`);
        console.error(`   ${error.stack.split('\n').slice(0, 5).join('\n   ')}`);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 All tests complete!');
  console.log(`${'='.repeat(60)}\n`);
}

// Run tests
testSunoStyleGeneration()
  .then(() => {
    console.log('✅ Test script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
