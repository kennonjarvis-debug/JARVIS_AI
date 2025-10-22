/**
 * Check what models/versions are available on Replicate
 */

import dotenv from 'dotenv';
dotenv.config();

import Replicate from 'replicate';

async function checkModels() {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!,
  });

  console.log('🔍 Checking Replicate API access...\n');

  try {
    // Try to get account info
    console.log('📋 Listing your trainings...');

    // List trainings
    const response = await fetch('https://api.replicate.com/v1/trainings', {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('\n✅ Your trainings:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  // Also try the generic musicgen model
  console.log('\n🎵 Testing generic MusicGen model...');
  try {
    const output = await replicate.run(
      "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb" as any,
      {
        input: {
          prompt: "test",
          duration: 5
        }
      }
    );
    console.log('✅ Generic MusicGen model works!');
    console.log('Output:', output);
  } catch (error: any) {
    console.error('❌ Generic model error:', error.message);
  }
}

checkModels().catch(console.error);
