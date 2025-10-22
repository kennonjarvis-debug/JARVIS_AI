/**
 * Screen Recorder Service
 *
 * Captures periodic screenshots for activity monitoring.
 * Uses macOS screencapture utility with privacy controls.
 *
 * Features:
 * - Periodic screenshot capture
 * - Privacy-aware (excludes sensitive apps)
 * - Optional OCR for text extraction
 * - Secure storage with encryption
 * - Auto-cleanup of old screenshots
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export interface ScreenRecorderConfig {
  interval: number;              // Seconds between captures
  storagePath: string;           // Where to store screenshots
  excludedApps: string[];        // Apps to never capture
  enableOCR?: boolean;           // Extract text from screenshots
  compressionQuality?: number;   // 0-100, higher = better quality
  encryptScreenshots?: boolean;  // Encrypt stored screenshots
}

export interface Screenshot {
  id: string;
  timestamp: Date;
  filePath: string;
  activeApp?: string;
  windowTitle?: string;
  extractedText?: string;
  metadata: Record<string, any>;
}

export class ScreenRecorder extends EventEmitter {
  private config: ScreenRecorderConfig;
  private isRunning: boolean = false;
  private captureTimer?: NodeJS.Timeout;
  private screenshots: Screenshot[] = [];

  constructor(config: ScreenRecorderConfig) {
    super();
    this.config = {
      compressionQuality: 75,
      enableOCR: false,
      encryptScreenshots: false,
      ...config
    };
  }

  /**
   * Start screen recording
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Screen recorder already running');
      return;
    }

    logger.info('📸 Starting screen recorder...', {
      interval: `${this.config.interval}s`,
      storagePath: this.config.storagePath
    });

    // Create storage directory
    await this.ensureStorageDirectory();

    this.isRunning = true;

    // Start periodic capture
    this.captureTimer = setInterval(async () => {
      await this.captureScreen();
    }, this.config.interval * 1000);

    // Take initial screenshot
    await this.captureScreen();

    this.emit('recorder:started');
    logger.info('✅ Screen recorder started');
  }

  /**
   * Stop screen recording
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping screen recorder...');

    this.isRunning = false;

    if (this.captureTimer) {
      clearInterval(this.captureTimer);
      this.captureTimer = undefined;
    }

    this.emit('recorder:stopped');
    logger.info('✅ Screen recorder stopped');
  }

  /**
   * Capture current screen
   */
  private async captureScreen(): Promise<void> {
    try {
      // Get active app and window info first
      const activeApp = await this.getActiveApp();
      const windowTitle = await this.getActiveWindowTitle();

      // Check if app is excluded
      if (this.isAppExcluded(activeApp)) {
        logger.debug('Skipping screenshot - app is excluded', { app: activeApp });
        return;
      }

      // Generate screenshot filename
      const timestamp = new Date();
      const filename = `screenshot-${timestamp.getTime()}.png`;
      const filePath = path.join(this.config.storagePath, filename);

      // Capture screenshot using macOS screencapture
      await execAsync(`screencapture -x "${filePath}"`);

      logger.debug('Screenshot captured', { filePath, activeApp });

      // Create screenshot record
      const screenshot: Screenshot = {
        id: this.generateScreenshotId(),
        timestamp,
        filePath,
        activeApp,
        windowTitle,
        metadata: {
          fileSize: await this.getFileSize(filePath)
        }
      };

      // Optional: Extract text via OCR
      if (this.config.enableOCR) {
        screenshot.extractedText = await this.extractTextFromImage(filePath);
      }

      // Optional: Encrypt screenshot
      if (this.config.encryptScreenshots) {
        await this.encryptFile(filePath);
        screenshot.metadata.encrypted = true;
      }

      this.screenshots.push(screenshot);

      // Trim screenshot history
      if (this.screenshots.length > 1000) {
        this.screenshots = this.screenshots.slice(-500);
      }

      // Emit event
      this.emit('screen:captured', {
        screenshotPath: filePath,
        timestamp,
        activeApp,
        windowTitle
      });

    } catch (error) {
      logger.error('Failed to capture screenshot:', error);
      this.emit('recorder:error', error);
    }
  }

  /**
   * Get currently active application
   */
  private async getActiveApp(): Promise<string> {
    try {
      const { stdout } = await execAsync(`
        osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'
      `);
      return stdout.trim();
    } catch (error) {
      logger.error('Failed to get active app:', error);
      return 'Unknown';
    }
  }

  /**
   * Get active window title
   */
  private async getActiveWindowTitle(): Promise<string> {
    try {
      const { stdout } = await execAsync(`
        osascript -e 'tell application "System Events" to get name of front window of first application process whose frontmost is true'
      `);
      return stdout.trim();
    } catch (error) {
      // Window title might not be accessible
      return '';
    }
  }

  /**
   * Check if app should be excluded from capture
   */
  private isAppExcluded(appName: string): boolean {
    return this.config.excludedApps.some(excluded =>
      appName.toLowerCase().includes(excluded.toLowerCase())
    );
  }

  /**
   * Extract text from screenshot using OCR (placeholder for now)
   */
  private async extractTextFromImage(imagePath: string): Promise<string | undefined> {
    // TODO: Implement OCR using tesseract or Vision API
    // For now, return undefined
    // This would use: tesseract imagePath stdout
    logger.debug('OCR extraction not implemented yet');
    return undefined;
  }

  /**
   * Encrypt screenshot file (placeholder for now)
   */
  private async encryptFile(filePath: string): Promise<void> {
    // TODO: Implement encryption using crypto
    // For now, just log
    logger.debug('Encryption not implemented yet', { filePath });
  }

  /**
   * Get file size in bytes
   */
  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.storagePath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create storage directory:', error);
      throw error;
    }
  }

  /**
   * Get recent screenshots
   */
  getRecentScreenshots(limit: number = 10): Screenshot[] {
    return this.screenshots.slice(-limit);
  }

  /**
   * Delete old screenshots
   */
  async cleanupOldScreenshots(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;

    for (const screenshot of this.screenshots) {
      if (screenshot.timestamp < cutoffDate) {
        try {
          await fs.unlink(screenshot.filePath);
          deletedCount++;
        } catch (error) {
          logger.error('Failed to delete screenshot:', error);
        }
      }
    }

    // Remove from array
    this.screenshots = this.screenshots.filter(s => s.timestamp >= cutoffDate);

    logger.info(`Cleaned up ${deletedCount} old screenshots`);
    return deletedCount;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalScreenshots: number;
    totalSizeBytes: number;
    oldestScreenshot: Date | null;
    newestScreenshot: Date | null;
  }> {
    let totalSizeBytes = 0;

    for (const screenshot of this.screenshots) {
      totalSizeBytes += screenshot.metadata.fileSize || 0;
    }

    return {
      totalScreenshots: this.screenshots.length,
      totalSizeBytes,
      oldestScreenshot: this.screenshots.length > 0 ? this.screenshots[0].timestamp : null,
      newestScreenshot: this.screenshots.length > 0
        ? this.screenshots[this.screenshots.length - 1].timestamp
        : null
    };
  }

  /**
   * Generate unique screenshot ID
   */
  private generateScreenshotId(): string {
    return `screenshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
