/**
 * Analytics Service
 *
 * Aggregates and analyzes business metrics from all modules:
 * - Operations (AI usage, system health)
 * - Marketing (campaigns, conversion rates)
 * - Sales (leads, revenue)
 * - Support (tickets, satisfaction)
 *
 * Features:
 * - Real-time metric aggregation
 * - Trend analysis and forecasting
 * - Custom dashboards
 * - Anomaly detection
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import {
  BusinessMetrics,
  AnalyticsTrend,
  BusinessEvent
} from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export interface AnalyticsConfig {
  retentionDays: number; // How long to keep metrics snapshots
  snapshotInterval: string; // e.g., '1h', '15m'
  dashboards: string[]; // Pre-configured dashboards
  anomalyDetection?: {
    enabled: boolean;
    sensitivity: number; // 0-1, higher = more sensitive
  };
}

export class AnalyticsService extends EventEmitter {
  private prisma: PrismaClient;
  private config: AnalyticsConfig;
  private isInitialized: boolean = false;
  private snapshotIntervalId: NodeJS.Timeout | null = null;

  constructor(config: AnalyticsConfig) {
    super();
    this.prisma = new PrismaClient();
    this.config = config;
  }

  /**
   * Initialize analytics service
   */
  async initialize(): Promise<void> {
    logger.info('Analytics service initializing', {
      service: 'analytics',
      dashboards: this.config.dashboards
    });

    try {
      // Start snapshot collection
      this.startSnapshotInterval();

      this.isInitialized = true;
      logger.info('Analytics service initialized successfully', {
        service: 'analytics'
      });
    } catch (error) {
      logger.error('Failed to initialize analytics service', {
        service: 'analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get comprehensive business overview
   */
  async getOverview(timeframe: { start: Date; end: Date }): Promise<BusinessMetrics> {
    logger.info('Generating business overview', {
      service: 'analytics',
      start: timeframe.start.toISOString(),
      end: timeframe.end.toISOString()
    });

    try {
      // Gather metrics from all sources
      const [operations, marketing, sales, support] = await Promise.all([
        this.getOperationsMetrics(timeframe),
        this.getMarketingMetrics(timeframe),
        this.getSalesMetrics(timeframe),
        this.getSupportMetrics(timeframe)
      ]);

      const metrics: BusinessMetrics = {
        timeframe,
        operations,
        marketing,
        sales,
        support
      };

      // Optionally save snapshot
      await this.saveSnapshot(metrics);

      return metrics;
    } catch (error) {
      logger.error('Failed to generate business overview', {
        service: 'analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get operations metrics (AI usage, system health)
   */
  private async getOperationsMetrics(timeframe: { start: Date; end: Date }): Promise<BusinessMetrics['operations']> {
    // Query AI usage from database
    const aiUsage = await this.prisma.aIUsage.findMany({
      where: {
        timestamp: {
          gte: timeframe.start,
          lte: timeframe.end
        }
      }
    });

    const totalRequests = aiUsage.length;
    const totalCost = aiUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0);

    const byProvider: Record<string, { requests: number; cost: number }> = {};

    aiUsage.forEach(usage => {
      if (!byProvider[usage.provider]) {
        byProvider[usage.provider] = { requests: 0, cost: 0 };
      }
      byProvider[usage.provider].requests++;
      byProvider[usage.provider].cost += usage.cost || 0;
    });

    // Query system health metrics
    const healthMetrics = await this.prisma.healthMetric.findMany({
      where: {
        timestamp: {
          gte: timeframe.start,
          lte: timeframe.end
        }
      }
    });

    const totalChecks = healthMetrics.length;
    const healthyChecks = healthMetrics.filter(m => m.status === 'healthy').length;
    const uptime = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 100;

    // Count incidents (periods of downtime)
    const incidents = this.countIncidents(healthMetrics);

    // Calculate mean time to recovery (MTTR)
    const mttr = this.calculateMTTR(healthMetrics);

    return {
      aiUsage: {
        totalRequests,
        totalCost,
        byProvider
      },
      systemHealth: {
        uptime,
        incidents,
        mttr
      }
    };
  }

  /**
   * Get marketing metrics
   */
  private async getMarketingMetrics(timeframe: { start: Date; end: Date }): Promise<BusinessMetrics['marketing']> {
    const campaigns = await this.prisma.marketingCampaign.findMany({
      where: {
        startDate: {
          gte: timeframe.start,
          lte: timeframe.end
        }
      }
    });

    const totalCampaigns = campaigns.length;

    let totalOpened = 0, totalDelivered = 0;
    let totalClicked = 0, totalConverted = 0;
    let totalRevenue = 0, totalCost = 0;

    campaigns.forEach(campaign => {
      const metrics = campaign.metrics as any;
      totalDelivered += metrics.delivered || 0;
      totalOpened += metrics.opened || 0;
      totalClicked += metrics.clicked || 0;
      totalConverted += metrics.converted || 0;
      totalRevenue += metrics.revenue || 0;
      totalCost += metrics.cost || 0;
    });

    const avgOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const avgClickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const avgConversionRate = totalClicked > 0 ? (totalConverted / totalClicked) * 100 : 0;
    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    return {
      campaigns: totalCampaigns,
      avgOpenRate,
      avgClickRate,
      avgConversionRate,
      totalRevenue,
      totalCost,
      roi
    };
  }

  /**
   * Get sales metrics (from CRM)
   */
  private async getSalesMetrics(timeframe: { start: Date; end: Date }): Promise<BusinessMetrics['sales']> {
    const leads = await this.prisma.cRMLead.findMany({
      where: {
        createdAt: {
          gte: timeframe.start,
          lte: timeframe.end
        }
      }
    });

    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter(l => l.status === 'qualified' || l.status === 'proposal' || l.status === 'negotiation' || l.status === 'won').length;
    const wonLeads = leads.filter(l => l.status === 'won').length;

    const totalRevenue = leads
      .filter(l => l.status === 'won')
      .reduce((sum, lead) => sum + (lead.value || 0), 0);

    const avgDealSize = wonLeads > 0 ? totalRevenue / wonLeads : 0;
    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

    return {
      leads: totalLeads,
      qualified: qualifiedLeads,
      won: wonLeads,
      revenue: totalRevenue,
      avgDealSize,
      conversionRate
    };
  }

  /**
   * Get support metrics
   */
  private async getSupportMetrics(timeframe: { start: Date; end: Date }): Promise<BusinessMetrics['support']> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        createdAt: {
          gte: timeframe.start,
          lte: timeframe.end
        }
      }
    });

    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

    // Calculate average satisfaction (mock - in production, track actual CSAT)
    const avgSatisfaction = 4.2; // out of 5

    // Calculate average response time (mock - in production, track actual response times)
    const avgResponseTime = 45; // minutes

    // Calculate escalation rate
    const escalatedTickets = tickets.filter(t =>
      (t.tags as string[]).includes('escalated')
    ).length;
    const escalationRate = totalTickets > 0 ? (escalatedTickets / totalTickets) * 100 : 0;

    return {
      tickets: totalTickets,
      resolved: resolvedTickets,
      avgSatisfaction,
      avgResponseTime,
      escalationRate
    };
  }

  /**
   * Analyze trends for a specific metric
   */
  async analyzeTrend(
    metric: string,
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date }
  ): Promise<AnalyticsTrend> {
    logger.info('Analyzing metric trend', {
      service: 'analytics',
      metric
    });

    const [current, previous] = await Promise.all([
      this.getMetricValue(metric, currentPeriod),
      this.getMetricValue(metric, previousPeriod)
    ]);

    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(change) < 5) {
      trend = 'stable';
    } else {
      trend = change > 0 ? 'up' : 'down';
    }

    // Simple forecast (in production, use time series analysis)
    const forecast = this.forecastMetric(metric, current, change);

    return {
      metric,
      current,
      previous,
      change,
      trend,
      forecast
    };
  }

  /**
   * Get specific metric value for a timeframe
   */
  private async getMetricValue(metric: string, timeframe: { start: Date; end: Date }): Promise<number> {
    const overview = await this.getOverview(timeframe);

    // Parse metric path (e.g., "marketing.roi", "sales.revenue")
    const parts = metric.split('.');
    let value: any = overview;

    for (const part of parts) {
      value = value[part];
      if (value === undefined) return 0;
    }

    return typeof value === 'number' ? value : 0;
  }

  /**
   * Simple metric forecasting
   */
  private forecastMetric(metric: string, current: number, changePercent: number): number[] {
    // Simple linear forecast for next 3 periods
    const forecast: number[] = [];
    let value = current;

    for (let i = 0; i < 3; i++) {
      value = value * (1 + changePercent / 100);
      forecast.push(value);
    }

    return forecast;
  }

  /**
   * Save metrics snapshot to database
   */
  private async saveSnapshot(metrics: BusinessMetrics): Promise<void> {
    try {
      await this.prisma.businessMetricsSnapshot.create({
        data: {
          timeframe: metrics.timeframe as any,
          operations: metrics.operations as any,
          marketing: metrics.marketing as any,
          sales: metrics.sales as any,
          support: metrics.support as any
        }
      });

      logger.info('Metrics snapshot saved', {
        service: 'analytics'
      });
    } catch (error) {
      logger.error('Failed to save metrics snapshot', {
        service: 'analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get historical snapshots
   */
  async getSnapshots(limit: number = 10): Promise<BusinessMetrics[]> {
    const snapshots = await this.prisma.businessMetricsSnapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return snapshots.map(snapshot => ({
      timeframe: snapshot.timeframe as any,
      operations: snapshot.operations as any,
      marketing: snapshot.marketing as any,
      sales: snapshot.sales as any,
      support: snapshot.support as any
    }));
  }

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(): Promise<Array<{
    metric: string;
    current: number;
    expected: number;
    deviation: number;
    severity: 'low' | 'medium' | 'high';
  }>> {
    if (!this.config.anomalyDetection?.enabled) {
      return [];
    }

    logger.info('Detecting metric anomalies', {
      service: 'analytics'
    });

    const anomalies: any[] = [];

    // Get recent snapshots for baseline
    const snapshots = await this.getSnapshots(30);

    if (snapshots.length < 5) {
      return []; // Not enough data
    }

    const latest = snapshots[0];
    const historical = snapshots.slice(1);

    // Check key metrics for anomalies
    const metricsToCheck = [
      'operations.aiUsage.totalCost',
      'operations.systemHealth.uptime',
      'marketing.roi',
      'sales.conversionRate',
      'support.escalationRate'
    ];

    for (const metric of metricsToCheck) {
      const current = this.getNestedValue(latest, metric);
      const historicalValues = historical.map(s => this.getNestedValue(s, metric)).filter(v => v > 0);

      if (historicalValues.length === 0) continue;

      const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
      const stdDev = Math.sqrt(
        historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length
      );

      const deviation = Math.abs((current - mean) / stdDev);
      const threshold = 2 * (this.config.anomalyDetection.sensitivity || 0.5);

      if (deviation > threshold) {
        let severity: 'low' | 'medium' | 'high';
        if (deviation > threshold * 2) {
          severity = 'high';
        } else if (deviation > threshold * 1.5) {
          severity = 'medium';
        } else {
          severity = 'low';
        }

        anomalies.push({
          metric,
          current,
          expected: mean,
          deviation,
          severity
        });

        // Emit event for high severity anomalies
        if (severity === 'high') {
          this.emit(BusinessEvent.ANOMALY_DETECTED, {
            metric,
            current,
            expected: mean,
            deviation
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Helper: Get nested value from object
   */
  private getNestedValue(obj: any, path: string): number {
    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return 0;
    }

    return typeof value === 'number' ? value : 0;
  }

  /**
   * Helper: Count incidents from health metrics
   */
  private countIncidents(healthMetrics: any[]): number {
    let incidents = 0;
    let inIncident = false;

    healthMetrics.forEach(metric => {
      if (metric.status !== 'healthy' && !inIncident) {
        incidents++;
        inIncident = true;
      } else if (metric.status === 'healthy') {
        inIncident = false;
      }
    });

    return incidents;
  }

  /**
   * Helper: Calculate Mean Time To Recovery
   */
  private calculateMTTR(healthMetrics: any[]): number {
    const incidents: number[] = [];
    let incidentStart: Date | null = null;

    healthMetrics.forEach(metric => {
      if (metric.status !== 'healthy' && !incidentStart) {
        incidentStart = metric.timestamp;
      } else if (metric.status === 'healthy' && incidentStart) {
        const recovery = metric.timestamp;
        const duration = (recovery.getTime() - incidentStart.getTime()) / (1000 * 60); // minutes
        incidents.push(duration);
        incidentStart = null;
      }
    });

    if (incidents.length === 0) return 0;

    return incidents.reduce((a, b) => a + b, 0) / incidents.length;
  }

  /**
   * Start automated snapshot collection
   */
  private startSnapshotInterval(): void {
    const intervalMs = this.parseInterval(this.config.snapshotInterval);

    if (intervalMs > 0) {
      this.snapshotIntervalId = setInterval(() => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        this.getOverview({ start: oneHourAgo, end: now }).catch(error => {
          logger.error('Scheduled snapshot failed', {
            service: 'analytics',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }, intervalMs);

      logger.info('Analytics snapshot interval started', {
        service: 'analytics',
        interval: this.config.snapshotInterval
      });
    }
  }

  /**
   * Parse interval string to milliseconds
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)(m|h|d)$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    return value * (multipliers[unit] || 0);
  }

  /**
   * Cleanup and disconnect
   */
  async shutdown(): Promise<void> {
    logger.info('Analytics service shutting down');

    if (this.snapshotIntervalId) {
      clearInterval(this.snapshotIntervalId);
      this.snapshotIntervalId = null;
    }

    await this.prisma.$disconnect();
    this.isInitialized = false;
  }
}

// Singleton instance
let analyticsServiceInstance: AnalyticsService | null = null;

export function createAnalyticsService(config: AnalyticsConfig): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService(config);
  }
  return analyticsServiceInstance;
}

export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    throw new Error('Analytics service not initialized. Call createAnalyticsService first.');
  }
  return analyticsServiceInstance;
}
