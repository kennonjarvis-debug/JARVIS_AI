/**
 * Goal Updater
 *
 * Automatically updates strategic goals based on analytics data
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger';
import type { AnalysisResult } from './cloud-intelligence.service';

export class GoalUpdater {
  private goalsPath: string;

  constructor() {
    this.goalsPath = path.join(process.cwd(), 'memory/strategic-goals-v2.json');
  }

  /**
   * Update strategic goals based on analysis results
   */
  async updateGoals(analysis: AnalysisResult): Promise<boolean> {
    try {
      // Load current goals
      const goalsContent = await fs.readFile(this.goalsPath, 'utf-8');
      const goals = JSON.parse(goalsContent);

      let updated = false;

      // Update based on test results
      if (analysis.testResults.passRate < 85) {
        updated = this.updateAutomationGoal(goals, analysis) || updated;
      }

      // Update based on deployment success
      if (analysis.deployments.successRate < 90) {
        updated = this.updateAutomationGoal(goals, analysis) || updated;
      }

      // Update based on module health
      for (const [moduleName, health] of Object.entries(analysis.moduleHealth)) {
        if (health.score < 85) {
          updated = this.updateModuleGoal(goals, moduleName, health) || updated;
        }
      }

      // Update analytics goal based on insight quality
      updated = this.updateIntelligenceGoal(goals, analysis) || updated;

      // Save if changes were made
      if (updated) {
        goals.last_updated = new Date().toISOString();
        goals.updated_by = 'cloud-intelligence-service';

        await fs.writeFile(this.goalsPath, JSON.stringify(goals, null, 2));
        logger.info('✅ Strategic goals updated successfully');
      } else {
        logger.info('ℹ️ No goal updates required');
      }

      return updated;
    } catch (error) {
      logger.error('❌ Failed to update strategic goals:', error);
      return false;
    }
  }

  /**
   * Update automation goal based on CI/CD performance
   */
  private updateAutomationGoal(goals: any, analysis: AnalysisResult): boolean {
    const automation = goals.objectives?.workflow_automation;
    if (!automation) return false;

    let updated = false;

    // Update job failure rate target if current rate is problematic
    const failureRateMetric = automation.monitored_metrics?.find(
      (m: any) => m.name === 'job_failure_rate'
    );

    if (failureRateMetric) {
      const currentFailureRate = 100 - analysis.testResults.passRate;
      const targetValue = parseFloat(failureRateMetric.target.replace('< ', ''));

      if (currentFailureRate > targetValue) {
        // Adjust target to be more realistic but still aspirational
        const newTarget = Math.min(currentFailureRate * 0.8, 10);
        failureRateMetric.target = `< ${newTarget.toFixed(0)}`;
        updated = true;

        logger.info(
          `Updated job_failure_rate target from < ${targetValue}% to < ${newTarget.toFixed(0)}%`
        );
      }
    }

    return updated;
  }

  /**
   * Update module-specific goals
   */
  private updateModuleGoal(goals: any, moduleName: string, health: any): boolean {
    // Map module names to goal categories
    const moduleGoalMap: { [key: string]: string } = {
      music: 'music_generation',
      marketing: 'marketing_strategy',
      engagement: 'user_engagement',
      automation: 'workflow_automation',
      intelligence: 'business_intelligence',
    };

    const goalKey = moduleGoalMap[moduleName.toLowerCase()];
    if (!goalKey) return false;

    const goal = goals.objectives?.[goalKey];
    if (!goal) return false;

    // Add priority flag if module health is critical
    if (health.score < 70 && !goal.high_priority) {
      goal.high_priority = true;
      goal.priority_reason = `Module health dropped to ${health.score}/100`;
      logger.info(`Set high priority flag for ${goalKey}: ${goal.priority_reason}`);
      return true;
    }

    // Remove priority flag if module recovered
    if (health.score >= 85 && goal.high_priority) {
      goal.high_priority = false;
      delete goal.priority_reason;
      logger.info(`Removed high priority flag for ${goalKey}: module recovered to ${health.score}/100`);
      return true;
    }

    return false;
  }

  /**
   * Update business intelligence goal
   */
  private updateIntelligenceGoal(goals: any, analysis: AnalysisResult): boolean {
    const intelligence = goals.objectives?.business_intelligence;
    if (!intelligence) return false;

    let updated = false;

    // Calculate insight accuracy based on recommendation quality
    const highPriorityRecs = analysis.recommendations.filter(r => r.priority === 'high').length;
    const totalRecs = analysis.recommendations.length;

    if (totalRecs > 0) {
      const insightQuality = ((totalRecs - highPriorityRecs) / totalRecs) * 100;

      const accuracyMetric = intelligence.monitored_metrics?.find(
        (m: any) => m.name === 'insight_accuracy'
      );

      if (accuracyMetric && insightQuality < 80) {
        // Track insight performance for future optimization
        if (!intelligence.performance_tracking) {
          intelligence.performance_tracking = [];
        }

        intelligence.performance_tracking.push({
          timestamp: new Date().toISOString(),
          insight_quality: insightQuality,
          high_priority_issues: highPriorityRecs,
        });

        // Keep only last 30 days of tracking
        intelligence.performance_tracking = intelligence.performance_tracking.slice(-30);

        updated = true;
      }
    }

    return updated;
  }
}
