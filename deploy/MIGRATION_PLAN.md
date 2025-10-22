# JARVIS v0 → jarvis-deploy Migration Plan

**Goal**: Port complete integration system from Jarvis-v0 to jarvis-deploy to enable autonomous business operations

**Timeline**: 6-8 weeks (phased approach)

---

## Executive Summary

### What We Have (Jarvis-v0)

✅ **20+ Working Integrations** including:
- Social Media: Twitter (multi-account), LinkedIn, Instagram, Facebook
- Communication: Gmail, iMessage, Twilio
- CRM: HubSpot, Salesforce
- Automation: Buffer, n8n
- AI: Anthropic Claude, ElevenLabs
- Infrastructure: Supabase, Google Calendar

✅ **Multi-Agent Architecture**:
- Orchestrator (task routing)
- Decision Engine (risk assessment)
- Approval Queue (human oversight)
- Memory System (context retention)
- Marketing Agent
- Sales Agent
- Support Agent
- Operations Agent

✅ **Complete Type System** with Zod schemas

### What We Need (jarvis-deploy)

❌ Backend API (currently frontend-only)
❌ Integration manager
❌ OAuth connector framework
❌ Database schema for integrations
❌ Real-time activity feed
❌ Dashboard redesign with real connections

---

## Phase 1: Backend Foundation (Week 1-2)

### 1.1 Choose Backend Architecture

**Option A: Monorepo with separate backend** (RECOMMENDED)
```
jarvis-deploy/
├── packages/
│   ├── frontend/     # Existing React app
│   ├── backend/      # New Express/Node API
│   └── shared/       # Shared types from Jarvis-v0
```

**Option B: Next.js App Router** (Alternative)
```
jarvis-deploy/
├── app/              # Next.js 14+ App Router
│   ├── api/          # API routes
│   ├── (auth)/       # Auth pages
│   └── dashboard/    # Dashboard pages
├── lib/
│   └── integrations/ # Ported from Jarvis-v0
```

**Recommendation**: Option A for better separation and ability to scale backend independently.

### 1.2 Set Up Backend Structure

```bash
# Create backend package
mkdir -p packages/backend/src
mkdir -p packages/shared/src

# Initialize
cd packages/backend
npm init -y
npm install express cors dotenv
npm install -D typescript @types/node @types/express ts-node-dev

# Initialize shared package
cd ../shared
npm init -y
npm install zod
```

### 1.3 Port Core Types

**Copy from Jarvis-v0**:
- `src/types/integrations.ts` → `packages/shared/src/integrations.ts`
- `src/types/index.ts` → `packages/shared/src/index.ts`
- `src/utils/errors.ts` → `packages/shared/src/errors.ts`
- `src/utils/logger.ts` → `packages/shared/src/logger.ts`

### 1.4 Create Database Schema

**Supabase SQL Migration**:
```sql
-- Integrations table
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'twitter', 'gmail', 'hubspot', etc.
  account_name TEXT, -- Display name
  account_id TEXT, -- External account ID
  credentials JSONB NOT NULL, -- Encrypted OAuth tokens
  config JSONB DEFAULT '{}', -- Platform-specific config
  status TEXT DEFAULT 'connected', -- 'connected', 'disconnected', 'error'
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- 'post', 'email', 'crm_update', etc.
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'synced'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'success', -- 'success', 'failed', 'pending'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation rules
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'schedule', 'webhook', 'event'
  trigger_config JSONB NOT NULL,
  actions JSONB NOT NULL, -- Array of actions to take
  conditions JSONB DEFAULT '{}',
  risk_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
  requires_approval BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval queue
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observatory_id UUID REFERENCES observatories(id) ON DELETE CASCADE,
  automation_rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL, -- 'automation', 'manual_action'
  action_data JSONB NOT NULL,
  risk_level TEXT NOT NULL,
  confidence_score FLOAT,
  reasoning TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id),
  response_note TEXT
);

-- Create indexes
CREATE INDEX idx_integrations_observatory ON integrations(observatory_id);
CREATE INDEX idx_integrations_platform ON integrations(platform);
CREATE INDEX idx_activity_logs_observatory ON activity_logs(observatory_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_automation_rules_observatory ON automation_rules(observatory_id);
CREATE INDEX idx_approval_requests_observatory ON approval_requests(observatory_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
```

---

## Phase 2: Core Integration Framework (Week 2-3)

### 2.1 Create Base Integration Class

**File**: `packages/backend/src/integrations/base/Integration.ts`

```typescript
import { Logger } from '@jarvis/shared';

export interface IntegrationConfig {
  credentials: Record<string, any>;
  config?: Record<string, any>;
}

export abstract class BaseIntegration {
  protected logger: Logger;
  protected credentials: Record<string, any>;
  protected config: Record<string, any>;

  constructor(config: IntegrationConfig) {
    this.credentials = config.credentials;
    this.config = config.config || {};
    this.logger = new Logger(this.constructor.name);
  }

  abstract get name(): string;
  abstract testConnection(): Promise<boolean>;
  abstract disconnect(): Promise<void>;

  // Optional methods
  async sync?(): Promise<void>;
  async getHealth?(): Promise<{ status: string; message?: string }>;
}
```

### 2.2 Create OAuth Connector Framework

**File**: `packages/backend/src/integrations/base/OAuthConnector.ts`

```typescript
import { OAuth2Client } from 'google-auth-library';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export abstract class OAuthConnector extends BaseIntegration {
  protected oauth2Client: OAuth2Client;

  constructor(config: IntegrationConfig & { oauthConfig: OAuthConfig }) {
    super(config);
    this.oauth2Client = new OAuth2Client(
      config.oauthConfig.clientId,
      config.oauthConfig.clientSecret,
      config.oauthConfig.redirectUri
    );
  }

  async getAuthUrl(): Promise<string> {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.getScopes(),
    });
  }

  async handleCallback(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  abstract getScopes(): string[];
}
```

### 2.3 Create Integration Manager

**File**: `packages/backend/src/services/IntegrationManager.ts`

```typescript
import { BaseIntegration } from '../integrations/base/Integration';
import { TwitterIntegration } from '../integrations/twitter';
import { GmailIntegration } from '../integrations/gmail';
// ... other integrations

export class IntegrationManager {
  private integrations: Map<string, BaseIntegration> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('IntegrationManager');
  }

  async loadIntegration(
    platform: string,
    config: IntegrationConfig
  ): Promise<BaseIntegration> {
    const Integration = this.getIntegrationClass(platform);
    const integration = new Integration(config);

    // Test connection
    const connected = await integration.testConnection();
    if (!connected) {
      throw new Error(`Failed to connect to ${platform}`);
    }

    this.integrations.set(`${platform}-${config.accountId}`, integration);
    return integration;
  }

  getIntegration(platform: string, accountId?: string): BaseIntegration | null {
    const key = accountId ? `${platform}-${accountId}` : platform;
    return this.integrations.get(key) || null;
  }

  private getIntegrationClass(platform: string): typeof BaseIntegration {
    const integrations: Record<string, typeof BaseIntegration> = {
      twitter: TwitterIntegration,
      gmail: GmailIntegration,
      // ... add all integrations
    };

    return integrations[platform] || null;
  }
}
```

---

## Phase 3: Priority Integrations (Week 3-4)

### 3.1 Port Twitter Integration (HIGH PRIORITY)

**Source**: `Jarvis-v0/src/integrations/twitter/index.ts`
**Destination**: `packages/backend/src/integrations/twitter/index.ts`

**Changes needed**:
1. Extend `OAuthConnector` base class
2. Add database storage for credentials
3. Add error handling and retry logic
4. Add activity logging

**API Endpoints**:
```typescript
POST   /api/integrations/twitter/connect       // Start OAuth flow
GET    /api/integrations/twitter/callback      // Handle OAuth callback
POST   /api/integrations/twitter/tweet         // Post tweet
GET    /api/integrations/twitter/mentions      // Get mentions
DELETE /api/integrations/twitter/disconnect    // Remove connection
```

### 3.2 Port Gmail Integration (HIGH PRIORITY)

**Source**: `Jarvis-v0/src/integrations/gmail/index.ts`
**Destination**: `packages/backend/src/integrations/gmail/index.ts`

**Changes needed**:
1. Use shared OAuth2Client setup
2. Add webhook support for real-time email notifications
3. Add email filtering and categorization
4. Implement auto-response templates

**API Endpoints**:
```typescript
POST   /api/integrations/gmail/connect         // Start OAuth flow
GET    /api/integrations/gmail/callback        // Handle OAuth callback
GET    /api/integrations/gmail/emails          // Get emails
POST   /api/integrations/gmail/send            // Send email
POST   /api/integrations/gmail/reply           // Reply to email
DELETE /api/integrations/gmail/disconnect      // Remove connection
```

### 3.3 Port iMessage Integration (HIGH PRIORITY)

**Source**: `Jarvis-v0/src/integrations/imessage/`
**Destination**: `packages/backend/src/integrations/imessage/`

**Special considerations**:
- Requires macOS environment
- Direct database access to `~/Library/Messages/chat.db`
- Privacy-focused with redaction
- AppleScript for sending

**Changes needed**:
1. Add permission checks for Full Disk Access
2. Implement polling mechanism for new messages
3. Add routing logic for auto-responses
4. Integrate with approval queue for sensitive messages

**API Endpoints**:
```typescript
GET    /api/integrations/imessage/status       // Check if available (macOS only)
GET    /api/integrations/imessage/messages     // Get recent messages
POST   /api/integrations/imessage/send         // Send message
POST   /api/integrations/imessage/reply        // Reply to message
```

### 3.4 Port CRM Integrations (MEDIUM PRIORITY)

#### HubSpot
**Source**: `Jarvis-v0/src/integrations/hubspot.ts`
**Destination**: `packages/backend/src/integrations/hubspot/index.ts`

**API Endpoints**:
```typescript
POST   /api/integrations/hubspot/connect
GET    /api/integrations/hubspot/contacts
POST   /api/integrations/hubspot/contacts
PATCH  /api/integrations/hubspot/contacts/:id
GET    /api/integrations/hubspot/deals
POST   /api/integrations/hubspot/deals
```

#### Salesforce
**Source**: `Jarvis-v0/src/integrations/salesforce.ts`
**Destination**: `packages/backend/src/integrations/salesforce/index.ts`

**API Endpoints**:
```typescript
POST   /api/integrations/salesforce/connect
GET    /api/integrations/salesforce/leads
POST   /api/integrations/salesforce/leads
GET    /api/integrations/salesforce/opportunities
POST   /api/integrations/salesforce/opportunities
```

---

## Phase 4: Dashboard Redesign (Week 4-5)

### 4.1 New Dashboard Architecture

**Component Structure**:
```
src/pages/DashboardPage.tsx
├── IntegrationMarketplace.tsx       # Browse all available integrations
├── ConnectedIntegrations.tsx        # Show connected integrations
│   ├── IntegrationCard.tsx          # Individual integration card
│   └── ConnectionStatus.tsx         # Real-time connection status
├── ActivityFeed.tsx                 # Real-time activity stream
│   ├── ActivityItem.tsx             # Individual activity
│   └── ActivityFilters.tsx          # Filter by platform/type
├── ApprovalQueue.tsx                # Pending approvals
│   └── ApprovalCard.tsx             # Individual approval request
├── AutomationRules.tsx              # Active automation rules
│   ├── RuleCard.tsx                 # Individual rule
│   └── RuleBuilder.tsx              # Create/edit rules
└── Analytics.tsx                    # Business metrics dashboard
```

### 4.2 Integration Marketplace Component

**File**: `src/components/dashboard/IntegrationMarketplace.tsx`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Integration {
  platform: string;
  name: string;
  description: string;
  category: 'social' | 'crm' | 'email' | 'communication' | 'automation';
  icon: string;
  isConnected: boolean;
  requiredScopes?: string[];
}

const AVAILABLE_INTEGRATIONS: Integration[] = [
  // Social Media
  { platform: 'twitter', name: 'Twitter/X', description: 'Post tweets, monitor mentions, engage with followers', category: 'social', icon: '𝕏', isConnected: false },
  { platform: 'linkedin', name: 'LinkedIn', description: 'Share posts, manage connections, monitor company page', category: 'social', icon: '💼', isConnected: false },
  { platform: 'instagram', name: 'Instagram', description: 'Post photos/videos, manage comments, track engagement', category: 'social', icon: '📷', isConnected: false },
  { platform: 'facebook', name: 'Facebook', description: 'Manage pages, post updates, respond to comments', category: 'social', icon: '📘', isConnected: false },

  // CRM
  { platform: 'hubspot', name: 'HubSpot', description: 'Sync contacts, manage deals, track interactions', category: 'crm', icon: '🔶', isConnected: false },
  { platform: 'salesforce', name: 'Salesforce', description: 'Manage leads, opportunities, and customer data', category: 'crm', icon: '☁️', isConnected: false },

  // Email & Communication
  { platform: 'gmail', name: 'Gmail', description: 'Send/receive emails, auto-respond, organize inbox', category: 'email', icon: '📧', isConnected: false },
  { platform: 'imessage', name: 'iMessage', description: 'Monitor and respond to iMessages (macOS only)', category: 'communication', icon: '💬', isConnected: false },
  { platform: 'twilio', name: 'Twilio', description: 'Send SMS, manage phone calls, handle notifications', category: 'communication', icon: '📱', isConnected: false },

  // Automation
  { platform: 'buffer', name: 'Buffer', description: 'Schedule social posts, manage content calendar', category: 'automation', icon: '📅', isConnected: false },
  { platform: 'n8n', name: 'n8n', description: 'Create custom workflows and automation sequences', category: 'automation', icon: '🔗', isConnected: false },
];

export default function IntegrationMarketplace() {
  const [integrations, setIntegrations] = useState<Integration[]>(AVAILABLE_INTEGRATIONS);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnectedIntegrations();
  }, []);

  const loadConnectedIntegrations = async () => {
    try {
      const { data: connected } = await supabase
        .from('integrations')
        .select('platform, status');

      if (connected) {
        setIntegrations(prev => prev.map(int => ({
          ...int,
          isConnected: connected.some(c => c.platform === int.platform && c.status === 'connected')
        })));
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    window.location.href = `/api/integrations/${platform}/connect`;
  };

  const filteredIntegrations = filter === 'all'
    ? integrations
    : integrations.filter(int => int.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Integration Marketplace</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Categories</option>
          <option value="social">Social Media</option>
          <option value="crm">CRM</option>
          <option value="email">Email</option>
          <option value="communication">Communication</option>
          <option value="automation">Automation</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => (
          <div
            key={integration.platform}
            className="border rounded-lg p-6 hover:shadow-lg transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{integration.icon}</div>
              {integration.isConnected && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Connected
                </span>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-2">{integration.name}</h3>
            <p className="text-gray-600 text-sm mb-4">{integration.description}</p>

            {integration.isConnected ? (
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Manage
              </button>
            ) : (
              <button
                onClick={() => handleConnect(integration.platform)}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Connect
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4.3 Real-Time Activity Feed

**File**: `src/components/dashboard/ActivityFeed.tsx`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  activity_type: string;
  action: string;
  title: string;
  description: string;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
  integration: {
    platform: string;
    account_name: string;
  };
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('activity_logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs'
      }, (payload) => {
        setActivities(prev => [payload.new as Activity, ...prev]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadActivities = async () => {
    try {
      const { data } = await supabase
        .from('activity_logs')
        .select(`
          *,
          integration:integrations(platform, account_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      post: '📝',
      email: '📧',
      crm_update: '👤',
      message: '💬',
      sync: '🔄',
      automation: '⚙️',
    };
    return icons[type] || '📌';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Recent Activity</h2>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
            <div className="text-2xl">{getActivityIcon(activity.activity_type)}</div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{activity.title}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activity.status === 'success' ? 'bg-green-100 text-green-800' :
                  activity.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {activity.status}
                </span>
              </div>

              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>

              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>{activity.integration?.platform}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Phase 5: Automation & Decision Engine (Week 5-6)

### 5.1 Port Orchestrator

**Source**: `Jarvis-v0/src/core/orchestrator.ts`
**Destination**: `packages/backend/src/core/Orchestrator.ts`

Key responsibilities:
- Route tasks to appropriate agents
- Manage task queue
- Handle errors and retries
- Coordinate between agents

### 5.2 Port Decision Engine

**Source**: `Jarvis-v0/src/core/decision-engine.ts`
**Destination**: `packages/backend/src/core/DecisionEngine.ts`

Key features:
- Risk classification (low/medium/high)
- Confidence scoring
- Approval queue management
- Learning from human feedback

### 5.3 Port Agent System

**Sources**: `Jarvis-v0/src/agents/`
**Destination**: `packages/backend/src/agents/`

Agents to port:
- MarketingAgent
- SalesAgent
- SupportAgent
- OperationsAgent

---

## Phase 6: Environment Parity (Week 6-7)

### 6.1 Environment Configuration

**Create**: `packages/backend/.env.development`
```bash
# Development
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Supabase (same for dev/prod)
SUPABASE_URL=https://nvyebkzrrvmepbdejspr.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Twitter (use test account for dev)
TWITTER_API_KEY=dev_key
TWITTER_API_SECRET=dev_secret
TWITTER_ACCESS_TOKEN=dev_token
TWITTER_ACCESS_TOKEN_SECRET=dev_token_secret

# Gmail (use test account for dev)
GOOGLE_CLIENT_ID=dev_client_id
GOOGLE_CLIENT_SECRET=dev_client_secret

# ... other integrations
```

**Create**: `packages/backend/.env.production`
```bash
# Production
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://jarvis-ai.co

# Supabase (same credentials)
SUPABASE_URL=https://nvyebkzrrvmepbdejspr.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Twitter (production accounts)
TWITTER_API_KEY=prod_key
# ... production credentials
```

### 6.2 Docker Setup for Consistency

**Create**: `docker-compose.yml`
```yaml
version: '3.8'

services:
  backend:
    build: ./packages/backend
    ports:
      - "3001:3001"
    env_file:
      - ./packages/backend/.env.${NODE_ENV:-development}
    volumes:
      - ./packages/backend/src:/app/src
      - ./packages/shared:/app/shared
    depends_on:
      - redis

  frontend:
    build: ./packages/frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    volumes:
      - ./packages/frontend/src:/app/src

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Optional: Local Supabase for development
  supabase-local:
    profiles: ["local"]
    image: supabase/postgres:latest
    environment:
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
```

### 6.3 Deployment Scripts

**Create**: `scripts/deploy-production.sh`
```bash
#!/bin/bash
set -e

echo "🚀 Deploying JARVIS to production..."

# Build backend
cd packages/backend
npm run build
cd ../..

# Build frontend
cd packages/frontend
npm run build
cd ../..

# Deploy backend (Railway/Fly.io/etc)
# Deploy frontend (Netlify)
netlify deploy --prod --dir=packages/frontend/dist

echo "✅ Deployment complete!"
```

---

## Phase 7: Testing & Launch (Week 7-8)

### 7.1 Integration Tests

Create tests for each integration:
```typescript
// packages/backend/tests/integrations/twitter.test.ts
describe('TwitterIntegration', () => {
  it('should connect with valid credentials', async () => {
    const twitter = new TwitterIntegration(testConfig);
    const connected = await twitter.testConnection();
    expect(connected).toBe(true);
  });

  it('should post tweet', async () => {
    const result = await twitter.postTweet({
      text: 'Test tweet from JARVIS',
      account: 'jarvis'
    });
    expect(result.tweetId).toBeDefined();
  });
});
```

### 7.2 End-to-End Tests

Test complete workflows:
```typescript
// packages/backend/tests/e2e/automation.test.ts
describe('Automation Workflows', () => {
  it('should schedule tweet and post automatically', async () => {
    // Create automation rule
    const rule = await createAutomationRule({
      name: 'Daily tweet',
      trigger: { type: 'schedule', cron: '0 9 * * *' },
      actions: [{ type: 'twitter.post', data: { text: 'Good morning!' } }]
    });

    // Trigger manually
    await triggerAutomation(rule.id);

    // Verify tweet was posted
    const activity = await getLatestActivity();
    expect(activity.activity_type).toBe('post');
    expect(activity.status).toBe('success');
  });
});
```

### 7.3 Launch Checklist

- [ ] All Phase 1-6 migrations complete
- [ ] Database schema deployed to production
- [ ] All integrations tested with real accounts
- [ ] OAuth flows working for all platforms
- [ ] Dashboard shows real-time data
- [ ] Activity feed updating in real-time
- [ ] Approval queue functioning
- [ ] Environment variables set in production
- [ ] Error monitoring configured (Sentry/LogRocket)
- [ ] Rate limiting implemented
- [ ] API documentation complete
- [ ] User onboarding flow tested
- [ ] Backup and recovery procedures tested

---

## Priority Order Summary

### Must-Have for MVP (Weeks 1-4)

1. ✅ Backend foundation
2. ✅ Database schema
3. ✅ Twitter integration
4. ✅ Gmail integration
5. ✅ Dashboard redesign with marketplace
6. ✅ Real-time activity feed
7. ✅ OAuth connection flows

### Nice-to-Have (Weeks 5-6)

8. iMessage integration (macOS only)
9. HubSpot CRM
10. LinkedIn integration
11. Automation rules UI
12. Approval queue UI

### Future Enhancements (Week 7+)

13. Instagram/Facebook integrations
14. Salesforce CRM
15. Advanced analytics dashboard
16. Custom automation builder (no-code)
17. Mobile app for approvals
18. Voice interface
19. Multi-tenant support

---

## Next Steps

### Immediate Actions (Today)

1. **Choose backend architecture** (Option A or B)
2. **Set up monorepo structure**
3. **Create database migration** in Supabase
4. **Port shared types** from Jarvis-v0
5. **Set up backend Express server**

### This Week

1. Port Twitter integration
2. Port Gmail integration
3. Create integration marketplace UI
4. Test OAuth flows

### Questions for User

1. **Backend preference**: Monorepo (Express) vs Next.js API routes?
2. **Deployment targets**: Railway? Fly.io? Vercel? Stay on Netlify for frontend?
3. **iMessage priority**: Since it requires macOS, should we deploy backend on your Mac or skip for now?
4. **Test accounts**: Do you have test/sandbox accounts for each platform for development?

---

## Monitoring Success

### Metrics to Track

- **Integration Health**: % of integrations connected and healthy
- **Automation Success Rate**: % of automated actions that succeed
- **Response Time**: Time from trigger to action completion
- **Approval Queue**: Number of pending approvals, average response time
- **User Engagement**: Daily active users, integrations per user
- **Cost**: Total API costs per month (target: <$50)

### Success Criteria

✅ **Week 4**: Twitter + Gmail working, dashboard redesigned
✅ **Week 6**: 5+ integrations working, automation rules deployed
✅ **Week 8**: Full system operational, first business onboarded

---

**Ready to begin migration! Let's start with Phase 1: Backend Foundation.**
