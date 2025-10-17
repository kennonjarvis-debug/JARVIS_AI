/**
 * Shared types for conversation storage
 */

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

export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  messagesBySource: Record<MessageSource, number>;
  oldestConversation?: Date | null;
  newestConversation?: Date | null;
}

/**
 * Unified interface for conversation storage backends
 */
export interface IConversationStore {
  /**
   * Initialize the store
   */
  initialize(): Promise<void>;

  /**
   * Get or create a conversation
   */
  getOrCreateConversation(conversationId: string): Promise<Conversation> | Conversation;

  /**
   * Add a message to a conversation
   */
  addMessage(message: Message): Promise<void> | void;

  /**
   * Get a conversation by ID
   */
  getConversation(conversationId: string): Promise<Conversation | null> | (Conversation | null);

  /**
   * Get recent messages from a conversation
   */
  getRecentMessages(conversationId: string, limit?: number): Promise<Message[]> | Message[];

  /**
   * Get all conversations
   */
  getAllConversations(): Promise<Conversation[]> | Conversation[];

  /**
   * Search conversations
   */
  searchConversations(query: string): Promise<Conversation[]> | Conversation[];

  /**
   * Update participant connection status
   */
  updateParticipantStatus(
    conversationId: string,
    source: 'desktop' | 'web' | 'iphone',
    connected: boolean
  ): Promise<void> | void;

  /**
   * Delete a conversation
   */
  deleteConversation(conversationId: string): Promise<void>;

  /**
   * Clear all conversations
   */
  clearAll(): Promise<void>;

  /**
   * Get storage statistics
   */
  getStats(): Promise<ConversationStats> | ConversationStats;

  /**
   * Health check (optional for file-based)
   */
  healthCheck?(): Promise<boolean> | boolean;

  /**
   * Force save all (for file-based stores)
   */
  saveAll?(): Promise<void>;
}
