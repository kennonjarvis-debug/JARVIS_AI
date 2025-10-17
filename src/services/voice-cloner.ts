/**
 * Voice Cloner Service
 *
 * ElevenLabs voice cloning and text-to-speech integration for Freestyle Studio.
 * Provides voice cloning from audio samples and high-quality vocal generation.
 *
 * Features:
 * - Clone voices from audio samples
 * - Generate speech/vocals from text using cloned voices
 * - Generate full song vocals from multiple lines
 * - Manage voice library (list, delete)
 * - Optimized settings for music/singing applications
 *
 * @example
 * ```typescript
 * import { voiceCloner } from './services/voice-cloner.js';
 *
 * // 1. Clone a voice from audio samples
 * const cloneResult = await voiceCloner.cloneVoice({
 *   name: 'My Rap Voice',
 *   description: 'Cloned from freestyle sessions',
 *   audioFiles: ['/path/to/sample1.mp3', '/path/to/sample2.mp3'],
 *   labels: { genre: 'hip-hop', artist: 'MC Jarvis' }
 * });
 *
 * console.log('Voice ID:', cloneResult.voice_id);
 *
 * // 2. Generate vocals for a single line
 * const speech = await voiceCloner.synthesizeSpeech({
 *   text: 'I flow so smooth like butter on toast',
 *   voiceId: cloneResult.voice_id
 * });
 *
 * console.log('Audio saved to:', speech.audioPath);
 *
 * // 3. Generate vocals for an entire song
 * const songVocals = await voiceCloner.generateSongVocals({
 *   voiceId: cloneResult.voice_id,
 *   lines: [
 *     { text: 'Verse 1: I got the flow', emotion: 'confident' },
 *     { text: 'Verse 2: Watch me go', emotion: 'energetic' },
 *     { text: 'Hook: Yeah yeah yeah', emotion: 'melodic' }
 *   ]
 * });
 *
 * console.log('Vocal files:', songVocals.linePaths);
 *
 * // 4. List all available voices
 * const voices = await voiceCloner.listVoices();
 * console.log('Available voices:', voices.voices.length);
 *
 * // 5. Delete a voice when done
 * await voiceCloner.deleteVoice(cloneResult.voice_id);
 * ```
 *
 * Environment Variables:
 * - ELEVENLABS_API_KEY: Required - Your ElevenLabs API key
 */

import axios, { AxiosInstance } from 'axios';
// @ts-ignore - form-data doesn't have proper ESM types
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { Readable } from 'stream';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_MODEL = 'eleven_multilingual_v2';

// Music-optimized voice settings
const MUSIC_VOICE_SETTINGS = {
  stability: 0.6,           // More stable for singing
  similarity_boost: 0.8,    // High similarity to source
  style: 0.7,               // More expressive
  use_speaker_boost: true   // Enhance voice characteristics
};

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface CloneVoiceOptions {
  name: string;
  description?: string;
  audioFiles: string[];     // Paths to audio files (MP3, WAV, etc.)
  labels?: Record<string, string>;
}

export interface CloneVoiceResult {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  labels?: Record<string, string>;
}

export interface SynthesizeSpeechOptions {
  text: string;
  voiceId: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
  outputPath?: string;      // If provided, saves to this path
}

export interface SynthesizeSpeechResult {
  audioPath: string;
  audioBuffer?: Buffer;
  duration?: number;
  metadata: {
    voiceId: string;
    text: string;
    generatedAt: Date;
  };
}

export interface SongLine {
  text: string;
  timing?: number;          // Optional timing in seconds
  emotion?: string;         // Optional emotion/style hint
}

export interface GenerateSongVocalsOptions {
  lines: SongLine[];
  voiceId: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
  outputDir?: string;       // Directory to save individual line files
  mergeOutput?: boolean;    // Whether to merge all lines into one file
}

export interface GenerateSongVocalsResult {
  linePaths: string[];      // Paths to individual line audio files
  mergedPath?: string;      // Path to merged audio (if mergeOutput=true)
  totalDuration: number;
  metadata: {
    voiceId: string;
    lineCount: number;
    generatedAt: Date;
  };
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  labels?: Record<string, string>;
  samples?: Array<{
    sample_id: string;
    file_name: string;
    mime_type: string;
  }>;
}

export interface ListVoicesResult {
  voices: Voice[];
}

export class VoiceCloner {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }

    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: ELEVENLABS_API_BASE,
      headers: {
        'xi-api-key': apiKey,
      },
      timeout: 60000, // 60 second timeout
    });

    logger.info('VoiceCloner initialized with ElevenLabs API');
  }

  /**
   * Clone a voice from audio samples
   *
   * @param options - Voice cloning options
   * @returns Voice ID and metadata
   */
  async cloneVoice(options: CloneVoiceOptions): Promise<CloneVoiceResult> {
    logger.info('Cloning voice', {
      name: options.name,
      fileCount: options.audioFiles.length
    });

    try {
      // Validate audio files exist
      for (const filePath of options.audioFiles) {
        if (!fs.existsSync(filePath)) {
          throw new Error(`Audio file not found: ${filePath}`);
        }
      }

      // Create FormData with audio files
      const formData = new FormData();
      formData.append('name', options.name);

      if (options.description) {
        formData.append('description', options.description);
      }

      if (options.labels) {
        formData.append('labels', JSON.stringify(options.labels));
      }

      // Add audio files
      for (const filePath of options.audioFiles) {
        const fileStream = fs.createReadStream(filePath);
        const fileName = path.basename(filePath);
        formData.append('files', fileStream, fileName);
      }

      // Make API request
      const response = await this.client.post('/voices/add', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      const result: CloneVoiceResult = {
        voice_id: response.data.voice_id,
        name: options.name,
        category: 'cloned',
        description: options.description,
        labels: options.labels,
      };

      logger.info('Voice cloned successfully', {
        voiceId: result.voice_id,
        name: result.name
      });

      return result;
    } catch (error) {
      logger.error('Failed to clone voice', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: options.name
      });
      throw new Error(`Voice cloning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Synthesize speech from text using a voice
   *
   * @param options - Speech synthesis options
   * @returns Generated audio file path and metadata
   */
  async synthesizeSpeech(options: SynthesizeSpeechOptions): Promise<SynthesizeSpeechResult> {
    logger.info('Synthesizing speech', {
      voiceId: options.voiceId,
      textLength: options.text.length,
      modelId: options.modelId || DEFAULT_MODEL
    });

    try {
      const modelId = options.modelId || DEFAULT_MODEL;
      const voiceSettings = options.voiceSettings || MUSIC_VOICE_SETTINGS;

      // Make TTS request
      const response = await this.client.post(
        `/text-to-speech/${options.voiceId}`,
        {
          text: options.text,
          model_id: modelId,
          voice_settings: voiceSettings,
        },
        {
          responseType: 'arraybuffer',
        }
      );

      const audioBuffer = Buffer.from(response.data);

      // Determine output path
      const timestamp = Date.now();
      const outputPath = options.outputPath ||
        path.join('/tmp', `voice-${options.voiceId}-${timestamp}.mp3`);

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Save audio file
      fs.writeFileSync(outputPath, audioBuffer);

      logger.info('Speech synthesized successfully', {
        voiceId: options.voiceId,
        outputPath,
        sizeBytes: audioBuffer.length
      });

      return {
        audioPath: outputPath,
        audioBuffer,
        metadata: {
          voiceId: options.voiceId,
          text: options.text,
          generatedAt: new Date(),
        },
      };
    } catch (error) {
      logger.error('Failed to synthesize speech', {
        error: error instanceof Error ? error.message : 'Unknown error',
        voiceId: options.voiceId
      });
      throw new Error(`Speech synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate vocals for an entire song (multiple lines)
   *
   * @param options - Song vocal generation options
   * @returns Paths to generated audio files and metadata
   */
  async generateSongVocals(options: GenerateSongVocalsOptions): Promise<GenerateSongVocalsResult> {
    logger.info('Generating song vocals', {
      voiceId: options.voiceId,
      lineCount: options.lines.length
    });

    try {
      const timestamp = Date.now();
      const outputDir = options.outputDir || path.join('/tmp', `vocals-${timestamp}`);

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const linePaths: string[] = [];
      let totalDuration = 0;

      // Generate vocals for each line
      for (let i = 0; i < options.lines.length; i++) {
        const line = options.lines[i];
        const lineNumber = String(i + 1).padStart(3, '0');
        const outputPath = path.join(outputDir, `line-${lineNumber}.mp3`);

        logger.info(`Generating vocal for line ${i + 1}/${options.lines.length}`, {
          text: line.text.substring(0, 50) + (line.text.length > 50 ? '...' : '')
        });

        // Add emotion hint to text if provided
        let textToSpeak = line.text;
        if (line.emotion) {
          textToSpeak = `[${line.emotion}] ${line.text}`;
        }

        const result = await this.synthesizeSpeech({
          text: textToSpeak,
          voiceId: options.voiceId,
          modelId: options.modelId,
          voiceSettings: options.voiceSettings || MUSIC_VOICE_SETTINGS,
          outputPath,
        });

        linePaths.push(result.audioPath);

        // Estimate duration (rough estimate: ~150 words per minute for singing)
        const wordCount = line.text.split(/\s+/).length;
        const estimatedDuration = (wordCount / 150) * 60;
        totalDuration += estimatedDuration;
      }

      let mergedPath: string | undefined;

      // TODO: Implement audio merging if mergeOutput=true
      // This would require an audio processing library like ffmpeg
      if (options.mergeOutput) {
        logger.warn('Audio merging not yet implemented - returning individual line files');
      }

      logger.info('Song vocals generated successfully', {
        voiceId: options.voiceId,
        lineCount: linePaths.length,
        totalDuration,
        outputDir
      });

      return {
        linePaths,
        mergedPath,
        totalDuration,
        metadata: {
          voiceId: options.voiceId,
          lineCount: linePaths.length,
          generatedAt: new Date(),
        },
      };
    } catch (error) {
      logger.error('Failed to generate song vocals', {
        error: error instanceof Error ? error.message : 'Unknown error',
        voiceId: options.voiceId
      });
      throw new Error(`Song vocal generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all available voices (including cloned voices)
   *
   * @returns List of voices
   */
  async listVoices(): Promise<ListVoicesResult> {
    logger.info('Listing available voices');

    try {
      const response = await this.client.get('/voices');

      const voices: Voice[] = response.data.voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        labels: voice.labels,
        samples: voice.samples,
      }));

      logger.info('Voices listed successfully', {
        count: voices.length
      });

      return { voices };
    } catch (error) {
      logger.error('Failed to list voices', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to list voices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a cloned voice
   *
   * @param voiceId - ID of the voice to delete
   */
  async deleteVoice(voiceId: string): Promise<void> {
    logger.info('Deleting voice', { voiceId });

    try {
      await this.client.delete(`/voices/${voiceId}`);

      logger.info('Voice deleted successfully', { voiceId });
    } catch (error) {
      logger.error('Failed to delete voice', {
        error: error instanceof Error ? error.message : 'Unknown error',
        voiceId
      });
      throw new Error(`Failed to delete voice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get information about a specific voice
   *
   * @param voiceId - ID of the voice
   * @returns Voice information
   */
  async getVoice(voiceId: string): Promise<Voice> {
    logger.info('Getting voice info', { voiceId });

    try {
      const response = await this.client.get(`/voices/${voiceId}`);

      const voice: Voice = {
        voice_id: response.data.voice_id,
        name: response.data.name,
        category: response.data.category,
        description: response.data.description,
        labels: response.data.labels,
        samples: response.data.samples,
      };

      logger.info('Voice info retrieved successfully', {
        voiceId,
        name: voice.name
      });

      return voice;
    } catch (error) {
      logger.error('Failed to get voice info', {
        error: error instanceof Error ? error.message : 'Unknown error',
        voiceId
      });
      throw new Error(`Failed to get voice info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const voiceCloner = new VoiceCloner();
