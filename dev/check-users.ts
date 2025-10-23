import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.DAWG_SUPABASE_URL!;
const supabaseKey = process.env.DAWG_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('🔍 Checking for registered users...\n');

  // Try to get projects (this will tell us if auth is needed)
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, user_id, created_at')
    .limit(10);

  if (error) {
    console.log('❌ Error querying projects:', error.message);
    console.log('\nThis might mean:');
    console.log('1. The projects table doesn\'t exist yet');
    console.log('2. You need to be authenticated to access it');
    console.log('3. Row Level Security (RLS) is enabled\n');
  } else if (projects && projects.length > 0) {
    console.log(`✅ Found ${projects.length} projects (no auth required):\n`);
    projects.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`);
      console.log(`     User ID: ${p.user_id}`);
      console.log(`     Created: ${new Date(p.created_at).toLocaleDateString()}\n`);
    });
  } else {
    console.log('⚠️  No projects found in database\n');
  }
}

checkUsers().catch(console.error);
