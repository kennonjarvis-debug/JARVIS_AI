/**
 * Jarvis Marketing Module
 *
 * Handles:
 * - Revenue/growth metrics tracking
 * - GPT analytics feedback loops
 * - Campaign automation
 * - Scheduled reporting (daily/weekly)
 */

import { BaseModule } from '../../core/base-module';
import { Router } from 'express';
import { ScheduledJob, JarvisCommand, JarvisCommandResult } from '../../core/jarvis.interfaces';
import { revenueMetricsService } from './revenue-metrics.service';
import { campaignService } from './campaign.service';
import { analyticsIntegrationService } from './analytics-integration.service';
import { asyncHandler } from '../../../backend/middleware/errorHandler';

export class MarketingModule extends BaseModule {
  name = 'marketing';
  version = '1.0.0';
  description = 'Marketing automation, revenue tracking, and GPT analytics';
  dependencies = []; // No module dependencies

  /**
   * Initialize module
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info('🎯 Initializing Marketing Module...');

    // Register command handlers
    this.registerCommand('get-revenue', this.handleGetRevenue.bind(this));
    this.registerCommand('get-metrics', this.handleGetMetrics.bind(this));
    this.registerCommand('generate-report', this.handleGenerateReport.bind(this));
    this.registerCommand('run-campaign', this.handleRunCampaign.bind(this));
    this.registerCommand('analyze-growth', this.handleAnalyzeGrowth.bind(this));
    this.registerCommand('forecast-revenue', this.handleForecastRevenue.bind(this));

    this.logger.info('✅ Marketing Module initialized');
  }

  /**
   * Shutdown module
   */
  protected async onShutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Marketing Module...');
    // Cleanup logic if needed
  }

  /**
   * Register routes
   */
  protected onRegisterRoutes(router: Router): void {
    // GET /api/v1/jarvis/marketing/revenue
    router.get(
      '/revenue',
      asyncHandler(async (req: any, res) => {
        const { startDate, endDate, plan } = req.query;

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const revenue = await revenueMetricsService.getRevenue(
          start,
          end,
          plan as 'FREE' | 'PRO' | 'ENTERPRISE' | undefined
        );

        res.json({ success: true, data: revenue });
      })
    );

    // GET /api/v1/jarvis/marketing/metrics
    router.get(
      '/metrics',
      asyncHandler(async (req: any, res) => {
        const metrics = await revenueMetricsService.getMetricsSummary();
        res.json({ success: true, data: metrics });
      })
    );

    // POST /api/v1/jarvis/marketing/report
    router.post(
      '/report',
      asyncHandler(async (req: any, res) => {
        const { type, period } = req.body;
        const report = await analyticsIntegrationService.generateReport(type, period);
        res.json({ success: true, data: report });
      })
    );

    // POST /api/v1/jarvis/marketing/campaign
    router.post(
      '/campaign',
      asyncHandler(async (req: any, res) => {
        const { type, target, content } = req.body;
        const result = await campaignService.runCampaign(type, target, content);
        res.json({ success: true, data: result });
      })
    );

    // GET /api/v1/jarvis/marketing/analytics
    router.get(
      '/analytics',
      asyncHandler(async (req: any, res) => {
        const { timeRange } = req.query;
        const analytics = await analyticsIntegrationService.getAnalytics(
          timeRange as '7d' | '30d' | '90d' || '30d'
        );
        res.json({ success: true, data: analytics });
      })
    );

    // GET /api/v1/jarvis/marketing/forecast
    router.get(
      '/forecast',
      asyncHandler(async (req: any, res) => {
        const { metric, periods } = req.query;
        const forecast = await analyticsIntegrationService.forecastMetric(
          metric as string || 'revenue',
          parseInt(periods as string) || 7
        );
        res.json({ success: true, data: forecast });
      })
    );
  }

  /**
   * Health metrics
   */
  protected async onGetHealthMetrics() {
    const campaignStats = await campaignService.getStats();
    const revenueStats = await revenueMetricsService.getStats();

    return {
      cpuUsage: 25,
      memoryUsage: 128,
      errorRate: 0,
      activeConnections: 5,

      // Custom metrics
      activeCampaigns: campaignStats.active,
      totalRevenue: revenueStats.totalRevenue,
      mrrGrowthRate: revenueStats.mrrGrowth,
      reportsGenerated: analyticsIntegrationService.getReportCount(),
    };
  }

  /**
   * Scheduled jobs
   */
  protected onGetScheduledJobs(): ScheduledJob[] {
    return [
      {
        id: 'daily-revenue-report',
        name: 'Daily Revenue Report',
        schedule: '0 9 * * *', // 9 AM daily
        handler: this.generateDailyReport.bind(this),
        enabled: true,
        description: 'Generate and send daily revenue report',
        timezone: 'America/Los_Angeles',
        retry: {
          maxAttempts: 3,
          delayMs: 5000,
        },
      },
      {
        id: 'weekly-growth-analysis',
        name: 'Weekly Growth Analysis',
        schedule: '0 10 * * 1', // 10 AM every Monday
        handler: this.runWeeklyAnalysis.bind(this),
        enabled: true,
        description: 'Analyze weekly growth and send insights',
        timezone: 'America/Los_Angeles',
        retry: {
          maxAttempts: 3,
          delayMs: 10000,
        },
      },
      {
        id: 'hourly-metrics-sync',
        name: 'Hourly Metrics Sync',
        schedule: '0 * * * *', // Every hour
        handler: this.syncMetrics.bind(this),
        enabled: true,
        description: 'Sync revenue metrics from database',
        timezone: 'UTC',
      },
      {
        id: 'monthly-forecast',
        name: 'Monthly Revenue Forecast',
        schedule: '0 10 1 * *', // 10 AM on the 1st of each month
        handler: this.generateMonthlyForecast.bind(this),
        enabled: true,
        description: 'Generate monthly revenue forecast',
        timezone: 'America/Los_Angeles',
      },
    ];
  }

  // ==================== Command Handlers ====================

  /**
   * Get revenue metrics
   */
  private async handleGetRevenue(params: { startDate?: string; endDate?: string; plan?: string }) {
    const start = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = params.endDate ? new Date(params.endDate) : new Date();

    const revenue = await revenueMetricsService.getRevenue(
      start,
      end,
      params.plan as 'FREE' | 'PRO' | 'ENTERPRISE' | undefined
    );

    return { revenue };
  }

  /**
   * Get metrics summary
   */
  private async handleGetMetrics(params: any) {
    const metrics = await revenueMetricsService.getMetricsSummary();
    return { metrics };
  }

  /**
   * Generate report
   */
  private async handleGenerateReport(params: { type: string; period?: string }) {
    const report = await analyticsIntegrationService.generateReport(params.type, params.period || '30d');
    return { report };
  }

  /**
   * Run campaign
   */
  private async handleRunCampaign(params: { type: string; target: any; content: any }) {
    const result = await campaignService.runCampaign(params.type, params.target, params.content);
    return { campaignResult: result };
  }

  /**
   * Analyze growth
   */
  private async handleAnalyzeGrowth(params: { timeRange?: string }) {
    const analytics = await analyticsIntegrationService.getAnalytics(
      params.timeRange as '7d' | '30d' | '90d' || '30d'
    );
    return { analytics };
  }

  /**
   * Forecast revenue
   */
  private async handleForecastRevenue(params: { metric?: string; periods?: number }) {
    const forecast = await analyticsIntegrationService.forecastMetric(
      params.metric || 'revenue',
      params.periods || 7
    );
    return { forecast };
  }

  // ==================== Scheduled Job Handlers ====================

  /**
   * Generate daily revenue report
   */
  private async generateDailyReport(): Promise<void> {
    this.logger.info('📊 Generating daily revenue report...');

    try {
      const report = await analyticsIntegrationService.generateReport('daily', '24h');

      // Send report via campaign service
      await campaignService.sendReport({
        type: 'daily_revenue',
        recipients: ['admin@aidaw.com'], // TODO: Get from config
        report,
      });

      this.logger.info('✅ Daily report generated and sent');
    } catch (error) {
      this.logger.error('❌ Failed to generate daily report:', error);
      throw error;
    }
  }

  /**
   * Run weekly growth analysis
   */
  private async runWeeklyAnalysis(): Promise<void> {
    this.logger.info('📈 Running weekly growth analysis...');

    try {
      const analytics = await analyticsIntegrationService.getAnalytics('7d');

      // Generate insights
      const insights = await analyticsIntegrationService.generateInsights(analytics);

      // Send to stakeholders
      await campaignService.sendReport({
        type: 'weekly_analysis',
        recipients: ['admin@aidaw.com'],
        report: { analytics, insights },
      });

      this.logger.info('✅ Weekly analysis complete');
    } catch (error) {
      this.logger.error('❌ Weekly analysis failed:', error);
      throw error;
    }
  }

  /**
   * Sync metrics from database
   */
  private async syncMetrics(): Promise<void> {
    this.logger.info('🔄 Syncing revenue metrics...');

    try {
      await revenueMetricsService.syncFromDatabase();
      this.logger.info('✅ Metrics synced');
    } catch (error) {
      this.logger.error('❌ Metrics sync failed:', error);
      throw error;
    }
  }

  /**
   * Generate monthly forecast
   */
  private async generateMonthlyForecast(): Promise<void> {
    this.logger.info('🔮 Generating monthly forecast...');

    try {
      const forecast = await analyticsIntegrationService.forecastMetric('revenue', 30);

      await campaignService.sendReport({
        type: 'monthly_forecast',
        recipients: ['admin@aidaw.com'],
        report: { forecast },
      });

      this.logger.info('✅ Monthly forecast generated');
    } catch (error) {
      this.logger.error('❌ Monthly forecast failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new MarketingModule();
