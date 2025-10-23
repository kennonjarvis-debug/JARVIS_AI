/**
 * Apply database schema to Supabase using Management API
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';

const projectRef = 'xbdexmoivvszfyoekfqr';
const accessToken = 'sbp_7eaae0d63145b2eb5dc00042aadbe70585d30da0';

async function applySchema() {
  console.log('🔧 Applying database schema to Supabase...\n');

  // Read the schema file
  const schemaPath = path.join(__dirname, 'supabase', 'migrations', '20251022000000_initial_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  console.log(`📝 Executing SQL (${schema.length} characters)\n`);

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: schema })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error applying schema:', result);
      console.error(`\nHTTP ${response.status}: ${response.statusText}`);
      process.exit(1);
    }

    console.log('✅ Schema applied successfully!');
    console.log('\nResponse:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

applySchema();
