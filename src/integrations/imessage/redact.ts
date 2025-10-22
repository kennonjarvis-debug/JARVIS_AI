import { Logger } from '../../utils/logger';

export interface RedactionRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

export interface RedactionResult {
  original: string;
  redacted: string;
  redactionsApplied: number;
  wasRedacted: boolean;
}

export class MessageRedactor {
  private logger: Logger;
  private rules: RedactionRule[];

  constructor() {
    this.logger = new Logger('MessageRedactor');
    this.rules = this.getDefaultRules();
  }

  /**
   * Default redaction rules for privacy protection
   */
  private getDefaultRules(): RedactionRule[] {
    return [
      // Credit card numbers (various formats)
      {
        pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        replacement: '[CREDIT_CARD]',
        description: 'Credit card number'
      },

      // Social Security Numbers
      {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[SSN]',
        description: 'Social Security Number'
      },

      // Email addresses (but keep domain for context)
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL]',
        description: 'Email address'
      },

      // Phone numbers (various formats)
      {
        pattern: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
        replacement: '[PHONE]',
        description: 'Phone number'
      },

      // API keys and tokens (common patterns)
      {
        pattern: /\b[A-Za-z0-9_-]{32,}\b/g,
        replacement: '[API_KEY]',
        description: 'Potential API key or token'
      },

      // IP addresses
      {
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        replacement: '[IP_ADDRESS]',
        description: 'IP address'
      },

      // Passwords in common formats
      {
        pattern: /(?:password|pwd|pass|passwd)[\s:=]+[\S]+/gi,
        replacement: '[PASSWORD_REDACTED]',
        description: 'Password mention'
      },

      // Bitcoin addresses
      {
        pattern: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
        replacement: '[CRYPTO_ADDRESS]',
        description: 'Cryptocurrency address'
      },

      // AWS Access Keys
      {
        pattern: /\bAKIA[0-9A-Z]{16}\b/g,
        replacement: '[AWS_KEY]',
        description: 'AWS access key'
      },

      // URLs with auth tokens
      {
        pattern: /https?:\/\/[^\s]*(?:token|key|auth|api)[=\/][^\s&]*/gi,
        replacement: '[URL_WITH_AUTH]',
        description: 'URL with authentication'
      },

      // Home addresses (simplified pattern)
      {
        pattern: /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd)/gi,
        replacement: '[ADDRESS]',
        description: 'Street address'
      },

      // Dates of birth
      {
        pattern: /\b(?:0[1-9]|1[0-2])[/-](?:0[1-9]|[12][0-9]|3[01])[/-](?:19|20)\d{2}\b/g,
        replacement: '[DATE]',
        description: 'Date (potential DOB)'
      }
    ];
  }

  /**
   * Redact sensitive information from a message
   */
  public redact(message: string): RedactionResult {
    let redacted = message;
    let redactionsApplied = 0;

    for (const rule of this.rules) {
      const matches = message.match(rule.pattern);
      if (matches && matches.length > 0) {
        redacted = redacted.replace(rule.pattern, rule.replacement);
        redactionsApplied += matches.length;

        this.logger.info('Applied redaction rule', {
          description: rule.description,
          count: matches.length
        });
      }
    }

    const wasRedacted = redactionsApplied > 0;

    if (wasRedacted) {
      this.logger.warn('Message was redacted', {
        originalLength: message.length,
        redactedLength: redacted.length,
        redactionsApplied
      });
    }

    return {
      original: message,
      redacted,
      redactionsApplied,
      wasRedacted
    };
  }

  /**
   * Check if a message contains sensitive information without redacting
   */
  public containsSensitiveInfo(message: string): boolean {
    for (const rule of this.rules) {
      if (rule.pattern.test(message)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add a custom redaction rule
   */
  public addRule(rule: RedactionRule): void {
    this.rules.push(rule);
    this.logger.info('Added custom redaction rule', { description: rule.description });
  }

  /**
   * Remove a redaction rule by description
   */
  public removeRule(description: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.description !== description);
    const removed = this.rules.length < initialLength;

    if (removed) {
      this.logger.info('Removed redaction rule', { description });
    }

    return removed;
  }

  /**
   * Get all current redaction rules
   */
  public getRules(): RedactionRule[] {
    return [...this.rules];
  }

  /**
   * Specialized redaction for logging purposes
   * (more aggressive redaction)
   */
  public redactForLogs(message: string): string {
    const result = this.redact(message);

    // Additionally redact any long alphanumeric strings that might be sensitive
    let logSafe = result.redacted.replace(/\b[A-Za-z0-9]{20,}\b/g, '[REDACTED_TOKEN]');

    // Redact any remaining sequences that look like credentials
    logSafe = logSafe.replace(/['"]\w{16,}['"]/g, '"[REDACTED]"');

    return logSafe;
  }

  /**
   * Validate if a message is safe to send to AI
   * Returns true if safe, false if it contains sensitive info
   */
  public isSafeForAI(message: string): boolean {
    // Check for sensitive patterns
    if (this.containsSensitiveInfo(message)) {
      this.logger.warn('Message contains sensitive information', {
        messageLength: message.length
      });
      return false;
    }

    // Check for explicit requests to share sensitive data
    const dangerousPatterns = [
      /share\s+(?:my|your)?\s*(?:password|credit|card|ssn|social\s+security)/i,
      /what['']?s\s+(?:my|your)?\s*(?:password|pin|code|key)/i,
      /tell\s+(?:me|you)\s+(?:my|your)?\s*(?:password|secret|key)/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(message)) {
        this.logger.warn('Message requests sensitive information', {
          messagePreview: message.substring(0, 50)
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Prepare a message for AI processing
   * Redacts sensitive info and adds safety warning if needed
   */
  public prepareForAI(message: string): { text: string; warning?: string } {
    const result = this.redact(message);

    if (result.wasRedacted) {
      return {
        text: result.redacted,
        warning: `⚠️ Note: ${result.redactionsApplied} sensitive item(s) were redacted from the message for privacy.`
      };
    }

    return { text: message };
  }
}

/**
 * Singleton instance for easy access
 */
export const messageRedactor = new MessageRedactor();
