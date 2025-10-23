/**
 * Register exported DAWG AI project with JARVIS Control Plane
 */

import fs from 'fs';
import path from 'path';

interface ProjectRegistration {
  projectId: string;
  projectName: string;
  exportLocation: string;
  files: {
    full: string;
    uiOnly: string;
    mock: string;
  };
  metadata: {
    tracks: number;
    tempo: number;
    timeSignature: [number, number];
    effects: number;
    automation: number;
    exportedAt: string;
  };
}

async function registerWithJARVIS() {
  console.log('📋 Registering DAWG AI project with JARVIS Control Plane...\n');

  const exportDir = '/Users/benkennon/JARVIS_AI/dev/demo-project-2';
  const fullExportPath = path.join(exportDir, 'demo-project-2_2025-10-22.json');

  // Read the exported project
  const projectData = JSON.parse(fs.readFileSync(fullExportPath, 'utf-8'));

  // Create registration data
  const registration: ProjectRegistration = {
    projectId: projectData.id,
    projectName: projectData.name,
    exportLocation: exportDir,
    files: {
      full: 'demo-project-2_2025-10-22.json',
      uiOnly: 'demo-project-2_UI-ONLY_2025-10-22.json',
      mock: 'demo-project-2_MOCK.json'
    },
    metadata: {
      tracks: projectData.data.tracks.length,
      tempo: projectData.data.tempo,
      timeSignature: projectData.data.timeSignature,
      effects: projectData.data.effects.length,
      automation: projectData.data.automation.length,
      exportedAt: new Date().toISOString()
    }
  };

  console.log('📦 Project Information:');
  console.log(`   ID: ${registration.projectId}`);
  console.log(`   Name: ${registration.projectName}`);
  console.log(`   Location: ${registration.exportLocation}`);
  console.log(`   Tracks: ${registration.metadata.tracks}`);
  console.log(`   Tempo: ${registration.metadata.tempo} BPM`);
  console.log(`   Effects: ${registration.metadata.effects}`);
  console.log(`   Automation: ${registration.metadata.automation}`);

  // Try to register with JARVIS Control Plane
  console.log('\n📡 Connecting to JARVIS Control Plane...');

  try {
    const response = await fetch('http://localhost:5001/health');

    if (response.ok) {
      console.log('✅ JARVIS Control Plane is online\n');

      // Save registration file for JARVIS to discover
      const registrationPath = '/Users/benkennon/JARVIS_AI/dev/DAWG_PROJECT_REGISTRY.json';

      let registry: ProjectRegistration[] = [];

      // Load existing registry if it exists
      if (fs.existsSync(registrationPath)) {
        const existingData = fs.readFileSync(registrationPath, 'utf-8');
        registry = JSON.parse(existingData);
      }

      // Add or update this project
      const existingIndex = registry.findIndex(p => p.projectId === registration.projectId);
      if (existingIndex >= 0) {
        registry[existingIndex] = registration;
        console.log('📝 Updated existing project registration');
      } else {
        registry.push(registration);
        console.log('📝 Added new project registration');
      }

      fs.writeFileSync(registrationPath, JSON.stringify(registry, null, 2));

      console.log(`✅ Registration saved to: ${registrationPath}`);
      console.log(`\n🎉 Project successfully registered with JARVIS!`);

      console.log('\n📊 Registry Status:');
      console.log(`   Total Projects: ${registry.length}`);
      console.log(`   Registry File: ${registrationPath}`);

      // Create a notification file
      const notificationPath = '/Users/benkennon/JARVIS_AI/dev/.jarvis-notification';
      fs.writeFileSync(notificationPath, JSON.stringify({
        type: 'project_export_complete',
        projectId: registration.projectId,
        timestamp: new Date().toISOString(),
        message: `DAWG AI project "${registration.projectName}" has been exported and is ready for analysis`
      }, null, 2));

      console.log(`\n✅ Notification created for JARVIS at: ${notificationPath}`);

    } else {
      throw new Error(`JARVIS returned status ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Could not connect to JARVIS Control Plane');
    console.error(`   Error: ${error instanceof Error ? error.message : error}`);
    console.log('\n⚠️  Saving registration locally for manual integration...');

    // Save locally even if JARVIS is offline
    const offlineRegistrationPath = path.join(exportDir, 'REGISTRATION.json');
    fs.writeFileSync(offlineRegistrationPath, JSON.stringify(registration, null, 2));
    console.log(`✅ Registration saved to: ${offlineRegistrationPath}`);
    console.log('\n📌 To register manually, copy this file to JARVIS when it\'s online');
  }

  console.log('\n✅ Registration process complete!');
}

registerWithJARVIS().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
