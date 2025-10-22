/**
 * Gmail Integration for Jarvis
 *
 * Provides Gmail access using Gmail API:
 * - Read emails (inbox, unread, by label)
 * - Send emails / reply to threads
 * - Search emails
 * - Manage labels
 *
 * Uses OAuth 2.0 for authentication
 */

import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Logger } from '../../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface GmailEmail {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
  isUnread: boolean;
  labels: string[];
  snippet: string;
}

export interface GmailSendOptions {
  to: string | string[];
  subject: string;
  body: string;
  threadId?: string; // For replying to threads
  cc?: string[];
  bcc?: string[];
}

export interface GmailSearchOptions {
  query: string; // Gmail search query (e.g., "is:unread from:john@example.com")
  maxResults?: number;
  labelIds?: string[];
}

export class GmailIntegration {
  private logger: Logger;
  private oauth2Client: OAuth2Client;
  private gmail: gmail_v1.Gmail | null = null;
  private tokenPath: string;

  constructor() {
    this.logger = new Logger('GmailIntegration');
    this.tokenPath = path.join(os.homedir(), '.jarvis', 'gmail-token.json');

    // Initialize OAuth2 client
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Initialize Gmail API (load saved token or prompt for auth)
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Gmail integration');

    try {
      // Try to load saved token
      const tokenData = await fs.readFile(this.tokenPath, 'utf-8');
      const tokens = JSON.parse(tokenData);
      this.oauth2Client.setCredentials(tokens);

      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      this.logger.info('Gmail integration initialized with saved credentials');
    } catch (error) {
      this.logger.warn('No saved Gmail credentials found. Need to authorize.');
      throw new Error(
        'Gmail not authorized. Run `npm run gmail:auth` to authorize access.'
      );
    }
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async authorize(code: string): Promise<void> {
    this.logger.info('Exchanging authorization code for tokens');

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Save tokens to file
    await fs.mkdir(path.dirname(this.tokenPath), { recursive: true });
    await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));

    this.logger.info('Gmail credentials saved');

    // Initialize Gmail API
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Get unread emails
   */
  async getUnreadEmails(maxResults: number = 10): Promise<GmailEmail[]> {
    this.ensureInitialized();

    this.logger.info('Fetching unread emails', { maxResults });

    const response = await this.gmail!.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults,
    });

    const messages = response.data.messages || [];
    return await this.fetchEmailDetails(messages.map(m => m.id!));
  }

  /**
   * Get emails from inbox
   */
  async getInboxEmails(maxResults: number = 20): Promise<GmailEmail[]> {
    this.ensureInitialized();

    this.logger.info('Fetching inbox emails', { maxResults });

    const response = await this.gmail!.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults,
    });

    const messages = response.data.messages || [];
    return await this.fetchEmailDetails(messages.map(m => m.id!));
  }

  /**
   * Search emails by query
   */
  async searchEmails(options: GmailSearchOptions): Promise<GmailEmail[]> {
    this.ensureInitialized();

    this.logger.info('Searching emails', { query: options.query });

    const response = await this.gmail!.users.messages.list({
      userId: 'me',
      q: options.query,
      maxResults: options.maxResults || 20,
      labelIds: options.labelIds,
    });

    const messages = response.data.messages || [];
    return await this.fetchEmailDetails(messages.map(m => m.id!));
  }

  /**
   * Send email
   */
  async sendEmail(options: GmailSendOptions): Promise<string> {
    this.ensureInitialized();

    this.logger.info('Sending email', {
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
    });

    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const message = this.createEmailMessage(options);

    const response = await this.gmail!.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
        threadId: options.threadId,
      },
    });

    this.logger.info('Email sent successfully', { messageId: response.data.id });

    return response.data.id!;
  }

  /**
   * Reply to email thread
   */
  async replyToEmail(
    threadId: string,
    emailId: string,
    body: string
  ): Promise<string> {
    this.ensureInitialized();

    this.logger.info('Replying to email', { threadId, emailId });

    // Get original email to extract subject and recipient
    const original = await this.getEmailById(emailId);

    // Create reply with proper headers
    const subject = original.subject.startsWith('Re:')
      ? original.subject
      : `Re: ${original.subject}`;

    return this.sendEmail({
      to: original.from,
      subject,
      body,
      threadId,
    });
  }

  /**
   * Mark email as read
   */
  async markAsRead(emailId: string): Promise<void> {
    this.ensureInitialized();

    this.logger.info('Marking email as read', { emailId });

    await this.gmail!.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  }

  /**
   * Mark email as unread
   */
  async markAsUnread(emailId: string): Promise<void> {
    this.ensureInitialized();

    this.logger.info('Marking email as unread', { emailId });

    await this.gmail!.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        addLabelIds: ['UNREAD'],
      },
    });
  }

  /**
   * Get email by ID
   */
  async getEmailById(emailId: string): Promise<GmailEmail> {
    this.ensureInitialized();

    const response = await this.gmail!.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full',
    });

    return this.parseEmailMessage(response.data);
  }

  /**
   * Fetch details for multiple emails
   */
  private async fetchEmailDetails(messageIds: string[]): Promise<GmailEmail[]> {
    const emails: GmailEmail[] = [];

    for (const id of messageIds) {
      try {
        const email = await this.getEmailById(id);
        emails.push(email);
      } catch (error) {
        this.logger.warn('Failed to fetch email', { id, error });
      }
    }

    return emails;
  }

  /**
   * Parse Gmail API message into GmailEmail
   */
  private parseEmailMessage(message: gmail_v1.Schema$Message): GmailEmail {
    const headers = message.payload?.headers || [];

    const getHeader = (name: string): string => {
      const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
      return header?.value || '';
    };

    const from = getHeader('From');
    const to = getHeader('To').split(',').map(t => t.trim());
    const subject = getHeader('Subject');
    const date = new Date(parseInt(message.internalDate || '0'));

    // Extract body
    let body = '';
    const parts = message.payload?.parts || [];

    if (parts.length > 0) {
      // Multipart email
      const textPart = parts.find(p => p.mimeType === 'text/plain');
      const htmlPart = parts.find(p => p.mimeType === 'text/html');

      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      } else if (htmlPart?.body?.data) {
        body = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
      }
    } else if (message.payload?.body?.data) {
      // Simple email
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }

    const isUnread = message.labelIds?.includes('UNREAD') || false;
    const labels = message.labelIds || [];
    const snippet = message.snippet || '';

    return {
      id: message.id!,
      threadId: message.threadId!,
      from,
      to,
      subject,
      body,
      date,
      isUnread,
      labels,
      snippet,
    };
  }

  /**
   * Create RFC 2822 formatted email message
   */
  private createEmailMessage(options: GmailSendOptions): string {
    const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    const lines: string[] = [
      `To: ${recipients}`,
      `Subject: ${options.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      options.body,
    ];

    if (options.cc && options.cc.length > 0) {
      lines.splice(1, 0, `Cc: ${options.cc.join(', ')}`);
    }

    if (options.bcc && options.bcc.length > 0) {
      lines.splice(1, 0, `Bcc: ${options.bcc.join(', ')}`);
    }

    return lines.join('\r\n');
  }

  /**
   * Ensure Gmail API is initialized
   */
  private ensureInitialized(): void {
    if (!this.gmail) {
      throw new Error('Gmail not initialized. Call initialize() first.');
    }
  }
}
