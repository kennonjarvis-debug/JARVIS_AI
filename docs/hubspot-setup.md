# HubSpot CRM Integration Setup Guide

This guide walks through setting up the HubSpot CRM integration for Jarvis.

---

## Prerequisites

- HubSpot account (free tier works)
- Admin access to HubSpot account
- Node.js environment with Jarvis installed

---

## Step 1: Create HubSpot Account

1. Go to [HubSpot.com](https://www.hubspot.com/)
2. Click "Get Started Free"
3. Create an account with your business email
4. Complete the onboarding process
5. Navigate to your HubSpot dashboard

---

## Step 2: Generate API Access Token

### Method 1: Private App (Recommended)

1. In your HubSpot account, click the **Settings** gear icon (top right)
2. Navigate to **Integrations** > **Private Apps**
3. Click **Create a private app**
4. Fill in the details:
   - **App name**: `Jarvis AI Agent`
   - **Description**: `Autonomous AI agent for DAWG AI operations`
5. Go to the **Scopes** tab and select the following permissions:

   **CRM Scopes (Required):**
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `crm.schemas.contacts.read`
   - `crm.schemas.deals.read`

   **Engagement Scopes:**
   - `crm.objects.engagements.read`
   - `crm.objects.engagements.write`

6. Click **Create app**
7. Copy the **Access Token** (starts with `pat-na1-...`)
8. **Important**: Save this token securely - it won't be shown again

### Method 2: OAuth (Advanced)

For production deployments with multiple users, consider implementing OAuth 2.0 flow. See [HubSpot OAuth Documentation](https://developers.hubspot.com/docs/api/oauth-quickstart-guide).

---

## Step 3: Find Your Portal ID

1. In HubSpot, go to **Settings** > **Account Setup** > **Account Defaults**
2. Find your **Hub ID** (also called Portal ID)
3. Copy this number (e.g., `12345678`)

---

## Step 4: Configure Jarvis

### Add to Environment Variables

Edit your `.env` file:

```bash
# HubSpot CRM
HUBSPOT_ACCESS_TOKEN=pat-na1-your-access-token-here
HUBSPOT_PORTAL_ID=12345678
```

### Verify Configuration

Create a test script `test-hubspot.ts`:

```typescript
import { HubSpotAdapter } from './src/integrations/hubspot.js';
import { config } from 'dotenv';

config();

async function testHubSpot() {
  const hubspot = new HubSpotAdapter({
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
    portalId: process.env.HUBSPOT_PORTAL_ID!,
  });

  // Test health check
  const health = await hubspot.healthCheck();
  console.log('HubSpot Health:', health);

  // Test creating a contact
  const contactId = await hubspot.upsertContact({
    email: 'test@example.com',
    firstname: 'Test',
    lastname: 'User',
    lifecyclestage: 'lead',
  });

  console.log('Created contact:', contactId);

  // Test searching
  const contacts = await hubspot.searchContacts({
    limit: 5,
  });

  console.log(`Found ${contacts.length} contacts`);
}

testHubSpot().catch(console.error);
```

Run the test:

```bash
npx tsx test-hubspot.ts
```

---

## Step 5: Configure CRM Properties

### Recommended Custom Properties

Add these custom contact properties in HubSpot for better tracking:

1. Go to **Settings** > **Data Management** > **Properties**
2. Select **Contact properties**
3. Click **Create property**

**Suggested Properties:**

| Property Name | Type | Description |
|---------------|------|-------------|
| `jarvis_lead_score` | Number | AI-calculated lead score (0-100) |
| `jarvis_last_activity` | Date | Last activity logged by Jarvis |
| `jarvis_engagement_level` | Single-line text | Engagement level (hot/warm/cold) |
| `dawg_ai_signup_date` | Date | Date user signed up for DAWG AI |
| `dawg_ai_plan` | Dropdown | Current plan (free/pro/enterprise) |
| `dawg_ai_usage_score` | Number | Product usage score |

---

## Step 6: Set Up Deal Stages

Configure your sales pipeline:

1. Go to **Settings** > **Objects** > **Deals**
2. Click **Pipelines**
3. Set up a pipeline for DAWG AI:

**Recommended Stages:**

1. **Lead** - Initial contact
2. **Qualified** - Meets criteria for purchase
3. **Demo Scheduled** - Product demo booked
4. **Proposal Sent** - Pricing/proposal shared
5. **Negotiation** - In final discussions
6. **Closed Won** - Customer acquired
7. **Closed Lost** - Deal lost

---

## Usage Examples

### Create or Update Contact

```typescript
import { HubSpotAdapter } from './src/integrations/hubspot.js';

const hubspot = new HubSpotAdapter({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  portalId: process.env.HUBSPOT_PORTAL_ID!,
});

// Upsert contact (creates if doesn't exist, updates if exists)
const contactId = await hubspot.upsertContact({
  email: 'user@example.com',
  firstname: 'John',
  lastname: 'Doe',
  company: 'Acme Inc',
  phone: '+1-555-1234',
  lifecyclestage: 'lead',
  properties: {
    dawg_ai_plan: 'free',
    dawg_ai_signup_date: new Date().toISOString(),
  },
});

console.log('Contact ID:', contactId);
```

### Create Deal

```typescript
// Create a deal
const dealId = await hubspot.createDeal({
  dealname: 'DAWG AI Pro Plan - Acme Inc',
  amount: 9900, // $99.00 in cents
  dealstage: 'qualifiedtobuy',
  contactId: contactId, // Associate with contact
  closedate: new Date('2025-11-01'),
});

console.log('Deal ID:', dealId);
```

### Log Activity

```typescript
// Log an email activity
await hubspot.logActivity(contactId, {
  type: 'email',
  subject: 'Welcome to DAWG AI',
  body: 'Thanks for signing up! Here are some resources to get started...',
  timestamp: new Date(),
});

// Log a call
await hubspot.logActivity(contactId, {
  type: 'call',
  subject: 'Demo Call',
  body: 'Discussed premium features and pricing options.',
});
```

### Search Contacts

```typescript
// Find all leads
const leads = await hubspot.searchContacts({
  lifecyclestage: 'lead',
  limit: 100,
});

// Find recent signups
const recentSignups = await hubspot.searchContacts({
  createdate_gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  limit: 50,
});
```

### Get Contact Details

```typescript
// Get contact by email
const contact = await hubspot.getContactByEmail('user@example.com');

if (contact) {
  console.log('Contact found:', contact.firstname, contact.lastname);
  console.log('Lifecycle stage:', contact.lifecyclestage);

  // Get their activities
  const activities = await hubspot.getContactActivities(contact.id!);
  console.log(`${activities.length} activities logged`);
}
```

---

## Rate Limiting

HubSpot has rate limits:

- **100 requests per 10 seconds** for most API endpoints
- **4 requests per second** for search endpoints

Jarvis automatically handles rate limiting with built-in throttling. The adapter will:
- Track requests in a 10-second rolling window
- Automatically wait when approaching limits
- Queue requests to prevent 429 errors

### Best Practices

1. **Batch operations** when possible
2. **Cache contact lookups** to reduce API calls
3. **Use webhooks** for real-time updates (optional)
4. **Monitor usage** in HubSpot's API usage dashboard

---

## Troubleshooting

### Error: "Unauthorized" (401)

**Cause**: Invalid or expired access token

**Solutions**:
1. Verify token is correct in `.env`
2. Check token hasn't expired
3. Regenerate token in HubSpot if needed
4. Ensure private app has correct scopes

### Error: "Rate limit exceeded" (429)

**Cause**: Too many requests in short time

**Solutions**:
1. Wait for rate limit window to reset (shown in `retry-after` header)
2. Jarvis should automatically handle this - if you see this, there may be a bug
3. Reduce frequency of API calls

### Error: "Property does not exist"

**Cause**: Trying to set a custom property that doesn't exist

**Solutions**:
1. Create the custom property in HubSpot first
2. Check property name spelling (case-sensitive)
3. Verify property is available for contacts/deals

### Error: "Contact not found"

**Cause**: Contact doesn't exist in HubSpot

**Solutions**:
1. Use `upsertContact` instead of direct updates
2. Verify email address is correct
3. Check contact wasn't deleted

---

## Security Best Practices

1. **Never commit tokens** to git
2. **Rotate tokens** every 90 days
3. **Use least privilege** - only grant necessary scopes
4. **Monitor API usage** for anomalies
5. **Set up alerts** for failed auth attempts
6. **Audit token usage** regularly in HubSpot

---

## Monitoring & Observability

### Health Checks

```typescript
const health = await hubspot.healthCheck();

if (!health.healthy) {
  console.error('HubSpot integration unhealthy!');
  // Send alert
}

console.log(`HubSpot latency: ${health.latency}ms`);
```

### Logging

All HubSpot operations are automatically logged:

```typescript
// Logs include:
// - Contact operations (create, update, search)
// - Deal operations
// - Activity logging
// - API errors
// - Rate limiting events
```

Check logs in `logs/jarvis-*.log` for HubSpot-related entries.

---

## Advanced Configuration

### Custom Base URL

For HubSpot sandbox or custom instances:

```typescript
const hubspot = new HubSpotAdapter({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  portalId: process.env.HUBSPOT_PORTAL_ID!,
  baseUrl: 'https://api.hubspot-sandbox.com', // Custom URL
  timeout: 60000, // 60 second timeout
});
```

### Webhooks (Optional)

For real-time updates, set up HubSpot webhooks:

1. Go to **Settings** > **Integrations** > **Private Apps**
2. Select your app
3. Go to **Webhooks** tab
4. Add webhook URL (your Jarvis endpoint)
5. Subscribe to events:
   - `contact.creation`
   - `contact.propertyChange`
   - `deal.creation`
   - `deal.propertyChange`

---

## Testing

Run the integration tests:

```bash
npm run test src/integrations/hubspot.test.ts
```

All tests should pass with mocked HubSpot API responses.

---

## Support & Resources

- **HubSpot API Docs**: https://developers.hubspot.com/docs/api/overview
- **CRM API Reference**: https://developers.hubspot.com/docs/api/crm/understanding-the-crm
- **Rate Limits**: https://developers.hubspot.com/docs/api/usage-details
- **Scopes Guide**: https://developers.hubspot.com/docs/api/oauth/scopes
- **HubSpot Community**: https://community.hubspot.com/

---

## Next Steps

1. ✅ Set up HubSpot account
2. ✅ Generate API token
3. ✅ Configure environment variables
4. ✅ Run test script
5. Configure custom properties
6. Set up deal pipeline
7. Test with real data
8. Monitor usage and performance
9. Set up webhooks (optional)
10. Integrate with other Jarvis agents

---

**HubSpot integration is ready to use!**
