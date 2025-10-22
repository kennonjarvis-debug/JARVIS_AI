#!/usr/bin/env tsx

/**
 * Test script for Voice Narrator
 * Demonstrates DAWG AI's voice narration capabilities
 */

import { createNarrator } from "./voice-narrator";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.env.HOME!, "Jarvis", ".env") });

async function main() {
  try {
    console.log("🎤 DAWG AI Voice Narrator Test\n");
    console.log("=" .repeat(60));

    // Create narrator instance
    const narrator = createNarrator();

    // 1. List available voices
    console.log("\n📋 Fetching available voices...\n");
    const voices = await narrator.listVoices();

    console.log(`Found ${voices.length} voices:\n`);

    // Show a selection of recommended voices for tech narration
    const techVoices = ["Josh", "Antoni", "Adam", "Arnold", "Callum", "Charlie"];
    const recommendedVoices = voices.filter(v =>
      techVoices.some(name => v.name.toLowerCase().includes(name.toLowerCase()))
    );

    console.log("🎯 Recommended voices for DAWG AI:\n");
    recommendedVoices.forEach((voice, idx) => {
      console.log(`${idx + 1}. ${voice.name}`);
      console.log(`   ID: ${voice.voice_id}`);
      if (voice.description) {
        console.log(`   Description: ${voice.description}`);
      }
      console.log();
    });

    // Show all voices (first 20)
    console.log("\n📝 All available voices (showing first 20):\n");
    voices.slice(0, 20).forEach((voice, idx) => {
      console.log(`${idx + 1}. ${voice.name} (${voice.voice_id})`);
    });

    // 2. Generate test audio with default voice
    console.log("\n" + "=".repeat(60));
    console.log("\n🎬 Generating test audio...\n");

    const testText = "Hey, I'm DAWG AI, and I'm about to show you something awesome!";
    const testAudioPath = await narrator.generateTestAudio(
      testText,
      "dawg-ai-intro.mp3"
    );

    console.log("📁 Test audio saved to:");
    console.log(`   ${testAudioPath}`);

    // 3. Generate a full demo script
    console.log("\n" + "=".repeat(60));
    console.log("\n🎞️  Generating full demo script narration...\n");

    const demoScript = {
      title: "DAWG AI - Your AI Music Production Assistant",
      segments: [
        {
          text: "Hey, I'm DAWG AI, your personal music production assistant!",
          startTime: 0,
        },
        {
          text: "Watch as I analyze your beats in real-time and provide instant feedback.",
          startTime: 3.5,
        },
        {
          text: "I can detect tempo, key, and even suggest improvements to your mix.",
          startTime: 7.0,
        },
        {
          text: "Need a vocal take? I'll coach you through it with precision timing.",
          startTime: 11.0,
        },
        {
          text: "Let's make some magic together!",
          startTime: 15.0,
        },
      ],
    };

    const result = await narrator.generateNarration(demoScript);

    console.log("📦 Full narration generated!");
    console.log(`   Output directory: ${result.audioPath}`);
    console.log(`   Total segments: ${result.segments.length}`);
    console.log("\n📊 Segment breakdown:");

    result.segments.forEach((seg, idx) => {
      console.log(`\n   Segment ${idx + 1}:`);
      console.log(`   ├─ File: ${path.basename(seg.file)}`);
      console.log(`   ├─ Start: ${seg.startTime}s`);
      console.log(`   ├─ Duration: ~${seg.duration.toFixed(2)}s`);
      console.log(`   └─ Text: "${seg.text}"`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ All tests completed successfully!");
    console.log("\n🎧 You can now play the generated audio files!");
    console.log(`\nTest audio: ${testAudioPath}`);
    console.log(`Full demo: ${result.audioPath}`);
    console.log("\n💡 Tip: Use 'afplay' on macOS to play audio files:");
    console.log(`   afplay "${testAudioPath}"`);
    console.log();

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
