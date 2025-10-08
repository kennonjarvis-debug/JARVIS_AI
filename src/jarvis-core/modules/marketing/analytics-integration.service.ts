/**
 * Analytics Integration Service
 *
 * Integrates with GPT analytics services (analyzer, forecaster) to provide
 * intelligent insights and predictions
 */

import { revenueMetricsService } from './revenue-metrics.service';
import { gptAnalyticsService } from '../../../backend/services/gpt-analytics.service';
import { forecasterService } from '../../../backend/services/gpt/forecaster.service';
import { logger } from '../../../backend/utils/logger';

export interface AnalyticsReport {
  summary: string;
  keyMetrics: {
    revenue: number;
    growth: number;
    newUsers: number;
    churnRate: number;
  };
  insights: Array<{
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
    value?: string;
  }>;
  recommendations: string[];
  generatedAt: string;
}

class AnalyticsIntegrationService {
  private reportCount = 0;

  /**
   * Generate comprehensive report
   */
  async generateReport(type: string, period: string): Promise<AnalyticsReport> {
    try {
      logger.info('Generating analytics report', { type, period });

      // Get metrics
      const days = this.periodToDays(period);
      const summary = await revenueMetricsService.getMetricsSummary(days);

      // Analyze with GPT
      const gptAnalysis = await gptAnalyticsService.analyzeData({
        data: {
          totalRevenue: summary.totalRevenue,
          mrrGrowth: summary.mrrGrowth,
          newSubscribers: summary.newSubscribers,
          churnRate: summary.churnRate,
          arpu: summary.averageRevenuePerUser,
          planBreakdown: summary.planBreakdown,
        },
        query: `Analyze ${type} revenue and growth metrics for the past ${period}`,
        context: 'AI DAW SaaS business metrics',
      });

      // Build report
      const report: AnalyticsReport = {
        summary: gptAnalysis.summary,
        keyMetrics: {
          revenue: summary.totalRevenue,
          growth: summary.mrrGrowth,
          newUsers: summary.newSubscribers,
          churnRate: summary.churnRate,
        },
        insights: this.formatInsights(gptAnalysis.keyFindings),
        recommendations: gptAnalysis.recommendations,
        generatedAt: new Date().toISOString(),
      };

      this.reportCount++;
      return report;
    } catch (error) {
      logger.error('Report generation failed:', error);
      throw error;
    }
  }

  /**
   * Get analytics with GPT insights
   */
  async getAnalytics(timeRange: '7d' | '30d' | '90d'): Promise<any> {
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const summary = await revenueMetricsService.getMetricsSummary(days);

      // Get GPT insights
      const insights = await gptAnalyticsService.generateInsights({
        metrics: {
          totalRevenue: summary.totalRevenue,
          mrrGrowth: summary.mrrGrowth,
          newSubscribers: summary.newSubscribers,
          churnRate: summary.churnRate,
          averageRevenuePerUser: summary.averageRevenuePerUser,
        },
        timeRange,
        focus: ['revenue', 'growth', 'retention'],
      });

      return {
        summary,
        insights: insights.insights,
        actionItems: insights.actionItems,
        trends: insights.trends,
      };
    } catch (error) {
      logger.error('Analytics fetch failed:', error);
      throw error;
    }
  }

  /**
   * Forecast future metrics
   */
  async forecastMetric(metric: string, periods: number): Promise<any> {
    try {
      logger.info('Generating forecast', { metric, periods });

      // Get historical data
      const historicalData = await revenueMetricsService.getHistoricalData(
        metric as 'revenue' | 'users' | 'churn',
        60 // Last 60 days
      );

      if (historicalData.length < 7) {
        throw new Error('Insufficient historical data for forecasting');
      }

      // Generate forecast using GPT forecaster
      const forecast = await forecasterService.forecast({
        userId: 'system',
        metric,
        historicalData,
        periods,
        method: 'exponential_smoothing',
        includeConfidence: true,
      });

      return {
        metric,
        forecast: forecast.forecast,
        trend: forecast.trend,
        insights: forecast.insights,
        summary: forecast.summary,
        accuracy: forecast.accuracy,
      };
    } catch (error) {
      logger.error('Forecast generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate insights from analytics data
   */
  async generateInsights(analytics: any): Promise<string[]> {
    try {
      const insights = await gptAnalyticsService.generateInsights({
        metrics: analytics.summary,
        timeRange: '7d',
      });

      return insights.insights.map((i: any) => `${i.category}: ${i.message}`);
    } catch (error) {
      logger.error('Insights generation failed:', error);
      return ['Unable to generate insights at this time'];
    }
  }

  /**
   * Get report count for health monitoring
   */
  getReportCount(): number {
    return this.reportCount;
  }

  /**
   * Format GPT findings as insights
   */
  private formatInsights(findings: string[]): AnalyticsReport['insights'] {
    return findings.map((finding, index) => ({
      type: index === 0 ? 'success' : index === findings.length - 1 ? 'info' : 'warning',
      title: `Finding ${index + 1}`,
      description: finding,
    }));
  }

  /**
   * Convert period string to days
   */
  private periodToDays(period: string): number {
    if (period.endsWith('d')) {
      return parseInt(period.replace('d', ''));
    } else if (period.endsWith('h')) {
      return Math.ceil(parseInt(period.replace('h', '')) / 24);
    } else if (period.endsWith('w')) {
      return parseInt(period.replace('w', '')) * 7;
    } else if (period.endsWith('m')) {
      return parseInt(period.replace('m', '')) * 30;
    }
    return 30; // Default to 30 days
  }

  /**
   * Get growth rate analysis
   */
  async getGrowthAnalysis(timeRange: '7d' | '30d' | '90d'): Promise<any> {
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

      // Get revenue history
      const revenueHistory = await revenueMetricsService.getHistoricalData('revenue', days);
      const userHistory = await revenueMetricsService.getHistoricalData('users', days);

      // Calculate growth rates
      const revenueGrowth = this.calculateGrowthRate(revenueHistory);
      const userGrowth = this.calculateGrowthRate(userHistory);

      return {
        timeRange,
        revenueGrowth,
        userGrowth,
        trend: revenueGrowth > 5 ? 'increasing' : revenueGrowth < -5 ? 'decreasing' : 'stable',
        analysis: `Revenue growth: ${revenueGrowth.toFixed(2)}%, User growth: ${userGrowth.toFixed(2)}%`,
      };
    } catch (error) {
      logger.error('Growth analysis failed:', error);
      throw error;
    }
  }

  /**
   * Calculate growth rate from historical data
   */
  private calculateGrowthRate(data: Array<{ timestamp: string; value: number }>): number {
    if (data.length < 2) return 0;

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;

    if (firstValue === 0) return 0;

    return ((lastValue - firstValue) / firstValue) * 100;
  }
}

export const analyticsIntegrationService = new AnalyticsIntegrationService();
