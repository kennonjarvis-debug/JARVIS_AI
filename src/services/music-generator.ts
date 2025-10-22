/**
 * Music Generator Service
 *
 * UPGRADED: Now using real Suno API for professional-quality music generation.
 * Provides Suno-level quality with proper song structure (verse/chorus/bridge),
 * expert audio engineer-level prompting, and professional production.
 *
 * Features:
 * - Expert music theory analysis (chord progressions, key, BPM)
 * - Song structure with different sections
 * - Audio engineer-level prompting via GPT-4o
 * - Professional mixing and mastering
 */

import { logger } from '../utils/logger.js';
import { audioGenerator } from './audio-generator.js';
import { replicateMusicGenerator } from './replicate-music-generator.js';
import { sunoApiClient } from './suno-api-client.js';

export interface MusicalIntent {
  genre: {
    primary: string;
    subGenres: string[];
    confidence: number;
  };
  mood: {
    primary: string;
    emotions: string[];
    energy: number;
    valence: number;
  };
  tempo: {
    bpm: number;
    range: [number, number];
    feel: string;
  };
  musicalStyle: {
    instruments: string[];
    production: string;
    influences: string[];
  };
  lyrical: {
    themes: string[];
    narrative: string;
    language: string;
    hasChorus: boolean;
  };
  intentType: string;
  readyToCompose: boolean;
  missingElements: string[];
  confidence: number;
  processingNotes: string[];
}

export interface GenerateMusicOptions {
  musicalIntent: MusicalIntent;
  duration: number;
  includeVocals: boolean;
}

export interface MusicGenerationResult {
  id: string;
  audioUrl: string;
  localPath: string;
  duration: number;
  metadata: {
    genre: string;
    tempo: number;
    instruments: string[];
    generatedAt: Date;
  };
}

export class MusicGenerator {
  /**
   * Generate music using Suno API with expert audio engineering
   *
   * This method now uses:
   * - Real Suno API for professional quality
   * - GPT-4o expert prompting with music theory
   * - Proper song structure (verse/chorus/bridge)
   * - Different chord progressions per section
   */
  async generateMusic(options: GenerateMusicOptions): Promise<MusicGenerationResult> {
    logger.info('🎵 Generating music with Suno API + Expert Prompting', {
      genre: options.musicalIntent.genre.primary,
      bpm: options.musicalIntent.tempo.bpm,
      duration: options.duration,
      includeVocals: options.includeVocals
    });

    try {
      // Build detailed prompt from musical intent
      const userPrompt = this.buildPromptFromIntent(options.musicalIntent);

      // Use Suno API client with expert audio engineering
      const result = await sunoApiClient.generateMusic(userPrompt, {
        duration: options.duration,
        makeInstrumental: !options.includeVocals,
        customMode: true // Enable custom mode for better control
      });

      logger.info('✅ Suno generation complete with expert analysis', {
        key: result.expertAnalysis.musicTheory.key,
        sections: result.expertAnalysis.songStructure.sections.length,
        chordProgressions: result.expertAnalysis.musicTheory.chordProgressions
      });

      return {
        id: result.id,
        audioUrl: result.audioUrl,
        localPath: result.localPath,
        duration: result.duration,
        metadata: result.metadata
      };
    } catch (error: any) {
      logger.error('Suno music generation failed:', error.message);

      // Fallback to MusicGen if Suno fails
      logger.warn('Falling back to MusicGen...');
      return this.generateMusicFallback(options);
    }
  }

  /**
   * Fallback to MusicGen if Suno API fails
   */
  private async generateMusicFallback(options: GenerateMusicOptions): Promise<MusicGenerationResult> {
    logger.info('🎵 Using MusicGen fallback', {
      genre: options.musicalIntent.genre.primary,
      bpm: options.musicalIntent.tempo.bpm
    });

    const prompt = this.buildPromptFromIntent(options.musicalIntent);

    const audioPath = await audioGenerator.generateBeat({
      prompt,
      duration: Math.min(options.duration, 30),
      genre: options.musicalIntent.genre.primary,
      bpm: options.musicalIntent.tempo.bpm,
      mood: options.musicalIntent.mood.primary
    });

    const id = `music-fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return {
      id,
      audioUrl: `file://${audioPath}`,
      localPath: audioPath,
      duration: options.duration,
      metadata: {
        genre: options.musicalIntent.genre.primary,
        tempo: options.musicalIntent.tempo.bpm,
        instruments: options.musicalIntent.musicalStyle.instruments,
        generatedAt: new Date()
      }
    };
  }

  /**
   * Build prompt from musical intent
   */
  private buildPromptFromIntent(intent: MusicalIntent): string {
    const parts: string[] = [];

    // Genre
    parts.push(intent.genre.primary);
    if (intent.genre.subGenres.length > 0) {
      parts.push(intent.genre.subGenres.join(', '));
    }

    // Mood
    parts.push(intent.mood.primary);
    if (intent.mood.emotions.length > 0) {
      parts.push(intent.mood.emotions.slice(0, 2).join(', '));
    }

    // Instruments
    if (intent.musicalStyle.instruments.length > 0) {
      parts.push(`with ${intent.musicalStyle.instruments.join(', ')}`);
    }

    // Production style
    if (intent.musicalStyle.production) {
      parts.push(`${intent.musicalStyle.production} production`);
    }

    return parts.join(', ');
  }

  /**
   * Generate a beat with specified parameters using Suno API
   *
   * Now uses expert audio engineer prompting and proper song structure
   */
  async generateBeat(params: {
    genre?: string;
    bpm?: number;
    mood?: string;
    duration?: number;
    key?: string;
    artists?: string[];
  }): Promise<MusicGenerationResult> {
    logger.info('🥁 Generating beat with Suno API + Expert Analysis', params);

    // Build a detailed prompt that leverages expert analysis
    let userPrompt = `Create a professional ${params.genre || 'hip-hop'} beat at ${params.bpm || 120} BPM with a ${params.mood || 'energetic'} mood`;

    // Add key if specified
    if (params.key) {
      userPrompt += ` in ${params.key}`;
    }

    // Add artist style references if specified
    if (params.artists && params.artists.length > 0) {
      userPrompt += `. Style it after ${params.artists.join(' and ')}'s production style`;
    }

    userPrompt += `. The beat should have proper song structure with an intro, verses, chorus, and bridge. Each section should have different chord progressions and production elements. Make it sound like a professional studio production with proper mixing and mastering.`;

    // Add duration specification
    if (params.duration) {
      const minutes = Math.floor(params.duration / 60);
      const seconds = params.duration % 60;
      userPrompt += ` Target duration: ${minutes}:${String(seconds).padStart(2, '0')}.`;
    }

    try {
      // Use Suno API directly for beat generation
      const result = await sunoApiClient.generateMusic(userPrompt, {
        duration: params.duration || 120,
        makeInstrumental: true, // Beats are instrumental
        customMode: true
      });

      logger.info('✅ Beat generated with expert structure', {
        key: result.expertAnalysis.musicTheory.key,
        bpm: result.expertAnalysis.musicTheory.bpm,
        sections: result.expertAnalysis.songStructure.sections.map(s => s.type).join(' → ')
      });

      return {
        id: result.id,
        audioUrl: result.audioUrl,
        localPath: result.localPath,
        duration: result.duration,
        metadata: result.metadata
      };

    } catch (error: any) {
      logger.error('Suno beat generation failed:', error.message);

      // Fallback to basic musical intent for MusicGen
      logger.warn('Falling back to MusicGen for beat...');

      const musicalIntent: MusicalIntent = {
        genre: {
          primary: params.genre || 'hip-hop',
          subGenres: [],
          confidence: 0.8
        },
        mood: {
          primary: params.mood || 'energetic',
          emotions: [],
          energy: 7,
          valence: 5
        },
        tempo: {
          bpm: params.bpm || 120,
          range: [110, 130],
          feel: 'moderate'
        },
        musicalStyle: {
          instruments: ['808s', 'synth', 'hi-hats'],
          production: 'modern',
          influences: []
        },
        lyrical: {
          themes: [],
          narrative: 'instrumental',
          language: 'en',
          hasChorus: false
        },
        intentType: 'beat-first',
        readyToCompose: true,
        missingElements: [],
        confidence: 0.8,
        processingNotes: []
      };

      return this.generateMusicFallback({
        musicalIntent,
        duration: params.duration || 120,
        includeVocals: false
      });
    }
  }
}

// Export singleton instance
export const musicGenerator = new MusicGenerator();
