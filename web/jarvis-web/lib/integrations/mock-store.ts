/**
 * Mock Integration Store
 * In production, this would be replaced with database queries
 */

import { Integration, IntegrationType, IntegrationStatus } from '@/lib/types/integrations';
import { INTEGRATION_CONFIGS } from './config';

// Mock in-memory store (in production, use database)
const mockIntegrations = new Map<string, Integration>();

export class MockIntegrationStore {
  static getUserIntegrations(userId: string = 'mock-user'): Integration[] {
    return Array.from(mockIntegrations.values()).filter(
      (integration) => integration.metadata?.userId === userId
    );
  }

  static getIntegration(
    userId: string = 'mock-user',
    integrationType: IntegrationType
  ): Integration | undefined {
    return this.getUserIntegrations(userId).find((i) => i.type === integrationType);
  }

  static createIntegration(
    integrationType: IntegrationType,
    userId: string = 'mock-user'
  ): Integration {
    const config = INTEGRATION_CONFIGS[integrationType];
    const integration: Integration = {
      id: `${integrationType}-${Date.now()}`,
      type: integrationType,
      name: config.name,
      status: 'connected' as IntegrationStatus,
      authMethod: config.authMethod,
      connectedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      metadata: {
        userId,
        mockData: true,
      },
    };

    mockIntegrations.set(integration.id, integration);
    return integration;
  }

  static updateIntegrationStatus(
    integrationId: string,
    status: IntegrationStatus
  ): Integration | undefined {
    const integration = mockIntegrations.get(integrationId);
    if (integration) {
      integration.status = status;
      integration.lastSyncedAt = new Date().toISOString();
      mockIntegrations.set(integrationId, integration);
    }
    return integration;
  }

  static deleteIntegration(integrationId: string): boolean {
    return mockIntegrations.delete(integrationId);
  }

  static deleteIntegrationByType(
    userId: string = 'mock-user',
    integrationType: IntegrationType
  ): boolean {
    const integration = this.getIntegration(userId, integrationType);
    if (integration) {
      return this.deleteIntegration(integration.id);
    }
    return false;
  }

  static clearAll(): void {
    mockIntegrations.clear();
  }
}
