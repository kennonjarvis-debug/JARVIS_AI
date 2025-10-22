# Integration API Testing Guide

Use these curl commands to test the integration API routes:

## 1. List All Integrations (initially empty)
```bash
curl -X GET http://localhost:3000/api/integrations
```

Expected response:
```json
{
  "integrations": [],
  "total": 0
}
```

## 2. Connect Gmail (OAuth2)
```bash
curl -X POST http://localhost:3000/api/integrations/gmail/connect \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{
  "success": true,
  "integration": {
    "id": "gmail-...",
    "type": "gmail",
    "name": "Gmail",
    "status": "connected",
    "authMethod": "oauth2",
    "connectedAt": "...",
    "lastSyncedAt": "..."
  },
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "OAuth flow initiated for Gmail"
}
```

## 3. Connect Dawg AI (API Key)
```bash
curl -X POST http://localhost:3000/api/integrations/dawg-ai/connect \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "test-api-key"}'
```

Expected response:
```json
{
  "success": true,
  "integration": {
    "id": "dawg-ai-...",
    "type": "dawg-ai",
    "name": "Dawg AI",
    "status": "connected",
    "authMethod": "api_key",
    "connectedAt": "..."
  },
  "message": "Successfully connected to Dawg AI"
}
```

## 4. Connect iMessage (System)
```bash
curl -X POST http://localhost:3000/api/integrations/imessage/connect \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 5. Connect Salesforce (OAuth2)
```bash
curl -X POST http://localhost:3000/api/integrations/salesforce/connect \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 6. Connect HubSpot (OAuth2)
```bash
curl -X POST http://localhost:3000/api/integrations/hubspot/connect \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 7. Connect Twitter (OAuth2)
```bash
curl -X POST http://localhost:3000/api/integrations/twitter/connect \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 8. Connect SMS (API Key)
```bash
curl -X POST http://localhost:3000/api/integrations/sms/connect \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "test-sms-key"}'
```

## 9. Connect Analytics (API Key)
```bash
curl -X POST http://localhost:3000/api/integrations/analytics/connect \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "test-analytics-key"}'
```

## 10. List All Integrations (after connecting)
```bash
curl -X GET http://localhost:3000/api/integrations
```

Expected response:
```json
{
  "integrations": [
    {
      "id": "...",
      "type": "gmail",
      "name": "Gmail",
      "status": "connected",
      ...
    },
    ...
  ],
  "total": 9
}
```

## 11. Check Gmail Status
```bash
curl -X GET http://localhost:3000/api/integrations/gmail/status
```

Expected response:
```json
{
  "integration": {
    "id": "gmail-...",
    "type": "gmail",
    "name": "Gmail",
    "status": "connected",
    ...
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

## 12. Check Salesforce Status
```bash
curl -X GET http://localhost:3000/api/integrations/salesforce/status
```

## 13. Check HubSpot Status
```bash
curl -X GET http://localhost:3000/api/integrations/hubspot/status
```

## 14. Disconnect Gmail
```bash
curl -X DELETE http://localhost:3000/api/integrations/gmail
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully disconnected Gmail"
}
```

## 15. Disconnect All (run multiple times)
```bash
curl -X DELETE http://localhost:3000/api/integrations/dawg-ai
curl -X DELETE http://localhost:3000/api/integrations/imessage
curl -X DELETE http://localhost:3000/api/integrations/salesforce
curl -X DELETE http://localhost:3000/api/integrations/hubspot
curl -X DELETE http://localhost:3000/api/integrations/twitter
curl -X DELETE http://localhost:3000/api/integrations/sms
curl -X DELETE http://localhost:3000/api/integrations/analytics
```

## Error Cases

### Invalid Integration Type
```bash
curl -X POST http://localhost:3000/api/integrations/invalid-type/connect
```

Expected response (400):
```json
{
  "success": false,
  "error": "Invalid integration type: invalid-type",
  "message": "The specified integration is not supported"
}
```

### Already Connected
```bash
# Connect Gmail twice
curl -X POST http://localhost:3000/api/integrations/gmail/connect -H "Content-Type: application/json" -d '{}'
curl -X POST http://localhost:3000/api/integrations/gmail/connect -H "Content-Type: application/json" -d '{}'
```

Expected response (409):
```json
{
  "success": false,
  "error": "Integration already connected",
  "message": "Gmail is already connected. Please disconnect first to reconnect."
}
```

### Not Connected (Status Check)
```bash
curl -X GET http://localhost:3000/api/integrations/gmail/status
```

Expected response (404):
```json
{
  "error": "Integration not connected",
  "message": "Gmail is not connected"
}
```

### Not Connected (Disconnect)
```bash
curl -X DELETE http://localhost:3000/api/integrations/gmail
```

Expected response (404):
```json
{
  "success": false,
  "message": "Gmail is not connected"
}
```

## Filter Integrations

### By Status
```bash
curl -X GET "http://localhost:3000/api/integrations?status=connected"
```

### By Type
```bash
curl -X GET "http://localhost:3000/api/integrations?type=gmail"
```
