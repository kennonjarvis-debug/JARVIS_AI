/**
 * Type definitions for Engagement Module
 */

/**
 * Sentiment analysis result
 */
export interface SentimentResult {
  /** Overall sentiment classification */
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';

  /** Sentiment score from -1 (very negative) to +1 (very positive) */
  score: number;

  /** Confidence in the analysis (0-1) */
  confidence: number;

  /** Keywords that contributed to the sentiment */
  keywords: SentimentKeyword[];

  /** Optional context for the analysis */
  context?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Sentiment keyword with weight
 */
export interface SentimentKeyword {
  /** The keyword */
  word: string;

  /** Sentiment contribution */
  sentiment: 'positive' | 'negative';

  /** Weight/impact of this keyword */
  weight: number;
}

/**
 * Churn risk analysis result
 */
export interface ChurnAnalysisResult {
  /** User ID */
  userId: string;

  /** Overall health score (0-100) */
  healthScore: number;

  /** Churn risk level */
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Individual score components */
  scores: {
    usage: number;
    engagement: number;
    error: number;
    support: number;
  };

  /** Risk factors identified */
  riskFactors: string[];

  /** Recommended actions */
  recommendations: string[];

  /** Last activity timestamp */
  lastActivity?: Date;

  /** Days since last activity */
  daysSinceLastActivity?: number;
}

/**
 * Engagement message type
 */
export type EngagementMessageType =
  | 'welcome'
  | 'onboarding'
  | 'weekly_checkin'
  | 'feature_highlight'
  | 'win_back'
  | 're_engagement'
  | 'milestone'
  | 'feedback_request'
  | 'custom';

/**
 * Engagement message
 */
export interface EngagementMessage {
  /** Message type */
  type: EngagementMessageType;

  /** Message subject */
  subject: string;

  /** Message body (HTML or plain text) */
  body: string;

  /** Call-to-action text */
  ctaText?: string;

  /** Call-to-action URL */
  ctaUrl?: string;

  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Engagement campaign result
 */
export interface EngagementCampaignResult {
  /** Campaign ID */
  campaignId: string;

  /** Campaign type */
  type: EngagementMessageType;

  /** Total users targeted */
  totalUsers: number;

  /** Messages sent successfully */
  sentCount: number;

  /** Messages failed to send */
  failedCount: number;

  /** User IDs that failed */
  failedUsers: string[];

  /** Campaign start timestamp */
  startedAt: Date;

  /** Campaign completion timestamp */
  completedAt: Date;

  /** Duration in milliseconds */
  duration: number;
}

/**
 * Health score update parameters
 */
export interface HealthScoreUpdate {
  usageScore?: number;
  engagementScore?: number;
  errorScore?: number;
  supportScore?: number;
  healthScore?: number;
  churnRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastActivityAt?: Date;
}

/**
 * User activity metrics
 */
export interface UserActivityMetrics {
  /** Total projects created */
  totalProjects: number;

  /** Projects created in last 30 days */
  recentProjects: number;

  /** Total sessions */
  totalSessions: number;

  /** Last login timestamp */
  lastLogin?: Date;

  /** Days since last login */
  daysSinceLastLogin?: number;

  /** Feature usage counts */
  featureUsage: Record<string, number>;

  /** Total support tickets */
  totalTickets: number;

  /** Open support tickets */
  openTickets: number;

  /** Average session duration (minutes) */
  avgSessionDuration?: number;
}

/**
 * Engagement statistics
 */
export interface EngagementStats {
  /** Total users */
  totalUsers: number;

  /** Active users (last 7 days) */
  activeUsers: number;

  /** Inactive users */
  inactiveUsers: number;

  /** Users at high churn risk */
  churnRiskHigh: number;

  /** Users at critical churn risk */
  churnRiskCritical: number;

  /** Average health score */
  avgHealthScore: number;

  /** Recent support tickets (last 7 days) */
  recentTickets: number;

  /** Average sentiment score */
  avgSentiment?: number;

  /** Timestamp */
  timestamp: Date;
}
