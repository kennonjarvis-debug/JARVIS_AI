import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface VideoCompositorConfig {
  outputDir?: string;
  resolution?: string;
  frameRate?: number;
  videoBitrate?: string;
  audioBitrate?: string;
  backgroundMusicVolume?: number; // 0.0 to 1.0
  fadeInDuration?: number; // seconds
  fadeOutDuration?: number; // seconds
}

interface DemoScript {
  title: string;
  appName: string;
  scenes: Array<{
    narration: string;
    startTime: number; // in seconds
    duration: number;
  }>;
  totalDuration: number;
}

interface CompositionResult {
  mp4Path: string;
  webmPath: string;
  duration: number;
  fileSize: {
    mp4: number;
    webm: number;
  };
  metrics: {
    resolution: string;
    frameRate: number;
    videoBitrate: string;
    audioBitrate: string;
  };
}

export class VideoCompositor {
  private config: Required<VideoCompositorConfig>;
  private tempDir: string;

  constructor(config: VideoCompositorConfig = {}) {
    this.config = {
      outputDir: config.outputDir || './output',
      resolution: config.resolution || '1920x1080',
      frameRate: config.frameRate || 30,
      videoBitrate: config.videoBitrate || '5000k',
      audioBitrate: config.audioBitrate || '128k',
      backgroundMusicVolume: config.backgroundMusicVolume || 0.15,
      fadeInDuration: config.fadeInDuration || 0.5,
      fadeOutDuration: config.fadeOutDuration || 1.0,
    };
    this.tempDir = path.join(this.config.outputDir, 'temp');
  }

  /**
   * Main composition method that creates the final video
   */
  async composeVideo(
    screenRecording: string,
    narrationAudio: string[],
    script: DemoScript,
    options?: {
      backgroundMusic?: string;
      includeIntro?: boolean;
      includeOutro?: boolean;
    }
  ): Promise<CompositionResult> {
    console.log('🎬 Starting video composition...');

    // Ensure output directories exist
    await this.ensureDirectories();

    // Verify ffmpeg is available
    await this.verifyFFmpeg();

    // Step 1: Combine narration audio segments
    console.log('🎤 Combining narration audio segments...');
    const combinedAudio = await this.combineAudioSegments(narrationAudio, script);

    // Step 2: Create intro card if requested
    let videoWithIntro = screenRecording;
    if (options?.includeIntro !== false) {
      console.log('🎨 Creating intro card...');
      videoWithIntro = await this.createIntroCard(script.appName, script.title);
    }

    // Step 3: Merge screen recording with intro
    console.log('🎥 Merging screen recording with intro...');
    const mergedVideo = await this.mergeVideoSegments(
      videoWithIntro,
      screenRecording,
      options?.includeIntro !== false
    );

    // Step 4: Create outro card if requested
    let finalVideo = mergedVideo;
    if (options?.includeOutro !== false) {
      console.log('🎨 Creating outro card...');
      const outroCard = await this.createOutroCard(script.appName);
      finalVideo = await this.appendOutro(mergedVideo, outroCard);
    }

    // Step 5: Sync audio with video
    console.log('🔊 Syncing audio with video...');
    const videoWithAudio = await this.syncAudioWithVideo(finalVideo, combinedAudio);

    // Step 6: Add background music if provided
    let videoWithMusic = videoWithAudio;
    if (options?.backgroundMusic) {
      console.log('🎵 Adding background music...');
      videoWithMusic = await this.addBackgroundMusic(videoWithAudio, options.backgroundMusic);
    }

    // Step 7: Apply fade effects
    console.log('✨ Applying fade effects...');
    const videoWithFades = await this.applyFadeEffects(videoWithMusic);

    // Step 8: Export to MP4
    console.log('📦 Exporting to MP4...');
    const mp4Path = await this.exportToMP4(videoWithFades, script.title);

    // Step 9: Export to WebM
    console.log('📦 Exporting to WebM...');
    const webmPath = await this.exportToWebM(videoWithFades, script.title);

    // Step 10: Get video metrics
    const duration = await this.getVideoDuration(mp4Path);
    const mp4Size = await this.getFileSize(mp4Path);
    const webmSize = await this.getFileSize(webmPath);

    console.log('✅ Video composition complete!');

    return {
      mp4Path,
      webmPath,
      duration,
      fileSize: {
        mp4: mp4Size,
        webm: webmSize,
      },
      metrics: {
        resolution: this.config.resolution,
        frameRate: this.config.frameRate,
        videoBitrate: this.config.videoBitrate,
        audioBitrate: this.config.audioBitrate,
      },
    };
  }

  /**
   * Verify ffmpeg is installed and accessible
   */
  private async verifyFFmpeg(): Promise<void> {
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      throw new Error(
        'ffmpeg is not installed or not accessible. Please install it with: brew install ffmpeg'
      );
    }
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.config.outputDir, { recursive: true });
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  /**
   * Combine multiple audio segments with proper timing
   */
  private async combineAudioSegments(
    audioFiles: string[],
    script: DemoScript
  ): Promise<string> {
    const outputPath = path.join(this.tempDir, 'combined-audio.aac');

    if (audioFiles.length === 0) {
      throw new Error('No audio files provided');
    }

    if (audioFiles.length === 1) {
      // If only one audio file, just copy it
      await fs.copyFile(audioFiles[0], outputPath);
      return outputPath;
    }

    // Create a concat demuxer file with absolute paths
    const concatFile = path.join(this.tempDir, 'audio-concat.txt');
    const fileList = audioFiles.map(file => `file '${path.resolve(file)}'`).join('\n');
    await fs.writeFile(concatFile, fileList);

    // Concatenate audio files
    const command = `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:a aac -b:a ${this.config.audioBitrate} "${outputPath}"`;
    await execAsync(command);

    return outputPath;
  }

  /**
   * Create intro title card
   */
  private async createIntroCard(appName: string, title: string): Promise<string> {
    const outputPath = path.join(this.tempDir, 'intro-card.mp4');
    const duration = 3; // 3 seconds intro

    // Create intro card with text overlay
    const command = `ffmpeg -y -f lavfi -i color=c=0x1a1a2e:s=${this.config.resolution}:d=${duration}:r=${this.config.frameRate} \
      -vf "drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial Bold.ttf:text='${appName}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2-50,\
      drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${title}':fontcolor=0xaaaaaa:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2+50" \
      -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;

    await execAsync(command);
    return outputPath;
  }

  /**
   * Create outro end card with CTA
   */
  private async createOutroCard(appName: string): Promise<string> {
    const outputPath = path.join(this.tempDir, 'outro-card.mp4');
    const duration = 4; // 4 seconds outro

    // Create outro card with CTA
    const command = `ffmpeg -y -f lavfi -i color=c=0x1a1a2e:s=${this.config.resolution}:d=${duration}:r=${this.config.frameRate} \
      -vf "drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial Bold.ttf:text='Start Your Free Trial':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h-text_h)/2-40,\
      drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='7 Days • No Credit Card Required':fontcolor=0x4ecdc4:fontsize=32:x=(w-text_w)/2:y=(h-text_h)/2+40,\
      drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${appName}':fontcolor=0xaaaaaa:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2+120" \
      -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;

    await execAsync(command);
    return outputPath;
  }

  /**
   * Merge video segments (intro + main video)
   */
  private async mergeVideoSegments(
    intro: string,
    mainVideo: string,
    hasIntro: boolean
  ): Promise<string> {
    if (!hasIntro) {
      return mainVideo;
    }

    const outputPath = path.join(this.tempDir, 'merged-video.mp4');

    // Create concat demuxer file with absolute paths
    const concatFile = path.join(this.tempDir, 'video-concat.txt');
    const introAbs = path.resolve(intro);
    const mainVideoAbs = path.resolve(mainVideo);
    await fs.writeFile(concatFile, `file '${introAbs}'\nfile '${mainVideoAbs}'`);

    // Concatenate videos
    const command = `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${outputPath}"`;
    await execAsync(command);

    return outputPath;
  }

  /**
   * Append outro to video
   */
  private async appendOutro(mainVideo: string, outro: string): Promise<string> {
    const outputPath = path.join(this.tempDir, 'video-with-outro.mp4');

    // Create concat demuxer file with absolute paths
    const concatFile = path.join(this.tempDir, 'outro-concat.txt');
    const mainVideoAbs = path.resolve(mainVideo);
    const outroAbs = path.resolve(outro);
    await fs.writeFile(concatFile, `file '${mainVideoAbs}'\nfile '${outroAbs}'`);

    // Concatenate videos
    const command = `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${outputPath}"`;
    await execAsync(command);

    return outputPath;
  }

  /**
   * Sync audio with video
   */
  private async syncAudioWithVideo(videoPath: string, audioPath: string): Promise<string> {
    const outputPath = path.join(this.tempDir, 'video-with-audio.mp4');

    // Replace video audio with narration audio
    // Use shortest duration to avoid extending video or audio
    const command = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" \
      -c:v copy -c:a aac -b:a ${this.config.audioBitrate} \
      -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`;

    await execAsync(command);
    return outputPath;
  }

  /**
   * Add background music to video
   */
  private async addBackgroundMusic(videoPath: string, musicPath: string): Promise<string> {
    const outputPath = path.join(this.tempDir, 'video-with-music.mp4');

    // Mix narration audio with background music
    // Narration at full volume, music at reduced volume
    const command = `ffmpeg -y -i "${videoPath}" -i "${musicPath}" \
      -filter_complex "[0:a]volume=1.0[narration];[1:a]volume=${this.config.backgroundMusicVolume}[music];[narration][music]amix=inputs=2:duration=shortest[audio]" \
      -map 0:v -map "[audio]" -c:v copy -c:a aac -b:a ${this.config.audioBitrate} "${outputPath}"`;

    await execAsync(command);
    return outputPath;
  }

  /**
   * Apply fade in and fade out effects
   */
  private async applyFadeEffects(videoPath: string): Promise<string> {
    const outputPath = path.join(this.tempDir, 'video-with-fades.mp4');

    // Get video duration first
    const duration = await this.getVideoDuration(videoPath);
    const fadeOutStart = duration - this.config.fadeOutDuration;

    // Apply video and audio fades
    const command = `ffmpeg -y -i "${videoPath}" \
      -vf "fade=t=in:st=0:d=${this.config.fadeInDuration},fade=t=out:st=${fadeOutStart}:d=${this.config.fadeOutDuration}" \
      -af "afade=t=in:st=0:d=${this.config.fadeInDuration},afade=t=out:st=${fadeOutStart}:d=${this.config.fadeOutDuration}" \
      -c:v libx264 -crf 18 -preset medium -c:a aac -b:a ${this.config.audioBitrate} "${outputPath}"`;

    await execAsync(command);
    return outputPath;
  }

  /**
   * Export final video to MP4 format
   */
  private async exportToMP4(videoPath: string, title: string): Promise<string> {
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const outputPath = path.join(this.config.outputDir, `${sanitizedTitle}-final.mp4`);

    // Export with H.264 codec, high quality
    const command = `ffmpeg -y -i "${videoPath}" \
      -c:v libx264 -preset slow -crf 18 \
      -profile:v high -level:v 4.2 \
      -pix_fmt yuv420p \
      -movflags +faststart \
      -c:a aac -b:a ${this.config.audioBitrate} \
      -ar 48000 "${outputPath}"`;

    await execAsync(command);
    return outputPath;
  }

  /**
   * Export final video to WebM format
   */
  private async exportToWebM(videoPath: string, title: string): Promise<string> {
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const outputPath = path.join(this.config.outputDir, `${sanitizedTitle}-final.webm`);

    // Export with VP9 codec
    const command = `ffmpeg -y -i "${videoPath}" \
      -c:v libvpx-vp9 -b:v ${this.config.videoBitrate} \
      -quality good -speed 2 \
      -c:a libopus -b:a ${this.config.audioBitrate} \
      -ar 48000 "${outputPath}"`;

    await execAsync(command);
    return outputPath;
  }

  /**
   * Get video duration in seconds
   */
  private async getVideoDuration(videoPath: string): Promise<number> {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    const { stdout } = await execAsync(command);
    return parseFloat(stdout.trim());
  }

  /**
   * Get file size in bytes
   */
  private async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Utility method to format file size
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up temporary files');
    } catch (error) {
      console.warn('Warning: Failed to clean up temporary files:', error);
    }
  }

  /**
   * Create a simple test video for demonstration
   */
  static async createTestVideo(outputDir: string): Promise<string> {
    const testVideoPath = path.join(outputDir, 'test-screen-recording.mp4');

    // Create a 5-second test video with moving gradient
    const command = `ffmpeg -y -f lavfi -i "color=c=0x2c3e50:s=1920x1080:d=5:r=30" \
      -vf "geq=r='255*abs(sin((X+Y)/20+T))':g='255*abs(cos((X-Y)/30+T))':b='128'" \
      -c:v libx264 -pix_fmt yuv420p "${testVideoPath}"`;

    await execAsync(command);
    return testVideoPath;
  }

  /**
   * Create test audio narration
   */
  static async createTestAudio(outputDir: string): Promise<string> {
    const testAudioPath = path.join(outputDir, 'test-narration.aac');

    // Create a 5-second test audio tone
    const command = `ffmpeg -y -f lavfi -i "sine=frequency=440:duration=5" \
      -c:a aac -b:a 128k "${testAudioPath}"`;

    await execAsync(command);
    return testAudioPath;
  }
}

/**
 * Example usage and CLI interface
 */
async function main() {
  const outputDir = './demo-videos';

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const compositor = new VideoCompositor({
    outputDir: outputDir,
    resolution: '1920x1080',
    frameRate: 30,
    videoBitrate: '5000k',
    audioBitrate: '128k',
  });

  // Create test video and audio
  console.log('Creating test assets...');
  const testVideo = await VideoCompositor.createTestVideo(outputDir);
  const testAudio = await VideoCompositor.createTestAudio(outputDir);

  // Example script
  const testScript: DemoScript = {
    title: 'Product Demo',
    appName: 'MyApp',
    scenes: [
      {
        narration: 'Welcome to our product demo',
        startTime: 0,
        duration: 5,
      },
    ],
    totalDuration: 5,
  };

  try {
    const result = await compositor.composeVideo(
      testVideo,
      [testAudio],
      testScript,
      {
        includeIntro: true,
        includeOutro: true,
      }
    );

    console.log('\n✅ Video composition complete!');
    console.log('─'.repeat(60));
    console.log(`MP4 Output: ${result.mp4Path}`);
    console.log(`WebM Output: ${result.webmPath}`);
    console.log(`Duration: ${result.duration.toFixed(2)}s`);
    console.log(`MP4 Size: ${VideoCompositor.formatFileSize(result.fileSize.mp4)}`);
    console.log(`WebM Size: ${VideoCompositor.formatFileSize(result.fileSize.webm)}`);
    console.log('─'.repeat(60));
    console.log('Metrics:');
    console.log(`  Resolution: ${result.metrics.resolution}`);
    console.log(`  Frame Rate: ${result.metrics.frameRate}fps`);
    console.log(`  Video Bitrate: ${result.metrics.videoBitrate}`);
    console.log(`  Audio Bitrate: ${result.metrics.audioBitrate}`);

    // Cleanup
    await compositor.cleanup();
  } catch (error) {
    console.error('Error during video composition:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default VideoCompositor;
