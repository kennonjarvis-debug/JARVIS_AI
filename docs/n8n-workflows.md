# n8n Workflow Integration for Jarvis

## Overview

This document describes the pre-built n8n workflows designed for Jarvis autonomous agent system. These workflows enable complex multi-step automations that would be difficult to implement in application code.

---

## Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Workflow Catalog](#workflow-catalog)
3. [Integration Guide](#integration-guide)
4. [Troubleshooting](#troubleshooting)

---

## Setup Instructions

### Local Development

#### 1. Install n8n

```bash
# Via npm (global)
npm install -g n8n

# Or via Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

#### 2. Start n8n

```bash
# If installed via npm
n8n start

# Access at http://localhost:5678
```

#### 3. Configure API Access

1. Open n8n UI at http://localhost:5678
2. Go to **Settings** → **API**
3. Create new API key
4. Add to `.env`:

```bash
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your_api_key_here
```

#### 4. Import Workflows

1. In n8n UI, click **Workflows** → **Import from File**
2. Import all JSON files from `config/n8n-workflows/`
3. Activate each workflow after configuration

---

### Production Setup

#### Cloud n8n (Recommended)

1. Sign up at [n8n.cloud](https://n8n.cloud)
2. Create new instance
3. Get API credentials from Settings
4. Import workflow JSON files

#### Self-Hosted

```bash
# Docker Compose (recommended)
version: '3'
services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your_secure_password
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PROTOCOL=https
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

---

## Workflow Catalog

### 1. Social Media Posting (`social-media-posting.json`)

**Purpose:** Distribute content across multiple social media platforms with optimal timing and formatting.

**Inputs:**
- `content` (string): Post content
- `platforms` (array): Target platforms ['twitter', 'linkedin', 'facebook']
- `media` (array, optional): Media URLs to attach
- `scheduleTime` (datetime, optional): When to post

**Outputs:**
- `postIds`: Array of platform post IDs
- `status`: Success/failure per platform
- `analytics`: Initial engagement metrics

**Flow:**
1. Receive post request via webhook
2. Format content for each platform (character limits, hashtags)
3. Optimize media for each platform
4. Post to Buffer API for scheduling
5. Store post IDs in Supabase
6. Return confirmation

**Configuration Required:**
- Buffer credentials
- Platform profile IDs
- Supabase connection

**Trigger:** Webhook `/webhook/social-post`

---

### 2. Email Campaign Sender (`email-campaign-sender.json`)

**Purpose:** Send personalized bulk email campaigns with tracking and segmentation.

**Inputs:**
- `campaignId` (string): Campaign identifier
- `segment` (string): User segment to target
- `template` (string): Email template name
- `sendTime` (datetime, optional): Schedule send time

**Outputs:**
- `recipientCount`: Number of emails sent
- `messageIds`: SendGrid message IDs
- `failureCount`: Number of failures

**Flow:**
1. Receive campaign request
2. Query Supabase for segment users
3. Load email template
4. Personalize content for each recipient
5. Send via SendGrid API
6. Log results to Supabase
7. Schedule analytics check (24h later)

**Configuration Required:**
- SendGrid API key
- Supabase connection
- Email templates

**Trigger:** Webhook `/webhook/email-campaign`

---

### 3. Lead Enrichment (`lead-enrichment.json`)

**Purpose:** Automatically enrich new leads with data from multiple sources.

**Inputs:**
- `leadId` (string): Lead identifier from HubSpot
- `email` (string): Lead email address
- `company` (string, optional): Company name

**Outputs:**
- `enrichedData`: Combined data from all sources
- `score`: Lead quality score (0-100)
- `recommendations`: Next actions

**Flow:**
1. Trigger on new HubSpot contact
2. Look up company data (Clearbit/similar)
3. Check social profiles (LinkedIn, Twitter)
4. Analyze company website
5. Calculate lead score
6. Update HubSpot contact
7. Create tasks for sales team if high-value

**Configuration Required:**
- HubSpot credentials
- Clearbit/enrichment API keys
- Scoring rules

**Trigger:** HubSpot webhook or API call

---

### 4. CRM Sync (`crm-sync.json`)

**Purpose:** Keep HubSpot and Supabase in sync for contacts and activities.

**Inputs:**
- `syncType` (string): 'full' or 'incremental'
- `direction` (string): 'hubspot_to_supabase' or 'bidirectional'

**Outputs:**
- `contactsSynced`: Number of contacts updated
- `activitiesSync ed`: Number of activities synced
- `conflicts`: Any sync conflicts detected

**Flow:**
1. Scheduled trigger (every 15 minutes)
2. Query HubSpot for updated contacts
3. Query Supabase for updated records
4. Compare and resolve conflicts
5. Update both systems
6. Log sync results
7. Alert on failures

**Configuration Required:**
- HubSpot credentials
- Supabase connection
- Conflict resolution rules

**Trigger:** Schedule (cron: `*/15 * * * *`) or manual

---

### 5. Support Ticket Routing (`support-ticket-routing.json`)

**Purpose:** Intelligently route and prioritize support tickets based on content analysis.

**Inputs:**
- `ticketId` (string): Ticket identifier
- `subject` (string): Ticket subject
- `message` (string): Ticket content
- `customerId` (string): Customer identifier

**Outputs:**
- `category`: Detected ticket category
- `priority`: Calculated priority (1-4)
- `assignedTo`: Team or agent assigned
- `autoResponse`: Generated response if applicable

**Flow:**
1. New ticket webhook trigger
2. Analyze content with Claude API
3. Check customer history in Supabase
4. Categorize ticket (bug, billing, feature, etc.)
5. Calculate priority based on:
   - Customer tier
   - Issue severity
   - SLA requirements
6. Route to appropriate team
7. Send auto-response if simple issue
8. Create task in project management

**Configuration Required:**
- Anthropic API key
- Supabase connection
- Routing rules
- Email credentials

**Trigger:** Webhook `/webhook/support-ticket`

---

### 6. Analytics Aggregation (`analytics-aggregation.json`)

**Purpose:** Collect and aggregate metrics from all integrated platforms.

**Inputs:**
- `period` (string): 'daily', 'weekly', 'monthly'
- `metrics` (array): Specific metrics to collect

**Outputs:**
- `aggregatedData`: Combined metrics
- `trends`: Calculated trends
- `insights`: AI-generated insights
- `report`: Formatted report

**Flow:**
1. Scheduled trigger (daily at midnight)
2. Fetch metrics from Buffer (social)
3. Fetch metrics from SendGrid (email)
4. Fetch metrics from HubSpot (sales/CRM)
5. Query Supabase for agent metrics
6. Aggregate and calculate trends
7. Generate insights with Claude
8. Store results in Supabase
9. Send summary email

**Configuration Required:**
- All platform credentials
- Claude API key
- Report recipients

**Trigger:** Schedule (cron: `0 0 * * *`) for daily

---

### 7. Backup Automation (`backup-automation.json`)

**Purpose:** Automated backup of critical data with verification.

**Inputs:**
- `backupType` (string): 'full' or 'incremental'
- `targets` (array): Data sources to backup

**Outputs:**
- `backupId`: Unique backup identifier
- `size`: Backup size in bytes
- `duration`: Time taken
- `verification`: Integrity check result

**Flow:**
1. Scheduled trigger (daily at 2 AM)
2. Export Supabase data
3. Export HubSpot contacts
4. Export n8n workflows
5. Compress all data
6. Upload to cloud storage (S3/similar)
7. Verify backup integrity
8. Log backup metadata
9. Clean up old backups (>30 days)
10. Alert on failures

**Configuration Required:**
- Supabase credentials
- HubSpot credentials
- S3 credentials
- Notification channels

**Trigger:** Schedule (cron: `0 2 * * *`) for daily

---

## Integration Guide

### Using Workflows from Jarvis

```typescript
import { N8nAdapter } from './integrations/n8n';

const n8n = new N8nAdapter({
  apiUrl: process.env.N8N_API_URL!,
  apiKey: process.env.N8N_API_KEY!,
});

// Trigger social media post workflow
const execution = await n8n.triggerWorkflow('social-media-posting', {
  content: 'Check out our new feature!',
  platforms: ['twitter', 'linkedin'],
  media: ['https://example.com/image.png'],
});

// Wait for completion
const result = await n8n.waitForCompletion(execution.id);

if (result.status === 'success') {
  console.log('Post IDs:', result.data.postIds);
}
```

### List Available Workflows

```typescript
const workflows = await n8n.listWorkflows();

workflows.forEach(wf => {
  console.log(`${wf.name} (${wf.id}): ${wf.active ? 'Active' : 'Inactive'}`);
});
```

### Monitor Long-Running Workflows

```typescript
// Execute and wait with timeout
const result = await n8n.executeWorkflow(
  'lead-enrichment',
  { leadId: 'lead-123', email: 'user@example.com' },
  300000 // 5 minute timeout
);
```

---

## Workflow Development Tips

### 1. Error Handling

Always include error handling nodes in workflows:
- Catch errors with "Error Trigger" node
- Log errors to Supabase
- Send notifications for critical failures
- Implement retry logic for transient failures

### 2. Testing

Test workflows before production:
1. Use webhook.site for testing webhooks
2. Test with small data sets first
3. Verify all integrations work
4. Check error paths

### 3. Performance

Optimize workflow performance:
- Use batch operations where possible
- Add delays between API calls (rate limiting)
- Cache frequently accessed data
- Set appropriate timeouts

### 4. Security

Secure workflow access:
- Use environment variables for credentials
- Enable workflow authentication
- Limit webhook access
- Rotate API keys regularly

---

## Workflow Triggers

### Webhook Triggers

Format: `https://your-n8n-instance.com/webhook/{workflow-name}`

Example:
```bash
curl -X POST https://n8n.example.com/webhook/social-post \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello world!",
    "platforms": ["twitter"]
  }'
```

### Schedule Triggers

Configure in n8n UI:
- **Daily:** `0 0 * * *` (midnight)
- **Hourly:** `0 * * * *` (every hour)
- **Every 15 min:** `*/15 * * * *`

### Event Triggers

Set up platform webhooks:
- **HubSpot:** Contact created/updated
- **SendGrid:** Email opened/clicked
- **Supabase:** Database changes (via webhooks)

---

## Monitoring & Maintenance

### Check Workflow Health

```typescript
// Health check
const isHealthy = await n8n.healthCheck();

if (!isHealthy) {
  console.error('n8n is not responding');
}

// List recent executions
const workflows = await n8n.listWorkflows();
for (const wf of workflows) {
  if (!wf.active) {
    console.warn(`Workflow ${wf.name} is inactive`);
  }
}
```

### Logs

View execution logs in n8n UI:
1. Go to **Executions**
2. Filter by workflow
3. Click execution to see details
4. Check each node's input/output

### Performance Metrics

Monitor in n8n:
- Execution time
- Success rate
- Error frequency
- Active workflows

---

## Troubleshooting

### Workflow Not Triggering

**Check:**
1. Workflow is active in n8n UI
2. Webhook URL is correct
3. API key is valid
4. n8n instance is running

**Debug:**
```typescript
// Test workflow trigger
const execution = await n8n.triggerWorkflow('test-workflow', {
  test: true
});
console.log('Execution ID:', execution.id);
```

### Execution Timeout

**Solutions:**
1. Increase timeout in trigger code
2. Split workflow into smaller parts
3. Use async execution (don't wait)
4. Optimize slow nodes

**Example:**
```typescript
// Don't wait for completion
const execution = await n8n.triggerWorkflow('slow-workflow', data);
// execution.id can be checked later
```

### Authentication Errors

**Fix:**
1. Regenerate API key in n8n
2. Update `.env` file
3. Restart Jarvis application
4. Test with `healthCheck()`

### Rate Limiting

**Solutions:**
1. Add delay nodes between API calls
2. Batch operations
3. Use workflow queue system
4. Implement exponential backoff

---

## Resources

- **n8n Documentation:** https://docs.n8n.io/
- **n8n Community:** https://community.n8n.io/
- **Workflow Templates:** https://n8n.io/workflows
- **API Reference:** https://docs.n8n.io/api/

---

## Workflow Versioning

### Export Workflows

```bash
# From n8n UI:
# Workflows → Select workflow → Download
```

### Import Updates

```bash
# From n8n UI:
# Workflows → Import from File → Select JSON
```

### Version Control

Store workflow JSON files in `config/n8n-workflows/`:
- Commit changes to git
- Document breaking changes
- Test before deploying

---

## Next Steps

1. **Import all 7 workflows** into your n8n instance
2. **Configure credentials** for each integration
3. **Test each workflow** with sample data
4. **Activate workflows** that are needed
5. **Monitor executions** for the first 24 hours
6. **Adjust** workflows based on results

---

**Last Updated:** 2025-10-15
**Version:** 1.0
**Maintained by:** Jarvis Development Team
