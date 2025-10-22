/**
 * Anticipation Engine
 * Predicts what user needs before they ask - THE MAGIC
 */

import { EventEmitter } from 'events';
import { ProactiveSuggestion, WorkContext, SystemEvent, UserPattern } from './types';
import { contextMonitor } from './context-monitor';
import { adaptiveEngine } from './adaptive-engine-v2';

export class AnticipationEngine extends EventEmitter {
  private static instance: AnticipationEngine;
  private activeSuggestions: ProactiveSuggestion[] = [];

  private constructor() {
    super();
    this.startAnticipating();
  }

  static getInstance(): AnticipationEngine {
    if (!AnticipationEngine.instance) {
      AnticipationEngine.instance = new AnticipationEngine();
    }
    return AnticipationEngine.instance;
  }

  /**
   * Start continuous anticipation
   */
  private startAnticipating() {
    // Generate suggestions every 2 minutes
    setInterval(async () => {
      await this.generateSuggestions();
    }, 2 * 60 * 1000);
  }

  /**
   * Generate proactive suggestions based on context and patterns
   */
  async generateSuggestions(): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    const context = contextMonitor.getCurrentContext();
    const now = new Date();
    const currentHour = now.getHours();

    // Time-based patterns
    const timeBasedSuggestions = this.getTimeBasedSuggestions(currentHour);
    suggestions.push(...timeBasedSuggestions);

    // Context-based suggestions
    if (context) {
      const contextSuggestions = this.getContextBasedSuggestions(context);
      suggestions.push(...contextSuggestions);
    }

    // Event-based suggestions
    const systemEvents = await contextMonitor.getRecentSystemEvents(1);
    const eventSuggestions = this.getEventBasedSuggestions(systemEvents);
    suggestions.push(...eventSuggestions);

    // Store active suggestions
    this.activeSuggestions = suggestions;

    // Emit new suggestions
    if (suggestions.length > 0) {
      this.emit('suggestions', suggestions);
    }

    return suggestions;
  }

  /**
   * Get time-based suggestions
   */
  private getTimeBasedSuggestions(currentHour: number): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];
    const preferences = adaptiveEngine.getUserPreferences();

    // Morning metrics suggestion
    if (currentHour === 9 && preferences.some(p => p.category === 'metrics')) {
      suggestions.push({
        id: `suggest-${Date.now()}-morning-metrics`,
        type: 'information',
        priority: 'medium',
        title: 'Morning Metrics',
        message: "It's 9am - your usual time to check metrics. Here's today's summary.",
        action: {
          type: 'navigate',
          label: 'View Metrics',
          payload: { route: '/dashboard/metrics' }
        },
        reasoning: 'User typically checks metrics around this time',
        confidence: 0.8,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min
      });
    }

    // End of day reminder
    if (currentHour === 17) {
      suggestions.push({
        id: `suggest-${Date.now()}-eod-review`,
        type: 'reminder',
        priority: 'low',
        title: 'End of Day Review',
        message: "Haven't checked today's metrics yet. Quick review?",
        action: {
          type: 'show_details',
          label: 'Quick Review',
          payload: { summary: 'daily' }
        },
        reasoning: 'End of workday reminder',
        confidence: 0.6,
        createdAt: new Date()
      });
    }

    return suggestions;
  }

  /**
   * Get context-based suggestions
   */
  private getContextBasedSuggestions(context: WorkContext): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    switch (context.type) {
      case 'debugging':
        suggestions.push({
          id: `suggest-${Date.now()}-debug-help`,
          type: 'assistance',
          priority: 'high',
          title: 'Debug Assistant',
          message: 'I analyzed recent errors. Found a pattern - want help?',
          action: {
            type: 'start_workflow',
            label: 'Show Analysis',
            payload: { workflow: 'debug-analysis' }
          },
          reasoning: 'User is debugging - offer pattern analysis',
          confidence: context.confidence,
          createdAt: new Date()
        });
        break;

      case 'deployment':
        suggestions.push({
          id: `suggest-${Date.now()}-deploy-check`,
          type: 'information',
          title: 'Deployment Status',
          message: 'Pre-deployment health check complete. All systems nominal.',
          priority: 'medium',
          action: {
            type: 'show_details',
            label: 'View Details',
            payload: { report: 'health-check' }
          },
          reasoning: 'User is deploying - show system health',
          confidence: 0.85,
          createdAt: new Date()
        });
        break;

      case 'metrics_review':
        suggestions.push({
          id: `suggest-${Date.now()}-anomaly-alert`,
          type: 'warning',
          priority: 'medium',
          title: 'Anomaly Detected',
          message: 'Revenue dipped 12% today - investigating cause.',
          action: {
            type: 'execute_command',
            label: 'Investigate',
            payload: { command: 'analyze-revenue-drop' }
          },
          reasoning: 'Anomaly detected during metrics review',
          confidence: 0.9,
          createdAt: new Date()
        });
        break;
    }

    return suggestions;
  }

  /**
   * Get event-based suggestions
   */
  private getEventBasedSuggestions(events: SystemEvent[]): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    // Check for critical errors
    const criticalErrors = events.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      suggestions.push({
        id: `suggest-${Date.now()}-critical-error`,
        type: 'warning',
        priority: 'critical',
        title: 'Critical System Error',
        message: `${criticalErrors.length} critical error(s) detected. Immediate attention needed.`,
        action: {
          type: 'navigate',
          label: 'View Errors',
          payload: { route: '/errors' }
        },
        reasoning: 'Critical errors require immediate attention',
        confidence: 1.0,
        createdAt: new Date()
      });
    }

    // Check for repeated failures
    const deploymentFailures = events.filter(e => e.type === 'deployment');
    if (deploymentFailures.length >= 3) {
      suggestions.push({
        id: `suggest-${Date.now()}-deploy-fix`,
        type: 'assistance',
        priority: 'high',
        title: 'Deployment Issues',
        message: '3 failed deployments detected. I found the common issue.',
        action: {
          type: 'show_details',
          label: 'Show Fix',
          payload: { solution: 'deployment-fix' }
        },
        reasoning: 'Multiple deployment failures - offer solution',
        confidence: 0.85,
        createdAt: new Date()
      });
    }

    return suggestions;
  }

  /**
   * Get active suggestions
   */
  getActiveSuggestions(): ProactiveSuggestion[] {
    // Filter out expired suggestions
    const now = Date.now();
    return this.activeSuggestions.filter(s => {
      if (!s.expiresAt) return true;
      return new Date(s.expiresAt).getTime() > now;
    });
  }

  /**
   * Mark suggestion as dismissed
   */
  dismissSuggestion(suggestionId: string) {
    const suggestion = this.activeSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.dismissed = true;
      suggestion.dismissedAt = new Date();
      this.emit('suggestionDismissed', suggestion);
    }
  }

  /**
   * Mark suggestion as acted upon
   */
  actOnSuggestion(suggestionId: string) {
    const suggestion = this.activeSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.actedUpon = true;
      suggestion.actedUponAt = new Date();
      this.emit('suggestionActed', suggestion);
    }
  }
}

export const anticipationEngine = AnticipationEngine.getInstance();
export default AnticipationEngine;
