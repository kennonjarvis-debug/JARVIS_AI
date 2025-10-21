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

async function fixKennon() {
  console.log('🔧 Fixing kennonjarvis@gmail.com...\n');

  const email = 'kennonjarvis@gmail.com';

  // Step 1: Update role to superadmin
  console.log('1. Updating role to superadmin...');
  const { error: updateError } = await supabase
    .from('User')
    .update({
      role: 'superadmin',
      updated_at: new Date().toISOString()
    })
    .eq('email', email);

  if (updateError) {
    console.error('   ❌ Failed:', updateError);
    process.exit(1);
  }
  console.log('   ✅ Role updated to superadmin');

  // Step 2: Get user ID
  const { data: user } = await supabase
    .from('User')
    .select('id')
    .eq('email', email)
    .single();

  if (!user) {
    console.error('   ❌ User not found');
    process.exit(1);
  }

  const userId = user.id;
  console.log(`   ✅ User ID: ${userId}`);

  // Step 3: Check for existing observatory
  const { data: existingObs } = await supabase
    .from('observatories')
    .select('*')
    .eq('owner_id', userId);

  if (existingObs && existingObs.length > 0) {
    console.log(`   ✅ Already has ${existingObs.length} observatory(ies)`);
  } else {
    console.log('2. Creating observatory...');
    const { data: newObs, error: obsError } = await supabase
      .from('observatories')
      .insert({
        name: "Ben Kennon's Observatory",
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (obsError || !newObs) {
      console.error('   ❌ Failed:', obsError);
    } else {
      console.log(`   ✅ Observatory created: ${newObs.id}`);
    }
  }

  // Step 4: Confirm email in Auth
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users.find(u => u.email === email);

  if (authUser && !authUser.email_confirmed_at) {
    console.log('3. Confirming email in Auth...');
    const { error: confirmError } = await supabase.auth.admin.updateUserById(authUser.id, {
      email_confirm: true,
    });

    if (!confirmError) {
      console.log('   ✅ Email confirmed');
    }
  }

  console.log('\n✅ kennonjarvis@gmail.com is now fully set up as superadmin!');
}

fixKennon()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
