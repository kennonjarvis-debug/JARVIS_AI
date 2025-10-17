/**
 * HubSpot CRM Integration Client
 *
 * Handles connection to HubSpot CRM API
 */

import { IExternalIntegration } from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export class HubSpotCRMClient implements IExternalIntegration {
  name = 'hubspot-crm';
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

      // Test connection
      await this.client.crm.contacts.getAll(1);

      this.connected = true;
      logger.info('HubSpot CRM client connected', {
        integration: 'hubspot-crm',
        portalId: this.portalId
      });

      return true;
    } catch (error) {
      logger.error('Failed to connect to HubSpot CRM', {
        integration: 'hubspot-crm',
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
      await this.client.crm.contacts.getAll(1);
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
    logger.info('HubSpot CRM client disconnected');
  }

  /**
   * Get contacts from HubSpot
   */
  async getContacts(limit: number = 100): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('HubSpot CRM client not connected');
    }

    try {
      const response = await this.client.crm.contacts.getAll(limit);
      return response.results || [];
    } catch (error) {
      logger.error('Failed to get HubSpot contacts', {
        integration: 'hubspot-crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create contact in HubSpot
   */
  async createContact(contactData: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('HubSpot CRM client not connected');
    }

    try {
      const contact = await this.client.crm.contacts.basicApi.create({
        properties: {
          email: contactData.email,
          firstname: contactData.firstname,
          lastname: contactData.lastname,
          company: contactData.company,
          phone: contactData.phone
        }
      });

      logger.info('HubSpot contact created', {
        integration: 'hubspot-crm',
        contactId: contact.id
      });

      return contact;
    } catch (error) {
      logger.error('Failed to create HubSpot contact', {
        integration: 'hubspot-crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update contact in HubSpot
   */
  async updateContact(contactId: string, updates: Record<string, any>): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('HubSpot CRM client not connected');
    }

    try {
      const contact = await this.client.crm.contacts.basicApi.update(contactId, {
        properties: updates
      });

      logger.info('HubSpot contact updated', {
        integration: 'hubspot-crm',
        contactId
      });

      return contact;
    } catch (error) {
      logger.error('Failed to update HubSpot contact', {
        integration: 'hubspot-crm',
        contactId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get deals from HubSpot
   */
  async getDeals(limit: number = 100): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('HubSpot CRM client not connected');
    }

    try {
      const response = await this.client.crm.deals.getAll(limit);
      return response.results || [];
    } catch (error) {
      logger.error('Failed to get HubSpot deals', {
        integration: 'hubspot-crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create deal in HubSpot
   */
  async createDeal(dealData: {
    dealname: string;
    amount?: number;
    dealstage?: string;
    closedate?: string;
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('HubSpot CRM client not connected');
    }

    try {
      const deal = await this.client.crm.deals.basicApi.create({
        properties: dealData
      });

      logger.info('HubSpot deal created', {
        integration: 'hubspot-crm',
        dealId: deal.id
      });

      return deal;
    } catch (error) {
      logger.error('Failed to create HubSpot deal', {
        integration: 'hubspot-crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
