# Instance 1: Buffer Integration (Prompt 6)

**Assigned Component:** Buffer Social Media Integration
**Estimated Time:** 4 hours
**Dependencies:** ✅ Logger (P2), ✅ Error Handler (P3), ✅ Types (P5)
**Priority:** HIGH - Required for Marketing Agent

---

## Your Task

Build the Buffer API adapter for social media management. This integration allows Jarvis to schedule and publish posts to Twitter, LinkedIn, and Facebook.

---

## Context

You are building **Prompt 6: Buffer Integration** from the Jarvis parallel development workflow.

**What's already complete:**
- Logger utility (`src/utils/logger.ts`)
- Error handler (`src/utils/error-handler.ts`)
- All type definitions (`src/types/`)
- Supabase integration (`src/integrations/supabase.ts`)

**What you're building:**
- Buffer API client wrapper
- Social media post scheduling
- Analytics retrieval
- Multi-platform support

---

## API Contract Reference

See `JARVIS_DESIGN_AND_PROMPTS.md` section **"12. Integrations: Buffer Adapter"** for the complete API contract.

Key interfaces:
```typescript
export interface BufferConfig {
  accessToken: string;
  profileIds: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
}

export interface SocialPost {
  text: string;
  media?: Array<{
    url: string;
    alt?: string;
  }>;
  scheduledAt?: Date;
  profiles: string[]; // Profile IDs
}

export class BufferAdapter {
  constructor(config: BufferConfig);
  async createPost(post: SocialPost): Promise<{ id: string; profileIds: string[]; scheduledAt: Date }>;
  async getPostAnalytics(postId: string): Promise<{ likes: number; comments: number; shares: number; clicks: number; reach: number }>;
  async getScheduledPosts(profileId: string): Promise<Array<{ id: string; text: string; scheduledAt: Date }>>;
  async deletePost(postId: string): Promise<void>;
}
```

---

## Implementation Requirements

### 1. Create `src/integrations/buffer.ts`

**Required methods:**
- ✅ `constructor(config: BufferConfig)` - Initialize with access token and profile IDs
- ✅ `getProfiles(): Promise<any[]>` - Get all Buffer profiles
- ✅ `getProfileId(platform: string): Promise<string>` - Get profile ID for platform
- ✅ `createPost(post: SocialPost): Promise<any>` - Create/schedule post
- ✅ `getPostAnalytics(postId: string): Promise<any>` - Get post performance
- ✅ `getScheduledPosts(profileId: string): Promise<any[]>` - List scheduled posts
- ✅ `deletePost(postId: string): Promise<void>` - Delete scheduled post

**Features to implement:**
- Axios HTTP client for Buffer API
- Proper authentication headers
- Error handling with retry logic
- Rate limiting (10 calls/min for Buffer)
- Support for text + media posts
- Timezone handling for scheduling

**Buffer API Endpoints:**
```
GET  /profiles.json - List profiles
POST /updates/create.json - Create post
GET  /updates/:id.json - Get post details
POST /updates/:id/destroy.json - Delete post
GET  /profiles/:id/updates/scheduled.json - List scheduled posts
```

### 2. Create `src/integrations/buffer.test.ts`

**Test coverage:**
- [ ] Profile retrieval (success + error cases)
- [ ] Profile ID lookup by platform
- [ ] Post creation with text only
- [ ] Post creation with media
- [ ] Post scheduling for future time
- [ ] Analytics retrieval
- [ ] Scheduled posts listing
- [ ] Post deletion
- [ ] Rate limiting handling
- [ ] Error handling (invalid token, missing profile, API errors)
- [ ] Retry logic for transient failures

**Minimum 15 test cases, >85% coverage**

### 3. Create `docs/buffer-setup.md`

**Documentation sections:**
- Buffer API setup instructions
- Getting access token
- Finding profile IDs
- Usage examples
- Rate limits and best practices
- Troubleshooting common issues

---

## Example Implementation Structure

```typescript
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';

export interface BufferConfig {
  accessToken: string;
  profileIds?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
}

export interface SocialPost {
  text: string;
  media?: Array<{
    url: string;
    alt?: string;
  }>;
  scheduledAt?: Date;
  profiles: string[];
}

export class BufferAdapter {
  private client: AxiosInstance;
  private logger: Logger;
  private accessToken: string;
  private profileIds: Record<string, string>;

  constructor(config: BufferConfig) {
    this.accessToken = config.accessToken;
    this.profileIds = config.profileIds || {};
    this.logger = new Logger('BufferAdapter');

    // Initialize axios client
    this.client = axios.create({
      baseURL: 'https://api.bufferapp.com/1',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Add retry interceptor
    this.setupRetryLogic();
  }

  private setupRetryLogic(): void {
    // Implement exponential backoff retry logic
    // Max 3 retries for transient failures
  }

  public async getProfiles(): Promise<any[]> {
    try {
      this.logger.debug('Fetching Buffer profiles');
      const response = await this.client.get('/profiles.json');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch profiles', error as Error);
      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to fetch Buffer profiles',
        { error },
        true
      );
    }
  }

  public async getProfileId(platform: string): Promise<string> {
    // Check cache first
    if (this.profileIds[platform]) {
      return this.profileIds[platform];
    }

    // Fetch from API
    const profiles = await this.getProfiles();
    const profile = profiles.find(p =>
      p.service.toLowerCase() === platform.toLowerCase()
    );

    if (!profile) {
      throw new JarvisError(
        ErrorCode.NOT_FOUND,
        `No Buffer profile found for platform: ${platform}`,
        { platform, availableProfiles: profiles.map(p => p.service) },
        false
      );
    }

    // Cache for future use
    this.profileIds[platform] = profile.id;
    return profile.id;
  }

  public async createPost(post: SocialPost): Promise<any> {
    try {
      this.logger.info('Creating Buffer post', {
        profiles: post.profiles.length,
        scheduled: !!post.scheduledAt
      });

      const payload: any = {
        profile_ids: post.profiles,
        text: post.text,
        now: !post.scheduledAt
      };

      if (post.scheduledAt) {
        payload.scheduled_at = Math.floor(post.scheduledAt.getTime() / 1000);
      }

      if (post.media && post.media.length > 0) {
        payload.media = {
          photo: post.media[0].url,
          description: post.media[0].alt
        };
      }

      const response = await this.client.post('/updates/create.json', payload);

      this.logger.info('Post created successfully', {
        updateId: response.data.updates[0]?.id
      });

      return {
        id: response.data.updates[0]?.id,
        profileIds: post.profiles,
        scheduledAt: post.scheduledAt || new Date()
      };
    } catch (error: any) {
      this.logger.error('Failed to create post', error);

      if (error.response?.status === 429) {
        throw new JarvisError(
          ErrorCode.RATE_LIMIT_ERROR,
          'Buffer API rate limit exceeded',
          { retryAfter: error.response.headers['retry-after'] },
          true
        );
      }

      throw new JarvisError(
        ErrorCode.INTEGRATION_ERROR,
        'Failed to create Buffer post',
        { error: error.message },
        true
      );
    }
  }

  // Implement remaining methods...
}
```

---

## Acceptance Criteria

Before marking complete, verify:

- [ ] All methods from API contract implemented
- [ ] Proper authentication with Buffer API
- [ ] Rate limiting handled (10 calls/min)
- [ ] Media upload support working
- [ ] Error handling uses JarvisError
- [ ] Comprehensive logging throughout
- [ ] Test coverage >85% (minimum 15 tests)
- [ ] Documentation complete with setup guide
- [ ] Works with provided profile IDs
- [ ] Handles API errors gracefully

---

## Testing

```bash
# Run tests
npm test src/integrations/buffer.test.ts

# Run with coverage
npm test -- --coverage src/integrations/buffer.test.ts
```

---

## Environment Variables Needed

Add to `.env`:
```bash
# Buffer
BUFFER_ACCESS_TOKEN=your_token_here
BUFFER_PROFILE_TWITTER=profile_id
BUFFER_PROFILE_LINKEDIN=profile_id
BUFFER_PROFILE_FACEBOOK=profile_id
```

---

## Integration with Other Components

Once complete, this will be used by:
- **Marketing Agent (P13)** - For social media posting
- **Orchestrator (P15)** - For automated workflows

---

## Helpful Links

- Buffer API Docs: https://buffer.com/developers/api
- Buffer Getting Started: https://buffer.com/developers/api/oauth
- Rate Limits: https://buffer.com/developers/api#rate-limits

---

## Completion Checklist

When done, create `PROMPT_6_COMPLETION.md` documenting:
- ✅ All acceptance criteria met
- ✅ Test results
- ✅ API integration tested
- ✅ Documentation complete
- ✅ Ready for Marketing Agent integration

---

**START BUILDING!** 🚀

You have everything you need. The logger, error handler, and types are ready for import. Follow the API contract precisely and aim for production-ready code with comprehensive tests.
