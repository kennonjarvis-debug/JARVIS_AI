/**
 * Full API Test - Load integration from DB and post tweet
 */

import { TwitterApi } from 'twitter-api-v2';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './packages/backend/.env' });

const OBSERVATORY_ID = 'd66d0922-a735-4ea5-bd70-daef059e392c';

async function testFullStack() {
  console.log('🧪 Testing Full Stack Integration...\n');

  // 1. Connect to Supabase
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Connected to Supabase');

  // 2. Load Twitter integration from database
  console.log('📋 Loading Twitter integration from database...');
  const { data: integration, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('observatory_id', OBSERVATORY_ID)
    .eq('platform', 'twitter')
    .single();

  if (error || !integration) {
    console.error('❌ Failed to load integration:', error);
    process.exit(1);
  }

  console.log(`✅ Loaded integration: ${integration.account_name} (ID: ${integration.id})`);

  // 3. Initialize Twitter client
  const creds = integration.credentials as any;
  const client = new TwitterApi({
    appKey: creds.api_key,
    appSecret: creds.api_secret,
    accessToken: creds.access_token,
    accessSecret: creds.access_token_secret,
  });

  const rwClient = client.readWrite;
  console.log('✅ Twitter client initialized');

  // 4. Get user info
  const me = await client.v2.me();
  console.log(`✅ Authenticated as: @${me.data.username}`);

  // 5. Post tweet
  const tweetText = `🤖 JARVIS Full Stack Test!

Posted through the complete backend with:
✅ Supabase database
✅ Integration framework
✅ Activity logging

#AI #Automation #BuildInPublic`;

  console.log('\n📝 Posting tweet...');
  const result = await rwClient.v2.tweet({ text: tweetText });
  const tweetUrl = `https://twitter.com/${me.data.username}/status/${result.data.id}`;

  console.log(`✅ Tweet posted successfully!`);
  console.log(`   Tweet ID: ${result.data.id}`);
  console.log(`   URL: ${tweetUrl}`);

  // 6. Log activity to database
  console.log('\n📊 Logging activity to database...');
  const { error: activityError } = await supabase.from('activity_logs').insert({
    observatory_id: OBSERVATORY_ID,
    integration_id: integration.id,
    activity_type: 'post',
    action: 'created',
    title: 'Posted tweet via full stack test',
    description: tweetText.slice(0, 100),
    metadata: {
      tweetId: result.data.id,
      url: tweetUrl,
      username: me.data.username,
    },
    status: 'success',
  });

  if (activityError) {
    console.warn('⚠️  Activity logging failed:', activityError.message);
  } else {
    console.log('✅ Activity logged to database');
  }

  // 7. Save to social_posts table
  console.log('\n💾 Saving to social_posts table...');
  const { error: postError } = await supabase.from('social_posts').insert({
    observatory_id: OBSERVATORY_ID,
    integration_id: integration.id,
    platform: 'twitter',
    external_id: result.data.id,
    content: tweetText,
    media_urls: [],
    published_at: new Date().toISOString(),
    status: 'published',
    engagement: {},
  });

  if (postError) {
    console.warn('⚠️  Social post save failed:', postError.message);
  } else {
    console.log('✅ Saved to social_posts table');
  }

  console.log(`\n🎉 Full stack test complete!`);
  console.log(`\n🔗 View your tweet: ${tweetUrl}`);
}

testFullStack()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
