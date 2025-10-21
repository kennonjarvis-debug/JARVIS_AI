import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addRoleColumn() {
  console.log('Adding role column to User table...');
  
  // Execute raw SQL to add role column
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      -- Add role column if it doesn't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'User' AND column_name = 'role'
        ) THEN
          ALTER TABLE "User" ADD COLUMN role TEXT DEFAULT 'user';
        END IF;
      END $$;
    `
  });

  if (error) {
    console.error('Error adding role column:', error);
    console.log('Trying alternative approach with direct SQL...');
    
    // Try direct approach
    const { error: altError } = await supabase
      .from('_sql')
      .select('*')
      .limit(0);
    
    console.error('Alternative also failed. Please run this SQL manually in Supabase Dashboard:');
    console.log('\nALTER TABLE "User" ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'user\';\n');
  } else {
    console.log('✅ Role column added successfully!');
  }
}

addRoleColumn().then(() => process.exit(0)).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
