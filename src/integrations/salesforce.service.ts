/**
 * Salesforce Integration Service
 * Complete OAuth 2.0 and API integration for Salesforce CRM
 */

import axios from 'axios';
import { dbEncryption } from '../db/encryption';

interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiVersion: string;
}

interface SalesforceTokens {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  token_type: string;
  expires_in: number;
}

export class SalesforceService {
  private config: SalesforceConfig;
  private baseAuthUrl = 'https://login.salesforce.com';

  constructor() {
    this.config = {
      clientId: process.env.SALESFORCE_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
      redirectUri: process.env.SALESFORCE_REDIRECT_URI || '',
      apiVersion: process.env.SALESFORCE_API_VERSION || 'v58.0',
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'api refresh_token offline_access',
      state,
    });

    return `${this.baseAuthUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<SalesforceTokens> {
    const response = await axios.post(
      `${this.baseAuthUrl}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return response.data;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<SalesforceTokens> {
    const response = await axios.post(
      `${this.baseAuthUrl}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return response.data;
  }

  /**
   * Get user info
   */
  async getUserInfo(accessToken: string, instanceUrl: string): Promise<any> {
    const response = await axios.get(`${instanceUrl}/services/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data;
  }

  /**
   * Get leads
   */
  async getLeads(accessToken: string, instanceUrl: string, limit = 10): Promise<any[]> {
    const response = await axios.get(
      `${instanceUrl}/services/data/${this.config.apiVersion}/query`,
      {
        params: {
          q: `SELECT Id, Name, Email, Company, Status FROM Lead ORDER BY CreatedDate DESC LIMIT ${limit}`,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data.records;
  }

  /**
   * Create lead
   */
  async createLead(
    accessToken: string,
    instanceUrl: string,
    lead: {
      FirstName: string;
      LastName: string;
      Company: string;
      Email?: string;
      Phone?: string;
    }
  ): Promise<any> {
    const response = await axios.post(
      `${instanceUrl}/services/data/${this.config.apiVersion}/sobjects/Lead`,
      lead,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  /**
   * Get contacts
   */
  async getContacts(accessToken: string, instanceUrl: string, limit = 10): Promise<any[]> {
    const response = await axios.get(
      `${instanceUrl}/services/data/${this.config.apiVersion}/query`,
      {
        params: {
          q: `SELECT Id, Name, Email, Phone, Account.Name FROM Contact ORDER BY CreatedDate DESC LIMIT ${limit}`,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data.records;
  }

  /**
   * Get opportunities
   */
  async getOpportunities(accessToken: string, instanceUrl: string, limit = 10): Promise<any[]> {
    const response = await axios.get(
      `${instanceUrl}/services/data/${this.config.apiVersion}/query`,
      {
        params: {
          q: `SELECT Id, Name, Amount, StageName, CloseDate, Account.Name FROM Opportunity ORDER BY CreatedDate DESC LIMIT ${limit}`,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data.records;
  }

  /**
   * Search records
   */
  async search(accessToken: string, instanceUrl: string, searchText: string): Promise<any[]> {
    const response = await axios.get(
      `${instanceUrl}/services/data/${this.config.apiVersion}/search`,
      {
        params: {
          q: `FIND {${searchText}} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name, Email), Lead(Id, Name, Email)`,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data.searchRecords;
  }
}

export const salesforceService = new SalesforceService();
