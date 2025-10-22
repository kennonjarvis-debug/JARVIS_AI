# Email Integration Setup Guide

Complete guide for setting up and using the Email integration in Jarvis.

---

## Overview

The Email integration provides transactional and bulk email sending capabilities using **SendGrid** as the primary provider. SendGrid offers a generous free tier (100 emails/day) which is perfect for getting started.

**Features:**
- ✅ Single email sending
- ✅ Bulk email sending (up to 1000 per batch)
- ✅ Email templates with variable substitution
- ✅ HTML and plain text support
- ✅ Attachments
- ✅ Email tracking (opens, clicks)
- ✅ CC/BCC support
- ✅ Custom headers
- ✅ Sandbox mode for testing

---

## SendGrid Account Setup

### 1. Create SendGrid Account

1. Go to [SendGrid Signup](https://signup.sendgrid.com/)
2. Choose the **Free Plan** (100 emails/day)
3. Complete email verification
4. Fill out the sender questionnaire

**Free tier limits:**
- 100 emails per day
- 2,000 contacts
- Email API, Marketing Campaigns, Email validation
- 30 days email activity history

### 2. Generate API Key

1. Log into [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings → API Keys**
3. Click **Create API Key**
4. Name it: `jarvis-production` (or similar)
5. Select **Full Access** (or minimum: **Mail Send** permission)
6. Click **Create & View**
7. **Copy the API key immediately** (won't be shown again)

### 3. Verify Sender Identity

SendGrid requires sender verification to prevent spam:

**Option A: Single Sender Verification (Quickest)**
1. Go to **Settings → Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter your email address (e.g., `noreply@yourdomain.com`)
4. Fill in sender details
5. Check email and click verification link

**Option B: Domain Authentication (Recommended for production)**
1. Go to **Settings → Sender Authentication**
2. Click **Authenticate Your Domain**
3. Select your DNS host
4. Add the provided DNS records (CNAME)
5. Wait for DNS propagation (~10 minutes to 48 hours)
6. Click **Verify** in SendGrid

---

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Email Provider Configuration
EMAIL_PROVIDER=sendgrid                    # Provider: sendgrid, mailgun, ses
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx  # Your SendGrid API key
EMAIL_FROM_ADDRESS=noreply@dawgai.com      # Verified sender email
EMAIL_FROM_NAME=DAWG AI                    # Display name
EMAIL_SANDBOX_MODE=false                   # Set to true for testing

# Alternative key name (if not using SendGrid-specific)
# EMAIL_API_KEY=your_key_here
```

### Verify Configuration

Test your configuration:

```typescript
import { createEmailAdapterFromEnv } from './integrations/email';

try {
  const emailAdapter = createEmailAdapterFromEnv();
  console.log('Email adapter configured successfully!');
} catch (error) {
  console.error('Configuration error:', error.message);
}
```

---

## Usage Examples

### Basic Email Sending

```typescript
import { EmailAdapter } from './integrations/email';

const emailAdapter = new EmailAdapter({
  provider: 'sendgrid',
  apiKey: process.env.SENDGRID_API_KEY!,
  fromAddress: 'noreply@dawgai.com',
  fromName: 'DAWG AI',
});

// Send single email
const result = await emailAdapter.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to DAWG AI',
  html: '<h1>Hello!</h1><p>Thanks for signing up.</p>',
  text: 'Hello! Thanks for signing up.', // Optional plain text fallback
});

console.log(`Email sent: ${result.messageId}`);
```

### Email with CC/BCC

```typescript
await emailAdapter.sendEmail({
  to: 'primary@example.com',
  cc: ['manager@example.com'],
  bcc: ['archive@dawgai.com'],
  subject: 'Team Update',
  html: '<p>Here is the team update...</p>',
});
```

### Email with Reply-To

```typescript
await emailAdapter.sendEmail({
  to: 'customer@example.com',
  replyTo: 'support@dawgai.com',
  subject: 'Support Response',
  html: '<p>Thanks for contacting us...</p>',
});
```

### Email with Attachments

```typescript
import fs from 'fs';

const pdfBuffer = fs.readFileSync('./document.pdf');

await emailAdapter.sendEmail({
  to: 'user@example.com',
  subject: 'Your Invoice',
  html: '<p>Please find your invoice attached.</p>',
  attachments: [
    {
      filename: 'invoice-2025-10.pdf',
      content: pdfBuffer,
      type: 'application/pdf',
    },
    {
      filename: 'logo.png',
      content: 'base64-encoded-content-here',
      type: 'image/png',
      cid: 'logo', // For inline images
    },
  ],
});
```

### Bulk Email Sending

```typescript
const messages = [
  {
    to: 'user1@example.com',
    subject: 'Newsletter',
    html: '<p>Hello User 1!</p>',
  },
  {
    to: 'user2@example.com',
    subject: 'Newsletter',
    html: '<p>Hello User 2!</p>',
  },
  // ... up to 1000 emails
];

const result = await emailAdapter.sendBulkEmail(messages);

console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
console.log('Results:', result.results);
```

### Template-Based Emails

```typescript
// Load templates from config
import templates from '../config/email-templates.json';
emailAdapter.loadTemplates(templates.templates);

// Send using template
await emailAdapter.sendTemplatedEmail(
  'welcome',
  'newuser@example.com',
  {
    name: 'Alice',
    dashboardUrl: 'https://app.dawgai.com/dashboard',
    websiteUrl: 'https://dawgai.com',
  }
);
```

### Email Tracking

```typescript
// Send email
const result = await emailAdapter.sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  html: '<p>Test email</p>',
});

// Wait a bit for delivery
await new Promise(resolve => setTimeout(resolve, 5000));

// Get stats
const stats = await emailAdapter.getEmailStats(result.messageId);

console.log({
  delivered: stats.delivered,
  opened: stats.opened,
  clicked: stats.clicked,
  opens: stats.openCount,
  clicks: stats.clickCount,
});
```

---

## Email Templates

### Template Structure

Templates are defined in `config/email-templates.json`:

```json
{
  "templates": [
    {
      "id": "welcome",
      "name": "Welcome Email",
      "subject": "Welcome {{name}}!",
      "html": "<h1>Hello {{name}}</h1><p>Welcome to {{company}}</p>",
      "text": "Hello {{name}}\nWelcome to {{company}}",
      "variables": ["name", "company"]
    }
  ]
}
```

### Variable Substitution

Variables use `{{variableName}}` syntax:

```typescript
// Template
"subject": "Hi {{firstName}}, your order #{{orderId}} is ready!"

// Variables
{
  firstName: "Alice",
  orderId: "12345"
}

// Result
"Hi Alice, your order #12345 is ready!"
```

### Creating New Templates

1. Add to `config/email-templates.json`
2. Include HTML and optional plain text versions
3. List all variables in `variables` array
4. Use descriptive IDs

**Best practices:**
- ✅ Always provide plain text fallback
- ✅ Keep HTML simple and email-client compatible
- ✅ Inline CSS styles (no external stylesheets)
- ✅ Test across email clients (Gmail, Outlook, etc.)
- ✅ Include unsubscribe links for marketing emails
- ✅ Use responsive design for mobile

---

## Testing

### Sandbox Mode

Enable sandbox mode to test without actually sending emails:

```typescript
const emailAdapter = new EmailAdapter({
  provider: 'sendgrid',
  apiKey: process.env.SENDGRID_API_KEY!,
  fromAddress: 'noreply@dawgai.com',
  fromName: 'DAWG AI',
  sandboxMode: true, // Emails won't be actually sent
});
```

SendGrid will validate your requests but not deliver emails.

### Test with Real Email

Use a test email address:

```typescript
await emailAdapter.sendEmail({
  to: 'your-test-email@gmail.com',
  subject: 'Test Email',
  html: '<p>This is a test</p>',
});
```

### Run Test Suite

```bash
# Run email integration tests
npm test src/integrations/email.test.ts

# Run with coverage
npm test -- --coverage src/integrations/email.test.ts
```

---

## Error Handling

### Common Errors

**1. Authentication Error (401/403)**
```typescript
// Error: Email API authentication failed
// Fix: Check SENDGRID_API_KEY is correct
```

**2. Rate Limit Error (429)**
```typescript
// Error: Email API rate limit exceeded
// Fix: Implement retry with exponential backoff or reduce send rate
```

**3. Invalid Email Address**
```typescript
// Error: Invalid email address: invalid-email
// Fix: Validate email format before sending
```

**4. Sender Not Verified**
```typescript
// Error: Sender identity not verified
// Fix: Verify sender in SendGrid dashboard
```

### Error Recovery

The EmailAdapter automatically handles errors with appropriate error codes:

```typescript
import { ErrorCode, isJarvisError } from '../utils/error-handler';

try {
  await emailAdapter.sendEmail(message);
} catch (error) {
  if (isJarvisError(error)) {
    switch (error.code) {
      case ErrorCode.RATE_LIMIT_ERROR:
        // Retry after delay
        await sleep(60000);
        await emailAdapter.sendEmail(message);
        break;

      case ErrorCode.AUTHENTICATION_ERROR:
        // Alert admin
        console.error('Email API authentication failed!');
        break;

      case ErrorCode.INTEGRATION_ERROR:
        // Retry up to 3 times
        // Then escalate to human
        break;
    }
  }
}
```

---

## Rate Limits

### SendGrid Free Tier Limits

| Limit | Value |
|-------|-------|
| Daily emails | 100 |
| Emails per second | 10 |
| Contacts | 2,000 |
| API requests | No explicit limit |

### Managing Rate Limits

**For bulk sends:**
```typescript
// Automatically batches in groups of 100 with 1s delay between batches
const result = await emailAdapter.sendBulkEmail(messages);
```

**Manual rate limiting:**
```typescript
async function sendWithRateLimit(messages: EmailMessage[]) {
  for (const message of messages) {
    await emailAdapter.sendEmail(message);
    await sleep(100); // 10 emails/second max
  }
}
```

---

## Monitoring

### Email Statistics

Track email performance:

```typescript
const stats = await emailAdapter.getEmailStats(messageId);

// Stats available:
// - delivered: boolean
// - opened: boolean (requires tracking enabled)
// - clicked: boolean (requires link tracking)
// - bounced: boolean
// - openCount: number
// - clickCount: number
```

### SendGrid Dashboard

Monitor in SendGrid dashboard:
1. Go to [SendGrid Activity Feed](https://app.sendgrid.com/email_activity)
2. View sent emails, opens, clicks, bounces
3. Filter by date, recipient, status
4. Export data for analysis

---

## Best Practices

### Email Deliverability

✅ **DO:**
- Use domain authentication (SPF, DKIM, DMARC)
- Send from verified sender
- Include unsubscribe link
- Maintain clean email list
- Send relevant content
- Monitor bounce rates
- Test before sending to large lists

❌ **DON'T:**
- Send to purchased lists
- Use misleading subject lines
- Include too many links
- Use all caps or excessive punctuation
- Send without plain text version
- Ignore bounces and complaints

### Security

- ✅ Store API keys in environment variables, never in code
- ✅ Use least-privilege API keys (Mail Send only)
- ✅ Rotate API keys regularly
- ✅ Enable IP allowlisting in SendGrid (optional)
- ✅ Use HTTPS for all webhook callbacks
- ✅ Validate email addresses before sending
- ✅ Sanitize user-provided content in templates

### Performance

- ✅ Use bulk send for multiple emails
- ✅ Batch sends in groups of 100
- ✅ Implement retry logic with exponential backoff
- ✅ Cache templates in memory
- ✅ Use async/await for concurrent sends
- ✅ Monitor rate limits
- ✅ Log all email activity

---

## Troubleshooting

### Email Not Delivered

**Check:**
1. Sender is verified in SendGrid
2. Recipient email is valid
3. No SendGrid errors in activity feed
4. Not in spam folder
5. Check SendGrid reputation score

### Email Goes to Spam

**Improve:**
1. Set up domain authentication (SPF/DKIM)
2. Warm up sender reputation (start with small volumes)
3. Improve email content (less promotional language)
4. Include unsubscribe link
5. Monitor spam complaints

### Template Variables Not Substituted

**Check:**
1. Variable names match exactly (case-sensitive)
2. Using `{{variable}}` syntax
3. All required variables provided
4. Template registered with `registerTemplate()` or `loadTemplates()`

### API Key Not Working

**Verify:**
1. API key is correct (no extra spaces)
2. API key has Mail Send permission
3. Account is active and verified
4. No IP restrictions blocking your server
5. Try creating a new API key

---

## Integration with Jarvis Agents

### Marketing Agent

```typescript
// Send email campaign
await emailAdapter.sendBulkEmail(
  subscribers.map(sub => ({
    to: sub.email,
    subject: campaignSubject,
    html: campaignContent,
  }))
);
```

### Sales Agent

```typescript
// Automated outreach
await emailAdapter.sendTemplatedEmail(
  'lead_outreach',
  lead.email,
  {
    name: lead.firstName,
    companySize: lead.companySize,
    interest: lead.interest,
    // ...
  }
);
```

### Support Agent

```typescript
// Ticket response
await emailAdapter.sendTemplatedEmail(
  'support_ticket_response',
  ticket.customerEmail,
  {
    customerName: ticket.customerName,
    ticketId: ticket.id,
    responseMessage: response,
    // ...
  }
);
```

### Approval Queue

```typescript
// Send approval request
await emailAdapter.sendTemplatedEmail(
  'approval_request',
  adminEmail,
  {
    action: task.type,
    riskLevel: decision.riskLevel,
    description: task.description,
    approveUrl: `${baseUrl}/approve/${requestId}`,
    rejectUrl: `${baseUrl}/reject/${requestId}`,
    // ...
  }
);
```

---

## Upgrading SendGrid Plan

As your email needs grow:

| Plan | Emails/Month | Price |
|------|--------------|-------|
| Free | 3,000 (100/day) | $0 |
| Essentials | 50,000 | $19.95/mo |
| Pro | 1,500,000 | Starting at $89.95/mo |

Upgrade when you need:
- More than 100 emails/day
- Longer email activity history
- Dedicated IP address
- Priority support

---

## Alternative Providers

While SendGrid is the primary provider, Jarvis is designed to support others:

### Mailgun
- Similar pricing
- Good for developers
- Not yet implemented in Jarvis

### AWS SES
- Very affordable at scale
- Requires AWS account
- Not yet implemented in Jarvis

**To add support:** Implement provider-specific logic in `EmailAdapter.constructor()` and `buildPayload()` methods.

---

## Summary

✅ **Setup Complete When:**
- SendGrid account created
- API key generated and stored in `.env`
- Sender verified
- Test email sent successfully
- Templates loaded
- Error handling tested

✅ **Ready for Production When:**
- Domain authenticated
- Rate limiting tested
- Bulk send tested
- Error recovery verified
- Monitoring configured
- Documentation reviewed

**Next Steps:**
1. Test email sending in sandbox mode
2. Send test email to your account
3. Load templates from config
4. Integrate with agents (Marketing, Sales, Support, Approval)
5. Monitor deliverability and engagement

---

**Need Help?**
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid Support](https://support.sendgrid.com/)
- Jarvis Discord (coming soon)
