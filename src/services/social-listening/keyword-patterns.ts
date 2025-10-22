import { KeywordPattern, IntentType } from './types';

/**
 * Keyword patterns for intent detection
 * Optimized for music industry use cases
 */
export const KEYWORD_PATTERNS: KeywordPattern[] = [
  // Seeking Producer
  {
    intent: 'seeking_producer',
    keywords: [
      'looking for producer',
      'need producer',
      'seeking producer',
      'producer wanted',
      'anyone know a producer',
      'recommend a producer',
      'producer recommendations',
      'need beats',
      'looking for beats',
      'need someone to produce',
    ],
    excludeKeywords: ['offering', 'available', 'hire me'],
    minConfidence: 0.7,
  },

  // Seeking Vocal Coach
  {
    intent: 'seeking_vocal_coach',
    keywords: [
      'looking for vocal coach',
      'need vocal coach',
      'vocal lessons',
      'singing lessons',
      'voice teacher',
      'need help with vocals',
      'improve my vocals',
      'vocal training',
    ],
    excludeKeywords: ['offering', 'available', 'I teach'],
    minConfidence: 0.7,
  },

  // Seeking Mixing Engineer
  {
    intent: 'seeking_mixing_engineer',
    keywords: [
      'looking for mixing engineer',
      'need mixing',
      'need my song mixed',
      'mixing engineer wanted',
      'anyone mix songs',
      'recommend mixing engineer',
      'need help mixing',
    ],
    excludeKeywords: ['offering', 'available', 'I mix'],
    minConfidence: 0.7,
  },

  // Seeking Mastering Engineer
  {
    intent: 'seeking_mastering_engineer',
    keywords: [
      'looking for mastering',
      'need mastering',
      'mastering engineer wanted',
      'get my song mastered',
      'mastering services',
      'recommend mastering',
    ],
    excludeKeywords: ['offering', 'available'],
    minConfidence: 0.7,
  },

  // Offering Producer Services
  {
    intent: 'offering_producer_services',
    keywords: [
      'producer for hire',
      'offering production',
      'I produce',
      'I make beats',
      'selling beats',
      'custom beats',
      'DM for beats',
    ],
    requiredKeywords: ['producer', 'beats', 'production'],
    minConfidence: 0.6,
  },

  // Offering Vocal Coach Services
  {
    intent: 'offering_vocal_coach_services',
    keywords: [
      'vocal coach',
      'voice lessons available',
      'I teach singing',
      'vocal training services',
      'DM for vocal lessons',
    ],
    requiredKeywords: ['vocal', 'teach', 'lessons', 'coach'],
    minConfidence: 0.6,
  },

  // Showcasing Work
  {
    intent: 'showcasing_work',
    keywords: [
      'just dropped',
      'new song out',
      'check out my',
      'my latest track',
      'just released',
      'new music',
      'dropping soon',
      'preview of',
    ],
    minConfidence: 0.5,
  },

  // Asking for Feedback
  {
    intent: 'asking_for_feedback',
    keywords: [
      'feedback on',
      'thoughts on',
      'what do you think',
      'rate my',
      'honest feedback',
      'critique my',
      'should I',
    ],
    minConfidence: 0.6,
  },

  // Collaboration Request
  {
    intent: 'collaboration_request',
    keywords: [
      'looking to collab',
      'want to collaborate',
      'anyone want to work',
      'feature on my',
      'need a feature',
      'collab with me',
    ],
    minConfidence: 0.6,
  },
];

/**
 * Detect intent from post content
 */
export function detectIntent(content: string): { intent: IntentType[]; confidence: number } {
  const lowerContent = content.toLowerCase();
  const detectedIntents: Array<{ intent: IntentType; confidence: number }> = [];

  for (const pattern of KEYWORD_PATTERNS) {
    let matchScore = 0;
    let totalKeywords = pattern.keywords.length;

    // Check for keyword matches
    for (const keyword of pattern.keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        matchScore++;
      }
    }

    // Check required keywords
    if (pattern.requiredKeywords) {
      const hasRequired = pattern.requiredKeywords.every((kw) =>
        lowerContent.includes(kw.toLowerCase())
      );
      if (!hasRequired) continue;
    }

    // Check exclusions
    if (pattern.excludeKeywords) {
      const hasExclusion = pattern.excludeKeywords.some((kw) =>
        lowerContent.includes(kw.toLowerCase())
      );
      if (hasExclusion) continue;
    }

    const confidence = matchScore / totalKeywords;

    if (confidence >= pattern.minConfidence) {
      detectedIntents.push({
        intent: pattern.intent,
        confidence,
      });
    }
  }

  // Sort by confidence
  detectedIntents.sort((a, b) => b.confidence - a.confidence);

  return {
    intent: detectedIntents.map((d) => d.intent),
    confidence: detectedIntents[0]?.confidence || 0,
  };
}
