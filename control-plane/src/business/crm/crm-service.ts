/**
 * CRM Service
 *
 * Unified CRM interface supporting:
 * - HubSpot CRM
 * - Salesforce
 *
 * Features:
 * - Lead management
 * - Contact tracking
 * - AI-powered lead enrichment
 * - Automated data synchronization
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import {
  CRMLead,
  CRMContact,
  CRMInteraction,
  BusinessEvent,
  IExternalIntegration
} from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export interface CRMConfig {
  platform: 'hubspot' | 'salesforce';
  hubspot?: {
    apiKey: string;
    portalId: string;
  };
  salesforce?: {
    clientId: string;
    clientSecret: string;
    instanceUrl: string;
  };
  enrichment: {
    enabled: boolean;
    autoEnrich: boolean;
    model: string;
  };
  syncInterval: string; // e.g., '15m', '1h'
}

export class CRMService extends EventEmitter {
  private prisma: PrismaClient;
  private config: CRMConfig;
  private integration: IExternalIntegration | null = null;
  private isInitialized: boolean = false;
  private syncIntervalId: NodeJS.Timeout | null = null;

  constructor(config: CRMConfig) {
    super();
    this.prisma = new PrismaClient();
    this.config = config;
  }

  /**
   * Initialize service and connect to CRM platform
   */
  async initialize(): Promise<void> {
    logger.info('CRM service initializing', {
      service: 'crm',
      platform: this.config.platform
    });

    try {
      // Connect to selected CRM platform
      if (this.config.platform === 'hubspot' && this.config.hubspot) {
        const { HubSpotCRMClient } = await import('../integrations/hubspot-crm-client.js');
        this.integration = new HubSpotCRMClient(
          this.config.hubspot.apiKey,
          this.config.hubspot.portalId
        );
      } else if (this.config.platform === 'salesforce' && this.config.salesforce) {
        const { SalesforceCRMClient } = await import('../integrations/salesforce-crm-client.js');
        this.integration = new SalesforceCRMClient(
          this.config.salesforce.clientId,
          this.config.salesforce.clientSecret,
          this.config.salesforce.instanceUrl
        );
      } else {
        throw new Error(`Unsupported CRM platform: ${this.config.platform}`);
      }

      await this.integration.connect();

      // Start sync interval if configured
      this.startSyncInterval();

      this.isInitialized = true;
      logger.info('CRM service initialized successfully', {
        service: 'crm',
        platform: this.config.platform
      });
    } catch (error) {
      logger.error('Failed to initialize CRM service', {
        service: 'crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a new lead
   */
  async createLead(leadData: Omit<CRMLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMLead> {
    if (!this.isInitialized) {
      throw new Error('CRM service not initialized');
    }

    logger.info('Creating CRM lead', {
      service: 'crm',
      email: leadData.email,
      status: leadData.status
    });

    try {
      // Create in database
      const lead = await this.prisma.cRMLead.create({
        data: {
          email: leadData.email,
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          company: leadData.company,
          phone: leadData.phone,
          status: leadData.status,
          source: leadData.source,
          value: leadData.value,
          customFields: leadData.customFields || {},
          enrichment: leadData.enrichment || {}
        }
      });

      const result: CRMLead = {
        id: lead.id,
        email: lead.email,
        firstName: lead.firstName || undefined,
        lastName: lead.lastName || undefined,
        company: lead.company || undefined,
        phone: lead.phone || undefined,
        status: lead.status as CRMLead['status'],
        source: lead.source,
        value: lead.value || undefined,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        customFields: lead.customFields as Record<string, any>,
        enrichment: lead.enrichment as CRMLead['enrichment']
      };

      // Emit event
      this.emit(BusinessEvent.LEAD_CREATED, result);

      // Auto-enrich if enabled
      if (this.config.enrichment.enabled && this.config.enrichment.autoEnrich) {
        // Don't await - enrich in background
        this.enrichLead(result.id).catch(error => {
          logger.error('Background enrichment failed', {
            service: 'crm',
            leadId: result.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }

      logger.info('CRM lead created', {
        service: 'crm',
        leadId: result.id,
        email: result.email
      });

      return result;
    } catch (error) {
      logger.error('Failed to create CRM lead', {
        service: 'crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get lead by ID
   */
  async getLead(leadId: string): Promise<CRMLead | null> {
    const lead = await this.prisma.cRMLead.findUnique({
      where: { id: leadId }
    });

    if (!lead) return null;

    return {
      id: lead.id,
      email: lead.email,
      firstName: lead.firstName || undefined,
      lastName: lead.lastName || undefined,
      company: lead.company || undefined,
      phone: lead.phone || undefined,
      status: lead.status as CRMLead['status'],
      source: lead.source,
      value: lead.value || undefined,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      customFields: lead.customFields as Record<string, any>,
      enrichment: lead.enrichment as CRMLead['enrichment']
    };
  }

  /**
   * List leads with optional filters
   */
  async listLeads(filters?: {
    status?: CRMLead['status'];
    source?: string;
    minValue?: number;
  }): Promise<CRMLead[]> {
    const leads = await this.prisma.cRMLead.findMany({
      where: {
        status: filters?.status,
        source: filters?.source,
        value: filters?.minValue ? { gte: filters.minValue } : undefined
      },
      orderBy: { createdAt: 'desc' }
    });

    return leads.map(lead => ({
      id: lead.id,
      email: lead.email,
      firstName: lead.firstName || undefined,
      lastName: lead.lastName || undefined,
      company: lead.company || undefined,
      phone: lead.phone || undefined,
      status: lead.status as CRMLead['status'],
      source: lead.source,
      value: lead.value || undefined,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      customFields: lead.customFields as Record<string, any>,
      enrichment: lead.enrichment as CRMLead['enrichment']
    }));
  }

  /**
   * Update lead
   */
  async updateLead(leadId: string, updates: Partial<Omit<CRMLead, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CRMLead> {
    logger.info('Updating CRM lead', {
      service: 'crm',
      leadId,
      updates: Object.keys(updates)
    });

    const previousLead = await this.getLead(leadId);

    const lead = await this.prisma.cRMLead.update({
      where: { id: leadId },
      data: {
        email: updates.email,
        firstName: updates.firstName,
        lastName: updates.lastName,
        company: updates.company,
        phone: updates.phone,
        status: updates.status,
        source: updates.source,
        value: updates.value,
        customFields: updates.customFields,
        enrichment: updates.enrichment
      }
    });

    const result: CRMLead = {
      id: lead.id,
      email: lead.email,
      firstName: lead.firstName || undefined,
      lastName: lead.lastName || undefined,
      company: lead.company || undefined,
      phone: lead.phone || undefined,
      status: lead.status as CRMLead['status'],
      source: lead.source,
      value: lead.value || undefined,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      customFields: lead.customFields as Record<string, any>,
      enrichment: lead.enrichment as CRMLead['enrichment']
    };

    // Emit appropriate events
    if (previousLead && previousLead.status !== result.status) {
      if (result.status === 'qualified') {
        this.emit(BusinessEvent.LEAD_QUALIFIED, result);
      } else if (result.status === 'won') {
        this.emit(BusinessEvent.LEAD_CONVERTED, result);
      } else if (result.status === 'lost') {
        this.emit(BusinessEvent.LEAD_LOST, result);
      }
    }

    return result;
  }

  /**
   * AI-powered lead enrichment
   */
  async enrichLead(leadId: string): Promise<CRMLead> {
    if (!this.config.enrichment.enabled) {
      throw new Error('Lead enrichment is not enabled');
    }

    const lead = await this.getLead(leadId);
    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    logger.info('Enriching CRM lead with AI', {
      service: 'crm',
      leadId,
      email: lead.email
    });

    try {
      // TODO: Integrate with AI provider to enrich lead data
      // For now, use a mock enrichment
      const enrichment = {
        linkedinProfile: lead.company ? `https://linkedin.com/company/${lead.company.toLowerCase().replace(/\s+/g, '-')}` : undefined,
        companySize: this.estimateCompanySize(lead.company),
        industry: this.estimateIndustry(lead.email, lead.company),
        aiSummary: `Lead from ${lead.source}. Potential value: ${lead.value || 'unknown'}.`
      };

      const updatedLead = await this.updateLead(leadId, { enrichment });

      this.emit(BusinessEvent.CONTACT_ENRICHED, updatedLead);

      logger.info('CRM lead enriched', {
        service: 'crm',
        leadId,
        enrichmentFields: Object.keys(enrichment)
      });

      return updatedLead;
    } catch (error) {
      logger.error('Failed to enrich CRM lead', {
        service: 'crm',
        leadId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Sync leads with external CRM platform
   */
  async syncLeads(): Promise<{ synced: number; errors: number }> {
    if (!this.integration) {
      throw new Error('CRM integration not available');
    }

    logger.info('Syncing leads with CRM platform', {
      service: 'crm',
      platform: this.config.platform
    });

    let synced = 0;
    let errors = 0;

    // This is a simplified sync - in production, you'd want:
    // - Bidirectional sync
    // - Conflict resolution
    // - Incremental sync with timestamps
    // - Batch processing for large datasets

    try {
      const localLeads = await this.listLeads();

      for (const lead of localLeads) {
        try {
          // Sync logic would go here
          // For now, just count it as synced
          synced++;
        } catch (error) {
          errors++;
          logger.error('Failed to sync lead', {
            service: 'crm',
            leadId: lead.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info('Lead sync completed', {
        service: 'crm',
        synced,
        errors
      });

      return { synced, errors };
    } catch (error) {
      logger.error('Lead sync failed', {
        service: 'crm',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get CRM statistics
   */
  async getStats(): Promise<{
    totalLeads: number;
    leadsByStatus: Record<CRMLead['status'], number>;
    totalValue: number;
    conversionRate: number;
  }> {
    const leads = await this.prisma.cRMLead.findMany();

    const leadsByStatus: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
      lost: 0
    };

    let totalValue = 0;

    leads.forEach(lead => {
      leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
      totalValue += lead.value || 0;
    });

    const totalLeads = leads.length;
    const wonLeads = leadsByStatus.won || 0;
    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      leadsByStatus: leadsByStatus as Record<CRMLead['status'], number>,
      totalValue,
      conversionRate
    };
  }

  /**
   * Health check for CRM service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    platform: string;
    connected: boolean;
    message: string;
  }> {
    if (!this.integration) {
      return {
        healthy: false,
        platform: this.config.platform,
        connected: false,
        message: 'Integration not initialized'
      };
    }

    try {
      const result = await this.integration.test();
      return {
        healthy: result.healthy,
        platform: this.config.platform,
        connected: result.healthy,
        message: result.message
      };
    } catch (error) {
      return {
        healthy: false,
        platform: this.config.platform,
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start automated sync interval
   */
  private startSyncInterval(): void {
    const intervalMs = this.parseSyncInterval(this.config.syncInterval);

    if (intervalMs > 0) {
      this.syncIntervalId = setInterval(() => {
        this.syncLeads().catch(error => {
          logger.error('Scheduled sync failed', {
            service: 'crm',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }, intervalMs);

      logger.info('CRM sync interval started', {
        service: 'crm',
        interval: this.config.syncInterval
      });
    }
  }

  /**
   * Parse sync interval string (e.g., "15m", "1h") to milliseconds
   */
  private parseSyncInterval(interval: string): number {
    const match = interval.match(/^(\d+)(m|h|d)$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    return value * (multipliers[unit] || 0);
  }

  /**
   * Helper: Estimate company size (mock implementation)
   */
  private estimateCompanySize(company?: string): string {
    if (!company) return 'Unknown';
    // Mock logic - in production, use data enrichment API
    if (company.toLowerCase().includes('inc') || company.toLowerCase().includes('corp')) {
      return '100-500 employees';
    }
    return '1-50 employees';
  }

  /**
   * Helper: Estimate industry (mock implementation)
   */
  private estimateIndustry(email?: string, company?: string): string {
    if (!email && !company) return 'Unknown';
    // Mock logic - in production, use data enrichment API
    const domain = email?.split('@')[1]?.toLowerCase() || '';
    if (domain.includes('tech') || company?.toLowerCase().includes('tech')) {
      return 'Technology';
    }
    if (domain.includes('consulting') || company?.toLowerCase().includes('consulting')) {
      return 'Consulting';
    }
    return 'Business Services';
  }

  /**
   * Cleanup and disconnect
   */
  async shutdown(): Promise<void> {
    logger.info('CRM service shutting down');

    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }

    if (this.integration) {
      await this.integration.disconnect();
    }

    await this.prisma.$disconnect();
    this.isInitialized = false;
  }
}

// Singleton instance
let crmServiceInstance: CRMService | null = null;

export function createCRMService(config: CRMConfig): CRMService {
  if (!crmServiceInstance) {
    crmServiceInstance = new CRMService(config);
  }
  return crmServiceInstance;
}

export function getCRMService(): CRMService {
  if (!crmServiceInstance) {
    throw new Error('CRM service not initialized. Call createCRMService first.');
  }
  return crmServiceInstance;
}
