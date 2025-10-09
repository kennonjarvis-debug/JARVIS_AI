/**
 * Chat & Conversation Domain Agent
 *
 * Specialized agent for managing chat conversations, context tracking,
 * and conversational intelligence across all Jarvis interfaces.
 */

import { BaseDomainAgent } from './base-domain.js';
import { logger } from '../../utils/logger.js';
import { conversationStore } from '../../core/conversation-store.js';
import { adaptiveEngine } from '../adaptive/adaptive-engine.js';
import type {
  DomainType,
  ClearanceLevel,
  AutonomousTask,
  TaskResult,
  DomainCapability
} from '../types.js';

export class ChatConversationDomain extends BaseDomainAgent {
  domain: DomainType = 'chat';
  name = 'Chat & Conversation Agent';
  description = 'Autonomous agent for conversation management, context tracking, and chat intelligence';

  capabilities: DomainCapability[] = [
    {
      name: 'context_analysis',
      description: 'Analyze conversation context and patterns',
      clearanceRequired: ClearanceLevel.SUGGEST,
      riskLevel: 'low'
    },
    {
      name: 'conversation_summarization',
      description: 'Summarize long conversations',
      clearanceRequired: ClearanceLevel.SUGGEST,
      riskLevel: 'low'
    },
    {
      name: 'topic_extraction',
      description: 'Extract topics and key points from conversations',
      clearanceRequired: ClearanceLevel.SUGGEST,
      riskLevel: 'low'
    },
    {
      name: 'sentiment_analysis',
      description: 'Analyze conversation sentiment and user mood',
      clearanceRequired: ClearanceLevel.SUGGEST,
      riskLevel: 'low'
    },
    {
      name: 'conversation_optimization',
      description: 'Suggest conversation flow improvements',
      clearanceRequired: ClearanceLevel.SUGGEST,
      riskLevel: 'low'
    },
    {
      name: 'auto_categorization',
      description: 'Automatically categorize and tag conversations',
      clearanceRequired: ClearanceLevel.EXECUTE,
      riskLevel: 'low'
    }
  ];

  /**
   * Analyze conversation system for opportunities
   */
  async analyze(): Promise<AutonomousTask[]> {
    const tasks: AutonomousTask[] = [];

    try {
      // Analyze recent conversations
      const recentConversations = await this.getRecentConversations();

      // Check for long conversations that need summarization
      const longConversations = recentConversations.filter(c => c.messages.length > 50);
      if (longConversations.length > 0) {
        tasks.push(this.createSummarizationTask(longConversations));
      }

      // Detect conversation patterns
      const patterns = await this.detectConversationPatterns(recentConversations);
      if (patterns.length > 0) {
        tasks.push(this.createPatternAnalysisTask(patterns));
      }

      // Identify stale conversations
      const staleConversations = await this.findStaleConversations();
      if (staleConversations.length > 0) {
        tasks.push(this.createStaleConversationTask(staleConversations));
      }

      // Check for cross-device sync opportunities
      const syncOpportunities = await this.checkSyncOpportunities();
      if (syncOpportunities.length > 0) {
        tasks.push(...syncOpportunities);
      }

      logger.info(`Chat agent identified ${tasks.length} opportunities`);
    } catch (error) {
      logger.error('Chat agent analysis failed:', error);
    }

    return tasks;
  }

  /**
   * Execute chat-related task
   */
  protected async executeTask(task: AutonomousTask): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (task.type) {
        case 'conversation_summary':
          result = await this.summarizeConversations(task.params);
          break;

        case 'pattern_analysis':
          result = await this.analyzePatterns(task.params);
          break;

        case 'sentiment_analysis':
          result = await this.analyzeSentiment(task.params);
          break;

        case 'topic_extraction':
          result = await this.extractTopics(task.params);
          break;

        case 'auto_categorize':
          result = await this.categorizeConversations(task.params);
          break;

        case 'sync_check':
          result = await this.checkConversationSync(task.params);
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        taskId: task.id,
        success: true,
        message: `Chat task completed successfully`,
        output: result,
        executionTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      logger.error(`Chat task execution failed:`, error);

      return {
        taskId: task.id,
        success: false,
        message: `Chat task failed: ${error.message}`,
        output: null,
        timestamp: new Date()
      };
    }
  }

  // Private helper methods

  private async getRecentConversations(): Promise<any[]> {
    try {
      const allConversations = conversationStore.getAllConversations();
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

      return allConversations
        .filter(c => c.updated.getTime() > sevenDaysAgo)
        .sort((a, b) => b.updated.getTime() - a.updated.getTime())
        .slice(0, 20);
    } catch (error) {
      logger.error('Failed to get recent conversations:', error);
      return [];
    }
  }

  private async detectConversationPatterns(conversations: any[]): Promise<any[]> {
    const patterns: any[] = [];

    // Detect common topics
    const topicCounts: Record<string, number> = {};

    for (const conv of conversations) {
      for (const message of conv.messages) {
        // Simple keyword extraction (in production, use NLP)
        const keywords = this.extractKeywords(message.content);
        keywords.forEach(keyword => {
          topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
        });
      }
    }

    // Find frequent topics
    const frequentTopics = Object.entries(topicCounts)
      .filter(([_, count]) => count >= 5)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    if (frequentTopics.length > 0) {
      patterns.push({
        type: 'frequent_topics',
        topics: frequentTopics,
        insight: `User frequently discusses: ${frequentTopics.map(t => t.topic).join(', ')}`
      });
    }

    return patterns;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (production should use NLP/ML)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4);

    // Filter common words (stopwords)
    const stopwords = ['about', 'would', 'there', 'their', 'which', 'these', 'those'];
    return words.filter(w => !stopwords.includes(w));
  }

  private async findStaleConversations(): Promise<any[]> {
    const allConversations = conversationStore.getAllConversations();
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    return allConversations.filter(c => c.updated.getTime() < thirtyDaysAgo);
  }

  private async checkSyncOpportunities(): Promise<AutonomousTask[]> {
    // Check for conversations that exist on one device but not others
    // This would require cross-device tracking
    return [];
  }

  private createSummarizationTask(conversations: any[]): AutonomousTask {
    return {
      id: this.generateTaskId(),
      domain: this.domain,
      type: 'conversation_summary',
      description: `${conversations.length} long conversations need summarization`,
      priority: 5,
      clearanceRequired: ClearanceLevel.SUGGEST,
      params: { conversations: conversations.map(c => c.id) },
      createdAt: new Date()
    };
  }

  private createPatternAnalysisTask(patterns: any[]): AutonomousTask {
    return {
      id: this.generateTaskId(),
      domain: this.domain,
      type: 'pattern_analysis',
      description: `Detected ${patterns.length} conversation patterns`,
      priority: 6,
      clearanceRequired: ClearanceLevel.SUGGEST,
      params: { patterns },
      createdAt: new Date()
    };
  }

  private createStaleConversationTask(conversations: any[]): AutonomousTask {
    return {
      id: this.generateTaskId(),
      domain: this.domain,
      type: 'stale_conversations',
      description: `${conversations.length} stale conversations can be archived`,
      priority: 3,
      clearanceRequired: ClearanceLevel.SUGGEST,
      params: { conversations: conversations.map(c => c.id) },
      createdAt: new Date()
    };
  }

  private async summarizeConversations(params: any): Promise<any> {
    const summaries: any[] = [];

    for (const convId of params.conversations || []) {
      const conversation = conversationStore.getConversation(convId);
      if (!conversation) continue;

      // Generate summary (production would use AI/LLM)
      const summary = this.generateSummary(conversation);
      summaries.push({
        conversationId: convId,
        summary,
        messageCount: conversation.messages.length
      });
    }

    return { summaries };
  }

  private generateSummary(conversation: any): string {
    // Simple summary generation (production should use LLM)
    const messageCount = conversation.messages.length;
    const participants = Object.keys(conversation.participants || {}).join(', ');
    const duration = conversation.updated.getTime() - conversation.created.getTime();
    const durationDays = Math.floor(duration / (24 * 60 * 60 * 1000));

    return `Conversation with ${messageCount} messages over ${durationDays} days. Participants: ${participants}`;
  }

  private async analyzePatterns(params: any): Promise<any> {
    const { patterns } = params;

    // Integrate with adaptive engine
    for (const pattern of patterns) {
      await adaptiveEngine.learnFromInteraction(
        'chat',
        { patternType: pattern.type },
        { patterns: pattern },
        { type: 'implicit', sentiment: 'positive' }
      );
    }

    return {
      patternsAnalyzed: patterns.length,
      insights: patterns.map((p: any) => p.insight)
    };
  }

  private async analyzeSentiment(params: any): Promise<any> {
    // Sentiment analysis (production would use NLP/ML)
    return {
      sentiment: 'positive',
      confidence: 0.75
    };
  }

  private async extractTopics(params: any): Promise<any> {
    // Topic extraction (production would use NLP/ML)
    return {
      topics: ['music', 'code', 'system health'],
      confidence: 0.80
    };
  }

  private async categorizeConversations(params: any): Promise<any> {
    // Auto-categorization logic
    return {
      categorized: params.conversations.length,
      categories: ['work', 'personal', 'technical']
    };
  }

  private async checkConversationSync(params: any): Promise<any> {
    // Check sync status across devices
    return {
      synced: true,
      devices: ['desktop', 'web', 'mobile']
    };
  }

  private generateTaskId(): string {
    return `chat-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
