/**
 * Database Encryption Utilities
 *
 * Provides column-level encryption for sensitive data using AWS KMS.
 * Supports encryption of API keys, OAuth tokens, user emails, and backup data.
 *
 * @module db/encryption
 */

import crypto from 'crypto';
import { KMSClient, EncryptCommand, DecryptCommand, GenerateDataKeyCommand } from '@aws-sdk/client-kms';
import { logger } from '../utils/logger.js';

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * KMS Configuration
 */
interface KMSConfig {
  region: string;
  keyId: string;
  endpoint?: string;
}

/**
 * Encryption Result
 */
interface EncryptionResult {
  ciphertext: string;
  iv: string;
  authTag: string;
  dataKeyEncrypted: string;
}

/**
 * Decryption Input
 */
interface DecryptionInput {
  ciphertext: string;
  iv: string;
  authTag: string;
  dataKeyEncrypted: string;
}

/**
 * Database Encryption Service
 */
export class DatabaseEncryption {
  private kmsClient: KMSClient;
  private kmsKeyId: string;
  private localCache: Map<string, Buffer>;
  private cacheMaxAge: number;
  private cacheTimestamps: Map<string, number>;

  constructor(config?: KMSConfig) {
    const region = config?.region || process.env.AWS_REGION || 'us-east-1';
    const keyId = config?.keyId || process.env.KMS_KEY_ID || '';

    if (!keyId) {
      logger.warn('KMS_KEY_ID not configured. Encryption will use fallback mode.');
    }

    this.kmsKeyId = keyId;
    this.kmsClient = new KMSClient({
      region,
      endpoint: config?.endpoint,
    });

    // Data key cache for performance (5 minutes default)
    this.localCache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheMaxAge = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate a data encryption key using KMS
   */
  private async generateDataKey(): Promise<{ plaintext: Buffer; ciphertext: Buffer }> {
    try {
      const command = new GenerateDataKeyCommand({
        KeyId: this.kmsKeyId,
        KeySpec: 'AES_256',
      });

      const response = await this.kmsClient.send(command);

      if (!response.Plaintext || !response.CiphertextBlob) {
        throw new Error('Failed to generate data key from KMS');
      }

      return {
        plaintext: Buffer.from(response.Plaintext),
        ciphertext: Buffer.from(response.CiphertextBlob),
      };
    } catch (error: any) {
      logger.error('KMS data key generation failed:', error);
      throw new Error(`Failed to generate data key: ${error.message}`);
    }
  }

  /**
   * Decrypt a data encryption key using KMS
   */
  private async decryptDataKey(encryptedKey: Buffer): Promise<Buffer> {
    // Check cache first
    const cacheKey = encryptedKey.toString('base64');
    const cached = this.localCache.get(cacheKey);
    const timestamp = this.cacheTimestamps.get(cacheKey);

    if (cached && timestamp && Date.now() - timestamp < this.cacheMaxAge) {
      return cached;
    }

    try {
      const command = new DecryptCommand({
        CiphertextBlob: encryptedKey,
      });

      const response = await this.kmsClient.send(command);

      if (!response.Plaintext) {
        throw new Error('Failed to decrypt data key from KMS');
      }

      const plaintext = Buffer.from(response.Plaintext);

      // Cache the decrypted key
      this.localCache.set(cacheKey, plaintext);
      this.cacheTimestamps.set(cacheKey, Date.now());

      // Cleanup old cache entries
      this.cleanupCache();

      return plaintext;
    } catch (error: any) {
      logger.error('KMS data key decryption failed:', error);
      throw new Error(`Failed to decrypt data key: ${error.message}`);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cacheTimestamps.forEach((timestamp, key) => {
      if (now - timestamp >= this.cacheMaxAge) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.localCache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }

  /**
   * Encrypt sensitive data
   *
   * @param plaintext - The data to encrypt
   * @returns Encryption result with ciphertext and metadata
   */
  async encrypt(plaintext: string): Promise<EncryptionResult> {
    try {
      if (!plaintext) {
        throw new Error('Cannot encrypt empty data');
      }

      // Generate a new data key for this encryption operation
      const { plaintext: dataKey, ciphertext: encryptedDataKey } = await this.generateDataKey();

      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, dataKey, iv);

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Clear sensitive data from memory
      dataKey.fill(0);

      return {
        ciphertext: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        dataKeyEncrypted: encryptedDataKey.toString('base64'),
      };
    } catch (error: any) {
      logger.error('Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   *
   * @param input - Encryption result to decrypt
   * @returns Decrypted plaintext
   */
  async decrypt(input: DecryptionInput): Promise<string> {
    try {
      if (!input.ciphertext || !input.iv || !input.authTag || !input.dataKeyEncrypted) {
        throw new Error('Invalid decryption input: missing required fields');
      }

      // Decrypt the data key
      const encryptedKeyBuffer = Buffer.from(input.dataKeyEncrypted, 'base64');
      const dataKey = await this.decryptDataKey(encryptedKeyBuffer);

      // Parse encrypted components
      const iv = Buffer.from(input.iv, 'base64');
      const authTag = Buffer.from(input.authTag, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, dataKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(input.ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      logger.error('Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt API key for storage
   */
  async encryptApiKey(apiKey: string, metadata?: Record<string, any>): Promise<EncryptionResult> {
    logger.debug('Encrypting API key');
    const data = JSON.stringify({
      key: apiKey,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    });
    return this.encrypt(data);
  }

  /**
   * Decrypt API key from storage
   */
  async decryptApiKey(input: DecryptionInput): Promise<{ key: string; metadata: Record<string, any> }> {
    logger.debug('Decrypting API key');
    const decrypted = await this.decrypt(input);
    const parsed = JSON.parse(decrypted);
    return {
      key: parsed.key,
      metadata: parsed.metadata || {},
    };
  }

  /**
   * Encrypt OAuth token for storage
   */
  async encryptOAuthToken(token: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scope?: string;
  }): Promise<EncryptionResult> {
    logger.debug('Encrypting OAuth token');
    const data = JSON.stringify({
      ...token,
      timestamp: new Date().toISOString(),
    });
    return this.encrypt(data);
  }

  /**
   * Decrypt OAuth token from storage
   */
  async decryptOAuthToken(input: DecryptionInput): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scope?: string;
  }> {
    logger.debug('Decrypting OAuth token');
    const decrypted = await this.decrypt(input);
    const parsed = JSON.parse(decrypted);
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
      scope: parsed.scope,
    };
  }

  /**
   * Encrypt user email for storage
   */
  async encryptEmail(email: string): Promise<EncryptionResult> {
    logger.debug('Encrypting email address');
    return this.encrypt(email.toLowerCase().trim());
  }

  /**
   * Decrypt user email from storage
   */
  async decryptEmail(input: DecryptionInput): Promise<string> {
    logger.debug('Decrypting email address');
    return this.decrypt(input);
  }

  /**
   * Generate a hash for searching encrypted data (one-way)
   * Useful for email lookups without decrypting
   */
  generateSearchHash(value: string): string {
    const salt = process.env.ENCRYPTION_SEARCH_SALT || 'default-salt-change-in-production';
    return crypto
      .createHmac('sha256', salt)
      .update(value.toLowerCase().trim())
      .digest('base64');
  }

  /**
   * Encrypt backup data
   */
  async encryptBackup(data: any): Promise<EncryptionResult> {
    logger.debug('Encrypting backup data');
    const jsonData = JSON.stringify(data);
    return this.encrypt(jsonData);
  }

  /**
   * Decrypt backup data
   */
  async decryptBackup(input: DecryptionInput): Promise<any> {
    logger.debug('Decrypting backup data');
    const decrypted = await this.decrypt(input);
    return JSON.parse(decrypted);
  }

  /**
   * Clear the data key cache
   */
  clearCache(): void {
    this.localCache.clear();
    this.cacheTimestamps.clear();
    logger.debug('Encryption cache cleared');
  }

  /**
   * Rotate encryption by re-encrypting data with a new data key
   */
  async rotateEncryption(input: DecryptionInput): Promise<EncryptionResult> {
    logger.debug('Rotating encryption');
    const plaintext = await this.decrypt(input);
    return this.encrypt(plaintext);
  }
}

/**
 * Singleton instance for database encryption
 */
let encryptionInstance: DatabaseEncryption | null = null;

/**
 * Get the database encryption instance
 */
export function getEncryption(config?: KMSConfig): DatabaseEncryption {
  if (!encryptionInstance) {
    encryptionInstance = new DatabaseEncryption(config);
  }
  return encryptionInstance;
}

/**
 * Initialize database encryption with configuration
 */
export function initializeEncryption(config: KMSConfig): DatabaseEncryption {
  encryptionInstance = new DatabaseEncryption(config);
  logger.info('Database encryption initialized', {
    region: config.region,
    keyId: config.keyId ? 'configured' : 'not configured',
  });
  return encryptionInstance;
}

export default DatabaseEncryption;
