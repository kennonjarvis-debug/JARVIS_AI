/**
 * Voice Memos Integration
 * Access voice memos from macOS Voice Memos app
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { BaseIntegration, type IntegrationConfig } from '../base/index.js';

export interface VoiceMemo {
  id: string;
  filename: string;
  path: string;
  size: number;
  created: Date;
  duration?: number;
}

/**
 * Voice Memos integration for accessing recordings
 */
export class VoiceMemosIntegration extends BaseIntegration {
  private voiceMemosPath: string;

  constructor(config: IntegrationConfig) {
    super(config);

    // Voice Memos are stored in ~/Library/Application Support/com.apple.voicememos/Recordings
    this.voiceMemosPath = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'com.apple.voicememos',
      'Recordings'
    );
  }

  get name(): string {
    return 'voice-memos';
  }

  get displayName(): string {
    return 'Voice Memos';
  }

  /**
   * Initialize Voice Memos integration
   */
  async initialize(): Promise<void> {
    try {
      const isAccessible = await this.testConnection();

      if (!isAccessible) {
        throw new Error('Voice Memos directory not accessible');
      }

      this.isInitialized = true;
      this.logger.info('Voice Memos integration initialized');

      await this.updateStatus('connected');
    } catch (error) {
      this.logger.error('Failed to initialize Voice Memos integration', error);
      await this.updateStatus('error', error instanceof Error ? error.message : 'Initialization failed');
      throw error;
    }
  }

  /**
   * Test Voice Memos connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Check if voice memos directory exists
      await fs.access(this.voiceMemosPath);
      return true;
    } catch (error) {
      this.logger.error('Voice Memos directory not accessible', error);
      return false;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.isInitialized = false;
    await this.updateStatus('disconnected');
    this.logger.info('Voice Memos integration disconnected');
  }

  /**
   * Get all voice memos
   */
  async getAllMemos(): Promise<VoiceMemo[]> {
    if (!this.isInitialized) {
      throw new Error('Voice Memos integration not initialized');
    }

    try {
      const files = await fs.readdir(this.voiceMemosPath);
      const m4aFiles = files.filter(f => f.endsWith('.m4a'));

      const memos: VoiceMemo[] = [];

      for (const file of m4aFiles) {
        const fullPath = path.join(this.voiceMemosPath, file);
        const stats = await fs.stat(fullPath);

        memos.push({
          id: file.replace('.m4a', ''),
          filename: file,
          path: fullPath,
          size: stats.size,
          created: stats.birthtime,
        });
      }

      // Sort by creation date (newest first)
      return memos.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      this.logger.error('Failed to get voice memos', error);
      throw error;
    }
  }

  /**
   * Get voice memo file path
   */
  async getMemoPath(memoId: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Voice Memos integration not initialized');
    }

    const memoPath = path.join(this.voiceMemosPath, `${memoId}.m4a`);

    try {
      await fs.access(memoPath);
      return memoPath;
    } catch (error) {
      throw new Error(`Voice memo not found: ${memoId}`);
    }
  }

  /**
   * Get recent voice memos
   */
  async getRecentMemos(limit: number = 10): Promise<VoiceMemo[]> {
    const allMemos = await this.getAllMemos();
    return allMemos.slice(0, limit);
  }
}
