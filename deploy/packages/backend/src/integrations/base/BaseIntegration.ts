/**
 * Base Integration Class
 * Abstract class that all integrations must extend
 */

import { Logger } from '@jarvis/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface IntegrationConfig {
  /** Observatory ID this integration belongs to */
  observatoryId: string;
  /** Integration ID in database */
  integrationId: string;
  /** Platform-specific credentials (OAuth tokens, API keys, etc.) */
  credentials: Record<string, any>;
  /** Platform-specific configuration */
  config?: Record<string, any>;
  /** Supabase client for database operations */
  supabase: SupabaseClient;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastChecked: Date;
  details?: Record<string, any>;
}

/**
 * Abstract base class for all platform integrations
 */
export abstract class BaseIntegration {
  protected logger: Logger;
  protected observatoryId: string;
  protected integrationId: string;
  protected credentials: Record<string, any>;
  protected config: Record<string, any>;
  protected supabase: SupabaseClient;
  protected isInitialized: boolean = false;

  constructor(config: IntegrationConfig) {
    this.observatoryId = config.observatoryId;
    this.integrationId = config.integrationId;
    this.credentials = config.credentials;
    this.config = config.config || {};
    this.supabase = config.supabase;
    this.logger = new Logger(`${this.name}:${this.integrationId.slice(0, 8)}`);
  }

  /**
   * Platform name (e.g., 'twitter', 'gmail', 'hubspot')
   */
  abstract get name(): string;

  /**
   * Platform display name (e.g., 'Twitter/X', 'Gmail', 'HubSpot CRM')
   */
  abstract get displayName(): string;

  /**
   * Initialize the integration (connect to API, set up clients, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Test the connection to the platform
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Disconnect and cleanup resources
   */
  abstract disconnect(): Promise<void>;

  /**
   * Get health status of the integration
   */
  async getHealth(): Promise<HealthCheck> {
    try {
      const isHealthy = await this.testConnection();
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'Connection successful' : 'Connection failed',
        lastChecked: new Date(),
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Log an activity to the database
   */
  protected async logActivity(params: {
    activityType: string;
    action: string;
    title: string;
    description?: string;
    metadata?: Record<string, any>;
    status?: 'success' | 'failed' | 'pending';
  }): Promise<void> {
    try {
      const { error } = await this.supabase.from('activity_logs').insert({
        observatory_id: this.observatoryId,
        integration_id: this.integrationId,
        activity_type: params.activityType,
        action: params.action,
        title: params.title,
        description: params.description,
        metadata: params.metadata || {},
        status: params.status || 'success',
      });

      if (error) {
        this.logger.error('Failed to log activity', error);
      }
    } catch (error) {
      this.logger.error('Failed to log activity', error);
    }
  }

  /**
   * Update integration status in database
   */
  protected async updateStatus(status: 'connected' | 'disconnected' | 'error', errorMessage?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('integrations')
        .update({
          status,
          error_message: errorMessage || null,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', this.integrationId);

      if (error) {
        this.logger.error('Failed to update integration status', error);
      }
    } catch (error) {
      this.logger.error('Failed to update integration status', error);
    }
  }

  /**
   * Update credentials in database (for token refresh)
   */
  protected async updateCredentials(credentials: Record<string, any>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('integrations')
        .update({
          credentials,
        })
        .eq('id', this.integrationId);

      if (error) {
        this.logger.error('Failed to update credentials', error);
        throw error;
      }

      this.credentials = credentials;
      this.logger.info('Credentials updated successfully');
    } catch (error) {
      this.logger.error('Failed to update credentials', error);
      throw error;
    }
  }
}
