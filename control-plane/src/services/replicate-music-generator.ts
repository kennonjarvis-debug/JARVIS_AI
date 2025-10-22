/**
 * Replicate Music Generator Service
 *
 * Uses YOUR custom-trained MusicGen models on Replicate
 * Cost: ~$0.06-0.08 per song (vs $4-5 with Stable Audio + ElevenLabs)
 *
 * Your models:
 * - sakemin/musicgen-fine-tuner:bc57274e (latest)
 * - sakemin/musicgen-fine-tuner:bc57274e (backup)
 */

import Replicate from 'replicate';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import axios from 'axios';

export interface MusicGenOptions {
  prompt: string;
  duration?: number; // seconds (max 30 for MusicGen)
  temperature?: number; // 0-1, creativity
  topK?: number; // sampling parameter
  topP?: number; // nucleus sampling
  classifier_free_guidance?: number; // how much to follow prompt
}

export interface MusicGenerationResult {
  audioUrl: string;
  localPath: string;
  duration: number;
  cost: number;
  model: string;
  metadata: {
    prompt: string;
    generatedAt: Date;
    replicatePredictionId?: string;
  };
}

export class ReplicateMusicGenerator {
  private replicate: Replicate;
  // Your custom trained models:
  private customModels = {
    morganWallen: 'kennonjarvis-debug/morgan_wallen_style-musicgen:7feb3d6ba5ee76e3af79c7ab923aa70ed55c1fbcd96a9d8fcd724150daaf5d29',
    drake: 'kennonjarvis-debug/drake_style-musicgen:e37bd554db93ea40ba192f3296381ee096b760dcb5bf2145d0169f4c8a75173d'
  };
  private customModel = this.customModels.morganWallen; // Default to Morgan Wallen style
  private outputDir: string;

  constructor() {
    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      throw new Error('REPLICATE_API_TOKEN environment variable is required');
    }

    this.replicate = new Replicate({
      auth: apiKey,
    });

    this.outputDir = process.env.MUSIC_OUTPUT_DIR || '/tmp/jarvis-generated-music';

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    logger.info('🎵 ReplicateMusicGenerator initialized with custom model:', {
      model: this.customModel
    });
  }

  /**
   * Generate music using YOUR custom-trained MusicGen model
   *
   * @example
   * ```ts
   * const music = await generator.generate({
   *   prompt: "epic orchestral music with powerful drums",
   *   duration: 30
   * });
   * ```
   */
  async generate(options: MusicGenOptions): Promise<MusicGenerationResult> {
    const startTime = Date.now();

    logger.info('🎼 Generating music with custom MusicGen model...', {
      prompt: options.prompt.slice(0, 100),
      duration: options.duration,
      model: this.customModel
    });

    try {
      // Run prediction on your custom model
      const output = await this.replicate.run(
        this.customModel as any,
        {
          input: {
            prompt: options.prompt,
            duration: Math.min(options.duration || 30, 30), // MusicGen max is 30s
            temperature: options.temperature || 1.0,
            top_k: options.topK || 250,
            top_p: options.topP || 0.0,
            classifier_free_guidance: options.classifier_free_guidance || 3.0,
          }
        }
      ) as any;

      const audioUrl = Array.isArray(output) ? output[0] : output;

      if (!audioUrl) {
        throw new Error('No audio URL returned from Replicate');
      }

      logger.info('✅ Music generated successfully:', {
        url: audioUrl,
        timeElapsed: ((Date.now() - startTime) / 1000).toFixed(1) + 's'
      });

      // Download audio file
      const localPath = await this.downloadAudio(audioUrl, options.prompt);

      // Estimate cost (MusicGen typically ~$0.06-0.08 per run)
      const estimatedCost = 0.07;

      return {
        audioUrl,
        localPath,
        duration: options.duration || 30,
        cost: estimatedCost,
        model: this.customModel,
        metadata: {
          prompt: options.prompt,
          generatedAt: new Date(),
        }
      };

    } catch (error: any) {
      logger.error('❌ Music generation failed:', {
        error: error.message,
        model: this.customModel
      });
      throw new Error(`Music generation failed: ${error.message}`);
    }
  }

  /**
   * Download audio from Replicate URL and save locally
   */
  private async downloadAudio(url: string, prompt: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const timestamp = Date.now();
      const sanitizedPrompt = prompt
        .slice(0, 30)
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase();

      const filename = `musicgen-${sanitizedPrompt}-${timestamp}.wav`;
      const filepath = path.join(this.outputDir, filename);

      fs.writeFileSync(filepath, Buffer.from(response.data));

      logger.info('📥 Audio downloaded:', {
        path: filepath,
        sizeKB: Math.round(response.data.length / 1024)
      });

      return filepath;

    } catch (error: any) {
      logger.error('❌ Audio download failed:', error.message);
      throw new Error(`Failed to download audio: ${error.message}`);
    }
  }

  /**
   * Generate multiple variations of a prompt (useful for A/B testing)
   */
  async generateVariations(
    prompt: string,
    count: number = 3
  ): Promise<MusicGenerationResult[]> {
    logger.info(`🎵 Generating ${count} variations...`);

    const promises = Array.from({ length: count }, (_, i) =>
      this.generate({
        prompt,
        duration: 30,
        temperature: 0.9 + (i * 0.1) // Vary temperature for diversity
      })
    );

    return Promise.all(promises);
  }

  /**
   * Extend a music piece (generate continuation)
   * Note: Requires melody input feature, may need different model
   */
  async extend(
    existingAudioPath: string,
    continuePrompt: string,
    duration: number = 30
  ): Promise<MusicGenerationResult> {
    logger.warn('⚠️  Extend feature not yet implemented - generating new music instead');

    return this.generate({
      prompt: continuePrompt,
      duration
    });
  }

  /**
   * Get cost estimate for generating music
   */
  estimateCost(durationSeconds: number): number {
    // MusicGen on Replicate: ~$0.06-0.08 per run (up to 30s)
    const runsNeeded = Math.ceil(durationSeconds / 30);
    return runsNeeded * 0.07;
  }
}

// Export singleton instance
export const replicateMusicGenerator = new ReplicateMusicGenerator();
