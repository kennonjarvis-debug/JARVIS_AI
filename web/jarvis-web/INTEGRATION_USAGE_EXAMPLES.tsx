/**
 * Integration API Usage Examples
 *
 * This file contains example code showing how to use the Integration API
 * from React components. Copy these patterns into your actual components.
 */

'use client';

import { useState, useEffect } from 'react';
import { IntegrationClient } from '@/lib/integrations/client';
import { Integration, IntegrationType } from '@/lib/types/integrations';

// ============================================================================
// Example 1: List All Integrations
// ============================================================================

export function IntegrationsListExample() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadIntegrations() {
      try {
        const response = await IntegrationClient.listIntegrations();
        setIntegrations(response.integrations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load integrations');
      } finally {
        setLoading(false);
      }
    }

    loadIntegrations();
  }, []);

  if (loading) return <div>Loading integrations...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Your Integrations ({integrations.length})</h2>
      {integrations.map((integration) => (
        <div key={integration.id}>
          <h3>{integration.name}</h3>
          <p>Status: {integration.status}</p>
          <p>Connected: {new Date(integration.connectedAt!).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 2: Connect Integration with OAuth
// ============================================================================

export function ConnectGmailExample() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const response = await IntegrationClient.connectIntegration('gmail', {
        redirectUri: `${window.location.origin}/oauth/callback`,
        state: generateRandomState(),
      });

      if (response.success && response.authUrl) {
        // Redirect to OAuth URL
        window.location.href = response.authUrl;
      } else if (response.success) {
        alert('Gmail connected successfully!');
        // Refresh the page or update state
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={connecting}>
        {connecting ? 'Connecting...' : 'Connect Gmail'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

// ============================================================================
// Example 3: Connect Integration with API Key
// ============================================================================

export function ConnectDawgAIExample() {
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const response = await IntegrationClient.connectIntegration('dawg-ai', {
        apiKey: apiKey.trim(),
      });

      if (response.success) {
        alert('Dawg AI connected successfully!');
        setApiKey('');
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <form onSubmit={handleConnect}>
      <label>
        Dawg AI API Key:
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key"
        />
      </label>
      <button type="submit" disabled={connecting}>
        {connecting ? 'Connecting...' : 'Connect Dawg AI'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}

// ============================================================================
// Example 4: Check Integration Status
// ============================================================================

export function IntegrationStatusExample({ type }: { type: IntegrationType }) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await IntegrationClient.getIntegrationStatus(type);
        setStatus(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Not connected');
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [type]);

  if (loading) return <div>Checking status...</div>;
  if (error) return <div>Not connected</div>;

  return (
    <div>
      <h3>{status.integration.name} Status</h3>
      <p>Status: {status.integration.status}</p>
      <p>Last synced: {new Date(status.integration.lastSyncedAt).toLocaleString()}</p>

      {status.details?.accountInfo && (
        <div>
          <h4>Account Info</h4>
          <pre>{JSON.stringify(status.details.accountInfo, null, 2)}</pre>
        </div>
      )}

      {status.details?.quotaUsage && (
        <div>
          <h4>Quota Usage</h4>
          <p>{status.details.quotaUsage.used} / {status.details.quotaUsage.limit}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 5: Disconnect Integration
// ============================================================================

export function DisconnectIntegrationExample({
  type,
  name
}: {
  type: IntegrationType;
  name: string;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) {
      return;
    }

    setDisconnecting(true);
    setError(null);

    try {
      const response = await IntegrationClient.disconnectIntegration(type);
      if (response.success) {
        alert(response.message);
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleDisconnect}
        disabled={disconnecting}
        style={{ color: 'red' }}
      >
        {disconnecting ? 'Disconnecting...' : `Disconnect ${name}`}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

// ============================================================================
// Example 6: Complete Integration Management Component
// ============================================================================

export function IntegrationManagementExample() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIntegrations = async () => {
    try {
      const response = await IntegrationClient.listIntegrations();
      setIntegrations(response.integrations);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleConnect = async (type: IntegrationType) => {
    try {
      const response = await IntegrationClient.connectIntegration(type);
      if (response.success) {
        if (response.authUrl) {
          window.location.href = response.authUrl;
        } else {
          await loadIntegrations();
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to connect');
    }
  };

  const handleDisconnect = async (type: IntegrationType) => {
    try {
      await IntegrationClient.disconnectIntegration(type);
      await loadIntegrations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const isConnected = (type: IntegrationType) => {
    return integrations.some((i) => i.type === type && i.status === 'connected');
  };

  if (loading) return <div>Loading...</div>;

  const availableIntegrations: IntegrationType[] = [
    'gmail',
    'salesforce',
    'hubspot',
    'twitter',
    'dawg-ai',
    'imessage',
    'sms',
    'analytics',
  ];

  return (
    <div>
      <h2>Integration Management</h2>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {availableIntegrations.map((type) => {
          const connected = isConnected(type);
          const integration = integrations.find((i) => i.type === type);

          return (
            <div key={type} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
              <h3>{integration?.name || type}</h3>
              <p>Status: {connected ? '✓ Connected' : '○ Not connected'}</p>

              {connected && integration ? (
                <>
                  <p>Connected: {new Date(integration.connectedAt!).toLocaleDateString()}</p>
                  <button onClick={() => handleDisconnect(type)}>
                    Disconnect
                  </button>
                </>
              ) : (
                <button onClick={() => handleConnect(type)}>
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// ============================================================================
// Usage in a Page Component
// ============================================================================

export default function IntegrationsPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Observatory Integrations</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>All Integrations</h2>
        <IntegrationsListExample />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Connect Gmail</h2>
        <ConnectGmailExample />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Connect Dawg AI</h2>
        <ConnectDawgAIExample />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Gmail Status</h2>
        <IntegrationStatusExample type="gmail" />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Complete Management</h2>
        <IntegrationManagementExample />
      </section>
    </div>
  );
}
