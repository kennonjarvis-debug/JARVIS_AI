/**
 * Apply database schema to Supabase
 * Uses service role key for direct SQL execution
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.DAWG_SUPABASE_URL!;
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZGV4bW9pdnZzemZ5b2VrZnFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA4NTMwMSwiZXhwIjoyMDc2NjYxMzAxfQ.2_bP0Kf0S7NJu9FhD4K_vQ4Vz4eNNZDMSwt5dv23FKw';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applySchema() {
  console.log('🔧 Applying database schema to Supabase...\n');

  // Read the schema file
  const schemaPath = path.join(__dirname, 'supabase', 'migrations', '20251022000000_initial_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split by semicolons to execute statements individually
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.trim().startsWith('--') || statement.trim() === ';') {
      continue;
    }

    // Get a short preview of the statement
    const preview = statement.substring(0, 80).replace(/\n/g, ' ').trim();

    try {
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);

      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Try direct execution via REST API if RPC fails
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }

      console.log(`  ✅ Success\n`);
      successCount++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Ignore "already exists" errors
      if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
        console.log(`  ⚠️  Skipped (already exists)\n`);
        successCount++;
      } else {
        console.error(`  ❌ Error: ${errorMsg}\n`);
        errorCount++;
      }
    }
  }

  console.log('─'.repeat(60));
  console.log(`✅ Completed: ${successCount} successful, ${errorCount} errors`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. Check errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 Database schema applied successfully!');
  }
}

applySchema().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
