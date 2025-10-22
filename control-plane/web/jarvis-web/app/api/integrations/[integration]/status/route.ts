/**
 * Integration Status API Route
 * GET /api/integrations/[integration]/status
 *
 * Checks the connection status of a specific integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { IntegrationStatusResponse } from '@/lib/types/integrations';
import { isValidIntegrationType, getIntegrationConfig } from '@/lib/integrations/config';
import { MockIntegrationStore } from '@/lib/integrations/mock-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { integration: string } }
) {
  try {
    const { integration: integrationType } = params;

    // Validate integration type
    if (!isValidIntegrationType(integrationType)) {
      return NextResponse.json(
        { error: `Invalid integration type: ${integrationType}` },
        { status: 400 }
      );
    }

    const config = getIntegrationConfig(integrationType);
    if (!config) {
      return NextResponse.json(
        { error: 'Integration configuration not found' },
        { status: 404 }
      );
    }

    // Get integration from store
    const integration = MockIntegrationStore.getIntegration('mock-user', integrationType);

    if (!integration) {
      return NextResponse.json(
        {
          error: 'Integration not connected',
          message: `${config.name} is not connected`,
        },
        { status: 404 }
      );
    }

    // Generate mock details based on integration type
    const details = generateMockDetails(integrationType);

    const response: IntegrationStatusResponse = {
      integration,
      details,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: unknown) {
    console.error('Integration status error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to fetch integration status', message },
      { status: 500 }
    );
  }
}

// Helper function to generate mock details for different integration types
function generateMockDetails(integrationType: string) {
  const baseDetails = {
    permissions: ['read', 'write'],
    quotaUsage: {
      used: Math.floor(Math.random() * 500),
      limit: 1000,
    },
  };

  switch (integrationType) {
    case 'gmail':
      return {
        ...baseDetails,
        accountInfo: {
          email: 'user@example.com',
          name: 'Mock User',
          verified: true,
        },
        permissions: ['gmail.readonly', 'gmail.send'],
      };

    case 'salesforce':
      return {
        ...baseDetails,
        accountInfo: {
          orgId: 'org_mock_123456',
          instanceUrl: 'https://mock.salesforce.com',
          username: 'user@example.com',
        },
        permissions: ['api', 'refresh_token', 'chatter_api'],
      };

    case 'hubspot':
      return {
        ...baseDetails,
        accountInfo: {
          portalId: '12345678',
          accountName: 'Mock Company',
          hubId: 'hub_mock_123',
        },
        permissions: ['crm.objects.contacts.read', 'crm.objects.companies.read'],
      };

    case 'twitter':
      return {
        ...baseDetails,
        accountInfo: {
          username: '@mockuser',
          userId: '1234567890',
          verified: false,
        },
        permissions: ['tweet.read', 'users.read', 'offline.access'],
      };

    case 'dawg-ai':
      return {
        ...baseDetails,
        accountInfo: {
          apiVersion: 'v1',
          model: 'dawg-1.0',
          tier: 'pro',
        },
        permissions: ['inference', 'fine-tune'],
      };

    case 'imessage':
      return {
        ...baseDetails,
        accountInfo: {
          deviceId: 'device_mock_123',
          messagesCount: 1523,
          lastSyncedAt: new Date().toISOString(),
        },
        permissions: ['read', 'send'],
      };

    case 'email':
      return {
        ...baseDetails,
        accountInfo: {
          email: 'user@example.com',
          provider: 'Generic Email',
          inboxCount: 234,
        },
        permissions: ['email.read', 'email.send'],
      };

    case 'sms':
      return {
        ...baseDetails,
        accountInfo: {
          phoneNumber: '+1234567890',
          provider: 'Mock SMS Provider',
          messagesCount: 456,
        },
        permissions: ['sms.send', 'sms.receive'],
      };

    case 'analytics':
      return {
        ...baseDetails,
        accountInfo: {
          propertyId: 'prop_mock_123',
          accountName: 'Mock Analytics',
          dataRetention: '14 months',
        },
        permissions: ['analytics.readonly', 'analytics.edit'],
      };

    default:
      return baseDetails;
  }
}
