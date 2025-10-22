/**
 * Proactive Agent - Main Orchestrator
 */

import { EventEmitter } from 'events';
import { ProactiveSuggestion, UserInteraction, WorkContext, ProactiveConfig } from './types';
import { adaptiveEngine } from './adaptive-engine-v2';
import { contextMonitor } from './context-monitor';
import { timingIntelligence } from './timing-intelligence';
import { anticipationEngine } from './anticipation-engine';
import { notificationScheduler } from './notification-scheduler';

export class ProactiveAgent extends EventEmitter {
  private static instance: ProactiveAgent;
  private config: ProactiveConfig = {
    enabled: true,
    maxNotificationsPerHour: 5,
    maxNotificationsPerDay: 20,
    minTimeBetweenNotifications: 15,
    respectDoNotDisturb: true,
    learningEnabled: true,
    confidenceThreshold: 0.6
  };
  private isRunning = false;

  private constructor() {
    super();
    this.setupEventListeners();
  }

  static getInstance(): ProactiveAgent {
    if (!ProactiveAgent.instance) {
      ProactiveAgent.instance = new ProactiveAgent();
    }
    return ProactiveAgent.instance;
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Proactive agent already running');
      return;
    }

    console.log('🚀 Starting Jarvis Proactive Agent...');
    this.isRunning = true;

    await adaptiveEngine.learnTimingPatterns();

    console.log('✅ Proactive agent started - Jarvis is now anticipating your needs');
    this.emit('started');
  }

  stop() {
    console.log('🛑 Stopping proactive agent');
    this.isRunning = false;
    this.emit('stopped');
  }

  private setupEventListeners() {
    anticipationEngine.on('suggestions', (suggestions: ProactiveSuggestion[]) => {
      this.handleNewSuggestions(suggestions);
    });

    contextMonitor.on('contextChange', ({ old, new: newContext }) => {
      console.log(`🔄 Context changed: ${old?.type || 'none'} → ${newContext.type}`);
      anticipationEngine.generateSuggestions();
      this.emit('contextChanged', { old, new: newContext });
    });

    notificationScheduler.on('notificationReady', (notification) => {
      this.emit('showNotification', notification);
    });
  }

  async trackInteraction(interaction: UserInteraction) {
    if (!this.config.learningEnabled) return;

    await adaptiveEngine.trackInteraction(interaction);
    contextMonitor.trackActivity(interaction);
    this.emit('interactionTracked', interaction);
  }

  private handleNewSuggestions(suggestions: ProactiveSuggestion[]) {
    const qualified = suggestions.filter(s => s.confidence >= this.config.confidenceThreshold);
    
    for (const suggestion of qualified) {
      const notifId = notificationScheduler.scheduleFromSuggestion(suggestion);
      console.log(`📋 Scheduled: ${suggestion.title}`);
    }

    if (qualified.length > 0) {
      this.emit('suggestionsGenerated', qualified);
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      config: this.config,
      context: contextMonitor.getCurrentContext(),
      activeSuggestions: anticipationEngine.getActiveSuggestions().length,
      pendingNotifications: notificationScheduler.getPendingNotifications().length,
      timingStats: timingIntelligence.getStats(),
      insights: adaptiveEngine.getSystemInsights()
    };
  }

  getActiveSuggestions(): ProactiveSuggestion[] {
    return anticipationEngine.getActiveSuggestions();
  }

  provideFeedback(suggestionId: string, feedbackType: 'positive' | 'negative' | 'dismissed' | 'acted_upon') {
    if (feedbackType === 'dismissed' || feedbackType === 'negative') {
      anticipationEngine.dismissSuggestion(suggestionId);
    } else {
      anticipationEngine.actOnSuggestion(suggestionId);
    }

    adaptiveEngine.recordLearning({
      recordId: `learning-${Date.now()}`,
      suggestionId,
      outcomeType: feedbackType === 'positive' || feedbackType === 'acted_upon' ? 'positive' : 'negative',
      impactScore: feedbackType === 'acted_upon' ? 100 : 0,
      learnings: [],
      timestamp: new Date(),
      appliedToModel: true
    });

    this.emit('feedbackProvided', { suggestionId, feedbackType });
  }
}

export const proactiveAgent = ProactiveAgent.getInstance();
export default ProactiveAgent;
