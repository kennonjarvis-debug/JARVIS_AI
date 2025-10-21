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

async function updateKennonRole() {
  console.log('🔧 Updating kennonjarvis@gmail.com to superadmin...\n');

  const userId = '806eb75d-7dfd-40dc-8633-0390742d7332';
  
  // Update role to superadmin
  const { error: updateError } = await supabase
    .from('User')
    .update({ 
      role: 'superadmin',
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);

  if (updateError) {
    console.error('❌ Failed to update role:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully updated kennonjarvis@gmail.com to superadmin!');
  
  // Confirm email if needed
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  
  if (authUser && authUser.user && !authUser.user.email_confirmed_at) {
    const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    
    if (!confirmError) {
      console.log('✅ Email confirmed');
    }
  }
  
  // Verify
  const { data: user } = await supabase
    .from('User')
    .select('*')
    .eq('id', userId)
    .single();
    
  console.log('\n📋 User Details:');
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  console.log('   User ID:', user.id);
}

updateKennonRole()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
