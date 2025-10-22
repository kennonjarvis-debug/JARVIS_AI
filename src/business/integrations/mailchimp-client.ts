/**
 * Mailchimp Integration Client
 *
 * Handles connection to Mailchimp Marketing API
 */

import { IExternalIntegration } from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export class MailchimpClient implements IExternalIntegration {
  name = 'mailchimp';
  private apiKey: string;
  private serverPrefix: string;
  private connected: boolean = false;
  private client: any;

  constructor(apiKey: string, serverPrefix: string) {
    this.apiKey = apiKey;
    this.serverPrefix = serverPrefix;
  }

  async connect(): Promise<boolean> {
    try {
      // Dynamically import Mailchimp client
      const mailchimp = await import('@mailchimp/mailchimp_marketing');

      this.client = mailchimp.default;
      this.client.setConfig({
        apiKey: this.apiKey,
        server: this.serverPrefix
      });

      // Test connection
      await this.client.ping.get();

      this.connected = true;
      logger.info('Mailchimp client connected', {
        integration: 'mailchimp',
        server: this.serverPrefix
      });

      return true;
    } catch (error) {
      logger.error('Failed to connect to Mailchimp', {
        integration: 'mailchimp',
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
      await this.client.ping.get();
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
    logger.info('Mailchimp client disconnected');
  }

  /**
   * Get campaigns from Mailchimp
   */
  async getCampaigns(filters?: { status?: string; since_create_time?: string }): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('Mailchimp client not connected');
    }

    try {
      const response = await this.client.campaigns.list({
        status: filters?.status,
        since_create_time: filters?.since_create_time,
        count: 100
      });

      return response.campaigns || [];
    } catch (error) {
      logger.error('Failed to get Mailchimp campaigns', {
        integration: 'mailchimp',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get campaign report (metrics)
   */
  async getCampaignReport(campaignId: string): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Mailchimp client not connected');
    }

    try {
      const report = await this.client.reports.getCampaignReport(campaignId);
      return {
        sent: report.emails_sent,
        delivered: report.emails_sent - report.bounces?.hard_bounces || 0,
        opened: report.opens?.unique_opens || 0,
        clicked: report.clicks?.unique_clicks || 0
      };
    } catch (error) {
      logger.error('Failed to get Mailchimp campaign report', {
        integration: 'mailchimp',
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create campaign in Mailchimp
   */
  async createCampaign(campaignData: {
    type: string;
    recipients: { list_id: string };
    settings: {
      subject_line: string;
      title: string;
      from_name: string;
      reply_to: string;
    };
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Mailchimp client not connected');
    }

    try {
      const campaign = await this.client.campaigns.create(campaignData);
      logger.info('Mailchimp campaign created', {
        integration: 'mailchimp',
        campaignId: campaign.id
      });
      return campaign;
    } catch (error) {
      logger.error('Failed to create Mailchimp campaign', {
        integration: 'mailchimp',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
