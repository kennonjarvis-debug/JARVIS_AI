/**
 * Tests for Email Integration
 *
 * Comprehensive test suite for EmailAdapter class covering SendGrid integration,
 * email sending, templates, and error handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import {
  EmailAdapter,
  EmailConfig,
  EmailMessage,
  EmailTemplate,
  createEmailAdapterFromEnv,
} from './email';
import { JarvisError, ErrorCode } from '../utils/error-handler';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('EmailAdapter', () => {
  let config: EmailConfig;
  let mockCreate: any;
  let mockPost: any;
  let mockGet: any;

  beforeEach(() => {
    config = {
      provider: 'sendgrid',
      apiKey: 'test-api-key',
      fromAddress: 'noreply@dawgai.com',
      fromName: 'DAWG AI',
    };

    mockPost = vi.fn();
    mockGet = vi.fn();

    mockCreate = vi.fn().mockReturnValue({
      post: mockPost,
      get: mockGet,
    });

    mockedAxios.create = mockCreate;
    mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create EmailAdapter with SendGrid provider', () => {
      const adapter = new EmailAdapter(config);

      expect(adapter).toBeInstanceOf(EmailAdapter);
      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: 'https://api.sendgrid.com/v3',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    });

    it('should throw error for unsupported provider (mailgun)', () => {
      const invalidConfig = { ...config, provider: 'mailgun' as const };

      expect(() => new EmailAdapter(invalidConfig)).toThrow(JarvisError);
      expect(() => new EmailAdapter(invalidConfig)).toThrow('Mailgun provider not yet implemented');
    });

    it('should throw error for unsupported provider (ses)', () => {
      const invalidConfig = { ...config, provider: 'ses' as const };

      expect(() => new EmailAdapter(invalidConfig)).toThrow(JarvisError);
      expect(() => new EmailAdapter(invalidConfig)).toThrow('AWS SES provider not yet implemented');
    });

    it('should support sandbox mode', () => {
      const sandboxConfig = { ...config, sandboxMode: true };
      const adapter = new EmailAdapter(sandboxConfig);

      expect(adapter).toBeInstanceOf(EmailAdapter);
    });
  });

  describe('sendEmail', () => {
    let adapter: EmailAdapter;

    beforeEach(() => {
      adapter = new EmailAdapter(config);
    });

    it('should send single email successfully', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: { 'x-message-id': 'msg-123' },
      });

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Hello World</p>',
      };

      const result = await adapter.sendEmail(message);

      expect(result).toEqual({
        messageId: 'msg-123',
        status: 'sent',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/mail/send',
        expect.objectContaining({
          personalizations: expect.arrayContaining([
            expect.objectContaining({
              to: [{ email: 'user@example.com' }],
              subject: 'Test Email',
            }),
          ]),
        })
      );
    });

    it('should send email with HTML and plain text', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: { 'x-message-id': 'msg-124' },
      });

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>HTML version</p>',
        text: 'Plain text version',
      };

      await adapter.sendEmail(message);

      expect(mockPost).toHaveBeenCalledWith(
        '/mail/send',
        expect.objectContaining({
          content: expect.arrayContaining([
            { type: 'text/html', value: '<p>HTML version</p>' },
            { type: 'text/plain', value: 'Plain text version' },
          ]),
        })
      );
    });

    it('should send email to multiple recipients', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: { 'x-message-id': 'msg-125' },
      });

      const message: EmailMessage = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test',
        html: '<p>Hello</p>',
      };

      await adapter.sendEmail(message);

      expect(mockPost).toHaveBeenCalledWith(
        '/mail/send',
        expect.objectContaining({
          personalizations: expect.arrayContaining([
            expect.objectContaining({
              to: [
                { email: 'user1@example.com' },
                { email: 'user2@example.com' },
              ],
            }),
          ]),
        })
      );
    });

    it('should send email with CC recipients', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: { 'x-message-id': 'msg-126' },
      });

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        cc: ['cc@example.com'],
      };

      await adapter.sendEmail(message);

      expect(mockPost).toHaveBeenCalledWith(
        '/mail/send',
        expect.objectContaining({
          personalizations: expect.arrayContaining([
            expect.objectContaining({
              cc: [{ email: 'cc@example.com' }],
            }),
          ]),
        })
      );
    });

    it('should send email with BCC recipients', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: { 'x-message-id': 'msg-127' },
      });

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        bcc: ['bcc@example.com'],
      };

      await adapter.sendEmail(message);

      expect(mockPost).toHaveBeenCalledWith(
        '/mail/send',
        expect.objectContaining({
          personalizations: expect.arrayContaining([
            expect.objectContaining({
              bcc: [{ email: 'bcc@example.com' }],
            }),
          ]),
        })
      );
    });

    it('should send email with reply-to address', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: { 'x-message-id': 'msg-128' },
      });

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        replyTo: 'reply@dawgai.com',
      };

      await adapter.sendEmail(message);

      expect(mockPost).toHaveBeenCalledWith(
        '/mail/send',
        expect.objectContaining({
          reply_to: { email: 'reply@dawgai.com' },
        })
      );
    });

    it('should send email with attachments', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: { 'x-message-id': 'msg-129' },
      });

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        attachments: [
          {
            filename: 'document.pdf',
            content: Buffer.from('PDF content'),
            type: 'application/pdf',
          },
        ],
      };

      await adapter.sendEmail(message);

      expect(mockPost).toHaveBeenCalledWith(
        '/mail/send',
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'document.pdf',
              content: Buffer.from('PDF content').toString('base64'),
              type: 'application/pdf',
            }),
          ]),
        })
      );
    });

    it('should throw validation error for missing recipient', async () => {
      const message: EmailMessage = {
        to: '',
        subject: 'Test',
        html: '<p>Hello</p>',
      };

      await expect(adapter.sendEmail(message)).rejects.toThrow(JarvisError);
      await expect(adapter.sendEmail(message)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should throw validation error for missing subject', async () => {
      const message: EmailMessage = {
        to: 'user@example.com',
        subject: '',
        html: '<p>Hello</p>',
      };

      await expect(adapter.sendEmail(message)).rejects.toThrow(JarvisError);
      await expect(adapter.sendEmail(message)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should throw validation error for missing HTML content', async () => {
      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '',
      };

      await expect(adapter.sendEmail(message)).rejects.toThrow(JarvisError);
      await expect(adapter.sendEmail(message)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should throw validation error for invalid email address', async () => {
      const message: EmailMessage = {
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Hello</p>',
      };

      await expect(adapter.sendEmail(message)).rejects.toThrow(JarvisError);
      await expect(adapter.sendEmail(message)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
        message: expect.stringContaining('Invalid email address'),
      });
    });

    it('should handle rate limiting error', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
        },
        isAxiosError: true,
      });

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      };

      await expect(adapter.sendEmail(message)).rejects.toThrow(JarvisError);
      await expect(adapter.sendEmail(message)).rejects.toMatchObject({
        code: ErrorCode.RATE_LIMIT_ERROR,
      });
    });

    it('should handle authentication error', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 401,
        },
        isAxiosError: true,
      });

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      };

      await expect(adapter.sendEmail(message)).rejects.toThrow(JarvisError);
      await expect(adapter.sendEmail(message)).rejects.toMatchObject({
        code: ErrorCode.AUTHENTICATION_ERROR,
      });
    });

    it('should handle bad request error', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'Invalid payload' },
        },
        isAxiosError: true,
      });

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      };

      await expect(adapter.sendEmail(message)).rejects.toThrow(JarvisError);
      await expect(adapter.sendEmail(message)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should handle generic integration error', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      };

      await expect(adapter.sendEmail(message)).rejects.toThrow(JarvisError);
      await expect(adapter.sendEmail(message)).rejects.toMatchObject({
        code: ErrorCode.INTEGRATION_ERROR,
      });
    });

    it('should generate fallback message ID if header missing', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: {}, // No x-message-id
      });

      const message: EmailMessage = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      };

      const result = await adapter.sendEmail(message);

      expect(result.messageId).toMatch(/^jarvis-/);
      expect(result.status).toBe('sent');
    });
  });

  describe('sendBulkEmail', () => {
    let adapter: EmailAdapter;

    beforeEach(() => {
      adapter = new EmailAdapter(config);
    });

    it('should send bulk emails successfully', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: { 'x-message-id': 'msg-bulk-1' },
      });

      const messages: EmailMessage[] = [
        { to: 'user1@example.com', subject: 'Test 1', html: '<p>Hello 1</p>' },
        { to: 'user2@example.com', subject: 'Test 2', html: '<p>Hello 2</p>' },
        { to: 'user3@example.com', subject: 'Test 3', html: '<p>Hello 3</p>' },
      ];

      const result = await adapter.sendBulkEmail(messages);

      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(mockPost).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk send', async () => {
      mockPost
        .mockResolvedValueOnce({
          status: 202,
          headers: { 'x-message-id': 'msg-1' },
        })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({
          status: 202,
          headers: { 'x-message-id': 'msg-3' },
        });

      const messages: EmailMessage[] = [
        { to: 'user1@example.com', subject: 'Test 1', html: '<p>Hello 1</p>' },
        { to: 'user2@example.com', subject: 'Test 2', html: '<p>Hello 2</p>' },
        { to: 'user3@example.com', subject: 'Test 3', html: '<p>Hello 3</p>' },
      ];

      const result = await adapter.sendBulkEmail(messages);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(3);
      expect(result.results[1].status).toBe('failed');
    });

    it('should return empty result for empty message array', async () => {
      const result = await adapter.sendBulkEmail([]);

      expect(result).toEqual({
        sent: 0,
        failed: 0,
        results: [],
      });
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('should throw error for bulk limit exceeded', async () => {
      const messages = Array(1001).fill({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      await expect(adapter.sendBulkEmail(messages)).rejects.toThrow(JarvisError);
      await expect(adapter.sendBulkEmail(messages)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
        message: expect.stringContaining('1000'),
      });
    });
  });

  describe('sendTemplatedEmail', () => {
    let adapter: EmailAdapter;

    beforeEach(() => {
      adapter = new EmailAdapter(config);
    });

    it('should send email using template', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: { 'x-message-id': 'msg-template-1' },
      });

      const template: EmailTemplate = {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome {{name}}!',
        html: '<h1>Hello {{name}}</h1><p>Welcome to {{company}}</p>',
        variables: ['name', 'company'],
      };

      adapter.registerTemplate(template);

      const result = await adapter.sendTemplatedEmail('welcome', 'user@example.com', {
        name: 'John',
        company: 'DAWG AI',
      });

      expect(result.status).toBe('sent');
      expect(mockPost).toHaveBeenCalledWith(
        '/mail/send',
        expect.objectContaining({
          personalizations: expect.arrayContaining([
            expect.objectContaining({
              subject: 'Welcome John!',
            }),
          ]),
          content: expect.arrayContaining([
            expect.objectContaining({
              value: '<h1>Hello John</h1><p>Welcome to DAWG AI</p>',
            }),
          ]),
        })
      );
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        adapter.sendTemplatedEmail('non-existent', 'user@example.com', {})
      ).rejects.toThrow(JarvisError);

      await expect(
        adapter.sendTemplatedEmail('non-existent', 'user@example.com', {})
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should substitute multiple variables', async () => {
      mockPost.mockResolvedValue({
        status: 202,
        headers: { 'x-message-id': 'msg-template-2' },
      });

      const template: EmailTemplate = {
        id: 'multi-var',
        name: 'Multi Variable',
        subject: '{{greeting}} {{name}}',
        html: '<p>{{var1}} and {{var2}} and {{var3}}</p>',
        variables: ['greeting', 'name', 'var1', 'var2', 'var3'],
      };

      adapter.registerTemplate(template);

      await adapter.sendTemplatedEmail('multi-var', 'user@example.com', {
        greeting: 'Hello',
        name: 'Alice',
        var1: 'A',
        var2: 'B',
        var3: 'C',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/mail/send',
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              value: '<p>A and B and C</p>',
            }),
          ]),
        })
      );
    });
  });

  describe('getEmailStats', () => {
    let adapter: EmailAdapter;

    beforeEach(() => {
      adapter = new EmailAdapter(config);
    });

    it('should retrieve email statistics', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          status: 'delivered',
          opens: 2,
          clicks: 1,
          last_event_time: '2025-10-15T12:00:00Z',
        },
      });

      const stats = await adapter.getEmailStats('msg-123');

      expect(stats).toEqual({
        messageId: 'msg-123',
        delivered: true,
        opened: true,
        clicked: true,
        bounced: false,
        timestamp: new Date('2025-10-15T12:00:00Z'),
        openCount: 2,
        clickCount: 1,
      });

      expect(mockGet).toHaveBeenCalledWith('/messages/msg-123');
    });

    it('should handle bounced email stats', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          status: 'bounced',
          opens: 0,
          clicks: 0,
          last_event_time: '2025-10-15T12:00:00Z',
        },
      });

      const stats = await adapter.getEmailStats('msg-bounced');

      expect(stats.bounced).toBe(true);
      expect(stats.delivered).toBe(false);
    });

    it('should handle stats not found (404)', async () => {
      mockGet.mockRejectedValue({
        response: { status: 404 },
        isAxiosError: true,
      });

      const stats = await adapter.getEmailStats('msg-not-found');

      expect(stats).toMatchObject({
        messageId: 'msg-not-found',
        delivered: false,
        opened: false,
        clicked: false,
        bounced: false,
      });
    });

    it('should throw error for other API failures', async () => {
      mockGet.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error',
        isAxiosError: true,
      });

      await expect(adapter.getEmailStats('msg-error')).rejects.toThrow(JarvisError);
      await expect(adapter.getEmailStats('msg-error')).rejects.toMatchObject({
        code: ErrorCode.INTEGRATION_ERROR,
      });
    });
  });

  describe('registerTemplate and loadTemplates', () => {
    let adapter: EmailAdapter;

    beforeEach(() => {
      adapter = new EmailAdapter(config);
    });

    it('should register single template', () => {
      const template: EmailTemplate = {
        id: 'test',
        name: 'Test Template',
        subject: 'Test',
        html: '<p>Test</p>',
        variables: [],
      };

      adapter.registerTemplate(template);

      // Should not throw when sending with this template
      expect(() => adapter.registerTemplate(template)).not.toThrow();
    });

    it('should load multiple templates', () => {
      const templates: EmailTemplate[] = [
        {
          id: 'template1',
          name: 'Template 1',
          subject: 'Subject 1',
          html: '<p>Body 1</p>',
          variables: [],
        },
        {
          id: 'template2',
          name: 'Template 2',
          subject: 'Subject 2',
          html: '<p>Body 2</p>',
          variables: [],
        },
      ];

      adapter.loadTemplates(templates);

      // Should not throw
      expect(() => adapter.loadTemplates(templates)).not.toThrow();
    });
  });
});

describe('createEmailAdapterFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create adapter from environment variables', () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.EMAIL_FROM_ADDRESS = 'test@example.com';
    process.env.EMAIL_FROM_NAME = 'Test';

    const adapter = createEmailAdapterFromEnv();

    expect(adapter).toBeInstanceOf(EmailAdapter);
  });

  it('should throw error if API key not set', () => {
    process.env.EMAIL_FROM_ADDRESS = 'test@example.com';
    delete process.env.SENDGRID_API_KEY;
    delete process.env.EMAIL_API_KEY;

    expect(() => createEmailAdapterFromEnv()).toThrow(JarvisError);
    expect(() => createEmailAdapterFromEnv()).toThrow('Email API key not configured');
  });

  it('should throw error if from address not set', () => {
    process.env.SENDGRID_API_KEY = 'test-key';
    delete process.env.EMAIL_FROM_ADDRESS;

    expect(() => createEmailAdapterFromEnv()).toThrow(JarvisError);
    expect(() => createEmailAdapterFromEnv()).toThrow('Email from address not configured');
  });

  it('should use default provider if not specified', () => {
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.EMAIL_FROM_ADDRESS = 'test@example.com';
    delete process.env.EMAIL_PROVIDER;

    const adapter = createEmailAdapterFromEnv();

    expect(adapter).toBeInstanceOf(EmailAdapter);
  });

  it('should enable sandbox mode from environment', () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.EMAIL_FROM_ADDRESS = 'test@example.com';
    process.env.EMAIL_SANDBOX_MODE = 'true';

    const adapter = createEmailAdapterFromEnv();

    expect(adapter).toBeInstanceOf(EmailAdapter);
  });
});
