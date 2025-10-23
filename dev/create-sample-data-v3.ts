/**
 * Create sample data directly via SQL
 */

import dotenv from 'dotenv';
dotenv.config();

const projectRef = 'xbdexmoivvszfyoekfqr';
const accessToken = 'sbp_7eaae0d63145b2eb5dc00042aadbe70585d30da0';
const email = process.env.DAWG_USER_EMAIL!;
const password = process.env.DAWG_USER_PASSWORD!;

async function executeSQL(query: string) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`SQL Error: ${JSON.stringify(result)}`);
  }

  return result;
}

async function main() {
  console.log('🔧 Creating sample data via SQL...\n');

  // Step 1: Create user in auth.users
  console.log('1️⃣  Creating user account...');

  const userId = '11111111-1111-1111-1111-111111111111'; // Fixed UUID for testing

  try {
    await executeSQL(`
      INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data
      )
      VALUES (
        '${userId}',
        '${email}',
        crypt('${password}', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        '{"name": "Ben Kennon"}'::jsonb
      )
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('  ✅ User created or already exists\n');
  } catch (err) {
    console.log('  ⚠️  User may already exist, continuing...\n');
  }

  // Step 2: Create project
  console.log('2️⃣  Creating demo-project-2...');

  const projectData = {
    tracks: [
      {
        id: 'track-1',
        name: 'Lead Vocals',
        type: 'audio',
        volume: 0.85,
        pan: 0,
        muted: false,
        solo: false,
        clips: [{ id: 'clip-1', start: 0, duration: 4, name: 'Verse 1' }],
        effects: [
          { type: 'reverb', wet: 0.3, roomSize: 0.5 },
          { type: 'eq', low: 0, mid: 2, high: 1 }
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
              { pitch: 36, time: 0, duration: 0.5 },
              { pitch: 38, time: 1, duration: 0.5 },
              { pitch: 42, time: 0.5, duration: 0.25 }
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
  };

  const jsonData = JSON.stringify(projectData).replace(/'/g, "''");

  try {
    const result = await executeSQL(`
      INSERT INTO projects (user_id, name, data, is_public)
      VALUES (
        '${userId}',
        'demo-project-2',
        '${jsonData}'::jsonb,
        false
      )
      ON CONFLICT DO NOTHING
      RETURNING id, name, created_at;
    `);

    console.log('  ✅ Project created:', result[0]);
  } catch (err) {
    console.error('  ❌ Error:', err);
    throw err;
  }

  console.log('\n🎉 Sample data created successfully!');
  console.log('\nYou can now test the exporter with:');
  console.log('  npm run export list');
  console.log('  npm run export export demo-project-2');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
