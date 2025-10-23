/**
 * Quick export without authentication using Management API
 */

import fs from 'fs';
import path from 'path';

const projectRef = 'xbdexmoivvszfyoekfqr';
const accessToken = 'sbp_7eaae0d63145b2eb5dc00042aadbe70585d30da0';

async function quickExport() {
  console.log('📦 Quick exporting demo-project-2...\n');

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "SELECT * FROM projects WHERE name = 'demo-project-2' LIMIT 1;"
      })
    }
  );

  const result = await response.json();

  if (!response.ok || !result || result.length === 0) {
    console.error('❌ Error:', result);
    process.exit(1);
  }

  const project = result[0];

  // Create output directory
  const outputDir = '/Users/benkennon/JARVIS_AI/dev/demo-project-2';
  fs.mkdirSync(outputDir, { recursive: true });

  // Write full export
  const fullPath = path.join(outputDir, `demo-project-2_${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(fullPath, JSON.stringify(project, null, 2));

  console.log('✅ Full export:', fullPath);
  console.log(`   - ID: ${project.id}`);
  console.log(`   - Name: ${project.name}`);
  console.log(`   - Tracks: ${project.data.tracks.length}`);
  console.log(`   - Created: ${new Date(project.created_at).toLocaleString()}`);

  // Create UI-only export
  const uiOnlyProject = {
    id: project.id,
    name: project.name + ' (UI Only)',
    created_at: project.created_at,
    updated_at: project.updated_at,
    data: {
      tracks: project.data.tracks.map((track: any) => ({
        id: track.id,
        name: track.name,
        type: track.type,
        volume: track.volume || 0.8,
        pan: track.pan || 0,
        muted: false,
        solo: false,
        clips: [],
        effects: []
      })),
      tempo: 120,
      timeSignature: [4, 4],
      effects: [],
      automation: [],
      clips: []
    }
  };

  const uiOnlyPath = path.join(outputDir, `demo-project-2_UI-ONLY_${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(uiOnlyPath, JSON.stringify(uiOnlyProject, null, 2));

  console.log('\n✅ UI-Only export:', uiOnlyPath);

  console.log('\n🎉 Project exported successfully!');
  console.log('\n📍 Location: /Users/benkennon/JARVIS_AI/dev/demo-project-2/');
}

quickExport().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
