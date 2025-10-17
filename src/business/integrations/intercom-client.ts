/**
 * Intercom Integration Client
 *
 * Handles connection to Intercom API
 */

import { IExternalIntegration } from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export class IntercomClient implements IExternalIntegration {
  name = 'intercom';
  private accessToken: string;
  private connected: boolean = false;
  private client: any;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async connect(): Promise<boolean> {
    try {
      // Dynamically import Intercom client
      const { Client } = await import('intercom-client');

      this.client = new Client({ tokenAuth: { token: this.accessToken } });

      // Test connection by getting current admin
      await this.client.admins.me();

      this.connected = true;
      logger.info('Intercom client connected', {
        integration: 'intercom'
      });

      return true;
    } catch (error) {
      logger.error('Failed to connect to Intercom', {
        integration: 'intercom',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async test(): Promise<{ healthy: boolean; message: string }> {
    if (!this.connected || !this.client) {
      return { healthy: false, message: 'Not connected' };
    }

    try {
      await this.client.admins.me();
      return { healthy: true, message: 'Connection successful' };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.client = null;
    logger.info('Intercom client disconnected');
  }

  /**
   * Get conversations from Intercom
   */
  async getConversations(options?: {
    state?: 'open' | 'closed' | 'snoozed';
  }): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('Intercom client not connected');
    }

    try {
      const response = await this.client.conversations.list({
        state: options?.state
      });

      return response.body.conversations || [];
    } catch (error) {
      logger.error('Failed to get Intercom conversations', {
        integration: 'intercom',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Intercom client not connected');
    }

    try {
      const response = await this.client.conversations.find({ id: conversationId });
      return response.body;
    } catch (error) {
      logger.error('Failed to get Intercom conversation', {
        integration: 'intercom',
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create conversation (send message to user)
   */
  async createConversation(conversationData: {
    from: { type: 'admin'; id: string };
    to: { type: 'user'; id: string };
    body: string;
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Intercom client not connected');
    }

    try {
      const response = await this.client.messages.create(conversationData);

      logger.info('Intercom conversation created', {
        integration: 'intercom',
        conversationId: response.body.id
      });

      return response.body;
    } catch (error) {
      logger.error('Failed to create Intercom conversation', {
        integration: 'intercom',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Reply to conversation
   */
  async replyToConversation(conversationId: string, reply: {
    type: 'admin';
    admin_id: string;
    message_type: 'comment' | 'note';
    body: string;
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Intercom client not connected');
    }

    try {
      const response = await this.client.conversations.reply({
        id: conversationId,
        ...reply
      });

      logger.info('Replied to Intercom conversation', {
        integration: 'intercom',
        conversationId
      });

      return response.body;
    } catch (error) {
      logger.error('Failed to reply to Intercom conversation', {
        integration: 'intercom',
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update conversation state
   */
  async updateConversation(conversationId: string, updates: {
    state?: 'open' | 'closed' | 'snoozed';
    assignee_id?: string;
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Intercom client not connected');
    }

    try {
      const response = await this.client.conversations.update({
        id: conversationId,
        ...updates
      });

      logger.info('Intercom conversation updated', {
        integration: 'intercom',
        conversationId
      });

      return response.body;
    } catch (error) {
      logger.error('Failed to update Intercom conversation', {
        integration: 'intercom',
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get users from Intercom
   */
  async getUsers(options?: { segment?: string }): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('Intercom client not connected');
    }

    try {
      const response = await this.client.users.list(options);
      return response.body.users || [];
    } catch (error) {
      logger.error('Failed to get Intercom users', {
        integration: 'intercom',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create or update user
   */
  async createOrUpdateUser(userData: {
    email?: string;
    user_id?: string;
    name?: string;
    custom_attributes?: Record<string, any>;
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Intercom client not connected');
    }

    try {
      const response = await this.client.users.create(userData);

      logger.info('Intercom user created/updated', {
        integration: 'intercom',
        email: userData.email,
        userId: userData.user_id
      });

      return response.body;
    } catch (error) {
      logger.error('Failed to create/update Intercom user', {
        integration: 'intercom',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
