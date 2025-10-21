/**
 * Shared types for Social Media Service Abstraction
 * Reusable across Twitter, Meta, LinkedIn, and future platforms
 */

export interface SocialPost {
  id: string;
  platform: 'twitter' | 'meta' | 'linkedin';
  author: {
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
    verified?: boolean;
  };
  content: {
    text: string;
    media?: MediaAttachment[];
    urls?: string[];
    hashtags?: string[];
    mentions?: string[];
  };
  metrics: {
    likes: number;
    shares: number;
    comments: number;
    views?: number;
  };
  timestamp: Date;
  conversationId?: string;
  inReplyToId?: string;
  language?: string;
  raw: any; // Platform-specific raw data
}

export interface MediaAttachment {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface PlatformMetrics {
  followers: number;
  following: number;
  posts: number;
  engagement: {
    rate: number;
    totalInteractions: number;
  };
  impressions?: number;
  reach?: number;
}

export interface PostRequest {
  text: string;
  media?: MediaAttachment[];
  scheduledFor?: Date;
  inReplyTo?: string;
  metadata?: Record<string, any>;
}

export interface PostResult {
  id: string;
  url: string;
  createdAt: Date;
  platform: 'twitter' | 'meta' | 'linkedin';
}

export interface KeywordMatch {
  post: SocialPost;
  matchedKeywords: string[];
  relevanceScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestedAction: 'engage' | 'monitor' | 'ignore';
  suggestedAgent?: 'sales' | 'marketing' | 'support' | 'operations';
}

export interface SocialListenerConfig {
  keywords: string[];
  platforms: ('twitter' | 'meta' | 'linkedin')[];
  filters?: {
    minFollowers?: number;
    languages?: string[];
    excludeReplies?: boolean;
    excludeRetweets?: boolean;
  };
  actions?: {
    autoReply?: boolean;
    notifyHuman?: boolean;
    triggerAgent?: boolean;
  };
}

export interface AgentWorkflowTrigger {
  observatoryId: string; // Multi-tenant support - each business has separate observatory
  agentType: 'sales' | 'marketing' | 'support' | 'operations';
  post: SocialPost;
  context: {
    matchedKeywords: string[];
    relevanceScore: number;
    sentiment: string;
    userProfile?: any;
  };
  action: 'reply' | 'like' | 'dm' | 'follow' | 'monitor';
  priority: 'critical' | 'high' | 'medium' | 'low';
}
