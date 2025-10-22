import { describe, it, expect } from 'vitest';
import { MessageRedactor } from '../../../src/integrations/imessage/redact';

describe('MessageRedactor', () => {
  const redactor = new MessageRedactor();

  describe('redact()', () => {
    it('should redact credit card numbers', () => {
      const message = 'My card is 4532-1234-5678-9010';
      const result = redactor.redact(message);

      expect(result.wasRedacted).toBe(true);
      expect(result.redacted).toContain('[CREDIT_CARD]');
      expect(result.redacted).not.toContain('4532');
      expect(result.redactionsApplied).toBe(1);
    });

    it('should redact Social Security Numbers', () => {
      const message = 'My SSN is 123-45-6789';
      const result = redactor.redact(message);

      expect(result.wasRedacted).toBe(true);
      expect(result.redacted).toContain('[SSN]');
      expect(result.redactionsApplied).toBe(1);
    });

    it('should redact email addresses', () => {
      const message = 'Contact me at john@example.com';
      const result = redactor.redact(message);

      expect(result.wasRedacted).toBe(true);
      expect(result.redacted).toContain('[EMAIL]');
      expect(result.redacted).not.toContain('john@example.com');
    });

    it('should redact phone numbers', () => {
      const message = 'Call me at (555) 123-4567';
      const result = redactor.redact(message);

      expect(result.wasRedacted).toBe(true);
      expect(result.redacted).toContain('[PHONE]');
    });

    it('should redact multiple sensitive items', () => {
      const message = 'Card: 4532-1234-5678-9010, SSN: 123-45-6789, Email: test@example.com';
      const result = redactor.redact(message);

      expect(result.wasRedacted).toBe(true);
      expect(result.redactionsApplied).toBe(3);
      expect(result.redacted).toContain('[CREDIT_CARD]');
      expect(result.redacted).toContain('[SSN]');
      expect(result.redacted).toContain('[EMAIL]');
    });

    it('should not redact non-sensitive text', () => {
      const message = 'Hello, how are you today?';
      const result = redactor.redact(message);

      expect(result.wasRedacted).toBe(false);
      expect(result.redacted).toBe(message);
      expect(result.redactionsApplied).toBe(0);
    });

    it('should redact passwords in common formats', () => {
      const message = 'password: MySecret123';
      const result = redactor.redact(message);

      expect(result.wasRedacted).toBe(true);
      expect(result.redacted).toContain('[PASSWORD_REDACTED]');
    });

    it('should redact API keys (long alphanumeric strings)', () => {
      const message = 'API key: sk_test_51234567890abcdefghijklmnopqrstuv';
      const result = redactor.redact(message);

      expect(result.wasRedacted).toBe(true);
      expect(result.redacted).toContain('[API_KEY]');
    });
  });

  describe('containsSensitiveInfo()', () => {
    it('should detect sensitive information', () => {
      expect(redactor.containsSensitiveInfo('My card is 4532-1234-5678-9010')).toBe(true);
      expect(redactor.containsSensitiveInfo('SSN: 123-45-6789')).toBe(true);
      expect(redactor.containsSensitiveInfo('Email: test@example.com')).toBe(true);
    });

    it('should return false for non-sensitive text', () => {
      expect(redactor.containsSensitiveInfo('Hello world')).toBe(false);
      expect(redactor.containsSensitiveInfo('How can I help you?')).toBe(false);
    });
  });

  describe('isSafeForAI()', () => {
    it('should return false for messages with sensitive info', () => {
      expect(redactor.isSafeForAI('My card is 4532-1234-5678-9010')).toBe(false);
      expect(redactor.isSafeForAI('password: secret123')).toBe(false);
    });

    it('should return false for requests to share sensitive data', () => {
      expect(redactor.isSafeForAI('What is your password?')).toBe(false);
      expect(redactor.isSafeForAI('Share my credit card info')).toBe(false);
      expect(redactor.isSafeForAI('Tell me your API key')).toBe(false);
    });

    it('should return true for safe messages', () => {
      expect(redactor.isSafeForAI('Hello, how are you?')).toBe(true);
      expect(redactor.isSafeForAI('What features does DAWG AI have?')).toBe(true);
      expect(redactor.isSafeForAI('Can you help me with my project?')).toBe(true);
    });
  });

  describe('prepareForAI()', () => {
    it('should redact and add warning for sensitive messages', () => {
      const result = redactor.prepareForAI('My card is 4532-1234-5678-9010');

      expect(result.text).toContain('[CREDIT_CARD]');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('redacted');
    });

    it('should return message as-is if safe', () => {
      const message = 'Hello world';
      const result = redactor.prepareForAI(message);

      expect(result.text).toBe(message);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('addRule()', () => {
    it('should allow adding custom redaction rules', () => {
      const customRedactor = new MessageRedactor();

      customRedactor.addRule({
        pattern: /\bTEST-\d{4}\b/g,
        replacement: '[TEST_ID]',
        description: 'Test ID'
      });

      const result = customRedactor.redact('Reference: TEST-1234');

      expect(result.wasRedacted).toBe(true);
      expect(result.redacted).toContain('[TEST_ID]');
    });
  });

  describe('redactForLogs()', () => {
    it('should apply more aggressive redaction for logs', () => {
      const message = 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const redacted = redactor.redactForLogs(message);

      // Should redact long alphanumeric strings
      expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });
});
