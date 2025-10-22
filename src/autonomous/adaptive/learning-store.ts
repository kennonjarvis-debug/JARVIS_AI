/**
 * Learning Store
 *
 * Stub implementation for adaptive learning and user preference storage.
 * Tracks user patterns, preferences, and behavioral data for personalization.
 */

import { logger } from '../../utils/logger.js';

export interface UserPreference {
  userId: string;
  feature: string;
  score: number; // 0-1 (0=disliked, 1=liked)
  interactions: number;
  lastUsed: string;
  context?: Record<string, any>;
}

export interface LearningEvent {
  userId: string;
  eventType: string;
  feature: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UserLearningProfile {
  userId: string;
  preferences: UserPreference[];
  totalInteractions: number;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
}

export class LearningStore {
  private profiles: Map<string, UserLearningProfile> = new Map();
  private events: LearningEvent[] = [];

  /**
   * Get or create user learning profile
   */
  async getProfile(userId: string): Promise<UserLearningProfile> {
    if (!this.profiles.has(userId)) {
      const profile: UserLearningProfile = {
        userId,
        preferences: [],
        totalInteractions: 0,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.profiles.set(userId, profile);
      logger.debug(`Created new learning profile for user: ${userId}`);
    }

    return this.profiles.get(userId)!;
  }

  /**
   * Record a learning event
   */
  async recordEvent(event: LearningEvent): Promise<void> {
    this.events.push(event);

    // Update user profile
    const profile = await this.getProfile(event.userId);
    profile.totalInteractions++;
    profile.lastActive = event.timestamp;
    profile.updatedAt = event.timestamp;

    logger.debug(`Recorded learning event: ${event.eventType} for user ${event.userId}`);
  }

  /**
   * Update user preference for a feature
   */
  async updatePreference(userId: string, feature: string, score: number): Promise<void> {
    const profile = await this.getProfile(userId);

    const existingPref = profile.preferences.find(p => p.feature === feature);

    if (existingPref) {
      existingPref.score = score;
      existingPref.interactions++;
      existingPref.lastUsed = new Date().toISOString();
    } else {
      profile.preferences.push({
        userId,
        feature,
        score,
        interactions: 1,
        lastUsed: new Date().toISOString()
      });
    }

    profile.updatedAt = new Date().toISOString();

    logger.debug(`Updated preference for user ${userId}: ${feature} = ${score}`);
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<UserPreference[]> {
    const profile = await this.getProfile(userId);
    return profile.preferences;
  }

  /**
   * Get recent events for a user
   */
  async getEvents(userId: string, limit: number = 100): Promise<LearningEvent[]> {
    return this.events
      .filter(e => e.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear old events (retain last N)
   */
  async pruneEvents(retainCount: number = 1000): Promise<void> {
    if (this.events.length > retainCount) {
      this.events = this.events.slice(-retainCount);
      logger.info(`Pruned learning events, retained ${retainCount}`);
    }
  }

  /**
   * Get all user profiles (for analytics)
   */
  async getAllProfiles(): Promise<UserLearningProfile[]> {
    return Array.from(this.profiles.values());
  }

  /**
   * Export learning data for backup
   */
  async exportData(): Promise<{
    profiles: UserLearningProfile[];
    events: LearningEvent[];
  }> {
    return {
      profiles: Array.from(this.profiles.values()),
      events: this.events
    };
  }

  /**
   * Import learning data from backup
   */
  async importData(data: {
    profiles: UserLearningProfile[];
    events: LearningEvent[];
  }): Promise<void> {
    this.profiles.clear();
    data.profiles.forEach(profile => {
      this.profiles.set(profile.userId, profile);
    });

    this.events = data.events;

    logger.info(`Imported ${data.profiles.length} profiles and ${data.events.length} events`);
  }
}

// Export singleton instance
export const learningStore = new LearningStore();
