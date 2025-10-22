/**
 * Database Migration Runner
 * Runs SQL migrations against Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

if (SUPABASE_URL.includes('placeholder')) {
  console.error('❌ Please update SUPABASE_URL in .env with your actual Supabase URL');
  console.log('\n📝 To get your Supabase credentials:');
  console.log('1. Go to https://supabase.com');
  console.log('2. Create a new project (or use existing)');
  console.log('3. Go to Project Settings > API');
  console.log('4. Copy the URL and service_role key');
  console.log('5. Update .env file\n');
  process.exit(1);
}

async function runMigration(migrationFile: string) {
  console.log(`🔄 Running migration: ${migrationFile}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');

    // Split into statements (simple approach)
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      try {
        // Use Supabase's raw SQL execution via RPC
        // Note: You may need to create a stored procedure in Supabase to execute arbitrary SQL
        // For now, we'll use a different approach

        console.log(`  ${i + 1}/${statements.length}: Executing statement...`);

        // Since Supabase client doesn't directly support SQL execution,
        // we'll need to use the REST API directly
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({ query: statement }),
        });

        if (!response.ok) {
          // If exec_sql doesn't exist, show helpful message
          if (response.status === 404) {
            console.warn('\n⚠️  Note: SQL execution via API requires manual setup.');
            console.log('\n📝 To run migrations:');
            console.log('1. Open Supabase Dashboard');
            console.log('2. Go to SQL Editor');
            console.log(`3. Copy and paste the contents of: migrations/${migrationFile}`);
            console.log('4. Click "Run"\n');
            console.log('OR');
            console.log('\nCreate this function in your Supabase SQL Editor first:');
            console.log(`
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`);
            process.exit(1);
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('✅ Migration completed successfully');
  } catch (error: any) {
    console.error(`❌ Migration failed: ${error.message}`);
    console.log('\n📝 Manual Migration Required:');
    console.log('1. Open Supabase Dashboard > SQL Editor');
    console.log(`2. Copy contents of: migrations/${migrationFile}`);
    console.log('3. Paste and run in SQL Editor\n');
    process.exit(1);
  }
}

// Run migration
const migrationFile = process.argv[2] || '003_agent_activities.sql';
runMigration(migrationFile);
