import { ElevenLabsClient } from "elevenlabs";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Demo Script Interface
 */
export interface DemoScript {
  title: string;
  segments: NarrationSegment[];
}

/**
 * Narration Segment with timing information
 */
export interface NarrationSegment {
  text: string;
  startTime: number; // in seconds
  duration?: number; // optional estimated duration
}

/**
 * Generated Audio Segment with file path and timing
 */
export interface AudioSegment {
  file: string;
  startTime: number;
  duration: number;
  text: string;
}

/**
 * Voice Narrator Configuration
 */
export interface VoiceNarratorConfig {
  apiKey: string;
  voiceId?: string; // Optional: specify a voice ID, defaults to "Josh"
  outputDir?: string; // Directory to save audio files
  modelId?: string; // ElevenLabs model ID
}

/**
 * ElevenLabs Voice Information
 */
export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
}

/**
 * Voice Narrator Class
 * Generates narration audio using ElevenLabs text-to-speech API
 * Perfect for creating DAWG AI's friendly, enthusiastic tech explainer voice!
 */
export class VoiceNarrator {
  private client: ElevenLabsClient;
  private voiceId: string;
  private outputDir: string;
  private modelId: string;

  constructor(config: VoiceNarratorConfig) {
    this.client = new ElevenLabsClient({
      apiKey: config.apiKey,
    });

    // Default voice: "Charlie" - young Australian with confident, energetic voice
    // Good for tech explanations with enthusiasm
    // Alternative: "Callum" (N2lVS1w4EtoT3dr4eOWO) - gravelly edge
    this.voiceId = config.voiceId || "IKne3meq5aSn9XLyUdCD"; // Charlie's voice ID
    this.outputDir = config.outputDir || "/tmp/dawg-ai-narration";
    this.modelId = config.modelId || "eleven_turbo_v2_5"; // Fast and high quality
  }

  /**
   * Initialize the output directory
   */
  private async ensureOutputDir(): Promise<void> {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * List all available ElevenLabs voices
   */
  async listVoices(): Promise<Voice[]> {
    try {
      const response = await this.client.voices.getAll();
      return response.voices.map((voice) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
      }));
    } catch (error) {
      console.error("Error fetching voices:", error);
      throw error;
    }
  }

  /**
   * Generate a single audio segment
   */
  private async generateSegmentAudio(
    text: string,
    index: number
  ): Promise<{ audioPath: string; duration: number }> {
    await this.ensureOutputDir();

    // Generate unique filename
    const hash = crypto.createHash("md5").update(text).digest("hex").substring(0, 8);
    const filename = `segment_${String(index).padStart(3, "0")}_${hash}.mp3`;
    const audioPath = path.join(this.outputDir, filename);

    try {
      // Generate audio using ElevenLabs
      const audio = await this.client.textToSpeech.convert(this.voiceId, {
        text: text,
        model_id: this.modelId,
        voice_settings: {
          stability: 0.5, // Balanced stability for natural variation
          similarity_boost: 0.75, // High similarity to maintain voice character
          style: 0.5, // Moderate style exaggeration for enthusiasm
          use_speaker_boost: true, // Enhance voice clarity
        },
      });

      // Convert audio stream to buffer and save
      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        chunks.push(Buffer.from(chunk));
      }
      const audioBuffer = Buffer.concat(chunks);
      await fs.writeFile(audioPath, audioBuffer);

      // Estimate duration based on text length
      // Average speaking rate: ~150 words per minute, ~2.5 words per second
      const wordCount = text.split(/\s+/).length;
      const estimatedDuration = Math.max(wordCount / 2.5, 1.0); // At least 1 second

      console.log(`✓ Generated audio segment ${index + 1}: ${filename}`);
      console.log(`  Text: "${text.substring(0, 60)}${text.length > 60 ? "..." : ""}"`);
      console.log(`  Duration: ~${estimatedDuration.toFixed(2)}s`);

      return {
        audioPath,
        duration: estimatedDuration,
      };
    } catch (error) {
      console.error(`Error generating audio for segment ${index}:`, error);
      throw error;
    }
  }

  /**
   * Generate narration audio for the entire script
   * Returns paths to generated audio files with timing information
   */
  async generateNarration(script: DemoScript): Promise<{
    audioPath: string; // Path to output directory
    segments: AudioSegment[];
  }> {
    console.log(`\n🎙️  Generating narration for: "${script.title}"`);
    console.log(`   Total segments: ${script.segments.length}\n`);

    const audioSegments: AudioSegment[] = [];

    // Generate audio for each segment
    for (let i = 0; i < script.segments.length; i++) {
      const segment = script.segments[i];
      const { audioPath, duration } = await this.generateSegmentAudio(
        segment.text,
        i
      );

      audioSegments.push({
        file: audioPath,
        startTime: segment.startTime,
        duration: duration,
        text: segment.text,
      });
    }

    // Save timing metadata
    const metadataPath = path.join(this.outputDir, "timing-metadata.json");
    await fs.writeFile(
      metadataPath,
      JSON.stringify(
        {
          title: script.title,
          totalSegments: audioSegments.length,
          segments: audioSegments.map((seg) => ({
            file: path.basename(seg.file),
            startTime: seg.startTime,
            duration: seg.duration,
            text: seg.text,
          })),
        },
        null,
        2
      )
    );

    console.log(`\n✅ Narration complete!`);
    console.log(`   Output directory: ${this.outputDir}`);
    console.log(`   Metadata saved: ${metadataPath}\n`);

    return {
      audioPath: this.outputDir,
      segments: audioSegments,
    };
  }

  /**
   * Generate a quick test audio clip
   */
  async generateTestAudio(text: string, filename: string = "test.mp3"): Promise<string> {
    await this.ensureOutputDir();

    const audioPath = path.join(this.outputDir, filename);

    try {
      console.log(`\n🎙️  Generating test audio...`);
      console.log(`   Text: "${text}"`);
      console.log(`   Voice: ${this.voiceId}`);

      const audio = await this.client.textToSpeech.convert(this.voiceId, {
        text: text,
        model_id: this.modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      });

      // Convert audio stream to buffer and save
      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        chunks.push(Buffer.from(chunk));
      }
      const audioBuffer = Buffer.concat(chunks);
      await fs.writeFile(audioPath, audioBuffer);

      console.log(`✅ Test audio saved: ${audioPath}\n`);

      return audioPath;
    } catch (error) {
      console.error("Error generating test audio:", error);
      throw error;
    }
  }

  /**
   * Set the voice to use for narration
   */
  setVoice(voiceId: string): void {
    this.voiceId = voiceId;
    console.log(`Voice changed to: ${voiceId}`);
  }

  /**
   * Get the current voice ID
   */
  getVoice(): string {
    return this.voiceId;
  }

  /**
   * Set the output directory
   */
  setOutputDir(dir: string): void {
    this.outputDir = dir;
    console.log(`Output directory changed to: ${dir}`);
  }

  /**
   * Get the current output directory
   */
  getOutputDir(): string {
    return this.outputDir;
  }
}

/**
 * Helper function to create a narrator instance from environment variables
 */
export function createNarrator(
  voiceId?: string,
  outputDir?: string
): VoiceNarrator {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY not found in environment variables");
  }

  return new VoiceNarrator({
    apiKey,
    voiceId,
    outputDir,
  });
}

// Example usage:
// const narrator = createNarrator();
// const voices = await narrator.listVoices();
// const script = {
//   title: "DAWG AI Demo",
//   segments: [
//     { text: "Hey, I'm DAWG AI!", startTime: 0 },
//     { text: "Let me show you something awesome!", startTime: 2 }
//   ]
// };
// const result = await narrator.generateNarration(script);
