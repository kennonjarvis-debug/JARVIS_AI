# DAWG AI Integration Documentation

Complete integration guide for DAWG AI music production platform with Jarvis AI.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [API Reference](#api-reference)
5. [OAuth Flow](#oauth-flow)
6. [Webhooks](#webhooks)
7. [Frontend Components](#frontend-components)
8. [Testing](#testing)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

## Overview

The DAWG AI integration enables Jarvis to connect with the DAWG AI music production platform, providing:

- **Project Management**: Create, update, and organize music projects
- **Workflow Automation**: Automate production workflows with custom steps
- **Analytics & Insights**: Track usage, performance, and project metrics
- **Real-time Sync**: Webhook-based synchronization of project data
- **Secure OAuth**: Industry-standard OAuth 2.0 authentication

## Architecture

### Backend Services

```
src/services/
├── dawg-ai.service.ts              # Core service (auth, API calls)
├── dawg-ai-projects.service.ts     # Project management
├── dawg-ai-workflows.service.ts    # Workflow automation
└── dawg-ai-analytics.service.ts    # Analytics and insights
```

### API Endpoints

```
src/api/dawg-ai/
├── index.ts          # Main router (connection, sync)
├── projects.ts       # Project CRUD operations
├── workflows.ts      # Workflow management
└── analytics.ts      # Analytics endpoints
```

### Frontend Components

```
web/jarvis-web/
├── app/observatory/dawg-ai/
│   ├── page.tsx                  # Dashboard
│   └── projects/page.tsx         # Projects view
└── components/
    ├── DawgAIProjectCard.tsx     # Project card component
    ├── DawgAIWorkflowBuilder.tsx # Visual workflow builder
    └── DawgAIAnalytics.tsx       # Analytics dashboard
```

### Database Schema

```sql
-- Connection credentials (encrypted)
DawgAIConnection

-- User projects
DawgAIProject

-- Workflows and automation
DawgAIWorkflow
DawgAIWorkflowExecution
DawgAIAutomation

-- Analytics tracking
DawgAIAnalytics
```

## Setup & Configuration

### 1. Environment Variables

Add to `.env`:

```bash
# DAWG AI API Configuration
DAWG_AI_CLIENT_ID=your_client_id
DAWG_AI_CLIENT_SECRET=your_client_secret
DAWG_AI_REDIRECT_URI=http://localhost:3000/api/integrations/dawg-ai/callback
DAWG_AI_API_URL=https://api.dawg-ai.com/v1
DAWG_AI_AUTH_URL=https://api.dawg-ai.com/oauth/authorize
DAWG_AI_TOKEN_URL=https://api.dawg-ai.com/oauth/token
DAWG_AI_WEBHOOK_SECRET=your_webhook_secret

# KMS for encryption (required)
AWS_REGION=us-east-1
KMS_KEY_ID=your_kms_key_id
```

### 2. Database Migration

Run the migration to create DAWG AI tables:

```bash
cd web/jarvis-web

# Using Prisma
npx prisma migrate dev --name add-dawg-ai

# Or using raw SQL
psql $DATABASE_URL < prisma/migrations/add-dawg-ai.sql
```

### 3. Register Webhook URL

Configure webhook URL in DAWG AI dashboard:

```
https://your-domain.com/api/webhooks/dawg-ai
```

### 4. Start Mock API (Optional)

For testing without a real DAWG AI account:

```bash
# In your Express app
import mockDawgAIApi from './src/mock/dawg-ai-api.js';
app.use('/mock/dawg-ai', mockDawgAIApi);
```

Update `.env` to use mock API:

```bash
DAWG_AI_API_URL=http://localhost:4000/mock/dawg-ai
```

## API Reference

### Connection Endpoints

#### GET `/api/dawg-ai/status`

Get connection status for authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "lastSync": "2025-10-17T12:00:00Z",
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "plan": "pro"
    }
  }
}
```

#### POST `/api/dawg-ai/connect`

Store OAuth credentials after authentication.

**Request Body:**
```json
{
  "accessToken": "token_...",
  "refreshToken": "token_...",
  "expiresIn": 3600,
  "scope": "projects:read projects:write"
}
```

#### POST `/api/dawg-ai/disconnect`

Disconnect DAWG AI account.

**Response:**
```json
{
  "success": true,
  "message": "DAWG AI disconnected successfully"
}
```

#### POST `/api/dawg-ai/sync`

Manually sync user data from DAWG AI.

**Response:**
```json
{
  "success": true,
  "message": "Data synced successfully"
}
```

### Project Endpoints

#### GET `/api/dawg-ai/projects`

List all projects for authenticated user.

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `completed`, `archived`)
- `search` (optional): Search by name or description
- `limit` (optional): Results per page (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_123",
      "name": "Summer Vibes EP",
      "description": "Chill summer tracks",
      "status": "active",
      "metadata": {
        "genre": "Electronic",
        "bpm": 120,
        "key": "C Major",
        "tags": ["chill", "summer", "electronic"]
      },
      "createdAt": "2025-10-01T10:00:00Z",
      "updatedAt": "2025-10-17T12:00:00Z"
    }
  ],
  "total": 42,
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

#### POST `/api/dawg-ai/projects`

Create new project.

**Request Body:**
```json
{
  "name": "My New Project",
  "description": "Project description",
  "genre": "Hip-Hop",
  "bpm": 90,
  "key": "F Minor",
  "tags": ["rap", "trap", "energetic"]
}
```

#### PATCH `/api/dawg-ai/projects/:id`

Update project.

**Request Body:**
```json
{
  "name": "Updated Name",
  "status": "completed"
}
```

#### DELETE `/api/dawg-ai/projects/:id`

Delete project.

#### POST `/api/dawg-ai/projects/:id/archive`

Archive project.

#### POST `/api/dawg-ai/projects/:id/duplicate`

Duplicate project.

**Request Body:**
```json
{
  "name": "Project Copy"
}
```

#### GET `/api/dawg-ai/projects/:id/export`

Export project data.

### Workflow Endpoints

#### GET `/api/dawg-ai/workflows`

List workflows.

**Query Parameters:**
- `projectId` (optional): Filter by project
- `status` (optional): Filter by status
- `limit`, `offset`: Pagination

#### POST `/api/dawg-ai/workflows`

Create workflow.

**Request Body:**
```json
{
  "name": "Auto Mixing Workflow",
  "description": "Automatically mix and master tracks",
  "projectId": "proj_123",
  "steps": [
    {
      "id": "1",
      "type": "audio",
      "action": "normalize_levels",
      "parameters": { "target": -14 }
    },
    {
      "id": "2",
      "type": "audio",
      "action": "apply_compression",
      "parameters": { "ratio": 4, "threshold": -20 }
    }
  ],
  "trigger": {
    "type": "manual"
  }
}
```

#### POST `/api/dawg-ai/workflows/:id/execute`

Execute workflow.

**Request Body:**
```json
{
  "context": {
    "projectId": "proj_123",
    "trackIds": ["track_1", "track_2"]
  }
}
```

#### GET `/api/dawg-ai/workflows/:id/executions`

List workflow executions.

#### GET `/api/dawg-ai/workflows/templates`

Get workflow templates.

### Analytics Endpoints

#### GET `/api/dawg-ai/analytics`

Get analytics data.

**Query Parameters:**
- `start`: Start date (ISO 8601)
- `end`: End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": {
      "start": "2025-09-17T00:00:00Z",
      "end": "2025-10-17T23:59:59Z"
    },
    "metrics": {
      "projectsCreated": 12,
      "workflowsExecuted": 45,
      "apiCallsTotal": 523,
      "apiCallsSuccess": 518,
      "apiCallsFailed": 5,
      "averageResponseTime": 245
    },
    "trends": {
      "projectActivity": [
        { "date": "2025-10-01", "count": 2 },
        { "date": "2025-10-02", "count": 1 }
      ],
      "workflowActivity": [
        { "date": "2025-10-01", "count": 5 },
        { "date": "2025-10-02", "count": 3 }
      ]
    }
  }
}
```

#### GET `/api/dawg-ai/analytics/usage`

Get usage metrics.

**Query Parameters:**
- `period`: `day`, `week`, or `month`

#### GET `/api/dawg-ai/analytics/projects/:projectId`

Get project insights.

#### GET `/api/dawg-ai/analytics/health`

Get system health metrics.

## OAuth Flow

### 1. Initiate Authorization

User clicks "Connect DAWG AI" button:

```typescript
const oauthService = getDawgAIOAuthService();
const authUrl = oauthService.generateAuthorizationUrl(userId);
// Redirect user to authUrl
```

### 2. User Authorizes

User is redirected to DAWG AI authorization page where they grant permissions.

### 3. OAuth Callback

DAWG AI redirects back to callback URL with authorization code:

```
GET /api/integrations/dawg-ai/callback?code=xxx&state=yyy
```

### 4. Exchange Code for Tokens

Backend exchanges authorization code for access tokens:

```typescript
const tokens = await oauthService.exchangeCode(code);
await dawgAIService.storeCredentials(userId, tokens);
```

### 5. Complete

User is redirected to DAWG AI dashboard, fully connected.

## Webhooks

### Webhook Events

DAWG AI sends webhook events for real-time updates:

| Event Type | Description |
|------------|-------------|
| `project.created` | New project created |
| `project.updated` | Project modified |
| `project.deleted` | Project deleted |
| `workflow.completed` | Workflow execution completed |
| `workflow.failed` | Workflow execution failed |
| `automation.triggered` | Automation rule triggered |

### Webhook Payload

```json
{
  "id": "evt_123",
  "type": "project.created",
  "timestamp": "2025-10-17T12:00:00Z",
  "userId": "user_123",
  "data": {
    "project": {
      "id": "proj_456",
      "name": "New Project",
      "status": "active"
    }
  }
}
```

### Webhook Security

Webhooks are secured with HMAC-SHA256 signatures:

```typescript
const signature = req.headers['x-dawg-ai-signature'];
const isValid = webhookService.verifySignature(payload, signature);
```

### Webhook Handler

```typescript
import { getDawgAIWebhookService, createWebhookHandler } from './src/webhooks/dawg-ai-webhook.js';

const webhookService = getDawgAIWebhookService();
app.post('/api/webhooks/dawg-ai', createWebhookHandler(webhookService));
```

## Frontend Components

### Dashboard

Main dashboard showing connection status and quick actions:

```typescript
import DawgAIDashboard from '@/app/observatory/dawg-ai/page';
```

### Projects View

Full project management interface:

```typescript
import DawgAIProjects from '@/app/observatory/dawg-ai/projects/page';
```

### Project Card

Reusable project card component:

```typescript
import DawgAIProjectCard from '@/components/DawgAIProjectCard';

<DawgAIProjectCard
  project={project}
  onUpdate={() => loadProjects()}
  onArchive={() => archiveProject(project.id)}
/>
```

### Workflow Builder

Visual workflow builder:

```typescript
import DawgAIWorkflowBuilder from '@/components/DawgAIWorkflowBuilder';

<DawgAIWorkflowBuilder
  initialSteps={workflow.config.steps}
  onSave={(steps) => saveWorkflow(steps)}
  onCancel={() => setShowBuilder(false)}
/>
```

### Analytics Dashboard

Analytics visualization:

```typescript
import DawgAIAnalytics from '@/components/DawgAIAnalytics';

<DawgAIAnalytics />
```

## Testing

### Using Mock API

1. Start mock API server
2. Update `.env` to point to mock API
3. All endpoints return realistic test data
4. No real DAWG AI account required

### Clear Mock Data

```bash
curl -X POST http://localhost:4000/mock/dawg-ai/mock/clear
```

### Example Test

```typescript
import { getDawgAIService } from './src/services/dawg-ai.service';

const service = getDawgAIService({
  apiBaseUrl: 'http://localhost:4000/mock/dawg-ai',
});

// Test connection
const status = await service.getConnectionStatus(userId);
console.log('Connection status:', status);

// Test project creation
const projectsService = new DawgAIProjectsService();
const project = await projectsService.createProject(userId, {
  name: 'Test Project',
  genre: 'Electronic',
  bpm: 128,
});
console.log('Created project:', project);
```

## Security

### Data Encryption

All OAuth tokens and sensitive data are encrypted using AWS KMS:

```typescript
// Stored encrypted in database
{
  "accessToken": "encrypted_ciphertext",
  "tokenIv": "initialization_vector",
  "tokenAuthTag": "authentication_tag",
  "tokenDataKey": "encrypted_data_key"
}
```

### Rate Limiting

Built-in rate limiting (60 requests/minute per user):

```typescript
// Automatically enforced by DawgAIService
if (!this.checkRateLimit(userId)) {
  throw new Error('Rate limit exceeded');
}
```

### Token Refresh

Access tokens are automatically refreshed before expiration:

```typescript
await dawgAIService.refreshAccessToken(userId);
```

### Webhook Verification

All webhooks must have valid HMAC signatures:

```typescript
const isValid = webhookService.verifySignature(payload, signature);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to DAWG AI

**Solutions**:
- Verify OAuth credentials in `.env`
- Check redirect URI matches registered URL
- Ensure KMS encryption is configured
- Check network connectivity to DAWG AI API

### Token Errors

**Problem**: Token expired or invalid

**Solutions**:
- Token refresh should happen automatically
- Manually trigger sync: `POST /api/dawg-ai/sync`
- Disconnect and reconnect if refresh fails

### Webhook Not Received

**Problem**: Webhooks not being received

**Solutions**:
- Verify webhook URL is registered in DAWG AI
- Check webhook secret matches configuration
- Ensure endpoint is publicly accessible
- Check webhook logs for errors

### Database Errors

**Problem**: Prisma errors with DAWG AI models

**Solutions**:
- Run migrations: `npx prisma migrate dev`
- Regenerate Prisma client: `npx prisma generate`
- Check database connection
- Verify schema matches migration

### Mock API Issues

**Problem**: Mock API not working

**Solutions**:
- Verify mock API is mounted: `app.use('/mock/dawg-ai', mockDawgAIApi)`
- Check API URL in `.env` points to mock endpoint
- Clear mock data: `POST /mock/dawg-ai/mock/clear`
- Check server logs for errors

## Support

For additional help:

- Check server logs for detailed error messages
- Review Prisma schema for data model reference
- Examine service code for implementation details
- Test with mock API to isolate issues

---

**Last Updated**: 2025-10-17
**Version**: 1.0.0
**Phase**: Week 5, Phase 2
