# Jarvis AI - Social Listening & Auto-Posting System

## Overview

A comprehensive multi-platform social listening and auto-posting system that monitors keywords across Twitter, Meta (Facebook), and LinkedIn, and automatically engages with relevant posts using AI-powered agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Dashboard (React)                       │
│  - Start/Stop Listening                                         │
│  - Configure Keywords & Platforms                               │
│  - View Real-time Activity Feed                                 │
│  - Approve/Reject Agent Responses                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ REST API
                     │
┌────────────────────▼────────────────────────────────────────────┐
│              Netlify Functions (Backend)                         │
│  /social-listening - Control listening engine                   │
│  /auth/twitter/callback - OAuth integration                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │
┌────────────────────▼────────────────────────────────────────────┐
│            Social Listening Engine (Core)                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Platform Abstraction Layer                              │   │
│  │  - BaseSocialPlatform (abstract class)                   │   │
│  │  - TwitterPlatform (full implementation)                 │   │
│  │  - MetaPlatform (scaffolding)                            │   │
│  │  - LinkedInPlatform (scaffolding)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Keyword Stream Monitor                                   │   │
│  │  - Real-time Twitter filtered stream                     │   │
│  │  - Keyword matching & relevance scoring                  │   │
│  │  - Sentiment analysis                                     │   │
│  │  - Filter application (followers, language, etc.)        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Agent Bridge                                             │   │
│  │  - Routes posts to appropriate agents                    │   │
│  │  - Sales Agent (lead qualification, pricing)             │   │
│  │  - Marketing Agent (community engagement)                │   │
│  │  - Support Agent (troubleshooting)                       │   │
│  │  - Operations Agent (technical inquiries)                │   │
│  │  - Claude AI integration for intelligent responses       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Auto-Posting System                                      │   │
│  │  - Auto-reply (confidence > 80%)                         │   │
│  │  - Like/React to posts                                    │   │
│  │  - Send DMs                                               │   │
│  │  - Human approval workflow (confidence < 80%)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Events & Logs
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                  Supabase (Database)                             │
│  - social_listening_matches (keyword matches)                   │
│  - agent_workflow_triggers (agent tasks)                        │
│  - agent_workflow_logs (execution history)                      │
│  - agent_approval_requests (pending approvals)                  │
│  - social_activity_logs (all platform activity)                 │
│  - integrations (OAuth credentials)                             │
└─────────────────────────────────────────────────────────────────┘
```

## Components Created

### 1. Platform Abstraction Layer

**Location:** `packages/backend/src/services/social/`

**Files Created:**
- `types.ts` - Shared TypeScript interfaces for all platforms
- `BaseSocialPlatform.ts` - Abstract base class defining common platform interface
- `TwitterPlatform.ts` - Full Twitter API v2 implementation with OAuth 2.0
- `MetaPlatform.ts` - Scaffolding for Facebook integration (requires Meta App setup)
- `LinkedInPlatform.ts` - Scaffolding for LinkedIn integration (requires LinkedIn App)

**Key Features:**
- Unified interface across all platforms: `streamKeywords()`, `createPost()`, `replyToPost()`, `searchPosts()`, etc.
- Automatic token refresh handling
- Platform-specific conversions to unified `SocialPost` format
- Activity logging to database
- Built-in keyword matching and relevance scoring

### 2. Social Listening Engine

**Location:** `packages/backend/src/services/social/SocialListeningEngine.ts`

**Key Features:**
- Multi-platform keyword monitoring (currently Twitter, extensible to Meta/LinkedIn)
- Real-time Twitter filtered stream integration
- Configurable keyword lists, platforms, and filters
- Intelligent post filtering (min followers, language, exclude replies/retweets)
- Relevance scoring algorithm (0-100)
- Sentiment detection (positive, neutral, negative)
- Agent routing based on keyword context
- Event emitter for real-time updates
- Statistics tracking (total posts, matches, agent triggers, auto-replies)

**Event Types:**
- `match` - Keyword match found
- `agent_triggered` - Agent workflow initiated
- `approval_requested` - Human approval needed
- `error` - Error occurred
- `stopped` - Listening stopped

### 3. Agent Bridge

**Location:** `packages/backend/src/services/social/AgentBridge.ts`

**Key Features:**
- Integrates Claude AI (claude-3-5-sonnet) for intelligent response generation
- Agent-specific system prompts for Sales, Marketing, Support, Operations
- Confidence scoring (0-100) for each response
- Automatic human approval for low-confidence responses (<80%)
- Structured response generation with reasoning
- Batch processing support for parallel agent execution
- Comprehensive logging and analytics
- Platform-agnostic agent workflows

**Agent Types:**
1. **Sales Agent** - Lead qualification, pricing inquiries, demos
2. **Marketing Agent** - Community engagement, content sharing, brand awareness
3. **Support Agent** - Troubleshooting, feature questions, customer satisfaction
4. **Operations Agent** - API/integration questions, technical implementations

### 4. API Endpoint

**Location:** `packages/backend/netlify/functions/social-listening.ts`

**Endpoints:**
- `GET /social-listening?observatory_id=xxx` - Get listening status and stats
- `POST /social-listening?observatory_id=xxx` - Start listening with config
- `PUT /social-listening?observatory_id=xxx` - Update configuration
- `DELETE /social-listening?observatory_id=xxx` - Stop listening

**Request Body (POST):**
```json
{
  "keywords": ["daw", "music production", "audio production"],
  "platforms": ["twitter"],
  "filters": {
    "minFollowers": 0,
    "languages": ["en"],
    "excludeReplies": false,
    "excludeRetweets": true
  },
  "actions": {
    "autoReply": true,
    "notifyHuman": true,
    "triggerAgent": true
  }
}
```

### 5. Database Schema

**Location:** `packages/backend/supabase/migrations/create_social_listening_tables.sql`

**Tables Created:**
1. `social_activity_logs` - All platform interactions (posts, replies, likes, DMs)
2. `social_listening_matches` - Keyword matches with relevance scores
3. `agent_workflow_triggers` - Queued agent tasks
4. `agent_workflow_logs` - Execution history with success/failure tracking
5. `agent_approval_requests` - Pending human approvals for agent responses
6. `approval_requests` - General social engagement approvals
7. `social_listening_configs` - User preferences for keyword monitoring

**Security:**
- Row Level Security (RLS) enabled on all tables
- Users can only access data from their observatories
- Policy-based access control using `observatory_members`

## Usage

### 1. Run Database Migration

```bash
cd packages/backend
# Apply migration to Supabase
```

### 2. Configure Environment Variables

Required in Netlify environment variables:

```bash
# Twitter OAuth 2.0
TWITTER_OAUTH_CLIENT_ID=your_client_id
TWITTER_OAUTH_CLIENT_SECRET=your_client_secret

# Claude AI
ANTHROPIC_API_KEY=your_api_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

### 3. Start Listening

**Via API:**
```bash
curl -X POST "https://jarvis-ai.co/.netlify/functions/social-listening?observatory_id=YOUR_OBSERVATORY_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["daw", "music production", "beat making"],
    "platforms": ["twitter"],
    "filters": {
      "languages": ["en"],
      "excludeRetweets": true
    },
    "actions": {
      "autoReply": true,
      "triggerAgent": true
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Started listening",
  "config": {
    "keywords": ["daw", "music production", "beat making"],
    "platforms": ["twitter"]
  }
}
```

### 4. Check Status

```bash
curl "https://jarvis-ai.co/.netlify/functions/social-listening?observatory_id=YOUR_OBSERVATORY_ID"
```

**Response:**
```json
{
  "isListening": true,
  "stats": {
    "totalPosts": 150,
    "matchedPosts": 45,
    "agentsTriggered": 12,
    "autoReplies": 8,
    "humanInterventions": 4
  }
}
```

### 5. Stop Listening

```bash
curl -X DELETE "https://jarvis-ai.co/.netlify/functions/social-listening?observatory_id=YOUR_OBSERVATORY_ID"
```

## Workflow Example

### Scenario: User tweets about needing a DAW

1. **User posts on Twitter:**
   > "Looking for a good DAW for music production. Any recommendations?"

2. **Social Listening Engine detects keyword match:**
   - Keywords matched: ["daw", "music production"]
   - Relevance score: 85/100
   - Sentiment: neutral
   - Suggested agent: **sales**
   - Suggested action: **engage**

3. **Agent Bridge generates response:**
   - Uses Sales Agent system prompt
   - Claude generates:
     > "Hi @user! 👋 DAWG AI is a powerful browser-based DAW perfect for music production. No downloads needed - create music directly in your browser. Want to try it out? https://dawg-ai.com"
   - Confidence: 92%
   - Reasoning: "High-intent question, user actively seeking DAW solution"

4. **Auto-posting (confidence > 80%):**
   - Reply posted automatically to Twitter
   - Activity logged to database
   - Real-time update sent to dashboard

5. **If confidence was < 80%:**
   - Approval request created in database
   - Notification sent to dashboard
   - Human reviews and approves/rejects
   - Response posted after approval

## Next Steps

### Immediate TODO:

1. **Apply Database Migration:**
   ```bash
   # Run the SQL migration file on Supabase
   ```

2. **Update Netlify Environment Variables:**
   - Add correct Twitter OAuth credentials
   - Add ANTHROPIC_API_KEY

3. **Fix Dashboard Widget:**
   - Update DashboardPage.tsx to query the correct observatory with Twitter integration
   - Add Social Listening control panel to dashboard

4. **Deploy to Production:**
   ```bash
   git add .
   git commit -m "Add comprehensive social listening and auto-posting system"
   git push
   ```

### Future Enhancements:

1. **Implement Meta (Facebook) Integration:**
   - Complete MetaPlatform class
   - Set up Facebook App and OAuth
   - Implement Graph API integration

2. **Implement LinkedIn Integration:**
   - Complete LinkedInPlatform class
   - Set up LinkedIn App and OAuth
   - Implement UGC Post API

3. **Real-time WebSocket Updates:**
   - Push real-time keyword matches to dashboard
   - Live agent activity feed
   - Instant approval notifications

4. **Advanced Agent Integration:**
   - Connect to existing LangGraph agents in Jarvis-v0
   - Implement ReAct pattern for complex decision-making
   - Add agent memory and learning

5. **Analytics Dashboard:**
   - Engagement metrics by platform
   - Agent performance analytics
   - ROI tracking (leads generated, conversions)
   - Sentiment trends over time

6. **Enhanced Filtering:**
   - Machine learning-based relevance scoring
   - Duplicate detection
   - Spam filtering
   - User reputation scoring

## Files Modified/Created

### Created Files:
```
packages/backend/src/services/social/
├── types.ts                          # Shared TypeScript types
├── BaseSocialPlatform.ts             # Abstract platform base class
├── TwitterPlatform.ts                # Twitter API v2 implementation
├── MetaPlatform.ts                   # Meta/Facebook scaffolding
├── LinkedInPlatform.ts               # LinkedIn scaffolding
├── SocialListeningEngine.ts          # Core keyword monitoring engine
└── AgentBridge.ts                    # Claude AI agent integration

packages/backend/netlify/functions/
└── social-listening.ts               # API endpoint for controlling engine

packages/backend/supabase/migrations/
└── create_social_listening_tables.sql # Database schema
```

### Environment Variables Required:
```
TWITTER_OAUTH_CLIENT_ID
TWITTER_OAUTH_CLIENT_SECRET
ANTHROPIC_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_KEY
```

## Testing

### Manual Test:
1. Start listening via API
2. Tweet using keyword "daw" or "music production"
3. Check database for:
   - Match in `social_listening_matches`
   - Trigger in `agent_workflow_triggers`
   - Log in `agent_workflow_logs`
4. Verify auto-reply appears on Twitter

### Monitoring:
```bash
# Check listening status
curl https://jarvis-ai.co/.netlify/functions/social-listening?observatory_id=XXX

# Query recent matches
select * from social_listening_matches
order by created_at desc
limit 10;

# Query agent activity
select * from agent_workflow_logs
order by created_at desc
limit 10;
```

## Support

For issues or questions:
- Check logs in Supabase for detailed error messages
- Verify all environment variables are set correctly
- Ensure Twitter OAuth app has correct scopes and callback URLs
- Test Twitter API credentials independently

## License

Proprietary - DAWG AI / Jarvis v0
