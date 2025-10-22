/**
 * iMessage Database Monitor
 * Monitors ~/Library/Messages/chat.db for new messages
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { IMessage } from './types.js';
import { logger } from '../../utils/logger.js';

export class IMessageDatabaseMonitor extends EventEmitter {
  private db: Database.Database;
  private dbPath: string;
  private lastMessageId: number = 0;
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    super();
    this.dbPath = path.join(os.homedir(), 'Library', 'Messages', 'chat.db');
  }

  /**
   * Start monitoring for new messages
   */
  start(intervalMs: number = 2000): void {
    if (this.isRunning) {
      logger.warn('iMessage monitor already running');
      return;
    }

    try {
      // Open database in read-only mode
      this.db = new Database(this.dbPath, { readonly: true, fileMustExist: true });

      // Get the latest message ID to start from
      this.lastMessageId = this.getLatestMessageId();

      logger.info('iMessage monitor started', { lastMessageId: this.lastMessageId });

      this.isRunning = true;

      // Poll for new messages
      this.pollInterval = setInterval(() => {
        this.checkForNewMessages();
      }, intervalMs);

      // Emit ready event
      this.emit('ready');
    } catch (error) {
      logger.error('Failed to start iMessage monitor', { error });
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.db) {
      this.db.close();
    }

    this.isRunning = false;
    logger.info('iMessage monitor stopped');
    this.emit('stopped');
  }

  /**
   * Get the latest message ID in the database
   */
  private getLatestMessageId(): number {
    try {
      const result = this.db.prepare('SELECT MAX(ROWID) as maxId FROM message').get() as { maxId: number };
      return result?.maxId || 0;
    } catch (error) {
      logger.error('Failed to get latest message ID', { error });
      return 0;
    }
  }

  /**
   * Check for new messages since last poll
   */
  private checkForNewMessages(): void {
    try {
      const query = `
        SELECT
          m.ROWID as id,
          m.guid,
          m.text,
          h.id as handle,
          m.is_from_me as isFromMe,
          m.date as dateCreated,
          m.date_read as dateRead,
          m.service as serviceName,
          m.cache_roomnames as chatId
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        WHERE m.ROWID > ?
          AND m.text IS NOT NULL
          AND m.text != ''
        ORDER BY m.ROWID ASC
        LIMIT 100
      `;

      const messages = this.db.prepare(query).all(this.lastMessageId) as any[];

      for (const row of messages) {
        // Convert macOS timestamp to JavaScript Date
        // macOS uses seconds since 2001-01-01, JS uses milliseconds since 1970-01-01
        const message: IMessage = {
          id: row.id,
          guid: row.guid,
          text: row.text,
          handle: row.handle || 'unknown',
          isFromMe: row.isFromMe === 1,
          dateCreated: new Date(row.dateCreated / 1000000 + 978307200000),
          dateRead: row.dateRead ? new Date(row.dateRead / 1000000 + 978307200000) : null,
          serviceName: row.serviceName || 'iMessage',
          chatId: row.chatId,
        };

        // Update last message ID
        this.lastMessageId = Math.max(this.lastMessageId, message.id);

        // Only emit messages that are NOT from me (incoming messages)
        if (!message.isFromMe) {
          this.emit('message', message);
          logger.debug('New message detected', {
            handle: message.handle,
            preview: message.text.substring(0, 50),
          });
        }
      }
    } catch (error) {
      logger.error('Error checking for new messages', { error });
      this.emit('error', error);
    }
  }

  /**
   * Get recent messages from a specific contact
   */
  getRecentMessages(handle: string, limit: number = 10): IMessage[] {
    try {
      const query = `
        SELECT
          m.ROWID as id,
          m.guid,
          m.text,
          h.id as handle,
          m.is_from_me as isFromMe,
          m.date as dateCreated,
          m.date_read as dateRead,
          m.service as serviceName,
          m.cache_roomnames as chatId
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        WHERE h.id = ?
          AND m.text IS NOT NULL
          AND m.text != ''
        ORDER BY m.date DESC
        LIMIT ?
      `;

      const messages = this.db.prepare(query).all(handle, limit) as any[];

      return messages.map(row => ({
        id: row.id,
        guid: row.guid,
        text: row.text,
        handle: row.handle,
        isFromMe: row.isFromMe === 1,
        dateCreated: new Date(row.dateCreated / 1000000 + 978307200000),
        dateRead: row.dateRead ? new Date(row.dateRead / 1000000 + 978307200000) : null,
        serviceName: row.serviceName || 'iMessage',
        chatId: row.chatId,
      })).reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Failed to get recent messages', { error, handle });
      return [];
    }
  }

  /**
   * Get all unique contacts
   */
  getAllContacts(): string[] {
    try {
      const query = `
        SELECT DISTINCT h.id as handle
        FROM handle h
        JOIN message m ON m.handle_id = h.ROWID
        WHERE h.id IS NOT NULL
        ORDER BY h.id
      `;

      const results = this.db.prepare(query).all() as Array<{ handle: string }>;
      return results.map(r => r.handle);
    } catch (error) {
      logger.error('Failed to get all contacts', { error });
      return [];
    }
  }
}
