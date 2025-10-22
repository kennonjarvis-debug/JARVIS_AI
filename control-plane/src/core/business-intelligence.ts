/**
 * Business Intelligence Service
 *
 * Tracks and analyzes business metrics for JARVIS:
 * - AI API usage and costs (OpenAI, Anthropic, Gemini)
 * - User sessions and activity
 * - Request/error rates
 * - Revenue tracking
 */

import { ConversationStore, Message } from './conversation-store.js';

export interface AIUsageRecord {
  model: 'openai' | 'anthropic' | 'gemini';
  timestamp: Date;
  tokensUsed: number;
  estimatedCost: number;
  conversationId: string;
  messageId: string;
}

export interface SessionRecord {
  sessionId: string;
  userId?: string;
  source: 'desktop' | 'web' | 'chatgpt' | 'iphone';
  startTime: Date;
  endTime?: Date;
  messageCount: number;
}

export interface RequestRecord {
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  error?: string;
}

export interface BusinessIntelligence {
  aiUsage: {
    totalCalls: number;
    totalCost: number;
    byModel: {
      openai: { calls: number; cost: number; tokens: number };
      anthropic: { calls: number; cost: number; tokens: number };
      gemini: { calls: number; cost: number; tokens: number };
    };
  };
  users: {
    totalSessions: number;
    activeSessions: number;
    activeUsers: number;
    newUsers: number;
    bySource: {
      desktop: number;
      web: number;
      chatgpt: number;
      iphone: number;
    };
  };
  requests: {
    total: number;
    requestsPerMinute: number;
    errorRate: number;
    avgResponseTime: number;
  };
  timestamp: Date;
}

export class BusinessIntelligenceService {
  private aiUsageRecords: AIUsageRecord[] = [];
  private sessionRecords: Map<string, SessionRecord> = new Map();
  private requestRecords: RequestRecord[] = [];
  private conversationStore: ConversationStore | null = null;

  // Pricing per 1M tokens (approximate)
  private readonly PRICING = {
    openai: { input: 2.50, output: 10.00 }, // GPT-4o
    anthropic: { input: 3.00, output: 15.00 }, // Claude Sonnet
    gemini: { input: 0.075, output: 0.30 } // Gemini 1.5 Flash
  };

  constructor() {
    // Clean up old records every hour
    setInterval(() => this.cleanupOldRecords(), 3600000);
  }

  /**
   * Set conversation store for tracking
   */
  setConversationStore(store: ConversationStore): void {
    this.conversationStore = store;
  }

  /**
   * Track AI API usage
   */
  trackAIUsage(
    model: 'openai' | 'anthropic' | 'gemini',
    tokensUsed: number,
    conversationId: string,
    messageId: string
  ): void {
    // Estimate cost (assuming 50/50 input/output split)
    const pricing = this.PRICING[model];
    const inputTokens = Math.floor(tokensUsed * 0.5);
    const outputTokens = Math.ceil(tokensUsed * 0.5);
    const estimatedCost =
      (inputTokens / 1000000) * pricing.input +
      (outputTokens / 1000000) * pricing.output;

    this.aiUsageRecords.push({
      model,
      timestamp: new Date(),
      tokensUsed,
      estimatedCost,
      conversationId,
      messageId
    });
  }

  /**
   * Track user session
   */
  trackSession(
    sessionId: string,
    source: 'desktop' | 'web' | 'chatgpt' | 'iphone',
    userId?: string
  ): void {
    if (!this.sessionRecords.has(sessionId)) {
      this.sessionRecords.set(sessionId, {
        sessionId,
        userId,
        source,
        startTime: new Date(),
        messageCount: 0
      });
    }
  }

  /**
   * Update session with message
   */
  updateSession(sessionId: string): void {
    const session = this.sessionRecords.get(sessionId);
    if (session) {
      session.messageCount++;
      session.endTime = new Date();
    }
  }

  /**
   * End session
   */
  endSession(sessionId: string): void {
    const session = this.sessionRecords.get(sessionId);
    if (session) {
      session.endTime = new Date();
    }
  }

  /**
   * Track HTTP request
   */
  trackRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    error?: string
  ): void {
    this.requestRecords.push({
      timestamp: new Date(),
      endpoint,
      method,
      statusCode,
      responseTime,
      error
    });
  }

  /**
   * Get business intelligence snapshot
   */
  getSnapshot(timeWindowMinutes: number = 60): BusinessIntelligence {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindowMinutes * 60000);

    // AI Usage
    const recentAIUsage = this.aiUsageRecords.filter(
      r => r.timestamp >= windowStart
    );

    const aiUsage = {
      totalCalls: recentAIUsage.length,
      totalCost: recentAIUsage.reduce((sum, r) => sum + r.estimatedCost, 0),
      byModel: {
        openai: this.getModelStats(recentAIUsage, 'openai'),
        anthropic: this.getModelStats(recentAIUsage, 'anthropic'),
        gemini: this.getModelStats(recentAIUsage, 'gemini')
      }
    };

    // User Sessions
    const recentSessions = Array.from(this.sessionRecords.values()).filter(
      s => s.startTime >= windowStart
    );

    const activeSessions = recentSessions.filter(
      s => !s.endTime || s.endTime >= new Date(now.getTime() - 300000) // Active in last 5 min
    );

    const users = {
      totalSessions: recentSessions.length,
      activeSessions: activeSessions.length,
      activeUsers: new Set(activeSessions.map(s => s.userId).filter(Boolean))
        .size,
      newUsers: 0, // Would need user database integration
      bySource: {
        desktop: recentSessions.filter(s => s.source === 'desktop').length,
        web: recentSessions.filter(s => s.source === 'web').length,
        chatgpt: recentSessions.filter(s => s.source === 'chatgpt').length,
        iphone: recentSessions.filter(s => s.source === 'iphone').length
      }
    };

    // Request Stats
    const recentRequests = this.requestRecords.filter(
      r => r.timestamp >= windowStart
    );

    const errorRequests = recentRequests.filter(
      r => r.statusCode >= 400
    );

    const requests = {
      total: recentRequests.length,
      requestsPerMinute: recentRequests.length / timeWindowMinutes,
      errorRate:
        recentRequests.length > 0
          ? errorRequests.length / recentRequests.length
          : 0,
      avgResponseTime:
        recentRequests.length > 0
          ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) /
            recentRequests.length
          : 0
    };

    return {
      aiUsage,
      users,
      requests,
      timestamp: now
    };
  }

  /**
   * Get stats for specific model
   */
  private getModelStats(
    records: AIUsageRecord[],
    model: 'openai' | 'anthropic' | 'gemini'
  ): { calls: number; cost: number; tokens: number } {
    const modelRecords = records.filter(r => r.model === model);

    return {
      calls: modelRecords.length,
      cost: modelRecords.reduce((sum, r) => sum + r.estimatedCost, 0),
      tokens: modelRecords.reduce((sum, r) => sum + r.tokensUsed, 0)
    };
  }

  /**
   * Get daily summary
   */
  getDailySummary(): BusinessIntelligence {
    return this.getSnapshot(1440); // 24 hours
  }

  /**
   * Get weekly summary
   */
  getWeeklySummary(): BusinessIntelligence {
    return this.getSnapshot(10080); // 7 days
  }

  /**
   * Cleanup old records (keep last 7 days)
   */
  private cleanupOldRecords(): void {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Cleanup AI usage records
    this.aiUsageRecords = this.aiUsageRecords.filter(
      r => r.timestamp >= sevenDaysAgo
    );

    // Cleanup request records
    this.requestRecords = this.requestRecords.filter(
      r => r.timestamp >= sevenDaysAgo
    );

    // Cleanup old sessions
    for (const [sessionId, session] of this.sessionRecords.entries()) {
      if (
        session.endTime &&
        session.endTime < sevenDaysAgo
      ) {
        this.sessionRecords.delete(sessionId);
      }
    }

    console.log('[BusinessIntelligence] Cleaned up old records');
  }

  /**
   * Get top insights
   */
  getInsights(timeWindowMinutes: number = 60): string[] {
    const snapshot = this.getSnapshot(timeWindowMinutes);
    const insights: string[] = [];

    // AI Usage insights
    if (snapshot.aiUsage.totalCalls > 0) {
      insights.push(
        `${snapshot.aiUsage.totalCalls} AI API calls in last ${timeWindowMinutes}min ($${snapshot.aiUsage.totalCost.toFixed(2)})`
      );

      const mostUsedModel = Object.entries(snapshot.aiUsage.byModel)
        .sort((a, b) => b[1].calls - a[1].calls)[0];
      if (mostUsedModel && mostUsedModel[1].calls > 0) {
        insights.push(
          `Most used AI: ${mostUsedModel[0]} (${mostUsedModel[1].calls} calls)`
        );
      }
    }

    // User insights
    if (snapshot.users.activeSessions > 0) {
      insights.push(
        `${snapshot.users.activeSessions} active sessions (${snapshot.users.totalSessions} total)`
      );

      const mostUsedSource = Object.entries(snapshot.users.bySource)
        .sort((a, b) => b[1] - a[1])[0];
      if (mostUsedSource && mostUsedSource[1] > 0) {
        insights.push(
          `Most active source: ${mostUsedSource[0]} (${mostUsedSource[1]} sessions)`
        );
      }
    }

    // Request insights
    if (snapshot.requests.total > 0) {
      insights.push(
        `${snapshot.requests.total} requests (${snapshot.requests.requestsPerMinute.toFixed(1)}/min)`
      );

      if (snapshot.requests.errorRate > 0.05) {
        insights.push(
          `  High error rate: ${(snapshot.requests.errorRate * 100).toFixed(1)}%`
        );
      }
    }

    return insights;
  }
}

// Export singleton instance
export const businessIntelligence = new BusinessIntelligenceService();
