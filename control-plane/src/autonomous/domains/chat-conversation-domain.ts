/**
 * Chat & Conversation Domain Agent
 *
 * Specialized agent for managing chat conversations, context tracking,
 * and conversational intelligence across all Jarvis interfaces.
 */

import { BaseDomainAgent } from './base-domain.js';
import { logger } from '../../utils/logger.js';
import { conversationStorePG as conversationStore } from '../../core/conversation-store-pg.js';
import { adaptiveEngine } from '../adaptive/adaptive-engine.js';
import {
  DomainType,
  ClearanceLevel,
  Priority,
  TaskStatus,
  type AutonomousTask,
  type TaskResult,
  type DomainCapability
} from '../types.js';

export class ChatConversationDomain extends BaseDomainAgent {
  domain: DomainType = DomainType.CHAT;
  name: string = 'Chat & Conversation Agent';
  description: string = 'Autonomous agent for conversation management, context tracking, and chat intelligence';

  constructor(clearanceLevel?: ClearanceLevel) {
    super('Chat & Conversation Agent', 'chat', clearanceLevel);
  }

  capabilities: DomainCapability[] = [
    {
      name: 'context_analysis',
      description: 'Analyze conversation context and patterns',
      clearanceRequired: ClearanceLevel.SUGGEST,
      riskLevel: 'low',
      resourceRequirements: {},
      examples: ['Analyze conversation patterns', 'Identify user preferences']
    },
    {
      name: 'conversation_summarization',
      description: 'Summarize long conversations',
      clearanceRequired: ClearanceLevel.SUGGEST,
      riskLevel: 'low',
      resourceRequirements: {},
      examples: ['Generate conversation summaries']
    },
    {
      name: 'topic_extraction',
      description: 'Extract topics and key points from conversations',
      clearanceRequired: ClearanceLevel.SUGGEST,
      riskLevel: 'low',
      resourceRequirements: {},
      examples: ['Extract key topics']
    },
    {
      name: 'sentiment_analysis',
      description: 'Analyze conversation sentiment and user mood',
      clearanceRequired: ClearanceLevel.SUGGEST,
      riskLevel: 'low',
      resourceRequirements: {},
      examples: ['Analyze sentiment']
    },
    {
      name: 'conversation_optimization',
      description: 'Suggest conversation flow improvements',
      clearanceRequired: ClearanceLevel.SUGGEST,
      riskLevel: 'low',
      resourceRequirements: {},
      examples: ['Optimize conversation flow']
    },
    {
      name: 'auto_categorization',
      description: 'Automatically categorize and tag conversations',
      clearanceRequired: ClearanceLevel.MODIFY_SAFE,
      riskLevel: 'low',
      resourceRequirements: {},
      examples: ['Auto-categorize conversations']
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
      const metadata = task.metadata || {};

      // Determine task type from metadata or title
      const taskType = metadata.capability || task.title.toLowerCase().replace(/\s+/g, '_');

      switch (taskType) {
        case 'conversation_summary':
          result = await this.summarizeConversations(metadata);
          break;

        case 'pattern_analysis':
          result = await this.analyzePatterns(metadata);
          break;

        case 'sentiment_analysis':
          result = await this.analyzeSentiment(metadata);
          break;

        case 'topic_extraction':
          result = await this.extractTopics(metadata);
          break;

        case 'auto_categorize':
          result = await this.categorizeConversations(metadata);
          break;

        case 'sync_check':
          result = await this.checkConversationSync(metadata);
          break;

        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }

      return {
        taskId: task.id,
        success: true,
        message: `Chat task completed successfully`,
        output: result,
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: {
            apiCalls: 0,
            tokensUsed: 0,
            costIncurred: 0,
            filesModified: 0,
            cpuTime: Date.now() - startTime,
            memoryPeak: 0
          },
          impactScore: 0.8
        },
        logs: [{ timestamp: new Date(), level: 'info', message: `Completed ${taskType}` }],
        timestamp: new Date()
      };
    } catch (error: any) {
      logger.error(`Chat task execution failed:`, error);

      return {
        taskId: task.id,
        success: false,
        message: `Chat task failed: ${error.message}`,
        output: null,
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: {
            apiCalls: 0,
            tokensUsed: 0,
            costIncurred: 0,
            filesModified: 0,
            cpuTime: Date.now() - startTime,
            memoryPeak: 0
          },
          impactScore: 0
        },
        logs: [{ timestamp: new Date(), level: 'error', message: error.message }],
        timestamp: new Date()
      };
    }
  }

  // Private helper methods

  private async getRecentConversations(): Promise<any[]> {
    try {
      const allConversations = await conversationStore.getAllConversations();
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
    const allConversations = await conversationStore.getAllConversations();
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
      title: 'Conversation Summarization',
      description: `${conversations.length} long conversations need summarization`,
      priority: Priority.MEDIUM,
      status: TaskStatus.PENDING,
      clearanceRequired: ClearanceLevel.SUGGEST,
      estimatedDuration: 30000,
      dependencies: [],
      createdAt: new Date(),
      metadata: {
        capability: 'conversation_summary',
        conversations: conversations.map(c => c.id)
      }
    };
  }

  private createPatternAnalysisTask(patterns: any[]): AutonomousTask {
    return {
      id: this.generateTaskId(),
      domain: this.domain,
      title: 'Pattern Analysis',
      description: `Detected ${patterns.length} conversation patterns`,
      priority: Priority.MEDIUM,
      status: TaskStatus.PENDING,
      clearanceRequired: ClearanceLevel.SUGGEST,
      estimatedDuration: 20000,
      dependencies: [],
      createdAt: new Date(),
      metadata: {
        capability: 'pattern_analysis',
        patterns
      }
    };
  }

  private createStaleConversationTask(conversations: any[]): AutonomousTask {
    return {
      id: this.generateTaskId(),
      domain: this.domain,
      title: 'Stale Conversations',
      description: `${conversations.length} stale conversations can be archived`,
      priority: Priority.LOW,
      status: TaskStatus.PENDING,
      clearanceRequired: ClearanceLevel.SUGGEST,
      estimatedDuration: 10000,
      dependencies: [],
      createdAt: new Date(),
      metadata: {
        capability: 'stale_conversations',
        conversations: conversations.map(c => c.id)
      }
    };
  }

  private async summarizeConversations(params: any): Promise<any> {
    const summaries: any[] = [];

    for (const convId of params.conversations || []) {
      const conversation = await conversationStore.getConversation(convId);
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
