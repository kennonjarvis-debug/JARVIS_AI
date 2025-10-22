/**
 * AWS KMS Integration for Database Encryption
 *
 * Provides key management services using AWS Key Management Service (KMS).
 * Handles key rotation, key policies, and secure key storage.
 *
 * @module db/kms
 */

import {
  KMSClient,
  CreateKeyCommand,
  DescribeKeyCommand,
  EnableKeyRotationCommand,
  GetKeyRotationStatusCommand,
  CreateAliasCommand,
  ListAliasesCommand,
  ScheduleKeyDeletionCommand,
  CancelKeyDeletionCommand,
  PutKeyPolicyCommand,
  GetKeyPolicyCommand,
  TagResourceCommand,
  ListResourceTagsCommand,
} from '@aws-sdk/client-kms';
import { logger } from '../utils/logger.js';

/**
 * KMS Key Configuration
 */
interface KeyConfig {
  description: string;
  keyUsage?: 'ENCRYPT_DECRYPT' | 'SIGN_VERIFY';
  origin?: 'AWS_KMS' | 'EXTERNAL';
  multiRegion?: boolean;
  tags?: Record<string, string>;
}

/**
 * KMS Key Information
 */
interface KeyInfo {
  keyId: string;
  arn: string;
  description: string;
  enabled: boolean;
  keyState: string;
  creationDate?: Date;
  rotationEnabled: boolean;
  multiRegion: boolean;
}

/**
 * KMS Manager for Database Encryption
 */
export class KMSManager {
  private client: KMSClient;
  private region: string;

  constructor(region?: string) {
    this.region = region || process.env.AWS_REGION || 'us-east-1';
    this.client = new KMSClient({ region: this.region });
    logger.info(`KMS Manager initialized for region: ${this.region}`);
  }

  /**
   * Create a new KMS key for database encryption
   */
  async createKey(config: KeyConfig): Promise<string> {
    try {
      const command = new CreateKeyCommand({
        Description: config.description,
        KeyUsage: config.keyUsage || 'ENCRYPT_DECRYPT',
        Origin: config.origin || 'AWS_KMS',
        MultiRegion: config.multiRegion || false,
        Tags: config.tags
          ? Object.entries(config.tags).map(([Key, Value]) => ({ Key, Value }))
          : undefined,
      });

      const response = await this.client.send(command);

      if (!response.KeyMetadata?.KeyId) {
        throw new Error('Failed to create KMS key');
      }

      const keyId = response.KeyMetadata.KeyId;
      logger.info('KMS key created successfully', { keyId });

      // Enable automatic key rotation
      await this.enableKeyRotation(keyId);

      return keyId;
    } catch (error: any) {
      logger.error('Failed to create KMS key:', error);
      throw new Error(`KMS key creation failed: ${error.message}`);
    }
  }

  /**
   * Create an alias for a KMS key
   */
  async createAlias(keyId: string, aliasName: string): Promise<void> {
    try {
      // Ensure alias has the correct prefix
      const fullAliasName = aliasName.startsWith('alias/')
        ? aliasName
        : `alias/${aliasName}`;

      const command = new CreateAliasCommand({
        AliasName: fullAliasName,
        TargetKeyId: keyId,
      });

      await this.client.send(command);
      logger.info('KMS alias created', { aliasName: fullAliasName, keyId });
    } catch (error: any) {
      logger.error('Failed to create KMS alias:', error);
      throw new Error(`KMS alias creation failed: ${error.message}`);
    }
  }

  /**
   * Get information about a KMS key
   */
  async describeKey(keyId: string): Promise<KeyInfo> {
    try {
      const command = new DescribeKeyCommand({ KeyId: keyId });
      const response = await this.client.send(command);

      if (!response.KeyMetadata) {
        throw new Error('Key metadata not found');
      }

      const metadata = response.KeyMetadata;

      // Get rotation status
      const rotationStatus = await this.getKeyRotationStatus(keyId);

      return {
        keyId: metadata.KeyId || '',
        arn: metadata.Arn || '',
        description: metadata.Description || '',
        enabled: metadata.Enabled || false,
        keyState: metadata.KeyState || 'Unknown',
        creationDate: metadata.CreationDate,
        rotationEnabled: rotationStatus,
        multiRegion: metadata.MultiRegion || false,
      };
    } catch (error: any) {
      logger.error('Failed to describe KMS key:', error);
      throw new Error(`KMS key description failed: ${error.message}`);
    }
  }

  /**
   * Enable automatic key rotation
   */
  async enableKeyRotation(keyId: string): Promise<void> {
    try {
      const command = new EnableKeyRotationCommand({ KeyId: keyId });
      await this.client.send(command);
      logger.info('Key rotation enabled', { keyId });
    } catch (error: any) {
      logger.error('Failed to enable key rotation:', error);
      throw new Error(`Enable key rotation failed: ${error.message}`);
    }
  }

  /**
   * Get key rotation status
   */
  async getKeyRotationStatus(keyId: string): Promise<boolean> {
    try {
      const command = new GetKeyRotationStatusCommand({ KeyId: keyId });
      const response = await this.client.send(command);
      return response.KeyRotationEnabled || false;
    } catch (error: any) {
      logger.warn('Failed to get key rotation status:', error);
      return false;
    }
  }

  /**
   * List all aliases in the account
   */
  async listAliases(): Promise<Array<{ name: string; keyId?: string }>> {
    try {
      const command = new ListAliasesCommand({});
      const response = await this.client.send(command);

      return (response.Aliases || []).map((alias) => ({
        name: alias.AliasName || '',
        keyId: alias.TargetKeyId,
      }));
    } catch (error: any) {
      logger.error('Failed to list KMS aliases:', error);
      throw new Error(`List KMS aliases failed: ${error.message}`);
    }
  }

  /**
   * Schedule key deletion (requires 7-30 day waiting period)
   */
  async scheduleKeyDeletion(keyId: string, pendingWindowInDays: number = 30): Promise<Date> {
    try {
      if (pendingWindowInDays < 7 || pendingWindowInDays > 30) {
        throw new Error('Pending window must be between 7 and 30 days');
      }

      const command = new ScheduleKeyDeletionCommand({
        KeyId: keyId,
        PendingWindowInDays: pendingWindowInDays,
      });

      const response = await this.client.send(command);
      const deletionDate = response.DeletionDate || new Date();

      logger.warn('Key deletion scheduled', {
        keyId,
        deletionDate: deletionDate.toISOString(),
        pendingDays: pendingWindowInDays,
      });

      return deletionDate;
    } catch (error: any) {
      logger.error('Failed to schedule key deletion:', error);
      throw new Error(`Schedule key deletion failed: ${error.message}`);
    }
  }

  /**
   * Cancel key deletion
   */
  async cancelKeyDeletion(keyId: string): Promise<void> {
    try {
      const command = new CancelKeyDeletionCommand({ KeyId: keyId });
      await this.client.send(command);
      logger.info('Key deletion cancelled', { keyId });
    } catch (error: any) {
      logger.error('Failed to cancel key deletion:', error);
      throw new Error(`Cancel key deletion failed: ${error.message}`);
    }
  }

  /**
   * Set key policy
   */
  async setKeyPolicy(keyId: string, policy: Record<string, any>): Promise<void> {
    try {
      const command = new PutKeyPolicyCommand({
        KeyId: keyId,
        PolicyName: 'default',
        Policy: JSON.stringify(policy),
      });

      await this.client.send(command);
      logger.info('Key policy updated', { keyId });
    } catch (error: any) {
      logger.error('Failed to set key policy:', error);
      throw new Error(`Set key policy failed: ${error.message}`);
    }
  }

  /**
   * Get key policy
   */
  async getKeyPolicy(keyId: string): Promise<Record<string, any>> {
    try {
      const command = new GetKeyPolicyCommand({
        KeyId: keyId,
        PolicyName: 'default',
      });

      const response = await this.client.send(command);

      if (!response.Policy) {
        throw new Error('Key policy not found');
      }

      return JSON.parse(response.Policy);
    } catch (error: any) {
      logger.error('Failed to get key policy:', error);
      throw new Error(`Get key policy failed: ${error.message}`);
    }
  }

  /**
   * Tag a KMS key
   */
  async tagKey(keyId: string, tags: Record<string, string>): Promise<void> {
    try {
      const command = new TagResourceCommand({
        KeyId: keyId,
        Tags: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
      });

      await this.client.send(command);
      logger.info('Key tagged', { keyId, tags });
    } catch (error: any) {
      logger.error('Failed to tag key:', error);
      throw new Error(`Tag key failed: ${error.message}`);
    }
  }

  /**
   * Get tags for a KMS key
   */
  async getKeyTags(keyId: string): Promise<Record<string, string>> {
    try {
      const command = new ListResourceTagsCommand({ KeyId: keyId });
      const response = await this.client.send(command);

      const tags: Record<string, string> = {};
      (response.Tags || []).forEach((tag) => {
        if (tag.TagKey && tag.TagValue) {
          tags[tag.TagKey] = tag.TagValue;
        }
      });

      return tags;
    } catch (error: any) {
      logger.error('Failed to get key tags:', error);
      throw new Error(`Get key tags failed: ${error.message}`);
    }
  }

  /**
   * Create a default key policy for database encryption
   */
  createDefaultKeyPolicy(accountId: string, additionalPrincipals?: string[]): Record<string, any> {
    const principals = [
      `arn:aws:iam::${accountId}:root`,
      ...(additionalPrincipals || []),
    ];

    return {
      Version: '2012-10-17',
      Id: 'jarvis-database-encryption-key-policy',
      Statement: [
        {
          Sid: 'Enable IAM User Permissions',
          Effect: 'Allow',
          Principal: {
            AWS: principals,
          },
          Action: 'kms:*',
          Resource: '*',
        },
        {
          Sid: 'Allow application to use the key',
          Effect: 'Allow',
          Principal: {
            AWS: principals,
          },
          Action: [
            'kms:Decrypt',
            'kms:Encrypt',
            'kms:GenerateDataKey',
            'kms:DescribeKey',
          ],
          Resource: '*',
        },
        {
          Sid: 'Allow CloudWatch Logs',
          Effect: 'Allow',
          Principal: {
            Service: 'logs.amazonaws.com',
          },
          Action: [
            'kms:Decrypt',
            'kms:GenerateDataKey',
          ],
          Resource: '*',
        },
      ],
    };
  }

  /**
   * Initialize KMS for Jarvis database encryption
   */
  async initializeForJarvis(accountId: string, environment: string = 'production'): Promise<string> {
    try {
      logger.info('Initializing KMS for Jarvis database encryption');

      // Create the key
      const keyId = await this.createKey({
        description: `Jarvis Database Encryption Key - ${environment}`,
        tags: {
          Application: 'Jarvis',
          Environment: environment,
          Purpose: 'DatabaseEncryption',
          ManagedBy: 'Jarvis',
        },
      });

      // Create alias
      const aliasName = `jarvis-db-encryption-${environment}`;
      await this.createAlias(keyId, aliasName);

      // Set key policy
      const policy = this.createDefaultKeyPolicy(accountId);
      await this.setKeyPolicy(keyId, policy);

      logger.info('KMS initialization complete', { keyId, alias: aliasName });

      return keyId;
    } catch (error: any) {
      logger.error('KMS initialization failed:', error);
      throw new Error(`KMS initialization failed: ${error.message}`);
    }
  }
}

/**
 * Singleton instance
 */
let kmsManagerInstance: KMSManager | null = null;

/**
 * Get the KMS manager instance
 */
export function getKMSManager(region?: string): KMSManager {
  if (!kmsManagerInstance) {
    kmsManagerInstance = new KMSManager(region);
  }
  return kmsManagerInstance;
}

/**
 * Initialize KMS manager with configuration
 */
export function initializeKMS(region: string): KMSManager {
  kmsManagerInstance = new KMSManager(region);
  logger.info('KMS Manager initialized', { region });
  return kmsManagerInstance;
}

export default KMSManager;
