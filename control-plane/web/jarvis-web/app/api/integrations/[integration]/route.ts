/**
 * Integration Management API Route
 * DELETE /api/integrations/[integration]
 *
 * Disconnects a specific integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { DisconnectIntegrationResponse } from '@/lib/types/integrations';
import { isValidIntegrationType, getIntegrationConfig } from '@/lib/integrations/config';
import { MockIntegrationStore } from '@/lib/integrations/mock-store';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { integration: string } }
) {
  try {
    const { integration: integrationType } = params;

    // Validate integration type
    if (!isValidIntegrationType(integrationType)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid integration type: ${integrationType}`,
        } as DisconnectIntegrationResponse,
        { status: 400 }
      );
    }

    const config = getIntegrationConfig(integrationType);
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          message: 'Integration configuration not found',
        } as DisconnectIntegrationResponse,
        { status: 404 }
      );
    }

    // Check if integration exists
    const integration = MockIntegrationStore.getIntegration('mock-user', integrationType);
    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          message: `${config.name} is not connected`,
        } as DisconnectIntegrationResponse,
        { status: 404 }
      );
    }

    // Delete the integration
    const deleted = MockIntegrationStore.deleteIntegrationByType('mock-user', integrationType);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to disconnect ${config.name}`,
        } as DisconnectIntegrationResponse,
        { status: 500 }
      );
    }

    // In production, you would also:
    // 1. Revoke OAuth tokens if applicable
    // 2. Clean up any stored credentials
    // 3. Remove any cached data
    // 4. Log the disconnection event

    return NextResponse.json(
      {
        success: true,
        message: `Successfully disconnected ${config.name}`,
      } as DisconnectIntegrationResponse,
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Integration disconnect error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        message: `Failed to disconnect integration: ${message}`,
      } as DisconnectIntegrationResponse,
      { status: 500 }
    );
  }
}
