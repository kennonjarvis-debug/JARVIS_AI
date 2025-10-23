/**
 * Create sample data using Management API
 */

import dotenv from 'dotenv';
dotenv.config();

const projectRef = 'xbdexmoivvszfyoekfqr';
const accessToken = 'sbp_7eaae0d63145b2eb5dc00042aadbe70585d30da0';
const email = process.env.DAWG_USER_EMAIL!;
const password = process.env.DAWG_USER_PASSWORD!;

async function createUser() {
  console.log('🔧 Creating user via Management API...\n');

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/auth/users`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        app_metadata: {},
        user_metadata: { name: 'Ben Kennon' }
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    if (result.message?.includes('already exists')) {
      console.log('✅ User already exists:', email);

      // Get user ID
      const getUserResponse = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: `SELECT id FROM auth.users WHERE email = '${email}' LIMIT 1;`
          })
        }
      );

      const userData = await getUserResponse.json();

      if (userData.length > 0) {
        return userData[0].id;
      }
    } else {
      console.error('❌ Error creating user:', result);
      throw new Error('Failed to create user');
    }
  } else {
    console.log('✅ User created:', result.email);
    return result.id;
  }
}

async function createProject(userId: string) {
  console.log('\n🔧 Creating sample project...\n');

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

  const insertQuery = `
    INSERT INTO projects (user_id, name, data, is_public)
    VALUES (
      '${userId}',
      'demo-project-2',
      '${JSON.stringify(projectData).replace(/'/g, "''")}'::jsonb,
      false
    )
    RETURNING id, name, created_at;
  `;

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: insertQuery })
    }
  );

  const result = await response.json();

  if (!response.ok || result.error) {
    console.error('❌ Error creating project:', result);
    throw new Error('Failed to create project');
  }

  console.log('✅ Project created:', result[0]);
  return result[0];
}

async function main() {
  try {
    const userId = await createUser();
    const project = await createProject(userId);

    console.log('\n🎉 Sample data created successfully!');
    console.log('\nYou can now test the exporter with:');
    console.log('  npm run export list');
    console.log('  npm run export export demo-project-2');
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();
