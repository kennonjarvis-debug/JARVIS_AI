/**
 * HubSpot Marketing Integration Client
 *
 * Handles connection to HubSpot Marketing API
 */

import { IExternalIntegration } from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export class HubSpotMarketingClient implements IExternalIntegration {
  name = 'hubspot-marketing';
  private apiKey: string;
  private portalId: string;
  private connected: boolean = false;
  private client: any;

  constructor(apiKey: string, portalId: string) {
    this.apiKey = apiKey;
    this.portalId = portalId;
  }

  async connect(): Promise<boolean> {
    try {
      // Dynamically import HubSpot client
      const hubspot = await import('@hubspot/api-client');

      this.client = new hubspot.Client({ accessToken: this.apiKey });

      // Test connection by getting account details
      await this.client.settings.users.usersApi.getPage();

      this.connected = true;
      logger.info('HubSpot Marketing client connected', {
        integration: 'hubspot-marketing',
        portalId: this.portalId
      });

      return true;
    } catch (error) {
      logger.error('Failed to connect to HubSpot Marketing', {
        integration: 'hubspot-marketing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async test(): Promise<{ healthy: boolean; message: string }> {
    if (!this.connected) {
      return { healthy: false, message: 'Not connected' };
    }

    try {
      await this.client.settings.users.usersApi.getPage();
      return { healthy: true, message: 'Connection successful' };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.client = null;
    logger.info('HubSpot Marketing client disconnected');
  }

  /**
   * Get email campaigns from HubSpot
   */
  async getCampaigns(filters?: { limit?: number }): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('HubSpot Marketing client not connected');
    }

    try {
      const response = await this.client.marketing.campaigns.campaignsApi.getPage(
        filters?.limit || 100
      );

      return response.results || [];
    } catch (error) {
      logger.error('Failed to get HubSpot campaigns', {
        integration: 'hubspot-marketing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('HubSpot Marketing client not connected');
    }

    try {
      const campaign = await this.client.marketing.campaigns.campaignsApi.getById(
        parseInt(campaignId)
      );

      return {
        sent: campaign.counters?.sent || 0,
        delivered: campaign.counters?.delivered || 0,
        opened: campaign.counters?.open || 0,
        clicked: campaign.counters?.click || 0
      };
    } catch (error) {
      logger.error('Failed to get HubSpot campaign analytics', {
        integration: 'hubspot-marketing',
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create email campaign in HubSpot
   */
  async createCampaign(campaignData: {
    name: string;
    subject?: string;
    type?: string;
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('HubSpot Marketing client not connected');
    }

    try {
      const campaign = await this.client.marketing.campaigns.campaignsApi.create({
        name: campaignData.name,
        subject: campaignData.subject
      });

      logger.info('HubSpot campaign created', {
        integration: 'hubspot-marketing',
        campaignId: campaign.id
      });

      return campaign;
    } catch (error) {
      logger.error('Failed to create HubSpot campaign', {
        integration: 'hubspot-marketing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
