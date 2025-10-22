/**
 * DAWG AI Core Service
 *
 * Main service for DAWG AI integration with Jarvis.
 * Handles authentication, project management, and API communication.
 *
 * @module services/dawg-ai.service
 */

import { logger } from '../utils/logger.js';
import { getEncryption } from '../db/encryption.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const encryption = getEncryption();

export interface DawgAIConfig {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
}

export interface DawgAICredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export interface DawgAIUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  createdAt: Date;
}

export interface ConnectionStatus {
  connected: boolean;
  lastSync?: Date;
  error?: string;
  user?: DawgAIUser;
}

/**
 * DAWG AI Service
 * Core integration service for DAWG AI platform
 */
export class DawgAIService {
  private config: DawgAIConfig;
  private rateLimitWindow: Map<string, number[]> = new Map();
  private maxRequestsPerMinute = 60;

  constructor(config?: Partial<DawgAIConfig>) {
    this.config = {
      apiBaseUrl: config?.apiBaseUrl || process.env.DAWG_AI_API_URL || 'https://api.dawg-ai.com/v1',
      clientId: config?.clientId || process.env.DAWG_AI_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.DAWG_AI_CLIENT_SECRET || '',
      webhookSecret: config?.webhookSecret || process.env.DAWG_AI_WEBHOOK_SECRET || '',
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      logger.warn('DAWG AI credentials not configured. Service will operate in mock mode.');
    }
  }

  /**
   * Check rate limiting for user
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.rateLimitWindow.get(userId) || [];

    // Filter requests within the last minute
    const recentRequests = userRequests.filter(timestamp => now - timestamp < 60000);

    if (recentRequests.length >= this.maxRequestsPerMinute) {
      return false;
    }

    recentRequests.push(now);
    this.rateLimitWindow.set(userId, recentRequests);
    return true;
  }

  /**
   * Store encrypted credentials in database
   */
  async storeCredentials(userId: string, credentials: DawgAICredentials): Promise<void> {
    try {
      const encrypted = await encryption.encryptOAuthToken({
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        scope: credentials.scope,
      });

      await prisma.dawgAIConnection.upsert({
        where: { userId },
        create: {
          userId,
          accessToken: encrypted.ciphertext,
          refreshToken: encrypted.ciphertext,
          expiresAt: credentials.expiresAt,
          tokenIv: encrypted.iv,
          tokenAuthTag: encrypted.authTag,
          tokenDataKey: encrypted.dataKeyEncrypted,
          scope: credentials.scope,
          connected: true,
        },
        update: {
          accessToken: encrypted.ciphertext,
          refreshToken: encrypted.ciphertext,
          expiresAt: credentials.expiresAt,
          tokenIv: encrypted.iv,
          tokenAuthTag: encrypted.authTag,
          tokenDataKey: encrypted.dataKeyEncrypted,
          scope: credentials.scope,
          connected: true,
          lastSync: new Date(),
        },
      });

      logger.info(`DAWG AI credentials stored for user ${userId}`);
    } catch (error: any) {
      logger.error('Failed to store DAWG AI credentials:', error);
      throw new Error(`Failed to store credentials: ${error.message}`);
    }
  }

  /**
   * Retrieve and decrypt credentials from database
   */
  async getCredentials(userId: string): Promise<DawgAICredentials | null> {
    try {
      const connection = await prisma.dawgAIConnection.findUnique({
        where: { userId },
      });

      if (!connection || !connection.connected) {
        return null;
      }

      const decrypted = await encryption.decryptOAuthToken({
        ciphertext: connection.accessToken,
        iv: connection.tokenIv,
        authTag: connection.tokenAuthTag,
        dataKeyEncrypted: connection.tokenDataKey,
      });

      return {
        accessToken: decrypted.accessToken,
        refreshToken: decrypted.refreshToken || '',
        expiresAt: connection.expiresAt,
        scope: connection.scope || '',
      };
    } catch (error: any) {
      logger.error('Failed to retrieve DAWG AI credentials:', error);
      return null;
    }
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(userId: string): Promise<boolean> {
    try {
      const credentials = await this.getCredentials(userId);
      if (!credentials) {
        return false;
      }

      // Check if token is expired or about to expire (within 5 minutes)
      const now = new Date();
      const expiryBuffer = new Date(credentials.expiresAt.getTime() - 5 * 60 * 1000);

      if (now < expiryBuffer) {
        return true; // Token still valid
      }

      // Refresh the token
      const response = await fetch(`${this.config.apiBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: credentials.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();

      await this.storeCredentials(userId, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || credentials.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: data.scope || credentials.scope,
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to refresh DAWG AI token:', error);
      return false;
    }
  }

  /**
   * Make authenticated API request to DAWG AI
   */
  async makeRequest(
    userId: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    // Check rate limiting
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Ensure token is valid
    await this.refreshAccessToken(userId);

    const credentials = await this.getCredentials(userId);
    if (!credentials) {
      throw new Error('DAWG AI not connected for this user');
    }

    const url = `${this.config.apiBaseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`DAWG AI API error (${response.status}):`, error);
      throw new Error(`DAWG AI API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get connection status for user
   */
  async getConnectionStatus(userId: string): Promise<ConnectionStatus> {
    try {
      const connection = await prisma.dawgAIConnection.findUnique({
        where: { userId },
      });

      if (!connection || !connection.connected) {
        return {
          connected: false,
        };
      }

      // Try to fetch user info to verify connection
      try {
        const userInfo = await this.makeRequest(userId, '/user/me');
        return {
          connected: true,
          lastSync: connection.lastSync || undefined,
          user: {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            plan: userInfo.plan,
            createdAt: new Date(userInfo.created_at),
          },
        };
      } catch (error: any) {
        return {
          connected: true,
          lastSync: connection.lastSync || undefined,
          error: 'Unable to verify connection',
        };
      }
    } catch (error: any) {
      logger.error('Failed to get DAWG AI connection status:', error);
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Disconnect DAWG AI account
   */
  async disconnect(userId: string): Promise<void> {
    try {
      await prisma.dawgAIConnection.update({
        where: { userId },
        data: {
          connected: false,
          disconnectedAt: new Date(),
        },
      });

      logger.info(`DAWG AI disconnected for user ${userId}`);
    } catch (error: any) {
      logger.error('Failed to disconnect DAWG AI:', error);
      throw new Error(`Failed to disconnect: ${error.message}`);
    }
  }

  /**
   * Sync user data from DAWG AI
   */
  async syncUserData(userId: string): Promise<void> {
    try {
      // Fetch projects
      const projects = await this.makeRequest(userId, '/projects');

      // Store projects in database
      for (const project of projects.data) {
        await prisma.dawgAIProject.upsert({
          where: {
            userId_externalId: {
              userId,
              externalId: project.id,
            },
          },
          create: {
            userId,
            externalId: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            metadata: project.metadata || {},
            createdAt: new Date(project.created_at),
            updatedAt: new Date(project.updated_at),
          },
          update: {
            name: project.name,
            description: project.description,
            status: project.status,
            metadata: project.metadata || {},
            updatedAt: new Date(project.updated_at),
          },
        });
      }

      // Update last sync time
      await prisma.dawgAIConnection.update({
        where: { userId },
        data: { lastSync: new Date() },
      });

      logger.info(`DAWG AI data synced for user ${userId}`);
    } catch (error: any) {
      logger.error('Failed to sync DAWG AI data:', error);
      throw new Error(`Failed to sync data: ${error.message}`);
    }
  }
}

/**
 * Singleton instance
 */
let serviceInstance: DawgAIService | null = null;

/**
 * Get DAWG AI service instance
 */
export function getDawgAIService(config?: Partial<DawgAIConfig>): DawgAIService {
  if (!serviceInstance) {
    serviceInstance = new DawgAIService(config);
  }
  return serviceInstance;
}

export default DawgAIService;
