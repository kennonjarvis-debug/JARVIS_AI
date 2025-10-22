/**
 * Jarvis Social Listening System
 *
 * A comprehensive social media monitoring and engagement platform that:
 * - Scans multiple social platforms (X/Twitter, Threads, Instagram, Facebook, Reddit, LinkedIn)
 * - Detects intent using keyword patterns (seeking/offering services)
 * - Ranks opportunities by quality score
 * - Generates context-aware, AI-powered responses using Claude
 * - Tracks engagement and analytics
 * - Provides comprehensive reporting
 *
 * Usage:
 *
 * ```typescript
 * import { socialListeningOrchestrator, createDefaultConfig } from '@/services/social-listening';
 *
 * // Start listening
 * const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN;
 * await socialListeningOrchestrator.start(twitterAccessToken);
 *
 * // Get stats
 * const stats = socialListeningOrchestrator.getStats();
 * console.log(`Discovered ${stats.totalDiscovered} opportunities`);
 *
 * // Generate analytics report
 * import { analyticsService } from '@/services/social-listening';
 * const report = await analyticsService.generateReport('user-id', 7);
 * console.log(report);
 * ```
 */

// Core orchestration
export {
  SocialListeningOrchestrator,
  socialListeningOrchestrator,
  createDefaultConfig
} from './social-listening-orchestrator';

// Platform listeners
export { TwitterListener } from './twitter-listener';

// Intent detection
export { KEYWORD_PATTERNS, detectIntent } from './keyword-patterns';

// Quality ranking
export { QualityRanker, qualityRanker } from './quality-ranker';

// AI response generation
export { ResponseGenerator, responseGenerator } from './response-generator';

// Database persistence
export {
  SocialListeningDatabaseService,
  socialListeningDb
} from './database.service';

// Analytics and tracking
export {
  SocialListeningAnalyticsService,
  analyticsService
} from './analytics.service';

// Types
export type {
  SocialPlatform,
  IntentType,
  KeywordPattern,
  SocialPost,
  ResponseTemplate,
  EngagementStrategy,
  QualityMetrics,
  SocialListeningConfig,
} from './types';
