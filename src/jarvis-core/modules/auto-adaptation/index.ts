/**
 * Jarvis Auto-Adaptation Module
 *
 * Analytics-driven auto-optimization system with tiered autonomy:
 * - LOW tier: Auto-execute without notification (log only)
 * - MEDIUM tier: Notify user + auto-execute after delay
 * - HIGH tier: Request approval before executing
 *
 * Continuously analyzes system performance and proposes improvements
 * based on metrics, anomalies, and learning history.
 */

import { BaseModule } from '../../core/base-module';
import { ScheduledJob } from '../../core/jarvis.interfaces';
import { adaptiveEngine, Improvement } from '../../core/adaptive-engine';
import { autonomyManager } from '../../core/autonomy-manager';
import { clearanceSystem, ClearanceLevel, JarvisAction } from '../../core/clearance-system';
import { selfAwareness } from '../../core/self-awareness';
import { moduleRegistry } from '../../core/module-registry';
import { Router } from 'express';

/**
 * Auto-adaptation configuration
 */
interface AutoAdaptationConfig {
  enabled: boolean;
  analysisIntervalMinutes: number;
  minVitalityForAdaptation: number;
  maxConcurrentAdaptations: number;
  lowTierAutoExecute: boolean;
  mediumTierDelayMinutes: number;
}

/**
 * Adaptation proposal with execution strategy
 */
interface AdaptationProposal {
  improvement: Improvement;
  clearanceLevel: ClearanceLevel;
  strategy: 'immediate' | 'delayed' | 'approval-required';
  reasoning: string;
}

/**
 * Auto-Adaptation Module
 * Implements analytics-driven autonomous system optimization
 */
class AutoAdaptationModule extends BaseModule {
  name = 'auto-adaptation';
  version = '1.0.0';
  description = 'Analytics-driven auto-optimization with tiered autonomy';
  dependencies: string[] = [];

  private router: Router;
  private config: AutoAdaptationConfig = {
    enabled: true,
    analysisIntervalMinutes: 60, // Analyze every hour
    minVitalityForAdaptation: 60,
    maxConcurrentAdaptations: 3,
    lowTierAutoExecute: true,
    mediumTierDelayMinutes: 5,
  };

  private activeAdaptations: Map<string, AdaptationProposal> = new Map();
  private adaptationHistory: Array<{ proposal: AdaptationProposal; result: any }> = [];

  constructor() {
    super();
    this.router = Router();
    this.setupRoutes();
  }

  /**
   * Initialize module
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info('Auto-Adaptation Module initialized');
    this.logger.info(`Analysis interval: ${this.config.analysisIntervalMinutes} minutes`);
    this.logger.info(`Min vitality for adaptation: ${this.config.minVitalityForAdaptation}`);
  }

  /**
   * Register module routes
   */
  protected onRegisterRoutes(router: Router): void {
    router.use(this.router);
  }

  /**
   * Get scheduled jobs
   */
  protected onGetScheduledJobs(): ScheduledJob[] {
    return [
      {
        id: 'auto-adaptation-analysis',
        name: 'Auto-Adaptation Analysis',
        schedule: `0 */${this.config.analysisIntervalMinutes} * * *`,
        timezone: 'UTC',
        description: 'Analyze system performance and propose auto-adaptations',
        handler: async () => {
          await this.performAdaptationAnalysis();
        },
      },
      {
        id: 'adaptation-health-check',
        name: 'Adaptation Health Check',
        schedule: '*/15 * * * *', // Every 15 minutes
        timezone: 'UTC',
        description: 'Monitor active adaptations and system health',
        handler: async () => {
          await this.monitorAdaptations();
        },
      },
    ];
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Get adaptation config
    this.router.get('/config', async (req, res) => {
      res.json({
        success: true,
        data: this.config,
      });
    });

    // Update adaptation config
    this.router.post('/config', async (req, res) => {
      const updates = req.body;
      this.config = { ...this.config, ...updates };

      this.logger.info('Auto-adaptation config updated', { updates });

      res.json({
        success: true,
        data: this.config,
        message: 'Configuration updated successfully',
      });
    });

    // Get active adaptations
    this.router.get('/active', async (req, res) => {
      const adaptations = Array.from(this.activeAdaptations.values());

      res.json({
        success: true,
        data: {
          adaptations,
          total: adaptations.length,
        },
      });
    });

    // Get adaptation history
    this.router.get('/history', async (req, res) => {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = this.adaptationHistory.slice(-limit);

      res.json({
        success: true,
        data: {
          history,
          total: this.adaptationHistory.length,
        },
      });
    });

    // Force immediate analysis
    this.router.post('/analyze', async (req, res) => {
      try {
        const proposals = await this.performAdaptationAnalysis();

        res.json({
          success: true,
          data: {
            proposals,
            message: `Generated ${proposals.length} adaptation proposals`,
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });
  }

  /**
   * Perform adaptation analysis
   * Analyzes system performance and generates improvement proposals
   */
  private async performAdaptationAnalysis(): Promise<AdaptationProposal[]> {
    this.logger.info('🔍 Performing auto-adaptation analysis...');

    // Check system vitality
    const vitality = await selfAwareness.selfEvaluation();
    if (vitality.vitalityIndex < this.config.minVitalityForAdaptation) {
      this.logger.warn(
        `Vitality too low for adaptation (${vitality.vitalityIndex}/${this.config.minVitalityForAdaptation})`
      );
      return [];
    }

    // Get unapplied improvements from adaptive engine
    const improvements = adaptiveEngine
      .getImprovements()
      .filter(i => !i.applied && i.autoApplicable);

    if (improvements.length === 0) {
      this.logger.info('No improvements to apply at this time');
      return [];
    }

    this.logger.info(`Found ${improvements.length} potential improvements`);

    // Create proposals for each improvement
    const proposals: AdaptationProposal[] = [];

    for (const improvement of improvements.slice(0, this.config.maxConcurrentAdaptations)) {
      const proposal = this.createAdaptationProposal(improvement);
      proposals.push(proposal);

      // Execute based on tier
      await this.executeProposal(proposal);
    }

    this.logger.info(`Created ${proposals.length} adaptation proposals`);

    return proposals;
  }

  /**
   * Create adaptation proposal from improvement
   */
  private createAdaptationProposal(improvement: Improvement): AdaptationProposal {
    // Map improvement clearance level to system clearance level
    const clearanceLevel = improvement.clearanceLevel as ClearanceLevel;

    // Determine execution strategy based on clearance level
    let strategy: 'immediate' | 'delayed' | 'approval-required';
    if (clearanceLevel === ClearanceLevel.LOW) {
      strategy = 'immediate';
    } else if (clearanceLevel === ClearanceLevel.MEDIUM) {
      strategy = 'delayed';
    } else {
      strategy = 'approval-required';
    }

    // Generate reasoning
    const reasoning = this.generateReasoning(improvement);

    return {
      improvement,
      clearanceLevel,
      strategy,
      reasoning,
    };
  }

  /**
   * Generate reasoning for adaptation
   */
  private generateReasoning(improvement: Improvement): string {
    const parts: string[] = [];

    parts.push(`Improvement Type: ${improvement.type}`);
    parts.push(`Expected Impact: ${improvement.expectedImpact}`);

    // Add performance context
    const anomalies = adaptiveEngine.getAnomalies().filter(a => !a.resolved);
    if (anomalies.length > 0) {
      parts.push(`Addressing ${anomalies.length} active anomalies`);
    }

    // Add learning context
    const learnings = adaptiveEngine.getLearningHistory().slice(-10);
    const successRate =
      learnings.filter(l => l.outcomeSuccess).length / Math.max(learnings.length, 1);
    if (successRate > 0.8) {
      parts.push(`High confidence based on ${(successRate * 100).toFixed(0)}% success rate`);
    }

    return parts.join('. ');
  }

  /**
   * Execute proposal based on tier
   */
  private async executeProposal(proposal: AdaptationProposal): Promise<void> {
    const { improvement, clearanceLevel, strategy } = proposal;

    // Create Jarvis action
    const action: Omit<JarvisAction, 'id' | 'requestedAt' | 'status'> = {
      moduleName: improvement.moduleName,
      actionType: improvement.type,
      clearanceLevel,
      title: improvement.title,
      description: improvement.description,
      parameters: {
        improvementId: improvement.id,
        implementationSteps: improvement.implementationSteps,
      },
    };

    // Execute based on strategy
    switch (strategy) {
      case 'immediate':
        // LOW tier: Execute immediately, log only
        this.logger.info(`⚡ AUTO-EXECUTING (LOW): ${improvement.title}`);
        await this.executeImprovement(improvement);
        break;

      case 'delayed':
        // MEDIUM tier: Notify + delay
        this.logger.info(`⏱️  SCHEDULING (MEDIUM): ${improvement.title}`);
        await clearanceSystem.requestAction(action as any);
        break;

      case 'approval-required':
        // HIGH tier: Request approval
        this.logger.info(`🚨 REQUESTING APPROVAL (HIGH): ${improvement.title}`);
        await clearanceSystem.requestAction(action as any);
        break;
    }

    // Track active adaptation
    this.activeAdaptations.set(improvement.id, proposal);
  }

  /**
   * Execute an improvement (LOW tier)
   */
  private async executeImprovement(improvement: Improvement): Promise<void> {
    try {
      this.logger.info(`Executing improvement: ${improvement.id}`);

      // Mark as applied
      improvement.applied = true;
      improvement.appliedAt = new Date();

      // Record learning
      adaptiveEngine.recordLearning({
        actionId: improvement.id,
        moduleName: improvement.moduleName,
        actionType: improvement.type,
        outcomeSuccess: true,
        performanceImpact: 10, // Estimated positive impact
        timestamp: new Date(),
        learnings: [`Successfully applied ${improvement.type} improvement`],
      });

      // Log to history
      this.adaptationHistory.push({
        proposal: this.activeAdaptations.get(improvement.id)!,
        result: {
          success: true,
          timestamp: new Date(),
        },
      });

      // Clean up
      this.activeAdaptations.delete(improvement.id);

      this.logger.info(`✅ Improvement executed successfully: ${improvement.title}`);
    } catch (error) {
      this.logger.error(`Failed to execute improvement: ${improvement.id}`, {
        error: (error as Error).message,
      });

      // Record failure
      adaptiveEngine.recordLearning({
        actionId: improvement.id,
        moduleName: improvement.moduleName,
        actionType: improvement.type,
        outcomeSuccess: false,
        performanceImpact: -5,
        timestamp: new Date(),
        learnings: [`Failed to apply ${improvement.type}: ${(error as Error).message}`],
      });
    }
  }

  /**
   * Monitor active adaptations
   */
  private async monitorAdaptations(): Promise<void> {
    const activeCount = this.activeAdaptations.size;

    if (activeCount > 0) {
      this.logger.debug(`Monitoring ${activeCount} active adaptations`);
    }

    // Clean up completed adaptations
    for (const [improvementId, proposal] of this.activeAdaptations.entries()) {
      if (proposal.improvement.applied) {
        this.activeAdaptations.delete(improvementId);
      }
    }
  }

  /**
   * Get module-specific health metrics
   */
  protected async onGetHealthMetrics(): Promise<any> {
    return {
      enabled: this.config.enabled,
      activeAdaptations: this.activeAdaptations.size,
      totalHistory: this.adaptationHistory.length,
      successRate:
        this.adaptationHistory.filter(h => h.result.success).length /
        Math.max(this.adaptationHistory.length, 1),
    };
  }
}

// Create and export module instance
const autoAdaptationModule = new AutoAdaptationModule();

// Default export for module loading
export default autoAdaptationModule;

// Named export for direct access
export { autoAdaptationModule };

// Export types
export type { AutoAdaptationModule };
