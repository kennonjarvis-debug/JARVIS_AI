/**
 * HubSpot Integration
 * Handles CRM operations via HubSpot API
 */

import axios, { AxiosInstance } from 'axios';
import { BaseIntegration, type IntegrationConfig } from '../base/BaseIntegration.js';

export interface HubSpotConfig extends IntegrationConfig {
  accessToken?: string;
}

export interface HubSpotTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    createdate?: string;
    lastmodifieddate?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    createdate?: string;
    lastmodifieddate?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    createdate?: string;
    lastmodifieddate?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

/**
 * HubSpot CRM Integration
 */
export class HubSpotIntegration extends BaseIntegration {
  private apiClient?: AxiosInstance;
  private tokens?: HubSpotTokens;

  constructor(config: HubSpotConfig) {
    super(config);
    this.tokens = config.credentials as HubSpotTokens;
  }

  get name(): string {
    return 'hubspot';
  }

  get displayName(): string {
    return 'HubSpot CRM';
  }

  /**
   * Initialize HubSpot API client
   */
  async initialize(): Promise<void> {
    if (!this.tokens) {
      throw new Error('HubSpot tokens not found');
    }

    this.apiClient = axios.create({
      baseURL: 'https://api.hubapi.com',
      headers: {
        Authorization: `Bearer ${this.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    this.isInitialized = true;
    this.logger.info('HubSpot client initialized');
  }

  /**
   * Test connection by getting account info
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiClient) {
        return false;
      }

      const response = await this.apiClient.get('/account-info/v3/details');
      this.logger.info('HubSpot connection test successful', { portalId: response.data.portalId });
      return response.status === 200;
    } catch (error) {
      this.logger.error('HubSpot connection test failed', error);
      return false;
    }
  }

  /**
   * Disconnect HubSpot integration
   */
  async disconnect(): Promise<void> {
    this.apiClient = undefined;
    this.tokens = undefined;
    await this.updateStatus('disconnected');

    await this.logActivity({
      activityType: 'integration',
      action: 'disconnected',
      title: 'HubSpot disconnected',
    });

    this.logger.info('HubSpot disconnected');
  }

  /**
   * Get contacts
   */
  async getContacts(limit: number = 10, properties?: string[]): Promise<HubSpotContact[]> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const response = await this.apiClient.get('/crm/v3/objects/contacts', {
        params: {
          limit,
          properties: properties?.join(',') || 'firstname,lastname,email,phone,company,jobtitle',
        },
      });

      await this.logActivity({
        activityType: 'crm',
        action: 'list_contacts',
        title: 'Listed contacts',
        metadata: { count: response.data.results?.length || 0 },
      });

      return response.data.results || [];
    } catch (error) {
      this.logger.error('Failed to get HubSpot contacts', error);
      throw error;
    }
  }

  /**
   * Create contact
   */
  async createContact(properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    [key: string]: any;
  }): Promise<HubSpotContact> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const response = await this.apiClient.post('/crm/v3/objects/contacts', {
        properties,
      });

      await this.logActivity({
        activityType: 'crm',
        action: 'create_contact',
        title: `Created contact: ${properties.email}`,
        metadata: { contactId: response.data.id },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to create HubSpot contact', error);
      throw error;
    }
  }

  /**
   * Update contact
   */
  async updateContact(contactId: string, properties: Record<string, any>): Promise<HubSpotContact> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const response = await this.apiClient.patch(`/crm/v3/objects/contacts/${contactId}`, {
        properties,
      });

      await this.logActivity({
        activityType: 'crm',
        action: 'update_contact',
        title: 'Updated contact',
        metadata: { contactId },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to update HubSpot contact', error);
      throw error;
    }
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: string): Promise<void> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      await this.apiClient.delete(`/crm/v3/objects/contacts/${contactId}`);

      await this.logActivity({
        activityType: 'crm',
        action: 'delete_contact',
        title: 'Deleted contact',
        metadata: { contactId },
      });
    } catch (error) {
      this.logger.error('Failed to delete HubSpot contact', error);
      throw error;
    }
  }

  /**
   * Get companies
   */
  async getCompanies(limit: number = 10, properties?: string[]): Promise<HubSpotCompany[]> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const response = await this.apiClient.get('/crm/v3/objects/companies', {
        params: {
          limit,
          properties: properties?.join(',') || 'name,domain,industry,phone,city,state',
        },
      });

      await this.logActivity({
        activityType: 'crm',
        action: 'list_companies',
        title: 'Listed companies',
        metadata: { count: response.data.results?.length || 0 },
      });

      return response.data.results || [];
    } catch (error) {
      this.logger.error('Failed to get HubSpot companies', error);
      throw error;
    }
  }

  /**
   * Create company
   */
  async createCompany(properties: {
    name: string;
    domain?: string;
    industry?: string;
    phone?: string;
    city?: string;
    state?: string;
    [key: string]: any;
  }): Promise<HubSpotCompany> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const response = await this.apiClient.post('/crm/v3/objects/companies', {
        properties,
      });

      await this.logActivity({
        activityType: 'crm',
        action: 'create_company',
        title: `Created company: ${properties.name}`,
        metadata: { companyId: response.data.id },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to create HubSpot company', error);
      throw error;
    }
  }

  /**
   * Get deals
   */
  async getDeals(limit: number = 10, properties?: string[]): Promise<HubSpotDeal[]> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const response = await this.apiClient.get('/crm/v3/objects/deals', {
        params: {
          limit,
          properties: properties?.join(',') || 'dealname,amount,dealstage,pipeline,closedate',
        },
      });

      await this.logActivity({
        activityType: 'crm',
        action: 'list_deals',
        title: 'Listed deals',
        metadata: { count: response.data.results?.length || 0 },
      });

      return response.data.results || [];
    } catch (error) {
      this.logger.error('Failed to get HubSpot deals', error);
      throw error;
    }
  }

  /**
   * Create deal
   */
  async createDeal(properties: {
    dealname: string;
    amount?: string;
    dealstage: string;
    pipeline?: string;
    closedate?: string;
    [key: string]: any;
  }): Promise<HubSpotDeal> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const response = await this.apiClient.post('/crm/v3/objects/deals', {
        properties,
      });

      await this.logActivity({
        activityType: 'crm',
        action: 'create_deal',
        title: `Created deal: ${properties.dealname}`,
        metadata: { dealId: response.data.id },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to create HubSpot deal', error);
      throw error;
    }
  }

  /**
   * Search CRM
   */
  async search(objectType: 'contacts' | 'companies' | 'deals', query: string, properties?: string[]): Promise<any[]> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const response = await this.apiClient.post(`/crm/v3/objects/${objectType}/search`, {
        query,
        properties: properties || ['email', 'firstname', 'lastname', 'phone', 'company'],
        limit: 10,
      });

      return response.data.results || [];
    } catch (error) {
      this.logger.error('HubSpot search failed', { objectType, query, error });
      throw error;
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo(): Promise<{ portalId: string; timeZone: string; currency: string }> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const response = await this.apiClient.get('/account-info/v3/details');
      return {
        portalId: response.data.portalId,
        timeZone: response.data.timeZone,
        currency: response.data.currency,
      };
    } catch (error) {
      this.logger.error('Failed to get HubSpot account info', error);
      throw error;
    }
  }

  /**
   * Create engagement (note, email, call, meeting, task)
   */
  async createEngagement(type: 'NOTE' | 'EMAIL' | 'CALL' | 'MEETING' | 'TASK', engagement: {
    body?: string;
    subject?: string;
    status?: string;
    ownerId?: string;
    timestamp?: number;
    associations?: { contactIds?: string[]; companyIds?: string[]; dealIds?: string[] };
  }): Promise<any> {
    if (!this.apiClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const response = await this.apiClient.post('/engagements/v1/engagements', {
        engagement: {
          type,
          ...engagement,
        },
      });

      await this.logActivity({
        activityType: 'crm',
        action: 'create_engagement',
        title: `Created ${type.toLowerCase()}`,
        metadata: { engagementId: response.data.engagement.id },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to create HubSpot engagement', error);
      throw error;
    }
  }
}
