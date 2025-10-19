/**
 * Integration Manager Service
 * Loads, initializes, and manages all platform integrations
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Logger, JarvisError, ErrorCode } from '@jarvis/shared';
import type { BaseIntegration } from '../integrations/base/BaseIntegration.js';

export interface IntegrationRecord {
  id: string;
  observatory_id: string;
  platform: string;
  account_name: string | null;
  account_id: string | null;
  credentials: Record<string, any>;
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
}

/**
 * Manages all integrations for an observatory
 */
export class IntegrationManager {
  private logger: Logger;
  private supabase: SupabaseClient;
  private integrations: Map<string, BaseIntegration> = new Map();
  private integrationClasses: Map<string, typeof BaseIntegration> = new Map();

  constructor() {
    this.logger = new Logger('IntegrationManager');

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Supabase credentials not configured',
        { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey }
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.logger.info('IntegrationManager initialized');
  }

  /**
   * Register an integration class
   */
  registerIntegration(platform: string, integrationClass: typeof BaseIntegration): void {
    this.integrationClasses.set(platform, integrationClass);
    this.logger.info(`Registered integration: ${platform}`);
  }

  /**
   * Load all integrations for an observatory
   */
  async loadIntegrationsForObservatory(observatoryId: string): Promise<BaseIntegration[]> {
    try {
      this.logger.info('Loading integrations for observatory', { observatoryId });

      // Fetch integrations from database
      const { data, error } = await this.supabase
        .from('integrations')
        .select('*')
        .eq('observatory_id', observatoryId)
        .eq('status', 'connected');

      if (error) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to load integrations from database',
          { error: error.message }
        );
      }

      const integrations: BaseIntegration[] = [];

      // Initialize each integration
      for (const record of data || []) {
        try {
          const integration = await this.loadIntegration(record as IntegrationRecord);
          integrations.push(integration);
        } catch (error) {
          this.logger.error(`Failed to load integration ${record.platform}`, error, {
            integrationId: record.id,
          });
        }
      }

      this.logger.info(`Loaded ${integrations.length} integrations`, { observatoryId });
      return integrations;
    } catch (error) {
      this.logger.error('Failed to load integrations', error);
      throw error;
    }
  }

  /**
   * Load a single integration
   */
  async loadIntegration(record: IntegrationRecord): Promise<BaseIntegration> {
    try {
      const IntegrationClass = this.integrationClasses.get(record.platform);

      if (!IntegrationClass) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          `Integration class not registered: ${record.platform}`,
          { platform: record.platform }
        );
      }

      // Create instance
      const integration = new IntegrationClass({
        observatoryId: record.observatory_id,
        integrationId: record.id,
        credentials: record.credentials,
        config: record.config,
        supabase: this.supabase,
      }) as BaseIntegration;

      // Initialize
      await integration.initialize();

      // Store in cache
      const cacheKey = `${record.observatory_id}:${record.platform}:${record.account_id || 'default'}`;
      this.integrations.set(cacheKey, integration);

      this.logger.info('Integration loaded and initialized', {
        platform: record.platform,
        integrationId: record.id,
      });

      return integration;
    } catch (error) {
      this.logger.error('Failed to load integration', error, {
        platform: record.platform,
        integrationId: record.id,
      });
      throw error;
    }
  }

  /**
   * Get an integration by platform and optional account ID
   */
  getIntegration(observatoryId: string, platform: string, accountId?: string): BaseIntegration | null {
    const cacheKey = `${observatoryId}:${platform}:${accountId || 'default'}`;
    return this.integrations.get(cacheKey) || null;
  }

  /**
   * Get all integrations for an observatory
   */
  getIntegrationsForObservatory(observatoryId: string): BaseIntegration[] {
    const integrations: BaseIntegration[] = [];

    for (const [key, integration] of this.integrations.entries()) {
      if (key.startsWith(`${observatoryId}:`)) {
        integrations.push(integration);
      }
    }

    return integrations;
  }

  /**
   * Create a new integration in the database
   */
  async createIntegration(params: {
    observatoryId: string;
    platform: string;
    accountName?: string;
    accountId?: string;
    credentials: Record<string, any>;
    config?: Record<string, any>;
  }): Promise<IntegrationRecord> {
    try {
      this.logger.info('Creating new integration', {
        observatoryId: params.observatoryId,
        platform: params.platform,
      });

      const { data, error } = await this.supabase
        .from('integrations')
        .insert({
          observatory_id: params.observatoryId,
          platform: params.platform,
          account_name: params.accountName,
          account_id: params.accountId,
          credentials: params.credentials,
          config: params.config || {},
          status: 'connected',
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Supabase insert error details', error);
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to create integration in database',
          { error: error.message, code: error.code, details: error.details, hint: error.hint }
        );
      }

      this.logger.info('Integration created successfully', {
        integrationId: data.id,
        platform: params.platform,
      });

      return data as IntegrationRecord;
    } catch (error) {
      this.logger.error('Failed to create integration', error);
      throw error;
    }
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    try {
      this.logger.info('Deleting integration', { integrationId });

      // Get integration from database first
      const { data, error: fetchError } = await this.supabase
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (fetchError || !data) {
        throw new JarvisError(
          ErrorCode.NOT_FOUND,
          'Integration not found',
          { integrationId }
        );
      }

      // Disconnect if loaded
      const cacheKey = `${data.observatory_id}:${data.platform}:${data.account_id || 'default'}`;
      const integration = this.integrations.get(cacheKey);

      if (integration) {
        await integration.disconnect();
        this.integrations.delete(cacheKey);
      }

      // Delete from database
      const { error: deleteError } = await this.supabase
        .from('integrations')
        .delete()
        .eq('id', integrationId);

      if (deleteError) {
        throw new JarvisError(
          ErrorCode.INTEGRATION_ERROR,
          'Failed to delete integration from database',
          { error: deleteError.message }
        );
      }

      this.logger.info('Integration deleted successfully', { integrationId });
    } catch (error) {
      this.logger.error('Failed to delete integration', error);
      throw error;
    }
  }

  /**
   * Test all integrations for an observatory
   */
  async testAllIntegrations(observatoryId: string): Promise<{
    platform: string;
    status: 'healthy' | 'unhealthy';
    message?: string;
  }[]> {
    const integrations = this.getIntegrationsForObservatory(observatoryId);
    const results: {
      platform: string;
      status: 'healthy' | 'unhealthy';
      message?: string;
    }[] = [];

    for (const integration of integrations) {
      try {
        const health = await integration.getHealth();
        results.push({
          platform: integration.name,
          status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
          message: health.message,
        });
      } catch (error) {
        results.push({
          platform: integration.name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get integration statistics
   */
  getStatistics(): {
    totalLoaded: number;
    byPlatform: Record<string, number>;
    byObservatory: Record<string, number>;
  } {
    const byPlatform: Record<string, number> = {};
    const byObservatory: Record<string, number> = {};

    for (const [key] of this.integrations.entries()) {
      const [observatoryId, platform] = key.split(':');

      byPlatform[platform] = (byPlatform[platform] || 0) + 1;
      byObservatory[observatoryId] = (byObservatory[observatoryId] || 0) + 1;
    }

    return {
      totalLoaded: this.integrations.size,
      byPlatform,
      byObservatory,
    };
  }
}

// Lazy singleton instance
let instance: IntegrationManager | null = null;

export function getIntegrationManager(): IntegrationManager {
  if (!instance) {
    instance = new IntegrationManager();
  }
  return instance;
}

// Export singleton getter for backwards compatibility
export const integrationManager = new Proxy({} as IntegrationManager, {
  get(_target, prop) {
    return getIntegrationManager()[prop as keyof IntegrationManager];
  }
});
