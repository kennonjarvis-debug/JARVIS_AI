#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'packages/backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
  process.exit(1);
}

console.log('Connecting to Supabase:', supabaseUrl);

// Create Supabase client with service key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read the migration file
const migrationPath = path.join(__dirname, '20251019135932_phase1_rls_and_indexes.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function applyMigration() {
  try {
    console.log('Applying migration from:', migrationPath);
    console.log('Migration size:', migrationSQL.length, 'bytes');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql RPC doesn't exist, we need to use raw SQL execution
      // This requires using the PostgREST API directly
      console.log('Trying direct SQL execution...');

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql: migrationSQL }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log('Migration applied successfully via direct execution!');
      return;
    }

    console.log('Migration applied successfully!');
    console.log('Result:', data);

  } catch (err) {
    console.error('Error applying migration:', err.message);
    console.error('Full error:', err);
    console.log('\n\nTo apply manually, run this SQL in Supabase SQL Editor:');
    console.log('Visit: https://supabase.com/dashboard/project/nzmzmsmxbiptilzgdmgt/sql/new');
    console.log('\nOr copy the migration file contents from:');
    console.log(migrationPath);
    process.exit(1);
  }
}

applyMigration();
