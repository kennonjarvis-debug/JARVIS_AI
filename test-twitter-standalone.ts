/**
 * Standalone Twitter Integration Test
 * Tests Twitter posting without Supabase dependency
 */

import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';

dotenv.config({ path: './packages/backend/.env' });

async function testTwitter() {
  console.log('🐦 Testing Twitter Integration...\n');

  // Get credentials from .env
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    console.error('❌ Twitter credentials not found in .env');
    process.exit(1);
  }

  console.log('✅ Twitter credentials loaded');

  // Initialize Twitter client
  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken: accessToken,
    accessSecret: accessTokenSecret,
  });

  const rwClient = client.readWrite;

  try {
    // Test 1: Get authenticated user info
    console.log('\n📋 Test 1: Getting user info...');
    const me = await client.v2.me();
    console.log(`✅ Authenticated as: @${me.data.username} (${me.data.name})`);

    // Test 2: Get recent mentions
    console.log('\n📋 Test 2: Getting recent mentions...');
    const mentions = await client.v2.userMentionTimeline(me.data.id, {
      max_results: 5,
    });
    console.log(`✅ Found ${mentions.data.data?.length || 0} recent mentions`);

    // Test 3: Post a test tweet
    console.log('\n📋 Test 3: Posting test tweet...');
    const tweetText = `🤖 JARVIS Integration Test - ${new Date().toLocaleString()}

Testing autonomous posting from the new integration framework!

#AI #Automation #BuildInPublic`;

    const result = await rwClient.v2.tweet({ text: tweetText });
    const tweetUrl = `https://twitter.com/${me.data.username}/status/${result.data.id}`;

    console.log(`✅ Tweet posted successfully!`);
    console.log(`   Tweet ID: ${result.data.id}`);
    console.log(`   URL: ${tweetUrl}`);

    // Save test result
    console.log('\n✅ All tests passed!');
    console.log(`\n🔗 View your tweet: ${tweetUrl}`);

    return {
      success: true,
      username: me.data.username,
      tweetId: result.data.id,
      tweetUrl,
    };
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testTwitter()
  .then((result) => {
    console.log('\n🎉 Twitter integration is working!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Twitter integration failed');
    process.exit(1);
  });
