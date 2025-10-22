/**
 * Gmail Integration
 * Handles email reading, sending, and management via Google Gmail API
 */

import { google, gmail_v1 } from 'googleapis';
import { OAuthConnector, type IntegrationConfig } from '../base/OAuthConnector.js';

export interface GmailConfig extends IntegrationConfig {
  oauthConfig: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  date: Date;
  labels: string[];
  snippet: string;
  attachments?: {
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }[];
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string;
  cc?: string | string[];
  bcc?: string | string[];
  html?: boolean;
}

/**
 * Gmail Integration using OAuth 2.0
 */
export class GmailIntegration extends OAuthConnector {
  private gmailClient?: gmail_v1.Gmail;

  constructor(config: GmailConfig) {
    const oauthConfig = {
      clientId: config.oauthConfig.clientId || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: config.oauthConfig.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: config.oauthConfig.redirectUri || `${process.env.APP_URL}/api/integrations/gmail/callback`,
      scopes: config.oauthConfig.scopes || [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.labels',
      ],
    };

    super({ ...config, oauthConfig });
  }

  get name(): string {
    return 'gmail';
  }

  get displayName(): string {
    return 'Gmail';
  }

  /**
   * Initialize Gmail client
   */
  async initialize(): Promise<void> {
    await super.initialize();

    // Initialize Gmail API client
    this.gmailClient = google.gmail({
      version: 'v1',
      auth: this.oauth2Client,
    });

    this.logger.info('Gmail client initialized');
  }

  /**
   * Test platform connection by fetching user profile
   */
  protected async testPlatformConnection(): Promise<boolean> {
    try {
      if (!this.gmailClient) {
        return false;
      }

      await this.ensureValidToken();
      const response = await this.gmailClient.users.getProfile({ userId: 'me' });
      this.logger.info('Gmail connection test successful', { email: response.data.emailAddress });
      return true;
    } catch (error) {
      this.logger.error('Gmail connection test failed', error);
      return false;
    }
  }

  /**
   * Get user's Gmail profile
   */
  async getProfile(): Promise<{ email: string; messagesTotal: number; threadsTotal: number }> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    await this.ensureValidToken();
    const response = await this.gmailClient.users.getProfile({ userId: 'me' });

    return {
      email: response.data.emailAddress || '',
      messagesTotal: response.data.messagesTotal || 0,
      threadsTotal: response.data.threadsTotal || 0,
    };
  }

  /**
   * List emails with optional filters
   */
  async listEmails(params?: {
    maxResults?: number;
    query?: string;
    labelIds?: string[];
  }): Promise<EmailMessage[]> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    await this.ensureValidToken();

    const response = await this.gmailClient.users.messages.list({
      userId: 'me',
      maxResults: params?.maxResults || 10,
      q: params?.query,
      labelIds: params?.labelIds,
    });

    const messages = response.data.messages || [];
    const emailMessages: EmailMessage[] = [];

    // Fetch full message details for each message
    for (const message of messages) {
      if (message.id) {
        const fullMessage = await this.getMessage(message.id);
        emailMessages.push(fullMessage);
      }
    }

    await this.logActivity({
      activityType: 'email',
      action: 'list',
      title: 'Listed emails',
      metadata: { count: emailMessages.length, query: params?.query },
    });

    return emailMessages;
  }

  /**
   * Get a specific email by ID
   */
  async getMessage(messageId: string): Promise<EmailMessage> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    await this.ensureValidToken();

    const response = await this.gmailClient.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const message = response.data;
    const headers = message.payload?.headers || [];

    const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const from = getHeader('from');
    const to = getHeader('to').split(',').map(e => e.trim());
    const cc = getHeader('cc') ? getHeader('cc').split(',').map(e => e.trim()) : undefined;
    const subject = getHeader('subject');
    const date = new Date(getHeader('date') || message.internalDate || Date.now());

    // Extract body
    let body = '';
    if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload?.parts) {
      const textPart = message.payload.parts.find(part => part.mimeType === 'text/plain' || part.mimeType === 'text/html');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    // Extract attachments
    const attachments = message.payload?.parts
      ?.filter(part => part.filename && part.body?.attachmentId)
      .map(part => ({
        filename: part.filename || 'unknown',
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body?.size || 0,
        attachmentId: part.body?.attachmentId || '',
      }));

    return {
      id: message.id || '',
      threadId: message.threadId || '',
      from,
      to,
      cc,
      subject,
      body,
      date,
      labels: message.labelIds || [],
      snippet: message.snippet || '',
      attachments,
    };
  }

  /**
   * Send an email
   */
  async sendEmail(params: SendEmailParams): Promise<{ id: string; threadId: string }> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    await this.ensureValidToken();

    // Format recipients
    const to = Array.isArray(params.to) ? params.to.join(', ') : params.to;
    const cc = params.cc ? (Array.isArray(params.cc) ? params.cc.join(', ') : params.cc) : undefined;
    const bcc = params.bcc ? (Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc) : undefined;

    // Build RFC 2822 formatted email
    const messageParts = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      bcc ? `Bcc: ${bcc}` : '',
      `Subject: ${params.subject}`,
      `Content-Type: ${params.html ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      params.body,
    ].filter(Boolean);

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await this.gmailClient.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    await this.logActivity({
      activityType: 'email',
      action: 'send',
      title: `Sent email: ${params.subject}`,
      description: `To: ${to}`,
      metadata: { messageId: response.data.id },
    });

    return {
      id: response.data.id || '',
      threadId: response.data.threadId || '',
    };
  }

  /**
   * Reply to an email
   */
  async replyToEmail(messageId: string, body: string, html: boolean = false): Promise<{ id: string; threadId: string }> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    // Get original message to extract thread ID and reply details
    const originalMessage = await this.getMessage(messageId);

    // Send reply in the same thread
    const messageParts = [
      `To: ${originalMessage.from}`,
      `Subject: Re: ${originalMessage.subject}`,
      `In-Reply-To: ${messageId}`,
      `References: ${messageId}`,
      `Content-Type: ${html ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      body,
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await this.gmailClient.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: originalMessage.threadId,
      },
    });

    await this.logActivity({
      activityType: 'email',
      action: 'reply',
      title: `Replied to: ${originalMessage.subject}`,
      metadata: { originalMessageId: messageId, replyId: response.data.id },
    });

    return {
      id: response.data.id || '',
      threadId: response.data.threadId || '',
    };
  }

  /**
   * Search emails
   */
  async searchEmails(query: string, maxResults: number = 10): Promise<EmailMessage[]> {
    return this.listEmails({ query, maxResults });
  }

  /**
   * Mark email as read
   */
  async markAsRead(messageId: string): Promise<void> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    await this.ensureValidToken();

    await this.gmailClient.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });

    await this.logActivity({
      activityType: 'email',
      action: 'mark_read',
      title: 'Marked email as read',
      metadata: { messageId },
    });
  }

  /**
   * Archive email
   */
  async archiveEmail(messageId: string): Promise<void> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    await this.ensureValidToken();

    await this.gmailClient.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });

    await this.logActivity({
      activityType: 'email',
      action: 'archive',
      title: 'Archived email',
      metadata: { messageId },
    });
  }

  /**
   * Get labels
   */
  async getLabels(): Promise<{ id: string; name: string; type: string }[]> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    await this.ensureValidToken();

    const response = await this.gmailClient.users.labels.list({ userId: 'me' });

    return (response.data.labels || []).map(label => ({
      id: label.id || '',
      name: label.name || '',
      type: label.type || 'user',
    }));
  }
}
