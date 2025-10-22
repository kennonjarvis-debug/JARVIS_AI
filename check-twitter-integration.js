#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, 'packages/backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkIntegrations() {
  try {
    console.log('\n=== Checking Twitter Integrations ===\n');

    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'twitter')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching integrations:', error.message);
      return;
    }

    if (!integrations || integrations.length === 0) {
      console.log('❌ No Twitter integrations found');
      console.log('\nThis means the OAuth flow didn\'t complete successfully.');
      console.log('Possible reasons:');
      console.log('1. Client ID/Secret mismatch (update Netlify env vars)');
      console.log('2. OAuth callback failed');
      console.log('3. Database permissions issue');
      return;
    }

    console.log(`✅ Found ${integrations.length} Twitter integration(s):\n`);

    integrations.forEach((integration, index) => {
      console.log(`Integration #${index + 1}:`);
      console.log(`  ID: ${integration.id}`);
      console.log(`  Account: ${integration.account_name || 'N/A'}`);
      console.log(`  Status: ${integration.status}`);
      console.log(`  Observatory ID: ${integration.observatory_id}`);
      console.log(`  Created: ${integration.created_at}`);
      console.log(`  Metadata:`, integration.metadata);
      console.log('');
    });

    console.log('Next steps:');
    console.log('1. Update Netlify environment variables with correct Client ID/Secret');
    console.log('2. Trigger a new deployment');
    console.log('3. Refresh your dashboard page');
    console.log('4. Twitter widget should appear automatically!');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkIntegrations();
