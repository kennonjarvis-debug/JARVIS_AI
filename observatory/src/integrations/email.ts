/**
 * Email Integration for Jarvis
 *
 * Provides email sending capabilities using SendGrid (primary) with support
 * for single, bulk, and templated emails.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';

/**
 * Email provider configuration
 */
export interface EmailConfig {
  /** Email service provider */
  provider: 'sendgrid' | 'mailgun' | 'ses';
  /** API key for authentication */
  apiKey: string;
  /** Default from email address */
  fromAddress: string;
  /** Default from name */
  fromName: string;
  /** Enable sandbox mode (testing) */
  sandboxMode?: boolean;
}

/**
 * Email message structure
 */
export interface EmailMessage {
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject line */
  subject: string;
  /** HTML content */
  html: string;
  /** Plain text content (optional fallback) */
  text?: string;
  /** Reply-to address */
  replyTo?: string;
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
  /** Email attachments */
  attachments?: EmailAttachment[];
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  /** Attachment filename */
  filename: string;
  /** File content (base64 string or Buffer) */
  content: string | Buffer;
  /** MIME type */
  type?: string;
  /** Content ID for inline attachments */
  cid?: string;
}

/**
 * Email template structure
 */
export interface EmailTemplate {
  /** Template unique identifier */
  id: string;
  /** Template name */
  name: string;
  /** Email subject (may contain variables) */
  subject: string;
  /** HTML content (may contain variables) */
  html: string;
  /** Plain text version */
  text?: string;
  /** Template variables */
  variables: string[];
}

/**
 * Result of sending a single email
 */
export interface EmailSendResult {
  /** Message ID from provider */
  messageId: string;
  /** Send status */
  status: 'sent' | 'failed' | 'queued';
  /** Error message if failed */
  error?: string;
}

/**
 * Result of sending bulk emails
 */
export interface BulkEmailResult {
  /** Number of emails sent successfully */
  sent: number;
  /** Number of emails that failed */
  failed: number;
  /** Individual email results */
  results: Array<{
    email: string;
    status: 'sent' | 'failed';
    messageId?: string;
    error?: string;
  }>;
}

/**
 * Email delivery statistics
 */
export interface EmailStats {
  /** Message ID */
  messageId: string;
  /** Whether email was delivered */
  delivered: boolean;
  /** Whether email was opened */
  opened: boolean;
  /** Whether any link was clicked */
  clicked: boolean;
  /** Whether email bounced */
  bounced: boolean;
  /** Last event timestamp */
  timestamp: Date;
  /** Number of opens */
  openCount?: number;
  /** Number of clicks */
  clickCount?: number;
}

/**
 * Email adapter for transactional and bulk email sending
 *
 * Primary provider: SendGrid (100 emails/day free tier)
 */
export class EmailAdapter {
  private client: AxiosInstance;
  private logger: Logger;
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate>;

  /**
   * Create a new EmailAdapter
   *
   * @param config - Email provider configuration
   */
  constructor(config: EmailConfig) {
    this.config = config;
    this.logger = new Logger('EmailAdapter');
    this.templates = new Map();

    // Initialize HTTP client based on provider
    switch (config.provider) {
      case 'sendgrid':
        this.client = this.initializeSendGrid();
        break;
      case 'mailgun':
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          'Mailgun provider not yet implemented. Use SendGrid.'
        );
      case 'ses':
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          'AWS SES provider not yet implemented. Use SendGrid.'
        );
      default:
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Unknown email provider: ${config.provider}`
        );
    }

    this.logger.info('EmailAdapter initialized', {
      provider: config.provider,
      fromAddress: config.fromAddress,
      sandboxMode: config.sandboxMode || false,
    });
  }

  /**
   * Initialize SendGrid API client
   */
  private initializeSendGrid(): AxiosInstance {
    return axios.create({
      baseURL: 'https://api.sendgrid.com/v3',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Send a single email
   *
   * @param message - Email message to send
   * @returns Send result with message ID
   */
  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      this.validateEmailMessage(message);

      const recipients = Array.isArray(message.to) ? message.to : [message.to];

      this.logger.info('Sending email', {
        to: recipients.length,
        subject: message.subject,
        hasAttachments: !!message.attachments?.length,
      });

      const payload = this.buildSendGridPayload(message);
      const response = await this.client.post('/mail/send', payload);

      // SendGrid returns 202 Accepted with X-Message-Id header
      const messageId = response.headers['x-message-id'] || this.generateMessageId();

      this.logger.info('Email sent successfully', {
        messageId,
        to: recipients.length,
      });

      return {
        messageId,
        status: 'sent',
      };
    } catch (error) {
      return this.handleEmailError(error, message);
    }
  }

  /**
   * Send bulk emails (batch processing)
   *
   * @param messages - Array of email messages
   * @returns Bulk send results with statistics
   */
  async sendBulkEmail(messages: EmailMessage[]): Promise<BulkEmailResult> {
    this.logger.info('Sending bulk emails', { count: messages.length });

    if (messages.length === 0) {
      return { sent: 0, failed: 0, results: [] };
    }

    if (messages.length > 1000) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Bulk email limit is 1000 messages per batch',
        { provided: messages.length, max: 1000 }
      );
    }

    const results: BulkEmailResult['results'] = [];
    let sent = 0;
    let failed = 0;

    // Process in batches of 100 to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(msg => this.sendEmail(msg))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const message = batch[j];
        const recipient = Array.isArray(message.to) ? message.to[0] : message.to;

        if (result.status === 'fulfilled' && result.value.status === 'sent') {
          sent++;
          results.push({
            email: recipient,
            status: 'sent',
            messageId: result.value.messageId,
          });
        } else {
          failed++;
          const error = result.status === 'rejected'
            ? result.reason.message
            : result.value.error;
          results.push({
            email: recipient,
            status: 'failed',
            error,
          });
        }
      }

      // Rate limiting: pause between batches
      if (i + batchSize < messages.length) {
        await this.sleep(1000); // 1 second between batches
      }
    }

    this.logger.info('Bulk email complete', { sent, failed, total: messages.length });

    return { sent, failed, results };
  }

  /**
   * Send email using a template
   *
   * @param templateId - Template identifier
   * @param to - Recipient email address
   * @param variables - Template variable values
   * @returns Send result with message ID
   */
  async sendTemplatedEmail(
    templateId: string,
    to: string,
    variables: Record<string, string>
  ): Promise<EmailSendResult> {
    const template = this.templates.get(templateId);

    if (!template) {
      throw new JarvisError(
        ErrorCode.NOT_FOUND,
        `Email template not found: ${templateId}`,
        { templateId, availableTemplates: Array.from(this.templates.keys()) }
      );
    }

    this.logger.info('Sending templated email', {
      templateId,
      to,
      variables: Object.keys(variables),
    });

    // Substitute variables in template
    const subject = this.substituteVariables(template.subject, variables);
    const html = this.substituteVariables(template.html, variables);
    const text = template.text
      ? this.substituteVariables(template.text, variables)
      : undefined;

    // Send using standard sendEmail
    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Get email delivery statistics
   *
   * @param messageId - Message ID from send result
   * @returns Email statistics
   */
  async getEmailStats(messageId: string): Promise<EmailStats> {
    try {
      this.logger.info('Fetching email stats', { messageId });

      // SendGrid Stats API
      // Note: Stats may take a few minutes to be available
      const response = await this.client.get(`/messages/${messageId}`);

      const data = response.data;

      return {
        messageId,
        delivered: data.status === 'delivered',
        opened: data.opens > 0,
        clicked: data.clicks > 0,
        bounced: data.status === 'bounced',
        timestamp: new Date(data.last_event_time),
        openCount: data.opens || 0,
        clickCount: data.clicks || 0,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Stats not yet available or message not found
        this.logger.warn('Email stats not found (may not be available yet)', {
          messageId,
        });

        return {
          messageId,
          delivered: false,
          opened: false,
          clicked: false,
          bounced: false,
          timestamp: new Date(),
        };
      }

      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to fetch email stats',
        { messageId, error: error.message },
        true
      );
    }
  }

  /**
   * Register an email template
   *
   * @param template - Template definition
   */
  registerTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
    this.logger.info('Email template registered', {
      id: template.id,
      name: template.name,
    });
  }

  /**
   * Load templates from JSON configuration
   *
   * @param templates - Template definitions
   */
  loadTemplates(templates: EmailTemplate[]): void {
    for (const template of templates) {
      this.registerTemplate(template);
    }
    this.logger.info('Email templates loaded', { count: templates.length });
  }

  /**
   * Build SendGrid API payload from email message
   */
  private buildSendGridPayload(message: EmailMessage): any {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    const payload: any = {
      personalizations: [
        {
          to: recipients.map(email => ({ email })),
          subject: message.subject,
        },
      ],
      from: {
        email: this.config.fromAddress,
        name: this.config.fromName,
      },
      content: [
        { type: 'text/html', value: message.html },
      ],
    };

    // Add plain text if provided
    if (message.text) {
      payload.content.push({ type: 'text/plain', value: message.text });
    }

    // Add CC recipients
    if (message.cc && message.cc.length > 0) {
      payload.personalizations[0].cc = message.cc.map(email => ({ email }));
    }

    // Add BCC recipients
    if (message.bcc && message.bcc.length > 0) {
      payload.personalizations[0].bcc = message.bcc.map(email => ({ email }));
    }

    // Add reply-to
    if (message.replyTo) {
      payload.reply_to = { email: message.replyTo };
    }

    // Add attachments
    if (message.attachments && message.attachments.length > 0) {
      payload.attachments = message.attachments.map(att => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content)
          ? att.content.toString('base64')
          : att.content,
        type: att.type || 'application/octet-stream',
        ...(att.cid && { content_id: att.cid }),
      }));
    }

    // Add custom headers
    if (message.headers) {
      payload.headers = message.headers;
    }

    // Sandbox mode for testing
    if (this.config.sandboxMode) {
      payload.mail_settings = {
        sandbox_mode: { enable: true },
      };
    }

    return payload;
  }

  /**
   * Validate email message before sending
   */
  private validateEmailMessage(message: EmailMessage): void {
    if (!message.to || (Array.isArray(message.to) && message.to.length === 0)) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Email message must have at least one recipient'
      );
    }

    if (!message.subject || message.subject.trim().length === 0) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Email message must have a subject'
      );
    }

    if (!message.html || message.html.trim().length === 0) {
      throw new JarvisError(
        ErrorCode.VALIDATION_ERROR,
        'Email message must have HTML content'
      );
    }

    // Validate email addresses
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    for (const email of recipients) {
      if (!this.isValidEmail(email)) {
        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          `Invalid email address: ${email}`
        );
      }
    }
  }

  /**
   * Basic email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Substitute variables in template string
   */
  private substituteVariables(template: string, variables: Record<string, string>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      // Replace {{key}} and {{key}} patterns
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Handle email sending errors
   */
  private handleEmailError(error: any, message: EmailMessage): EmailSendResult {
    const recipient = Array.isArray(message.to) ? message.to[0] : message.to;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Rate limiting
      if (axiosError.response?.status === 429) {
        this.logger.warn('Email API rate limit exceeded', { recipient });

        throw new JarvisError(
          ErrorCode.RATE_LIMIT_ERROR,
          'Email API rate limit exceeded',
          {
            provider: this.config.provider,
            recipient,
            retryAfter: axiosError.response.headers['retry-after'],
          },
          true
        );
      }

      // Authentication error
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        this.logger.error('Email API authentication failed', {
          status: axiosError.response.status,
        });

        throw new JarvisError(
          ErrorCode.AUTHENTICATION_ERROR,
          'Email API authentication failed. Check your API key.',
          { provider: this.config.provider },
          false
        );
      }

      // Bad request
      if (axiosError.response?.status === 400) {
        this.logger.error('Invalid email request', {
          error: axiosError.response.data,
        });

        throw new JarvisError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid email request',
          { error: axiosError.response.data },
          false
        );
      }
    }

    // Generic integration error
    this.logger.error('Failed to send email', error);

    throw new JarvisError(
      ErrorCode.INTEGRATION_ERROR,
      'Failed to send email',
      {
        provider: this.config.provider,
        recipient,
        error: error.message,
      },
      true
    );
  }

  /**
   * Generate a fallback message ID
   */
  private generateMessageId(): string {
    return `jarvis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Helper function to create EmailAdapter from environment variables
 */
export function createEmailAdapterFromEnv(): EmailAdapter {
  const provider = (process.env.EMAIL_PROVIDER || 'sendgrid') as 'sendgrid' | 'mailgun' | 'ses';
  const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY || '';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || '';
  const fromName = process.env.EMAIL_FROM_NAME || 'Jarvis';
  const sandboxMode = process.env.EMAIL_SANDBOX_MODE === 'true';

  if (!apiKey) {
    throw new JarvisError(
      ErrorCode.VALIDATION_ERROR,
      'Email API key not configured. Set SENDGRID_API_KEY or EMAIL_API_KEY environment variable.'
    );
  }

  if (!fromAddress) {
    throw new JarvisError(
      ErrorCode.VALIDATION_ERROR,
      'Email from address not configured. Set EMAIL_FROM_ADDRESS environment variable.'
    );
  }

  return new EmailAdapter({
    provider,
    apiKey,
    fromAddress,
    fromName,
    sandboxMode,
  });
}
