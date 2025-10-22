/**
 * Test script for the new Twitter metrics endpoint
 * Run with: tsx test-metrics-endpoint.ts
 */

import { config } from 'dotenv';

// Load environment variables
config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * Test the metrics endpoint
 */
async function testMetricsEndpoint() {
  console.log('🧪 Testing Twitter Metrics Endpoint\n');

  // You'll need to replace these with actual values from your database
  const INTEGRATION_ID = process.env.TEST_INTEGRATION_ID || 'YOUR_INTEGRATION_ID_HERE';
  const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';

  console.log(`📡 Testing endpoint: GET ${API_BASE_URL}/api/integrations/${INTEGRATION_ID}/metrics`);
  console.log(`🔑 Using auth token: ${AUTH_TOKEN.substring(0, 20)}...`);
  console.log('');

  try {
    const response = await fetch(`${API_BASE_URL}/api/integrations/${INTEGRATION_ID}/metrics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Request failed:', response.status, response.statusText);
      console.error('Error:', data);
      return;
    }

    console.log('✅ Success! Received metrics:\n');

    // Display account info
    console.log('👤 Account:');
    console.log(`   Username: @${data.account.username}`);
    console.log(`   Name: ${data.account.name}`);
    console.log(`   Verified: ${data.account.verified ? '✓' : '✗'}`);
    console.log(`   Profile Image: ${data.account.profile_image_url}`);
    console.log('');

    // Display metrics
    console.log('📊 Metrics:');
    console.log(`   Followers: ${data.metrics.followers_count.toLocaleString()}`);
    console.log(`   Following: ${data.metrics.following_count.toLocaleString()}`);
    console.log(`   Tweets: ${data.metrics.tweet_count.toLocaleString()}`);
    console.log(`   Listed: ${data.metrics.listed_count.toLocaleString()}`);
    console.log('');

    // Display engagement
    console.log('💬 Engagement:');
    console.log(`   Engagement Rate: ${data.engagement.engagement_rate}%`);
    console.log(`   Avg Engagement/Tweet: ${data.engagement.average_engagement_per_tweet}`);
    console.log(`   Avg Impressions/Tweet: ${data.engagement.average_impressions_per_tweet.toLocaleString()}`);
    console.log(`   Total Engagement (last 10): ${data.engagement.total_engagement_last_10_tweets}`);
    console.log(`   Total Impressions (last 10): ${data.engagement.total_impressions_last_10_tweets.toLocaleString()}`);
    console.log('');

    // Display recent tweets
    console.log(`📝 Recent Tweets (${data.recent_tweets.length}):`);
    data.recent_tweets.forEach((tweet: any, index: number) => {
      console.log(`   ${index + 1}. "${tweet.text}"`);
      console.log(`      Likes: ${tweet.metrics.likes} | Retweets: ${tweet.metrics.retweets} | Replies: ${tweet.metrics.replies}`);
      console.log(`      Impressions: ${tweet.metrics.impressions.toLocaleString()} | Engagement Rate: ${tweet.metrics.engagement_rate}%`);
      console.log(`      Posted: ${new Date(tweet.created_at).toLocaleString()}`);
      console.log('');
    });

    console.log(`⏰ Fetched at: ${new Date(data.fetched_at).toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

// Run the test
testMetricsEndpoint().catch(console.error);
