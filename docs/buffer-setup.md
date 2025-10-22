# Buffer Integration Setup Guide

## Overview

The Buffer integration allows Jarvis to schedule and publish posts to Twitter, LinkedIn, and Facebook through the Buffer API. This guide walks through setup, configuration, and usage.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Buffer Access Token](#getting-buffer-access-token)
3. [Finding Profile IDs](#finding-profile-ids)
4. [Configuration](#configuration)
5. [Usage Examples](#usage-examples)
6. [Rate Limits](#rate-limits)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Active Buffer account
- At least one connected social media profile (Twitter, LinkedIn, or Facebook)
- Buffer access token with appropriate permissions

**Buffer Plans:**
- Free: Up to 3 social accounts, 10 scheduled posts per account
- Essentials ($6/month): Unlimited posts
- Team ($12/month): Collaboration features
- Agency ($120/month): 10 accounts + advanced features

---

## Getting Buffer Access Token

### Method 1: Create a Buffer App (Recommended)

1. Visit https://buffer.com/developers/apps/create
2. Fill in app details:
   - **App Name:** "Jarvis Automation"
   - **Description:** "Autonomous agent for social media management"
   - **Website:** Your website URL
3. Click "Create App"
4. Copy the **Access Token** from the app dashboard

### Method 2: Personal Access Token

1. Log into Buffer
2. Go to https://buffer.com/developers/api
3. Click "Create an Access Token"
4. Copy the generated token

**Token Format:** `1/0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a`

**Security Note:** Keep your token secure! It grants full access to your Buffer account.

---

## Finding Profile IDs

Buffer uses profile IDs to identify which social media account to post to. Here's how to find them:

### Option 1: Using the API

```bash
curl https://api.bufferapp.com/1/profiles.json?access_token=YOUR_TOKEN
```

Response:
```json
[
  {
    "id": "4f3b4e5a6c7d8e9f0a1b2c3d",
    "service": "twitter",
    "service_username": "@yourhandle",
    "formatted_service": "Twitter",
    "timezone": "America/New_York"
  },
  {
    "id": "1a2b3c4d5e6f7g8h9i0j1k2l",
    "service": "linkedin",
    "service_username": "Your Name",
    "formatted_service": "LinkedIn",
    "timezone": "America/New_York"
  }
]
```

Copy the `id` values for each platform you want to use.

### Option 2: Using Jarvis

```typescript
import { BufferAdapter } from './src/integrations/buffer';

const buffer = new BufferAdapter({
  accessToken: process.env.BUFFER_ACCESS_TOKEN!
});

const profiles = await buffer.getProfiles();
console.log(profiles);
```

---

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Buffer API
BUFFER_ACCESS_TOKEN=1/0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a

# Profile IDs (optional - can be fetched dynamically)
BUFFER_PROFILE_TWITTER=4f3b4e5a6c7d8e9f0a1b2c3d
BUFFER_PROFILE_LINKEDIN=1a2b3c4d5e6f7g8h9i0j1k2l
BUFFER_PROFILE_FACEBOOK=9z8y7x6w5v4u3t2s1r0q9p8o
```

### Code Configuration

```typescript
import { BufferAdapter } from './src/integrations/buffer';
import { BufferConfig } from './src/types/integrations';

const config: BufferConfig = {
  accessToken: process.env.BUFFER_ACCESS_TOKEN!,
  profileIds: {
    twitter: process.env.BUFFER_PROFILE_TWITTER!,
    linkedin: process.env.BUFFER_PROFILE_LINKEDIN!,
    facebook: process.env.BUFFER_PROFILE_FACEBOOK!,
  }
};

const buffer = new BufferAdapter(config);
```

---

## Usage Examples

### Example 1: Post Immediately

```typescript
import { BufferAdapter } from './src/integrations/buffer';
import { SocialPost } from './src/types/integrations';

const buffer = new BufferAdapter({
  accessToken: process.env.BUFFER_ACCESS_TOKEN!,
  profileIds: {
    twitter: process.env.BUFFER_PROFILE_TWITTER!,
  }
});

const post: SocialPost = {
  text: 'Just launched our new AI agent! 🚀 #AI #Automation',
  profiles: [process.env.BUFFER_PROFILE_TWITTER!],
};

const result = await buffer.createPost(post);
console.log(`Post created: ${result.id}`);
```

### Example 2: Schedule a Post

```typescript
const scheduledDate = new Date('2025-12-01T10:00:00Z');

const post: SocialPost = {
  text: 'Our weekly update is here! Check out what we built this week.',
  profiles: [
    process.env.BUFFER_PROFILE_TWITTER!,
    process.env.BUFFER_PROFILE_LINKEDIN!,
  ],
  scheduledAt: scheduledDate,
};

const result = await buffer.createPost(post);
console.log(`Post scheduled for: ${result.scheduledAt}`);
```

### Example 3: Post with Media

```typescript
const post: SocialPost = {
  text: 'Check out our new product screenshot! 📸',
  profiles: [process.env.BUFFER_PROFILE_TWITTER!],
  media: [
    {
      url: 'https://example.com/images/product-screenshot.png',
      alt: 'Product screenshot showing new features',
    },
  ],
};

const result = await buffer.createPost(post);
console.log(`Post with media created: ${result.id}`);
```

### Example 4: Get Profile ID Dynamically

```typescript
// Get profile ID for a platform
const twitterProfileId = await buffer.getProfileId('twitter');

const post: SocialPost = {
  text: 'Dynamic profile lookup example',
  profiles: [twitterProfileId],
};

await buffer.createPost(post);
```

### Example 5: View Scheduled Posts

```typescript
const profileId = process.env.BUFFER_PROFILE_TWITTER!;
const scheduled = await buffer.getScheduledPosts(profileId);

console.log(`You have ${scheduled.length} scheduled posts:`);
scheduled.forEach(post => {
  console.log(`- ${post.text} (${post.scheduledAt})`);
});
```

### Example 6: Get Post Analytics

```typescript
const postId = 'update_abc123';
const analytics = await buffer.getPostAnalytics(postId);

console.log(`Post Performance:
  Likes: ${analytics.likes}
  Comments: ${analytics.comments}
  Shares: ${analytics.shares}
  Clicks: ${analytics.clicks}
  Reach: ${analytics.reach}
`);
```

### Example 7: Delete a Scheduled Post

```typescript
const postId = 'update_to_delete';
await buffer.deletePost(postId);
console.log('Post deleted successfully');
```

### Example 8: Test Connection

```typescript
const isConnected = await buffer.testConnection();

if (isConnected) {
  console.log('✅ Buffer connection successful');
} else {
  console.error('❌ Buffer connection failed');
}
```

---

## Rate Limits

Buffer API has rate limiting to prevent abuse:

### Standard Rate Limits

- **Requests per minute:** 10
- **Requests per hour:** 60
- **Posts per day:** Depends on your Buffer plan

### Rate Limit Headers

The adapter tracks rate limits automatically using response headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1733097600
```

### Handling Rate Limits

The adapter automatically:
1. **Tracks remaining requests** from headers
2. **Waits before requests** if limit reached
3. **Retries with backoff** on 429 errors

**429 Response:**
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

The adapter will wait `retry_after` seconds before retrying.

---

## Best Practices

### 1. Cache Profile IDs

```typescript
// ✅ Good: Cache profile IDs in config
const config: BufferConfig = {
  accessToken: token,
  profileIds: {
    twitter: 'profile_id_here'
  }
};

// ❌ Avoid: Fetching profile ID every time
const profileId = await buffer.getProfileId('twitter');
```

### 2. Schedule Posts During Peak Times

```typescript
// Schedule for optimal engagement times
const optimalTimes = {
  twitter: new Date('2025-12-01T09:00:00Z'), // 9 AM
  linkedin: new Date('2025-12-01T14:00:00Z'), // 2 PM
};

await buffer.createPost({
  text: 'Morning update! ☕',
  profiles: [twitterProfile],
  scheduledAt: optimalTimes.twitter,
});
```

### 3. Validate Media URLs

```typescript
// Ensure media URLs are publicly accessible
const mediaUrl = 'https://example.com/public/image.jpg';

// Test URL before posting
const response = await fetch(mediaUrl);
if (!response.ok) {
  throw new Error('Media URL is not accessible');
}

await buffer.createPost({
  text: 'Post with verified media',
  profiles: [profileId],
  media: [{ url: mediaUrl, alt: 'Description' }],
});
```

### 4. Handle Errors Gracefully

```typescript
try {
  await buffer.createPost(post);
} catch (error) {
  if (error instanceof JarvisError) {
    switch (error.code) {
      case ErrorCode.RATE_LIMIT_ERROR:
        console.log('Rate limited, retrying later...');
        break;
      case ErrorCode.AUTHENTICATION_ERROR:
        console.error('Invalid Buffer token');
        break;
      case ErrorCode.VALIDATION_ERROR:
        console.error('Invalid post data:', error.message);
        break;
    }
  }
}
```

### 5. Optimize Post Text

```typescript
// Platform-specific character limits
const limits = {
  twitter: 280,
  linkedin: 3000,
  facebook: 63206,
};

function optimizeText(text: string, platform: string): string {
  const limit = limits[platform as keyof typeof limits];
  if (text.length > limit) {
    return text.substring(0, limit - 3) + '...';
  }
  return text;
}
```

---

## Troubleshooting

### Issue: "Invalid Buffer access token"

**Cause:** Token is expired, invalid, or missing

**Solution:**
1. Verify token in `.env` file
2. Check token format: `1/[32-character-string]`
3. Generate new token at https://buffer.com/developers/apps

### Issue: "Profile not found"

**Cause:** Profile ID is incorrect or profile was disconnected

**Solution:**
1. Verify profile IDs:
   ```bash
   curl https://api.bufferapp.com/1/profiles.json?access_token=YOUR_TOKEN
   ```
2. Reconnect social account in Buffer dashboard
3. Update profile IDs in `.env`

### Issue: "Rate limit exceeded"

**Cause:** Too many requests in short time

**Solution:**
- The adapter automatically handles this with retries
- For persistent issues, add delay between posts:
  ```typescript
  await buffer.createPost(post1);
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
  await buffer.createPost(post2);
  ```

### Issue: "Media upload failed"

**Cause:** Invalid media URL or unsupported format

**Solution:**
1. Verify URL is publicly accessible
2. Check supported formats:
   - Images: JPG, PNG, GIF
   - Videos: MP4, MOV (Buffer Pro only)
3. Ensure image size < 5MB

### Issue: "Post creation failed"

**Cause:** Various validation errors

**Solution:**
Check error message for specifics:
- Text too long for platform
- Invalid profile ID
- Scheduled time in the past
- Missing required fields

### Issue: "Cannot read scheduled posts"

**Cause:** Incorrect profile ID or permissions

**Solution:**
1. Verify profile ID is correct
2. Ensure token has `read` permissions
3. Check profile is active (not deleted)

---

## API Endpoints Reference

The adapter uses these Buffer API v1 endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/profiles.json` | GET | List all profiles |
| `/updates/create.json` | POST | Create/schedule post |
| `/updates/:id.json` | GET | Get post details |
| `/updates/:id/destroy.json` | POST | Delete post |
| `/profiles/:id/updates/scheduled.json` | GET | List scheduled posts |

---

## Security Considerations

### 1. Protect Access Token

```typescript
// ✅ Good: Load from environment
const token = process.env.BUFFER_ACCESS_TOKEN;

// ❌ Bad: Hardcode token
const token = '1/abc123def456...'; // Never do this!
```

### 2. Validate User Input

```typescript
// Sanitize user-provided text
function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/<script>/gi, '')
    .substring(0, 280);
}
```

### 3. Log Safely

```typescript
// ✅ Good: Log without sensitive data
logger.info('Post created', { postId: result.id });

// ❌ Bad: Log access token
logger.info('Post created', { token: accessToken });
```

---

## Advanced Usage

### Custom Retry Logic

```typescript
async function postWithRetry(
  buffer: BufferAdapter,
  post: SocialPost,
  maxRetries: number = 3
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await buffer.createPost(post);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### Batch Scheduling

```typescript
async function scheduleBatch(
  buffer: BufferAdapter,
  posts: SocialPost[]
): Promise<void> {
  for (const post of posts) {
    await buffer.createPost(post);
    await new Promise(resolve => setTimeout(resolve, 6000)); // 6s = 10/min
  }
}
```

---

## Support

- Buffer API Docs: https://buffer.com/developers/api
- Buffer Help Center: https://support.buffer.com
- Jarvis Issues: https://github.com/your-repo/issues

---

**Ready to automate your social media? 🚀**
