import 'dotenv/config';
import { socialListeningOrchestrator, createDefaultConfig } from './social-listening-orchestrator';

/**
 * Demo: Social Listening System
 *
 * This demonstrates how to use Jarvis's social listening capabilities
 */
async function runSocialListeningDemo() {
  console.log('🎧 Jarvis Social Listening System - Demo\n');

  // Get Twitter bearer token from environment
  const twitterAccessToken = process.env.TWITTER_BEARER_TOKEN || process.env.TWITTER_ACCESS_TOKEN;

  if (!twitterAccessToken) {
    console.error('❌ TWITTER_BEARER_TOKEN environment variable not set');
    console.log('\nTo run this demo, you need a Twitter Bearer Token.');
    console.log('Set it in your .env file or export it:');
    console.log('export TWITTER_BEARER_TOKEN="your_token_here"\n');
    process.exit(1);
  }

  // Display current configuration (optimized for FREE tier)
  const config = createDefaultConfig();
  console.log('📋 Configuration (FREE TIER OPTIMIZED):');
  console.log(`   Platforms: ${config.platforms.join(', ')}`);
  console.log(`   Scan interval: ${config.scanInterval} minutes (once/day)`);
  console.log(`   Min quality score: ${config.minQualityScore}`);
  console.log(`   Max posts per scan: ${config.maxPostsPerScan}`);
  console.log(`   Auto-engage: ${config.autoEngageEnabled} (manual approval required)`);
  console.log(`   Requires approval: ${config.requireApproval}`);
  console.log(`   \n   💡 Tip: Upgrade to Twitter Basic ($100/mo) for hourly scans + auto-engage\n`);

  // Start listening
  try {
    await socialListeningOrchestrator.start(twitterAccessToken);

    // Show stats periodically
    setInterval(() => {
      const stats = socialListeningOrchestrator.getStats();

      console.log('\n📊 Current Stats:');
      console.log(`   Listening: ${stats.isListening ? '✓' : '✗'}`);
      console.log(`   Total discovered: ${stats.totalDiscovered}`);
      console.log(`   Pending responses: ${stats.pendingResponses}`);
      console.log(`   Active platforms: ${stats.platforms.join(', ')}\n`);

      // Show pending responses
      if (stats.pendingResponses > 0) {
        const pending = socialListeningOrchestrator.getPendingResponses();
        console.log('⏳ Pending Responses:');
        pending.forEach((item, index) => {
          console.log(`\n${index + 1}. Post by @${item.post.author.username}`);
          console.log(`   Content: "${item.post.content}"`);
          console.log(`   Response: "${item.response}"`);
        });
      }
    }, 60000); // Every minute

    // Keep process running
    console.log('\n✅ Social listening is now active!');
    console.log('Press Ctrl+C to stop.\n');

  } catch (error) {
    console.error('❌ Error starting social listening:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down social listening...');
  socialListeningOrchestrator.stop();
  process.exit(0);
});

// Run the demo
runSocialListeningDemo();
