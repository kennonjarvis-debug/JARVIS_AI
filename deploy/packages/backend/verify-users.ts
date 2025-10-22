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

async function verifyUsers() {
  console.log('🔍 Verifying admin users...\n');

  const emails = ['kennonjarvis@gmail.com', 'dawg.ai.chief@gmail.com'];

  for (const email of emails) {
    console.log(`📧 ${email}`);

    const { data: user, error } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      console.log(`  ❌ NOT in User table`);
      continue;
    }

    console.log(`  ✅ User ID: ${user.id}`);
    console.log(`  ✅ Role: ${user.role}`);
    console.log(`  ✅ Name: ${user.name || 'N/A'}`);

    const { data: obs } = await supabase
      .from('observatories')
      .select('*')
      .eq('owner_id', user.id);

    if (obs && obs.length > 0) {
      console.log(`  ✅ Observatories: ${obs.length}`);
    } else {
      console.log(`  ⚠️  No observatories`);
    }

    console.log('');
  }

  console.log('✅ Verification complete!\n');
}

verifyUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
