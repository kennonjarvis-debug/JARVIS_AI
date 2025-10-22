/**
 * Business Assistant
 *
 * Main entry point for all business capabilities:
 * - Marketing
 * - CRM
 * - Customer Support
 * - Analytics
 * - Automation
 *
 * This module integrates with Jarvis Core to provide
 * comprehensive business intelligence and automation.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/structured-logger.js';

// Services
import { MarketingService, createMarketingService, MarketingConfig } from './marketing/marketing-service.js';
import { CRMService, createCRMService, CRMConfig } from './crm/crm-service.js';
import { SupportService, createSupportService, SupportConfig } from './support/support-service.js';
import { AnalyticsService, createAnalyticsService, AnalyticsConfig } from './analytics/analytics-service.js';
import { AutomationEngine, createAutomationEngine, AutomationEngineConfig } from './automation/automation-engine.js';

// Types
export * from './types.js';

export interface BusinessAssistantConfig {
  marketing?: {
    enabled: boolean;
    config: MarketingConfig;
  };
  crm?: {
    enabled: boolean;
    config: CRMConfig;
  };
  support?: {
    enabled: boolean;
    config: SupportConfig;
  };
  analytics?: {
    enabled: boolean;
    config: AnalyticsConfig;
  };
  automation?: {
    enabled: boolean;
    config: AutomationEngineConfig;
  };
}

export class BusinessAssistant extends EventEmitter {
  private marketing: MarketingService | null = null;
  private crm: CRMService | null = null;
  private support: SupportService | null = null;
  private analytics: AnalyticsService | null = null;
  private automation: AutomationEngine | null = null;
  private config: BusinessAssistantConfig;
  private isRunning: boolean = false;

  constructor(config: BusinessAssistantConfig) {
    super();
    this.config = config;
  }

  /**
   * Start all enabled business services
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Business Assistant already running');
      return;
    }

    logger.info('Business Assistant starting', {
      service: 'business-assistant',
      enabledModules: this.getEnabledModules()
    });

    try {
      // Start Marketing Service
      if (this.config.marketing?.enabled) {
        logger.info('Starting Marketing Service');
        this.marketing = createMarketingService(this.config.marketing.config);
        await this.marketing.initialize();

        // Forward events
        this.forwardEvents(this.marketing, 'marketing');
      }

      // Start CRM Service
      if (this.config.crm?.enabled) {
        logger.info('Starting CRM Service');
        this.crm = createCRMService(this.config.crm.config);
        await this.crm.initialize();

        // Forward events
        this.forwardEvents(this.crm, 'crm');
      }

      // Start Support Service
      if (this.config.support?.enabled) {
        logger.info('Starting Support Service');
        this.support = createSupportService(this.config.support.config);
        await this.support.initialize();

        // Forward events
        this.forwardEvents(this.support, 'support');
      }

      // Start Analytics Service
      if (this.config.analytics?.enabled) {
        logger.info('Starting Analytics Service');
        this.analytics = createAnalyticsService(this.config.analytics.config);
        await this.analytics.initialize();

        // Forward events
        this.forwardEvents(this.analytics, 'analytics');
      }

      // Start Automation Engine (should be last, so it can listen to other services)
      if (this.config.automation?.enabled) {
        logger.info('Starting Automation Engine');
        this.automation = createAutomationEngine(this.config.automation.config);
        await this.automation.initialize(this); // Pass this as event bus

        // Forward events
        this.forwardEvents(this.automation, 'automation');
      }

      this.isRunning = true;

      logger.info('Business Assistant started successfully', {
        service: 'business-assistant',
        modules: this.getEnabledModules()
      });

      this.emit('started');
    } catch (error) {
      logger.error('Failed to start Business Assistant', {
        service: 'business-assistant',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Stop all business services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Business Assistant stopping');

    try {
      // Shutdown in reverse order
      if (this.automation) {
        await this.automation.shutdown();
        this.automation = null;
      }

      if (this.analytics) {
        await this.analytics.shutdown();
        this.analytics = null;
      }

      if (this.support) {
        await this.support.shutdown();
        this.support = null;
      }

      if (this.crm) {
        await this.crm.shutdown();
        this.crm = null;
      }

      if (this.marketing) {
        await this.marketing.shutdown();
        this.marketing = null;
      }

      this.isRunning = false;

      logger.info('Business Assistant stopped');
      this.emit('stopped');
    } catch (error) {
      logger.error('Failed to stop Business Assistant', {
        service: 'business-assistant',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get health status of all services
   */
  async getHealth(): Promise<{
    healthy: boolean;
    services: {
      marketing?: { healthy: boolean; message: string };
      crm?: { healthy: boolean; message: string };
      support?: { healthy: boolean; message: string };
      analytics?: { healthy: boolean; message: string };
      automation?: { healthy: boolean; message: string };
    };
  }> {
    const services: any = {};

    if (this.marketing) {
      services.marketing = await this.marketing.healthCheck();
    }

    if (this.crm) {
      services.crm = await this.crm.healthCheck();
    }

    if (this.support) {
      services.support = await this.support.healthCheck();
    }

    if (this.analytics) {
      services.analytics = { healthy: true, message: 'Analytics running' };
    }

    if (this.automation) {
      services.automation = { healthy: true, message: 'Automation running' };
    }

    const healthy = Object.values(services).every((s: any) => s.healthy);

    return { healthy, services };
  }

  /**
   * Get all enabled modules
   */
  private getEnabledModules(): string[] {
    const modules: string[] = [];

    if (this.config.marketing?.enabled) modules.push('marketing');
    if (this.config.crm?.enabled) modules.push('crm');
    if (this.config.support?.enabled) modules.push('support');
    if (this.config.analytics?.enabled) modules.push('analytics');
    if (this.config.automation?.enabled) modules.push('automation');

    return modules;
  }

  /**
   * Forward events from a service to the main event bus
   */
  private forwardEvents(service: EventEmitter, prefix: string): void {
    const forwardEvent = (eventName: string) => {
      service.on(eventName, (...args: any[]) => {
        this.emit(eventName, ...args);

        logger.debug('Business event emitted', {
          service: prefix,
          event: eventName
        });
      });
    };

    // Forward all business events
    const events = [
      // Marketing
      'campaign_created',
      'campaign_started',
      'campaign_completed',
      'campaign_paused',

      // CRM
      'lead_created',
      'lead_qualified',
      'lead_converted',
      'lead_lost',
      'contact_updated',
      'contact_enriched',

      // Support
      'ticket_created',
      'ticket_updated',
      'ticket_resolved',
      'ticket_escalated',
      'negative_sentiment_detected',

      // Analytics
      'metrics_calculated',
      'trend_detected',
      'anomaly_detected',

      // Automation
      'automation_triggered',
      'automation_completed',
      'automation_failed'
    ];

    events.forEach(forwardEvent);
  }

  /**
   * Getter methods for services
   */
  getMarketingService(): MarketingService | null {
    return this.marketing;
  }

  getCRMService(): CRMService | null {
    return this.crm;
  }

  getSupportService(): SupportService | null {
    return this.support;
  }

  getAnalyticsService(): AnalyticsService | null {
    return this.analytics;
  }

  getAutomationEngine(): AutomationEngine | null {
    return this.automation;
  }

  /**
   * Check if a specific module is enabled
   */
  isModuleEnabled(module: 'marketing' | 'crm' | 'support' | 'analytics' | 'automation'): boolean {
    return this.config[module]?.enabled || false;
  }
}

// Singleton instance
let businessAssistantInstance: BusinessAssistant | null = null;

/**
 * Create and initialize Business Assistant
 */
export async function createBusinessAssistant(config: BusinessAssistantConfig): Promise<BusinessAssistant> {
  if (!businessAssistantInstance) {
    businessAssistantInstance = new BusinessAssistant(config);
    await businessAssistantInstance.start();
  }
  return businessAssistantInstance;
}

/**
 * Get Business Assistant instance
 */
export function getBusinessAssistant(): BusinessAssistant {
  if (!businessAssistantInstance) {
    throw new Error('Business Assistant not initialized. Call createBusinessAssistant first.');
  }
  return businessAssistantInstance;
}

/**
 * Stop Business Assistant
 */
export async function stopBusinessAssistant(): Promise<void> {
  if (businessAssistantInstance) {
    await businessAssistantInstance.stop();
    businessAssistantInstance = null;
  }
}

// Export service classes for direct access if needed
export { MarketingService, CRMService, SupportService, AnalyticsService, AutomationEngine };
