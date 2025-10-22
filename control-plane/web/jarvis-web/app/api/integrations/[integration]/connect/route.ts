/**
 * Integration Connect API Route
 * POST /api/integrations/[integration]/connect
 *
 * Handles OAuth or API key connections for various integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ConnectIntegrationRequest,
  ConnectIntegrationResponse,
  IntegrationType
} from '@/lib/types/integrations';
import { getIntegrationConfig, isValidIntegrationType } from '@/lib/integrations/config';
import { MockIntegrationStore } from '@/lib/integrations/mock-store';

export async function POST(
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
          error: `Invalid integration type: ${integrationType}`,
          message: 'The specified integration is not supported',
        } as ConnectIntegrationResponse,
        { status: 400 }
      );
    }

    const config = getIntegrationConfig(integrationType);
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Integration configuration not found',
        } as ConnectIntegrationResponse,
        { status: 404 }
      );
    }

    // Parse request body
    let body: ConnectIntegrationRequest = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional for some integrations
    }

    // Check if integration already exists
    const existingIntegration = MockIntegrationStore.getIntegration('mock-user', integrationType);
    if (existingIntegration) {
      return NextResponse.json(
        {
          success: false,
          error: 'Integration already connected',
          message: `${config.name} is already connected. Please disconnect first to reconnect.`,
          integration: existingIntegration,
        } as ConnectIntegrationResponse,
        { status: 409 }
      );
    }

    // Handle OAuth integrations
    if (config.requiresOAuth) {
      const redirectUri = body.redirectUri || `${request.nextUrl.origin}/api/integrations/${integrationType}/callback`;
      const state = body.state || generateRandomState();
      const scopes = body.scopes || config.scopes || [];

      // In production, this would generate a real OAuth URL
      // For now, we'll create a mock auth URL
      const authUrl = buildOAuthUrl(config, redirectUri, state, scopes);

      // In a real implementation, you would:
      // 1. Store the state in a temporary store (Redis/DB) with expiration
      // 2. Return the OAuth URL for the client to redirect to
      // 3. Handle the callback in a separate endpoint

      // For mock purposes, we'll just create the integration
      const integration = MockIntegrationStore.createIntegration(integrationType, 'mock-user');

      return NextResponse.json(
        {
          success: true,
          integration,
          authUrl,
          message: `OAuth flow initiated for ${config.name}. In production, redirect user to authUrl.`,
        } as ConnectIntegrationResponse,
        { status: 200 }
      );
    }

    // Handle API Key integrations
    if (config.authMethod === 'api_key') {
      if (!body.apiKey && !body.credentials) {
        return NextResponse.json(
          {
            success: false,
            error: 'API key required',
            message: `Please provide an API key or credentials for ${config.name}`,
          } as ConnectIntegrationResponse,
          { status: 400 }
        );
      }

      // In production, validate and store the API key securely
      const integration = MockIntegrationStore.createIntegration(integrationType, 'mock-user');

      return NextResponse.json(
        {
          success: true,
          integration,
          message: `Successfully connected to ${config.name}`,
        } as ConnectIntegrationResponse,
        { status: 200 }
      );
    }

    // Handle System integrations (e.g., iMessage)
    if (config.authMethod === 'system') {
      // System integrations might require system-level permissions
      const integration = MockIntegrationStore.createIntegration(integrationType, 'mock-user');

      return NextResponse.json(
        {
          success: true,
          integration,
          message: `Successfully connected to ${config.name}`,
        } as ConnectIntegrationResponse,
        { status: 200 }
      );
    }

    // Fallback for other auth methods
    const integration = MockIntegrationStore.createIntegration(integrationType, 'mock-user');

    return NextResponse.json(
      {
        success: true,
        integration,
        message: `Successfully connected to ${config.name}`,
      } as ConnectIntegrationResponse,
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Integration connect error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect integration',
        message,
      } as ConnectIntegrationResponse,
      { status: 500 }
    );
  }
}

// Helper functions

function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

function buildOAuthUrl(
  config: { oauthUrl?: string; name: string },
  redirectUri: string,
  state: string,
  scopes: string[]
): string {
  if (!config.oauthUrl) {
    return `https://example.com/oauth?state=${state}`;
  }

  const params = new URLSearchParams({
    client_id: process.env[`${config.name.toUpperCase().replace(/\s+/g, '_')}_CLIENT_ID`] || 'mock_client_id',
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: scopes.join(' '),
  });

  return `${config.oauthUrl}?${params.toString()}`;
}
