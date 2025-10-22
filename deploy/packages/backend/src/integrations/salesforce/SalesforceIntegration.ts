/**
 * Salesforce Integration
 * Handles CRM operations via Salesforce REST API
 */

import axios, { AxiosInstance } from 'axios';
import { BaseIntegration, type IntegrationConfig } from '../base/BaseIntegration.js';

export interface SalesforceConfig extends IntegrationConfig {
  instanceUrl?: string;
}

export interface SalesforceTokens {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export interface SalesforceContact {
  Id: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  Account?: {
    Id: string;
    Name: string;
  };
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Industry?: string;
  Type?: string;
  Phone?: string;
  Website?: string;
  BillingAddress?: any;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount?: number;
  CloseDate: string;
  Probability?: number;
  Account?: {
    Id: string;
    Name: string;
  };
  CreatedDate: string;
  LastModifiedDate: string;
}

/**
 * Salesforce CRM Integration
 */
export class SalesforceIntegration extends BaseIntegration {
  private apiClient?: AxiosInstance;
  private tokens?: SalesforceTokens;
  private instanceUrl: string;

  constructor(config: SalesforceConfig) {
    super(config);
    this.tokens = config.credentials as SalesforceTokens;
    this.instanceUrl = config.instanceUrl || this.tokens?.instance_url || '';
  }

  get name(): string {
    return 'salesforce';
  }

  get displayName(): string {
    return 'Salesforce CRM';
  }

  /**
   * Initialize Salesforce API client
   */
  async initialize(): Promise<void> {
    if (!this.tokens) {
      throw new Error('Salesforce tokens not found');
    }

    this.apiClient = axios.create({
      baseURL: `${this.instanceUrl}/services/data/v58.0`,
      headers: {
        Authorization: `Bearer ${this.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    this.isInitialized = true;
    this.logger.info('Salesforce client initialized', { instanceUrl: this.instanceUrl });
  }

  /**
   * Test connection by querying current user
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiClient) {
        return false;
      }

      const response = await this.apiClient.get('/query', {
        params: { q: 'SELECT Id, Name FROM User WHERE Id = UserInfo.getUserId() LIMIT 1' },
      });

      this.logger.info('Salesforce connection test successful');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Salesforce connection test failed', error);
      return false;
    }
  }

  /**
   * Disconnect Salesforce integration
   */
  async disconnect(): Promise<void> {
    this.apiClient = undefined;
    this.tokens = undefined;
    await this.updateStatus('disconnected');

    await this.logActivity({
      activityType: 'integration',
      action: 'disconnected',
      title: 'Salesforce disconnected',
    });

    this.logger.info('Salesforce disconnected');
  }

  /**
   * Query Salesforce using SOQL
   */
  async query<T = any>(soql: string): Promise<T[]> {
    if (!this.apiClient) {
      throw new Error('Salesforce client not initialized');
    }

    try {
      const response = await this.apiClient.get('/query', {
        params: { q: soql },
      });

      return response.data.records || [];
    } catch (error) {
      this.logger.error('Salesforce query failed', { soql, error });
      throw error;
    }
  }

  /**
   * Create a record
   */
  async createRecord(objectType: string, data: Record<string, any>): Promise<{ id: string; success: boolean }> {
    if (!this.apiClient) {
      throw new Error('Salesforce client not initialized');
    }

    try {
      const response = await this.apiClient.post(`/sobjects/${objectType}`, data);

      await this.logActivity({
        activityType: 'crm',
        action: 'create_record',
        title: `Created ${objectType}`,
        metadata: { objectType, id: response.data.id },
      });

      return {
        id: response.data.id,
        success: response.data.success,
      };
    } catch (error) {
      this.logger.error('Failed to create Salesforce record', { objectType, error });
      throw error;
    }
  }

  /**
   * Update a record
   */
  async updateRecord(objectType: string, id: string, data: Record<string, any>): Promise<boolean> {
    if (!this.apiClient) {
      throw new Error('Salesforce client not initialized');
    }

    try {
      await this.apiClient.patch(`/sobjects/${objectType}/${id}`, data);

      await this.logActivity({
        activityType: 'crm',
        action: 'update_record',
        title: `Updated ${objectType}`,
        metadata: { objectType, id },
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to update Salesforce record', { objectType, id, error });
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async deleteRecord(objectType: string, id: string): Promise<boolean> {
    if (!this.apiClient) {
      throw new Error('Salesforce client not initialized');
    }

    try {
      await this.apiClient.delete(`/sobjects/${objectType}/${id}`);

      await this.logActivity({
        activityType: 'crm',
        action: 'delete_record',
        title: `Deleted ${objectType}`,
        metadata: { objectType, id },
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to delete Salesforce record', { objectType, id, error });
      throw error;
    }
  }

  /**
   * Get contacts
   */
  async getContacts(limit: number = 10): Promise<SalesforceContact[]> {
    const soql = `SELECT Id, FirstName, LastName, Email, Phone, Title, Account.Id, Account.Name, CreatedDate, LastModifiedDate FROM Contact ORDER BY LastModifiedDate DESC LIMIT ${limit}`;
    return this.query<SalesforceContact>(soql);
  }

  /**
   * Create contact
   */
  async createContact(contact: {
    FirstName?: string;
    LastName: string;
    Email?: string;
    Phone?: string;
    Title?: string;
    AccountId?: string;
  }): Promise<{ id: string; success: boolean }> {
    return this.createRecord('Contact', contact);
  }

  /**
   * Get accounts
   */
  async getAccounts(limit: number = 10): Promise<SalesforceAccount[]> {
    const soql = `SELECT Id, Name, Industry, Type, Phone, Website, CreatedDate, LastModifiedDate FROM Account ORDER BY LastModifiedDate DESC LIMIT ${limit}`;
    return this.query<SalesforceAccount>(soql);
  }

  /**
   * Create account
   */
  async createAccount(account: {
    Name: string;
    Industry?: string;
    Type?: string;
    Phone?: string;
    Website?: string;
  }): Promise<{ id: string; success: boolean }> {
    return this.createRecord('Account', account);
  }

  /**
   * Get opportunities
   */
  async getOpportunities(limit: number = 10): Promise<SalesforceOpportunity[]> {
    const soql = `SELECT Id, Name, StageName, Amount, CloseDate, Probability, Account.Id, Account.Name, CreatedDate, LastModifiedDate FROM Opportunity ORDER BY LastModifiedDate DESC LIMIT ${limit}`;
    return this.query<SalesforceOpportunity>(soql);
  }

  /**
   * Create opportunity
   */
  async createOpportunity(opportunity: {
    Name: string;
    StageName: string;
    CloseDate: string;
    Amount?: number;
    AccountId?: string;
    Probability?: number;
  }): Promise<{ id: string; success: boolean }> {
    return this.createRecord('Opportunity', opportunity);
  }

  /**
   * Search across multiple objects
   */
  async search(searchTerm: string): Promise<any[]> {
    if (!this.apiClient) {
      throw new Error('Salesforce client not initialized');
    }

    try {
      const sosl = `FIND {${searchTerm}} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, FirstName, LastName, Email), Opportunity(Id, Name, StageName)`;
      const response = await this.apiClient.get('/search', {
        params: { q: sosl },
      });

      return response.data.searchRecords || [];
    } catch (error) {
      this.logger.error('Salesforce search failed', { searchTerm, error });
      throw error;
    }
  }

  /**
   * Get recent items
   */
  async getRecentItems(limit: number = 10): Promise<any[]> {
    if (!this.apiClient) {
      throw new Error('Salesforce client not initialized');
    }

    try {
      const response = await this.apiClient.get('/recent', {
        params: { limit },
      });

      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to get recent items', error);
      throw error;
    }
  }
}
