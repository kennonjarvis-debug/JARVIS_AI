/**
 * Jarvis Cloud Intelligence - Main Export
 *
 * Continuous improvement analytics engine
 */

export { CloudIntelligenceService, getCloudIntelligence, type AnalyticsConfig, type AnalysisResult } from './cloud-intelligence.service';
export { PatternDetector, type TestPattern, type TestAnalysisResult } from './pattern-detector';
export { PerformanceAnalyzer, type ModuleHealth, type PerformanceAnalysisResult } from './performance-analyzer';
export { DeploymentAnalyzer, type DeploymentAnalysisResult } from './deployment-analyzer';
export { VitalityCorrelation, type Correlation, type VitalityAnalysisResult } from './vitality-correlation';
export { ReportGenerator } from './report-generator';
export { GoalUpdater } from './goal-updater';
export { NotificationService, type Alert } from './notification.service';

/**
 * Initialize Cloud Intelligence Service with default configuration
 */
import path from 'path';
import { getCloudIntelligence, type AnalyticsConfig } from './cloud-intelligence.service';

export function initializeCloudIntelligence(customConfig?: Partial<AnalyticsConfig>) {
  const defaultConfig: AnalyticsConfig = {
    dataPath: path.join(process.cwd()),
    outputPath: path.join(process.cwd()),
    notificationThreshold: 85, // Alert if module/test drops below 85%
    analysisInterval: 86400000, // 24 hours in milliseconds
    enableAutoGoalUpdate: true,
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  };

  const config = { ...defaultConfig, ...customConfig };
  return getCloudIntelligence(config);
}
