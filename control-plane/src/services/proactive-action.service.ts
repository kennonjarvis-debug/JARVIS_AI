/**
 * Proactive Action Service
 *
 * Decision engine that analyzes user activity patterns and decides what actions to take.
 * This is where Jarvis becomes truly autonomous - watching your work and creating useful things.
 *
 * Examples:
 * - "Ben freestyled to 3 beats today → finish one of those songs"
 * - "Ben opens Spotify 10 times/day → create a keyboard shortcut"
 * - "Ben writes React components daily → generate a component template"
 *
 * Features:
 * - Pattern-based action triggering
 * - Multi-domain action coordination
 * - Risk assessment and approval workflow
 * - Action history and learning
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { ActivityContext, ActivitySession } from './activity-monitor.service.js';
import { AutonomousTask, Priority, ClearanceLevel, DomainType } from '../autonomous/types.js';

export enum ActionType {
  FINISH_SONG = 'finish_song',
  CREATE_SHORTCUT = 'create_shortcut',
  GENERATE_CODE = 'generate_code',
  BUILD_APP = 'build_app',
  ORGANIZE_FILES = 'organize_files',
  SEND_NOTIFICATION = 'send_notification',
  CREATE_PLAYLIST = 'create_playlist',
  SUGGEST_BREAK = 'suggest_break'
}

export interface ActionOpportunity {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;              // 0-1, how confident we are this is useful
  priority: Priority;
  clearanceRequired: ClearanceLevel;
  estimatedValue: number;          // 0-10, how valuable is this to user
  metadata: Record<string, any>;
  triggeredBy: {
    context?: ActivityContext;
    pattern: string;
    sessionIds: string[];
    eventCount: number;
  };
  createdAt: Date;
}

export interface ProactiveAction {
  id: string;
  opportunity: ActionOpportunity;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  approvedAt?: Date;
  executedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface ActionPattern {
  pattern: string;
  actionType: ActionType;
  minOccurrences: number;          // How many times pattern must occur
  timeWindow: number;              // In milliseconds
  contextRequired?: ActivityContext;
  detector: (sessions: ActivitySession[], events: any[]) => ActionOpportunity | null;
}

export class ProactiveActionService extends EventEmitter {
  private static instance: ProactiveActionService;

  private opportunities: Map<string, ActionOpportunity> = new Map();
  private actions: Map<string, ProactiveAction> = new Map();
  private patterns: ActionPattern[];

  private constructor() {
    super();
    this.patterns = this.initializePatterns();
  }

  static getInstance(): ProactiveActionService {
    if (!ProactiveActionService.instance) {
      ProactiveActionService.instance = new ProactiveActionService();
    }
    return ProactiveActionService.instance;
  }

  /**
   * Initialize action patterns
   */
  private initializePatterns(): ActionPattern[] {
    return [
      // FREESTYLE SONG FINISHING
      {
        pattern: 'freestyle_session_completed',
        actionType: ActionType.FINISH_SONG,
        minOccurrences: 1,
        timeWindow: 24 * 60 * 60 * 1000, // 24 hours
        contextRequired: ActivityContext.FREESTYLING,
        detector: (sessions, events) => {
          // Find freestyle sessions in the last 24 hours
          const now = new Date();
          const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          const freestyleSessions = sessions.filter(s =>
            s.context === ActivityContext.FREESTYLING &&
            s.endTime &&
            s.endTime > cutoff &&
            s.duration && s.duration > 60000 // At least 1 minute
          );

          if (freestyleSessions.length === 0) {
            return null;
          }

          // Create opportunity to finish the most recent freestyle
          const mostRecent = freestyleSessions[freestyleSessions.length - 1];

          return {
            id: this.generateOpportunityId(),
            type: ActionType.FINISH_SONG,
            title: 'Finish freestyle song',
            description: `You freestyled for ${Math.round(mostRecent.duration! / 60000)} minutes. Want me to turn it into a complete song?`,
            reasoning: `Detected ${freestyleSessions.length} freestyle session(s) in the last 24 hours. The latest one shows potential for a full track.`,
            confidence: 0.85,
            priority: Priority.HIGH,
            clearanceRequired: ClearanceLevel.MODIFY_SAFE,
            estimatedValue: 9,
            metadata: {
              sessionId: mostRecent.id,
              duration: mostRecent.duration,
              freestyleCount: freestyleSessions.length
            },
            triggeredBy: {
              context: ActivityContext.FREESTYLING,
              pattern: 'freestyle_session_completed',
              sessionIds: freestyleSessions.map(s => s.id),
              eventCount: freestyleSessions.length
            },
            createdAt: new Date()
          };
        }
      },

      // APP SHORTCUT CREATION
      {
        pattern: 'repeated_app_launch',
        actionType: ActionType.CREATE_SHORTCUT,
        minOccurrences: 10,
        timeWindow: 24 * 60 * 60 * 1000,
        detector: (sessions, events) => {
          // Count app switches in last 24 hours
          const now = new Date();
          const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          const recentEvents = events.filter(e =>
            e.type === 'app_switch' &&
            e.timestamp > cutoff
          );

          // Group by app name
          const appCounts: Record<string, number> = {};
          for (const event of recentEvents) {
            const appName = event.metadata.appName;
            appCounts[appName] = (appCounts[appName] || 0) + 1;
          }

          // Find apps with high switch count
          const highUsageApps = Object.entries(appCounts)
            .filter(([_, count]) => count >= 10)
            .sort((a, b) => b[1] - a[1]);

          if (highUsageApps.length === 0) {
            return null;
          }

          const [appName, count] = highUsageApps[0];

          return {
            id: this.generateOpportunityId(),
            type: ActionType.CREATE_SHORTCUT,
            title: 'Create app shortcut',
            description: `You've opened ${appName} ${count} times today. Want me to create a keyboard shortcut?`,
            reasoning: `High frequency app switching detected. A keyboard shortcut would save time.`,
            confidence: 0.75,
            priority: Priority.MEDIUM,
            clearanceRequired: ClearanceLevel.MODIFY_SAFE,
            estimatedValue: 6,
            metadata: {
              appName,
              switchCount: count,
              suggestedShortcut: 'Cmd+Shift+' + appName[0].toUpperCase()
            },
            triggeredBy: {
              pattern: 'repeated_app_launch',
              sessionIds: [],
              eventCount: count
            },
            createdAt: new Date()
          };
        }
      },

      // CODE TEMPLATE GENERATION
      {
        pattern: 'repeated_code_pattern',
        actionType: ActionType.GENERATE_CODE,
        minOccurrences: 3,
        timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
        contextRequired: ActivityContext.CODING,
        detector: (sessions, events) => {
          // Find coding sessions in the last week
          const now = new Date();
          const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          const codingSessions = sessions.filter(s =>
            s.context === ActivityContext.CODING &&
            s.endTime &&
            s.endTime > cutoff
          );

          if (codingSessions.length < 3) {
            return null;
          }

          // Analyze window titles for patterns
          const windowTitles = codingSessions
            .map(s => s.metadata.windowTitle || '')
            .filter(t => t.length > 0);

          // Look for React component pattern
          const reactComponentPattern = windowTitles.filter(t =>
            t.includes('.tsx') || t.includes('.jsx') ||
            t.toLowerCase().includes('component')
          );

          if (reactComponentPattern.length >= 3) {
            return {
              id: this.generateOpportunityId(),
              type: ActionType.GENERATE_CODE,
              title: 'Generate React component template',
              description: `You've created ${reactComponentPattern.length} React components this week. Want me to generate a reusable template?`,
              reasoning: `Detected repeated React component creation pattern. A template would speed up your workflow.`,
              confidence: 0.7,
              priority: Priority.MEDIUM,
              clearanceRequired: ClearanceLevel.SUGGEST,
              estimatedValue: 7,
              metadata: {
                componentCount: reactComponentPattern.length,
                templateType: 'react-component',
                examples: reactComponentPattern.slice(0, 3)
              },
              triggeredBy: {
                context: ActivityContext.CODING,
                pattern: 'repeated_code_pattern',
                sessionIds: codingSessions.slice(0, 3).map(s => s.id),
                eventCount: reactComponentPattern.length
              },
              createdAt: new Date()
            };
          }

          return null;
        }
      },

      // BREAK SUGGESTION
      {
        pattern: 'extended_work_session',
        actionType: ActionType.SUGGEST_BREAK,
        minOccurrences: 1,
        timeWindow: 3 * 60 * 60 * 1000, // 3 hours
        detector: (sessions, events) => {
          // Find current or recent session
          const now = new Date();
          const currentSession = sessions.find(s => !s.endTime);

          if (!currentSession) {
            return null;
          }

          const duration = now.getTime() - currentSession.startTime.getTime();

          // If working for over 2 hours straight
          if (duration > 2 * 60 * 60 * 1000) {
            return {
              id: this.generateOpportunityId(),
              type: ActionType.SUGGEST_BREAK,
              title: 'Take a break',
              description: `You've been ${ActivityContext[currentSession.context].toLowerCase()} for ${Math.round(duration / 60000)} minutes. Time for a break?`,
              reasoning: `Extended work sessions reduce productivity. A 10-minute break would help.`,
              confidence: 0.9,
              priority: Priority.LOW,
              clearanceRequired: ClearanceLevel.READ_ONLY,
              estimatedValue: 5,
              metadata: {
                sessionDuration: duration,
                context: currentSession.context
              },
              triggeredBy: {
                context: currentSession.context,
                pattern: 'extended_work_session',
                sessionIds: [currentSession.id],
                eventCount: 1
              },
              createdAt: new Date()
            };
          }

          return null;
        }
      },

      // MULTIPLE FREESTYLES - CREATE PLAYLIST
      {
        pattern: 'multiple_freestyle_sessions',
        actionType: ActionType.CREATE_PLAYLIST,
        minOccurrences: 3,
        timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
        contextRequired: ActivityContext.FREESTYLING,
        detector: (sessions, events) => {
          const now = new Date();
          const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          const freestyleSessions = sessions.filter(s =>
            s.context === ActivityContext.FREESTYLING &&
            s.endTime &&
            s.endTime > cutoff
          );

          if (freestyleSessions.length >= 3) {
            return {
              id: this.generateOpportunityId(),
              type: ActionType.CREATE_PLAYLIST,
              title: 'Create freestyle playlist',
              description: `You've completed ${freestyleSessions.length} freestyles this week. Want me to compile them into a playlist?`,
              reasoning: `Multiple freestyle sessions detected. A playlist would help you review and refine your best work.`,
              confidence: 0.8,
              priority: Priority.MEDIUM,
              clearanceRequired: ClearanceLevel.MODIFY_SAFE,
              estimatedValue: 7,
              metadata: {
                sessionCount: freestyleSessions.length,
                sessionIds: freestyleSessions.map(s => s.id)
              },
              triggeredBy: {
                context: ActivityContext.FREESTYLING,
                pattern: 'multiple_freestyle_sessions',
                sessionIds: freestyleSessions.map(s => s.id),
                eventCount: freestyleSessions.length
              },
              createdAt: new Date()
            };
          }

          return null;
        }
      }
    ];
  }

  /**
   * Analyze activity to find action opportunities
   */
  analyzeActivity(sessions: ActivitySession[], events: any[]): ActionOpportunity[] {
    const opportunities: ActionOpportunity[] = [];

    logger.info('🔍 Analyzing activity for proactive actions...', {
      sessions: sessions.length,
      events: events.length
    });

    // Run each pattern detector
    for (const pattern of this.patterns) {
      try {
        const opportunity = pattern.detector(sessions, events);

        if (opportunity) {
          // Check if we already have this opportunity
          const existing = Array.from(this.opportunities.values()).find(o =>
            o.type === opportunity.type &&
            o.triggeredBy.pattern === opportunity.triggeredBy.pattern &&
            o.createdAt.getTime() > Date.now() - 3600000 // Within last hour
          );

          if (!existing) {
            this.opportunities.set(opportunity.id, opportunity);
            opportunities.push(opportunity);

            logger.info('💡 Action opportunity detected', {
              type: opportunity.type,
              title: opportunity.title,
              confidence: `${Math.round(opportunity.confidence * 100)}%`
            });

            this.emit('opportunity:detected', opportunity);
          }
        }
      } catch (error) {
        logger.error('Pattern detector failed:', error);
      }
    }

    return opportunities;
  }

  /**
   * Create proactive action from opportunity
   */
  createAction(opportunityId: string): ProactiveAction {
    const opportunity = this.opportunities.get(opportunityId);

    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    const action: ProactiveAction = {
      id: this.generateActionId(),
      opportunity,
      status: 'pending'
    };

    this.actions.set(action.id, action);

    logger.info('📝 Proactive action created', {
      actionId: action.id,
      type: opportunity.type,
      title: opportunity.title
    });

    this.emit('action:created', action);

    return action;
  }

  /**
   * Approve action for execution
   */
  approveAction(actionId: string): void {
    const action = this.actions.get(actionId);

    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    action.status = 'approved';
    action.approvedAt = new Date();

    logger.info('✅ Action approved', {
      actionId: action.id,
      type: action.opportunity.type
    });

    this.emit('action:approved', action);
  }

  /**
   * Reject action
   */
  rejectAction(actionId: string, reason: string): void {
    const action = this.actions.get(actionId);

    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    action.status = 'rejected';
    action.error = reason;

    logger.info('❌ Action rejected', {
      actionId: action.id,
      type: action.opportunity.type,
      reason
    });

    this.emit('action:rejected', { action, reason });
  }

  /**
   * Mark action as executing
   */
  markExecuting(actionId: string): void {
    const action = this.actions.get(actionId);

    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    action.status = 'executing';
    action.executedAt = new Date();

    this.emit('action:executing', action);
  }

  /**
   * Mark action as completed
   */
  completeAction(actionId: string, result: any): void {
    const action = this.actions.get(actionId);

    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    action.status = 'completed';
    action.completedAt = new Date();
    action.result = result;

    logger.info('✅ Action completed', {
      actionId: action.id,
      type: action.opportunity.type
    });

    this.emit('action:completed', { action, result });
  }

  /**
   * Mark action as failed
   */
  failAction(actionId: string, error: string): void {
    const action = this.actions.get(actionId);

    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    action.status = 'failed';
    action.error = error;

    logger.error('❌ Action failed', {
      actionId: action.id,
      type: action.opportunity.type,
      error
    });

    this.emit('action:failed', { action, error });
  }

  /**
   * Get pending opportunities
   */
  getPendingOpportunities(): ActionOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(o => {
        const hasAction = Array.from(this.actions.values())
          .some(a => a.opportunity.id === o.id);
        return !hasAction;
      })
      .sort((a, b) => b.estimatedValue - a.estimatedValue);
  }

  /**
   * Get pending actions (need approval)
   */
  getPendingActions(): ProactiveAction[] {
    return Array.from(this.actions.values())
      .filter(a => a.status === 'pending')
      .sort((a, b) => b.opportunity.estimatedValue - a.opportunity.estimatedValue);
  }

  /**
   * Get action by ID
   */
  getAction(actionId: string): ProactiveAction | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Get all actions
   */
  getAllActions(): ProactiveAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Generate unique opportunity ID
   */
  private generateOpportunityId(): string {
    return `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalOpportunities: number;
    totalActions: number;
    pendingActions: number;
    completedActions: number;
    failedActions: number;
  } {
    const actions = Array.from(this.actions.values());

    return {
      totalOpportunities: this.opportunities.size,
      totalActions: actions.length,
      pendingActions: actions.filter(a => a.status === 'pending').length,
      completedActions: actions.filter(a => a.status === 'completed').length,
      failedActions: actions.filter(a => a.status === 'failed').length
    };
  }
}

// Export singleton instance
export const proactiveActions = ProactiveActionService.getInstance();
