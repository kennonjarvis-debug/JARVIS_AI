/**
 * Social Listening System - Type Definitions
 * Monitors social platforms for relevant opportunities and generates context-aware responses
 */

export type SocialPlatform = 'twitter' | 'threads' | 'instagram' | 'facebook' | 'reddit' | 'linkedin';

export type IntentType =
  | 'seeking_producer'
  | 'seeking_vocal_coach'
  | 'seeking_mixing_engineer'
  | 'seeking_mastering_engineer'
  | 'seeking_songwriter'
  | 'seeking_musician'
  | 'offering_producer_services'
  | 'offering_vocal_coach_services'
  | 'offering_mixing_services'
  | 'offering_mastering_services'
  | 'showcasing_work'
  | 'asking_for_feedback'
  | 'collaboration_request'
  | 'general_discussion';

export interface KeywordPattern {
  intent: IntentType;
  keywords: string[];
  requiredKeywords?: string[];
  excludeKeywords?: string[];
  minConfidence: number;
}

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  author: {
    id: string;
    username: string;
    displayName: string;
    followerCount?: number;
    verified?: boolean;
    bio?: string;
    location?: string;
  };
  content: string;
  detectedIntent: IntentType[];
  confidence: number;
  qualityScore: number;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  timestamp: Date;
  url: string;
  language: string;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  replyToId?: string;
}

export interface ResponseTemplate {
  intent: IntentType;
  platform: SocialPlatform;
  templates: {
    tone: 'friendly' | 'professional' | 'casual' | 'enthusiastic';
    template: string;
    variables: string[];
  }[];
}

export interface EngagementStrategy {
  intent: IntentType;
  priority: number;
  responseDelay: {
    min: number; // minutes
    max: number; // minutes
  };
  shouldEngage: (post: SocialPost) => boolean;
  responseStyle: 'direct' | 'helpful' | 'conversational' | 'showcase';
}

export interface QualityMetrics {
  authorCredibility: number; // 0-1
  contentRelevance: number; // 0-1
  engagementPotential: number; // 0-1
  recency: number; // 0-1
  overall: number; // weighted average
}

export interface SocialListeningConfig {
  platforms: SocialPlatform[];
  keywords: KeywordPattern[];
  scanInterval: number; // minutes
  maxPostsPerScan: number;
  minQualityScore: number;
  autoEngageEnabled: boolean;
  requireApproval: boolean;
}
