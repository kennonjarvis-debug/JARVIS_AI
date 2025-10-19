/**
 * iMessage Integration
 * Access and send iMessages on macOS
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as os from 'os';
import { BaseIntegration, type IntegrationConfig } from '../base/index.js';
import { MessageSender } from './message-sender.js';
import type { IMessage } from './types.js';

export interface IMessageSendParams {
  phoneNumber: string;
  message: string;
}

export interface IMessageResult {
  success: boolean;
  messageId: string;
  sentAt: string;
}

/**
 * iMessage integration for reading and sending messages
 */
export class IMessageIntegration extends BaseIntegration {
  private sender!: MessageSender;
  private dbPath: string;

  constructor(config: IntegrationConfig) {
    super(config);
    this.dbPath = path.join(os.homedir(), 'Library', 'Messages', 'chat.db');
  }

  get name(): string {
    return 'imessage';
  }

  get displayName(): string {
    return 'iMessage';
  }

  /**
   * Initialize iMessage integration
   */
  async initialize(): Promise<void> {
    try {
      // Check if database exists
      const dbExists = await this.testConnection();

      if (!dbExists) {
        throw new Error('iMessage database not accessible - Full Disk Access required');
      }

      // Initialize message sender
      this.sender = new MessageSender();

      this.isInitialized = true;
      this.logger.info('iMessage integration initialized');

      await this.updateStatus('connected');
    } catch (error) {
      this.logger.error('Failed to initialize iMessage integration', error);
      await this.updateStatus('error', error instanceof Error ? error.message : 'Initialization failed');
      throw error;
    }
  }

  /**
   * Test iMessage connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to open the database
      const db = new Database(this.dbPath, { readonly: true, fileMustExist: true });
      db.close();
      return true;
    } catch (error) {
      this.logger.error('iMessage database not accessible', error);
      return false;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.isInitialized = false;
    await this.updateStatus('disconnected');
    this.logger.info('iMessage integration disconnected');
  }

  /**
   * Send an iMessage
   */
  async sendMessage(params: IMessageSendParams): Promise<IMessageResult> {
    if (!this.isInitialized) {
      throw new Error('iMessage integration not initialized');
    }

    try {
      const result = await this.sender.sendWithRetry(params.phoneNumber, params.message);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      await this.logActivity({
        activityType: 'message',
        action: 'sent',
        title: `Sent iMessage to ${params.phoneNumber}`,
        description: params.message.substring(0, 100),
        metadata: { phoneNumber: params.phoneNumber },
        status: 'success',
      });

      return {
        success: true,
        messageId: Date.now().toString(),
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to send iMessage', error);

      await this.logActivity({
        activityType: 'message',
        action: 'sent',
        title: `Failed to send iMessage to ${params.phoneNumber}`,
        description: error instanceof Error ? error.message : 'Unknown error',
        metadata: { phoneNumber: params.phoneNumber },
        status: 'failed',
      });

      throw error;
    }
  }

  /**
   * Get recent messages from iMessage database
   */
  async getRecentMessages(limit: number = 10): Promise<IMessage[]> {
    if (!this.isInitialized) {
      throw new Error('iMessage integration not initialized');
    }

    const db = new Database(this.dbPath, { readonly: true });

    try {
      const query = `
        SELECT
          m.ROWID as id,
          m.text,
          m.date,
          m.is_from_me,
          h.id as handle
        FROM message m
        JOIN handle h ON m.handle_id = h.ROWID
        WHERE m.text IS NOT NULL
        ORDER BY m.date DESC
        LIMIT ?
      `;

      const messages = db.prepare(query).all(limit) as any[];

      return messages.map((msg) => ({
        id: msg.id,
        text: msg.text,
        handle: msg.handle,
        isFromMe: msg.is_from_me === 1,
        date: new Date(msg.date / 1000000 + 978307200000), // Convert Apple timestamp
      }));
    } finally {
      db.close();
    }
  }
}
