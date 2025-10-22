/**
 * Content Automation Demo
 *
 * Demonstrates how Jarvis can automatically generate social media content
 */

import { ContentAutomationAgent } from '../src/agents/content-automation-agent.js';
import dotenv from 'dotenv';

dotenv.config();

async function demo() {
  console.log('🚀 Content Automation Demo\n');

  const agent = new ContentAutomationAgent();

  try {
    // Initialize
    await agent.initialize();
    console.log('✅ Agent initialized\n');

    // Example 1: Generate a single post with image
    console.log('📸 Example 1: Generating a Twitter post with DALL-E 3 image...\n');

    const content1 = await agent.generateContent({
      topic: 'The future of AI in music production',
      platform: 'twitter',
      contentType: 'image',
      style: 'futuristic and vibrant',
    });

    console.log('✅ Content generated!');
    console.log(`   Type: ${content1.type}`);
    console.log(`   Caption: ${content1.caption}`);
    console.log(`   Hashtags: ${content1.hashtags.join(' ')}`);
    if (content1.mediaPath) {
      console.log(`   Image saved to: ${content1.mediaPath}`);
    }
    console.log('');

    // Example 2: Generate content calendar
    console.log('📅 Example 2: Generating 7-day content calendar...\n');

    const calendar = await agent.generateContentCalendar(
      'AI-powered music creation and production',
      7
    );

    console.log(`✅ Generated ${calendar.length} content ideas:\n`);
    calendar.forEach((idea, index) => {
      console.log(`${index + 1}. ${idea.topic}`);
      console.log(`   Platform: ${idea.platform}`);
      console.log(`   Type: ${idea.contentType}`);
      console.log(`   Scheduled: ${idea.schedule?.toLocaleDateString()}`);
      console.log('');
    });

    console.log('🎉 Demo complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. The generated image is ready to post manually');
    console.log('   2. Or ask Jarvis via iMessage: "Create a social post about [topic]"');
    console.log('   3. When Sora 2 API is available, videos will be generated automatically\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

demo().catch(console.error);
