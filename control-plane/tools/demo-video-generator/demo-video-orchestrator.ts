#!/usr/bin/env tsx
/**
 * Demo Video Orchestrator
 *
 * Master pipeline that combines all components:
 * 1. Script Generator → Generate demo script
 * 2. Voice Narrator → Create narration audio
 * 3. Playwright Recorder → Record screen actions
 * 4. Video Compositor → Combine into final video
 *
 * Usage:
 *   npx tsx demo-video-orchestrator.ts "First Song"
 *   npx tsx demo-video-orchestrator.ts --all
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Load environment variables from parent Jarvis directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const execAsync = promisify(exec);

// Import all components (we'll use dynamic imports for flexibility)
type DemoScript = {
  title: string;
  duration: number;
  product: 'jarvis' | 'ai-dawg';
  narration: Array<{
    text: string;
    timing: number;
  }>;
  actions: Array<{
    type: 'click' | 'type' | 'wait' | 'scroll' | 'hover' | 'annotation' | 'screenshot';
    selector?: string;
    text?: string;
    timing: number;
    description: string;
    highlight?: boolean;
    waitAfter?: number;
    duration?: number;
    position?: { x: number; y: number };
  }>;
  callouts: Array<{
    text: string;
    position: { x: number; y: number };
    timing: number;
    duration: number;
  }>;
};

interface VideoMetadata {
  title: string;
  product: string;
  duration: number;
  mp4Path: string;
  webmPath: string;
  fileSize: {
    mp4: number;
    webm: number;
  };
  generatedAt: string;
}

class DemoVideoOrchestrator {
  private scriptsDir: string;
  private outputDir: string;
  private tempDir: string;

  constructor() {
    this.scriptsDir = path.join(__dirname, 'scripts');
    this.outputDir = path.join(__dirname, 'final-videos');
    this.tempDir = path.join(__dirname, 'temp');

    // Ensure directories exist
    [this.scriptsDir, this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate all 6 demo videos
   */
  async generateAllVideos(): Promise<VideoMetadata[]> {
    const videos = [
      'Voice Control Power',
      'AI Production Tools',
      'Beat Generation',
    ];

    console.log('🎬 Starting full demo video generation...\n');
    console.log(`Total videos to generate: ${videos.length}\n`);

    const results: VideoMetadata[] = [];

    for (let i = 0; i < videos.length; i++) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📹 Video ${i + 1}/${videos.length}: ${videos[i]}`);
      console.log('='.repeat(60));

      try {
        const metadata = await this.generateVideo(videos[i]);
        results.push(metadata);
        console.log(`✅ Completed: ${videos[i]}`);
      } catch (error: any) {
        console.error(`❌ Failed: ${videos[i]} - ${error.message}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 ALL VIDEOS GENERATED!');
    console.log('='.repeat(60));
    console.log(`\nSuccessful: ${results.length}/${videos.length}`);
    console.log(`Output directory: ${this.outputDir}\n`);

    // Save summary
    const summaryPath = path.join(this.outputDir, 'generation-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      totalVideos: results.length,
      videos: results,
    }, null, 2));

    console.log(`Summary saved: ${summaryPath}\n`);

    return results;
  }

  /**
   * Generate a single demo video
   */
  async generateVideo(videoTitle: string): Promise<VideoMetadata> {
    const startTime = Date.now();

    console.log(`\n1️⃣  Loading/Generating script...`);
    const script = await this.getOrGenerateScript(videoTitle);
    console.log(`   ✓ Script loaded: ${script.title}`);
    console.log(`   ✓ Duration: ${script.duration}s`);
    console.log(`   ✓ Narration segments: ${script.narration.length}`);
    console.log(`   ✓ Actions: ${script.actions.length}`);

    console.log(`\n2️⃣  Generating voice narration (DAWG AI voice)...`);
    const narrationPaths = await this.generateNarration(script);
    console.log(`   ✓ Generated ${narrationPaths.length} audio segments`);
    narrationPaths.forEach((p, i) => {
      const size = fs.existsSync(p) ? fs.statSync(p).size : 0;
      console.log(`   ✓ Segment ${i + 1}: ${path.basename(p)} (${this.formatFileSize(size)})`);
    });

    console.log(`\n3️⃣  Recording screen with Playwright automation...`);
    const appUrl = script.product === 'jarvis' ? 'http://localhost:3100' : 'http://localhost:5173/project/demo-project-2';
    const screenRecording = await this.recordScreen(script, appUrl);
    console.log(`   ✓ Screen recording saved: ${path.basename(screenRecording)}`);
    console.log(`   ✓ File size: ${this.formatFileSize(fs.statSync(screenRecording).size)}`);

    console.log(`\n4️⃣  Composing final video (screen + voice + effects)...`);
    const finalVideo = await this.composeVideo(screenRecording, narrationPaths, script);
    console.log(`   ✓ MP4: ${path.basename(finalVideo.mp4Path)} (${this.formatFileSize(finalVideo.fileSize.mp4)})`);
    console.log(`   ✓ WebM: ${path.basename(finalVideo.webmPath)} (${this.formatFileSize(finalVideo.fileSize.webm)})`);
    console.log(`   ✓ Duration: ${finalVideo.duration.toFixed(2)}s`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️  Total generation time: ${totalTime}s`);

    return {
      title: script.title,
      product: script.product,
      duration: finalVideo.duration,
      mp4Path: finalVideo.mp4Path,
      webmPath: finalVideo.webmPath,
      fileSize: finalVideo.fileSize,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Step 1: Get or generate script
   */
  private async getOrGenerateScript(videoTitle: string): Promise<DemoScript> {
    // Convert video title to kebab-case filename
    const kebabTitle = videoTitle.toLowerCase().replace(/\s+/g, '-');
    const expectedFilename = `${kebabTitle}.json`;

    // Try exact filename match first
    const exactPath = path.join(this.scriptsDir, expectedFilename);
    if (fs.existsSync(exactPath)) {
      const script = JSON.parse(fs.readFileSync(exactPath, 'utf-8'));
      return script;
    }

    // Fall back to searching all scripts
    const scriptFiles = fs.readdirSync(this.scriptsDir)
      .filter(f => f.endsWith('.json'));

    for (const file of scriptFiles) {
      const scriptPath = path.join(this.scriptsDir, file);
      const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
      // Check if video title appears in script title after colon
      const titleAfterColon = script.title.split(':')[1]?.trim().toLowerCase() || '';
      if (titleAfterColon === videoTitle.toLowerCase() ||
          titleAfterColon.includes(videoTitle.toLowerCase())) {
        return script;
      }
    }

    // If not found, generate new script
    console.log(`   ⚠️  Script not found, generating with AI...`);
    await execAsync(`cd ${__dirname} && npx tsx script-generator.ts "${videoTitle}"`);

    // Try loading again
    const newFiles = fs.readdirSync(this.scriptsDir).filter(f => f.endsWith('.json'));
    for (const file of newFiles) {
      const scriptPath = path.join(this.scriptsDir, file);
      const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
      if (script.title.toLowerCase().includes(videoTitle.toLowerCase())) {
        return script;
      }
    }

    throw new Error(`Failed to generate script for: ${videoTitle}`);
  }

  /**
   * Step 2: Generate narration using ElevenLabs
   */
  private async generateNarration(script: DemoScript): Promise<string[]> {
    const { VoiceNarrator } = await import('./voice-narrator');

    // Get API key from environment
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not found in environment variables. Please check your .env file.');
    }

    const narrator = new VoiceNarrator({
      apiKey,
      voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie - friendly tech explainer
    });

    // Transform script to VoiceNarrator format
    const narratorScript = {
      title: script.title,
      segments: script.narration.map(n => ({
        text: n.text,
        startTime: n.timing,
      })),
    };

    const result = await narrator.generateNarration(narratorScript);
    return result.segments.map(s => s.file);
  }

  /**
   * Step 3: Record screen with Playwright
   */
  private async recordScreen(script: DemoScript, appUrl: string): Promise<string> {
    const { PlaywrightRecorder } = await import('./playwright-recorder');

    const recorder = new PlaywrightRecorder({
      headless: false, // Show browser for debugging
      videoDir: this.tempDir,
      viewport: { width: 1920, height: 1080 },
      slowMo: 100,
    });

    // Convert script to Playwright-compatible format
    const playwrightScript = {
      title: script.title,
      actions: [
        // Add initial navigation
        { type: 'navigate' as const, url: appUrl, timing: 0, waitUntil: 'networkidle' as const },
        // Add script actions with proper types
        ...script.actions.map(action => {
          const baseAction = {
            ...action,
            timing: action.timing || 0,
            waitAfter: action.waitAfter || 500,
          };

          // Ensure wait actions have duration
          if (action.type === 'wait' && !action.duration) {
            return { ...baseAction, duration: 1000 };
          }

          return baseAction;
        }),
        // Add callouts as annotations
        ...script.callouts.map(callout => ({
          type: 'annotation' as const,
          text: callout.text,
          position: callout.position,
          timing: callout.timing,
          duration: callout.duration * 1000, // Convert to ms
        })),
      ].sort((a, b) => (a.timing || 0) - (b.timing || 0)), // Sort by timing
    };

    const videoPath = await recorder.recordDemo(playwrightScript, appUrl);
    return videoPath;
  }

  /**
   * Step 4: Compose final video with ffmpeg
   */
  private async composeVideo(
    screenRecording: string,
    narrationPaths: string[],
    script: DemoScript
  ): Promise<{
    mp4Path: string;
    webmPath: string;
    duration: number;
    fileSize: { mp4: number; webm: number };
  }> {
    const VideoCompositor = (await import('./video-compositor')).default;

    const compositor = new VideoCompositor({
      outputDir: this.outputDir,
      resolution: '1920x1080',
      frameRate: 30,
    });

    // Convert script to compositor format
    const compositorScript = {
      title: script.title.split(':')[1]?.trim() || script.title,
      appName: script.product === 'jarvis' ? 'Jarvis' : 'AI DAWG',
      scenes: script.narration.map(n => ({
        narration: n.text,
        startTime: n.timing,
        duration: 5, // Default duration, will be adjusted by audio length
      })),
      totalDuration: script.duration,
    };

    const result = await compositor.composeVideo(
      screenRecording,
      narrationPaths,
      compositorScript,
      {
        includeIntro: true,
        includeOutro: true,
        fadeIn: 0.5,
        fadeOut: 1.0,
      }
    );

    await compositor.cleanup();

    return result;
  }

  /**
   * Helper: Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🎬 Demo Video Orchestrator

Automatically generates professional demo videos using:
  • AI-generated scripts (Claude)
  • DAWG AI voice narration (ElevenLabs)
  • Browser automation (Playwright)
  • Video composition (FFmpeg)

Usage:
  npx tsx demo-video-orchestrator.ts "Video Title"    # Generate single video
  npx tsx demo-video-orchestrator.ts --all            # Generate all 6 videos
  npx tsx demo-video-orchestrator.ts --list           # List available videos

Available Videos:
  1. Getting Started (Jarvis, 3 min)
  2. Power User Features (Jarvis, 4 min)
  3. Autonomous Mode (Jarvis, 3 min)
  4. First Song (AI DAWG, 3 min)
  5. Voice Cloning (AI DAWG, 4 min)
  6. Studio Workflow (AI DAWG, 4 min)

Examples:
  npx tsx demo-video-orchestrator.ts "First Song"
  npx tsx demo-video-orchestrator.ts "Getting Started"
  npx tsx demo-video-orchestrator.ts --all

Output:
  Final videos saved to: ./final-videos/
    - <video-name>.mp4
    - <video-name>.webm
    - generation-summary.json
`);
    process.exit(0);
  }

  const orchestrator = new DemoVideoOrchestrator();

  try {
    if (args.includes('--all')) {
      await orchestrator.generateAllVideos();
    } else if (args.includes('--list')) {
      console.log(`
Available Demo Videos:

Jarvis:
  1. "Getting Started" - 3 minutes
     Quick intro to Jarvis, account setup, first Observatory

  2. "Power User Features" - 4 minutes
     Advanced automation, multi-app integrations, AI workflows

  3. "Autonomous Mode" - 3 minutes
     Self-learning AI, proactive suggestions, clearance levels

AI DAWG:
  4. "First Song" - 3 minutes
     Complete song creation from idea to finished track

  5. "Voice Cloning" - 4 minutes
     Record samples, train AI model, generate custom vocals

  6. "Studio Workflow" - 4 minutes
     Professional production, mixing, mastering, collaboration
`);
    } else {
      const videoTitle = args.join(' ');
      await orchestrator.generateVideo(videoTitle);
    }

    console.log('✅ Done!\n');
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { DemoVideoOrchestrator, VideoMetadata };
