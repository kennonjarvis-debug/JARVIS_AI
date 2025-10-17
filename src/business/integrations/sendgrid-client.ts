/**
 * SendGrid Integration Client
 *
 * Handles connection to SendGrid Marketing API
 */

import { IExternalIntegration } from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export class SendGridClient implements IExternalIntegration {
  name = 'sendgrid';
  private apiKey: string;
  private connected: boolean = false;
  private client: any;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async connect(): Promise<boolean> {
    try {
      // Dynamically import SendGrid client
      const sgMail = await import('@sendgrid/mail');
      const sgClient = await import('@sendgrid/client');

      sgMail.default.setApiKey(this.apiKey);
      sgClient.default.setApiKey(this.apiKey);

      this.client = {
        mail: sgMail.default,
        client: sgClient.default
      };

      // Test connection by getting API key scopes
      const [response] = await this.client.client.request({
        url: '/v3/scopes',
        method: 'GET'
      });

      if (response.statusCode === 200) {
        this.connected = true;
        logger.info('SendGrid client connected', {
          integration: 'sendgrid'
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to connect to SendGrid', {
        integration: 'sendgrid',
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
      const [response] = await this.client.client.request({
        url: '/v3/scopes',
        method: 'GET'
      });

      if (response.statusCode === 200) {
        return { healthy: true, message: 'Connection successful' };
      }

      return { healthy: false, message: `Unexpected status: ${response.statusCode}` };
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
    logger.info('SendGrid client disconnected');
  }

  /**
   * Send email via SendGrid
   */
  async sendEmail(emailData: {
    to: string | string[];
    from: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('SendGrid client not connected');
    }

    try {
      await this.client.mail.send(emailData);

      logger.info('Email sent via SendGrid', {
        integration: 'sendgrid',
        to: Array.isArray(emailData.to) ? emailData.to.length : 1
      });
    } catch (error) {
      logger.error('Failed to send email via SendGrid', {
        integration: 'sendgrid',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get email statistics
   */
  async getStats(options?: {
    start_date?: string;
    end_date?: string;
    aggregated_by?: 'day' | 'week' | 'month';
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('SendGrid client not connected');
    }

    try {
      const queryParams = new URLSearchParams({
        start_date: options?.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: options?.end_date || new Date().toISOString().split('T')[0],
        aggregated_by: options?.aggregated_by || 'day'
      });

      const [response] = await this.client.client.request({
        url: `/v3/stats?${queryParams.toString()}`,
        method: 'GET'
      });

      return response.body;
    } catch (error) {
      logger.error('Failed to get SendGrid stats', {
        integration: 'sendgrid',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get marketing campaign stats
   */
  async getCampaignStats(campaignId: string): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }> {
    if (!this.connected || !this.client) {
      throw new Error('SendGrid client not connected');
    }

    try {
      const [response] = await this.client.client.request({
        url: `/v3/marketing/stats/singlesends/${campaignId}`,
        method: 'GET'
      });

      const stats = response.body?.results?.[0]?.stats || {};

      return {
        sent: stats.requests || 0,
        delivered: stats.delivered || 0,
        opened: stats.unique_opens || 0,
        clicked: stats.unique_clicks || 0
      };
    } catch (error) {
      logger.error('Failed to get SendGrid campaign stats', {
        integration: 'sendgrid',
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create marketing campaign
   */
  async createCampaign(campaignData: {
    name: string;
    subject: string;
    sender_id: number;
    list_ids?: string[];
    html_content?: string;
    plain_content?: string;
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('SendGrid client not connected');
    }

    try {
      const [response] = await this.client.client.request({
        url: '/v3/marketing/singlesends',
        method: 'POST',
        body: {
          name: campaignData.name,
          send_to: {
            list_ids: campaignData.list_ids || []
          },
          email_config: {
            subject: campaignData.subject,
            sender_id: campaignData.sender_id,
            html_content: campaignData.html_content || '',
            plain_content: campaignData.plain_content || ''
          }
        }
      });

      logger.info('SendGrid campaign created', {
        integration: 'sendgrid',
        campaignId: response.body?.id
      });

      return response.body;
    } catch (error) {
      logger.error('Failed to create SendGrid campaign', {
        integration: 'sendgrid',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
