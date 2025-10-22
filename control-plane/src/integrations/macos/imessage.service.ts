/**
 * iMessage Integration Service for macOS
 *
 * Provides automation for reading and sending iMessages on macOS.
 * Requires Full Disk Access permission to read chat.db
 *
 * Features:
 * - Read incoming messages from chat.db
 * - Send messages via AppleScript
 * - Monitor messages in real-time using FSEvents
 * - Parse message metadata (sender, timestamp, attachments)
 * - AI-powered auto-response
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface iMessage {
  id: number;
  guid: string;
  text: string | null;
  sender: string;
  recipient: string;
  date: Date;
  isFromMe: boolean;
  chatId: number;
  attachments: string[];
  service: 'iMessage' | 'SMS';
}

export interface iMessageConfig {
  autoResponse?: boolean;
  watchInterval?: number;
  aiProvider?: 'openai' | 'anthropic' | 'gemini';
  responsePrompt?: string;
}

export class iMessageService extends EventEmitter {
  private db: Database.Database | null = null;
  private watcher: any = null;
  private config: iMessageConfig;
  private lastMessageId: number = 0;
  private readonly dbPath: string;

  constructor(config: iMessageConfig = {}) {
    super();
    this.config = {
      autoResponse: false,
      watchInterval: 5000,
      aiProvider: 'anthropic',
      responsePrompt: 'You are a helpful assistant. Respond concisely to this message:',
      ...config
    };

    this.dbPath = path.join(os.homedir(), 'Library/Messages/chat.db');
  }

  /**
   * Initialize the iMessage service
   */
  async initialize(): Promise<void> {
    try {
      // Check if chat.db exists
      if (!fs.existsSync(this.dbPath)) {
        throw new Error('iMessage database not found. Ensure Messages app is set up.');
      }

      // Check permissions
      await this.checkPermissions();

      // Connect to database (read-only)
      this.db = new Database(this.dbPath, { readonly: true, fileMustExist: true });

      // Get the latest message ID
      const latest = this.db.prepare('SELECT MAX(ROWID) as id FROM message').get() as { id: number };
      this.lastMessageId = latest.id || 0;

      console.log('[iMessage] Service initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('[iMessage] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Check if the app has Full Disk Access
   */
  private async checkPermissions(): Promise<void> {
    try {
      fs.accessSync(this.dbPath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(
        'Full Disk Access required. Please enable in System Settings > Privacy & Security > Full Disk Access'
      );
    }
  }

  /**
   * Start monitoring for new messages
   */
  startMonitoring(): void {
    if (!this.db) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    // Start polling for new messages
    this.watcher = setInterval(() => {
      this.checkNewMessages();
    }, this.config.watchInterval);

    console.log('[iMessage] Monitoring started');
    this.emit('monitoring_started');
  }

  /**
   * Stop monitoring for new messages
   */
  stopMonitoring(): void {
    if (this.watcher) {
      clearInterval(this.watcher);
      this.watcher = null;
      console.log('[iMessage] Monitoring stopped');
      this.emit('monitoring_stopped');
    }
  }

  /**
   * Check for new messages
   */
  private checkNewMessages(): void {
    if (!this.db) return;

    try {
      const query = `
        SELECT
          m.ROWID as id,
          m.guid,
          m.text,
          m.date,
          m.is_from_me,
          m.service,
          m.cache_roomnames,
          h.id as sender_id,
          c.chat_identifier
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        LEFT JOIN chat c ON cmj.chat_id = c.ROWID
        WHERE m.ROWID > ?
        ORDER BY m.ROWID ASC
      `;

      const newMessages = this.db.prepare(query).all(this.lastMessageId) as any[];

      for (const msg of newMessages) {
        const message = this.parseMessage(msg);
        this.lastMessageId = message.id;

        this.emit('message', message);

        // Auto-respond if enabled and not from me
        if (this.config.autoResponse && !message.isFromMe && message.text) {
          this.handleAutoResponse(message);
        }
      }
    } catch (error) {
      console.error('[iMessage] Error checking new messages:', error);
      this.emit('error', error);
    }
  }

  /**
   * Parse raw message data into iMessage object
   */
  private parseMessage(raw: any): iMessage {
    // iMessage dates are stored as seconds since 2001-01-01
    const macEpoch = new Date('2001-01-01T00:00:00Z').getTime();
    const timestamp = new Date(macEpoch + (raw.date / 1000000));

    return {
      id: raw.id,
      guid: raw.guid,
      text: raw.text,
      sender: raw.sender_id || 'Unknown',
      recipient: raw.chat_identifier || 'Unknown',
      date: timestamp,
      isFromMe: raw.is_from_me === 1,
      chatId: raw.chat_id,
      attachments: [],
      service: raw.service === 'iMessage' ? 'iMessage' : 'SMS'
    };
  }

  /**
   * Send an iMessage using AppleScript
   */
  async sendMessage(recipient: string, message: string): Promise<void> {
    const script = `
      tell application "Messages"
        set targetService to 1st account whose service type = iMessage
        set targetBuddy to participant "${recipient}" of targetService
        send "${message.replace(/"/g, '\\"')}" to targetBuddy
      end tell
    `;

    try {
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      console.log(`[iMessage] Sent message to ${recipient}`);
      this.emit('message_sent', { recipient, message });
    } catch (error) {
      console.error('[iMessage] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send an iMessage to a phone number
   */
  async sendMessageToNumber(phoneNumber: string, message: string): Promise<void> {
    const script = `
      tell application "Messages"
        send "${message.replace(/"/g, '\\"')}" to buddy "${phoneNumber}" of (service 1 whose service type is iMessage)
      end tell
    `;

    try {
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      console.log(`[iMessage] Sent message to ${phoneNumber}`);
      this.emit('message_sent', { recipient: phoneNumber, message });
    } catch (error) {
      console.error('[iMessage] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get recent messages
   */
  getRecentMessages(limit: number = 50): iMessage[] {
    if (!this.db) {
      throw new Error('Service not initialized');
    }

    const query = `
      SELECT
        m.ROWID as id,
        m.guid,
        m.text,
        m.date,
        m.is_from_me,
        m.service,
        h.id as sender_id,
        c.chat_identifier
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      LEFT JOIN chat c ON cmj.chat_id = c.ROWID
      ORDER BY m.ROWID DESC
      LIMIT ?
    `;

    const messages = this.db.prepare(query).all(limit) as any[];
    return messages.map(msg => this.parseMessage(msg));
  }

  /**
   * Search messages by text
   */
  searchMessages(searchTerm: string, limit: number = 50): iMessage[] {
    if (!this.db) {
      throw new Error('Service not initialized');
    }

    const query = `
      SELECT
        m.ROWID as id,
        m.guid,
        m.text,
        m.date,
        m.is_from_me,
        m.service,
        h.id as sender_id,
        c.chat_identifier
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      LEFT JOIN chat c ON cmj.chat_id = c.ROWID
      WHERE m.text LIKE ?
      ORDER BY m.ROWID DESC
      LIMIT ?
    `;

    const messages = this.db.prepare(query).all(`%${searchTerm}%`, limit) as any[];
    return messages.map(msg => this.parseMessage(msg));
  }

  /**
   * Handle auto-response with AI
   */
  private async handleAutoResponse(message: iMessage): Promise<void> {
    try {
      // TODO: Integrate with AI service to generate response
      console.log('[iMessage] Auto-response triggered for:', message.sender);

      // For now, just emit event for external handling
      this.emit('auto_response_needed', message);
    } catch (error) {
      console.error('[iMessage] Auto-response failed:', error);
    }
  }

  /**
   * Close the service and cleanup
   */
  async close(): Promise<void> {
    this.stopMonitoring();

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    console.log('[iMessage] Service closed');
    this.emit('closed');
  }
}

/**
 * Create a singleton instance
 */
export const imessageService = new iMessageService();
