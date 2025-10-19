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

async function createTable() {
  try {
    console.log('Creating oauth_states table...');

    const {  data, error } = await supabase.rpc('exec', {
      sql: `
        -- Create table for OAuth state storage
        CREATE TABLE IF NOT EXISTS oauth_states (
          state TEXT PRIMARY KEY,
          code_verifier TEXT NOT NULL,
          observatory_id TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Index for cleanup of expired states
        CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

        -- Enable RLS
        ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

        -- Policy: Allow all operations
        DROP POLICY IF EXISTS "Allow all operations on oauth_states" ON oauth_states;
        CREATE POLICY "Allow all operations on oauth_states"
          ON oauth_states
          FOR ALL
          USING (true)
          WITH CHECK (true);

        SELECT 'Table created successfully' as result;
      `
    });

    if (error) {
      console.error('Error creating table:', error);
      process.exit(1);
    }

    console.log('✅ oauth_states table created successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createTable();
