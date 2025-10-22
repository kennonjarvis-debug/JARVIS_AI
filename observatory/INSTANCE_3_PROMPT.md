# Instance 3: Email Integration (Prompt 8)

**Assigned Component:** Email Integration (SendGrid/Brevo)
**Estimated Time:** 4 hours
**Dependencies:** ✅ Logger (P2), ✅ Error Handler (P3), ✅ Types (P5)
**Priority:** HIGH - Required for Marketing Agent & Approval Queue

---

## Your Task

Build the Email adapter for transactional and bulk email sending. This integration allows Jarvis to send onboarding sequences, approval notifications, and marketing campaigns.

---

## Context

You are building **Prompt 8: Email Integration** from the Jarvis parallel development workflow.

**What's already complete:**
- Logger utility, Error handler, Types, Supabase

**What you're building:**
- SendGrid/Brevo email client
- Single and bulk email sending
- Template support
- Email tracking

---

## API Contract Reference

See `JARVIS_DESIGN_AND_PROMPTS.md` section **"14. Integrations: Email Adapter"**

```typescript
export interface EmailConfig {
  provider: 'sendgrid' | 'mailgun' | 'ses';
  apiKey: string;
  fromAddress: string;
  fromName: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    type?: string;
  }>;
}

export class EmailAdapter {
  constructor(config: EmailConfig);
  async sendEmail(message: EmailMessage): Promise<{ messageId: string; status: string }>;
  async sendBulkEmail(messages: EmailMessage[]): Promise<{ sent: number; failed: number; results: any[] }>;
  async sendTemplatedEmail(templateId: string, to: string, variables: Record<string, string>): Promise<{ messageId: string }>;
  async getEmailStats(messageId: string): Promise<{ delivered: boolean; opened: boolean; clicked: boolean; bounced: boolean; timestamp: Date }>;
}
```

---

## Implementation Requirements

### 1. Create `src/integrations/email.ts`

**Core features:**
- SendGrid as primary provider (most generous free tier: 100/day)
- Single email sending
- Bulk email sending (batch up to 1000)
- HTML + plain text support
- Template support with variable substitution
- Attachment handling
- Email tracking (opens, clicks)

**SendGrid API endpoints:**
```
POST /v3/mail/send - Send email
POST /v3/mail/batch - Send bulk
GET /v3/messages/:id - Get message status
```

**Example structure:**
```typescript
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';

export interface EmailConfig {
  provider: 'sendgrid' | 'mailgun' | 'ses';
  apiKey: string;
  fromAddress: string;
  fromName: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    type?: string;
  }>;
}

export class EmailAdapter {
  private client: AxiosInstance;
  private logger: Logger;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.logger = new Logger('EmailAdapter');

    if (config.provider === 'sendgrid') {
      this.client = axios.create({
        baseURL: 'https://api.sendgrid.com/v3',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
    }
    // Add other providers as needed
  }

  public async sendEmail(message: EmailMessage): Promise<any> {
    try {
      this.logger.info('Sending email', {
        to: Array.isArray(message.to) ? message.to.length : 1,
        subject: message.subject
      });

      const payload = this.buildSendGridPayload(message);
      const response = await this.client.post('/mail/send', payload);

      this.logger.info('Email sent successfully', {
        messageId: response.headers['x-message-id']
      });

      return {
        messageId: response.headers['x-message-id'],
        status: 'sent'
      };
    } catch (error: any) {
      this.logger.error('Failed to send email', error);

      if (error.response?.status === 429) {
        throw new JarvisError(
          ErrorCode.RATE_LIMIT_ERROR,
          'Email API rate limit exceeded',
          { provider: this.config.provider },
          true
        );
      }

      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to send email',
        { error: error.message },
        true
      );
    }
  }

  private buildSendGridPayload(message: EmailMessage): any {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    return {
      personalizations: recipients.map(email => ({
        to: [{ email }],
        subject: message.subject
      })),
      from: {
        email: this.config.fromAddress,
        name: this.config.fromName
      },
      content: [
        { type: 'text/html', value: message.html },
        ...(message.text ? [{ type: 'text/plain', value: message.text }] : [])
      ],
      ...(message.replyTo && { reply_to: { email: message.replyTo } }),
      ...(message.attachments && {
        attachments: message.attachments.map(att => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
          type: att.type || 'application/octet-stream'
        }))
      })
    };
  }

  public async sendBulkEmail(messages: EmailMessage[]): Promise<any> {
    // Batch messages and send
    // Track successes and failures
    // Return aggregate results
  }

  public async sendTemplatedEmail(
    templateId: string,
    to: string,
    variables: Record<string, string>
  ): Promise<any> {
    // Use SendGrid dynamic templates
    // Substitute variables
  }

  public async getEmailStats(messageId: string): Promise<any> {
    // Query SendGrid stats API
    // Return delivery, open, click stats
  }
}
```

### 2. Create `src/integrations/email.test.ts`

**Test cases (minimum 20):**
- [ ] Send single email successfully
- [ ] Send email with HTML only
- [ ] Send email with HTML + plain text
- [ ] Send email with CC/BCC
- [ ] Send email with reply-to
- [ ] Send email with attachments
- [ ] Send bulk emails (batch)
- [ ] Send templated email
- [ ] Handle invalid email addresses
- [ ] Handle rate limiting
- [ ] Handle API errors
- [ ] Retry transient failures
- [ ] Get email delivery stats
- [ ] Multiple recipients handling
- [ ] Email validation
- [ ] Provider configuration
- [ ] Template variable substitution
- [ ] Attachment encoding
- [ ] Error recovery
- [ ] Logging verification

**Minimum >85% coverage**

### 3. Create `config/email-templates.json`

Example templates:
```json
{
  "welcome": {
    "subject": "Welcome to DAWG AI!",
    "html": "<h1>Welcome {{name}}!</h1><p>Start making music today...</p>"
  },
  "approval_request": {
    "subject": "Approval Required: {{action}}",
    "html": "<h2>Action requires your approval</h2><p>{{description}}</p>"
  }
}
```

### 4. Create `docs/email-setup.md`

**Sections:**
- SendGrid account setup
- API key generation
- Domain verification
- Sender authentication
- Template management
- Rate limits (100/day free tier)
- Best practices
- Troubleshooting

---

## Acceptance Criteria

- [ ] SendGrid integration working
- [ ] Single email sending
- [ ] Bulk email sending (up to 1000)
- [ ] Template support with variables
- [ ] Attachment handling
- [ ] Email tracking integration
- [ ] Error handling with JarvisError
- [ ] Retry logic for failures
- [ ] Rate limiting handled
- [ ] Test coverage >85% (20+ tests)
- [ ] Documentation complete
- [ ] Works with free SendGrid tier

---

## Environment Variables

Add to `.env`:
```bash
# Email (SendGrid)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_key_here
EMAIL_FROM_ADDRESS=noreply@dawgai.com
EMAIL_FROM_NAME=DAWG AI
```

---

## Testing

```bash
npm test src/integrations/email.test.ts
```

---

## Integration Points

Will be used by:
- **Approval Queue (P11)** - Send approval requests
- **Marketing Agent (P13)** - Email campaigns
- **Sales Agent (P14)** - Outreach sequences
- **Support Agent (P14)** - Ticket responses

---

## Helpful Resources

- SendGrid API: https://docs.sendgrid.com/api-reference/mail-send/mail-send
- SendGrid Node.js: https://github.com/sendgrid/sendgrid-nodejs
- Dynamic Templates: https://docs.sendgrid.com/ui/sending-email/how-to-send-an-email-with-dynamic-templates

---

## Completion Checklist

Create `PROMPT_8_COMPLETION.md` with:
- ✅ All acceptance criteria met
- ✅ SendGrid integration tested
- ✅ Bulk email working
- ✅ Templates functional
- ✅ Ready for downstream consumers

---

**GO BUILD!** 🚀

This is critical infrastructure - Marketing, Sales, Support, and Approval Queue all depend on you. Build it solid!
