/**
 * PostgreSQL-backed Conversation Store
 *
 * Stores conversations in PostgreSQL database
 * Best for: production, multi-instance deployments, full-text search
 */

import { pool } from '../../db/pool.js';
import { logger } from '../../utils/logger.js';
import type {
  IConversationStore,
  MessageSource,
  MessageRole,
  Message,
  Conversation,
  ConversationStats,
} from './types.js';

export class PostgreSQLConversationStore implements IConversationStore {
  private initialized = false;

  /**
   * Initialize store - ensure database schema exists
   */
  async initialize(): Promise<void> {
    try {
      const { testConnection, initializeSchema } = await import(
        '../../db/pool.js'
      );

      // Test connection
      const connected = await testConnection();
      if (!connected) {
        throw new Error('Failed to connect to database');
      }

      // Initialize schema if needed
      await initializeSchema();

      this.initialized = true;
      logger.info('📚 PostgreSQL Conversation Store initialized');
    } catch (error) {
      logger.error(
        'Failed to initialize PostgreSQL conversation store:',
        error
      );
      throw error;
    }
  }

  /**
   * Get or create conversation
   */
  async getOrCreateConversation(conversationId: string): Promise<Conversation> {
    const existing = await this.getConversation(conversationId);
    if (existing) {
      return existing;
    }

    // Create new conversation
    const query = `
      INSERT INTO conversations (id, metadata, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [conversationId, {}]);

    return {
      id: result.rows[0].id,
      messages: [],
      participants: {},
      metadata: result.rows[0].metadata || {},
      created: result.rows[0].created_at,
      updated: result.rows[0].updated_at,
    };
  }

  /**
   * Add message to conversation
   */
  async addMessage(message: Message): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Ensure conversation exists
      await this.getOrCreateConversation(message.conversationId);

      // Insert message
      const messageQuery = `
        INSERT INTO messages (id, conversation_id, role, content, source, context, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await client.query(messageQuery, [
        message.id,
        message.conversationId,
        message.role,
        message.content,
        message.source,
        message.context || {},
        message.timestamp,
      ]);

      // Update conversation timestamp
      await client.query(
        `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
        [message.conversationId]
      );

      // Update participant status
      if (message.source !== 'chatgpt') {
        await this.updateParticipantStatusInternal(
          message.conversationId,
          message.source as 'desktop' | 'web' | 'iphone',
          true,
          client
        );
      }

      await client.query('COMMIT');

      logger.debug(`💾 Saved message to database: ${message.id}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to add message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      // Get conversation metadata
      const convQuery = `SELECT * FROM conversations WHERE id = $1`;
      const convResult = await pool.query(convQuery, [conversationId]);

      if (convResult.rows.length === 0) {
        return null;
      }

      const conv = convResult.rows[0];

      // Get messages
      const messagesQuery = `
        SELECT * FROM messages
        WHERE conversation_id = $1
        ORDER BY timestamp ASC
      `;
      const messagesResult = await pool.query(messagesQuery, [conversationId]);

      const messages: Message[] = messagesResult.rows.map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role as MessageRole,
        content: row.content,
        source: row.source as MessageSource,
        context: row.context || {},
        timestamp: row.timestamp,
      }));

      // Get participants
      const participantsQuery = `
        SELECT * FROM participants
        WHERE conversation_id = $1
      `;
      const participantsResult = await pool.query(participantsQuery, [
        conversationId,
      ]);

      const participants: Conversation['participants'] = {};

      for (const row of participantsResult.rows) {
        const source = row.source as MessageSource;
        if (source === 'chatgpt') {
          participants.chatgpt = { lastUsed: row.last_seen };
        } else {
          participants[source as 'desktop' | 'web' | 'iphone'] = {
            connected: row.connected,
            lastSeen: row.last_seen,
          };
        }
      }

      return {
        id: conv.id,
        messages,
        participants,
        metadata: conv.metadata || {},
        created: conv.created_at,
        updated: conv.updated_at,
      };
    } catch (error) {
      logger.error(`Failed to get conversation ${conversationId}:`, error);
      return null;
    }
  }

  /**
   * Get recent messages
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 50
  ): Promise<Message[]> {
    try {
      const query = `
        SELECT * FROM messages
        WHERE conversation_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [conversationId, limit]);

      return result.rows
        .map((row) => ({
          id: row.id,
          conversationId: row.conversation_id,
          role: row.role as MessageRole,
          content: row.content,
          source: row.source as MessageSource,
          context: row.context || {},
          timestamp: row.timestamp,
        }))
        .reverse(); // Reverse to get chronological order
    } catch (error) {
      logger.error('Failed to get recent messages:', error);
      return [];
    }
  }

  /**
   * Get all conversations
   */
  async getAllConversations(): Promise<Conversation[]> {
    try {
      const query = `
        SELECT * FROM conversations
        ORDER BY updated_at DESC
      `;

      const result = await pool.query(query);

      // Get full conversation data for each
      const conversations = await Promise.all(
        result.rows.map((row) => this.getConversation(row.id))
      );

      return conversations.filter((c) => c !== null) as Conversation[];
    } catch (error) {
      logger.error('Failed to get all conversations:', error);
      return [];
    }
  }

  /**
   * Search conversations using full-text search
   */
  async searchConversations(query: string): Promise<Conversation[]> {
    try {
      const searchQuery = `
        SELECT DISTINCT c.*
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE
          to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
          OR c.metadata->>'title' ILIKE $2
          OR c.metadata->>'summary' ILIKE $2
        ORDER BY c.updated_at DESC
        LIMIT 50
      `;

      const result = await pool.query(searchQuery, [query, `%${query}%`]);

      // Get full conversation data for each
      const conversations = await Promise.all(
        result.rows.map((row) => this.getConversation(row.id))
      );

      return conversations.filter((c) => c !== null) as Conversation[];
    } catch (error) {
      logger.error('Failed to search conversations:', error);
      return [];
    }
  }

  /**
   * Update participant connection status
   */
  async updateParticipantStatus(
    conversationId: string,
    source: 'desktop' | 'web' | 'iphone',
    connected: boolean
  ): Promise<void> {
    await this.updateParticipantStatusInternal(
      conversationId,
      source,
      connected,
      pool
    );
  }

  /**
   * Internal participant update (accepts client or pool)
   */
  private async updateParticipantStatusInternal(
    conversationId: string,
    source: 'desktop' | 'web' | 'iphone',
    connected: boolean,
    executor: any
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO participants (conversation_id, source, connected, last_seen)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (conversation_id, source)
        DO UPDATE SET
          connected = $3,
          last_seen = NOW()
      `;

      await executor.query(query, [conversationId, source, connected]);

      // Update conversation timestamp
      await executor.query(
        `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
        [conversationId]
      );
    } catch (error) {
      logger.error('Failed to update participant status:', error);
      throw error;
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Messages and participants are deleted automatically via CASCADE
      const query = `DELETE FROM conversations WHERE id = $1`;
      await pool.query(query, [conversationId]);

      logger.info(`🗑️  Deleted conversation ${conversationId}`);
    } catch (error) {
      logger.error(
        `Failed to delete conversation ${conversationId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Clear all conversations
   */
  async clearAll(): Promise<void> {
    try {
      await pool.query('TRUNCATE conversations CASCADE');
      logger.info('🗑️  Cleared all conversations');
    } catch (error) {
      logger.error('Failed to clear conversations:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<ConversationStats> {
    try {
      const statsQuery = `
        SELECT
          (SELECT COUNT(*) FROM conversations) as total_conversations,
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT json_object_agg(source, count)
           FROM (
             SELECT source, COUNT(*) as count
             FROM messages
             GROUP BY source
           ) counts
          ) as messages_by_source,
          (SELECT MIN(created_at) FROM conversations) as oldest_conversation,
          (SELECT MAX(created_at) FROM conversations) as newest_conversation
      `;

      const result = await pool.query(statsQuery);
      const stats = result.rows[0];

      return {
        totalConversations: parseInt(stats.total_conversations),
        totalMessages: parseInt(stats.total_messages),
        messagesBySource: stats.messages_by_source || {},
        oldestConversation: stats.oldest_conversation,
        newestConversation: stats.newest_conversation,
      };
    } catch (error) {
      logger.error('Failed to get stats:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        messagesBySource: {} as Record<MessageSource, number>,
        oldestConversation: null,
        newestConversation: null,
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}
