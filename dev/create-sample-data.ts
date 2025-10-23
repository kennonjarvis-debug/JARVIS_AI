/**
 * Create sample data for testing the DAWG AI exporter
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.DAWG_SUPABASE_URL!;
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZGV4bW9pdnZzemZ5b2VrZnFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA4NTMwMSwiZXhwIjoyMDc2NjYxMzAxfQ.2_bP0Kf0S7NJu9FhD4K_vQ4Vz4eNNZDMSwt5dv23FKw';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSampleData() {
  console.log('🔧 Creating sample data for DAWG AI...\n');

  // Step 1: Create a user account
  console.log('1️⃣  Creating user account...');
  const email = process.env.DAWG_USER_EMAIL!;
  const password = process.env.DAWG_USER_PASSWORD!;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true // Auto-confirm email
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('  ✅ User already exists:', email);
    } else {
      console.error('  ❌ Error creating user:', authError.message);
      return;
    }
  } else {
    console.log('  ✅ User created:', authData.user?.email);
    console.log('  User ID:', authData.user?.id);
  }

  // Get user ID (whether just created or already exists)
  const { data: { user }, error: getUserError } = await supabase.auth.admin.getUserByEmail(email);

  if (getUserError || !user) {
    console.error('  ❌ Could not retrieve user:', getUserError?.message);
    return;
  }

  const userId = user.id;
  console.log('\n2️⃣  Creating sample project "demo-project-2"...');

  // Step 2: Create a sample project
  const projectData = {
    user_id: userId,
    name: 'demo-project-2',
    is_public: false,
    data: {
      tracks: [
        {
          id: 'track-1',
          name: 'Lead Vocals',
          type: 'audio',
          volume: 0.85,
          pan: 0,
          muted: false,
          solo: false,
          clips: [
            {
              id: 'clip-1',
              start: 0,
              duration: 4,
              name: 'Verse 1'
            }
          ],
          effects: [
            {
              type: 'reverb',
              wet: 0.3,
              roomSize: 0.5
            },
            {
              type: 'eq',
              low: 0,
              mid: 2,
              high: 1
            }
          ]
        },
        {
          id: 'track-2',
          name: 'Background Vocals',
          type: 'audio',
          volume: 0.65,
          pan: -0.2,
          muted: false,
          solo: false,
          clips: [],
          effects: []
        },
        {
          id: 'track-3',
          name: 'Drums',
          type: 'midi',
          volume: 0.9,
          pan: 0,
          muted: false,
          solo: false,
          clips: [
            {
              id: 'clip-2',
              start: 0,
              duration: 16,
              name: 'Drum Pattern',
              notes: [
                { pitch: 36, time: 0, duration: 0.5 }, // Kick
                { pitch: 38, time: 1, duration: 0.5 }, // Snare
                { pitch: 42, time: 0.5, duration: 0.25 } // Hi-hat
              ]
            }
          ],
          effects: []
        },
        {
          id: 'track-4',
          name: 'Bass',
          type: 'midi',
          volume: 0.8,
          pan: 0,
          muted: false,
          solo: false,
          clips: [],
          effects: []
        },
        {
          id: 'track-5',
          name: 'Guitar',
          type: 'audio',
          volume: 0.75,
          pan: 0.3,
          muted: false,
          solo: false,
          clips: [],
          effects: []
        },
        {
          id: 'track-6',
          name: 'Keys',
          type: 'midi',
          volume: 0.7,
          pan: -0.3,
          muted: false,
          solo: false,
          clips: [],
          effects: []
        }
      ],
      tempo: 120,
      timeSignature: [4, 4],
      effects: [
        {
          type: 'masterCompressor',
          threshold: -6,
          ratio: 4,
          attack: 0.003,
          release: 0.25
        }
      ],
      automation: [
        {
          trackId: 'track-1',
          parameter: 'volume',
          points: [
            { time: 0, value: 0.5 },
            { time: 2, value: 0.85 },
            { time: 10, value: 0.85 },
            { time: 12, value: 0.3 }
          ]
        }
      ],
      clips: []
    }
  };

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single();

  if (projectError) {
    console.error('  ❌ Error creating project:', projectError.message);
    return;
  }

  console.log('  ✅ Project created:', project.name);
  console.log('  Project ID:', project.id);
  console.log('  Tracks:', project.data.tracks.length);

  console.log('\n🎉 Sample data created successfully!');
  console.log('\nYou can now test the exporter with:');
  console.log('  npm run export list');
  console.log('  npm run export export demo-project-2');
}

createSampleData().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
