/**
 * iMessage Agent Types
 */

export interface IMessage {
  id: number;
  guid: string;
  text: string;
  handle: string; // Phone number or email
  isFromMe: boolean;
  dateCreated: Date;
  dateRead: Date | null;
  serviceName: string; // 'iMessage' or 'SMS'
  chatId: number;
}

export interface Contact {
  handle: string;
  name?: string;
  relationshipType: 'dating' | 'friend' | 'family' | 'business' | 'acquaintance' | 'unknown';
  autoResponseEnabled: boolean;
  lastResponseTime?: Date;
  responseCount: number;
  customPrompt?: string; // Custom AI instructions for this contact
  metadata?: Record<string, any>;
}

export interface ResponseLog {
  id: string;
  handle: string;
  messageReceived: string;
  messageReplied: string;
  timestamp: Date;
  aiModel: string;
  confidence: number;
}

export interface AutoResponseConfig {
  enabled: boolean;
  whitelist: string[]; // Phone numbers/emails allowed to get auto-responses
  blacklist: string[]; // Never respond to these
  rateLimits: {
    maxPerHour: number;
    maxPerDay: number;
    minIntervalMinutes: number; // Minimum time between responses to same contact
  };
  aiConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

export interface ConversationContext {
  handle: string;
  messages: Array<{
    text: string;
    isFromMe: boolean;
    timestamp: Date;
  }>;
  lastUpdated: Date;
}
