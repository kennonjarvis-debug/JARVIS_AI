/**
 * File Backup Service
 *
 * Handles incremental backups of user files and configuration files
 * Features:
 * - Incremental backups (only changed files)
 * - File deduplication
 * - Compression
 * - Metadata tracking
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

export interface FileBackupConfig {
  backupDir: string;
  sourceDirs: string[];
  excludePatterns: string[];
  compressionEnabled: boolean;
}

export interface FileMetadata {
  path: string;
  size: number;
  hash: string;
  modified: Date;
  backed_up: Date;
}

export interface BackupManifest {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental';
  files: FileMetadata[];
  total_size: number;
  total_files: number;
}

export class FileBackupService {
  private config: FileBackupConfig;
  private manifestPath: string;

  constructor(config?: Partial<FileBackupConfig>) {
    this.config = {
      backupDir: process.env.BACKUP_DIR || '/var/backups/jarvis/files',
      sourceDirs: [
        process.env.MUSIC_UPLOAD_DIR || '/tmp/jarvis-music-uploads',
        process.env.MUSIC_OUTPUT_DIR || '/tmp/jarvis-generated-music',
        process.env.VOCAL_ISOLATION_TEMP_DIR || '/tmp/jarvis-vocal-isolation',
        path.join(process.cwd(), 'config'),
        path.join(process.cwd(), '.env'),
      ],
      excludePatterns: [
        '*.tmp',
        '*.temp',
        '.DS_Store',
        'Thumbs.db',
        'node_modules',
        '.git',
      ],
      compressionEnabled: true,
      ...config,
    };

    this.manifestPath = path.join(this.config.backupDir, 'manifest.json');
  }

  /**
   * Initialize file backup service
   */
  async initialize(): Promise<void> {
    console.log('[FileBackupService] Initializing...');

    // Create backup directory
    await fs.mkdir(this.config.backupDir, { recursive: true });

    // Create manifest if it doesn't exist
    try {
      await fs.access(this.manifestPath);
    } catch {
      await this.saveManifest({
        id: 'initial',
        timestamp: new Date(),
        type: 'full',
        files: [],
        total_size: 0,
        total_files: 0,
      });
    }

    console.log('[FileBackupService] Initialized');
  }

  /**
   * Create full backup of all files
   */
  async createFullBackup(): Promise<BackupManifest> {
    console.log('[FileBackupService] Creating full backup...');

    const backupId = this.generateBackupId();
    const backupPath = path.join(this.config.backupDir, backupId);

    await fs.mkdir(backupPath, { recursive: true });

    const files: FileMetadata[] = [];
    let totalSize = 0;

    for (const sourceDir of this.config.sourceDirs) {
      try {
        await fs.access(sourceDir);
        const dirFiles = await this.backupDirectory(sourceDir, backupPath);
        files.push(...dirFiles);
        totalSize += dirFiles.reduce((sum, f) => sum + f.size, 0);
      } catch (error) {
        console.warn(`[FileBackupService] Source directory not found: ${sourceDir}`);
      }
    }

    const manifest: BackupManifest = {
      id: backupId,
      timestamp: new Date(),
      type: 'full',
      files,
      total_size: totalSize,
      total_files: files.length,
    };

    await this.saveManifest(manifest);

    console.log(`[FileBackupService] Full backup complete: ${backupId}`);
    console.log(`  Files: ${files.length}`);
    console.log(`  Size: ${this.formatBytes(totalSize)}`);

    return manifest;
  }

  /**
   * Create incremental backup (only changed files)
   */
  async createIncrementalBackup(): Promise<BackupManifest> {
    console.log('[FileBackupService] Creating incremental backup...');

    const lastManifest = await this.loadManifest();
    const backupId = this.generateBackupId();
    const backupPath = path.join(this.config.backupDir, backupId);

    await fs.mkdir(backupPath, { recursive: true });

    const files: FileMetadata[] = [];
    let totalSize = 0;

    for (const sourceDir of this.config.sourceDirs) {
      try {
        await fs.access(sourceDir);
        const dirFiles = await this.backupDirectoryIncremental(
          sourceDir,
          backupPath,
          lastManifest
        );
        files.push(...dirFiles);
        totalSize += dirFiles.reduce((sum, f) => sum + f.size, 0);
      } catch (error) {
        console.warn(`[FileBackupService] Source directory not found: ${sourceDir}`);
      }
    }

    const manifest: BackupManifest = {
      id: backupId,
      timestamp: new Date(),
      type: 'incremental',
      files,
      total_size: totalSize,
      total_files: files.length,
    };

    await this.saveManifest(manifest);

    console.log(`[FileBackupService] Incremental backup complete: ${backupId}`);
    console.log(`  Changed files: ${files.length}`);
    console.log(`  Size: ${this.formatBytes(totalSize)}`);

    return manifest;
  }

  /**
   * Backup entire directory
   */
  private async backupDirectory(
    sourceDir: string,
    backupPath: string
  ): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    const processDir = async (dir: string, relativePath: string = '') => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const sourcePath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        // Check exclude patterns
        if (this.shouldExclude(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await processDir(sourcePath, relPath);
        } else if (entry.isFile()) {
          const metadata = await this.backupFile(sourcePath, backupPath, relPath);
          if (metadata) {
            files.push(metadata);
          }
        }
      }
    };

    await processDir(sourceDir);
    return files;
  }

  /**
   * Backup directory incrementally (only changed files)
   */
  private async backupDirectoryIncremental(
    sourceDir: string,
    backupPath: string,
    lastManifest: BackupManifest
  ): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    // Create hash map of previous files
    const previousFiles = new Map<string, FileMetadata>();
    for (const file of lastManifest.files) {
      previousFiles.set(file.path, file);
    }

    const processDir = async (dir: string, relativePath: string = '') => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const sourcePath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        // Check exclude patterns
        if (this.shouldExclude(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await processDir(sourcePath, relPath);
        } else if (entry.isFile()) {
          // Check if file changed
          const stats = await fs.stat(sourcePath);
          const previousFile = previousFiles.get(relPath);

          let shouldBackup = true;

          if (previousFile) {
            // Check if file modified
            if (stats.mtime <= new Date(previousFile.modified)) {
              shouldBackup = false;
            } else {
              // Verify hash
              const currentHash = await this.calculateFileHash(sourcePath);
              if (currentHash === previousFile.hash) {
                shouldBackup = false;
              }
            }
          }

          if (shouldBackup) {
            const metadata = await this.backupFile(sourcePath, backupPath, relPath);
            if (metadata) {
              files.push(metadata);
            }
          }
        }
      }
    };

    await processDir(sourceDir);
    return files;
  }

  /**
   * Backup individual file
   */
  private async backupFile(
    sourcePath: string,
    backupPath: string,
    relativePath: string
  ): Promise<FileMetadata | null> {
    try {
      const stats = await fs.stat(sourcePath);
      const hash = await this.calculateFileHash(sourcePath);

      // Create backup file path
      const destPath = path.join(backupPath, relativePath);
      await fs.mkdir(path.dirname(destPath), { recursive: true });

      // Copy file
      if (this.config.compressionEnabled && stats.size > 1024) {
        // Compress files larger than 1KB
        const compressedPath = `${destPath}.gz`;
        await this.compressFile(sourcePath, compressedPath);
      } else {
        await fs.copyFile(sourcePath, destPath);
      }

      return {
        path: relativePath,
        size: stats.size,
        hash,
        modified: stats.mtime,
        backed_up: new Date(),
      };
    } catch (error) {
      console.error(`[FileBackupService] Error backing up file: ${sourcePath}`, error);
      return null;
    }
  }

  /**
   * Calculate file hash (SHA256)
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Compress file using gzip
   */
  private async compressFile(sourcePath: string, destPath: string): Promise<void> {
    const source = createReadStream(sourcePath);
    const destination = createWriteStream(destPath);
    const gzip = createGzip({ level: 9 });

    await pipeline(source, gzip, destination);
  }

  /**
   * Check if file should be excluded
   */
  private shouldExclude(filename: string): boolean {
    for (const pattern of this.config.excludePatterns) {
      if (this.matchPattern(filename, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Simple pattern matching
   */
  private matchPattern(filename: string, pattern: string): boolean {
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      return filename.endsWith(ext);
    }
    return filename === pattern;
  }

  /**
   * Save manifest
   */
  private async saveManifest(manifest: BackupManifest): Promise<void> {
    const manifestPath = path.join(
      this.config.backupDir,
      manifest.id,
      'manifest.json'
    );
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // Also save as latest
    await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Load latest manifest
   */
  private async loadManifest(): Promise<BackupManifest> {
    const content = await fs.readFile(this.manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<BackupManifest[]> {
    const backups: BackupManifest[] = [];
    const entries = await fs.readdir(this.config.backupDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const manifestPath = path.join(
            this.config.backupDir,
            entry.name,
            'manifest.json'
          );
          const content = await fs.readFile(manifestPath, 'utf-8');
          backups.push(JSON.parse(content));
        } catch {
          // Skip if no manifest
        }
      }
    }

    return backups.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Generate backup ID
   */
  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = crypto.randomBytes(4).toString('hex');
    return `files_${timestamp}_${random}`;
  }

  /**
   * Format bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Get backup statistics
   */
  async getStatistics(): Promise<{
    total_backups: number;
    total_size: number;
    total_files: number;
    oldest_backup: Date | null;
    newest_backup: Date | null;
  }> {
    const backups = await this.listBackups();

    const totalSize = backups.reduce((sum, b) => sum + b.total_size, 0);
    const totalFiles = backups.reduce((sum, b) => sum + b.total_files, 0);

    return {
      total_backups: backups.length,
      total_size: totalSize,
      total_files: totalFiles,
      oldest_backup: backups.length > 0 ? new Date(backups[backups.length - 1].timestamp) : null,
      newest_backup: backups.length > 0 ? new Date(backups[0].timestamp) : null,
    };
  }
}
