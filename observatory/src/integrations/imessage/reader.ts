import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import { Logger } from '../../utils/logger';
import path from 'path';
import os from 'os';

export interface IMessage {
  id: number;
  guid: string;
  text: string;
  handle: string;
  handleName: string;
  isFromMe: boolean;
  date: Date;
  chatId: string;
  attachments: string[];
}

export class IMessageReader extends EventEmitter {
  private db: Database.Database | null = null;
  private logger: Logger;
  private watcher: chokidar.FSWatcher | null = null;
  private lastSeenRowId: number = 0;
  private dbPath: string;
  private polling: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = new Logger('IMessageReader');

    // Path to iMessage database on macOS
    this.dbPath = path.join(
      os.homedir(),
      'Library',
      'Messages',
      'chat.db'
    );
  }

  public async start(): Promise<void> {
    try {
      // Connect to iMessage database (read-only)
      this.db = new Database(this.dbPath, { readonly: true });
      this.logger.info('Connected to iMessage database', { path: this.dbPath });

      // Get the latest message ID to avoid processing old messages
      this.lastSeenRowId = this.getLatestRowId();
      this.logger.info('Starting from message ID', { rowId: this.lastSeenRowId });

      // Watch for changes to the database
      this.startWatching();

      this.emit('ready');
    } catch (error) {
      this.logger.error('Failed to start iMessage reader', error);
      throw error;
    }
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.logger.info('iMessage reader stopped');
  }

  private startWatching(): void {
    // Use polling instead of file watching for better reliability with SQLite
    this.polling = true;
    this.pollInterval = setInterval(() => {
      this.checkForNewMessages();
    }, 2000); // Check every 2 seconds

    this.logger.info('Started polling for new messages');
  }

  private checkForNewMessages(): void {
    if (!this.db) return;

    try {
      const newMessages = this.getMessagesAfter(this.lastSeenRowId);

      if (newMessages.length > 0) {
        this.logger.info('New messages detected', { count: newMessages.length });

        for (const message of newMessages) {
          // Only emit messages not from me (incoming messages)
          if (!message.isFromMe) {
            this.emit('message', message);
          }

          // Update last seen ID
          if (message.id > this.lastSeenRowId) {
            this.lastSeenRowId = message.id;
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking for new messages', error);
    }
  }

  private getLatestRowId(): number {
    if (!this.db) return 0;

    try {
      const row = this.db.prepare(`
        SELECT MAX(ROWID) as maxId FROM message
      `).get() as { maxId: number };

      return row?.maxId || 0;
    } catch (error) {
      this.logger.error('Failed to get latest row ID', error);
      return 0;
    }
  }

  private getMessagesAfter(rowId: number): IMessage[] {
    if (!this.db) return [];

    try {
      const query = `
        SELECT
          m.ROWID as id,
          m.guid,
          m.text,
          m.is_from_me,
          m.date,
          m.cache_roomnames,
          h.id as handle,
          h.uncanonicalized_id as handle_name,
          c.chat_identifier as chat_id
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        LEFT JOIN chat c ON cmj.chat_id = c.ROWID
        WHERE m.ROWID > ?
          AND m.text IS NOT NULL
          AND m.text != ''
        ORDER BY m.ROWID ASC
        LIMIT 100
      `;

      const rows = this.db.prepare(query).all(rowId) as any[];

      return rows.map(row => this.parseMessage(row));
    } catch (error) {
      this.logger.error('Failed to get messages', error);
      return [];
    }
  }

  private parseMessage(row: any): IMessage {
    // Convert Apple's weird date format (nanoseconds since 2001-01-01)
    const appleEpoch = new Date('2001-01-01T00:00:00Z').getTime();
    const messageDate = new Date(appleEpoch + (row.date / 1000000));

    return {
      id: row.id,
      guid: row.guid,
      text: row.text || '',
      handle: row.handle || 'unknown',
      handleName: row.handle_name || row.handle || 'unknown',
      isFromMe: Boolean(row.is_from_me),
      date: messageDate,
      chatId: row.chat_id || '',
      attachments: [] // TODO: Parse attachments if needed
    };
  }

  public getRecentMessages(limit: number = 50): IMessage[] {
    if (!this.db) return [];

    try {
      const query = `
        SELECT
          m.ROWID as id,
          m.guid,
          m.text,
          m.is_from_me,
          m.date,
          h.id as handle,
          h.uncanonicalized_id as handle_name,
          c.chat_identifier as chat_id
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        LEFT JOIN chat c ON cmj.chat_id = c.ROWID
        WHERE m.text IS NOT NULL
          AND m.text != ''
        ORDER BY m.ROWID DESC
        LIMIT ?
      `;

      const rows = this.db.prepare(query).all(limit) as any[];
      return rows.map(row => this.parseMessage(row)).reverse();
    } catch (error) {
      this.logger.error('Failed to get recent messages', error);
      return [];
    }
  }

  public getConversationHistory(handle: string, limit: number = 20): IMessage[] {
    if (!this.db) return [];

    try {
      const query = `
        SELECT
          m.ROWID as id,
          m.guid,
          m.text,
          m.is_from_me,
          m.date,
          h.id as handle,
          h.uncanonicalized_id as handle_name,
          c.chat_identifier as chat_id
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        LEFT JOIN chat c ON cmj.chat_id = c.ROWID
        WHERE (h.id = ? OR h.uncanonicalized_id = ?)
          AND m.text IS NOT NULL
          AND m.text != ''
        ORDER BY m.ROWID DESC
        LIMIT ?
      `;

      const rows = this.db.prepare(query).all(handle, handle, limit) as any[];
      return rows.map(row => this.parseMessage(row)).reverse();
    } catch (error) {
      this.logger.error('Failed to get conversation history', error);
      return [];
    }
  }
}
