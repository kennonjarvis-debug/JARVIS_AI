# Jarvis Social Listening System

An intelligent, AI-powered social media monitoring and engagement platform that helps discover opportunities, generate context-aware responses, and track performance across multiple social platforms.

## Overview

The Social Listening System enables Jarvis to:

- **Monitor** multiple social platforms (X/Twitter, Threads, Instagram, Facebook, Reddit, LinkedIn)
- **Detect** user intent through keyword pattern matching
- **Rank** opportunities by quality score (author credibility, content relevance, engagement potential, recency)
- **Generate** context-aware, audience-tailored responses using Claude AI
- **Track** engagement performance and analytics
- **Automate** or manual-approve responses based on configuration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Social Listening Orchestrator                   │
│  (Coordinates all components and manages workflow)           │
└───────────────┬─────────────────────────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
    ▼                       ▼
┌─────────┐           ┌──────────┐
│Platform │           │Platform  │
│Listeners│           │Listeners │
│(Twitter)│           │(Coming)  │
└────┬────┘           └──────────┘
     │
     │ Posts
     ▼
┌────────────────┐
│Intent Detection│ (Keyword Patterns)
└────┬───────────┘
     │
     │ Detected Intents
     ▼
┌────────────────┐
│Quality Ranker  │ (Multi-factor scoring)
└────┬───────────┘
     │
     │ Ranked Posts
     ▼
┌────────────────┐
│Response        │ (Claude AI)
│Generator       │
└────┬───────────┘
     │
     │ Generated Responses
     ▼
┌────────────────┐
│Database        │ (PostgreSQL via Prisma)
│Persistence     │
└────┬───────────┘
     │
     ▼
┌────────────────┐
│Analytics &     │ (Performance tracking)
│Tracking        │
└────────────────┘
```

## Quick Start

### 1. Setup Database

Run Prisma migrations to create the necessary tables:

```bash
cd /Users/benkennon/Jarvis/web/jarvis-web
npx prisma migrate dev --name add_social_listening
npx prisma generate
```

### 2. Configure Environment

Add the following to your `.env` file:

```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key
TWITTER_ACCESS_TOKEN=your_twitter_oauth_token

# Optional (for database if not already configured)
DATABASE_URL=postgresql://user:password@localhost:5432/jarvis
```

### 3. Run the Demo

```bash
cd /Users/benkennon/Jarvis
npx tsx src/services/social-listening/demo.ts
```

### 4. Integrate into Your App

```typescript
import {
  socialListeningOrchestrator,
  analyticsService
} from '@/services/social-listening';

// Start listening
const accessToken = process.env.TWITTER_ACCESS_TOKEN!;
await socialListeningOrchestrator.start(accessToken);

// Get statistics
const stats = socialListeningOrchestrator.getStats();
console.log(`Discovered: ${stats.totalDiscovered} posts`);

// Generate analytics report
const report = await analyticsService.generateReport('user-id', 7);
console.log(report);
```

## Components

### 1. Platform Listeners

**Files:**
- `twitter-listener.ts` - X/Twitter monitoring

**Responsibilities:**
- Search platforms using keyword queries
- Convert platform-specific posts to unified `SocialPost` format
- Apply quality filtering
- Trigger periodic scans

**Example:**
```typescript
import { TwitterListener } from './twitter-listener';

const listener = new TwitterListener(config);
await listener.startListening(accessToken, (posts) => {
  console.log(`Found ${posts.length} opportunities`);
});
```

### 2. Intent Detection

**Files:**
- `keyword-patterns.ts` - Pattern definitions and detection logic
- `types.ts` - Intent type definitions

**Supported Intents:**
- `seeking_producer` - Looking for music producer
- `seeking_vocal_coach` - Looking for vocal coaching
- `seeking_mixing_engineer` - Needs mixing services
- `seeking_mastering_engineer` - Needs mastering services
- `asking_for_feedback` - Requesting feedback on work
- `collaboration_request` - Seeking collaboration
- `showcasing_work` - Sharing music/projects
- `offering_*_services` - Offering services

**Example:**
```typescript
import { detectIntent } from './keyword-patterns';

const { intent, confidence } = detectIntent(
  "Looking for a producer to help with my next album!"
);
// intent: ['seeking_producer']
// confidence: 0.7
```

### 3. Quality Ranking

**Files:**
- `quality-ranker.ts`

**Scoring Factors:**
- **Author Credibility** (30%) - Follower count, verified status, bio quality
- **Content Relevance** (35%) - Intent confidence score
- **Engagement Potential** (25%) - Likes, retweets, replies, views
- **Recency** (10%) - How fresh the post is

**Example:**
```typescript
import { qualityRanker } from './quality-ranker';

const metrics = qualityRanker.calculateQualityScore(post);
console.log(`Quality: ${metrics.overall}`);
// Quality: 0.73
```

### 4. Response Generator

**Files:**
- `response-generator.ts`

**Features:**
- Uses Claude Sonnet 4 for intelligent response generation
- Platform-optimized (Twitter 280 char limit, LinkedIn professional tone)
- Context-aware prompting (considers intent, platform, user profile)
- Fallback responses if AI fails
- Response quality scoring
- Multiple variation generation

**Example:**
```typescript
import { responseGenerator } from './response-generator';

const response = await responseGenerator.generateResponse(post);
console.log(response);
// "Hey! I'd love to help with production. What style/genre are you working on? Let's connect! 🎵"
```

### 5. Database Persistence

**Files:**
- `database.service.ts`
- Schema: `web/jarvis-web/prisma/schema.prisma`

**Models:**
- `SocialListeningPost` - Discovered posts
- `SocialListeningResponse` - Generated responses
- `SocialListeningEngagement` - Actual engagements made
- `SocialListeningAnalytics` - Performance metrics
- `SocialListeningConfig` - User configuration

**Example:**
```typescript
import { socialListeningDb } from './database.service';

// Save discovered post
const postId = await socialListeningDb.savePost(userId, post);

// Save generated response
const responseId = await socialListeningDb.saveResponse(
  userId, postId, responseText, qualityScore
);

// Get pending responses
const pending = await socialListeningDb.getPendingResponses(userId);
```

### 6. Analytics & Tracking

**Files:**
- `analytics.service.ts`

**Features:**
- Comprehensive dashboard metrics
- Intent performance breakdown
- Quality score distribution
- Author credibility insights
- Engagement tracking
- Performance reports

**Example:**
```typescript
import { analyticsService } from './analytics.service';

// Get dashboard data
const dashboard = await analyticsService.getDashboard(userId, 7);

// Generate performance report
const report = await analyticsService.generateReport(userId, 30);
console.log(report);
```

## Configuration

### Default Configuration

```typescript
{
  platforms: ['twitter'],           // Active platforms
  scanInterval: 15,                 // Minutes between scans
  maxPostsPerScan: 20,              // Max posts per scan
  minQualityScore: 0.6,             // Minimum quality threshold (60%)
  autoEngageEnabled: false,         // Require manual approval
  requireApproval: true,            // All responses need approval
  dailyEngagementLimit: 50          // Max engagements per day
}
```

### Engagement Strategies

Different intents have different engagement strategies:

| Intent | Priority | Response Delay | Min Quality | Style |
|--------|----------|----------------|-------------|-------|
| seeking_producer | 10 | 5-15 min | 60% | helpful |
| seeking_vocal_coach | 10 | 5-15 min | 60% | helpful |
| asking_for_feedback | 7 | 15-30 min | 70% | conversational |
| showcasing_work | 5 | 20-40 min | 75% | showcase |
| offering_*_services | 3 | N/A | N/A | *don't engage* |

## Database Schema

### Key Tables

**SocialListeningPost**
- Stores discovered posts with author details
- Tracks engagement metrics (likes, retweets, etc.)
- Includes quality score and detected intents
- Unique constraint: `platform + externalId`

**SocialListeningResponse**
- Generated AI responses
- Status: `pending`, `approved`, `rejected`, `posted`
- Links to original post
- Tracks who approved/rejected and when

**SocialListeningEngagement**
- Records actual engagements made
- Tracks success/failure
- Monitors engagement outcomes (replies received, leads generated)
- Links to post and response

## API / Usage Examples

### Start Social Listening

```typescript
import { socialListeningOrchestrator } from './social-listening';

const twitterToken = process.env.TWITTER_ACCESS_TOKEN;
await socialListeningOrchestrator.start(twitterToken);
```

### Get Current Stats

```typescript
const stats = socialListeningOrchestrator.getStats();
console.log({
  isListening: stats.isListening,
  totalDiscovered: stats.totalDiscovered,
  pendingResponses: stats.pendingResponses,
  platforms: stats.platforms
});
```

### Approve/Reject Responses

```typescript
// Approve
await socialListeningOrchestrator.approveResponse(postId, accessToken);

// Reject
socialListeningOrchestrator.rejectResponse(postId);
```

### Generate Analytics Report

```typescript
import { analyticsService } from './analytics.service';

const report = await analyticsService.generateReport(userId, 30);
console.log(report);
```

### Custom Intent Detection

You can add custom keyword patterns by modifying `keyword-patterns.ts`:

```typescript
export const KEYWORD_PATTERNS: KeywordPattern[] = [
  // ... existing patterns
  {
    intent: 'custom_intent',
    keywords: ['keyword1', 'keyword2'],
    excludeKeywords: ['spam', 'bot'],
    minConfidence: 0.6,
  },
];
```

## Extending the System

### Add a New Platform

1. Create a new listener class (e.g., `threads-listener.ts`)
2. Implement the search and conversion logic
3. Add to orchestrator in `social-listening-orchestrator.ts`

```typescript
if (this.config.platforms.includes('threads')) {
  this.startThreadsListening(accessToken);
}
```

### Customize Response Generation

Edit `response-generator.ts` to modify:
- AI model used
- Temperature/creativity
- Prompt template
- Platform-specific optimizations
- Fallback responses

### Add New Intents

1. Update `IntentType` in `types.ts`
2. Add keyword patterns to `keyword-patterns.ts`
3. Add engagement strategy to orchestrator
4. Update response generator intent descriptions

## Performance & Limits

- **Scan Frequency:** Default 15 minutes (configurable)
- **Posts per Scan:** Default 20 (configurable)
- **Daily Engagement Limit:** Default 50 (configurable)
- **Quality Threshold:** Default 60% (configurable)
- **Response Generation:** ~2-3 seconds per response (Claude API)
- **Database:** PostgreSQL with indexes for performance

## Safety Features

- **Manual Approval:** All responses require approval by default
- **Daily Limits:** Prevents over-engagement
- **Quality Filtering:** Only engage with high-quality opportunities
- **Response Delay:** Randomized delays to appear human
- **Duplicate Prevention:** Won't process the same post twice
- **Exclusion List:** Can exclude specific authors

## Monitoring & Debugging

### Check System Status

```typescript
const stats = socialListeningOrchestrator.getStats();
console.log(stats);
```

### View Recent Discoveries

```typescript
import { socialListeningDb } from './database.service';

const posts = await socialListeningDb.getRecentPosts(userId, 24, 10);
console.log(posts);
```

### Check Pending Responses

```typescript
const pending = socialListeningOrchestrator.getPendingResponses();
console.log(pending);
```

### Generate Performance Report

```typescript
const report = await analyticsService.generateReport(userId, 7);
console.log(report);
```

## Troubleshooting

### No Posts Discovered

- Check Twitter API credentials
- Verify keyword patterns are relevant
- Lower `minQualityScore` threshold
- Increase `scanInterval` frequency

### Responses Not Posted

- Ensure `autoEngageEnabled: true` if not using manual approval
- Check daily engagement limit not reached
- Verify platform API credentials
- Check for errors in engagement logs

### Low Quality Scores

- Review quality ranking weights
- Adjust minimum follower count requirements
- Consider lowering `minQualityScore`

## Future Enhancements

- [ ] Instagram integration
- [ ] Threads integration
- [ ] Facebook groups monitoring
- [ ] Reddit subreddit scanning
- [ ] LinkedIn post monitoring
- [ ] Sentiment analysis
- [ ] Multi-language support
- [ ] A/B testing for responses
- [ ] Automated response learning from outcomes
- [ ] Real-time dashboard UI
- [ ] Webhook notifications for high-value opportunities

## Files Overview

```
src/services/social-listening/
├── types.ts                          # Type definitions
├── keyword-patterns.ts                # Intent detection patterns
├── quality-ranker.ts                  # Quality scoring algorithm
├── response-generator.ts              # AI response generation
├── twitter-listener.ts                # Twitter monitoring
├── social-listening-orchestrator.ts   # Main coordinator
├── database.service.ts                # Database persistence
├── analytics.service.ts               # Analytics and reporting
├── demo.ts                            # Demo/test script
├── index.ts                           # Public exports
└── README.md                          # This file
```

## License

Proprietary - Jarvis AI Platform

## Support

For questions or issues, contact the Jarvis development team.
