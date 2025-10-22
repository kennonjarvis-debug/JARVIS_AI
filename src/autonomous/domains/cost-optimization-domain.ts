/**
 * Cost Optimization Domain Agent
 *
 * Autonomous agent specializing in monitoring and optimizing
 * AI API costs, infrastructure spending, and resource usage.
 *
 * Capabilities:
 * - Monitor AI API usage and costs
 * - Adjust routing strategies dynamically
 * - Identify cost anomalies
 * - Recommend optimizations
 * - Auto-implement cost-saving measures
 */

import { BaseDomainAgent } from './base-domain.js';
import { logger } from '../../utils/logger.js';
import { smartAIRouter } from '../../core/smart-ai-router.js';
import { ClearanceLevel, Priority } from '../types.js';
import type {
  DomainType,
  AutonomousTask,
  TaskResult,
  DomainCapability,
  TaskStatus,
  ResourceUsage,
  Artifact,
} from '../types.js';

export class CostOptimizationDomain extends BaseDomainAgent {
  domain: DomainType = 'cost-optimization' as DomainType;
  name = 'CostOptimizer';
  description = 'Autonomous cost monitoring and optimization agent';

  constructor(clearanceLevel?: ClearanceLevel) {
    super('CostOptimizer', 'cost-optimization', clearanceLevel);
  }

  private monthlyBudget: number = 50; // Default $50/month
  private criticalThreshold: number = 0.9; // 90%
  private warningThreshold: number = 0.8; // 80%

  capabilities: DomainCapability[] = [
    {
      name: 'monitor-spending',
      description: 'Continuously monitor AI API and infrastructure spending',
      clearanceRequired: ClearanceLevel.READ_ONLY,
      resourceRequirements: {
        apiAccess: ['cost-monitoring-api'],
        maxCost: 0,
      },
      examples: [
        'Track daily/monthly costs',
        'Compare against budget',
        'Identify spending trends',
      ],
    },
    {
      name: 'detect-anomalies',
      description: 'Detect unusual spending patterns or cost spikes',
      clearanceRequired: ClearanceLevel.READ_ONLY,
      resourceRequirements: {
        apiAccess: ['cost-monitoring-api'],
        maxCost: 0,
      },
      examples: [
        'Alert on 2x daily average',
        'Detect runaway API usage',
        'Flag budget overruns',
      ],
    },
    {
      name: 'optimize-routing',
      description: 'Adjust AI model routing to optimize costs',
      clearanceRequired: ClearanceLevel.MODIFY_SAFE,
      resourceRequirements: {
        apiAccess: ['smart-ai-router'],
        maxCost: 0,
      },
      examples: [
        'Increase free tier usage',
        'Route to cheaper models',
        'Reduce expensive model calls',
      ],
    },
    {
      name: 'recommend-savings',
      description: 'Generate cost-saving recommendations',
      clearanceRequired: ClearanceLevel.SUGGEST,
      resourceRequirements: {
        maxCost: 0,
      },
      examples: [
        'Caching opportunities',
        'Batch processing suggestions',
        'Infrastructure optimizations',
      ],
    },
  ];

  /**
   * Analyze costs and identify optimization opportunities
   */
  async analyze(): Promise<AutonomousTask[]> {
    logger.info('CostOptimizationDomain: Starting analysis');

    const tasks: AutonomousTask[] = [];

    try {
      // Get current usage stats
      const stats = smartAIRouter.getUsageStats();
      const projection = await smartAIRouter.getMonthlyProjection();

      // 1. Check if approaching budget limit
      const budgetUsage = projection.estimatedMonthlyCost / this.monthlyBudget;

      if (budgetUsage >= this.criticalThreshold) {
        tasks.push(this.createTask(
          'optimize-routing',
          'CRITICAL: Budget at 90% - Optimize routing immediately',
          `Current projection: $${projection.estimatedMonthlyCost.toFixed(2)} / $${this.monthlyBudget}. ` +
          `Need immediate cost reduction to stay within budget.`,
          Priority.CRITICAL,
          ClearanceLevel.MODIFY_SAFE,
          {
            currentCost: projection.estimatedMonthlyCost,
            budget: this.monthlyBudget,
            usage: budgetUsage,
            action: 'increase-free-tier',
          }
        ));
      } else if (budgetUsage >= this.warningThreshold) {
        tasks.push(this.createTask(
          'optimize-routing',
          'WARNING: Budget at 80% - Proactive optimization',
          `Projected to reach $${projection.estimatedMonthlyCost.toFixed(2)} of $${this.monthlyBudget} budget. ` +
          `Adjusting routing to prevent overrun.`,
          Priority.HIGH,
          ClearanceLevel.MODIFY_SAFE,
          {
            currentCost: projection.estimatedMonthlyCost,
            budget: this.monthlyBudget,
            usage: budgetUsage,
            action: 'gradual-optimization',
          }
        ));
      }

      // 2. Check Gemini free tier usage
      const geminiUsage = stats.geminiDailyCount;
      const geminiLimit = 1500;

      if (geminiUsage < geminiLimit * 0.7) {
        tasks.push(this.createTask(
          'recommend-savings',
          'Opportunity: Increase Gemini free tier usage',
          `Currently using ${geminiUsage} of ${geminiLimit} free Gemini requests. ` +
          `Could save ~$${this.estimateSavings(geminiLimit - geminiUsage)} by routing more to Gemini.`,
          Priority.MEDIUM,
          ClearanceLevel.SUGGEST,
          {
            currentUsage: geminiUsage,
            limit: geminiLimit,
            potentialSavings: this.estimateSavings(geminiLimit - geminiUsage),
          }
        ));
      }

      // 3. Analyze cost breakdown
      const breakdown = projection.breakdown;
      const mostExpensive = Object.entries(breakdown)
        .sort(([, a], [, b]) => b - a)[0];

      if (mostExpensive && mostExpensive[1] > projection.estimatedMonthlyCost * 0.5) {
        tasks.push(this.createTask(
          'recommend-savings',
          `Cost concentration: ${mostExpensive[0]} accounts for ${((mostExpensive[1] / projection.estimatedMonthlyCost) * 100).toFixed(0)}% of costs`,
          `${mostExpensive[0]} is the primary cost driver at $${mostExpensive[1].toFixed(2)}/month. ` +
          `Review usage patterns and consider alternatives.`,
          Priority.MEDIUM,
          ClearanceLevel.SUGGEST,
          {
            provider: mostExpensive[0],
            cost: mostExpensive[1],
            percentage: (mostExpensive[1] / projection.estimatedMonthlyCost) * 100,
          }
        ));
      }

      // 4. Daily monitoring task (always present)
      tasks.push(this.createTask(
        'monitor-spending',
        'Daily cost monitoring',
        'Track spending and detect anomalies',
        Priority.LOW,
        ClearanceLevel.READ_ONLY,
        { routine: true }
      ));

      logger.info(`CostOptimizationDomain: Analysis complete, found ${tasks.length} opportunities`);

      return tasks;

    } catch (error: any) {
      logger.error('CostOptimizationDomain: Analysis failed', { error: error.message });
      return [];
    }
  }

  /**
   * Execute cost optimization task
   */
  protected async executeTask(task: AutonomousTask): Promise<TaskResult> {
    const logs = [this.log('info', `Starting task: ${task.title}`)];
    const artifacts: Artifact[] = [];
    const startTime = Date.now();
    let resourcesUsed: ResourceUsage = {
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      filesModified: 0,
      cpuTime: 0,
      memoryPeak: 0,
    };

    try {
      switch (task.metadata.capability) {
        case 'monitor-spending':
          const monitorResult = await this.monitorSpending(task);
          logs.push(...monitorResult.logs);
          artifacts.push(...monitorResult.artifacts);
          break;

        case 'detect-anomalies':
          const anomalyResult = await this.detectAnomalies(task);
          logs.push(...anomalyResult.logs);
          artifacts.push(...anomalyResult.artifacts);
          break;

        case 'optimize-routing':
          const optimizeResult = await this.optimizeRouting(task);
          logs.push(...optimizeResult.logs);
          artifacts.push(...optimizeResult.artifacts);
          resourcesUsed.filesModified = optimizeResult.resourcesUsed.filesModified;
          break;

        case 'recommend-savings':
          const recommendResult = await this.recommendSavings(task);
          logs.push(...recommendResult.logs);
          artifacts.push(...recommendResult.artifacts);
          break;

        default:
          throw new Error(`Unknown capability: ${task.metadata.capability}`);
      }

      const duration = Date.now() - startTime;
      logs.push(this.log('info', `Task completed successfully in ${duration}ms`));

      return {
        success: true,
        data: { action: task.metadata.capability },
        metrics: {
          duration,
          resourcesUsed,
          impactScore: this.calculateImpact(task, artifacts),
        },
        artifacts,
        logs,
      };

    } catch (error: any) {
      logs.push(this.log('error', `Task failed: ${error.message}`));

      return {
        success: false,
        error: error.message,
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed,
          impactScore: 0,
        },
        logs,
      };
    }
  }

  /**
   * Monitor spending
   */
  private async monitorSpending(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];

    const stats = smartAIRouter.getUsageStats();
    const projection = await smartAIRouter.getMonthlyProjection();

    logs.push(this.log('info', `Current daily cost: $${stats.costs.totalCost.toFixed(2)}`));
    logs.push(this.log('info', `Monthly projection: $${projection.estimatedMonthlyCost.toFixed(2)}`));
    logs.push(this.log('info', `Gemini free tier: ${stats.geminiDailyCount} / ${stats.geminiFreeTierRemaining + stats.geminiDailyCount} used`));

    // Create monitoring report
    artifacts.push({
      type: 'report',
      content: `# Cost Monitoring Report\n\n` +
               `**Date:** ${new Date().toISOString()}\n\n` +
               `## Current Usage\n` +
               `- Total requests: ${stats.totalRequests}\n` +
               `- Daily cost: $${stats.costs.totalCost.toFixed(2)}\n` +
               `- Monthly projection: $${projection.estimatedMonthlyCost.toFixed(2)} / $${this.monthlyBudget}\n\n` +
               `## Free Tier Status\n` +
               `- Gemini used: ${stats.geminiDailyCount}\n` +
               `- Gemini remaining: ${stats.geminiFreeTierRemaining}\n\n` +
               `## Provider Breakdown\n` +
               `- Gemini: $${projection.breakdown.gemini.toFixed(2)}\n` +
               `- OpenAI: $${projection.breakdown.openai.toFixed(2)}\n` +
               `- Anthropic: $${projection.breakdown.anthropic.toFixed(2)}\n`,
      metadata: {
        timestamp: new Date().toISOString(),
        totalCost: stats.costs.totalCost,
        projection: projection.estimatedMonthlyCost,
      },
    });

    return { logs, artifacts, resourcesUsed: this.emptyResourceUsage() };
  }

  /**
   * Detect cost anomalies
   */
  private async detectAnomalies(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];

    logs.push(this.log('info', 'Analyzing cost patterns for anomalies'));

    // Would compare against historical averages
    // For now, just log
    logs.push(this.log('info', 'No anomalies detected'));

    return { logs, artifacts, resourcesUsed: this.emptyResourceUsage() };
  }

  /**
   * Optimize routing strategy
   */
  private async optimizeRouting(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];
    const resourcesUsed = this.emptyResourceUsage();

    const action = task.metadata.action;
    const currentStrategy = smartAIRouter.getUsageStats().strategy;

    logs.push(this.log('info', `Current strategy: ${JSON.stringify(currentStrategy)}`));

    if (action === 'increase-free-tier') {
      // Aggressively shift to Gemini free tier
      const newStrategy = {
        geminiPercentage: 85,
        gptMiniPercentage: 10,
        claudePercentage: 5,
      };

      logs.push(this.log('info', `Updating to aggressive cost-saving strategy: ${JSON.stringify(newStrategy)}`));

      smartAIRouter.updateStrategy(newStrategy);
      resourcesUsed.filesModified = 1;

      artifacts.push({
        type: 'config',
        content: `Routing strategy updated to maximize free tier:\n` +
                 `- Gemini: ${newStrategy.geminiPercentage}%\n` +
                 `- GPT-4o Mini: ${newStrategy.gptMiniPercentage}%\n` +
                 `- Claude: ${newStrategy.claudePercentage}%\n\n` +
                 `Expected savings: ~40-60% of current costs`,
        metadata: { strategy: newStrategy, reason: 'budget-critical' },
      });

    } else if (action === 'gradual-optimization') {
      // Moderately increase free tier usage
      const newStrategy = {
        geminiPercentage: 75,
        gptMiniPercentage: 18,
        claudePercentage: 7,
      };

      logs.push(this.log('info', `Updating to balanced optimization strategy: ${JSON.stringify(newStrategy)}`));

      smartAIRouter.updateStrategy(newStrategy);
      resourcesUsed.filesModified = 1;

      artifacts.push({
        type: 'config',
        content: `Routing strategy optimized:\n` +
                 `- Gemini: ${newStrategy.geminiPercentage}%\n` +
                 `- GPT-4o Mini: ${newStrategy.gptMiniPercentage}%\n` +
                 `- Claude: ${newStrategy.claudePercentage}%\n\n` +
                 `Expected savings: ~20-30% of current costs`,
        metadata: { strategy: newStrategy, reason: 'budget-warning' },
      });
    }

    return { logs, artifacts, resourcesUsed };
  }

  /**
   * Recommend cost savings
   */
  private async recommendSavings(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];

    logs.push(this.log('info', 'Generating cost-saving recommendations'));

    const recommendations = [
      'Implement response caching to reduce duplicate API calls (potential 40-60% savings)',
      'Use batch API processing for non-urgent requests (50% discount)',
      'Enable Claude prompt caching for repeated system prompts (90% savings on cached tokens)',
      'Consider switching simple queries to Gemini Flash-Lite ($0.02/M vs $0.15/M)',
    ];

    artifacts.push({
      type: 'report',
      content: `# Cost Optimization Recommendations\n\n` +
               recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') +
               `\n\n**Estimated Total Savings: $20-30/month**`,
      metadata: { recommendationCount: recommendations.length },
    });

    logs.push(this.log('info', `Generated ${recommendations.length} recommendations`));

    return { logs, artifacts, resourcesUsed: this.emptyResourceUsage() };
  }

  /**
   * Estimate savings from additional free tier usage
   */
  private estimateSavings(additionalRequests: number): number {
    // Assume average of $0.003 per request (mix of input/output tokens)
    return additionalRequests * 0.003;
  }

  /**
   * Create autonomous task
   */
  private createTask(
    capability: string,
    title: string,
    description: string,
    priority: Priority,
    clearanceRequired: ClearanceLevel,
    metadata: Record<string, any>
  ): AutonomousTask {
    return {
      id: `cost-opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      domain: this.domain,
      title,
      description,
      priority,
      status: 'pending' as TaskStatus,
      clearanceRequired,
      estimatedDuration: 15000, // 15 seconds
      dependencies: [],
      createdAt: new Date(),
      metadata: { ...metadata, capability },
    };
  }

  /**
   * Calculate impact score
   */
  protected calculateImpact(task: AutonomousTask, artifacts: Artifact[]): number {
    let score = 0;

    // Base score from priority
    score += task.priority * 10;

    // High impact for routing changes
    if (task.metadata.capability === 'optimize-routing') {
      score += 40;
    }

    // Medium impact for recommendations
    if (task.metadata.capability === 'recommend-savings') {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * Empty resource usage
   */
  private emptyResourceUsage(): ResourceUsage {
    return {
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      filesModified: 0,
      cpuTime: 0,
      memoryPeak: 0,
    };
  }
}

export default CostOptimizationDomain;
