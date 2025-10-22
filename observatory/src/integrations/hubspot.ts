/**
 * HubSpot CRM Integration
 *
 * Provides integration with HubSpot CRM for lead and customer management,
 * including contact management, deal tracking, and activity logging.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from '../utils/logger.js';
import { JarvisError, ErrorCode } from '../types/errors.js';

/**
 * HubSpot adapter configuration
 */
export interface HubSpotConfig {
  /** HubSpot API access token */
  accessToken: string;
  /** HubSpot portal/account ID */
  portalId: string;
  /** Base API URL (defaults to HubSpot production) */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Contact representation in HubSpot
 */
export interface Contact {
  /** Contact ID (set by HubSpot) */
  id?: string;
  /** Email address (required, unique identifier) */
  email: string;
  /** First name */
  firstname?: string;
  /** Last name */
  lastname?: string;
  /** Company name */
  company?: string;
  /** Phone number */
  phone?: string;
  /** Lifecycle stage */
  lifecyclestage?: 'subscriber' | 'lead' | 'marketingqualifiedlead' | 'salesqualifiedlead' | 'opportunity' | 'customer' | 'evangelist' | 'other';
  /** Additional custom properties */
  properties?: Record<string, any>;
}

/**
 * Deal representation in HubSpot
 */
export interface Deal {
  /** Deal ID (set by HubSpot) */
  id?: string;
  /** Deal name */
  dealname: string;
  /** Deal amount in cents */
  amount: number;
  /** Deal stage */
  dealstage: string;
  /** Expected close date */
  closedate?: Date;
  /** Associated contact ID */
  contactId?: string;
  /** Deal pipeline */
  pipeline?: string;
}

/**
 * Activity to log in HubSpot
 */
export interface Activity {
  /** Activity type */
  type: 'email' | 'call' | 'meeting' | 'note';
  /** Activity subject/title */
  subject: string;
  /** Activity body/description */
  body: string;
  /** Activity timestamp (defaults to now) */
  timestamp?: Date;
}

/**
 * Contact search filters
 */
export interface ContactSearchFilters {
  /** Filter by lifecycle stage */
  lifecyclestage?: string;
  /** Filter contacts created after this date */
  createdate_gte?: Date;
  /** Maximum number of results */
  limit?: number;
  /** Search query string */
  query?: string;
}

/**
 * Rate limiter for HubSpot API (100 calls per 10 seconds)
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number = 100;
  private readonly windowMs: number = 10000; // 10 seconds

  /**
   * Wait if necessary to respect rate limits
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Remove requests outside the current window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    // If at limit, wait until oldest request expires
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitIfNeeded(); // Recursively check again
    }

    // Record this request
    this.requests.push(now);
  }
}

/**
 * HubSpot CRM Adapter
 *
 * Provides methods to interact with HubSpot CRM API for managing
 * contacts, deals, and activities.
 */
export class HubSpotAdapter {
  private client: AxiosInstance;
  private logger: Logger;
  private config: HubSpotConfig;
  private rateLimiter: RateLimiter;

  /**
   * Create a new HubSpot adapter
   *
   * @param config - HubSpot configuration
   */
  constructor(config: HubSpotConfig) {
    this.config = config;
    this.logger = new Logger('hubspot-adapter');
    this.rateLimiter = new RateLimiter();

    // Create axios client with default configuration
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.hubapi.com',
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.rateLimiter.waitIfNeeded();
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => this.handleApiError(error)
    );

    this.logger.info('HubSpot adapter initialized', {
      portalId: config.portalId,
      baseUrl: config.baseURL || 'default',
    });
  }

  /**
   * Handle API errors and convert to JarvisError
   */
  private handleApiError(error: AxiosError): never {
    const response = error.response;

    if (!response) {
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'HubSpot API request failed',
        { originalError: error.message },
        true
      );
    }

    const status = response.status;
    const data = response.data as any;

    // Handle rate limiting
    if (status === 429) {
      this.logger.warn('HubSpot rate limit exceeded');
      throw new JarvisError(
        ErrorCode.RATE_LIMIT_ERROR,
        'HubSpot API rate limit exceeded',
        { retryAfter: response.headers['retry-after'] },
        true
      );
    }

    // Handle authentication errors
    if (status === 401 || status === 403) {
      throw new JarvisError(
        ErrorCode.AUTHENTICATION_ERROR,
        'HubSpot authentication failed',
        { status, message: data.message },
        false
      );
    }

    // Handle not found
    if (status === 404) {
      throw new JarvisError(
        ErrorCode.NOT_FOUND,
        'HubSpot resource not found',
        { status, message: data.message },
        false
      );
    }

    // Handle validation errors
    if (status === 400) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request to HubSpot API',
        { status, message: data.message, errors: data.errors },
        false
      );
    }

    // Generic server error
    throw new JarvisError(
      ErrorCode.INTEGRATION_ERROR,
      'HubSpot API error',
      { status, message: data.message },
      true
    );
  }

  /**
   * Create or update a contact
   *
   * If a contact with the given email exists, it will be updated.
   * Otherwise, a new contact will be created.
   *
   * @param contact - Contact data
   * @returns Contact ID
   */
  async upsertContact(contact: Contact): Promise<string> {
    this.logger.info('Upserting contact', { email: contact.email });

    try {
      // Prepare properties object for HubSpot
      const properties: Record<string, any> = {
        email: contact.email,
      };

      if (contact.firstname) properties.firstname = contact.firstname;
      if (contact.lastname) properties.lastname = contact.lastname;
      if (contact.company) properties.company = contact.company;
      if (contact.phone) properties.phone = contact.phone;
      if (contact.lifecyclestage) properties.lifecyclestage = contact.lifecyclestage;

      // Merge additional properties
      if (contact.properties) {
        Object.assign(properties, contact.properties);
      }

      // Try to find existing contact
      const existing = await this.getContactByEmail(contact.email);

      let contactId: string;

      if (existing) {
        // Update existing contact
        const response = await this.client.patch(
          `/crm/v3/objects/contacts/${existing.id}`,
          { properties }
        );
        contactId = response.data.id;
        this.logger.info('Contact updated', { contactId, email: contact.email });
      } else {
        // Create new contact
        const response = await this.client.post(
          '/crm/v3/objects/contacts',
          { properties }
        );
        contactId = response.data.id;
        this.logger.info('Contact created', { contactId, email: contact.email });
      }

      return contactId;
    } catch (error) {
      this.logger.error('Failed to upsert contact', error as Error, { email: contact.email });
      throw error;
    }
  }

  /**
   * Get a contact by email address
   *
   * @param email - Contact email address
   * @returns Contact data or null if not found
   */
  async getContactByEmail(email: string): Promise<Contact | null> {
    this.logger.debug('Getting contact by email', { email });

    try {
      const response = await this.client.post(
        '/crm/v3/objects/contacts/search',
        {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          properties: [
            'email',
            'firstname',
            'lastname',
            'company',
            'phone',
            'lifecyclestage',
          ],
          limit: 1,
        }
      );

      if (response.data.results.length === 0) {
        return null;
      }

      const hubspotContact = response.data.results[0];
      const contact: Contact = {
        id: hubspotContact.id,
        email: hubspotContact.properties.email,
        firstname: hubspotContact.properties.firstname,
        lastname: hubspotContact.properties.lastname,
        company: hubspotContact.properties.company,
        phone: hubspotContact.properties.phone,
        lifecyclestage: hubspotContact.properties.lifecyclestage,
      };

      this.logger.debug('Contact found', { contactId: contact.id, email });
      return contact;
    } catch (error: any) {
      // Return null for not found errors
      if (error.code === ErrorCode.NOT_FOUND) {
        return null;
      }
      this.logger.error('Failed to get contact by email', error as Error, { email });
      throw error;
    }
  }

  /**
   * Create a new deal
   *
   * @param deal - Deal data
   * @returns Deal ID
   */
  async createDeal(deal: Deal): Promise<string> {
    this.logger.info('Creating deal', { dealname: deal.dealname });

    try {
      const properties: Record<string, any> = {
        dealname: deal.dealname,
        amount: deal.amount.toString(),
        dealstage: deal.dealstage,
      };

      if (deal.closedate) {
        properties.closedate = deal.closedate.toISOString();
      }

      if (deal.pipeline) {
        properties.pipeline = deal.pipeline;
      }

      const response = await this.client.post(
        '/crm/v3/objects/deals',
        { properties }
      );

      const dealId = response.data.id;

      // Associate with contact if provided
      if (deal.contactId) {
        await this.client.put(
          `/crm/v3/objects/deals/${dealId}/associations/contacts/${deal.contactId}/deal_to_contact`
        );
        this.logger.debug('Deal associated with contact', { dealId, contactId: deal.contactId });
      }

      this.logger.info('Deal created', { dealId, dealname: deal.dealname });
      return dealId;
    } catch (error) {
      this.logger.error('Failed to create deal', error as Error, { dealname: deal.dealname });
      throw error;
    }
  }

  /**
   * Update deal stage
   *
   * @param dealId - Deal ID
   * @param stage - New deal stage
   */
  async updateDealStage(dealId: string, stage: string): Promise<void> {
    this.logger.info('Updating deal stage', { dealId, stage });

    try {
      await this.client.patch(
        `/crm/v3/objects/deals/${dealId}`,
        {
          properties: {
            dealstage: stage,
          },
        }
      );

      this.logger.info('Deal stage updated', { dealId, stage });
    } catch (error) {
      this.logger.error('Failed to update deal stage', error as Error, { dealId, stage });
      throw error;
    }
  }

  /**
   * Log an activity for a contact
   *
   * Creates an engagement (note, email, call, or meeting) associated with a contact.
   *
   * @param contactId - Contact ID
   * @param activity - Activity data
   * @returns Activity/engagement ID
   */
  async logActivity(contactId: string, activity: Activity): Promise<string> {
    this.logger.info('Logging activity', { contactId, type: activity.type });

    try {
      // Map activity type to HubSpot engagement type
      const engagementTypeMap: Record<string, string> = {
        email: 'EMAIL',
        call: 'CALL',
        meeting: 'MEETING',
        note: 'NOTE',
      };

      const engagementType = engagementTypeMap[activity.type];
      const timestamp = activity.timestamp || new Date();

      const payload: any = {
        engagement: {
          active: true,
          type: engagementType,
          timestamp: timestamp.getTime(),
        },
        associations: {
          contactIds: [contactId],
        },
        metadata: {
          subject: activity.subject,
          body: activity.body,
        },
      };

      const response = await this.client.post(
        '/crm/v3/engagements',
        payload
      );

      const engagementId = response.data.engagement.id;
      this.logger.info('Activity logged', { engagementId, contactId, type: activity.type });

      return engagementId;
    } catch (error) {
      this.logger.error('Failed to log activity', error as Error, { contactId, type: activity.type });
      throw error;
    }
  }

  /**
   * Get activities for a contact
   *
   * @param contactId - Contact ID
   * @returns Array of activities
   */
  async getContactActivities(contactId: string): Promise<Array<{
    type: string;
    subject: string;
    timestamp: Date;
  }>> {
    this.logger.debug('Getting contact activities', { contactId });

    try {
      const response = await this.client.get(
        `/crm/v3/objects/contacts/${contactId}/associations/engagements`
      );

      const engagementIds = response.data.results.map((r: any) => r.id);

      if (engagementIds.length === 0) {
        return [];
      }

      // Fetch engagement details
      const activities: Array<{
        type: string;
        subject: string;
        timestamp: Date;
      }> = [];

      for (const engagementId of engagementIds) {
        try {
          const engResponse = await this.client.get(
            `/crm/v3/engagements/${engagementId}`
          );

          const engagement = engResponse.data;
          activities.push({
            type: engagement.engagement.type.toLowerCase(),
            subject: engagement.metadata.subject || '',
            timestamp: new Date(engagement.engagement.timestamp),
          });
        } catch (error) {
          this.logger.warn('Failed to fetch engagement details', { engagementId });
        }
      }

      this.logger.debug('Contact activities retrieved', { contactId, count: activities.length });
      return activities;
    } catch (error) {
      this.logger.error('Failed to get contact activities', error as Error, { contactId });
      throw error;
    }
  }

  /**
   * Search for contacts
   *
   * @param filters - Search filters
   * @returns Array of matching contacts
   */
  async searchContacts(filters: ContactSearchFilters): Promise<Contact[]> {
    this.logger.info('Searching contacts', filters);

    try {
      const filterGroups: any[] = [];

      // Build filter groups
      if (filters.lifecyclestage) {
        filterGroups.push({
          filters: [
            {
              propertyName: 'lifecyclestage',
              operator: 'EQ',
              value: filters.lifecyclestage,
            },
          ],
        });
      }

      if (filters.createdate_gte) {
        filterGroups.push({
          filters: [
            {
              propertyName: 'createdate',
              operator: 'GTE',
              value: filters.createdate_gte.getTime().toString(),
            },
          ],
        });
      }

      const payload: any = {
        properties: [
          'email',
          'firstname',
          'lastname',
          'company',
          'phone',
          'lifecyclestage',
        ],
        limit: filters.limit || 100,
      };

      if (filterGroups.length > 0) {
        payload.filterGroups = filterGroups;
      }

      if (filters.query) {
        payload.query = filters.query;
      }

      const response = await this.client.post(
        '/crm/v3/objects/contacts/search',
        payload
      );

      const contacts: Contact[] = response.data.results.map((result: any) => ({
        id: result.id,
        email: result.properties.email,
        firstname: result.properties.firstname,
        lastname: result.properties.lastname,
        company: result.properties.company,
        phone: result.properties.phone,
        lifecyclestage: result.properties.lifecyclestage,
      }));

      this.logger.info('Contacts found', { count: contacts.length });
      return contacts;
    } catch (error) {
      this.logger.error('Failed to search contacts', error as Error, filters);
      throw error;
    }
  }

  /**
   * Get adapter health status
   *
   * @returns Health check result
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const startTime = Date.now();

    try {
      await this.client.get('/crm/v3/objects/contacts', {
        params: { limit: 1 },
      });

      const latency = Date.now() - startTime;
      this.logger.debug('Health check passed', { latency });

      return { healthy: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error('Health check failed', error as Error, { latency });

      return { healthy: false, latency };
    }
  }
}
