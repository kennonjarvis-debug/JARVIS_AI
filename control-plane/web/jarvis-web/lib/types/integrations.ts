/**
 * Integration Types for Observatory
 */

export type IntegrationType =
  | 'dawg-ai'
  | 'imessage'
  | 'email'
  | 'gmail'
  | 'salesforce'
  | 'hubspot'
  | 'twitter'
  | 'sms'
  | 'analytics';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export type AuthMethod = 'oauth2' | 'api_key' | 'basic' | 'system';

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  authMethod: AuthMethod;
  connectedAt?: string;
  lastSyncedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationConfig {
  type: IntegrationType;
  name: string;
  description: string;
  authMethod: AuthMethod;
  requiresOAuth: boolean;
  oauthUrl?: string;
  scopes?: string[];
}

export interface ConnectIntegrationRequest {
  redirectUri?: string;
  state?: string;
  scopes?: string[];
  apiKey?: string;
  credentials?: Record<string, string>;
}

export interface ConnectIntegrationResponse {
  success: boolean;
  integration?: Integration;
  authUrl?: string;
  message?: string;
  error?: string;
}

export interface IntegrationStatusResponse {
  integration: Integration;
  details?: {
    accountInfo?: Record<string, unknown>;
    permissions?: string[];
    quotaUsage?: {
      used: number;
      limit: number;
    };
  };
}

export interface ListIntegrationsResponse {
  integrations: Integration[];
  total: number;
}

export interface DisconnectIntegrationResponse {
  success: boolean;
  message: string;
}
