/**
 * Integration Configurations
 */

import { IntegrationConfig, IntegrationType } from '@/lib/types/integrations';

export const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationConfig> = {
  'dawg-ai': {
    type: 'dawg-ai',
    name: 'Dawg AI',
    description: 'Connect to Dawg AI for advanced AI capabilities',
    authMethod: 'api_key',
    requiresOAuth: false,
  },
  'imessage': {
    type: 'imessage',
    name: 'iMessage',
    description: 'Connect to iMessage for message integration',
    authMethod: 'system',
    requiresOAuth: false,
  },
  'email': {
    type: 'email',
    name: 'Email',
    description: 'Connect your email account',
    authMethod: 'oauth2',
    requiresOAuth: true,
    scopes: ['email.read', 'email.send'],
  },
  'gmail': {
    type: 'gmail',
    name: 'Gmail',
    description: 'Connect to Gmail',
    authMethod: 'oauth2',
    requiresOAuth: true,
    oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ],
  },
  'salesforce': {
    type: 'salesforce',
    name: 'Salesforce',
    description: 'Connect to Salesforce CRM',
    authMethod: 'oauth2',
    requiresOAuth: true,
    oauthUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    scopes: ['api', 'refresh_token'],
  },
  'hubspot': {
    type: 'hubspot',
    name: 'HubSpot',
    description: 'Connect to HubSpot CRM',
    authMethod: 'oauth2',
    requiresOAuth: true,
    oauthUrl: 'https://app.hubspot.com/oauth/authorize',
    scopes: ['crm.objects.contacts.read', 'crm.objects.companies.read'],
  },
  'twitter': {
    type: 'twitter',
    name: 'Twitter/X',
    description: 'Connect to Twitter/X',
    authMethod: 'oauth2',
    requiresOAuth: true,
    oauthUrl: 'https://twitter.com/i/oauth2/authorize',
    scopes: ['tweet.read', 'users.read', 'offline.access'],
  },
  'sms': {
    type: 'sms',
    name: 'SMS',
    description: 'Connect to SMS service',
    authMethod: 'api_key',
    requiresOAuth: false,
  },
  'analytics': {
    type: 'analytics',
    name: 'Analytics',
    description: 'Connect to analytics platform',
    authMethod: 'api_key',
    requiresOAuth: false,
  },
};

export function getIntegrationConfig(type: IntegrationType): IntegrationConfig | undefined {
  return INTEGRATION_CONFIGS[type];
}

export function isValidIntegrationType(type: string): type is IntegrationType {
  return type in INTEGRATION_CONFIGS;
}
