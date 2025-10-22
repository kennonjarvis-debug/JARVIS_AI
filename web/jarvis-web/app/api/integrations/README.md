# Observatory Integrations API

This directory contains API routes for managing Observatory integrations.

## Routes

### List All Integrations
**GET** `/api/integrations`

Lists all integrations for the current user.

**Query Parameters:**
- `status` (optional): Filter by status (connected, disconnected, error, pending)
- `type` (optional): Filter by integration type

**Response:**
```json
{
  "integrations": [
    {
      "id": "gmail-1234567890",
      "type": "gmail",
      "name": "Gmail",
      "status": "connected",
      "authMethod": "oauth2",
      "connectedAt": "2025-10-17T12:00:00.000Z",
      "lastSyncedAt": "2025-10-17T14:00:00.000Z",
      "metadata": {}
    }
  ],
  "total": 1
}
```

---

### Connect Integration
**POST** `/api/integrations/[integration]/connect`

Initiates OAuth or API key connection for a specific integration.

**Supported Integrations:**
- `dawg-ai` - Dawg AI (API Key)
- `imessage` - iMessage (System)
- `email` - Generic Email (OAuth2)
- `gmail` - Gmail (OAuth2)
- `salesforce` - Salesforce (OAuth2)
- `hubspot` - HubSpot (OAuth2)
- `twitter` - Twitter/X (OAuth2)
- `sms` - SMS (API Key)
- `analytics` - Analytics (API Key)

**Request Body (for API Key integrations):**
```json
{
  "apiKey": "your-api-key",
  "credentials": {
    "additional": "fields"
  }
}
```

**Request Body (for OAuth integrations):**
```json
{
  "redirectUri": "https://yourapp.com/callback",
  "state": "random-state-string",
  "scopes": ["optional", "custom", "scopes"]
}
```

**Response (OAuth):**
```json
{
  "success": true,
  "integration": {
    "id": "gmail-1234567890",
    "type": "gmail",
    "name": "Gmail",
    "status": "connected",
    "authMethod": "oauth2",
    "connectedAt": "2025-10-17T12:00:00.000Z"
  },
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "OAuth flow initiated for Gmail"
}
```

**Response (API Key):**
```json
{
  "success": true,
  "integration": {
    "id": "dawg-ai-1234567890",
    "type": "dawg-ai",
    "name": "Dawg AI",
    "status": "connected",
    "authMethod": "api_key",
    "connectedAt": "2025-10-17T12:00:00.000Z"
  },
  "message": "Successfully connected to Dawg AI"
}
```

---

### Check Integration Status
**GET** `/api/integrations/[integration]/status`

Checks the connection status and details of a specific integration.

**Response:**
```json
{
  "integration": {
    "id": "gmail-1234567890",
    "type": "gmail",
    "name": "Gmail",
    "status": "connected",
    "authMethod": "oauth2",
    "connectedAt": "2025-10-17T12:00:00.000Z",
    "lastSyncedAt": "2025-10-17T14:00:00.000Z"
  },
  "details": {
    "accountInfo": {
      "email": "user@example.com",
      "name": "Mock User",
      "verified": true
    },
    "permissions": ["gmail.readonly", "gmail.send"],
    "quotaUsage": {
      "used": 245,
      "limit": 1000
    }
  }
}
```

---

### Disconnect Integration
**DELETE** `/api/integrations/[integration]`

Disconnects a specific integration and revokes access.

**Response:**
```json
{
  "success": true,
  "message": "Successfully disconnected Gmail"
}
```

---

## Integration Types

| Type | Name | Auth Method | Description |
|------|------|-------------|-------------|
| `dawg-ai` | Dawg AI | API Key | Advanced AI capabilities |
| `imessage` | iMessage | System | Message integration |
| `email` | Email | OAuth2 | Generic email account |
| `gmail` | Gmail | OAuth2 | Gmail integration |
| `salesforce` | Salesforce | OAuth2 | Salesforce CRM |
| `hubspot` | HubSpot | OAuth2 | HubSpot CRM |
| `twitter` | Twitter/X | OAuth2 | Twitter/X integration |
| `sms` | SMS | API Key | SMS service |
| `analytics` | Analytics | API Key | Analytics platform |

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (integration not found or not connected)
- `409` - Conflict (integration already connected)
- `500` - Internal Server Error

---

## Implementation Notes

### Current State (Mock)
The current implementation uses an in-memory mock store (`MockIntegrationStore`) for development and testing purposes. All integrations return success responses with mock data.

### Production Implementation
For production, you should:

1. **Replace Mock Store** with database queries (e.g., Prisma, Drizzle)
2. **Add Authentication** - Get actual user ID from session
3. **Implement Real OAuth Flows**:
   - Store OAuth state with expiration
   - Create callback endpoints for each OAuth provider
   - Securely store access/refresh tokens
4. **Secure Credential Storage** - Encrypt API keys and tokens
5. **Add Rate Limiting** - Prevent abuse of API endpoints
6. **Implement Token Refresh** - Auto-refresh expired OAuth tokens
7. **Add Webhooks** - Listen for integration events
8. **Add Logging & Monitoring** - Track connection/disconnection events

### Environment Variables Needed

For production OAuth integrations, add these to `.env`:

```env
# Gmail
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret

# Salesforce
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret

# HubSpot
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret

# Twitter
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret

# Other integrations...
```

---

## Usage Examples

### Connect Gmail

```typescript
const response = await fetch('/api/integrations/gmail/connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    redirectUri: 'https://yourapp.com/oauth/callback',
  }),
});

const data = await response.json();
if (data.success && data.authUrl) {
  // Redirect user to OAuth URL
  window.location.href = data.authUrl;
}
```

### List All Integrations

```typescript
const response = await fetch('/api/integrations');
const data = await response.json();

console.log(`Found ${data.total} integrations`);
data.integrations.forEach(integration => {
  console.log(`${integration.name}: ${integration.status}`);
});
```

### Check Integration Status

```typescript
const response = await fetch('/api/integrations/gmail/status');
const data = await response.json();

console.log(`Gmail status: ${data.integration.status}`);
console.log(`Email: ${data.details.accountInfo.email}`);
```

### Disconnect Integration

```typescript
const response = await fetch('/api/integrations/gmail', {
  method: 'DELETE',
});

const data = await response.json();
if (data.success) {
  console.log(data.message);
}
```
