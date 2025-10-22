import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { autoRefreshToken: false, persistSession: false }
});

async function applyMigration() {
  console.log('🔧 Adding role column to User table...\n');

  // We'll do this the simple way - directly INSERT/UPDATE the data
  // since we can't run raw DDL through Supabase REST API easily

  try {
    // Check if role column exists by trying to select it
    const { error: checkError } = await supabase
      .from('User')
      .select('role')
      .limit(1);

    if (checkError) {
      console.log('❌ Role column does not exist.');
      console.log('\n📋 Please run this SQL in Supabase Dashboard → SQL Editor:\n');
      console.log('ALTER TABLE "User" ADD COLUMN role TEXT DEFAULT \'user\';');
      console.log('CREATE INDEX idx_user_role ON "User"(role);');
      console.log('\nThen re-run this script.\n');
      process.exit(1);
    }

    console.log('✅ Role column already exists!\n');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

applyMigration();
