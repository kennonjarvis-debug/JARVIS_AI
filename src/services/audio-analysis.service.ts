/**
 * Audio Analysis Service
 *
 * Automatically detects BPM and musical key from audio files.
 * Used when users upload clips to suggest DAW transport settings.
 *
 * @module services/audio-analysis
 */

import { logger } from '../utils/logger.js';
import { parseFile } from 'music-metadata';
import fs from 'fs/promises';
import path from 'path';

export interface AudioAnalysisResult {
  bpm?: number;
  key?: string;
  duration?: number;
  sampleRate?: number;
  bitrate?: number;
  format?: string;
  confidence?: {
    bpm?: number; // 0-1 confidence score
    key?: number; // 0-1 confidence score
  };
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
  };
}

export class AudioAnalysisService {
  /**
   * Analyze audio file to detect BPM, key, and other metadata
   */
  async analyzeAudioFile(filePath: string): Promise<AudioAnalysisResult> {
    try {
      logger.info('🔍 Analyzing audio file', { filePath });

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Parse audio metadata using music-metadata
      const metadata = await parseFile(filePath);

      const result: AudioAnalysisResult = {
        duration: metadata.format.duration,
        sampleRate: metadata.format.sampleRate,
        bitrate: metadata.format.bitrate,
        format: metadata.format.container,
        metadata: {
          title: metadata.common.title,
          artist: metadata.common.artist,
          album: metadata.common.album,
        },
      };

      // Extract BPM from metadata tags (if available)
      // Many DAWs embed BPM in audio file metadata
      if (metadata.common.bpm) {
        result.bpm = Math.round(metadata.common.bpm);
        result.confidence = { ...result.confidence, bpm: 0.9 }; // High confidence from metadata
        logger.info('✅ BPM found in metadata', { bpm: result.bpm });
      }

      // Extract key from metadata tags (if available)
      if (metadata.common.key) {
        result.key = metadata.common.key;
        result.confidence = { ...result.confidence, key: 0.9 }; // High confidence from metadata
        logger.info('✅ Key found in metadata', { key: result.key });
      }

      // If BPM/key not in metadata, try advanced analysis
      if (!result.bpm || !result.key) {
        const advancedAnalysis = await this.performAdvancedAnalysis(filePath);
        if (!result.bpm && advancedAnalysis.bpm) {
          result.bpm = advancedAnalysis.bpm;
          result.confidence = { ...result.confidence, bpm: advancedAnalysis.confidence?.bpm || 0.7 };
        }
        if (!result.key && advancedAnalysis.key) {
          result.key = advancedAnalysis.key;
          result.confidence = { ...result.confidence, key: advancedAnalysis.confidence?.key || 0.7 };
        }
      }

      logger.info('✅ Audio analysis complete', result);
      return result;
    } catch (error: any) {
      logger.error('Failed to analyze audio file', { error: error.message, filePath });
      throw new Error(`Audio analysis failed: ${error.message}`);
    }
  }

  /**
   * Perform advanced audio analysis using external tools or ML models
   *
   * TODO: Integrate with:
   * - Essentia.js for browser-based analysis
   * - aubio for more accurate BPM detection
   * - Spotify Audio Analysis API
   * - Custom ML model
   */
  private async performAdvancedAnalysis(filePath: string): Promise<Partial<AudioAnalysisResult>> {
    logger.info('🔬 Performing advanced audio analysis...', { filePath });

    // Placeholder for advanced analysis
    // In production, this would use:
    // 1. aubio library for BPM detection
    // 2. Essentia.js or TensorFlow.js for key detection
    // 3. External APIs (Spotify, AcousticBrainz)

    const result: Partial<AudioAnalysisResult> = {};

    // For now, return empty result
    // Advanced analysis will be added in future iterations
    logger.info('⚠️ Advanced analysis not yet implemented');

    return result;
  }

  /**
   * Analyze audio from URL (download first, then analyze)
   */
  async analyzeAudioFromUrl(audioUrl: string): Promise<AudioAnalysisResult> {
    try {
      logger.info('🌐 Downloading audio from URL for analysis', { audioUrl });

      // Download to temp file
      const axios = (await import('axios')).default;
      const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });

      const tempDir = process.env.MUSIC_OUTPUT_DIR || '/tmp/jarvis-audio-analysis';
      await fs.mkdir(tempDir, { recursive: true });

      const tempFile = path.join(tempDir, `temp-${Date.now()}.mp3`);
      await fs.writeFile(tempFile, response.data);

      // Analyze the downloaded file
      const result = await this.analyzeAudioFile(tempFile);

      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (error) {
        logger.warn('Failed to delete temp file', { tempFile });
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to analyze audio from URL', { error: error.message, audioUrl });
      throw new Error(`Failed to analyze audio URL: ${error.message}`);
    }
  }

  /**
   * Quick analysis: Try to get BPM/key from metadata only (fast)
   */
  async quickAnalyze(filePath: string): Promise<Pick<AudioAnalysisResult, 'bpm' | 'key'>> {
    try {
      const metadata = await parseFile(filePath);
      return {
        bpm: metadata.common.bpm ? Math.round(metadata.common.bpm) : undefined,
        key: metadata.common.key,
      };
    } catch (error: any) {
      logger.error('Quick analysis failed', { error: error.message });
      return {};
    }
  }

  /**
   * Validate if BPM seems reasonable
   */
  isValidBpm(bpm?: number): boolean {
    if (!bpm) return false;
    return bpm >= 40 && bpm <= 220; // Reasonable range for music
  }

  /**
   * Validate if key is in standard notation
   */
  isValidKey(key?: string): boolean {
    if (!key) return false;
    const validKeys = [
      'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
      'C Major', 'C Minor', 'C# Major', 'C# Minor', 'Db Major', 'Db Minor',
      'D Major', 'D Minor', 'D# Major', 'D# Minor', 'Eb Major', 'Eb Minor',
      'E Major', 'E Minor', 'F Major', 'F Minor', 'F# Major', 'F# Minor',
      'Gb Major', 'Gb Minor', 'G Major', 'G Minor', 'G# Major', 'G# Minor',
      'Ab Major', 'Ab Minor', 'A Major', 'A Minor', 'A# Major', 'A# Minor',
      'Bb Major', 'Bb Minor', 'B Major', 'B Minor',
    ];
    return validKeys.some(validKey => key.includes(validKey));
  }
}

// Export singleton instance
export const audioAnalysisService = new AudioAnalysisService();
