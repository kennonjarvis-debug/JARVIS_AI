/**
 * Marketing Service
 *
 * Manages marketing campaigns across multiple platforms:
 * - Mailchimp
 * - HubSpot
 * - SendGrid
 *
 * Features:
 * - Campaign creation and management
 * - AI-powered insights and optimization
 * - Cross-platform synchronization
 * - Performance analytics
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import {
  MarketingCampaign,
  CampaignInsight,
  BusinessEvent,
  IExternalIntegration
} from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export interface MarketingConfig {
  platforms: {
    mailchimp?: {
      enabled: boolean;
      apiKey: string;
      serverPrefix: string;
    };
    hubspot?: {
      enabled: boolean;
      apiKey: string;
      portalId: string;
    };
    sendgrid?: {
      enabled: boolean;
      apiKey: string;
    };
  };
  aiInsights: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    model: string;
  };
}

export class MarketingService extends EventEmitter {
  private prisma: PrismaClient;
  private config: MarketingConfig;
  private integrations: Map<string, IExternalIntegration>;
  private isInitialized: boolean = false;

  constructor(config: MarketingConfig) {
    super();
    this.prisma = new PrismaClient();
    this.config = config;
    this.integrations = new Map();
  }

  /**
   * Initialize service and connect to external platforms
   */
  async initialize(): Promise<void> {
    logger.info('Marketing service initializing', {
      service: 'marketing',
      platforms: Object.keys(this.config.platforms).filter(
        p => this.config.platforms[p as keyof typeof this.config.platforms]?.enabled
      )
    });

    try {
      // Connect to enabled platforms
      if (this.config.platforms.mailchimp?.enabled) {
        const { MailchimpClient } = await import('../integrations/mailchimp-client.js');
        const client = new MailchimpClient(
          this.config.platforms.mailchimp.apiKey,
          this.config.platforms.mailchimp.serverPrefix
        );
        await client.connect();
        this.integrations.set('mailchimp', client);
      }

      if (this.config.platforms.hubspot?.enabled) {
        const { HubSpotMarketingClient } = await import('../integrations/hubspot-marketing-client.js');
        const client = new HubSpotMarketingClient(
          this.config.platforms.hubspot.apiKey,
          this.config.platforms.hubspot.portalId
        );
        await client.connect();
        this.integrations.set('hubspot', client);
      }

      if (this.config.platforms.sendgrid?.enabled) {
        const { SendGridClient } = await import('../integrations/sendgrid-client.js');
        const client = new SendGridClient(this.config.platforms.sendgrid.apiKey);
        await client.connect();
        this.integrations.set('sendgrid', client);
      }

      this.isInitialized = true;
      logger.info('Marketing service initialized successfully', {
        service: 'marketing',
        connectedPlatforms: Array.from(this.integrations.keys())
      });
    } catch (error) {
      logger.error('Failed to initialize marketing service', {
        service: 'marketing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a new marketing campaign
   */
  async createCampaign(campaignData: Omit<MarketingCampaign, 'id'>): Promise<MarketingCampaign> {
    if (!this.isInitialized) {
      throw new Error('Marketing service not initialized');
    }

    logger.info('Creating marketing campaign', {
      service: 'marketing',
      campaignName: campaignData.name,
      type: campaignData.type,
      platform: campaignData.platform
    });

    try {
      // Create in database
      const campaign = await this.prisma.marketingCampaign.create({
        data: {
          name: campaignData.name,
          type: campaignData.type,
          status: campaignData.status,
          platform: campaignData.platform,
          startDate: campaignData.startDate,
          endDate: campaignData.endDate,
          metrics: campaignData.metrics || {},
          metadata: campaignData.metadata || {}
        }
      });

      const result: MarketingCampaign = {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type as MarketingCampaign['type'],
        status: campaign.status as MarketingCampaign['status'],
        platform: campaign.platform as MarketingCampaign['platform'],
        startDate: campaign.startDate,
        endDate: campaign.endDate || undefined,
        metrics: campaign.metrics as MarketingCampaign['metrics'],
        metadata: campaign.metadata as Record<string, any>
      };

      // Emit event
      this.emit(BusinessEvent.CAMPAIGN_CREATED, result);

      logger.info('Marketing campaign created', {
        service: 'marketing',
        campaignId: result.id,
        campaignName: result.name
      });

      return result;
    } catch (error) {
      logger.error('Failed to create marketing campaign', {
        service: 'marketing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<MarketingCampaign | null> {
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) return null;

    return {
      id: campaign.id,
      name: campaign.name,
      type: campaign.type as MarketingCampaign['type'],
      status: campaign.status as MarketingCampaign['status'],
      platform: campaign.platform as MarketingCampaign['platform'],
      startDate: campaign.startDate,
      endDate: campaign.endDate || undefined,
      metrics: campaign.metrics as MarketingCampaign['metrics'],
      metadata: campaign.metadata as Record<string, any>
    };
  }

  /**
   * List all campaigns with optional filters
   */
  async listCampaigns(filters?: {
    status?: MarketingCampaign['status'];
    platform?: MarketingCampaign['platform'];
    type?: MarketingCampaign['type'];
  }): Promise<MarketingCampaign[]> {
    const campaigns = await this.prisma.marketingCampaign.findMany({
      where: {
        status: filters?.status,
        platform: filters?.platform,
        type: filters?.type
      },
      orderBy: { createdAt: 'desc' }
    });

    return campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      type: campaign.type as MarketingCampaign['type'],
      status: campaign.status as MarketingCampaign['status'],
      platform: campaign.platform as MarketingCampaign['platform'],
      startDate: campaign.startDate,
      endDate: campaign.endDate || undefined,
      metrics: campaign.metrics as MarketingCampaign['metrics'],
      metadata: campaign.metadata as Record<string, any>
    }));
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    updates: Partial<Omit<MarketingCampaign, 'id'>>
  ): Promise<MarketingCampaign> {
    logger.info('Updating marketing campaign', {
      service: 'marketing',
      campaignId,
      updates: Object.keys(updates)
    });

    const campaign = await this.prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        name: updates.name,
        type: updates.type,
        status: updates.status,
        platform: updates.platform,
        startDate: updates.startDate,
        endDate: updates.endDate,
        metrics: updates.metrics ? updates.metrics : undefined,
        metadata: updates.metadata ? updates.metadata : undefined
      }
    });

    const result: MarketingCampaign = {
      id: campaign.id,
      name: campaign.name,
      type: campaign.type as MarketingCampaign['type'],
      status: campaign.status as MarketingCampaign['status'],
      platform: campaign.platform as MarketingCampaign['platform'],
      startDate: campaign.startDate,
      endDate: campaign.endDate || undefined,
      metrics: campaign.metrics as MarketingCampaign['metrics'],
      metadata: campaign.metadata as Record<string, any>
    };

    // Emit appropriate event based on status change
    if (updates.status === 'active' && campaign.status !== 'active') {
      this.emit(BusinessEvent.CAMPAIGN_STARTED, result);
    } else if (updates.status === 'completed') {
      this.emit(BusinessEvent.CAMPAIGN_COMPLETED, result);
    } else if (updates.status === 'paused') {
      this.emit(BusinessEvent.CAMPAIGN_PAUSED, result);
    }

    return result;
  }

  /**
   * Sync campaign metrics from external platform
   */
  async syncCampaignMetrics(campaignId: string): Promise<MarketingCampaign> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    logger.info('Syncing campaign metrics', {
      service: 'marketing',
      campaignId,
      platform: campaign.platform
    });

    const integration = this.integrations.get(campaign.platform);
    if (!integration) {
      throw new Error(`No integration found for platform ${campaign.platform}`);
    }

    // Platform-specific sync logic would go here
    // For now, we'll just return the campaign
    // TODO: Implement actual metric fetching from each platform

    return campaign;
  }

  /**
   * Generate AI-powered insights for a campaign
   */
  async getInsights(campaignId: string): Promise<CampaignInsight> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    logger.info('Generating AI insights for campaign', {
      service: 'marketing',
      campaignId,
      campaignName: campaign.name
    });

    const metrics = campaign.metrics;

    // Calculate rates
    const openRate = metrics.opened && metrics.delivered
      ? (metrics.opened / metrics.delivered) * 100
      : 0;

    const clickRate = metrics.clicked && metrics.opened
      ? (metrics.clicked / metrics.opened) * 100
      : 0;

    const conversionRate = metrics.converted && metrics.clicked
      ? (metrics.converted / metrics.clicked) * 100
      : 0;

    const roi = metrics.revenue && metrics.cost
      ? ((metrics.revenue - metrics.cost) / metrics.cost) * 100
      : 0;

    // Generate AI suggestions
    const suggestions = await this.generateAISuggestions(campaign, {
      openRate,
      clickRate,
      conversionRate,
      roi
    });

    // Determine sentiment
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (roi > 100 || (openRate > 20 && clickRate > 3)) {
      sentiment = 'positive';
    } else if (roi < 0 || openRate < 10) {
      sentiment = 'negative';
    }

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      openRate,
      clickRate,
      conversionRate,
      roi,
      suggestions,
      sentiment
    };
  }

  /**
   * Generate AI-powered suggestions for campaign optimization
   */
  private async generateAISuggestions(
    campaign: MarketingCampaign,
    metrics: { openRate: number; clickRate: number; conversionRate: number; roi: number }
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Rule-based suggestions (could be replaced with actual AI calls)
    if (metrics.openRate < 15) {
      suggestions.push('Low open rate detected. Consider A/B testing subject lines.');
      suggestions.push('Review send time optimization - test different days/times.');
    }

    if (metrics.clickRate < 2) {
      suggestions.push('Low click-through rate. Improve call-to-action placement and copy.');
      suggestions.push('Consider adding more visual elements or videos.');
    }

    if (metrics.conversionRate < 1) {
      suggestions.push('Low conversion rate. Review landing page experience.');
      suggestions.push('Ensure campaign targeting is aligned with offer.');
    }

    if (metrics.roi < 0) {
      suggestions.push('Negative ROI. Consider pausing and revising campaign strategy.');
      suggestions.push('Review audience targeting to reduce wasted spend.');
    } else if (metrics.roi > 200) {
      suggestions.push('Excellent ROI! Consider increasing budget to scale.');
      suggestions.push('Document successful elements for future campaigns.');
    }

    if (campaign.type === 'email' && metrics.openRate > 25) {
      suggestions.push('Great open rate! Replicate subject line style in future campaigns.');
    }

    return suggestions;
  }

  /**
   * Get marketing metrics summary
   */
  async getMetricsSummary(timeframe?: { start: Date; end: Date }): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    avgOpenRate: number;
    avgClickRate: number;
    avgConversionRate: number;
    totalRevenue: number;
    totalCost: number;
    roi: number;
  }> {
    const where = timeframe ? {
      startDate: {
        gte: timeframe.start,
        lte: timeframe.end
      }
    } : {};

    const campaigns = await this.prisma.marketingCampaign.findMany({ where });

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

    let totalOpened = 0, totalDelivered = 0;
    let totalClicked = 0;
    let totalConverted = 0;
    let totalRevenue = 0, totalCost = 0;

    campaigns.forEach(campaign => {
      const metrics = campaign.metrics as MarketingCampaign['metrics'];
      totalOpened += metrics.opened || 0;
      totalDelivered += metrics.delivered || 0;
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
      totalCampaigns,
      activeCampaigns,
      avgOpenRate,
      avgClickRate,
      avgConversionRate,
      totalRevenue,
      totalCost,
      roi
    };
  }

  /**
   * Health check for marketing service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    connectedPlatforms: string[];
    issues: string[];
  }> {
    const issues: string[] = [];
    const connectedPlatforms: string[] = [];

    for (const [name, integration] of this.integrations.entries()) {
      try {
        const result = await integration.test();
        if (result.healthy) {
          connectedPlatforms.push(name);
        } else {
          issues.push(`${name}: ${result.message}`);
        }
      } catch (error) {
        issues.push(`${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      healthy: issues.length === 0,
      connectedPlatforms,
      issues
    };
  }

  /**
   * Cleanup and disconnect
   */
  async shutdown(): Promise<void> {
    logger.info('Marketing service shutting down');

    for (const [name, integration] of this.integrations.entries()) {
      try {
        await integration.disconnect();
        logger.info(`Disconnected from ${name}`);
      } catch (error) {
        logger.error(`Failed to disconnect from ${name}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    await this.prisma.$disconnect();
    this.isInitialized = false;
  }
}

// Singleton instance
let marketingServiceInstance: MarketingService | null = null;

export function createMarketingService(config: MarketingConfig): MarketingService {
  if (!marketingServiceInstance) {
    marketingServiceInstance = new MarketingService(config);
  }
  return marketingServiceInstance;
}

export function getMarketingService(): MarketingService {
  if (!marketingServiceInstance) {
    throw new Error('Marketing service not initialized. Call createMarketingService first.');
  }
  return marketingServiceInstance;
}
