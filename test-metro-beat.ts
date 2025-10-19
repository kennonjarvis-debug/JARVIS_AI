/**
 * Test Metro Boomin style beat generation
 * Request: "metro boomin' beat like morgan wallen pop country"
 */

import dotenv from 'dotenv';
dotenv.config();

import { musicGenerator } from './src/services/music-generator.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateMetroBeat() {
  console.log('🎵 Generating Metro Boomin x Morgan Wallen style beat...\n');

  try {
    // Generate beat with Metro Boomin style (trap) + Morgan Wallen influence (country)
    const result = await musicGenerator.generateBeat({
      genre: 'trap-country', // Fusion genre
      bpm: 140, // Metro Boomin typically uses 130-150 BPM
      mood: 'dark', // Metro Boomin's signature dark, atmospheric style
      duration: 30
    });

    console.log('✅ Beat generated successfully!\n');
    console.log('📍 Location:', result.localPath);
    console.log('🎼 Genre:', result.metadata.genre);
    console.log('⏱️  BPM:', result.metadata.tempo);
    console.log('🎹 Instruments:', result.metadata.instruments.join(', '));
    console.log('💰 Cost: $0.07');
    console.log('');

    // Open in Apple Music (Music app on macOS)
    console.log('🎧 Opening in Apple Music...');

    try {
      // Use 'open' command to open in default music player
      await execAsync(`open "${result.localPath}"`);
      console.log('✅ Beat opened in Music app!');

      // Alternative: Use 'afplay' to play directly from terminal
      console.log('🔊 Playing beat...');
      await execAsync(`afplay "${result.localPath}"`);

    } catch (openError: any) {
      console.error('⚠️  Could not auto-play:', openError.message);
      console.log('💡 Manually open the file at:', result.localPath);
    }

    return result;

  } catch (error: any) {
    console.error('❌ Beat generation failed:', error.message);
    console.error('\nFull error:', error);
    throw error;
  }
}

// Run the test
generateMetroBeat()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed');
    process.exit(1);
  });
