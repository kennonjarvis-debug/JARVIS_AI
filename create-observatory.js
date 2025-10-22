#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'packages/backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create Supabase client with service key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createObservatory() {
  try {
    console.log('Connecting to Supabase:', supabaseUrl);

    // First, check the table schema
    console.log('\n1. Checking observatories table schema...');
    const { data: columns, error: schemaError } = await supabase
      .from('observatories')
      .select('*')
      .limit(0);

    if (schemaError) {
      console.log('Schema check failed (table might be empty, that\'s OK)');
    }

    // List all users
    console.log('\n2. Fetching users...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Failed to list users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      throw new Error('No users found. Please sign up first at your app.');
    }

    console.log(`Found ${users.length} user(s):`);
    users.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email} (ID: ${user.id})`);
    });

    // Use the first user (or most recent)
    const user = users[0];
    console.log(`\n3. Creating observatory for: ${user.email}`);

    // Try to insert with owner_id first
    const { data: observatory, error: insertError } = await supabase
      .from('observatories')
      .insert({
        owner_id: user.id,
        name: `${user.email?.split('@')[0] || 'My'} Observatory`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // If owner_id doesn't exist, try user_id
      console.log('Retrying with user_id column...');
      const { data: observatory2, error: insertError2 } = await supabase
        .from('observatories')
        .insert({
          user_id: user.id,
          name: `${user.email?.split('@')[0] || 'My'} Observatory`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError2) {
        throw new Error(`Failed to create observatory: ${insertError2.message}`);
      }

      console.log('\n✅ Observatory created successfully!');
      console.log('Observatory ID:', observatory2.id);
      console.log('Owner:', user.email);
      return;
    }

    console.log('\n✅ Observatory created successfully!');
    console.log('Observatory ID:', observatory.id);
    console.log('Owner:', user.email);

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

createObservatory();
