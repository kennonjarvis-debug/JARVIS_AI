# Rate Limiting System

Comprehensive rate limiting for the Jarvis AI platform with tier-based quotas, Redis-backed distributed limiting, and graceful degradation.

## Table of Contents

1. [Overview](#overview)
2. [Rate Limit Tiers](#rate-limit-tiers)
3. [Implementation](#implementation)
4. [API Reference](#api-reference)
5. [Client Handling](#client-handling)
6. [Admin Management](#admin-management)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Jarvis platform implements multi-layered rate limiting to ensure fair usage, prevent abuse, and maintain system stability:

- **Subscription-based limits**: Different quotas based on plan tier
- **Endpoint-specific limits**: Stricter limits for sensitive endpoints (auth, privacy)
- **IP-based limits**: Protection against anonymous abuse
- **Distributed rate limiting**: Redis-backed, works across multiple servers
- **Graceful degradation**: Continues to work even if Redis is unavailable
- **Bypass mechanisms**: Whitelists for admins, health checks, and trusted services

### Key Features

- ✅ Sliding window algorithm (most accurate)
- ✅ Token bucket support (for burst allowance)
- ✅ Per-user and per-IP tracking
- ✅ Automatic ban after repeated violations
- ✅ Detailed headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- ✅ Retry-After header on 429 responses
- ✅ Real-time usage dashboard
- ✅ Admin override capabilities

---

## Rate Limit Tiers

### Subscription Plans

| Tier | AI Requests/Day | API Calls/Hour | API Calls/Minute | Burst Multiplier | Concurrent Requests |
|------|----------------|----------------|------------------|------------------|---------------------|
| **Free Trial** | 10 | 100 | 10 | 1.2x | 2 |
| **Starter** ($29/mo) | 50 | 500 | 50 | 1.2x | 5 |
| **Professional** ($99/mo) | 200 | 2,000 | 200 | 1.2x | 10 |
| **Enterprise** ($299/mo) | Unlimited | Unlimited | 1,000 (soft) | 1.5x | 50 |
| **Anonymous** | 0 | 10 | 2 | 1.0x | 1 |

### Endpoint-Specific Limits

Critical endpoints have stricter limits regardless of tier:

| Endpoint | Limit | Window | Notes |
|----------|-------|--------|-------|
| `POST /api/auth/login` | 5 | 15 min | Brute force protection |
| `POST /api/auth/signup` | 3 | 1 hour | Prevent spam accounts |
| `POST /api/auth/2fa/validate` | 5 | 15 min | 2FA protection |
| `POST /api/auth/password-reset` | 3 | 1 hour | Email flood protection |
| `POST /api/privacy/export-data` | 1 | 24 hours | Resource intensive |
| `DELETE /api/privacy/delete-account` | 1 | 24 hours | Prevent accidental deletion |
| `POST /api/integrations/:provider/webhook` | 1,000 | 1 hour | External webhooks |

### Bypassed Endpoints

These endpoints are **not rate limited**:

- `/health`
- `/health/detailed`
- `/status`
- `/favicon.ico`
- `/public/*`
- `/static/*`
- `/_next/*`

---

## Implementation

### 1. Backend (Express API)

Add to your Express app (e.g., `src/core/gateway.ts`):

```typescript
import { rateLimitMiddleware } from './middleware/rate-limit-middleware.js';

// Apply to all API routes
app.use('/api', rateLimitMiddleware);
```

### 2. Next.js API Routes (App Router)

```typescript
import { NextRequest } from 'next/server';
import { applyRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const identifier = getRateLimitIdentifier(request);
  const result = await applyRateLimit(request, {
    identifier,
    limit: 60,
    windowSeconds: 60,
  });

  if (!result.success) {
    return result.response;
  }

  // Your API logic here
  return NextResponse.json({ data: 'ok' }, {
    headers: result.headers,
  });
}
```

### 3. Next.js Pages Router

```typescript
import { withRateLimit } from '@/lib/rate-limit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.json({ data: 'ok' });
}

export default withRateLimit(handler, {
  limit: 60,
  windowSeconds: 60,
  message: 'Too many requests',
});
```

### 4. React Dashboard Component

```tsx
import RateLimitStatus from '@/components/RateLimitStatus';

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Full status */}
      <RateLimitStatus />

      {/* Compact mode */}
      <RateLimitStatus compact={true} />

      {/* Custom refresh interval */}
      <RateLimitStatus refreshInterval={10000} />
    </div>
  );
}
```

---

## API Reference

### Get Rate Limit Status

**Endpoint**: `GET /api/rate-limits/status`
**Auth**: Required
**Description**: Get current usage and quotas

**Response**:
```json
{
  "success": true,
  "data": {
    "tier": "PROFESSIONAL",
    "quotas": {
      "api": {
        "hourly": {
          "limit": 2000,
          "used": 347,
          "remaining": 1653,
          "resetAt": "2025-10-17T16:00:00.000Z",
          "percentage": 17
        },
        "minute": {
          "limit": 200,
          "used": 12,
          "remaining": 188,
          "resetAt": "2025-10-17T15:16:00.000Z",
          "percentage": 6
        }
      },
      "ai": {
        "daily": {
          "limit": 200,
          "used": 42,
          "remaining": 158,
          "resetAt": "2025-10-18T00:00:00.000Z",
          "percentage": 21
        }
      }
    },
    "status": {
      "banned": false
    },
    "violations": {
      "recent": 0,
      "history": []
    }
  }
}
```

### Get Violation History

**Endpoint**: `GET /api/rate-limits/history`
**Auth**: Required
**Query Params**:
- `userId` (admin only) - Check another user's history
- `limit` - Max violations to return (default: 100)

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "violations": [
      {
        "timestamp": "2025-10-17T15:05:23.000Z",
        "endpoint": "POST /api/ai/chat",
        "limit": 200,
        "attempted": 201
      }
    ],
    "summary": {
      "total": 1,
      "byEndpoint": {
        "POST /api/ai/chat": 1
      },
      "byDay": {
        "2025-10-17": 1
      },
      "mostRecentViolation": "2025-10-17T15:05:23.000Z"
    },
    "status": {
      "banned": false
    }
  }
}
```

### Reset Rate Limits (Admin)

**Endpoint**: `POST /api/rate-limits/reset`
**Auth**: Admin required
**Body**:
```json
{
  "userId": "user-123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Rate limits reset for user: user-123"
}
```

### Remove Ban (Admin)

**Endpoint**: `POST /api/rate-limits/remove-ban`
**Auth**: Admin required
**Body**:
```json
{
  "userId": "user-123"
}
```

---

## Client Handling

### Handling 429 Responses

When you receive a `429 Too Many Requests` response:

1. **Read the headers**:
   - `X-RateLimit-Limit`: Your total quota
   - `X-RateLimit-Remaining`: Requests remaining
   - `X-RateLimit-Reset`: When quota resets (ISO timestamp)
   - `Retry-After`: Seconds to wait before retrying

2. **Implement exponential backoff**:

```typescript
async function makeRequestWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      const resetAt = response.headers.get('X-RateLimit-Reset');

      console.log(`Rate limited. Retrying after ${retryAfter}s (resets at ${resetAt})`);

      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

3. **Show user-friendly messages**:

```typescript
if (response.status === 429) {
  const data = await response.json();

  if (data.upgrade) {
    // Show upgrade CTA
    showUpgradeModal(data.upgrade.message, data.upgrade.url);
  } else {
    // Show retry message
    showNotification(`Rate limit exceeded. Try again at ${data.details.resetAt}`);
  }
}
```

### Best Practices for Clients

1. **Cache aggressively**: Don't repeat identical requests
2. **Batch requests**: Combine multiple operations when possible
3. **Use webhooks**: Instead of polling, use webhooks for real-time updates
4. **Implement local rate limiting**: Track your own usage to avoid hitting limits
5. **Monitor headers**: Watch `X-RateLimit-Remaining` to anticipate limits
6. **Upgrade when needed**: Don't try to work around limits, upgrade your plan

---

## Admin Management

### View Global Stats

```bash
# Get aggregated statistics (admin only)
curl -X GET https://api.jarvis.ai/api/rate-limits/stats \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

### Reset User Limits

```bash
# Reset all limits for a user
curl -X POST https://api.jarvis.ai/api/rate-limits/reset \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'
```

### Whitelist IP Address

```typescript
import { addWhitelistedIP } from './middleware/rate-limit-bypass.js';

// Whitelist an IP (runtime only, not persisted)
addWhitelistedIP('203.0.113.45', 'admin-user-id');
```

### Grant Temporary Bypass

```typescript
import { grantTemporaryBypass } from './middleware/rate-limit-bypass.js';

// Grant 24-hour bypass for debugging
await grantTemporaryBypass(
  'user-123',
  24 * 60, // 24 hours
  'Debugging production issue',
  'admin-user-id'
);
```

### Environment Variables

```bash
# Redis connection
REDIS_URL=redis://localhost:6379

# Temporary bypass token (for debugging)
RATE_LIMIT_BYPASS_TOKEN=your-secret-token
```

To use bypass token:
```bash
curl -X GET https://api.jarvis.ai/api/some-endpoint \
  -H "X-Rate-Limit-Bypass-Token: your-secret-token"
```

---

## Best Practices

### For API Developers

1. **Set appropriate limits**: Match limits to endpoint cost (CPU, DB queries, external APIs)
2. **Use endpoint-specific limits**: Override global limits for expensive operations
3. **Log violations**: Track patterns to identify abuse or legitimate high usage
4. **Provide clear error messages**: Help users understand what happened and how to fix it
5. **Include upgrade CTAs**: Convert free users to paid when they hit limits

### For API Consumers

1. **Respect rate limits**: Don't try to circumvent them
2. **Cache responses**: Reduce unnecessary requests
3. **Use pagination**: Don't request large datasets at once
4. **Implement retry logic**: With exponential backoff
5. **Monitor usage**: Track your consumption to avoid surprises
6. **Upgrade proactively**: Before hitting limits regularly

### For System Administrators

1. **Monitor Redis health**: Rate limiting depends on Redis
2. **Set up alerts**: For high violation rates or Redis failures
3. **Review limits regularly**: Adjust based on usage patterns
4. **Clean up old data**: Violations older than 30 days
5. **Test graceful degradation**: Ensure system works when Redis is down

---

## Troubleshooting

### Common Issues

#### 1. Always Getting 429 Errors

**Symptoms**: Every request returns 429, even first request

**Solutions**:
- Check if your IP is banned: `GET /api/rate-limits/history`
- Verify your subscription tier: `GET /api/rate-limits/status`
- Ensure you're authenticated (anonymous users have very low limits)
- Check if endpoint has specific limits (e.g., `/api/auth/login`)

#### 2. Rate Limits Not Working

**Symptoms**: No rate limiting being applied

**Solutions**:
- Check Redis connection: `redis-cli ping`
- Verify middleware is applied: Check `gateway.ts`
- Check bypass rules: You might be whitelisted
- Review logs for errors

#### 3. Inconsistent Limits Across Servers

**Symptoms**: Limits vary between requests

**Solutions**:
- Verify all servers use same Redis instance
- Check Redis connectivity from all servers
- Ensure clocks are synchronized (NTP)

#### 4. Redis Connection Errors

**Symptoms**: "Redis not connected" errors

**Solutions**:
```bash
# Check Redis is running
redis-cli ping

# Check connection string
echo $REDIS_URL

# Test connection
redis-cli -u $REDIS_URL ping

# Check firewall rules
telnet redis-host 6379
```

#### 5. High Memory Usage in Redis

**Solutions**:
```bash
# Check memory usage
redis-cli INFO memory

# Check key count
redis-cli DBSIZE

# Find large keys
redis-cli --bigkeys

# Set max memory and eviction policy
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Debug Mode

Enable verbose logging:

```typescript
// In rate-limiter.ts
const DEBUG = process.env.RATE_LIMIT_DEBUG === 'true';

if (DEBUG) {
  logger.debug('Rate limit check', {
    identifier,
    limit,
    current,
    allowed,
  });
}
```

### Monitoring Metrics

Track these metrics in production:

- Total requests per second
- Rate limit violations per hour
- Users banned per day
- Average usage by tier
- Redis latency (p50, p95, p99)
- Cache hit rate
- Error rate

---

## Redis Schema

### Key Patterns

```
jarvis:ratelimit:sliding:{identifier}     # Sorted set of request timestamps
jarvis:ratelimit:bucket:{identifier}      # JSON bucket state
jarvis:ratelimit:fixed:{identifier}:{window} # Request count
jarvis:ratelimit:ban:{identifier}         # Ban flag
jarvis:ratelimit:violations:{identifier}  # Sorted set of violations
```

### Example Keys

```
jarvis:ratelimit:sliding:user:user-123:hour
jarvis:ratelimit:sliding:ip:203.0.113.45:minute
jarvis:ratelimit:ban:user-123
jarvis:ratelimit:violations:user-123
```

### TTL Settings

- Sliding window entries: Window duration (e.g., 1 hour)
- Violations: 30 days
- Bans: 24 hours
- Bucket state: Window duration

---

## Migration Guide

### From express-rate-limit

```typescript
// Old
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use('/api/', limiter);

// New
import { rateLimitMiddleware } from './middleware/rate-limit-middleware.js';

app.use('/api/', rateLimitMiddleware);
```

Benefits of new system:
- ✅ Distributed (works across servers)
- ✅ More accurate (sliding window vs fixed window)
- ✅ Tier-based limits
- ✅ Automatic ban enforcement
- ✅ Better observability

---

## Support

For issues or questions:

1. Check this documentation
2. Review logs: `tail -f logs/rate-limiting.log`
3. Contact support: support@jarvis.ai
4. File an issue: https://github.com/jarvis/jarvis/issues

---

## Changelog

### Version 1.0.0 (2025-10-17)

- ✅ Initial implementation
- ✅ Subscription-based rate limiting
- ✅ Redis-backed distributed limiting
- ✅ Endpoint-specific overrides
- ✅ Automatic ban enforcement
- ✅ React dashboard component
- ✅ Admin management API
- ✅ Comprehensive documentation
