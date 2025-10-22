/**
 * Salesforce CRM Integration Client
 *
 * Handles connection to Salesforce CRM API
 */

import { IExternalIntegration } from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export class SalesforceCRMClient implements IExternalIntegration {
  name = 'salesforce-crm';
  private clientId: string;
  private clientSecret: string;
  private instanceUrl: string;
  private connected: boolean = false;
  private accessToken: string | null = null;
  private connection: any;

  constructor(clientId: string, clientSecret: string, instanceUrl: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.instanceUrl = instanceUrl;
  }

  async connect(): Promise<boolean> {
    try {
      // Dynamically import jsforce
      const jsforce = await import('jsforce');

      this.connection = new jsforce.Connection({
        oauth2: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          redirectUri: 'http://localhost:3000/oauth/callback'
        },
        instanceUrl: this.instanceUrl
      });

      // In production, you'd use OAuth flow
      // For now, we'll assume token is in environment
      const username = process.env.SALESFORCE_USERNAME;
      const password = process.env.SALESFORCE_PASSWORD;
      const securityToken = process.env.SALESFORCE_SECURITY_TOKEN;

      if (username && password) {
        const userInfo = await this.connection.login(
          username,
          password + (securityToken || '')
        );
        this.accessToken = this.connection.accessToken;
      }

      this.connected = true;
      logger.info('Salesforce CRM client connected', {
        integration: 'salesforce-crm',
        instanceUrl: this.instanceUrl
      });

      return true;
    } catch (error) {
      logger.error('Failed to connect to Salesforce CRM', {
        integration: 'salesforce-crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async test(): Promise<{ healthy: boolean; message: string }> {
    if (!this.connected || !this.connection) {
      return { healthy: false, message: 'Not connected' };
    }

    try {
      await this.connection.query('SELECT Id FROM Account LIMIT 1');
      return { healthy: true, message: 'Connection successful' };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.logout();
    }
    this.connected = false;
    this.connection = null;
    this.accessToken = null;
    logger.info('Salesforce CRM client disconnected');
  }

  /**
   * Get contacts (Leads) from Salesforce
   */
  async getLeads(limit: number = 100): Promise<any[]> {
    if (!this.connected || !this.connection) {
      throw new Error('Salesforce CRM client not connected');
    }

    try {
      const result = await this.connection.query(
        `SELECT Id, Name, Email, Company, Status FROM Lead LIMIT ${limit}`
      );

      return result.records || [];
    } catch (error) {
      logger.error('Failed to get Salesforce leads', {
        integration: 'salesforce-crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create lead in Salesforce
   */
  async createLead(leadData: {
    FirstName?: string;
    LastName: string;
    Email: string;
    Company: string;
    Status?: string;
  }): Promise<any> {
    if (!this.connected || !this.connection) {
      throw new Error('Salesforce CRM client not connected');
    }

    try {
      const result = await this.connection.sobject('Lead').create({
        FirstName: leadData.FirstName,
        LastName: leadData.LastName,
        Email: leadData.Email,
        Company: leadData.Company,
        Status: leadData.Status || 'Open - Not Contacted'
      });

      logger.info('Salesforce lead created', {
        integration: 'salesforce-crm',
        leadId: result.id
      });

      return result;
    } catch (error) {
      logger.error('Failed to create Salesforce lead', {
        integration: 'salesforce-crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update lead in Salesforce
   */
  async updateLead(leadId: string, updates: Record<string, any>): Promise<any> {
    if (!this.connected || !this.connection) {
      throw new Error('Salesforce CRM client not connected');
    }

    try {
      const result = await this.connection.sobject('Lead').update({
        Id: leadId,
        ...updates
      });

      logger.info('Salesforce lead updated', {
        integration: 'salesforce-crm',
        leadId
      });

      return result;
    } catch (error) {
      logger.error('Failed to update Salesforce lead', {
        integration: 'salesforce-crm',
        leadId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get opportunities from Salesforce
   */
  async getOpportunities(limit: number = 100): Promise<any[]> {
    if (!this.connected || !this.connection) {
      throw new Error('Salesforce CRM client not connected');
    }

    try {
      const result = await this.connection.query(
        `SELECT Id, Name, Amount, StageName, CloseDate FROM Opportunity LIMIT ${limit}`
      );

      return result.records || [];
    } catch (error) {
      logger.error('Failed to get Salesforce opportunities', {
        integration: 'salesforce-crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create opportunity in Salesforce
   */
  async createOpportunity(opportunityData: {
    Name: string;
    Amount?: number;
    StageName: string;
    CloseDate: string;
  }): Promise<any> {
    if (!this.connected || !this.connection) {
      throw new Error('Salesforce CRM client not connected');
    }

    try {
      const result = await this.connection.sobject('Opportunity').create(opportunityData);

      logger.info('Salesforce opportunity created', {
        integration: 'salesforce-crm',
        opportunityId: result.id
      });

      return result;
    } catch (error) {
      logger.error('Failed to create Salesforce opportunity', {
        integration: 'salesforce-crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get accounts from Salesforce
   */
  async getAccounts(limit: number = 100): Promise<any[]> {
    if (!this.connected || !this.connection) {
      throw new Error('Salesforce CRM client not connected');
    }

    try {
      const result = await this.connection.query(
        `SELECT Id, Name, Industry, NumberOfEmployees FROM Account LIMIT ${limit}`
      );

      return result.records || [];
    } catch (error) {
      logger.error('Failed to get Salesforce accounts', {
        integration: 'salesforce-crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
