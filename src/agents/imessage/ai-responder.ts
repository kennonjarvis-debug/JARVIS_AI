/**
 * AI Auto-Responder
 * Generates intelligent responses using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { IMessage, Contact, ConversationContext } from './types.js';
import { logger } from '../../utils/logger.js';

export class AIResponder {
  private anthropic: Anthropic;
  private model: string = 'claude-3-5-haiku-20241022';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      // Don't throw error on init - will throw when actually trying to generate response
      logger.warn('ANTHROPIC_API_KEY not set - AI responses will not work');
    }

    this.anthropic = new Anthropic({ apiKey: key || 'placeholder' });
  }

  /**
   * Generate a response to a message
   */
  async generateResponse(
    message: IMessage,
    context: ConversationContext,
    contact: Contact
  ): Promise<{ response: string; confidence: number }> {
    try {
      // Build conversation history
      const conversationHistory = context.messages
        .slice(-10) // Last 10 messages
        .map(msg => ({
          role: msg.isFromMe ? ('assistant' as const) : ('user' as const),
          content: msg.text,
        }));

      // Create system prompt based on relationship type
      const systemPrompt = this.buildSystemPrompt(contact);

      // Call Claude API
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 500,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          {
            role: 'user',
            content: message.text,
          },
        ],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

      // Calculate confidence based on response quality
      const confidence = this.calculateConfidence(responseText, message.text);

      logger.info('AI response generated', {
        handle: message.handle,
        messagePreview: message.text.substring(0, 50),
        responsePreview: responseText.substring(0, 50),
        confidence,
      });

      return {
        response: responseText,
        confidence,
      };
    } catch (error: any) {
      logger.error('Failed to generate AI response', {
        error: error.message,
        handle: message.handle,
      });

      throw error;
    }
  }

  /**
   * Build system prompt based on contact relationship
   */
  private buildSystemPrompt(contact: Contact): string {
    const basePrompt = `You are Ben's personal AI assistant responding to his iMessages.

BEN'S PERSONALITY & INTERESTS:
- Big country music fan - loves Morgan Wallen, Jason Aldean, and similar artists
- Writes country music AND codes - passionate about both creative and technical pursuits
- Does fix and flip houses (like the TV shows) - genuinely passionate about real estate investing
- Entrepreneurial spirit with hands-on approach to projects
- Down-to-earth, authentic, hardworking vibes

CRITICAL RULES:
- Be natural, warm, and conversational (like a real person texting)
- MATCH the length and style of their message (if they send 5 words, send 5-10 words back)
- MIRROR their tone but add slightly more upbeat and positive energy
- Be professional, kind, patient, and understanding
- Use the conversation history to be context-aware and reference previous messages
- Use casual language and contractions
- Emojis: Use ONLY ONE emoji maximum, and ONLY if they used one or more emojis first. Use sparingly.
- NEVER mention you're an AI or automated system
- NEVER say "I'll have a human follow up"
- If you genuinely can't help, say "Let me get back to you on that!" or similar
- Naturally reference Ben's interests when relevant (country music, real estate, coding projects)

RESPONSE TIMING:
- Short messages (1-5 words) → Quick, casual response
- Medium messages (6-20 words) → Thoughtful but still brief
- Long messages (20+ words) → Match their detail level

Your goal: Sound like Ben texting back naturally with good vibes and authentic personality.`;

    // Add relationship-specific context
    let relationshipContext = '';

    switch (contact.relationshipType) {
      case 'dating':
        relationshipContext = `

DATING CONTEXT:
- Be flirty, playful, and engaging with positive energy
- Show genuine interest and warmth - ask follow-up questions
- Keep the conversation flowing naturally
- Be patient and understanding if they're busy or slow to respond
- Reference things they mentioned before (shows you remember/care)
- Suggest meeting up or making plans when the vibe is right
- Be upbeat but not over-eager - cool and confident`;
        break;

      case 'friend':
        relationshipContext = `

FRIEND CONTEXT:
- Be casual, friendly, and supportive
- Share enthusiasm for their interests
- Keep it light and fun
- Suggest hangouts when appropriate`;
        break;

      case 'family':
        relationshipContext = `

FAMILY CONTEXT:
- Be warm and caring
- Keep them updated on important things
- Show appreciation and love
- Be reassuring`;
        break;

      case 'business':
        relationshipContext = `

BUSINESS CONTEXT:
- Be professional but friendly
- Keep responses clear and concise
- Confirm meetings/calls
- Handle scheduling requests
- Be responsive to urgent matters`;
        break;

      default:
        relationshipContext = `

GENERAL CONTEXT:
- Be friendly and helpful
- Gauge the relationship from conversation history
- Match their communication style`;
    }

    // Add custom prompt if provided
    let customContext = '';
    if (contact.customPrompt) {
      customContext = `\n\nCUSTOM INSTRUCTIONS:\n${contact.customPrompt}`;
    }

    return basePrompt + relationshipContext + customContext;
  }

  /**
   * Calculate confidence score for the response
   */
  private calculateConfidence(response: string, originalMessage: string): number {
    let confidence = 0.8; // Start with high confidence

    // Reduce confidence for very short responses
    if (response.length < 10) {
      confidence -= 0.2;
    }

    // Reduce confidence if response is too generic
    const genericPhrases = [
      'let me get back to you',
      'i\'m not sure',
      'i don\'t know',
      'sorry, i can\'t',
    ];

    for (const phrase of genericPhrases) {
      if (response.toLowerCase().includes(phrase)) {
        confidence -= 0.15;
        break;
      }
    }

    // Increase confidence if response is specific to the message
    const messageWords = originalMessage.toLowerCase().split(/\s+/);
    const responseWords = response.toLowerCase().split(/\s+/);
    const overlap = messageWords.filter(word => word.length > 3 && responseWords.includes(word));

    if (overlap.length > 0) {
      confidence += 0.1;
    }

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Test the AI responder with a sample message
   */
  async test(message: string): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 500,
      temperature: 0.7,
      system: this.buildSystemPrompt({
        handle: 'test',
        relationshipType: 'friend',
        autoResponseEnabled: true,
        responseCount: 0,
      }),
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}
