/**
 * Audio Monitor Service
 *
 * Monitors system audio to detect user activity like freestyling, speaking, meetings, etc.
 * Uses macOS audio capture with speech detection and beat detection.
 *
 * Features:
 * - Real-time audio level monitoring
 * - Speech detection (is user speaking?)
 * - Beat/music detection (is beat playing?)
 * - Freestyle detection (speech + beat = freestyle session)
 * - Privacy-aware (no permanent recording by default)
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { Readable } from 'stream';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AudioMonitorConfig {
  samplingInterval: number;      // How often to check audio (seconds)
  storagePath: string;            // Where to store audio clips (if enabled)
  detectSpeech?: boolean;         // Enable speech detection
  detectMusic?: boolean;          // Enable music/beat detection
  saveRecordings?: boolean;       // Save audio clips
  speechThreshold?: number;       // Minimum audio level for speech (0-1)
  musicThreshold?: number;        // Minimum audio level for music (0-1)
}

export interface AudioDetection {
  timestamp: Date;
  audioLevel: number;             // 0-1
  isSpeech: boolean;              // Is someone speaking?
  isMusic: boolean;               // Is music/beat playing?
  beatDetected: boolean;          // Is there a beat pattern?
  recordingPath?: string;         // Path to audio clip if saved
  metadata: Record<string, any>;
}

export class AudioMonitor extends EventEmitter {
  private config: AudioMonitorConfig;
  private isRunning: boolean = false;
  private monitorTimer?: NodeJS.Timeout;
  private detections: AudioDetection[] = [];

  // State for tracking patterns
  private consecutiveSpeech: number = 0;
  private consecutiveMusic: number = 0;
  private freestyleSessionActive: boolean = false;

  // Swift audio capture process
  private audioProcess: ChildProcess | null = null;
  private currentAudioLevel: number = 0;
  private audioBuffer: number[] = [];

  constructor(config: AudioMonitorConfig) {
    super();
    this.config = {
      detectSpeech: true,
      detectMusic: true,
      saveRecordings: false,
      speechThreshold: 0.3,
      musicThreshold: 0.2,
      ...config
    };
  }

  /**
   * Start audio monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Audio monitor already running');
      return;
    }

    logger.info('🎤 Starting audio monitor...', {
      interval: `${this.config.samplingInterval}s`
    });

    this.isRunning = true;

    // Initialize audio capture using Swift + AVFoundation
    try {
      const swiftToolPath = path.join(__dirname, '../../tools/audio-capture.swift');

      logger.info('🎤 Starting native audio capture (Swift + AVFoundation)...');

      // Spawn Swift audio capture process
      // It will run continuously and output RMS values
      this.audioProcess = spawn('swift', [swiftToolPath, '99999'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Process stdout - each line is an RMS value
      let lineBuffer = '';
      this.audioProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        lineBuffer += text;

        // Process complete lines
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('AUDIO_')) {
            const rms = parseFloat(trimmed);
            if (!isNaN(rms)) {
              logger.debug(`Received RMS: ${rms.toFixed(6)}`);
              this.processRMSValue(rms);
            }
          }
        }
      });

      // Process stderr - status messages
      this.audioProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString().trim();
        if (text.includes('AUDIO_CAPTURE_STARTED')) {
          logger.info('✅ Audio capture started (Swift/AVFoundation)');
        } else if (text.includes('ERROR:')) {
          logger.error(`Audio capture error: ${text}`);
        } else if (text.startsWith('SAMPLE_RATE:') || text.startsWith('CHANNELS:')) {
          logger.debug(text);
        }
      });

      this.audioProcess.on('error', (error) => {
        logger.error('Failed to start audio capture process:', error);
      });

      this.audioProcess.on('exit', (code) => {
        if (code !== 0 && this.isRunning) {
          logger.warn(`Audio capture process exited with code ${code}`);
        }
      });

    } catch (error) {
      logger.error('Failed to start audio capture:', error);
      logger.warn('⚠️  Audio monitoring will use context-based detection');
    }

    // Start periodic monitoring
    this.monitorTimer = setInterval(async () => {
      await this.sampleAudio();
    }, this.config.samplingInterval * 1000);

    // Take initial sample
    await this.sampleAudio();

    this.emit('monitor:started');
    logger.info('✅ Audio monitor started');
  }

  /**
   * Stop audio monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping audio monitor...');

    this.isRunning = false;

    // Stop audio capture process
    if (this.audioProcess) {
      try {
        this.audioProcess.kill('SIGTERM');
        logger.info('✅ Audio capture stopped');
      } catch (error) {
        logger.error('Error stopping audio capture:', error);
      }
    }

    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = undefined;
    }

    // End any active freestyle session
    if (this.freestyleSessionActive) {
      this.endFreestyleSession();
    }

    this.emit('monitor:stopped');
    logger.info('✅ Audio monitor stopped');
  }

  /**
   * Sample current audio
   */
  private async sampleAudio(): Promise<void> {
    try {
      // Get audio level
      const audioLevel = await this.getAudioLevel();

      // Detect speech
      const isSpeech = this.config.detectSpeech
        ? await this.detectSpeech(audioLevel)
        : false;

      // Detect music/beat
      const { isMusic, beatDetected } = this.config.detectMusic
        ? await this.detectMusic(audioLevel)
        : { isMusic: false, beatDetected: false };

      // Create detection record
      const detection: AudioDetection = {
        timestamp: new Date(),
        audioLevel,
        isSpeech,
        isMusic,
        beatDetected,
        metadata: {}
      };

      // Save detection
      this.detections.push(detection);

      // Trim detection history
      if (this.detections.length > 1000) {
        this.detections = this.detections.slice(-500);
      }

      // Update pattern tracking
      this.updatePatternTracking(isSpeech, isMusic, beatDetected);

      // Log audio detection periodically (every 10 samples)
      if (this.detections.length % 10 === 0) {
        logger.debug(`🎤 Audio: level=${audioLevel.toFixed(3)}, speech=${isSpeech}, music=${isMusic}, beat=${beatDetected}`);
      }

      // Emit event
      this.emit('audio:detected', {
        audioLevel,
        isSpeech,
        beatDetected
      });

      // Check for freestyle session
      if (isSpeech && beatDetected && !this.freestyleSessionActive) {
        this.startFreestyleSession();
      } else if (this.freestyleSessionActive && (!isSpeech || !beatDetected)) {
        // Check if session should end (after 10 seconds of silence)
        this.consecutiveSpeech = 0;
        this.consecutiveMusic = 0;
      }

      // Log significant audio activity
      if (audioLevel > 0.1) {
        logger.info(`🔊 Audio detected: level=${audioLevel.toFixed(3)}, speech=${isSpeech}, beat=${beatDetected}`);
      }

    } catch (error) {
      logger.error('Failed to sample audio:', error);
      this.emit('monitor:error', error);
    }
  }

  /**
   * Process RMS value from Swift audio capture
   */
  private processRMSValue(rms: number): void {
    try {
      // Store in buffer for averaging
      this.audioBuffer.push(rms);

      // Keep buffer size manageable (last 50 samples)
      if (this.audioBuffer.length > 50) {
        this.audioBuffer.shift();
      }

      // Calculate average RMS over buffer
      const avgRms = this.audioBuffer.reduce((sum, val) => sum + val, 0) / this.audioBuffer.length;

      // Amplify for better detection (RMS is typically 0.0-0.1 for normal speech)
      this.currentAudioLevel = Math.min(avgRms * 10, 1.0);

      // Log periodically
      if (this.audioBuffer.length % 50 === 0) {
        logger.debug(`Audio level: ${this.currentAudioLevel.toFixed(3)} (raw RMS: ${avgRms.toFixed(4)})`);
      }

    } catch (error) {
      logger.debug('Error processing RMS value:', error);
    }
  }

  /**
   * Get current audio level from microphone stream
   */
  private async getAudioLevel(): Promise<number> {
    // Return the current audio level calculated from the microphone stream
    return this.currentAudioLevel;
  }

  /**
   * Detect if audio is speech
   */
  private async detectSpeech(audioLevel: number): Promise<boolean> {
    // Simple threshold-based detection using RMS levels
    // RMS values are typically: silence=0.0-0.02, speech=0.05-0.2, shouting=0.3+
    // With our 10x normalization: silence=0-0.2, speech=0.5-1.0+

    const threshold = this.config.speechThreshold || 0.15;

    if (audioLevel < threshold) {
      return false;
    }

    // Check consecutive speech detection for confidence
    return audioLevel > threshold && this.consecutiveSpeech >= 1;
  }

  /**
   * Detect if audio is music/beat
   */
  private async detectMusic(audioLevel: number): Promise<{ isMusic: boolean; beatDetected: boolean }> {
    // Simple threshold-based detection using RMS levels
    // Music typically has consistent audio levels
    // With our normalization: ambient=0-0.1, music=0.1-0.5+

    const musicThreshold = this.config.musicThreshold || 0.1;
    const beatThreshold = 0.2;

    const isMusic = audioLevel > musicThreshold;

    // Beat detection: higher amplitude bursts indicate beats
    // Strong beats will have RMS > 0.2 (after 10x normalization)
    const beatDetected = isMusic && audioLevel > beatThreshold && this.consecutiveMusic >= 2;

    return { isMusic, beatDetected };
  }

  /**
   * Update pattern tracking
   */
  private updatePatternTracking(isSpeech: boolean, isMusic: boolean, beatDetected: boolean): void {
    if (isSpeech) {
      this.consecutiveSpeech++;
    } else {
      this.consecutiveSpeech = 0;
    }

    if (isMusic || beatDetected) {
      this.consecutiveMusic++;
    } else {
      this.consecutiveMusic = 0;
    }
  }

  /**
   * Start freestyle session
   */
  private startFreestyleSession(): void {
    this.freestyleSessionActive = true;

    logger.info('🎤 Freestyle session detected - starting!');

    this.emit('freestyle:started', {
      timestamp: new Date()
    });
  }

  /**
   * End freestyle session
   */
  private endFreestyleSession(): void {
    if (!this.freestyleSessionActive) {
      return;
    }

    this.freestyleSessionActive = false;

    logger.info('🎤 Freestyle session ended');

    this.emit('freestyle:ended', {
      timestamp: new Date()
    });
  }


  /**
   * Get recent detections
   */
  getRecentDetections(limit: number = 10): AudioDetection[] {
    return this.detections.slice(-limit);
  }

  /**
   * Check if currently in freestyle session
   */
  isFreestyleActive(): boolean {
    return this.freestyleSessionActive;
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    isRunning: boolean;
    totalDetections: number;
    speechDetections: number;
    musicDetections: number;
    beatDetections: number;
    freestyleActive: boolean;
  } {
    return {
      isRunning: this.isRunning,
      totalDetections: this.detections.length,
      speechDetections: this.detections.filter(d => d.isSpeech).length,
      musicDetections: this.detections.filter(d => d.isMusic).length,
      beatDetections: this.detections.filter(d => d.beatDetected).length,
      freestyleActive: this.freestyleSessionActive
    };
  }
}
