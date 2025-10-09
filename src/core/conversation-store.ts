/**
 * Unified Conversation Store
 *
 * Central persistence for all conversations across:
 * - ChatGPT Custom GPT
 * - JarvisDesktop native app
 * - Dashboard web UI
 * - Future: iPhone app
 *
 * Provides:
 * - Message storage with source tracking
 * - Conversation querying
 * - Participant presence tracking
 * - File-based persistence
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

export type MessageSource = 'desktop' | 'web' | 'chatgpt' | 'iphone';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  source: MessageSource;
  context?: {
    hasScreen?: boolean;
    hasVoice?: boolean;
    appName?: string;
    metadata?: Record<string, any>;
  };
  timestamp: Date;
}

export interface Participant {
  connected: boolean;
  lastSeen: Date;
}

export interface Conversation {
  id: string;
  messages: Message[];
  participants: {
    desktop?: Participant;
    web?: Participant;
    chatgpt?: { lastUsed: Date };
    iphone?: Participant;
  };
  metadata: {
    title?: string;
    summary?: string;
    tags?: string[];
  };
  created: Date;
  updated: Date;
}

export class ConversationStore {
  private conversations: Map<string, Conversation> = new Map();
  private persistencePath: string;
  private savePending: boolean = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(dataDir: string = './.data/conversations') {
    this.persistencePath = path.resolve(dataDir);
  }

  /**
   * Initialize store - load existing conversations
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.persistencePath, { recursive: true });

      const files = await fs.readdir(this.persistencePath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(
            path.join(this.persistencePath, file),
            'utf8'
          );
          const data = JSON.parse(content);

          // Restore dates
          const conversation: Conversation = {
            ...data,
            created: new Date(data.created),
            updated: new Date(data.updated),
            messages: data.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          };

          this.conversations.set(conversation.id, conversation);
        } catch (err) {
          logger.warn(`Failed to load conversation ${file}:`, err);
        }
      }

      logger.info(`📚 Loaded ${this.conversations.size} conversations from disk`);
    } catch (error) {
      logger.error('Failed to initialize conversation store:', error);
      throw error;
    }
  }

  /**
   * Get or create conversation
   */
  getOrCreateConversation(conversationId: string): Conversation {
    if (!this.conversations.has(conversationId)) {
      const conversation: Conversation = {
        id: conversationId,
        messages: [],
        participants: {},
        metadata: {},
        created: new Date(),
        updated: new Date()
      };
      this.conversations.set(conversationId, conversation);
      this.scheduleSave(conversationId);
    }

    return this.conversations.get(conversationId)!;
  }

  /**
   * Add message to conversation
   */
  addMessage(message: Message): void {
    const conversation = this.getOrCreateConversation(message.conversationId);

    conversation.messages.push(message);
    conversation.updated = new Date();

    // Update participant last seen
    const source = message.source;
    if (source === 'desktop' || source === 'web' || source === 'iphone') {
      conversation.participants[source] = {
        connected: true,
        lastSeen: new Date()
      };
    } else if (source === 'chatgpt') {
      conversation.participants.chatgpt = {
        lastUsed: new Date()
      };
    }

    this.scheduleSave(message.conversationId);
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): Conversation | null {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Get recent messages
   */
  getRecentMessages(conversationId: string, limit: number = 50): Message[] {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return [];

    return conversation.messages
      .slice(-limit)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get all conversations
   */
  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updated.getTime() - a.updated.getTime());
  }

  /**
   * Search conversations
   */
  searchConversations(query: string): Conversation[] {
    const lowerQuery = query.toLowerCase();

    return this.getAllConversations().filter(conv => {
      // Search in messages
      const hasMatchingMessage = conv.messages.some(m =>
        m.content.toLowerCase().includes(lowerQuery)
      );

      // Search in metadata
      const hasMatchingMetadata =
        conv.metadata.title?.toLowerCase().includes(lowerQuery) ||
        conv.metadata.summary?.toLowerCase().includes(lowerQuery) ||
        conv.metadata.tags?.some(t => t.toLowerCase().includes(lowerQuery));

      return hasMatchingMessage || hasMatchingMetadata;
    });
  }

  /**
   * Update participant connection status
   */
  updateParticipantStatus(
    conversationId: string,
    source: 'desktop' | 'web' | 'iphone',
    connected: boolean
  ): void {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return;

    if (!conversation.participants[source]) {
      conversation.participants[source] = {
        connected: false,
        lastSeen: new Date()
      };
    }

    conversation.participants[source]!.connected = connected;
    conversation.participants[source]!.lastSeen = new Date();
    conversation.updated = new Date();

    this.scheduleSave(conversationId);
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId);

    try {
      const filePath = path.join(this.persistencePath, `${conversationId}.json`);
      await fs.unlink(filePath);
      logger.info(`🗑️  Deleted conversation ${conversationId}`);
    } catch (error) {
      // File may not exist, that's OK
    }
  }

  /**
   * Clear all conversations
   */
  async clearAll(): Promise<void> {
    this.conversations.clear();

    try {
      const files = await fs.readdir(this.persistencePath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.persistencePath, file));
        }
      }
      logger.info('🗑️  Cleared all conversations');
    } catch (error) {
      logger.error('Failed to clear conversations:', error);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const allMessages = Array.from(this.conversations.values())
      .flatMap(c => c.messages);

    const sourceCount = allMessages.reduce((acc, m) => {
      acc[m.source] = (acc[m.source] || 0) + 1;
      return acc;
    }, {} as Record<MessageSource, number>);

    return {
      totalConversations: this.conversations.size,
      totalMessages: allMessages.length,
      messagesBySource: sourceCount,
      oldestConversation: this.getAllConversations().pop()?.created,
      newestConversation: this.getAllConversations()[0]?.created
    };
  }

  /**
   * Schedule save to disk (debounced)
   */
  private scheduleSave(conversationId: string): void {
    this.savePending = true;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      await this.saveConversation(conversationId);
      this.savePending = false;
    }, 2000); // Save 2 seconds after last change
  }

  /**
   * Save conversation to disk
   */
  private async saveConversation(conversationId: string): Promise<void> {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return;

    try {
      const filePath = path.join(this.persistencePath, `${conversationId}.json`);
      await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
      logger.debug(`💾 Saved conversation ${conversationId}`);
    } catch (error) {
      logger.error(`Failed to save conversation ${conversationId}:`, error);
    }
  }

  /**
   * Force save all conversations
   */
  async saveAll(): Promise<void> {
    const promises = Array.from(this.conversations.keys()).map(id =>
      this.saveConversation(id)
    );

    await Promise.all(promises);
    logger.info('💾 Saved all conversations');
  }
}

// Singleton instance
export const conversationStore = new ConversationStore();
