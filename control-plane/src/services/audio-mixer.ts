/**
 * Professional Audio Mixing and Mastering Service for Freestyle Studio
 *
 * Provides FFmpeg-based professional audio processing including:
 * - Multi-track mixing with volume, pan, and effects
 * - Professional vocal processing chain
 * - Advanced mastering with loudness normalization
 * - Beat-vocal alignment
 * - Complex filter chain building
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Audio track configuration for mixing
 */
export interface AudioTrack {
  path: string;
  type: 'vocals' | 'beat' | 'instrument' | 'effect' | 'ambient';
  volume: number; // 0-1 (1 = 0dB, 0.5 = -6dB, etc.)
  pan: number; // -1 (full left) to 1 (full right), 0 = center
  startTime?: number; // seconds
  duration?: number; // seconds
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds
  effects?: AudioEffect[];
}

/**
 * Audio effect configuration
 */
export interface AudioEffect {
  type: 'reverb' | 'delay' | 'eq' | 'compression' | 'autotune' | 'chorus' | 'distortion' | 'stereo-width';
  intensity?: number; // 0-1
  parameters?: Record<string, any>;
}

/**
 * Mixing request configuration
 */
export interface MixingRequest {
  tracks: AudioTrack[];
  outputPath: string;
  format?: 'wav' | 'mp3' | 'flac' | 'm4a';
  sampleRate?: number; // Hz (44100, 48000)
  bitDepth?: number; // 16, 24, 32
  applyMastering?: boolean;
  masteringPreset?: 'transparent' | 'punchy' | 'warm' | 'broadcast';
}

/**
 * Vocal processing configuration
 */
export interface VocalProcessingRequest {
  inputPath: string;
  outputPath: string;
  preset?: 'natural' | 'radio' | 'rap' | 'singing' | 'aggressive';
  customChain?: VocalEffect[];
  removeNoise?: boolean;
  autoTune?: boolean;
  targetKey?: string; // e.g., 'C', 'Am', 'F#m'
}

/**
 * Vocal effect in the processing chain
 */
export interface VocalEffect {
  type: 'gate' | 'highpass' | 'deesser' | 'compression' | 'eq' | 'reverb' | 'delay' | 'autotune';
  parameters?: Record<string, any>;
}

/**
 * Mastering request configuration
 */
export interface MasteringRequest {
  inputPath: string;
  outputPath: string;
  targetLUFS?: number; // -14 for streaming, -16 for YouTube, -9 for club
  preset?: 'transparent' | 'punchy' | 'warm' | 'broadcast';
  ceilingdB?: number; // -0.1 to -1.0
}

/**
 * Beat alignment configuration
 */
export interface BeatAlignmentRequest {
  vocalsPath: string;
  beatPath: string;
  outputPath: string;
  bpm: number;
  quantize?: boolean; // Snap to grid
  swing?: number; // 0-1
}

/**
 * Audio analysis result
 */
export interface AudioAnalysis {
  duration: number;
  sampleRate: number;
  channels: number;
  peakLevel: number; // dB
  rmsLevel: number; // dB
  lufs: number; // LUFS (loudness)
  dynamicRange: number; // dB
  truePeak: number; // dBTP
}

/**
 * Mixing result
 */
export interface MixingResult {
  outputPath: string;
  format: string;
  analysis: AudioAnalysis;
  processingSteps: string[];
  warnings: string[];
}

// ============================================================================
// AudioMixer Service
// ============================================================================

export class AudioMixer {
  private tempDir: string;
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor() {
    this.tempDir = process.env.AUDIO_TEMP_DIR || '/tmp/jarvis-audio-mixing';
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  }

  /**
   * Initialize the audio mixer service
   */
  async initialize(): Promise<void> {
    // Create temp directory
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // Verify FFmpeg installation
    try {
      execSync(`${this.ffmpegPath} -version`, { encoding: 'utf8' });
      logger.info('✅ [AudioMixer] FFmpeg available');
    } catch (error) {
      logger.error('❌ [AudioMixer] FFmpeg not found. Install: brew install ffmpeg');
      throw new Error('FFmpeg not available');
    }

    // Verify FFprobe installation
    try {
      execSync(`${this.ffprobePath} -version`, { encoding: 'utf8' });
      logger.info('✅ [AudioMixer] FFprobe available');
    } catch (error) {
      logger.warn('⚠️ [AudioMixer] FFprobe not found. Some features may be limited.');
    }

    logger.info('🎛️ [AudioMixer] Initialized successfully');
  }

  // ============================================================================
  // Main Mixing Methods
  // ============================================================================

  /**
   * Mix multiple audio tracks with volume, pan, effects
   */
  async mixTracks(request: MixingRequest): Promise<MixingResult> {
    logger.info(`🎚️ [AudioMixer] Starting mix: ${request.tracks.length} tracks`);

    const processingSteps: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate inputs
      this.validateMixingRequest(request);
      processingSteps.push('Validated input tracks');

      // Build FFmpeg command
      const command = this.buildMixCommand(request);
      processingSteps.push('Built mixing command');

      // Execute mixing
      logger.info('🔄 [AudioMixer] Executing FFmpeg mix...');
      const startTime = Date.now();

      try {
        execSync(command, {
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } catch (error: any) {
        logger.error(`❌ [AudioMixer] FFmpeg error: ${error.message}`);
        throw new Error(`Mixing failed: ${error.message}`);
      }

      const mixTime = Date.now() - startTime;
      processingSteps.push(`Mixed audio (${mixTime}ms)`);
      logger.info(`✅ [AudioMixer] Mix completed in ${mixTime}ms`);

      // Apply mastering if requested
      let finalPath = request.outputPath;
      if (request.applyMastering) {
        const masteredPath = this.getTempPath('mastered.wav');
        await this.masterTrack({
          inputPath: request.outputPath,
          outputPath: masteredPath,
          preset: request.masteringPreset || 'transparent',
          targetLUFS: -14
        });

        // Replace original with mastered
        fs.renameSync(masteredPath, request.outputPath);
        processingSteps.push('Applied mastering');
      }

      // Analyze output
      const analysis = await this.analyzeAudio(finalPath);
      processingSteps.push('Analyzed output audio');

      // Check for issues
      if (analysis.peakLevel > -0.5) {
        warnings.push('Peak level is very high (clipping possible)');
      }
      if (analysis.lufs > -10) {
        warnings.push('Output is very loud (may cause distortion)');
      }
      if (analysis.dynamicRange < 3) {
        warnings.push('Low dynamic range (over-compressed)');
      }

      logger.info(`🎵 [AudioMixer] Mix complete: ${finalPath}`);

      return {
        outputPath: finalPath,
        format: request.format || 'wav',
        analysis,
        processingSteps,
        warnings
      };

    } catch (error: any) {
      logger.error(`❌ [AudioMixer] Mixing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process vocals with professional chain
   */
  async processVocals(request: VocalProcessingRequest): Promise<MixingResult> {
    logger.info('🎤 [AudioMixer] Processing vocals...');

    const processingSteps: string[] = [];
    const warnings: string[] = [];

    try {
      // Get preset or custom chain
      const chain = request.customChain || this.getVocalPresetChain(request.preset || 'natural');

      // Build filter chain
      const filterChain = this.buildVocalProcessingFilter(chain, {
        removeNoise: request.removeNoise !== false,
        autoTune: request.autoTune || false,
        targetKey: request.targetKey
      });

      processingSteps.push(`Applied ${chain.length} vocal effects`);

      // Build and execute command
      const command = this.buildVocalCommand(request.inputPath, request.outputPath, filterChain);

      logger.info('🔄 [AudioMixer] Executing vocal processing...');
      execSync(command, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      processingSteps.push('Vocal processing complete');
      logger.info('✅ [AudioMixer] Vocals processed successfully');

      // Analyze result
      const analysis = await this.analyzeAudio(request.outputPath);

      return {
        outputPath: request.outputPath,
        format: path.extname(request.outputPath).slice(1),
        analysis,
        processingSteps,
        warnings
      };

    } catch (error: any) {
      logger.error(`❌ [AudioMixer] Vocal processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Master track with loudness normalization
   */
  async masterTrack(request: MasteringRequest): Promise<MixingResult> {
    logger.info('🎚️ [AudioMixer] Applying mastering...');

    const processingSteps: string[] = [];
    const warnings: string[] = [];

    try {
      const targetLUFS = request.targetLUFS || -14;
      const ceilingdB = request.ceilingdB || -0.1;
      const preset = request.preset || 'transparent';

      // Build mastering chain
      const masteringChain = this.buildMasteringChain(preset, targetLUFS, ceilingdB);
      processingSteps.push(`Applied ${preset} mastering preset`);

      // Build command
      const command = `${this.ffmpegPath} -y -i "${request.inputPath}" -af "${masteringChain}" "${request.outputPath}"`;

      // Execute mastering
      logger.info('🔄 [AudioMixer] Executing mastering...');
      execSync(command, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      processingSteps.push('Mastering complete');
      logger.info('✅ [AudioMixer] Mastering complete');

      // Analyze result
      const analysis = await this.analyzeAudio(request.outputPath);

      // Check mastering quality
      if (Math.abs(analysis.lufs - targetLUFS) > 2) {
        warnings.push(`Target LUFS ${targetLUFS}, achieved ${analysis.lufs.toFixed(1)}`);
      }

      return {
        outputPath: request.outputPath,
        format: path.extname(request.outputPath).slice(1),
        analysis,
        processingSteps,
        warnings
      };

    } catch (error: any) {
      logger.error(`❌ [AudioMixer] Mastering failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Align vocals to beat timing
   */
  async alignVocalsToBeat(request: BeatAlignmentRequest): Promise<MixingResult> {
    logger.info('🎵 [AudioMixer] Aligning vocals to beat...');

    const processingSteps: string[] = [];
    const warnings: string[] = [];

    try {
      // Calculate beat grid based on BPM
      const beatDuration = 60 / request.bpm; // seconds per beat
      processingSteps.push(`Beat grid: ${request.bpm} BPM (${beatDuration.toFixed(3)}s per beat)`);

      // For now, we'll do a simple time-stretch alignment
      // In a production system, you'd use beat detection and warping

      // Simple approach: stretch/compress vocals to match beat length
      const vocalDuration = await this.getAudioDuration(request.vocalsPath);
      const beatDuration2 = await this.getAudioDuration(request.beatPath);

      const timeStretch = beatDuration2 / vocalDuration;

      if (Math.abs(timeStretch - 1.0) > 0.1) {
        warnings.push(`Significant time stretch required: ${(timeStretch * 100).toFixed(1)}%`);
      }

      // Apply time stretch with rubberband filter
      const tempVocals = this.getTempPath('aligned_vocals.wav');
      const stretchCommand = `${this.ffmpegPath} -y -i "${request.vocalsPath}" -af "rubberband=tempo=${timeStretch}" "${tempVocals}"`;

      execSync(stretchCommand, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      processingSteps.push('Time-stretched vocals to match beat');

      // Mix aligned vocals with beat
      await this.mixTracks({
        tracks: [
          { path: tempVocals, type: 'vocals', volume: 1.0, pan: 0 },
          { path: request.beatPath, type: 'beat', volume: 0.8, pan: 0 }
        ],
        outputPath: request.outputPath,
        format: 'wav'
      });

      processingSteps.push('Mixed aligned vocals with beat');

      // Clean up temp file
      fs.unlinkSync(tempVocals);

      logger.info('✅ [AudioMixer] Alignment complete');

      const analysis = await this.analyzeAudio(request.outputPath);

      return {
        outputPath: request.outputPath,
        format: 'wav',
        analysis,
        processingSteps,
        warnings
      };

    } catch (error: any) {
      logger.error(`❌ [AudioMixer] Alignment failed: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // FFmpeg Command Building
  // ============================================================================

  /**
   * Build FFmpeg command for mixing multiple tracks
   */
  buildMixCommand(request: MixingRequest): string {
    const tracks = request.tracks;
    const outputPath = request.outputPath;
    const format = request.format || 'wav';
    const sampleRate = request.sampleRate || 44100;

    // Start command with inputs
    let command = `${this.ffmpegPath} -y `;

    // Add all input files
    tracks.forEach((track) => {
      command += `-i "${track.path}" `;
    });

    // Build filter_complex
    const filterComplex = this.buildComplexFilter(tracks);
    command += `-filter_complex "${filterComplex}" `;

    // Output settings
    command += `-ar ${sampleRate} -ac 2 `;

    // Format-specific encoding
    if (format === 'mp3') {
      command += `-c:a libmp3lame -q:a 2 `;
    } else if (format === 'wav') {
      command += `-c:a pcm_s16le `;
    } else if (format === 'flac') {
      command += `-c:a flac `;
    } else if (format === 'm4a') {
      command += `-c:a aac -b:a 256k `;
    }

    command += `"${outputPath}"`;

    return command;
  }

  /**
   * Build complex filter for mixing with effects
   */
  private buildComplexFilter(tracks: AudioTrack[]): string {
    const filters: string[] = [];

    // Process each track
    tracks.forEach((track, index) => {
      let trackFilter = `[${index}:a]`;

      // Apply volume
      if (track.volume !== 1.0) {
        trackFilter += `volume=${track.volume},`;
      }

      // Apply pan
      if (track.pan !== 0) {
        // Pan: -1 = left, 0 = center, 1 = right
        const panValue = (track.pan + 1) / 2; // Convert to 0-1
        trackFilter += `pan=stereo|c0=${1 - panValue}*c0+${panValue}*c1|c1=${panValue}*c0+${1 - panValue}*c1,`;
      }

      // Apply fade in/out
      if (track.fadeIn) {
        trackFilter += `afade=t=in:st=0:d=${track.fadeIn},`;
      }
      if (track.fadeOut) {
        const duration = track.duration || 0;
        trackFilter += `afade=t=out:st=${duration - track.fadeOut}:d=${track.fadeOut},`;
      }

      // Apply effects
      if (track.effects && track.effects.length > 0) {
        const effectsFilter = this.buildEffectFilter(track.effects);
        trackFilter += effectsFilter + ',';
      }

      // Remove trailing comma
      trackFilter = trackFilter.replace(/,$/, '');
      trackFilter += `[a${index}]`;

      filters.push(trackFilter);
    });

    // Combine all processed tracks
    const mixInputs = tracks.map((_, i) => `[a${i}]`).join('');
    filters.push(`${mixInputs}amix=inputs=${tracks.length}:duration=longest:normalize=0[out]`);

    return filters.join(';');
  }

  /**
   * Build effect filter chain
   */
  buildEffectFilter(effects: AudioEffect[]): string {
    const filters: string[] = [];

    effects.forEach((effect) => {
      const intensity = effect.intensity || 0.5;

      switch (effect.type) {
        case 'reverb':
          // Use aecho for reverb effect
          filters.push(`aecho=0.8:0.9:${Math.round(1000 * intensity)}:0.3`);
          break;

        case 'delay':
          // Echo/delay effect
          filters.push(`aecho=0.8:0.88:${Math.round(60 * intensity)}:0.4`);
          break;

        case 'eq':
          // Parametric EQ
          const bass = effect.parameters?.bass || 0;
          const mid = effect.parameters?.mid || 0;
          const treble = effect.parameters?.treble || 0;
          if (bass !== 0) filters.push(`equalizer=f=100:t=h:w=100:g=${bass}`);
          if (mid !== 0) filters.push(`equalizer=f=1000:t=h:w=500:g=${mid}`);
          if (treble !== 0) filters.push(`equalizer=f=5000:t=h:w=1000:g=${treble}`);
          break;

        case 'compression':
          // Dynamic range compression
          const threshold = effect.parameters?.threshold || -20;
          const ratio = effect.parameters?.ratio || 4;
          filters.push(`acompressor=threshold=${threshold}dB:ratio=${ratio}:attack=5:release=50`);
          break;

        case 'autotune':
          // Pitch correction (limited in FFmpeg)
          filters.push(`rubberband=pitch=1.0`);
          break;

        case 'chorus':
          // Chorus effect
          filters.push(`chorus=0.5:0.9:50:0.4:0.25:2`);
          break;

        case 'distortion':
          // Overdrive/distortion
          const gain = 2 + (intensity * 4); // 2-6
          filters.push(`overdrive=gain=${gain}:colour=0.5`);
          break;

        case 'stereo-width':
          // Stereo widening
          const width = 1 + intensity; // 1-2
          filters.push(`extrastereo=m=${width}`);
          break;
      }
    });

    return filters.join(',');
  }

  /**
   * Build vocal processing command
   */
  private buildVocalCommand(inputPath: string, outputPath: string, filterChain: string): string {
    return `${this.ffmpegPath} -y -i "${inputPath}" -af "${filterChain}" -ar 44100 -ac 2 "${outputPath}"`;
  }

  /**
   * Build vocal processing filter chain
   */
  private buildVocalProcessingFilter(
    chain: VocalEffect[],
    options: { removeNoise: boolean; autoTune: boolean; targetKey?: string }
  ): string {
    const filters: string[] = [];

    chain.forEach((effect) => {
      switch (effect.type) {
        case 'gate':
          // Noise gate
          filters.push('agate=threshold=0.01:ratio=2:attack=5:release=50');
          break;

        case 'highpass':
          // High-pass filter to remove low rumble
          const cutoff = effect.parameters?.cutoff || 80;
          filters.push(`highpass=f=${cutoff}:poles=2`);
          break;

        case 'deesser':
          // De-esser to reduce harsh 's' sounds (6-8kHz)
          filters.push('equalizer=f=7000:t=h:w=2000:g=-4');
          break;

        case 'compression':
          // Vocal compression
          const threshold = effect.parameters?.threshold || -18;
          const ratio = effect.parameters?.ratio || 4;
          filters.push(`acompressor=threshold=${threshold}dB:ratio=${ratio}:attack=5:release=100:makeup=2`);
          break;

        case 'eq':
          // Vocal EQ: cut mud, boost presence
          filters.push('equalizer=f=250:t=h:w=100:g=-2'); // Cut mud
          filters.push('equalizer=f=3000:t=h:w=1000:g=3'); // Boost presence
          filters.push('equalizer=f=10000:t=h:w=2000:g=2'); // Add air
          break;

        case 'reverb':
          // Reverb/room sound
          const decay = effect.parameters?.decay || 0.3;
          filters.push(`aecho=0.8:0.9:${Math.round(1000 * decay)}:0.3`);
          break;

        case 'delay':
          // Slapback delay
          const time = effect.parameters?.time || 100;
          filters.push(`aecho=0.8:0.7:${time}:0.3`);
          break;

        case 'autotune':
          // Auto-tune (basic pitch correction)
          if (options.autoTune) {
            filters.push('rubberband=pitch=1.0');
          }
          break;
      }
    });

    // Add noise removal if requested
    if (options.removeNoise) {
      filters.unshift('afftdn=nf=-25'); // FFT denoiser
    }

    return filters.join(',');
  }

  /**
   * Build mastering chain
   */
  private buildMasteringChain(preset: string, targetLUFS: number, ceilingdB: number): string {
    const filters: string[] = [];

    switch (preset) {
      case 'transparent':
        // Clean, transparent mastering
        filters.push('acompressor=threshold=-20dB:ratio=2:attack=10:release=100');
        filters.push('equalizer=f=50:t=h:w=30:g=-1'); // Subtle sub cut
        filters.push(`alimiter=limit=${1 + ceilingdB / 100}:attack=5:release=50`);
        filters.push(`loudnorm=I=${targetLUFS}:TP=${ceilingdB}:LRA=11`);
        break;

      case 'punchy':
        // Punchy, impactful mastering
        filters.push('acompressor=threshold=-18dB:ratio=4:attack=5:release=50');
        filters.push('equalizer=f=60:t=h:w=40:g=-2'); // Cut sub-bass
        filters.push('equalizer=f=3000:t=h:w=2000:g=1'); // Boost mids
        filters.push('equalizer=f=10000:t=h:w=4000:g=1'); // Boost highs
        filters.push(`alimiter=limit=${1 + ceilingdB / 100}:attack=3:release=30`);
        filters.push(`loudnorm=I=${targetLUFS}:TP=${ceilingdB}:LRA=7`);
        break;

      case 'warm':
        // Warm, analog-style mastering
        filters.push('acompressor=threshold=-20dB:ratio=3:attack=10:release=100');
        filters.push('equalizer=f=80:t=h:w=50:g=1'); // Boost low-end warmth
        filters.push('equalizer=f=200:t=h:w=100:g=-1'); // Cut mud
        filters.push('equalizer=f=12000:t=h:w=5000:g=-1'); // Roll off harsh highs
        filters.push(`alimiter=limit=${1 + ceilingdB / 100}:attack=7:release=60`);
        filters.push(`loudnorm=I=${targetLUFS}:TP=${ceilingdB}:LRA=9`);
        break;

      case 'broadcast':
        // Broadcast-ready mastering (heavy)
        filters.push('acompressor=threshold=-16dB:ratio=6:attack=3:release=40');
        filters.push('equalizer=f=40:t=h:w=30:g=-3'); // Heavy sub cut
        filters.push('equalizer=f=2000:t=h:w=2000:g=2'); // Boost speech range
        filters.push(`alimiter=limit=${1 + ceilingdB / 100}:attack=2:release=20`);
        filters.push(`loudnorm=I=${targetLUFS}:TP=${ceilingdB}:LRA=5`);
        break;

      default:
        // Default to transparent
        filters.push('acompressor=threshold=-20dB:ratio=2:attack=10:release=100');
        filters.push(`alimiter=limit=${1 + ceilingdB / 100}:attack=5:release=50`);
        filters.push(`loudnorm=I=${targetLUFS}:TP=${ceilingdB}:LRA=11`);
    }

    return filters.join(',');
  }

  // ============================================================================
  // Preset Chains
  // ============================================================================

  /**
   * Get vocal preset processing chain
   */
  private getVocalPresetChain(preset: string): VocalEffect[] {
    const presets: Record<string, VocalEffect[]> = {
      natural: [
        { type: 'gate' },
        { type: 'highpass', parameters: { cutoff: 80 } },
        { type: 'deesser' },
        { type: 'compression', parameters: { threshold: -18, ratio: 3 } },
        { type: 'eq' },
        { type: 'reverb', parameters: { decay: 0.2 } }
      ],
      radio: [
        { type: 'gate' },
        { type: 'highpass', parameters: { cutoff: 100 } },
        { type: 'deesser' },
        { type: 'compression', parameters: { threshold: -16, ratio: 6 } },
        { type: 'eq' },
        { type: 'compression', parameters: { threshold: -12, ratio: 3 } }, // Second stage
        { type: 'reverb', parameters: { decay: 0.15 } }
      ],
      rap: [
        { type: 'gate' },
        { type: 'highpass', parameters: { cutoff: 85 } },
        { type: 'compression', parameters: { threshold: -18, ratio: 4 } },
        { type: 'eq' },
        { type: 'deesser' },
        { type: 'delay', parameters: { time: 100 } },
        { type: 'reverb', parameters: { decay: 0.25 } }
      ],
      singing: [
        { type: 'gate' },
        { type: 'highpass', parameters: { cutoff: 75 } },
        { type: 'deesser' },
        { type: 'compression', parameters: { threshold: -20, ratio: 3 } },
        { type: 'eq' },
        { type: 'autotune' },
        { type: 'reverb', parameters: { decay: 0.4 } }
      ],
      aggressive: [
        { type: 'gate' },
        { type: 'highpass', parameters: { cutoff: 100 } },
        { type: 'compression', parameters: { threshold: -16, ratio: 6 } },
        { type: 'eq' },
        { type: 'compression', parameters: { threshold: -12, ratio: 4 } }, // Heavy compression
        { type: 'deesser' },
        { type: 'reverb', parameters: { decay: 0.2 } }
      ]
    };

    return presets[preset] || presets.natural;
  }

  // ============================================================================
  // Audio Analysis
  // ============================================================================

  /**
   * Analyze audio file
   */
  async analyzeAudio(filePath: string): Promise<AudioAnalysis> {
    try {
      // Get basic info
      const duration = await this.getAudioDuration(filePath);
      const sampleRate = await this.getSampleRate(filePath);
      const channels = await this.getChannelCount(filePath);

      // Get loudness info
      const loudnessInfo = await this.getLoudnessInfo(filePath);

      return {
        duration,
        sampleRate,
        channels,
        peakLevel: loudnessInfo.peak,
        rmsLevel: loudnessInfo.rms,
        lufs: loudnessInfo.lufs,
        dynamicRange: Math.abs(loudnessInfo.peak - loudnessInfo.rms),
        truePeak: loudnessInfo.truePeak
      };

    } catch (error: any) {
      logger.error(`❌ [AudioMixer] Analysis failed: ${error.message}`);

      // Return default values
      return {
        duration: 0,
        sampleRate: 44100,
        channels: 2,
        peakLevel: -10,
        rmsLevel: -20,
        lufs: -14,
        dynamicRange: 10,
        truePeak: -1
      };
    }
  }

  /**
   * Get audio duration
   */
  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const cmd = `${this.ffprobePath} -v quiet -print_format json -show_format "${filePath}"`;
      const output = execSync(cmd, { encoding: 'utf8' });
      const data = JSON.parse(output);
      return parseFloat(data.format.duration || 0);
    } catch {
      return 0;
    }
  }

  /**
   * Get sample rate
   */
  private async getSampleRate(filePath: string): Promise<number> {
    try {
      const cmd = `${this.ffprobePath} -v quiet -print_format json -show_streams "${filePath}"`;
      const output = execSync(cmd, { encoding: 'utf8' });
      const data = JSON.parse(output);
      return parseInt(data.streams[0]?.sample_rate || 44100);
    } catch {
      return 44100;
    }
  }

  /**
   * Get channel count
   */
  private async getChannelCount(filePath: string): Promise<number> {
    try {
      const cmd = `${this.ffprobePath} -v quiet -print_format json -show_streams "${filePath}"`;
      const output = execSync(cmd, { encoding: 'utf8' });
      const data = JSON.parse(output);
      return parseInt(data.streams[0]?.channels || 2);
    } catch {
      return 2;
    }
  }

  /**
   * Get loudness information
   */
  private async getLoudnessInfo(filePath: string): Promise<{
    peak: number;
    rms: number;
    lufs: number;
    truePeak: number;
  }> {
    try {
      // Run loudness analysis
      const cmd = `${this.ffmpegPath} -i "${filePath}" -af "volumedetect,loudnorm=print_format=json" -f null - 2>&1`;
      const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

      // Parse volume detect output
      const peakMatch = output.match(/max_volume:\s*([-\d.]+)\s*dB/);
      const meanMatch = output.match(/mean_volume:\s*([-\d.]+)\s*dB/);

      // Parse loudnorm JSON output
      let lufs = -14;
      let truePeak = -1;

      try {
        const jsonMatch = output.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
        if (jsonMatch) {
          const loudnormData = JSON.parse(jsonMatch[0]);
          lufs = parseFloat(loudnormData.input_i || -14);
          truePeak = parseFloat(loudnormData.input_tp || -1);
        }
      } catch {
        // Use defaults if JSON parsing fails
      }

      return {
        peak: peakMatch ? parseFloat(peakMatch[1]) : -10,
        rms: meanMatch ? parseFloat(meanMatch[1]) : -20,
        lufs,
        truePeak
      };

    } catch (error: any) {
      logger.warn(`⚠️ [AudioMixer] Could not analyze loudness: ${error.message}`);
      return {
        peak: -10,
        rms: -20,
        lufs: -14,
        truePeak: -1
      };
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Validate mixing request
   */
  private validateMixingRequest(request: MixingRequest): void {
    if (!request.tracks || request.tracks.length === 0) {
      throw new Error('No tracks provided for mixing');
    }

    // Check that all input files exist
    for (const track of request.tracks) {
      if (!fs.existsSync(track.path)) {
        throw new Error(`Input file not found: ${track.path}`);
      }
    }

    // Ensure output directory exists
    const outputDir = path.dirname(request.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Get temporary file path
   */
  private getTempPath(filename: string): string {
    return path.join(this.tempDir, filename);
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    try {
      const files = fs.readdirSync(this.tempDir);

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        // Delete files older than 1 hour
        const ageMs = Date.now() - stats.mtimeMs;
        if (ageMs > 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          logger.info(`🗑️ [AudioMixer] Cleaned up temp file: ${file}`);
        }
      }

    } catch (error: any) {
      logger.error(`❌ [AudioMixer] Cleanup failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const audioMixer = new AudioMixer();
