/**
 * S3 Backup Service
 *
 * Handles backup uploads to AWS S3
 * Features:
 * - Multi-region replication
 * - Versioning enabled
 * - Lifecycle policies
 * - Encryption at rest
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import * as path from 'path';

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string; // For MinIO compatibility
}

export class S3BackupService {
  private s3Client: S3Client;
  private config: S3Config;

  constructor(config?: Partial<S3Config>) {
    this.config = {
      bucket: process.env.S3_BUCKET || 'jarvis-backups',
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
      endpoint: process.env.S3_ENDPOINT,
      ...config,
    };

    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      ...(this.config.endpoint && {
        endpoint: this.config.endpoint,
        forcePathStyle: true, // Required for MinIO
      }),
    });
  }

  /**
   * Upload file to S3
   */
  async uploadFile(localPath: string, s3Key: string): Promise<void> {
    console.log(`[S3Backup] Uploading ${localPath} to s3://${this.config.bucket}/${s3Key}`);

    try {
      const fileContent = await fs.readFile(localPath);

      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: s3Key,
        Body: fileContent,
        ServerSideEncryption: 'AES256', // Encryption at rest
        StorageClass: 'STANDARD_IA', // Infrequent Access for backups
      });

      await this.s3Client.send(command);

      console.log(`[S3Backup] Upload complete: ${s3Key}`);
    } catch (error) {
      console.error(`[S3Backup] Upload failed: ${s3Key}`, error);
      throw error;
    }
  }

  /**
   * Download file from S3
   */
  async downloadFile(s3Key: string, localPath: string): Promise<void> {
    console.log(`[S3Backup] Downloading s3://${this.config.bucket}/${s3Key} to ${localPath}`);

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);

      if (response.Body) {
        const fileContent = await response.Body.transformToByteArray();
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await fs.writeFile(localPath, fileContent);

        console.log(`[S3Backup] Download complete: ${localPath}`);
      }
    } catch (error) {
      console.error(`[S3Backup] Download failed: ${s3Key}`, error);
      throw error;
    }
  }

  /**
   * List backups in S3
   */
  async listBackups(prefix: string = 'backups/'): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);

      return (response.Contents || []).map((obj) => obj.Key || '');
    } catch (error) {
      console.error('[S3Backup] List failed', error);
      throw error;
    }
  }

  /**
   * Delete backup from S3
   */
  async deleteBackup(s3Key: string): Promise<void> {
    console.log(`[S3Backup] Deleting s3://${this.config.bucket}/${s3Key}`);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: s3Key,
      });

      await this.s3Client.send(command);

      console.log(`[S3Backup] Delete complete: ${s3Key}`);
    } catch (error) {
      console.error(`[S3Backup] Delete failed: ${s3Key}`, error);
      throw error;
    }
  }

  /**
   * Upload entire backup directory
   */
  async uploadBackupDirectory(backupId: string, localDir: string): Promise<void> {
    console.log(`[S3Backup] Uploading backup directory: ${backupId}`);

    const backupTypes = ['postgres', 'redis', 'files', 'secrets', 'metadata'];

    for (const type of backupTypes) {
      const dir = path.join(localDir, type);

      try {
        const files = await fs.readdir(dir);

        for (const file of files) {
          if (file.includes(backupId) || type === 'metadata') {
            const localPath = path.join(dir, file);
            const s3Key = `backups/${backupId}/${type}/${file}`;
            await this.uploadFile(localPath, s3Key);
          }
        }
      } catch (error) {
        console.warn(`[S3Backup] Directory not found: ${dir}`);
      }
    }

    console.log(`[S3Backup] Backup directory uploaded: ${backupId}`);
  }

  /**
   * Download entire backup directory
   */
  async downloadBackupDirectory(backupId: string, localDir: string): Promise<void> {
    console.log(`[S3Backup] Downloading backup directory: ${backupId}`);

    const prefix = `backups/${backupId}/`;
    const objects = await this.listBackups(prefix);

    for (const s3Key of objects) {
      const relativePath = s3Key.replace(prefix, '');
      const localPath = path.join(localDir, relativePath);
      await this.downloadFile(s3Key, localPath);
    }

    console.log(`[S3Backup] Backup directory downloaded: ${backupId}`);
  }
}
