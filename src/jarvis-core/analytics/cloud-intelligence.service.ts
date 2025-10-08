/**
 * Jarvis Cloud Intelligence Service
 *
 * Continuous improvement engine that:
 * - Collects data from logs, tests, and deployments
 * - Detects patterns and regressions
 * - Generates actionable insights
 * - Updates strategic goals automatically
 * - Sends Slack notifications for critical issues
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../backend/utils/logger';
import { PatternDetector } from './pattern-detector';
import { PerformanceAnalyzer } from './performance-analyzer';
import { DeploymentAnalyzer } from './deployment-analyzer';
import { VitalityCorrelation } from './vitality-correlation';
import { ReportGenerator } from './report-generator';
import { GoalUpdater } from './goal-updater';
import { NotificationService } from './notification.service';

export interface AnalyticsConfig {
  dataPath: string;
  outputPath: string;
  notificationThreshold: number; // Success rate threshold for alerts (e.g., 85%)
  analysisInterval: number; // How often to run analysis (ms)
  enableAutoGoalUpdate: boolean;
  slackWebhookUrl?: string;
}

export interface AnalysisResult {
  timestamp: string;
  vitalityIndex: number;
  moduleHealth: {
    [key: string]: {
      score: number;
      status: 'healthy' | 'warning' | 'critical';
      issues: string[];
      recommendations: string[];
    };
  };
  testResults: {
    totalTests: number;
    passed: number;
    failed: number;
    passRate: number;
    failurePatterns: Array<{
      pattern: string;
      frequency: number;
      affectedModules: string[];
    }>;
  };
  deployments: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    avgDuration: number;
    trends: string[];
  };
  correlations: Array<{
    metric1: string;
    metric2: string;
    correlation: number;
    insight: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    estimatedImpact: string;
    actionRequired: boolean;
  }>;
  goalsUpdated: boolean;
  alertsSent: string[];
}

class CloudIntelligenceService {
  private config: AnalyticsConfig;
  private patternDetector: PatternDetector;
  private performanceAnalyzer: PerformanceAnalyzer;
  private deploymentAnalyzer: DeploymentAnalyzer;
  private vitalityCorrelation: VitalityCorrelation;
  private reportGenerator: ReportGenerator;
  private goalUpdater: GoalUpdater;
  private notificationService: NotificationService;
  private analysisTimer?: NodeJS.Timeout;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.patternDetector = new PatternDetector();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.deploymentAnalyzer = new DeploymentAnalyzer();
    this.vitalityCorrelation = new VitalityCorrelation();
    this.reportGenerator = new ReportGenerator();
    this.goalUpdater = new GoalUpdater();
    this.notificationService = new NotificationService(config.slackWebhookUrl);
  }

  /**
   * Start continuous analytics engine
   */
  async start(): Promise<void> {
    logger.info('🧠 Cloud Intelligence Service starting...');

    // Run initial analysis
    await this.runAnalysis();

    // Schedule periodic analysis
    this.analysisTimer = setInterval(
      () => this.runAnalysis(),
      this.config.analysisInterval
    );

    logger.info(
      `✅ Cloud Intelligence Service started (interval: ${this.config.analysisInterval / 1000}s)`
    );
  }

  /**
   * Stop continuous analytics
   */
  stop(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
    }
    logger.info('🛑 Cloud Intelligence Service stopped');
  }

  /**
   * Run complete analysis pipeline
   */
  async runAnalysis(): Promise<AnalysisResult> {
    const startTime = Date.now();
    logger.info('📊 Starting Cloud Intelligence analysis...');

    try {
      // Step 1: Collect data from all sources
      const data = await this.collectData();

      // Step 2: Run analysis pipelines
      const testAnalysis = await this.patternDetector.analyzeTestResults(data.tests);
      const perfAnalysis = await this.performanceAnalyzer.analyze(data.performance);
      const deployAnalysis = await this.deploymentAnalyzer.analyze(data.deployments);
      const vitalityAnalysis = await this.vitalityCorrelation.analyze(
        data.vitality,
        data.tests,
        data.performance
      );

      // Step 3: Generate insights and recommendations
      const result: AnalysisResult = {
        timestamp: new Date().toISOString(),
        vitalityIndex: vitalityAnalysis.currentVitality,
        moduleHealth: perfAnalysis.moduleHealth,
        testResults: {
          totalTests: testAnalysis.totalTests,
          passed: testAnalysis.passed,
          failed: testAnalysis.failed,
          passRate: testAnalysis.passRate,
          failurePatterns: testAnalysis.patterns,
        },
        deployments: {
          total: deployAnalysis.total,
          successful: deployAnalysis.successful,
          failed: deployAnalysis.failed,
          successRate: deployAnalysis.successRate,
          avgDuration: deployAnalysis.avgDuration,
          trends: deployAnalysis.trends,
        },
        correlations: vitalityAnalysis.correlations,
        recommendations: this.generateRecommendations(
          testAnalysis,
          perfAnalysis,
          deployAnalysis,
          vitalityAnalysis
        ),
        goalsUpdated: false,
        alertsSent: [],
      };

      // Step 4: Update strategic goals if enabled
      if (this.config.enableAutoGoalUpdate) {
        result.goalsUpdated = await this.goalUpdater.updateGoals(result);
      }

      // Step 5: Check for alerts
      result.alertsSent = await this.checkAndSendAlerts(result);

      // Step 6: Generate and save reports
      await this.saveReports(result);

      const duration = Date.now() - startTime;
      logger.info(`✅ Cloud Intelligence analysis complete (${duration}ms)`);
      logger.info(
        `   Vitality: ${result.vitalityIndex}/100, Test Pass Rate: ${result.testResults.passRate}%, Deploy Success: ${result.deployments.successRate}%`
      );

      return result;
    } catch (error) {
      logger.error('❌ Cloud Intelligence analysis failed:', error);
      throw error;
    }
  }

  /**
   * Collect data from all sources
   */
  private async collectData(): Promise<{
    tests: any[];
    performance: any[];
    deployments: any[];
    vitality: any[];
  }> {
    const [tests, performance, deployments, vitality] = await Promise.all([
      this.collectTestData(),
      this.collectPerformanceData(),
      this.collectDeploymentData(),
      this.collectVitalityData(),
    ]);

    return { tests, performance, deployments, vitality };
  }

  private async collectTestData(): Promise<any[]> {
    const testsDir = path.join(this.config.dataPath, 'logs/tests');
    const files = await fs.readdir(testsDir);
    const testData: any[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(testsDir, file), 'utf-8');
        testData.push(JSON.parse(content));
      }
    }

    return testData;
  }

  private async collectPerformanceData(): Promise<any[]> {
    const perfLogPath = path.join(this.config.dataPath, 'logs/jarvis/adaptive-history.log');

    try {
      const content = await fs.readFile(perfLogPath, 'utf-8');
      const lines = content.trim().split('\n');
      return lines.map(line => JSON.parse(line));
    } catch (error) {
      logger.warn('No performance data found');
      return [];
    }
  }

  private async collectDeploymentData(): Promise<any[]> {
    const deployDir = path.join(this.config.dataPath, 'outputs/deploy');

    try {
      const files = await fs.readdir(deployDir);
      const deployData: any[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(deployDir, file), 'utf-8');
          deployData.push(JSON.parse(content));
        }
      }

      return deployData;
    } catch (error) {
      logger.warn('No deployment data found');
      return [];
    }
  }

  private async collectVitalityData(): Promise<any[]> {
    const vitalityDir = path.join(this.config.dataPath, 'logs/jarvis');
    const files = await fs.readdir(vitalityDir);
    const vitalityData: any[] = [];

    for (const file of files) {
      if (file.includes('cloud-integration-verification') && file.endsWith('.json')) {
        const content = await fs.readFile(path.join(vitalityDir, file), 'utf-8');
        vitalityData.push(JSON.parse(content));
      }
    }

    return vitalityData;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    testAnalysis: any,
    perfAnalysis: any,
    deployAnalysis: any,
    vitalityAnalysis: any
  ): AnalysisResult['recommendations'] {
    const recommendations: AnalysisResult['recommendations'] = [];

    // Test failure recommendations
    if (testAnalysis.passRate < 95) {
      recommendations.push({
        priority: 'high',
        category: 'testing',
        title: 'Improve test reliability',
        description: `Test pass rate is ${testAnalysis.passRate}% (target: 95%+). Address recurring failure patterns.`,
        estimatedImpact: 'High - improves deployment confidence',
        actionRequired: true,
      });
    }

    // Performance degradation
    for (const [module, health] of Object.entries(perfAnalysis.moduleHealth)) {
      const moduleHealth = health as any;
      if (moduleHealth.score < 85) {
        recommendations.push({
          priority: moduleHealth.score < 70 ? 'high' : 'medium',
          category: 'performance',
          title: `Optimize ${module} module`,
          description: `Module health score: ${moduleHealth.score}/100. ${moduleHealth.issues.join(', ')}`,
          estimatedImpact: 'Medium - improves user experience',
          actionRequired: moduleHealth.score < 70,
        });
      }
    }

    // Deployment issues
    if (deployAnalysis.successRate < 90) {
      recommendations.push({
        priority: 'high',
        category: 'deployment',
        title: 'Stabilize deployment pipeline',
        description: `Deployment success rate is ${deployAnalysis.successRate}% (target: 95%+).`,
        estimatedImpact: 'High - reduces downtime risk',
        actionRequired: true,
      });
    }

    // Vitality correlations
    vitalityAnalysis.correlations.forEach((corr: any) => {
      if (Math.abs(corr.correlation) > 0.7) {
        recommendations.push({
          priority: 'medium',
          category: 'correlation',
          title: corr.insight,
          description: `Strong correlation detected (${(corr.correlation * 100).toFixed(0)}%) between ${corr.metric1} and ${corr.metric2}`,
          estimatedImpact: 'Medium - enables predictive optimization',
          actionRequired: false,
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Check thresholds and send alerts
   */
  private async checkAndSendAlerts(result: AnalysisResult): Promise<string[]> {
    const alerts: string[] = [];

    // Check for modules below threshold
    for (const [module, health] of Object.entries(result.moduleHealth)) {
      if (health.score < this.config.notificationThreshold) {
        const alert = `🚨 Module "${module}" health dropped to ${health.score}% (threshold: ${this.config.notificationThreshold}%)`;
        alerts.push(alert);

        await this.notificationService.sendAlert({
          title: 'Module Health Alert',
          message: alert,
          severity: health.score < 70 ? 'critical' : 'warning',
          details: {
            module,
            score: health.score,
            issues: health.issues,
            recommendations: health.recommendations,
          },
        });
      }
    }

    // Check test pass rate
    if (result.testResults.passRate < this.config.notificationThreshold) {
      const alert = `🚨 Test pass rate dropped to ${result.testResults.passRate}% (threshold: ${this.config.notificationThreshold}%)`;
      alerts.push(alert);

      await this.notificationService.sendAlert({
        title: 'Test Quality Alert',
        message: alert,
        severity: 'warning',
        details: {
          passRate: result.testResults.passRate,
          failedTests: result.testResults.failed,
          patterns: result.testResults.failurePatterns,
        },
      });
    }

    // Check deployment success rate
    if (result.deployments.successRate < 90) {
      const alert = `🚨 Deployment success rate: ${result.deployments.successRate}% (target: 95%+)`;
      alerts.push(alert);

      await this.notificationService.sendAlert({
        title: 'Deployment Reliability Alert',
        message: alert,
        severity: 'warning',
        details: {
          successRate: result.deployments.successRate,
          failedDeployments: result.deployments.failed,
          trends: result.deployments.trends,
        },
      });
    }

    return alerts;
  }

  /**
   * Save reports to filesystem
   */
  private async saveReports(result: AnalysisResult): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const reportDir = path.join(this.config.outputPath, 'logs/jarvis/analytics');

    // Ensure directory exists
    await fs.mkdir(reportDir, { recursive: true });

    // Save JSON report
    const jsonPath = path.join(reportDir, `analytics-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(result, null, 2));

    // Generate and save Markdown report
    const markdown = await this.reportGenerator.generateMarkdown(result);
    const mdPath = path.join(reportDir, `analytics-${timestamp}.md`);
    await fs.writeFile(mdPath, markdown);

    logger.info(`📄 Reports saved: ${jsonPath}, ${mdPath}`);
  }

  /**
   * Get latest analysis result
   */
  async getLatestAnalysis(): Promise<AnalysisResult | null> {
    try {
      const reportDir = path.join(this.config.outputPath, 'logs/jarvis/analytics');
      const files = await fs.readdir(reportDir);
      const jsonFiles = files.filter(f => f.startsWith('analytics-') && f.endsWith('.json'));

      if (jsonFiles.length === 0) {
        return null;
      }

      // Get most recent file
      const latest = jsonFiles.sort().reverse()[0];
      const content = await fs.readFile(path.join(reportDir, latest), 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to get latest analysis:', error);
      return null;
    }
  }
}

// Singleton instance
let cloudIntelligence: CloudIntelligenceService | null = null;

export function getCloudIntelligence(config?: AnalyticsConfig): CloudIntelligenceService {
  if (!cloudIntelligence && config) {
    cloudIntelligence = new CloudIntelligenceService(config);
  }

  if (!cloudIntelligence) {
    throw new Error('Cloud Intelligence Service not initialized');
  }

  return cloudIntelligence;
}

export { CloudIntelligenceService };
