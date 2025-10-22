/**
 * ChatGPT Context Manager
 *
 * Tracks conversation context, user preferences, and recent actions
 * for ChatGPT Custom GPT users. Enables:
 * - Conversational continuity
 * - Personalized responses
 * - Smart recommendations based on history
 * - User preference storage
 */

import { logger } from '../../utils/logger.js';

export interface UserContext {
  userId: string;
  createdAt: Date;
  lastActive: Date;
  conversationHistory: ConversationEntry[];
  preferences: UserPreferences;
  recentActions: ActionHistory[];
  sessionData: Record<string, any>;
}

export interface ConversationEntry {
  timestamp: Date;
  action: string;
  module: string;
  params: any;
  result?: any;
  error?: string;
}

export interface UserPreferences {
  favoriteModules?: string[];
  defaultParams?: Record<string, any>;
  notificationSettings?: {
    jobCompletion?: boolean;
    errors?: boolean;
  };
  outputFormat?: 'detailed' | 'concise';
}

export interface ActionHistory {
  timestamp: Date;
  action: string;
  module: string;
  success: boolean;
  duration?: number;
}

class ContextManager {
  private contexts: Map<string, UserContext> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CONTEXT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_HISTORY_LENGTH = 50;

  constructor() {
    // Cleanup old contexts every hour
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
    logger.info('Context manager initialized');
  }

  /**
   * Get or create user context
   */
  getContext(userId: string): UserContext {
    let context = this.contexts.get(userId);

    if (!context) {
      context = this.createContext(userId);
      this.contexts.set(userId, context);
      logger.info(`Created new context for user: ${userId}`);
    } else {
      // Update last active
      context.lastActive = new Date();
    }

    return context;
  }

  /**
   * Create new user context
   */
  private createContext(userId: string): UserContext {
    return {
      userId,
      createdAt: new Date(),
      lastActive: new Date(),
      conversationHistory: [],
      preferences: {
        outputFormat: 'detailed',
        notificationSettings: {
          jobCompletion: true,
          errors: true,
        },
      },
      recentActions: [],
      sessionData: {},
    };
  }

  /**
   * Add action to conversation history
   */
  addToHistory(
    userId: string,
    action: string,
    module: string,
    params: any,
    result?: any,
    error?: string
  ): void {
    const context = this.getContext(userId);

    const entry: ConversationEntry = {
      timestamp: new Date(),
      action,
      module,
      params,
      result,
      error,
    };

    context.conversationHistory.push(entry);

    // Limit history length
    if (context.conversationHistory.length > this.MAX_HISTORY_LENGTH) {
      context.conversationHistory.shift();
    }

    // Add to recent actions
    context.recentActions.push({
      timestamp: new Date(),
      action: `${module}.${action}`,
      module,
      success: !error,
    });

    // Limit recent actions
    if (context.recentActions.length > 20) {
      context.recentActions.shift();
    }

    logger.debug(`Added action to history for user ${userId}: ${module}.${action}`);
  }

  /**
   * Get conversation history
   */
  getHistory(userId: string, limit?: number): ConversationEntry[] {
    const context = this.contexts.get(userId);
    if (!context) {
      return [];
    }

    const history = context.conversationHistory;
    if (limit) {
      return history.slice(-limit);
    }

    return history;
  }

  /**
   * Get recent actions
   */
  getRecentActions(userId: string, limit: number = 10): ActionHistory[] {
    const context = this.contexts.get(userId);
    if (!context) {
      return [];
    }

    return context.recentActions.slice(-limit);
  }

  /**
   * Update user preferences
   */
  updatePreferences(userId: string, preferences: Partial<UserPreferences>): void {
    const context = this.getContext(userId);
    context.preferences = {
      ...context.preferences,
      ...preferences,
    };

    logger.info(`Updated preferences for user ${userId}`);
  }

  /**
   * Get user preferences
   */
  getPreferences(userId: string): UserPreferences {
    const context = this.getContext(userId);
    return context.preferences;
  }

  /**
   * Set session data
   */
  setSessionData(userId: string, key: string, value: any): void {
    const context = this.getContext(userId);
    context.sessionData[key] = value;
  }

  /**
   * Get session data
   */
  getSessionData(userId: string, key: string): any {
    const context = this.contexts.get(userId);
    return context?.sessionData[key];
  }

  /**
   * Clear session data
   */
  clearSessionData(userId: string, key?: string): void {
    const context = this.contexts.get(userId);
    if (!context) {
      return;
    }

    if (key) {
      delete context.sessionData[key];
    } else {
      context.sessionData = {};
    }
  }

  /**
   * Get user statistics
   */
  getUserStats(userId: string): {
    totalActions: number;
    successRate: number;
    favoriteModule: string | null;
    mostUsedActions: Array<{ action: string; count: number }>;
    sessionDuration: number;
  } {
    const context = this.contexts.get(userId);
    if (!context) {
      return {
        totalActions: 0,
        successRate: 0,
        favoriteModule: null,
        mostUsedActions: [],
        sessionDuration: 0,
      };
    }

    const totalActions = context.recentActions.length;
    const successfulActions = context.recentActions.filter((a) => a.success).length;
    const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0;

    // Calculate favorite module
    const moduleCounts = new Map<string, number>();
    for (const action of context.recentActions) {
      moduleCounts.set(action.module, (moduleCounts.get(action.module) || 0) + 1);
    }
    const favoriteModule = moduleCounts.size > 0
      ? Array.from(moduleCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Calculate most used actions
    const actionCounts = new Map<string, number>();
    for (const action of context.recentActions) {
      actionCounts.set(action.action, (actionCounts.get(action.action) || 0) + 1);
    }
    const mostUsedActions = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    // Calculate session duration
    const sessionDuration = Date.now() - context.createdAt.getTime();

    return {
      totalActions,
      successRate: Math.round(successRate * 100) / 100,
      favoriteModule,
      mostUsedActions,
      sessionDuration,
    };
  }

  /**
   * Get smart recommendations based on user history
   */
  getRecommendations(userId: string): string[] {
    const context = this.contexts.get(userId);
    if (!context || context.recentActions.length === 0) {
      return [
        'Try generating music with /actions/music/generate',
        'Check your marketing metrics with /actions/marketing/metrics',
        'Analyze user sentiment with /actions/engagement/sentiment',
      ];
    }

    const recommendations: string[] = [];
    const stats = this.getUserStats(userId);

    // Recommend based on favorite module
    if (stats.favoriteModule === 'music') {
      recommendations.push('You seem to love music! Try analyzing a track with /actions/music/analyze');
    } else if (stats.favoriteModule === 'marketing') {
      recommendations.push('Want to forecast growth? Use /actions/marketing/growth-analysis');
    } else if (stats.favoriteModule === 'engagement') {
      recommendations.push('Identify at-risk users with /actions/engagement/churn');
    }

    // Recommend complementary actions
    const lastAction = context.recentActions[context.recentActions.length - 1];
    if (lastAction?.action === 'music.generate') {
      recommendations.push('Validate your generated music with /actions/music/validate');
    } else if (lastAction?.action === 'engagement.churn') {
      recommendations.push('Create a re-engagement campaign with /actions/engagement/re-engage');
    }

    // Recommend testing if many actions
    if (context.recentActions.length > 10) {
      recommendations.push('Run a health check to ensure everything is working well: /actions/testing/health');
    }

    return recommendations.slice(0, 3);
  }

  /**
   * Clear user context
   */
  clearContext(userId: string): boolean {
    const deleted = this.contexts.delete(userId);
    if (deleted) {
      logger.info(`Cleared context for user: ${userId}`);
    }
    return deleted;
  }

  /**
   * Cleanup old contexts
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, context] of this.contexts.entries()) {
      const age = now - context.lastActive.getTime();
      if (age > this.CONTEXT_TTL) {
        this.contexts.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old user contexts`);
    }
  }

  /**
   * Get all active users
   */
  getActiveUsers(): string[] {
    return Array.from(this.contexts.keys());
  }

  /**
   * Get context statistics
   */
  getStats(): {
    totalUsers: number;
    totalConversations: number;
    totalActions: number;
    averageSessionDuration: number;
  } {
    let totalConversations = 0;
    let totalActions = 0;
    let totalSessionDuration = 0;

    for (const context of this.contexts.values()) {
      totalConversations += context.conversationHistory.length;
      totalActions += context.recentActions.length;
      totalSessionDuration += Date.now() - context.createdAt.getTime();
    }

    const totalUsers = this.contexts.size;
    const averageSessionDuration = totalUsers > 0 ? totalSessionDuration / totalUsers : 0;

    return {
      totalUsers,
      totalConversations,
      totalActions,
      averageSessionDuration: Math.round(averageSessionDuration / 1000), // Convert to seconds
    };
  }

  /**
   * Shutdown context manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.info('Context manager shut down');
  }
}

// Singleton instance
export const contextManager = new ContextManager();
