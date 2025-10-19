/**
 * Test Suno API Integration with Metro Boomin Style Beat
 *
 * This test demonstrates the upgraded music generation system:
 * - Real Suno API for professional quality
 * - Expert audio engineer prompting via GPT-4o
 * - Proper song structure (intro/verse/chorus/bridge)
 * - Different chord progressions per section
 * - Music theory analysis (key, BPM, scales)
 *
 * Usage:
 *   npx tsx test-suno-metro.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { musicGenerator } from './src/services/music-generator.js';
import { logger } from './src/utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testSunoMetroBeat() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   SUNO API INTEGRATION TEST                                 ║');
  console.log('║   Metro Boomin x Morgan Wallen Style Beat                  ║');
  console.log('║                                                             ║');
  console.log('║   Features:                                                 ║');
  console.log('║   • Expert audio engineer prompting (GPT-4o)               ║');
  console.log('║   • Music theory analysis (chords, key, BPM)               ║');
  console.log('║   • Proper song structure (verse/chorus/bridge)            ║');
  console.log('║   • Different sections with unique chord progressions      ║');
  console.log('║   • Professional mixing & mastering                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const startTime = Date.now();

    // Generate Metro Boomin style beat using Suno API
    console.log('🎵 Generating Metro Boomin x Morgan Wallen beat with Suno API...\n');
    console.log('Request Parameters:');
    console.log('  Genre: trap-country fusion');
    console.log('  BPM: 140 (Metro Boomin signature)');
    console.log('  Mood: dark, atmospheric');
    console.log('  Duration: 120 seconds (2 minutes)\n');

    const result = await musicGenerator.generateBeat({
      genre: 'trap-country',
      bpm: 140,
      mood: 'dark',
      duration: 120
    });

    const endTime = Date.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(1);

    // Display results
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ GENERATION COMPLETE!                                  ║');
    console.log(`║   Time: ${elapsed}s                                           ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 MUSIC METADATA:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  ID:          ${result.id}`);
    console.log(`  Genre:       ${result.metadata.genre}`);
    console.log(`  Key:         ${result.metadata.key || 'N/A'}`);
    console.log(`  BPM:         ${result.metadata.tempo}`);
    console.log(`  Duration:    ${result.duration}s`);
    console.log(`  Instruments: ${result.metadata.instruments.join(', ')}`);
    console.log('');

    // Display chord progressions if available
    if (result.metadata.chordProgressions) {
      console.log('🎼 CHORD PROGRESSIONS:');
      console.log('═══════════════════════════════════════════════════════════\n');
      const chords = result.metadata.chordProgressions;

      if (chords.verse) {
        console.log(`  Verse:   ${chords.verse.join(' → ')}`);
      }
      if (chords.chorus) {
        console.log(`  Chorus:  ${chords.chorus.join(' → ')}`);
      }
      if (chords.bridge) {
        console.log(`  Bridge:  ${chords.bridge.join(' → ')}`);
      }
      console.log('');
    }

    // Display song structure if available
    if (result.metadata.songStructure && result.metadata.songStructure.sections) {
      console.log('🎹 SONG STRUCTURE:');
      console.log('═══════════════════════════════════════════════════════════\n');

      result.metadata.songStructure.sections.forEach((section: any, index: number) => {
        console.log(`  ${index + 1}. ${section.type.toUpperCase()} (${section.duration}s)`);
        console.log(`     Chords: ${section.chords.join(' → ')}`);
        console.log(`     Notes:  ${section.notes}`);
        console.log('');
      });
    }

    console.log('📁 FILE INFORMATION:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  Local Path:  ${result.localPath}`);
    console.log(`  Audio URL:   ${result.audioUrl}`);
    console.log(`  Generated:   ${result.metadata.generatedAt.toISOString()}`);
    console.log('');

    // Quality comparison
    console.log('💡 QUALITY UPGRADE:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('  Old System (MusicGen):');
    console.log('  ❌ 30-second limit');
    console.log('  ❌ No song structure');
    console.log('  ❌ No chord progressions');
    console.log('  ❌ Basic audio quality');
    console.log('  ✅ Cost: $0.07/song');
    console.log('');
    console.log('  New System (Suno API):');
    console.log('  ✅ Full-length songs');
    console.log('  ✅ Verse/Chorus/Bridge structure');
    console.log('  ✅ Expert chord progressions');
    console.log('  ✅ Professional studio quality');
    console.log('  ✅ Expert audio engineer prompting');
    console.log('');

    // Open and play the beat
    console.log('🎧 OPENING BEAT IN MUSIC APP...\n');

    try {
      // Use 'open' to open in default music player
      await execAsync(`open "${result.localPath}"`);
      console.log('✅ Beat opened in Music app!');
      console.log('');

      // Wait a moment before playing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Play the beat
      console.log('🔊 PLAYING BEAT...\n');
      console.log('Press Ctrl+C to stop\n');

      await execAsync(`afplay "${result.localPath}"`);

    } catch (playError: any) {
      console.error('⚠️  Could not auto-play:', playError.message);
      console.log('');
      console.log('💡 Manually open the file at:');
      console.log(`   ${result.localPath}`);
      console.log('');
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   🎉 TEST COMPLETE!                                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    return result;

  } catch (error: any) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║   ❌ GENERATION FAILED                                     ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');

    console.error('Error Details:');
    console.error(`  Message: ${error.message}`);
    console.error('');

    if (error.stack) {
      console.error('Stack Trace:');
      console.error(error.stack);
    }

    // Check for common issues
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('═══════════════════════════════════════════════════════════\n');

    if (error.message.includes('SUNO_COOKIE') || error.message.includes('SUNO_API_KEY')) {
      console.error('  ⚠️  Missing Suno API credentials');
      console.error('');
      console.error('  To fix:');
      console.error('  1. Get your Suno cookie from browser DevTools');
      console.error('  2. Add to .env: SUNO_COOKIE=your_cookie_here');
      console.error('  3. Or add: SUNO_API_KEY=your_api_key');
      console.error('');
    }

    if (error.message.includes('OPENAI_API_KEY')) {
      console.error('  ⚠️  Missing OpenAI API key');
      console.error('');
      console.error('  The expert prompting system requires GPT-4o');
      console.error('  Add to .env: OPENAI_API_KEY=your_key_here');
      console.error('');
    }

    throw error;
  }
}

// Run the test
testSunoMetroBeat()
  .then(() => {
    console.log('✅ Test script finished successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed\n');
    process.exit(1);
  });
