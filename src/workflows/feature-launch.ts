/**
 * Feature Launch Workflow
 *
 * Complex multi-agent workflow for launching new product features.
 * Coordinates marketing, sales, operations, and support agents to execute
 * a comprehensive feature launch campaign.
 *
 * @module workflows/feature-launch
 */

import { LangGraphOrchestrator } from '../core/langgraph-orchestrator.js';
import { Logger } from '../utils/logger.js';
import type { TaskRequest, Priority, TaskType } from '../types/tasks.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FeatureLaunchConfig {
  featureName: string;
  description: string;
  targetAudience: string;
  launchDate: Date;
  pricing?: {
    tier: string;
    price: number;
  };
  highlights: string[];
}

export interface FeatureLaunchResult {
  success: boolean;
  announcementPublished: boolean;
  socialCampaignScheduled: boolean;
  emailSent: boolean;
  kbUpdated: boolean;
  supportPrepared: boolean;
  metricsTracked: boolean;
  errors: string[];
}

// ============================================================================
// FEATURE LAUNCH WORKFLOW
// ============================================================================

export class FeatureLaunchWorkflow {
  private orchestrator: LangGraphOrchestrator;
  private logger: Logger;

  constructor(orchestrator: LangGraphOrchestrator) {
    this.orchestrator = orchestrator;
    this.logger = new Logger('FeatureLaunchWorkflow');
  }

  /**
   * Execute a complete feature launch workflow
   *
   * This coordinates multiple agents to:
   * 1. Create announcement content (Marketing)
   * 2. Schedule social media campaign (Marketing)
   * 3. Send email to existing users (Marketing/Sales)
   * 4. Update knowledge base (Support)
   * 5. Prepare support team (Support)
   * 6. Track engagement metrics (Operations)
   */
  async execute(config: FeatureLaunchConfig): Promise<FeatureLaunchResult> {
    this.logger.info('Starting feature launch workflow', {
      feature: config.featureName,
      launchDate: config.launchDate,
    });

    const result: FeatureLaunchResult = {
      success: false,
      announcementPublished: false,
      socialCampaignScheduled: false,
      emailSent: false,
      kbUpdated: false,
      supportPrepared: false,
      metricsTracked: false,
      errors: [],
    };

    try {
      // Build comprehensive task request
      const taskRequest: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.content.create' as TaskType,
        priority: 1 as Priority, // HIGH priority
        data: {
          workflow: 'feature_launch',
          featureName: config.featureName,
          description: config.description,
          targetAudience: config.targetAudience,
          launchDate: config.launchDate.toISOString(),
          pricing: config.pricing,
          highlights: config.highlights,
          actions: [
            'Create announcement blog post',
            'Schedule social media campaign (3-5 posts over 3 days)',
            'Send email to existing users',
            'Update knowledge base with new feature documentation',
            'Prepare support team with FAQs',
            'Track engagement metrics',
          ],
        },
        requestedBy: 'feature-launch-workflow',
        timestamp: new Date(),
        metadata: {
          workflow: 'feature_launch',
          featureName: config.featureName,
          requiresCollaboration: true,
        },
      };

      // Execute via LangGraph orchestrator
      this.logger.info('Submitting task to orchestrator', {
        taskId: taskRequest.id,
      });

      const orchestratorResult = await this.orchestrator.executeTask(taskRequest, {
        workflowType: 'feature_launch',
        config,
      });

      this.logger.info('Orchestrator execution complete', {
        success: orchestratorResult.success,
        agentActions: Object.keys(orchestratorResult.agentActions || {}),
      });

      // Parse results from agents
      if (orchestratorResult.success) {
        result.success = true;

        // Check what each agent accomplished
        const agentActions = orchestratorResult.agentActions || {};

        if (agentActions.marketing) {
          result.announcementPublished = true;
          result.socialCampaignScheduled = true;
          result.emailSent = true;
        }

        if (agentActions.support) {
          result.kbUpdated = true;
          result.supportPrepared = true;
        }

        if (agentActions.operations) {
          result.metricsTracked = true;
        }

        this.logger.info('Feature launch workflow completed successfully', {
          feature: config.featureName,
          result,
        });
      } else {
        result.errors.push('Orchestrator reported failure');
        this.logger.warn('Feature launch workflow completed with issues', {
          feature: config.featureName,
          result,
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Feature launch workflow failed', error as Error, {
        feature: config.featureName,
      });

      result.errors.push((error as Error).message);
      return result;
    }
  }

  /**
   * Execute a simplified feature launch (announcement only)
   */
  async executeSimple(featureName: string, description: string): Promise<boolean> {
    this.logger.info('Starting simple feature announcement', { featureName });

    try {
      const taskRequest: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'marketing.social.post' as TaskType,
        priority: 1 as Priority,
        data: {
          platform: 'twitter',
          content: `🚀 New Feature: ${featureName}\n\n${description}\n\nTry it now!`,
          scheduledFor: new Date(),
        },
        requestedBy: 'feature-launch-workflow',
        timestamp: new Date(),
        metadata: {
          workflow: 'simple_announcement',
          featureName,
        },
      };

      const result = await this.orchestrator.executeTask(taskRequest);

      return result.success;
    } catch (error) {
      this.logger.error('Simple feature announcement failed', error as Error);
      return false;
    }
  }

  /**
   * Check readiness for feature launch
   *
   * Validates that all required components are ready before launch
   */
  async checkReadiness(config: FeatureLaunchConfig): Promise<{
    ready: boolean;
    issues: string[];
  }> {
    this.logger.info('Checking feature launch readiness', {
      feature: config.featureName,
    });

    const issues: string[] = [];

    // Validate configuration
    if (!config.featureName || config.featureName.trim().length === 0) {
      issues.push('Feature name is required');
    }

    if (!config.description || config.description.trim().length === 0) {
      issues.push('Feature description is required');
    }

    if (!config.targetAudience || config.targetAudience.trim().length === 0) {
      issues.push('Target audience is required');
    }

    if (!config.launchDate) {
      issues.push('Launch date is required');
    } else if (config.launchDate < new Date()) {
      issues.push('Launch date cannot be in the past');
    }

    if (!config.highlights || config.highlights.length === 0) {
      issues.push('At least one feature highlight is required');
    }

    // Check if agents are available
    const requiredAgents = ['marketing', 'sales', 'operations', 'support'];
    const availableAgents = this.orchestrator.getRegisteredAgents();

    const missingAgents = requiredAgents.filter(
      (agent) => !availableAgents.includes(agent)
    );

    if (missingAgents.length > 0) {
      issues.push(`Missing required agents: ${missingAgents.join(', ')}`);
    }

    const ready = issues.length === 0;

    this.logger.info('Readiness check complete', {
      feature: config.featureName,
      ready,
      issueCount: issues.length,
    });

    return { ready, issues };
  }

  /**
   * Rollback a feature launch (if things go wrong)
   *
   * Attempts to undo public-facing changes
   */
  async rollback(featureName: string): Promise<boolean> {
    this.logger.warn('Rolling back feature launch', { featureName });

    try {
      const taskRequest: TaskRequest = {
        id: crypto.randomUUID(),
        type: 'operations.monitoring' as TaskType,
        priority: 0 as Priority, // CRITICAL
        data: {
          action: 'rollback_feature',
          featureName,
          tasks: [
            'Remove announcement posts',
            'Send rollback notification',
            'Update knowledge base',
            'Alert support team',
          ],
        },
        requestedBy: 'feature-launch-workflow',
        timestamp: new Date(),
        metadata: {
          workflow: 'feature_rollback',
          featureName,
        },
      };

      const result = await this.orchestrator.executeTask(taskRequest);

      this.logger.info('Feature rollback completed', {
        featureName,
        success: result.success,
      });

      return result.success;
    } catch (error) {
      this.logger.error('Feature rollback failed', error as Error);
      return false;
    }
  }
}
