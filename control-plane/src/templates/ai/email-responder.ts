import { AIRouterService } from '../../services/ai/ai-router.service.js';
import { PromptManagerService } from '../../services/ai/prompt-manager.service.js';
import { logger } from '../../services/logger.service.js';

export interface EmailResponderConfig {
  aiRouter: AIRouterService;
  promptManager: PromptManagerService;
  tone?: 'professional' | 'friendly' | 'formal';
  maxLength?: number;
}

export interface Email {
  from: string;
  subject: string;
  body: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface EmailResponse {
  subject: string;
  body: string;
  tone: string;
  confidence: number;
  cost: number;
}

/**
 * Automated Email Responder Template
 * Intelligently drafts responses to incoming emails
 */
export class EmailResponderTemplate {
  private config: Required<EmailResponderConfig>;
  private aiRouter: AIRouterService;
  private promptManager: PromptManagerService;

  constructor(config: EmailResponderConfig) {
    this.config = {
      aiRouter: config.aiRouter,
      promptManager: config.promptManager,
      tone: config.tone || 'professional',
      maxLength: config.maxLength || 500,
    };

    this.aiRouter = config.aiRouter;
    this.promptManager = config.promptManager;

    logger.info('Email Responder template initialized');
  }

  /**
   * Analyze email and determine intent
   */
  private async analyzeEmail(email: Email): Promise<{
    intent: 'inquiry' | 'complaint' | 'request' | 'follow-up' | 'other';
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'low' | 'medium' | 'high';
    keywords: string[];
  }> {
    const prompt = `Analyze this email and provide structured information:

From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

Respond with JSON only:
{
  "intent": "inquiry|complaint|request|follow-up|other",
  "sentiment": "positive|neutral|negative",
  "urgency": "low|medium|high",
  "keywords": ["key1", "key2", "key3"]
}`;

    const response = await this.aiRouter.chat([
      { role: 'system', content: 'You are an email analysis assistant. Respond only with valid JSON.' },
      { role: 'user', content: prompt },
    ], { taskType: 'analysis' });

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        intent: 'other',
        sentiment: 'neutral',
        urgency: 'medium',
        keywords: [],
      };
    }
  }

  /**
   * Generate email response
   */
  async generateResponse(
    email: Email,
    context?: string
  ): Promise<EmailResponse> {
    logger.info('Generating email response', { from: email.from, subject: email.subject });

    // Analyze email first
    const analysis = await this.analyzeEmail(email);

    // Build prompt using template
    const prompt = this.promptManager.render('email-response', {
      tone: this.config.tone,
      email_content: `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`,
      context: context || `Intent: ${analysis.intent}, Sentiment: ${analysis.sentiment}`,
    });

    // Generate response
    const response = await this.aiRouter.chat([
      { role: 'user', content: prompt },
    ], { taskType: 'simple' });

    // Extract subject and body
    const lines = response.content.split('\n');
    const subjectLine = lines.find(l => l.startsWith('Subject:'));
    const subject = subjectLine
      ? subjectLine.replace('Subject:', '').trim()
      : `Re: ${email.subject}`;

    const bodyStart = response.content.indexOf('\n\n') + 2;
    const body = bodyStart > 1
      ? response.content.substring(bodyStart).trim()
      : response.content;

    return {
      subject,
      body,
      tone: this.config.tone,
      confidence: analysis.urgency === 'high' ? 0.7 : 0.9,
      cost: response.cost,
    };
  }

  /**
   * Batch process multiple emails
   */
  async processInbox(emails: Email[]): Promise<EmailResponse[]> {
    logger.info('Processing inbox', { count: emails.length });

    const responses = await Promise.all(
      emails.map(email => this.generateResponse(email))
    );

    return responses;
  }

  /**
   * Auto-respond to specific types of emails
   */
  async autoRespond(
    email: Email,
    rules: {
      autoRespondTo: ('inquiry' | 'request' | 'follow-up')[];
      requireApproval: boolean;
    }
  ): Promise<EmailResponse | null> {
    const analysis = await this.analyzeEmail(email);

    // Check if should auto-respond
    if (!rules.autoRespondTo.includes(analysis.intent)) {
      return null;
    }

    if (rules.requireApproval && analysis.urgency === 'high') {
      logger.info('High urgency email requires approval', { from: email.from });
      return null;
    }

    return this.generateResponse(email);
  }

  /**
   * Generate follow-up email
   */
  async generateFollowUp(
    originalEmail: Email,
    daysAfter: number = 3
  ): Promise<EmailResponse> {
    const prompt = `Generate a polite follow-up email for:

Original email sent ${daysAfter} days ago:
Subject: ${originalEmail.subject}
Body: ${originalEmail.body}

Create a brief, friendly follow-up that:
1. References the original email
2. Politely asks for an update
3. Offers assistance
4. Maintains ${this.config.tone} tone`;

    const response = await this.aiRouter.chat([
      { role: 'user', content: prompt },
    ], { taskType: 'simple' });

    return {
      subject: `Follow-up: ${originalEmail.subject}`,
      body: response.content,
      tone: this.config.tone,
      confidence: 0.9,
      cost: response.cost,
    };
  }

  /**
   * Summarize email thread
   */
  async summarizeThread(emails: Email[]): Promise<string> {
    const thread = emails
      .map(e => `From: ${e.from}\nDate: ${e.timestamp}\nSubject: ${e.subject}\n\n${e.body}`)
      .join('\n\n---\n\n');

    const response = await this.aiRouter.chat([
      {
        role: 'system',
        content: 'Summarize the following email thread concisely, highlighting key points and action items.',
      },
      { role: 'user', content: thread },
    ], { taskType: 'analysis' });

    return response.content;
  }
}

export default EmailResponderTemplate;
