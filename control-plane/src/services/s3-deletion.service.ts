/**
 * S3 Deletion Service
 *
 * Handles deletion of user files from AWS S3
 * Used for GDPR compliance - "Right to be Forgotten"
 */

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger.js';

export interface S3DeletionResult {
  deletedFiles: number;
  deletedBytes: number;
  errors: string[];
}

export class S3DeletionService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    this.bucketName = process.env.S3_BUCKET_NAME || 'jarvis-user-data';

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logger.warn('AWS credentials not configured - S3 deletion will be skipped');
    }

    logger.info('S3 Deletion Service initialized', {
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: this.bucketName
    });
  }

  /**
   * Delete all files for a user from S3
   *
   * @param userId - User ID whose files should be deleted
   * @returns Deletion result with count of deleted files
   */
  async deleteUserFiles(userId: string): Promise<S3DeletionResult> {
    const result: S3DeletionResult = {
      deletedFiles: 0,
      deletedBytes: 0,
      errors: []
    };

    if (!this.isConfigured()) {
      logger.warn('S3 not configured, skipping file deletion', { userId });
      result.errors.push('S3 not configured');
      return result;
    }

    try {
      logger.info('Starting S3 deletion for user', { userId });

      // List all objects with user's prefix
      const userPrefix = `users/${userId}/`;
      let continuationToken: string | undefined;
      let totalObjects = 0;

      do {
        // List objects
        const listCommand = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: userPrefix,
          ContinuationToken: continuationToken
        });

        const listResponse = await this.s3Client.send(listCommand);

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
          break;
        }

        // Prepare batch delete
        const objectsToDelete = listResponse.Contents.map(obj => ({
          Key: obj.Key!
        }));

        totalObjects += objectsToDelete.length;

        // Delete batch (max 1000 objects per request)
        if (objectsToDelete.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: {
              Objects: objectsToDelete,
              Quiet: false
            }
          });

          const deleteResponse = await this.s3Client.send(deleteCommand);

          // Track successful deletions
          if (deleteResponse.Deleted) {
            result.deletedFiles += deleteResponse.Deleted.length;

            // Sum up deleted bytes
            for (const deleted of deleteResponse.Deleted) {
              const originalObj = listResponse.Contents.find(
                obj => obj.Key === deleted.Key
              );
              if (originalObj?.Size) {
                result.deletedBytes += originalObj.Size;
              }
            }
          }

          // Track errors
          if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
            for (const error of deleteResponse.Errors) {
              const errorMsg = `Failed to delete ${error.Key}: ${error.Code} - ${error.Message}`;
              result.errors.push(errorMsg);
              logger.error('S3 deletion error', { error: errorMsg });
            }
          }
        }

        // Continue if there are more objects
        continuationToken = listResponse.NextContinuationToken;

      } while (continuationToken);

      logger.info('S3 deletion completed', {
        userId,
        deletedFiles: result.deletedFiles,
        deletedBytes: result.deletedBytes,
        errors: result.errors.length
      });

      return result;

    } catch (error: any) {
      const errorMsg = `S3 deletion failed: ${error.message}`;
      logger.error('S3 deletion error', {
        userId,
        error: error.message,
        stack: error.stack
      });

      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * Delete specific file from S3
   *
   * @param userId - User ID
   * @param filePath - Path to file within user's directory
   * @returns True if deletion was successful
   */
  async deleteFile(userId: string, filePath: string): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('S3 not configured, skipping file deletion');
      return false;
    }

    try {
      const key = `users/${userId}/${filePath}`;

      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(deleteCommand);

      logger.info('S3 file deleted', {
        userId,
        filePath,
        key
      });

      return true;

    } catch (error: any) {
      logger.error('Failed to delete S3 file', {
        userId,
        filePath,
        error: error.message
      });

      return false;
    }
  }

  /**
   * Delete files from a specific directory
   *
   * @param userId - User ID
   * @param directory - Directory path within user's storage
   * @returns Deletion result
   */
  async deleteDirectory(userId: string, directory: string): Promise<S3DeletionResult> {
    const result: S3DeletionResult = {
      deletedFiles: 0,
      deletedBytes: 0,
      errors: []
    };

    if (!this.isConfigured()) {
      logger.warn('S3 not configured');
      result.errors.push('S3 not configured');
      return result;
    }

    try {
      const prefix = `users/${userId}/${directory}/`;

      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix
      });

      const listResponse = await this.s3Client.send(listCommand);

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        logger.info('No files found in directory', { userId, directory });
        return result;
      }

      const objectsToDelete = listResponse.Contents.map(obj => ({
        Key: obj.Key!
      }));

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: objectsToDelete
        }
      });

      const deleteResponse = await this.s3Client.send(deleteCommand);

      if (deleteResponse.Deleted) {
        result.deletedFiles = deleteResponse.Deleted.length;
      }

      if (deleteResponse.Errors) {
        for (const error of deleteResponse.Errors) {
          result.errors.push(`${error.Key}: ${error.Message}`);
        }
      }

      logger.info('Directory deleted from S3', {
        userId,
        directory,
        deletedFiles: result.deletedFiles
      });

      return result;

    } catch (error: any) {
      const errorMsg = `Failed to delete directory: ${error.message}`;
      logger.error(errorMsg, { userId, directory });
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * Check if S3 is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET_NAME
    );
  }

  /**
   * Get bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }
}

// Export singleton instance
let s3DeletionServiceInstance: S3DeletionService | null = null;

export function getS3DeletionService(): S3DeletionService {
  if (!s3DeletionServiceInstance) {
    s3DeletionServiceInstance = new S3DeletionService();
  }
  return s3DeletionServiceInstance;
}

export default S3DeletionService;
