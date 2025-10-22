import { Logger } from '../../utils/logger';
import { IMessage } from './reader';

export enum MessageIntent {
  QUESTION = 'question',
  COMMAND = 'command',
  GREETING = 'greeting',
  SUPPORT_REQUEST = 'support',
  MARKETING_INQUIRY = 'marketing',
  SALES_INQUIRY = 'sales',
  FEEDBACK = 'feedback',
  URGENT = 'urgent',
  CASUAL = 'casual',
  // Personal contexts
  DATING = 'dating',
  PERSONAL = 'personal',
  MEDICAL = 'medical',
  FAMILY = 'family',
  FRIEND = 'friend',
  UNKNOWN = 'unknown'
}

export enum ResponseAction {
  AUTO_RESPOND = 'auto_respond',
  REQUEST_APPROVAL = 'request_approval',
  IGNORE = 'ignore',
  ESCALATE = 'escalate'
}

export interface RoutingDecision {
  intent: MessageIntent;
  action: ResponseAction;
  confidence: number; // 0-1
  suggestedAgent?: string; // Which Jarvis agent should handle this
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export class MessageRouter {
  private logger: Logger;
  private allowedContacts: Set<string>;
  private blockedContacts: Set<string>;

  constructor() {
    this.logger = new Logger('MessageRouter');
    this.allowedContacts = new Set();
    this.blockedContacts = new Set();
  }

  /**
   * Analyze a message and determine how to route it
   */
  public route(message: IMessage): RoutingDecision {
    this.logger.info('Routing message', {
      from: this.redactHandle(message.handleName),
      textLength: message.text.length
    });

    // Check if sender is blocked
    if (this.isBlocked(message.handleName)) {
      return {
        intent: MessageIntent.UNKNOWN,
        action: ResponseAction.IGNORE,
        confidence: 1.0,
        reason: 'Sender is blocked',
        priority: 'low'
      };
    }

    // Detect intent
    const intent = this.detectIntent(message.text);

    // Determine action based on intent and sender
    const action = this.determineAction(intent, message);

    // Assign to appropriate Jarvis agent
    const suggestedAgent = this.selectAgent(intent);

    // Calculate priority
    const priority = this.calculatePriority(intent, message);

    return {
      intent,
      action,
      confidence: this.calculateConfidence(intent, message.text),
      suggestedAgent,
      reason: this.getReasonForAction(intent, action),
      priority
    };
  }

  /**
   * Detect the intent of a message
   */
  private detectIntent(text: string): MessageIntent {
    const lowerText = text.toLowerCase().trim();

    // Urgent keywords
    if (this.matchesPatterns(lowerText, [
      /\b(urgent|emergency|asap|immediately|help me now|critical|broken|down)\b/i,
      /\b(can't|cannot)\s+(access|login|use|work)/i
    ])) {
      return MessageIntent.URGENT;
    }

    // Medical/Doctor context
    if (this.matchesPatterns(lowerText, [
      /\b(doctor|dr\.|appointment|medical|health|medicine|prescription|symptom|sick|pain|injury|hospital|clinic)\b/i,
      /\b(feel|feeling)\s+(sick|ill|unwell|bad)/i
    ])) {
      return MessageIntent.MEDICAL;
    }

    // Dating context
    if (this.matchesPatterns(lowerText, [
      /\b(date|dating|dinner|drinks|coffee|hang\s*out|meet\s*up|see\s*you|tonight|tomorrow\s*night)\b/i,
      /\b(beautiful|handsome|cute|hot|sexy|attractive)/i,
      /\b(restaurant|movie|bar|drinks|wine|romantic)/i,
      /\b(miss\s*you|thinking\s*of\s*you|can't\s*wait|excited\s*to\s*see)/i,
      /\b(boyfriend|girlfriend|babe|baby|honey|sweetie|darling)/i,
      /❤|💕|😘|😍|🥰/
    ])) {
      return MessageIntent.DATING;
    }

    // Family context
    if (this.matchesPatterns(lowerText, [
      /\b(mom|dad|mother|father|sister|brother|grandma|grandpa|aunt|uncle|cousin|family)\b/i,
      /\b(parents|kids|children|son|daughter)\b/i
    ])) {
      return MessageIntent.FAMILY;
    }

    // Friend context
    if (this.matchesPatterns(lowerText, [
      /\b(dude|bro|man|buddy|pal|friend|homie|mate)\b/i,
      /\b(party|game|chill|hangout|weekend|plans)\b/i,
      /\b(lol|lmao|haha|omg|wtf|bruh)\b/i,
      /😂|🤣|👊|🔥|💯/
    ])) {
      return MessageIntent.FRIEND;
    }

    // Support requests
    if (this.matchesPatterns(lowerText, [
      /\b(help|support|issue|problem|bug|error|not working|broken|fix)\b/i,
      /how\s+(?:do|can)\s+i/i,
      /\b(troubleshoot|assist|assistance)\b/i
    ])) {
      return MessageIntent.SUPPORT_REQUEST;
    }

    // Sales inquiries
    if (this.matchesPatterns(lowerText, [
      /\b(price|pricing|cost|buy|purchase|upgrade|premium|pro|plan|subscription)\b/i,
      /how\s+much/i,
      /\b(discount|deal|offer|trial)\b/i
    ])) {
      return MessageIntent.SALES_INQUIRY;
    }

    // Marketing inquiries
    if (this.matchesPatterns(lowerText, [
      /\b(feature|features|what\s+(?:can|does)|capabilities|demo)\b/i,
      /tell\s+me\s+(?:about|more)/i,
      /\b(product|service|offering)\b/i
    ])) {
      return MessageIntent.MARKETING_INQUIRY;
    }

    // Commands
    if (this.matchesPatterns(lowerText, [
      /^(start|stop|pause|resume|cancel|update|status|show|get|set)\b/i,
      /\b(execute|run|perform|do)\b.*\b(task|action|command)\b/i
    ])) {
      return MessageIntent.COMMAND;
    }

    // Questions
    if (this.matchesPatterns(lowerText, [
      /\?$/,
      /^(what|when|where|why|how|who|which|can|could|would|should|is|are|do|does)\b/i
    ])) {
      return MessageIntent.QUESTION;
    }

    // Greetings
    if (this.matchesPatterns(lowerText, [
      /^(hi|hey|hello|good\s+(?:morning|afternoon|evening)|yo|sup|what's\s+up)\b/i
    ])) {
      return MessageIntent.GREETING;
    }

    // Feedback
    if (this.matchesPatterns(lowerText, [
      /\b(feedback|suggestion|recommend|love|hate|great|terrible|awesome|sucks)\b/i,
      /\b(improve|better|worse|like|dislike)\b/i
    ])) {
      return MessageIntent.FEEDBACK;
    }

    // Personal (catch-all for personal but not clearly categorized)
    if (this.matchesPatterns(lowerText, [
      /\b(my|me|i'm|i am|personal|private)\b/i,
      /\b(feel|feeling|think|thought|believe)\b/i
    ])) {
      return MessageIntent.PERSONAL;
    }

    // Casual conversation
    if (text.length < 50 && !text.includes('?')) {
      return MessageIntent.CASUAL;
    }

    return MessageIntent.UNKNOWN;
  }

  /**
   * Determine what action to take
   */
  private determineAction(intent: MessageIntent, message: IMessage): ResponseAction {
    // Check if sender is blocked
    if (this.isBlocked(message.handleName)) {
      return ResponseAction.IGNORE;
    }

    // Urgent messages always get escalated
    if (intent === MessageIntent.URGENT) {
      return ResponseAction.ESCALATE;
    }

    // Auto-respond to ALL intents (except commands and unknown)
    const autoRespondIntents = [
      MessageIntent.QUESTION,
      MessageIntent.GREETING,
      MessageIntent.SUPPORT_REQUEST,
      MessageIntent.MARKETING_INQUIRY,
      MessageIntent.SALES_INQUIRY,
      MessageIntent.FEEDBACK,
      MessageIntent.DATING,
      MessageIntent.PERSONAL,
      MessageIntent.MEDICAL,
      MessageIntent.FAMILY,
      MessageIntent.FRIEND,
      MessageIntent.CASUAL
    ];

    if (autoRespondIntents.includes(intent)) {
      return ResponseAction.AUTO_RESPOND;
    }

    // Commands require approval
    if (intent === MessageIntent.COMMAND) {
      return ResponseAction.REQUEST_APPROVAL;
    }

    // Unknown intents: auto-respond with general response
    return ResponseAction.AUTO_RESPOND;
  }

  /**
   * Select which Jarvis agent should handle this message
   */
  private selectAgent(intent: MessageIntent): string {
    const agentMap: Record<MessageIntent, string> = {
      [MessageIntent.SUPPORT_REQUEST]: 'support',
      [MessageIntent.URGENT]: 'support',
      [MessageIntent.SALES_INQUIRY]: 'sales',
      [MessageIntent.MARKETING_INQUIRY]: 'marketing',
      [MessageIntent.FEEDBACK]: 'support',
      [MessageIntent.QUESTION]: 'support',
      [MessageIntent.COMMAND]: 'operations',
      [MessageIntent.GREETING]: 'personal',
      [MessageIntent.CASUAL]: 'personal',
      // Personal contexts use 'personal' agent with context-aware responses
      [MessageIntent.DATING]: 'personal',
      [MessageIntent.PERSONAL]: 'personal',
      [MessageIntent.MEDICAL]: 'personal',
      [MessageIntent.FAMILY]: 'personal',
      [MessageIntent.FRIEND]: 'personal',
      [MessageIntent.UNKNOWN]: 'operations'
    };

    return agentMap[intent] || 'operations';
  }

  /**
   * Calculate message priority
   */
  private calculatePriority(intent: MessageIntent, message: IMessage): 'low' | 'medium' | 'high' | 'urgent' {
    if (intent === MessageIntent.URGENT) {
      return 'urgent';
    }

    if (intent === MessageIntent.SUPPORT_REQUEST) {
      return 'high';
    }

    if (intent === MessageIntent.SALES_INQUIRY || intent === MessageIntent.COMMAND) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Calculate confidence in the routing decision
   */
  private calculateConfidence(intent: MessageIntent, text: string): number {
    // Higher confidence for clearer intents
    const confidenceMap: Record<MessageIntent, number> = {
      [MessageIntent.URGENT]: 0.95,
      [MessageIntent.COMMAND]: 0.90,
      [MessageIntent.QUESTION]: 0.85,
      [MessageIntent.SUPPORT_REQUEST]: 0.85,
      [MessageIntent.GREETING]: 0.90,
      [MessageIntent.SALES_INQUIRY]: 0.80,
      [MessageIntent.MARKETING_INQUIRY]: 0.75,
      [MessageIntent.FEEDBACK]: 0.70,
      [MessageIntent.CASUAL]: 0.60,
      [MessageIntent.UNKNOWN]: 0.30
    };

    return confidenceMap[intent] || 0.5;
  }

  /**
   * Get human-readable reason for the action
   */
  private getReasonForAction(intent: MessageIntent, action: ResponseAction): string {
    const reasons: Record<string, string> = {
      [`${MessageIntent.URGENT}_${ResponseAction.ESCALATE}`]: 'Urgent message requires immediate attention',
      [`${MessageIntent.SUPPORT_REQUEST}_${ResponseAction.AUTO_RESPOND}`]: 'Support request can be handled automatically',
      [`${MessageIntent.SALES_INQUIRY}_${ResponseAction.AUTO_RESPOND}`]: 'Sales inquiry can be answered automatically',
      [`${MessageIntent.COMMAND}_${ResponseAction.REQUEST_APPROVAL}`]: 'Commands require approval before execution',
      [`${MessageIntent.GREETING}_${ResponseAction.AUTO_RESPOND}`]: 'Greeting can be responded to automatically',
      [`${MessageIntent.UNKNOWN}_${ResponseAction.REQUEST_APPROVAL}`]: 'Unknown intent requires human review'
    };

    const key = `${intent}_${action}`;
    return reasons[key] || 'Based on routing rules';
  }

  /**
   * Helper: Check if text matches any of the patterns
   */
  private matchesPatterns(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Contact management
   */

  public addAllowedContact(handle: string): void {
    this.allowedContacts.add(handle.toLowerCase());
    this.logger.info('Added allowed contact', { handle: this.redactHandle(handle) });
  }

  public removeAllowedContact(handle: string): void {
    this.allowedContacts.delete(handle.toLowerCase());
    this.logger.info('Removed allowed contact', { handle: this.redactHandle(handle) });
  }

  public isAllowed(handle: string): boolean {
    return this.allowedContacts.has(handle.toLowerCase());
  }

  public blockContact(handle: string): void {
    this.blockedContacts.add(handle.toLowerCase());
    this.logger.info('Blocked contact', { handle: this.redactHandle(handle) });
  }

  public unblockContact(handle: string): void {
    this.blockedContacts.delete(handle.toLowerCase());
    this.logger.info('Unblocked contact', { handle: this.redactHandle(handle) });
  }

  public isBlocked(handle: string): boolean {
    return this.blockedContacts.has(handle.toLowerCase());
  }

  private redactHandle(handle: string): string {
    if (handle.includes('@')) {
      const parts = handle.split('@');
      return `${parts[0].substring(0, 2)}***@${parts[1]}`;
    }
    return `***${handle.slice(-4)}`;
  }
}
