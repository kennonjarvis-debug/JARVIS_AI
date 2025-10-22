/**
 * Integration API Client
 * Client-side utilities for interacting with the Integration API
 */

import {
  Integration,
  IntegrationType,
  ConnectIntegrationRequest,
  ConnectIntegrationResponse,
  IntegrationStatusResponse,
  ListIntegrationsResponse,
  DisconnectIntegrationResponse,
} from '@/lib/types/integrations';

export class IntegrationClient {
  /**
   * List all integrations for the current user
   */
  static async listIntegrations(params?: {
    status?: string;
    type?: string;
  }): Promise<ListIntegrationsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);

    const url = `/api/integrations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to list integrations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Connect a new integration
   */
  static async connectIntegration(
    type: IntegrationType,
    request?: ConnectIntegrationRequest
  ): Promise<ConnectIntegrationResponse> {
    const response = await fetch(`/api/integrations/${type}/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request || {}),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to connect integration');
    }

    // If OAuth flow, redirect to authUrl
    if (data.authUrl && typeof window !== 'undefined') {
      // Store state for verification after callback
      if (request?.state) {
        sessionStorage.setItem('oauth_state', request.state);
      }
      // Optionally auto-redirect
      // window.location.href = data.authUrl;
    }

    return data;
  }

  /**
   * Get integration status
   */
  static async getIntegrationStatus(
    type: IntegrationType
  ): Promise<IntegrationStatusResponse> {
    const response = await fetch(`/api/integrations/${type}/status`);

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || data.message || 'Failed to get integration status');
    }

    return response.json();
  }

  /**
   * Disconnect an integration
   */
  static async disconnectIntegration(
    type: IntegrationType
  ): Promise<DisconnectIntegrationResponse> {
    const response = await fetch(`/api/integrations/${type}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to disconnect integration');
    }

    return data;
  }

  /**
   * Check if an integration is connected
   */
  static async isConnected(type: IntegrationType): Promise<boolean> {
    try {
      await this.getIntegrationStatus(type);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all connected integrations
   */
  static async getConnectedIntegrations(): Promise<Integration[]> {
    const response = await this.listIntegrations({ status: 'connected' });
    return response.integrations;
  }
}

/**
 * React Hook for integration management
 * Usage example:
 *
 * const { integrations, loading, connectIntegration, disconnectIntegration } = useIntegrations();
 */
export function createIntegrationHooks() {
  // This would be implemented with React hooks
  // Example structure for reference:
  return {
    useIntegrations: () => {
      // const [integrations, setIntegrations] = useState<Integration[]>([]);
      // const [loading, setLoading] = useState(true);
      // ... implementation
    },
    useIntegration: (type: IntegrationType) => {
      // const [integration, setIntegration] = useState<Integration | null>(null);
      // ... implementation
    },
  };
}
