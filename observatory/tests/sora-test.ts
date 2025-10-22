/**
 * Test Sora 2 Integration and Content Generation
 */

import { SoraIntegration } from '../src/integrations/sora/index.js';
import { getOpenAIClient } from '../src/integrations/anthropic.js';
import dotenv from 'dotenv';

dotenv.config();

async function testSora() {
  console.log('🎬 Testing Sora 2 Integration\n');

  const sora = new SoraIntegration();

  try {
    // Initialize
    await sora.initialize();
    console.log('✅ Sora integration initialized\n');

    // Check availability
    console.log('🔍 Checking if Sora 2 is available in your account...');
    const available = await sora.checkAvailability();

    if (available) {
      console.log('✅ Sora 2 is AVAILABLE!\n');

      // Generate a test video prompt
      console.log('📝 Generating video prompt...');
      const prompt = await sora.generateVideoPrompt(
        'A peaceful sunset over the ocean',
        'cinematic'
      );
      console.log(`Generated prompt: "${prompt}"\n`);

      // Try to generate a video
      console.log('🎥 Generating video (this may take 1-2 minutes)...');
      const video = await sora.generateVideo({
        prompt,
        duration: 5,
        aspectRatio: '16:9',
        style: 'cinematic',
      });

      console.log('✅ Video generated successfully!');
      console.log(`   URL: ${video.videoUrl}`);
      console.log(`   Path: ${video.videoPath}`);
      console.log(`   Duration: ${video.duration}s\n`);
    } else {
      console.log('⚠️  Sora 2 is NOT yet available in your account.\n');
      console.log('📋 To get Sora access:');
      console.log('   1. Visit: https://openai.com/sora');
      console.log('   2. Join the waitlist');
      console.log('   3. Wait for approval email from OpenAI\n');
      console.log('💡 In the meantime, Jarvis can still:');
      console.log('   - Generate images with DALL-E 3');
      console.log('   - Create text content with GPT-4');
      console.log('   - Auto-post to social media\n');

      // Demo prompt generation (this works even without Sora)
      console.log('📝 Testing prompt generation (works now)...');
      const prompt = await sora.generateVideoPrompt(
        'A futuristic city at night with flying cars',
        'cyberpunk'
      );
      console.log(`✅ Generated prompt: "${prompt}"\n`);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testSora().catch(console.error);
