/**
 * Audio Generator Service
 *
 * Professional audio generation service using YOUR custom MusicGen models.
 * Cost: $0.07 per song (vs $4+ with Stable Audio)
 * 98% cost reduction!
 *
 * @module AudioGenerator
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';
import { replicateMusicGenerator } from './replicate-music-generator.js';

/**
 * Parameters for audio generation
 */
export interface AudioGenerationParams {
  prompt: string;
  duration: number; // seconds
  genre?: string;
  bpm?: number;
  key?: string;
  mood?: string;
}

/**
 * Parameters for drum pattern generation
 */
export interface DrumGenerationParams {
  bpm: number;
  genre: string;
  duration: number;
  style?: 'minimal' | 'standard' | 'complex';
}

/**
 * Parameters for bass line generation
 */
export interface BassGenerationParams {
  bpm: number;
  key: string;
  genre: string;
  duration: number;
  style?: 'sub' | 'mid' | 'growl';
}

/**
 * Parameters for melody generation
 */
export interface MelodyGenerationParams {
  genre: string;
  bpm: number;
  key: string;
  duration: number;
  complexity?: 'simple' | 'moderate' | 'complex';
}

/**
 * Parameters for composing complete beats
 */
export interface ComposeBeatParams {
  genre: string;
  bpm: number;
  key: string;
  duration: number;
  includeElements: ('drums' | 'bass' | 'melody' | 'harmony')[];
  mood?: string;
}

/**
 * Result from audio generation
 */
export interface AudioGenerationResult {
  path: string;
  duration: number;
  format: string;
  sizeBytes: number;
  generatedAt: Date;
}

/**
 * Audio Generator Service
 *
 * Provides professional audio generation capabilities using Stable Audio API.
 * Handles beat generation, melody creation, drum patterns, bass lines, and mixing.
 */
export class AudioGenerator {
  private outputDirectory: string;

  constructor() {
    this.outputDirectory = '/tmp';

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDirectory)) {
      fs.mkdirSync(this.outputDirectory, { recursive: true });
    }

    logger.info('🎵 Audio Generator initialized with custom MusicGen models');
  }

  /**
   * Generate instrumental beat using YOUR custom MusicGen models
   *
   * Creates a complete instrumental beat based on the provided parameters.
   * Cost: $0.07 per song (vs $4+ with old Stable Audio)
   *
   * @param params - Audio generation parameters
   * @returns Path to generated audio file
   *
   * @example
   * ```typescript
   * const audioPath = await audioGenerator.generateBeat({
   *   prompt: 'hip-hop beat',
   *   duration: 30,
   *   genre: 'hip-hop',
   *   bpm: 90,
   *   key: 'C minor',
   *   mood: 'dark'
   * });
   * ```
   */
  async generateBeat(params: AudioGenerationParams): Promise<string> {
    logger.info('🎵 Generating beat with custom MusicGen...', {
      genre: params.genre,
      bpm: params.bpm,
      duration: params.duration
    });

    // Build detailed prompt
    const prompt = this.buildBeatPrompt(params);
    logger.info('📝 Using prompt:', { prompt });

    try {
      // Use your custom MusicGen model (Morgan Wallen/Drake style)
      const result = await replicateMusicGenerator.generate({
        prompt,
        duration: Math.min(params.duration, 30), // MusicGen max is 30s
        temperature: 1.0
      });

      logger.info('✅ Beat generated successfully:', {
        path: result.localPath,
        cost: `$${result.cost.toFixed(4)}`,
        sizeKB: fs.existsSync(result.localPath) ? Math.round(fs.statSync(result.localPath).size / 1024) : 0
      });

      return result.localPath;

    } catch (error: any) {
      logger.error('❌ Failed to generate beat:', {
        error: error.message
      });
      throw new Error(`Audio generation failed: ${error.message}`);
    }
  }

  /**
   * Generate melody using Stable Audio
   *
   * Creates a melodic element suitable for layering with beats.
   *
   * @param params - Melody generation parameters
   * @returns Path to generated melody file
   *
   * @example
   * ```typescript
   * const melodyPath = await audioGenerator.generateMelody({
   *   genre: 'trap',
   *   bpm: 140,
   *   key: 'A minor',
   *   duration: 30,
   *   complexity: 'moderate'
   * });
   * ```
   */
  async generateMelody(params: MelodyGenerationParams): Promise<string> {
    logger.info('🎹 Generating melody...', params);

    const complexityDescriptions = {
      simple: 'simple, catchy',
      moderate: 'moderately complex',
      complex: 'intricate, layered'
    };

    const complexity = params.complexity || 'moderate';
    const complexityDesc = complexityDescriptions[complexity];

    const prompt = `melodic ${params.genre} melody, ${complexityDesc}, ` +
                   `${params.bpm} BPM, in ${params.key}, ` +
                   `high quality, professional production, instrumental, ` +
                   `synthesizer lead, emotional`;

    try {
      const response = await axios.post(
        this.apiEndpoint,
        {
          prompt,
          duration_seconds: params.duration,
          output_format: 'wav'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.stableAudioApiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 60000
        }
      );

      const outputPath = path.join(
        this.outputDirectory,
        `melody-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`
      );

      fs.writeFileSync(outputPath, Buffer.from(response.data));

      logger.info('✅ Melody generated:', { path: outputPath });
      return outputPath;

    } catch (error: any) {
      logger.error('❌ Failed to generate melody:', error.message);
      throw new Error(`Melody generation failed: ${error.message}`);
    }
  }

  /**
   * Generate drum pattern using Stable Audio
   *
   * Creates a professional drum pattern for the specified genre.
   *
   * @param params - Drum generation parameters
   * @returns Path to generated drum pattern file
   *
   * @example
   * ```typescript
   * const drumsPath = await audioGenerator.generateDrums({
   *   bpm: 120,
   *   genre: 'trap',
   *   duration: 30,
   *   style: 'complex'
   * });
   * ```
   */
  async generateDrums(params: DrumGenerationParams): Promise<string> {
    logger.info('🥁 Generating drum pattern...', params);

    const styleDescriptions = {
      minimal: 'minimal, sparse',
      standard: 'standard',
      complex: 'complex, layered, detailed'
    };

    const style = params.style || 'standard';
    const styleDesc = styleDescriptions[style];

    const prompt = `${params.genre} drum pattern, ${styleDesc}, ` +
                   `${params.bpm} BPM, energetic, ` +
                   `808s, hi-hats, snares, kicks, ` +
                   `high quality, professional production, instrumental`;

    try {
      const response = await axios.post(
        this.apiEndpoint,
        {
          prompt,
          duration_seconds: params.duration,
          output_format: 'wav'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.stableAudioApiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 60000
        }
      );

      const outputPath = path.join(
        this.outputDirectory,
        `drums-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`
      );

      fs.writeFileSync(outputPath, Buffer.from(response.data));

      logger.info('✅ Drums generated:', { path: outputPath });
      return outputPath;

    } catch (error: any) {
      logger.error('❌ Failed to generate drums:', error.message);
      throw new Error(`Drum generation failed: ${error.message}`);
    }
  }

  /**
   * Generate bass line using Stable Audio
   *
   * Creates a bass line that complements the beat.
   *
   * @param params - Bass generation parameters
   * @returns Path to generated bass line file
   *
   * @example
   * ```typescript
   * const bassPath = await audioGenerator.generateBass({
   *   bpm: 90,
   *   key: 'D minor',
   *   genre: 'dubstep',
   *   duration: 30,
   *   style: 'growl'
   * });
   * ```
   */
  async generateBass(params: BassGenerationParams): Promise<string> {
    logger.info('🎸 Generating bass line...', params);

    const styleDescriptions = {
      sub: 'deep sub bass, rumbling',
      mid: 'mid-range bass, groovy',
      growl: 'aggressive growl bass, distorted'
    };

    const style = params.style || 'mid';
    const styleDesc = styleDescriptions[style];

    const prompt = `${params.genre} bass line, ${styleDesc}, ` +
                   `${params.bpm} BPM, in ${params.key}, ` +
                   `deep and powerful, professional production, instrumental`;

    try {
      const response = await axios.post(
        this.apiEndpoint,
        {
          prompt,
          duration_seconds: params.duration,
          output_format: 'wav'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.stableAudioApiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 60000
        }
      );

      const outputPath = path.join(
        this.outputDirectory,
        `bass-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`
      );

      fs.writeFileSync(outputPath, Buffer.from(response.data));

      logger.info('✅ Bass generated:', { path: outputPath });
      return outputPath;

    } catch (error: any) {
      logger.error('❌ Failed to generate bass:', error.message);
      throw new Error(`Bass generation failed: ${error.message}`);
    }
  }

  /**
   * Compose complete beat by generating and mixing multiple elements
   *
   * Creates a full professional beat by generating individual elements
   * (drums, bass, melody, harmony) and mixing them together.
   *
   * @param params - Composition parameters
   * @returns Path to final mixed beat file
   *
   * @example
   * ```typescript
   * const beatPath = await audioGenerator.composeBeat({
   *   genre: 'trap',
   *   bpm: 140,
   *   key: 'E minor',
   *   duration: 60,
   *   includeElements: ['drums', 'bass', 'melody'],
   *   mood: 'aggressive'
   * });
   * ```
   */
  async composeBeat(params: ComposeBeatParams): Promise<string> {
    logger.info('🎼 Composing full beat...', {
      elements: params.includeElements,
      genre: params.genre,
      bpm: params.bpm
    });

    // Generate each requested element
    const elements: Record<string, string> = {};
    const generationPromises: Promise<void>[] = [];

    // Generate drums
    if (params.includeElements.includes('drums')) {
      generationPromises.push(
        this.generateDrums({
          bpm: params.bpm,
          genre: params.genre,
          duration: params.duration,
          style: 'complex'
        }).then(path => {
          elements.drums = path;
          logger.info('🥁 Drums ready');
        })
      );
    }

    // Generate bass
    if (params.includeElements.includes('bass')) {
      generationPromises.push(
        this.generateBass({
          bpm: params.bpm,
          key: params.key,
          genre: params.genre,
          duration: params.duration,
          style: 'sub'
        }).then(path => {
          elements.bass = path;
          logger.info('🎸 Bass ready');
        })
      );
    }

    // Generate melody
    if (params.includeElements.includes('melody')) {
      generationPromises.push(
        this.generateMelody({
          genre: params.genre,
          bpm: params.bpm,
          key: params.key,
          duration: params.duration,
          complexity: 'moderate'
        }).then(path => {
          elements.melody = path;
          logger.info('🎹 Melody ready');
        })
      );
    }

    // Generate harmony
    if (params.includeElements.includes('harmony')) {
      generationPromises.push(
        this.generateMelody({
          genre: params.genre,
          bpm: params.bpm,
          key: params.key,
          duration: params.duration,
          complexity: 'simple'
        }).then(path => {
          elements.harmony = path;
          logger.info('🎵 Harmony ready');
        })
      );
    }

    // Wait for all elements to be generated
    try {
      await Promise.all(generationPromises);
      logger.info('✅ All elements generated, mixing...');
    } catch (error) {
      logger.error('❌ Failed to generate all elements:', error);
      throw error;
    }

    // Mix elements together
    const mixedPath = await this.mixAudioElements(elements, params.duration);

    // Clean up individual element files
    for (const elementPath of Object.values(elements)) {
      try {
        fs.unlinkSync(elementPath);
        logger.info('🗑️  Cleaned up temporary file:', elementPath);
      } catch (error) {
        logger.warn('Failed to clean up file:', elementPath);
      }
    }

    logger.info('✅ Beat composed successfully:', { path: mixedPath });

    return mixedPath;
  }

  /**
   * Mix multiple audio elements together using FFmpeg
   *
   * Combines multiple audio files into a single mixed output.
   * Uses FFmpeg's amix filter for professional audio mixing.
   *
   * @param elements - Record of element names to file paths
   * @param duration - Target duration in seconds
   * @returns Path to mixed audio file
   *
   * @example
   * ```typescript
   * const mixedPath = await audioGenerator.mixAudioElements({
   *   drums: '/tmp/drums.wav',
   *   bass: '/tmp/bass.wav',
   *   melody: '/tmp/melody.wav'
   * }, 30);
   * ```
   */
  async mixAudioElements(
    elements: Record<string, string>,
    duration: number
  ): Promise<string> {
    logger.info('🎛️  Mixing audio elements...', {
      elementCount: Object.keys(elements).length,
      elements: Object.keys(elements)
    });

    if (Object.keys(elements).length === 0) {
      throw new Error('No audio elements provided for mixing');
    }

    // If only one element, just return it
    if (Object.keys(elements).length === 1) {
      const singlePath = Object.values(elements)[0];
      logger.info('Only one element, skipping mix:', singlePath);
      return singlePath;
    }

    const outputPath = path.join(
      this.outputDirectory,
      `mixed-beat-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`
    );

    try {
      // Build FFmpeg command
      const inputs = Object.values(elements).map(p => `-i "${p}"`).join(' ');
      const numInputs = Object.keys(elements).length;

      // Use amix filter to mix audio with normalization
      const filterComplex = `amix=inputs=${numInputs}:duration=longest:normalize=0`;

      const command = `ffmpeg ${inputs} -filter_complex "${filterComplex}" -ac 2 -ar 44100 "${outputPath}" -y`;

      logger.info('🎛️  Running FFmpeg command...');

      execSync(command, {
        stdio: 'pipe', // Suppress FFmpeg output
        timeout: 120000 // 2 minute timeout
      });

      const stats = fs.statSync(outputPath);
      logger.info('✅ Audio mixed successfully:', {
        path: outputPath,
        sizeKB: Math.round(stats.size / 1024)
      });

      return outputPath;

    } catch (error: any) {
      logger.error('❌ Failed to mix audio:', error.message);
      throw new Error(`Audio mixing failed: ${error.message}`);
    }
  }

  /**
   * Build intelligent prompt for beat generation
   *
   * Constructs a detailed prompt that maximizes audio quality
   * by including all relevant musical parameters.
   *
   * @param params - Audio generation parameters
   * @returns Formatted prompt string
   * @private
   */
  private buildBeatPrompt(params: AudioGenerationParams): string {
    const parts: string[] = [];

    // Start with base prompt
    if (params.prompt) {
      parts.push(params.prompt);
    }

    // Add genre
    if (params.genre) {
      parts.push(`${params.genre} style`);
    }

    // Add BPM
    if (params.bpm) {
      parts.push(`${params.bpm} BPM`);
    }

    // Add key
    if (params.key) {
      parts.push(`in ${params.key}`);
    }

    // Add mood
    if (params.mood) {
      parts.push(`${params.mood} mood`);
    }

    // Add quality descriptors
    parts.push('high quality', 'professional production', 'instrumental');

    return parts.join(', ');
  }

  /**
   * Get generation result metadata
   *
   * Returns detailed information about a generated audio file.
   *
   * @param filePath - Path to audio file
   * @returns Audio generation result metadata
   */
  async getGenerationResult(filePath: string): Promise<AudioGenerationResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const format = path.extname(filePath).substring(1);

    return {
      path: filePath,
      duration: 0, // Would need ffprobe to get actual duration
      format,
      sizeBytes: stats.size,
      generatedAt: stats.birthtime
    };
  }

  /**
   * Clean up old generated audio files
   *
   * Removes audio files older than the specified age.
   *
   * @param maxAgeHours - Maximum age in hours (default: 24)
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    logger.info('🧹 Cleaning up old audio files...', { maxAgeHours });

    const files = fs.readdirSync(this.outputDirectory);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      if (!file.match(/^(beat|melody|drums|bass|mixed-beat)-\d+/)) {
        continue; // Skip non-generated files
      }

      const filePath = path.join(this.outputDirectory, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch (error) {
          logger.warn('Failed to delete old file:', filePath);
        }
      }
    }

    logger.info(`✅ Cleanup complete: ${deletedCount} files deleted`);
  }
}

// Export singleton instance
export const audioGenerator = new AudioGenerator();
