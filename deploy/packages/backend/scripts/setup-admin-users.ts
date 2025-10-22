/**
 * Setup Admin Users Script
 * Ensures kennonjarvis@gmail.com is superadmin and dawg.ai.chief@gmail.com exists
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAdminUsers() {
  console.log('🚀 Setting up admin users...\n');

  // User configurations
  const users = [
    {
      email: 'kennonjarvis@gmail.com',
      name: 'Ben Kennon',
      role: 'superadmin',
      password: 'TempPass123!', // Temporary password
    },
    {
      email: 'dawg.ai.chief@gmail.com',
      name: 'DAWG AI Chief',
      role: 'admin',
      password: 'TempPass123!', // Temporary password
    },
  ];

  for (const user of users) {
    console.log(`\n📧 Processing ${user.email}...`);

    // Check if user exists in auth.users
    const { data: existingAuthUser, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error(`❌ Error listing users:`, authError);
      continue;
    }

    const authUser = existingAuthUser.users.find(u => u.email === user.email);

    let userId: string;

    if (!authUser) {
      console.log(`  Creating auth user...`);

      // Create user in Supabase Auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: user.name,
        },
      });

      if (createError || !newUser.user) {
        console.error(`  ❌ Failed to create auth user:`, createError);
        continue;
      }

      userId = newUser.user.id;
      console.log(`  ✅ Created auth user: ${userId}`);
    } else {
      userId = authUser.id;
      console.log(`  ✅ Auth user already exists: ${userId}`);

      // Update to confirm email if not confirmed
      if (!authUser.email_confirmed_at) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });

        if (updateError) {
          console.error(`  ⚠️  Could not confirm email:`, updateError);
        } else {
          console.log(`  ✅ Email confirmed`);
        }
      }
    }

    // Check if user exists in public.User table (capital U)
    const { data: existingUser, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error(`  ❌ Error checking User table:`, userError);
      continue;
    }

    if (!existingUser) {
      console.log(`  Creating User table entry...`);

      const { error: insertError } = await supabase
        .from('User')
        .insert({
          id: userId,
          email: user.email,
          name: user.name,
          role: user.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(`  ❌ Failed to create User table entry:`, insertError);
        continue;
      }

      console.log(`  ✅ Created User table entry with role: ${user.role}`);
    } else {
      // Update role if different
      if (existingUser.role !== user.role) {
        console.log(`  Updating role from ${existingUser.role} to ${user.role}...`);

        const { error: updateError } = await supabase
          .from('User')
          .update({ role: user.role, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateError) {
          console.error(`  ❌ Failed to update role:`, updateError);
        } else {
          console.log(`  ✅ Role updated to: ${user.role}`);
        }
      } else {
        console.log(`  ✅ User already has correct role: ${user.role}`);
      }
    }

    // Ensure user has an observatory
    const { data: observatories, error: obsError } = await supabase
      .from('observatories')
      .select('*')
      .eq('owner_id', userId);

    if (obsError) {
      console.error(`  ❌ Error checking observatories:`, obsError);
      continue;
    }

    if (!observatories || observatories.length === 0) {
      console.log(`  Creating default observatory...`);

      const { data: newObs, error: createObsError } = await supabase
        .from('observatories')
        .insert({
          name: `${user.name}'s Observatory`,
          owner_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createObsError || !newObs) {
        console.error(`  ❌ Failed to create observatory:`, createObsError);
        continue;
      }

      console.log(`  ✅ Created observatory: ${newObs.id}`);

      // Add user to observatory_members
      const { error: memberError } = await supabase
        .from('observatory_members')
        .insert({
          observatory_id: newObs.id,
          user_id: userId,
          role: 'owner',
          created_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error(`  ❌ Failed to add observatory member:`, memberError);
      } else {
        console.log(`  ✅ Added to observatory_members as owner`);
      }
    } else {
      console.log(`  ✅ User has ${observatories.length} observatory(ies)`);
    }

    console.log(`\n✅ ${user.email} setup complete!`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Role: ${user.role}`);
    if (!authUser) {
      console.log(`   ⚠️  Temporary password: ${user.password}`);
      console.log(`   👉 Please change password on first login!`);
    }
  }

  console.log('\n🎉 All users processed!\n');
  console.log('📝 Next steps:');
  console.log('   1. Go to Supabase Dashboard → Authentication → Providers');
  console.log('   2. Enable Google OAuth provider');
  console.log('   3. Test forgot password flow');
  console.log('   4. Users can sign in with email or Google\n');
}

// Run the setup
setupAdminUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
