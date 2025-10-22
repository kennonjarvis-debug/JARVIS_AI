import { SocialPost, IntentType } from './types';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI-Powered Response Generator
 * Creates context-aware, platform-optimized responses
 */
export class ResponseGenerator {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }

  /**
   * Generate a personalized response for a social post
   */
  async generateResponse(post: SocialPost): Promise<string> {
    const prompt = this.buildPrompt(post);

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        temperature: 0.8, // Creative but not too random
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      return this.optimizeForPlatform(responseText, post.platform);
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.getFallbackResponse(post.detectedIntent[0]);
    }
  }

  /**
   * Build AI prompt based on post context
   */
  private buildPrompt(post: SocialPost): string {
    const primaryIntent = post.detectedIntent[0];
    const intentDescription = this.getIntentDescription(primaryIntent);

    return `You are Jarvis AI, an intelligent music industry assistant.

CONTEXT:
- Platform: ${post.platform}
- User: @${post.author.username} (${post.author.displayName})
- Followers: ${post.author.followerCount || 'unknown'}
- Post: "${post.content}"
- Detected Intent: ${intentDescription}

TASK:
Generate a helpful, authentic, and engaging response that:
1. Acknowledges their specific need/request
2. Offers value or assistance (don't be salesy!)
3. Is conversational and matches the platform's tone
4. Encourages further conversation or action
5. Mentions relevant Jarvis AI capabilities naturally if appropriate

GUIDELINES:
- Keep it under 280 characters for Twitter
- Be genuinely helpful, not promotional
- Use emojis sparingly (max 2)
- No hashtags unless contextually relevant
- Sound human and relatable
- Match the user's energy/tone

Generate ONLY the response text, nothing else:`;
  }

  /**
   * Get human-readable intent description
   */
  private getIntentDescription(intent: IntentType): string {
    const descriptions: Record<IntentType, string> = {
      seeking_producer: 'User is looking for a music producer',
      seeking_vocal_coach: 'User is looking for vocal coaching/lessons',
      seeking_mixing_engineer: 'User needs mixing engineering services',
      seeking_mastering_engineer: 'User needs mastering services',
      seeking_songwriter: 'User is looking for a songwriter',
      seeking_musician: 'User is looking for musicians to collaborate with',
      offering_producer_services: 'User is offering production services',
      offering_vocal_coach_services: 'User is offering vocal coaching',
      offering_mixing_services: 'User is offering mixing services',
      offering_mastering_services: 'User is offering mastering services',
      showcasing_work: 'User is sharing their music/work',
      asking_for_feedback: 'User is asking for feedback on their music',
      collaboration_request: 'User wants to collaborate',
      general_discussion: 'General music industry discussion',
    };

    return descriptions[intent] || 'General music-related post';
  }

  /**
   * Optimize response for specific platform
   */
  private optimizeForPlatform(response: string, platform: string): string {
    switch (platform) {
      case 'twitter':
        // Ensure under 280 characters
        if (response.length > 280) {
          return response.substring(0, 277) + '...';
        }
        return response;

      case 'instagram':
      case 'threads':
        // More casual, can be longer
        return response;

      case 'linkedin':
        // More professional
        return response.replace(/🔥|💯|😎/g, ''); // Remove casual emojis

      default:
        return response;
    }
  }

  /**
   * Fallback responses if AI generation fails
   */
  private getFallbackResponse(intent: IntentType): string {
    const fallbacks: Partial<Record<IntentType, string>> = {
      seeking_producer: "Hey! I'd love to help with production. What style are you looking for? DM me and let's chat! 🎵",
      seeking_vocal_coach: "I can help with vocal coaching! What specific areas are you looking to improve? Let's connect! 🎤",
      seeking_mixing_engineer: "I offer professional mixing services. What's your project timeline? Happy to discuss! 🎚️",
      asking_for_feedback: "Great work! Would love to give detailed feedback. What specific aspects would you like input on?",
      collaboration_request: "This sounds interesting! What kind of collaboration did you have in mind? Let's talk!",
    };

    return fallbacks[intent] || "Interesting! Would love to connect and discuss this further. DM me if you'd like to chat!";
  }

  /**
   * Generate multiple response variations
   */
  async generateVariations(post: SocialPost, count: number = 3): Promise<string[]> {
    const variations: string[] = [];

    for (let i = 0; i < count; i++) {
      const response = await this.generateResponse(post);
      variations.push(response);
    }

    return variations;
  }

  /**
   * Score a response for quality
   */
  scoreResponse(response: string, post: SocialPost): number {
    let score = 0.5; // Base score

    // Length check (not too short, not too long)
    if (response.length > 50 && response.length < 280) score += 0.15;

    // Contains question (encourages engagement)
    if (response.includes('?')) score += 0.1;

    // Mentions user or acknowledges their post
    if (response.toLowerCase().includes('you') || response.includes('@')) score += 0.1;

    // Not overly promotional
    if (!response.toLowerCase().includes('buy') && !response.toLowerCase().includes('hire me')) {
      score += 0.1;
    }

    // Has emoji (but not too many)
    const emojiCount = (response.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 0 && emojiCount <= 2) score += 0.05;

    return Math.min(score, 1);
  }
}

export const responseGenerator = new ResponseGenerator();
