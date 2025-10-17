/**
 * Jarvis Autonomy Manager
 * Central decision-making system for autonomous actions
 *
 * Integrates:
 * - Adaptive Engine (performance insights)
 * - Clearance System (permission levels)
 * - Self-Awareness (vitality checks)
 *
 * Responsibilities:
 * - Propose and validate autonomous actions
 * - Check system vitality before execution
 * - Determine appropriate clearance levels
 * - Coordinate between all V2 components
 * - Track decision-making outcomes
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { adaptiveEngine } from './adaptive-engine';
import { clearanceSystem, ClearanceLevel, JarvisAction } from './clearance-system';
import { selfAwareness } from './self-awareness';
import { moduleRegistry } from './module-registry';

/**
 * Autonomy configuration
 */
export interface AutonomyConfig {
  enabled: boolean;
  minVitalityForActions: number; // Minimum vitality to execute actions (0-100)
  minVitalityForHighRisk: number; // Minimum vitality for HIGH clearance actions
  maxConcurrentActions: number; // Maximum concurrent autonomous actions
  autoOptimizeEnabled: boolean; // Enable automatic optimization
  learningEnabled: boolean; // Enable learning from outcomes
  adaptiveThresholds: boolean; // Adjust thresholds based on performance
}

/**
 * Action proposal
 */
export interface ActionProposal {
  action: Omit<JarvisAction, 'id' | 'requestedAt' | 'status'>;
  reasoning: string;
  vitalityCheck: {
    passed: boolean;
    currentVitality: number;
    minimumRequired: number;
  };
  clearanceDetermined: ClearanceLevel;
  riskAssessment: 'low' | 'medium' | 'high';
  expectedOutcome: string;
  alternatives?: string[];
}

/**
 * Decision outcome
 */
export interface DecisionOutcome {
  proposalId: string;
  actionId: string;
  decision: 'approved' | 'rejected' | 'deferred';
  reason: string;
  vitalityAtDecision: number;
  timestamp: Date;
  executionResult?: any;
}

/**
 * Autonomy statistics
 */
export interface AutonomyStats {
  totalProposals: number;
  approvedProposals: number;
  rejectedProposals: number;
  deferredProposals: number;
  successfulActions: number;
  failedActions: number;
  avgVitalityAtDecision: number;
  decisionsByLevel: Record<ClearanceLevel, number>;
  currentAutonomyLevel: 'conservative' | 'balanced' | 'aggressive';
}

/**
 * Autonomy Manager - Central decision-making for Jarvis V2
 */
export class AutonomyManager extends EventEmitter {
  private static instance: AutonomyManager;
  private config: AutonomyConfig = {
    enabled: true,
    minVitalityForActions: 60,
    minVitalityForHighRisk: 80,
    maxConcurrentActions: 5,
    autoOptimizeEnabled: true,
    learningEnabled: true,
    adaptiveThresholds: true,
  };

  private proposals: Map<string, ActionProposal> = new Map();
  private outcomes: DecisionOutcome[] = [];
  private maxOutcomeHistory = 1000;
  private currentActionCount = 0;

  private constructor() {
    super();
    this.initializeAutonomy();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AutonomyManager {
    if (!AutonomyManager.instance) {
      AutonomyManager.instance = new AutonomyManager();
    }
    return AutonomyManager.instance;
  }

  /**
   * Initialize autonomy system
   */
  private async initializeAutonomy(): Promise<void> {
    logger.info('Initializing Jarvis Autonomy Manager...');

    // Listen to clearance system events
    clearanceSystem.on('action:executed', (action) => {
      this.currentActionCount--;
      this.recordOutcome(action, 'approved', 'Action executed successfully');
    });

    clearanceSystem.on('action:failed', (action) => {
      this.currentActionCount--;
      this.recordOutcome(action, 'rejected', action.error || 'Action failed');
    });

    clearanceSystem.on('action:rejected', (action) => {
      this.recordOutcome(action, 'rejected', action.error || 'Action rejected');
    });

    // Listen to adaptive engine events
    adaptiveEngine.on('improvements:suggested', async (improvements) => {
      if (this.config.autoOptimizeEnabled) {
        await this.processImprovements(improvements);
      }
    });

    // Listen to self-awareness events
    selfAwareness.on('self:evaluation', (evaluation) => {
      if (evaluation.vitalityIndex < 50) {
        logger.warn('Low vitality detected - reducing autonomous activity', {
          vitalityIndex: evaluation.vitalityIndex,
          mood: evaluation.mood,
        });
      }
    });

    // Start periodic autonomy check
    this.startPeriodicAutonomyCheck();

    logger.info('Autonomy Manager initialized', {
      config: this.config,
    });
  }

  /**
   * Start periodic autonomy check
   */
  private startPeriodicAutonomyCheck(): void {
    // Check every 15 minutes
    setInterval(async () => {
      await this.performAutonomyCheck();
    }, 15 * 60 * 1000);
  }

  /**
   * Perform periodic autonomy check
   */
  private async performAutonomyCheck(): Promise<void> {
    logger.info('Performing periodic autonomy check...');

    // Check vitality
    const vitality = await selfAwareness.getCurrentVitality();

    // Adjust autonomy based on vitality
    if (this.config.adaptiveThresholds) {
      if (vitality < 50) {
        // Reduce autonomy in low vitality
        this.config.minVitalityForActions = 70;
        this.config.maxConcurrentActions = 2;
        logger.info('Autonomy reduced due to low vitality', { vitality });
      } else if (vitality >= 80) {
        // Increase autonomy in high vitality
        this.config.minVitalityForActions = 50;
        this.config.maxConcurrentActions = 10;
        logger.info('Autonomy increased due to high vitality', { vitality });
      } else {
        // Normal autonomy
        this.config.minVitalityForActions = 60;
        this.config.maxConcurrentActions = 5;
      }
    }

    // Check for anomalies
    const anomalies = await adaptiveEngine.detectAnomalies();
    if (anomalies.length > 0) {
      logger.info('Anomalies detected during autonomy check', {
        count: anomalies.length,
      });
    }

    // Suggest improvements
    const improvements = await adaptiveEngine.suggestImprovements();
    if (improvements.length > 0) {
      logger.info('Improvements suggested during autonomy check', {
        count: improvements.length,
      });
    }

    // Auto-optimize if enabled
    if (this.config.autoOptimizeEnabled) {
      const optimized = await adaptiveEngine.autoOptimizeIfLowRisk();
      if (optimized > 0) {
        logger.info('Auto-optimizations applied', { count: optimized });
      }
    }

    this.emit('autonomy:check_complete', {
      vitality,
      anomalies: anomalies.length,
      improvements: improvements.length,
    });
  }

  /**
   * Propose an autonomous action
   */
  async proposeAction(
    action: Omit<JarvisAction, 'id' | 'requestedAt' | 'status'>,
    reasoning: string,
    alternatives?: string[]
  ): Promise<ActionProposal> {
    if (!this.config.enabled) {
      throw new Error('Autonomy is disabled');
    }

    logger.info('Action proposed', {
      actionType: action.actionType,
      module: action.moduleName,
      clearanceLevel: action.clearanceLevel,
    });

    // Check current vitality
    const currentVitality = await selfAwareness.getCurrentVitality();

    // Determine minimum vitality required
    const minimumRequired = action.clearanceLevel === ClearanceLevel.HIGH
      ? this.config.minVitalityForHighRisk
      : this.config.minVitalityForActions;

    // Vitality check
    const vitalityCheck = {
      passed: currentVitality >= minimumRequired,
      currentVitality,
      minimumRequired,
    };

    // Assess risk
    let riskAssessment: 'low' | 'medium' | 'high';
    if (action.clearanceLevel === ClearanceLevel.LOW) riskAssessment = 'low';
    else if (action.clearanceLevel === ClearanceLevel.MEDIUM) riskAssessment = 'medium';
    else riskAssessment = 'high';

    // Determine expected outcome
    const expectedOutcome = this.determineExpectedOutcome(action);

    const proposal: ActionProposal = {
      action,
      reasoning,
      vitalityCheck,
      clearanceDetermined: action.clearanceLevel,
      riskAssessment,
      expectedOutcome,
      alternatives,
    };

    const proposalId = this.generateProposalId();
    this.proposals.set(proposalId, proposal);

    logger.info('Action proposal created', {
      proposalId,
      vitalityPassed: vitalityCheck.passed,
      riskAssessment,
    });

    this.emit('action:proposed', proposal);

    return proposal;
  }

  /**
   * Execute a proposed action
   */
  async executeProposal(proposal: ActionProposal): Promise<JarvisAction> {
    // Final vitality check
    if (!proposal.vitalityCheck.passed) {
      throw new Error(
        `Vitality too low for action: ${proposal.vitalityCheck.currentVitality} < ${proposal.vitalityCheck.minimumRequired}`
      );
    }

    // Check concurrent action limit
    if (this.currentActionCount >= this.config.maxConcurrentActions) {
      throw new Error(
        `Maximum concurrent actions reached: ${this.config.maxConcurrentActions}`
      );
    }

    logger.info('Executing action proposal', {
      actionType: proposal.action.actionType,
      clearanceLevel: proposal.action.clearanceLevel,
    });

    this.currentActionCount++;

    // Perform action through clearance system
    const executedAction = await clearanceSystem.performAction(proposal.action);

    this.emit('action:executing', executedAction);

    return executedAction;
  }

  /**
   * Process improvement suggestions
   */
  private async processImprovements(improvements: any[]): Promise<void> {
    for (const improvement of improvements) {
      if (improvement.autoApplicable && !improvement.applied) {
        // Propose the improvement as an action
        try {
          const proposal = await this.proposeAction(
            {
              moduleName: improvement.moduleName,
              actionType: 'apply_improvement',
              clearanceLevel: improvement.clearanceLevel as ClearanceLevel,
              title: improvement.title,
              description: improvement.description,
              parameters: { improvementId: improvement.id },
            },
            `Auto-generated: ${improvement.expectedImpact}`
          );

          if (proposal.vitalityCheck.passed) {
            await this.executeProposal(proposal);
          }
        } catch (error) {
          logger.error('Failed to process improvement', {
            improvementId: improvement.id,
            error: (error as Error).message,
          });
        }
      }
    }
  }

  /**
   * Record decision outcome
   */
  private recordOutcome(
    action: JarvisAction,
    decision: DecisionOutcome['decision'],
    reason: string
  ): void {
    const outcome: DecisionOutcome = {
      proposalId: action.id,
      actionId: action.id,
      decision,
      reason,
      vitalityAtDecision: 0, // Would be captured at decision time
      timestamp: new Date(),
      executionResult: action.result,
    };

    this.outcomes.push(outcome);

    // Trim history
    if (this.outcomes.length > this.maxOutcomeHistory) {
      this.outcomes = this.outcomes.slice(-this.maxOutcomeHistory);
    }

    // Record learning if enabled
    if (this.config.learningEnabled) {
      const success = decision === 'approved' && !action.error;
      const impact = success ? 10 : -10;

      adaptiveEngine.recordLearning({
        actionId: action.id,
        moduleName: action.moduleName,
        actionType: action.actionType,
        outcomeSuccess: success,
        performanceImpact: impact,
        timestamp: new Date(),
        learnings: [reason],
      });
    }
  }

  /**
   * Determine expected outcome for an action
   */
  private determineExpectedOutcome(action: Omit<JarvisAction, 'id' | 'requestedAt' | 'status'>): string {
    // This is a simplified implementation
    // In production, this would use historical data and ML models
    switch (action.clearanceLevel) {
      case ClearanceLevel.LOW:
        return 'Low-risk action with immediate effect and minimal impact';
      case ClearanceLevel.MEDIUM:
        return 'Moderate-risk action with noticeable impact on system performance';
      case ClearanceLevel.HIGH:
        return 'High-risk action with significant system-wide implications';
      default:
        return 'Unknown outcome';
    }
  }

  /**
   * Update autonomy configuration
   */
  updateConfig(updates: Partial<AutonomyConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    logger.info('Autonomy configuration updated', {
      config: this.config,
    });

    this.emit('config:updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): AutonomyConfig {
    return { ...this.config };
  }

  /**
   * Get autonomy statistics
   */
  getStats(): AutonomyStats {
    const totalProposals = this.proposals.size + this.outcomes.length;
    const approvedProposals = this.outcomes.filter(o => o.decision === 'approved').length;
    const rejectedProposals = this.outcomes.filter(o => o.decision === 'rejected').length;
    const deferredProposals = this.outcomes.filter(o => o.decision === 'deferred').length;

    const clearanceStats = clearanceSystem.getStats();
    const successfulActions = Math.round(
      clearanceStats.executionHistory * (clearanceStats.successRate / 100)
    );
    const failedActions = clearanceStats.executionHistory - successfulActions;

    const avgVitalityAtDecision = this.outcomes.length > 0
      ? this.outcomes.reduce((sum, o) => sum + o.vitalityAtDecision, 0) / this.outcomes.length
      : 0;

    const decisionsByLevel: Record<ClearanceLevel, number> = {
      [ClearanceLevel.LOW]: clearanceStats.pendingByLevel[ClearanceLevel.LOW],
      [ClearanceLevel.MEDIUM]: clearanceStats.pendingByLevel[ClearanceLevel.MEDIUM],
      [ClearanceLevel.HIGH]: clearanceStats.pendingByLevel[ClearanceLevel.HIGH],
    };

    // Determine current autonomy level
    let currentAutonomyLevel: 'conservative' | 'balanced' | 'aggressive';
    if (this.config.minVitalityForActions >= 70) {
      currentAutonomyLevel = 'conservative';
    } else if (this.config.minVitalityForActions >= 55) {
      currentAutonomyLevel = 'balanced';
    } else {
      currentAutonomyLevel = 'aggressive';
    }

    return {
      totalProposals,
      approvedProposals,
      rejectedProposals,
      deferredProposals,
      successfulActions,
      failedActions,
      avgVitalityAtDecision,
      decisionsByLevel,
      currentAutonomyLevel,
    };
  }

  /**
   * Get recent outcomes
   */
  getRecentOutcomes(limit = 100): DecisionOutcome[] {
    return this.outcomes.slice(-limit);
  }

  /**
   * Check if autonomy is healthy
   */
  async isHealthy(): Promise<boolean> {
    const vitality = await selfAwareness.getCurrentVitality();
    const stats = this.getStats();

    return (
      this.config.enabled &&
      vitality >= this.config.minVitalityForActions &&
      this.currentActionCount < this.config.maxConcurrentActions &&
      stats.successfulActions > stats.failedActions
    );
  }

  /**
   * Get current action count
   */
  getCurrentActionCount(): number {
    return this.currentActionCount;
  }

  /**
   * Generate unique proposal ID
   */
  private generateProposalId(): string {
    return `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const autonomyManager = AutonomyManager.getInstance();
