/**
 * AWS Secrets Manager Integration
 *
 * This module provides secure secret management using AWS Secrets Manager.
 * It supports both production (AWS) and development (local .env) environments.
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  ListSecretsCommand,
  DeleteSecretCommand,
  PutSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import * as dotenv from 'dotenv';

// Load .env file for local development
dotenv.config();

export interface SecretValue {
  [key: string]: string;
}

export interface SecretsManagerConfig {
  region?: string;
  useLocalSecrets?: boolean;
  secretName?: string;
  endpoint?: string;
}

/**
 * SecretsManager class - Handles secure secret retrieval and management
 */
export class SecretsManager {
  private client: SecretsManagerClient | null = null;
  private useLocalSecrets: boolean;
  private secretName: string;
  private cachedSecrets: SecretValue | null = null;
  private cacheExpiry: number | null = null;
  private cacheTTL: number = 300000; // 5 minutes in milliseconds

  constructor(config: SecretsManagerConfig = {}) {
    this.useLocalSecrets = config.useLocalSecrets ?? process.env.USE_LOCAL_SECRETS === 'true';
    this.secretName = config.secretName ?? process.env.AWS_SECRET_NAME ?? 'jarvis/production';

    // Only initialize AWS client if not using local secrets
    if (!this.useLocalSecrets) {
      const region = config.region ?? process.env.AWS_REGION ?? 'us-east-1';

      const clientConfig: any = {
        region,
      };

      // Support for LocalStack or custom endpoints
      if (config.endpoint || process.env.AWS_SECRETS_ENDPOINT) {
        clientConfig.endpoint = config.endpoint || process.env.AWS_SECRETS_ENDPOINT;
      }

      this.client = new SecretsManagerClient(clientConfig);
    }
  }

  /**
   * Retrieve a secret value from AWS Secrets Manager or local environment
   */
  async getSecret(key: string): Promise<string | undefined> {
    const secrets = await this.getAllSecrets();
    return secrets[key];
  }

  /**
   * Retrieve all secrets at once (with caching)
   */
  async getAllSecrets(): Promise<SecretValue> {
    // Return cached secrets if still valid
    if (this.cachedSecrets && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.cachedSecrets;
    }

    let secrets: SecretValue;

    if (this.useLocalSecrets) {
      // Development mode: use environment variables
      secrets = this.getLocalSecrets();
    } else {
      // Production mode: use AWS Secrets Manager
      secrets = await this.fetchFromAWS();
    }

    // Cache the secrets
    this.cachedSecrets = secrets;
    this.cacheExpiry = Date.now() + this.cacheTTL;

    return secrets;
  }

  /**
   * Fetch secrets from AWS Secrets Manager
   */
  private async fetchFromAWS(): Promise<SecretValue> {
    if (!this.client) {
      throw new Error('AWS Secrets Manager client not initialized');
    }

    try {
      const command = new GetSecretValueCommand({
        SecretId: this.secretName,
      });

      const response = await this.client.send(command);

      if (response.SecretString) {
        return JSON.parse(response.SecretString) as SecretValue;
      } else if (response.SecretBinary) {
        // Handle binary secrets if needed
        const buff = Buffer.from(response.SecretBinary);
        return JSON.parse(buff.toString('utf-8')) as SecretValue;
      }

      throw new Error('Secret value not found in response');
    } catch (error: any) {
      console.error(`Error fetching secret from AWS: ${error.message}`);
      throw new Error(`Failed to retrieve secrets: ${error.message}`);
    }
  }

  /**
   * Get secrets from local environment variables (development)
   */
  private getLocalSecrets(): SecretValue {
    return {
      // Database
      DATABASE_URL: process.env.DATABASE_URL || '',
      REDIS_URL: process.env.REDIS_URL || '',

      // AI Provider API Keys
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || '',
      MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || '',

      // Security
      JWT_SECRET: process.env.JWT_SECRET || '',
      CSRF_SECRET: process.env.CSRF_SECRET || '',
      REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || '',

      // Storage (S3/MinIO)
      S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || '',
      S3_SECRET_KEY: process.env.S3_SECRET_KEY || '',

      // External Services
      SUNO_API_KEY: process.env.SUNO_API_KEY || '',
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
      MUSIC_GEN_API_KEY: process.env.MUSIC_GEN_API_KEY || '',
      STABLE_AUDIO_API_KEY: process.env.STABLE_AUDIO_API_KEY || '',

      // Alert Services
      PUSHOVER_USER_KEY: process.env.PUSHOVER_USER_KEY || '',
      PUSHOVER_API_TOKEN: process.env.PUSHOVER_API_TOKEN || '',
      SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || '',

      // Stripe (if needed)
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    };
  }

  /**
   * Create or update a secret in AWS Secrets Manager
   */
  async setSecret(secrets: SecretValue): Promise<void> {
    if (this.useLocalSecrets) {
      console.warn('Cannot set secrets in local mode. Update your .env file manually.');
      return;
    }

    if (!this.client) {
      throw new Error('AWS Secrets Manager client not initialized');
    }

    try {
      const secretString = JSON.stringify(secrets);

      // Try to update first
      try {
        const updateCommand = new PutSecretValueCommand({
          SecretId: this.secretName,
          SecretString: secretString,
        });

        await this.client.send(updateCommand);
        console.log(`Successfully updated secret: ${this.secretName}`);
      } catch (updateError: any) {
        // If secret doesn't exist, create it
        if (updateError.name === 'ResourceNotFoundException') {
          const createCommand = new CreateSecretCommand({
            Name: this.secretName,
            SecretString: secretString,
            Description: 'Jarvis application secrets',
          });

          await this.client.send(createCommand);
          console.log(`Successfully created secret: ${this.secretName}`);
        } else {
          throw updateError;
        }
      }

      // Invalidate cache
      this.cachedSecrets = null;
      this.cacheExpiry = null;
    } catch (error: any) {
      console.error(`Error setting secret in AWS: ${error.message}`);
      throw new Error(`Failed to set secrets: ${error.message}`);
    }
  }

  /**
   * List all available secrets in AWS Secrets Manager
   */
  async listSecrets(): Promise<string[]> {
    if (this.useLocalSecrets) {
      return Object.keys(this.getLocalSecrets());
    }

    if (!this.client) {
      throw new Error('AWS Secrets Manager client not initialized');
    }

    try {
      const command = new ListSecretsCommand({});
      const response = await this.client.send(command);

      return response.SecretList?.map(secret => secret.Name || '') || [];
    } catch (error: any) {
      console.error(`Error listing secrets: ${error.message}`);
      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }

  /**
   * Delete a secret from AWS Secrets Manager
   */
  async deleteSecret(secretName?: string): Promise<void> {
    if (this.useLocalSecrets) {
      console.warn('Cannot delete secrets in local mode.');
      return;
    }

    if (!this.client) {
      throw new Error('AWS Secrets Manager client not initialized');
    }

    const nameToDelete = secretName || this.secretName;

    try {
      const command = new DeleteSecretCommand({
        SecretId: nameToDelete,
        ForceDeleteWithoutRecovery: false, // Allow 30-day recovery period
      });

      await this.client.send(command);
      console.log(`Successfully scheduled deletion for secret: ${nameToDelete}`);

      // Invalidate cache if deleting current secret
      if (nameToDelete === this.secretName) {
        this.cachedSecrets = null;
        this.cacheExpiry = null;
      }
    } catch (error: any) {
      console.error(`Error deleting secret: ${error.message}`);
      throw new Error(`Failed to delete secret: ${error.message}`);
    }
  }

  /**
   * Clear the in-memory cache
   */
  clearCache(): void {
    this.cachedSecrets = null;
    this.cacheExpiry = null;
  }

  /**
   * Check if secrets are available and valid
   */
  async validateSecrets(requiredKeys: string[]): Promise<boolean> {
    try {
      const secrets = await this.getAllSecrets();

      for (const key of requiredKeys) {
        if (!secrets[key] || secrets[key].trim() === '') {
          console.error(`Missing or empty secret: ${key}`);
          return false;
        }
      }

      return true;
    } catch (error: any) {
      console.error(`Secret validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get the current mode (local or AWS)
   */
  getMode(): 'local' | 'aws' {
    return this.useLocalSecrets ? 'local' : 'aws';
  }
}

// Export a singleton instance for convenience
export const secretsManager = new SecretsManager();

// Export the class for custom instances
export default SecretsManager;
