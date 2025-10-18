import { VectorDBService, VectorDocument } from './vector-db.service.js';
import { AIRouterService, AIMessage } from './ai-router.service.js';
import { logger } from '../logger.service.js';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationSummary {
  conversationId: string;
  summary: string;
  messageCount: number;
  startTime: Date;
  endTime: Date;
}

export interface MemoryConfig {
  vectorDB: VectorDBService;
  aiRouter: AIRouterService;
  shortTermLimit?: number;
  summarizationThreshold?: number;
  enableLongTerm?: boolean;
}

/**
 * AI Memory Service
 * Manages short-term (session) and long-term (persistent) memory
 */
export class MemoryService {
  private config: Required<MemoryConfig>;
  private vectorDB: VectorDBService;
  private aiRouter: AIRouterService;

  // Short-term memory (in-memory)
  private shortTermMemory: Map<string, ConversationMessage[]> = new Map();

  // Conversation summaries
  private summaries: Map<string, ConversationSummary> = new Map();

  constructor(config: MemoryConfig) {
    this.config = {
      vectorDB: config.vectorDB,
      aiRouter: config.aiRouter,
      shortTermLimit: config.shortTermLimit ?? 20,
      summarizationThreshold: config.summarizationThreshold ?? 50,
      enableLongTerm: config.enableLongTerm ?? true,
    };

    this.vectorDB = config.vectorDB;
    this.aiRouter = config.aiRouter;

    logger.info('Memory service initialized', {
      shortTermLimit: this.config.shortTermLimit,
      longTermEnabled: this.config.enableLongTerm,
    });
  }

  /**
   * Add a message to short-term memory
   */
  async addMessage(
    conversationId: string,
    message: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): Promise<void> {
    const fullMessage: ConversationMessage = {
      id: `${conversationId}_${Date.now()}`,
      timestamp: new Date(),
      ...message,
    };

    // Get or create conversation memory
    const messages = this.shortTermMemory.get(conversationId) || [];
    messages.push(fullMessage);

    // Trim if exceeds limit
    if (messages.length > this.config.shortTermLimit) {
      const removed = messages.splice(0, messages.length - this.config.shortTermLimit);

      // Store removed messages in long-term memory
      if (this.config.enableLongTerm) {
        await this.storeInLongTerm(conversationId, removed);
      }
    }

    this.shortTermMemory.set(conversationId, messages);

    // Check if we should summarize
    const totalMessages = messages.length;
    if (totalMessages >= this.config.summarizationThreshold) {
      await this.summarizeConversation(conversationId);
    }
  }

  /**
   * Get short-term memory for a conversation
   */
  getShortTermMemory(conversationId: string): ConversationMessage[] {
    return this.shortTermMemory.get(conversationId) || [];
  }

  /**
   * Store messages in long-term memory (vector DB)
   */
  private async storeInLongTerm(
    conversationId: string,
    messages: ConversationMessage[]
  ): Promise<void> {
    if (!this.config.enableLongTerm) return;

    logger.info('Storing messages in long-term memory', {
      conversationId,
      count: messages.length,
    });

    const vectorDocs: VectorDocument[] = messages.map(msg => ({
      id: msg.id,
      text: `${msg.role}: ${msg.content}`,
      metadata: {
        conversationId,
        role: msg.role,
        timestamp: msg.timestamp.toISOString(),
        ...msg.metadata,
      },
    }));

    await this.vectorDB.addDocuments(vectorDocs);
  }

  /**
   * Retrieve relevant memories from long-term storage
   */
  async retrieveRelevantMemories(
    conversationId: string,
    query: string,
    limit: number = 5
  ): Promise<ConversationMessage[]> {
    if (!this.config.enableLongTerm) return [];

    logger.info('Retrieving relevant memories', { conversationId, query });

    const results = await this.vectorDB.searchWithFilter(
      query,
      { conversationId },
      { topK: limit }
    );

    return results.map(result => ({
      id: result.id,
      role: result.metadata?.role || 'user',
      content: result.text,
      timestamp: new Date(result.metadata?.timestamp || Date.now()),
      metadata: result.metadata,
    }));
  }

  /**
   * Summarize a conversation
   */
  async summarizeConversation(
    conversationId: string,
    userId?: string
  ): Promise<ConversationSummary> {
    const messages = this.shortTermMemory.get(conversationId) || [];

    if (messages.length === 0) {
      throw new Error('No messages to summarize');
    }

    logger.info('Summarizing conversation', {
      conversationId,
      messageCount: messages.length,
    });

    // Build conversation text
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const aiMessages: AIMessage[] = [
      {
        role: 'system',
        content: 'Summarize the following conversation concisely, capturing key points and context.',
      },
      {
        role: 'user',
        content: conversationText,
      },
    ];

    const response = await this.aiRouter.chat(
      aiMessages,
      { taskType: 'analysis' },
      userId
    );

    const summary: ConversationSummary = {
      conversationId,
      summary: response.content,
      messageCount: messages.length,
      startTime: messages[0].timestamp,
      endTime: messages[messages.length - 1].timestamp,
    };

    this.summaries.set(conversationId, summary);

    // Store summary in long-term memory
    if (this.config.enableLongTerm) {
      await this.vectorDB.addDocuments([
        {
          id: `${conversationId}_summary_${Date.now()}`,
          text: `Conversation Summary: ${response.content}`,
          metadata: {
            conversationId,
            type: 'summary',
            messageCount: messages.length,
            startTime: summary.startTime.toISOString(),
            endTime: summary.endTime.toISOString(),
          },
        },
      ]);
    }

    return summary;
  }

  /**
   * Get conversation summary
   */
  getSummary(conversationId: string): ConversationSummary | undefined {
    return this.summaries.get(conversationId);
  }

  /**
   * Get personalized context for user
   */
  async getPersonalizedContext(
    userId: string,
    currentQuery: string,
    limit: number = 5
  ): Promise<string> {
    if (!this.config.enableLongTerm) return '';

    // Search for relevant past interactions
    const results = await this.vectorDB.searchWithFilter(
      currentQuery,
      { userId },
      { topK: limit }
    );

    if (results.length === 0) return '';

    const context = results
      .map((r, i) => `[Past interaction ${i + 1}]: ${r.text}`)
      .join('\n');

    return `Relevant past context:\n${context}`;
  }

  /**
   * Build conversation context with memory
   */
  async buildContextWithMemory(
    conversationId: string,
    currentMessage: string,
    includeRelevantMemories: boolean = true
  ): Promise<AIMessage[]> {
    const messages: AIMessage[] = [];

    // Add recent short-term memory
    const shortTerm = this.getShortTermMemory(conversationId);
    messages.push(
      ...shortTerm.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }))
    );

    // Add relevant long-term memories
    if (includeRelevantMemories && this.config.enableLongTerm) {
      const relevant = await this.retrieveRelevantMemories(
        conversationId,
        currentMessage,
        3
      );

      if (relevant.length > 0) {
        const memoryContext = relevant
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');

        // Insert before current message
        messages.push({
          role: 'system',
          content: `Relevant past context:\n${memoryContext}`,
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    return messages;
  }

  /**
   * Clear short-term memory for a conversation
   */
  clearShortTermMemory(conversationId: string): void {
    this.shortTermMemory.delete(conversationId);
    logger.info('Short-term memory cleared', { conversationId });
  }

  /**
   * Clear all memory for a user (GDPR compliance)
   */
  async clearUserMemory(userId: string): Promise<void> {
    // Clear short-term
    for (const [convId, messages] of this.shortTermMemory.entries()) {
      if (messages.some(m => m.metadata?.userId === userId)) {
        this.shortTermMemory.delete(convId);
      }
    }

    // Clear long-term would require vector DB support for bulk delete by filter
    // await this.vectorDB.deleteByFilter({ userId });

    logger.info('User memory cleared', { userId });
  }

  /**
   * Export memory for a user (GDPR compliance)
   */
  async exportUserMemory(userId: string): Promise<any> {
    const shortTerm: any[] = [];

    for (const [convId, messages] of this.shortTermMemory.entries()) {
      const userMessages = messages.filter(m => m.metadata?.userId === userId);
      if (userMessages.length > 0) {
        shortTerm.push({
          conversationId: convId,
          messages: userMessages,
        });
      }
    }

    return {
      shortTermMemory: shortTerm,
      exportDate: new Date().toISOString(),
    };
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    activeConversations: number;
    totalMessages: number;
    totalSummaries: number;
  } {
    let totalMessages = 0;
    for (const messages of this.shortTermMemory.values()) {
      totalMessages += messages.length;
    }

    return {
      activeConversations: this.shortTermMemory.size,
      totalMessages,
      totalSummaries: this.summaries.size,
    };
  }
}

export default MemoryService;
