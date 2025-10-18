# Session Management Documentation

## Overview

This document describes the production-grade session management system implemented for the Jarvis AI web application. The system provides enterprise-level security features including Redis-based session storage, token rotation, session fingerprinting, and comprehensive audit logging.

## Architecture

### Components

1. **Redis Session Adapter** (`lib/auth/redis-adapter.ts`)
   - Custom NextAuth adapter for Redis storage
   - Automatic session expiration via TTL
   - Concurrent session management
   - Session serialization/deserialization

2. **Session Security Service** (`lib/auth/session-security.ts`)
   - Session fingerprinting
   - Suspicious activity detection
   - Rate limiting
   - Audit logging
   - IP reputation tracking

3. **NextAuth Configuration** (`lib/auth.ts`)
   - Google OAuth integration
   - JWT-based sessions with Redis backing
   - Token refresh rotation
   - Secure cookie configuration
   - Event-based logging

4. **Session Middleware** (`middleware.ts`)
   - Route protection
   - Session validation
   - Automatic expiration checks
   - Activity tracking

5. **Session Management API** (`app/api/sessions/`)
   - List active sessions
   - Revoke specific sessions
   - Revoke all other sessions
   - View security activity

6. **Session Manager UI** (`components/SessionManager.tsx`)
   - Visual session management
   - Device information display
   - One-click session revocation
   - Security event timeline

## Security Features

### 1. Session Storage

Sessions are stored in Redis with the following characteristics:

- **Storage Location**: Redis (in-memory, fast access)
- **Session Max Age**: 7 days (configurable)
- **Automatic Expiry**: TTL-based cleanup
- **Update Frequency**: Every 24 hours
- **Concurrent Limit**: 3 sessions per user (configurable)

#### Redis Schema

```
# User data
user:{userId} -> JSON (user object)

# Sessions
session:{sessionToken} -> JSON (session object with metadata)
user:{userId}:sessions -> SET (session tokens)
user:{userId}:session:{sessionToken} -> "1" (TTL marker)

# Accounts
account:{provider}:{providerAccountId} -> JSON (account object)

# Session fingerprints
session:{sessionToken}:fingerprint -> SHA256 hash

# Rate limiting
rate_limit:login:{ip} -> counter (TTL: 15 minutes)

# Security events
security_event:{eventId} -> JSON (event object, TTL: 30 days)
user:{userId}:security_events -> ZSET (sorted by timestamp)
security_events:global -> ZSET (global timeline)

# Suspicious IPs
suspicious_ips -> SET (flagged IPs)
suspicious_ip:{ip}:reason -> string (reason for flagging)
```

### 2. Token Rotation

The system implements refresh token rotation for enhanced security:

- **Access Token**: Short-lived (1 hour)
- **Refresh Token**: Rotated on each use
- **Automatic Refresh**: Tokens refresh automatically before expiration
- **Error Handling**: Failed refreshes trigger re-authentication

### 3. Session Fingerprinting

Each session has a unique fingerprint based on:

- User agent string
- IP address
- Accept-Language header
- Screen resolution (if available)

Fingerprints are used to detect session hijacking and suspicious activity.

### 4. Concurrent Session Management

- **Maximum Sessions**: 3 per user (configurable)
- **Enforcement**: Oldest session is automatically revoked when limit exceeded
- **User Control**: Users can manually revoke any session
- **Bulk Revocation**: "Revoke all other sessions" feature

### 5. Rate Limiting

Login attempts are rate-limited per IP address:

- **Max Attempts**: 5 per 15 minutes (configurable)
- **Window**: 15 minutes (configurable)
- **Automatic Reset**: After successful login
- **Block Duration**: Until window expires

### 6. Suspicious Activity Detection

The system monitors for suspicious patterns:

- **IP Changes**: Significant location changes
- **Device Changes**: Different device or OS
- **Impossible Travel**: Rapid location changes
- **Known Bad IPs**: Flagged IP addresses
- **Score-based**: Cumulative score determines threat level

### 7. Secure Cookies

Session cookies are configured with security best practices:

- **HttpOnly**: Prevents JavaScript access
- **Secure**: HTTPS-only in production
- **SameSite**: Strict (CSRF protection)
- **Name**: `__Secure-next-auth.session-token`
- **Path**: `/`

### 8. Audit Logging

All session-related events are logged:

- Login/Logout
- Session creation/revocation
- Suspicious activity
- Token refresh failures
- Session expiration

Events are stored in Redis with:
- **Retention**: 30 days
- **User Timeline**: Per-user event history
- **Global Timeline**: System-wide monitoring

## API Documentation

### List Active Sessions

**Endpoint**: `GET /api/sessions`

**Authentication**: Required

**Response**:
```json
{
  "sessions": [
    {
      "sessionToken": "abc123...",
      "expires": "2025-10-24T12:00:00Z",
      "metadata": {
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "device": "Desktop",
        "browser": "Chrome 119",
        "os": "Windows 11",
        "location": "San Francisco, CA",
        "fingerprint": "sha256hash...",
        "createdAt": "2025-10-17T12:00:00Z",
        "lastActivity": "2025-10-17T15:30:00Z"
      },
      "isCurrent": true
    }
  ],
  "totalSessions": 1
}
```

### Revoke Session

**Endpoint**: `DELETE /api/sessions`

**Authentication**: Required

**Request Body**:
```json
{
  "sessionToken": "abc123..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

### Revoke All Other Sessions

**Endpoint**: `DELETE /api/sessions`

**Authentication**: Required

**Request Body**:
```json
{
  "revokeAll": true
}
```

**Response**:
```json
{
  "success": true,
  "revokedCount": 2,
  "message": "Revoked 2 session(s)"
}
```

### Get Security Activity

**Endpoint**: `GET /api/sessions/activity?limit=50`

**Authentication**: Required

**Query Parameters**:
- `limit`: Number of events to return (default: 50)

**Response**:
```json
{
  "events": [
    {
      "type": "login",
      "userId": "user123",
      "sessionToken": "abc123...",
      "metadata": {
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "device": "Desktop",
        "browser": "Chrome 119",
        "os": "Windows 11",
        "fingerprint": "sha256hash...",
        "createdAt": "2025-10-17T12:00:00Z",
        "lastActivity": "2025-10-17T15:30:00Z"
      },
      "details": {},
      "timestamp": "2025-10-17T12:00:00Z"
    }
  ],
  "totalEvents": 1
}
```

## Migration Guide

### From Current Setup to Production Sessions

The current setup uses basic JWT sessions without Redis backing. Here's how to migrate:

#### Step 1: Setup Redis

**Option A: Local Redis**
```bash
# Install Redis
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu

# Start Redis
redis-server
```

**Option B: Upstash Redis (Recommended for production)**
1. Sign up at https://upstash.com
2. Create a Redis database
3. Copy the connection URL

#### Step 2: Configure Environment

Add to `.env.local`:

```env
# NextAuth
NEXTAUTH_SECRET=your-secret-generate-with-openssl-rand-base64-32

# Redis (choose one option)
# Option 1: URL
REDIS_URL=redis://localhost:6379
# or for Upstash:
# UPSTASH_REDIS_URL=rediss://default:password@endpoint.upstash.io:6379

# Option 2: Individual parameters
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Session settings (optional, defaults provided)
SESSION_MAX_AGE=604800
SESSION_UPDATE_AGE=86400
MAX_CONCURRENT_SESSIONS=3
```

#### Step 3: Test Redis Connection

```bash
# Test Redis connection
redis-cli ping
# Should return: PONG
```

#### Step 4: Restart Application

```bash
npm run dev
```

#### Step 5: Verify Migration

1. Log in to the application
2. Navigate to `/settings/sessions` (add SessionManager component)
3. Verify your session appears
4. Check Redis for session data:
   ```bash
   redis-cli
   > KEYS session:*
   > GET session:{token}
   ```

### Backwards Compatibility

The implementation maintains backwards compatibility:

- Existing Google OAuth flow unchanged
- JWT sessions still used (with Redis backing)
- No breaking changes to authentication API
- Sessions created before migration continue to work

### Rollback Plan

If issues occur, you can rollback by:

1. Revert `lib/auth.ts` to previous version
2. Keep Redis running (no harm in having it)
3. Session data will remain in Redis but won't be used
4. Users will need to re-authenticate (minor inconvenience)

## Usage Examples

### Implementing SessionManager in Your App

Add to your settings page (`app/settings/page.tsx`):

```tsx
import SessionManager from "@/components/SessionManager";

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <SessionManager />
    </div>
  );
}
```

### Accessing Session in Server Components

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <div>Welcome, {session.user.email}</div>;
}
```

### Accessing Session in Client Components

```tsx
"use client";
import { useSession } from "next-auth/react";

export default function ClientComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div>Not authenticated</div>;
  }

  return <div>Welcome, {session.user.email}</div>;
}
```

### Revoking Sessions Programmatically

```typescript
import { revokeSession, revokeAllOtherSessions } from "@/lib/auth/redis-adapter";
import { redis } from "@/lib/auth";

// Revoke specific session
await revokeSession(redis, sessionToken);

// Revoke all other sessions
await revokeAllOtherSessions(redis, userId, currentSessionToken);
```

### Logging Security Events

```typescript
import { sessionSecurity } from "@/lib/auth";

await sessionSecurity.logSecurityEvent({
  type: "suspicious_activity",
  userId: "user123",
  metadata: sessionSecurity.createSessionMetadata(ip, userAgent),
  details: { reason: "Multiple failed login attempts" },
  timestamp: new Date(),
});
```

### Checking Rate Limits

```typescript
import { sessionSecurity } from "@/lib/auth";

const rateLimit = await sessionSecurity.checkRateLimit(ip);

if (!rateLimit.allowed) {
  return res.status(429).json({
    error: "Too many attempts",
    resetAt: rateLimit.resetAt,
  });
}
```

## Configuration Options

### Session Configuration

```typescript
// lib/auth.ts
adapter: RedisAdapter({
  redis,
  sessionMaxAge: 7 * 24 * 60 * 60, // 7 days
  sessionUpdateAge: 24 * 60 * 60, // 24 hours
  maxConcurrentSessions: 3, // Max 3 devices
})
```

### Security Configuration

```typescript
// lib/auth/session-security.ts
const sessionSecurity = new SessionSecurityService(redis, {
  maxLoginAttempts: 5,
  loginAttemptWindow: 15 * 60, // 15 minutes
  suspiciousActivityThreshold: 3,
});
```

### Cookie Configuration

```typescript
// lib/auth.ts
cookies: {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
}
```

## Monitoring and Maintenance

### Redis Health Check

```typescript
import { checkRedisHealth } from "@/lib/auth/redis-client";

const isHealthy = await checkRedisHealth();
console.log("Redis health:", isHealthy);
```

### Clean Up Expired Events

```typescript
import { sessionSecurity } from "@/lib/auth";

// Run periodically (e.g., via cron job)
await sessionSecurity.cleanupExpiredEvents();
```

### Monitor Session Activity

```typescript
// Get global security events
const events = await redis.zrevrange("security_events:global", 0, 100);

// Get user-specific events
const userEvents = await sessionSecurity.getUserSecurityEvents(userId, 50);
```

### Redis Memory Management

Monitor Redis memory usage:

```bash
redis-cli INFO memory
```

Set memory limits in `redis.conf`:

```
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## Troubleshooting

### Redis Connection Issues

**Problem**: `Redis connection error: ECONNREFUSED`

**Solution**:
1. Verify Redis is running: `redis-cli ping`
2. Check REDIS_URL in `.env.local`
3. Ensure Redis accepts connections on the specified port

### Session Not Persisting

**Problem**: User logged out immediately after login

**Solution**:
1. Check NEXTAUTH_SECRET is set
2. Verify Redis adapter is configured in authOptions
3. Check browser console for cookie errors
4. Ensure cookies are enabled in browser

### Rate Limiting Too Aggressive

**Problem**: Legitimate users getting rate limited

**Solution**:
1. Increase `maxLoginAttempts` in SessionSecurityService
2. Increase `loginAttemptWindow` for longer reset period
3. Check IP extraction logic (proxies, CDN, etc.)

### Token Refresh Failing

**Problem**: `RefreshAccessTokenError` in logs

**Solution**:
1. Verify Google OAuth credentials
2. Check `access_type: "offline"` in provider config
3. Ensure refresh token is being stored
4. User may need to re-authenticate

## Performance Considerations

### Redis Performance

- **Connection Pool**: ioredis uses connection pooling by default
- **Pipeline Optimization**: Batch operations use Redis pipeline
- **Memory Usage**: ~1KB per session, scales linearly
- **Latency**: <1ms for local Redis, <10ms for cloud Redis

### Recommended Limits

- **Users**: Up to 100,000 concurrent users
- **Sessions**: Up to 300,000 sessions (3 per user)
- **Redis Memory**: ~300MB for 300K sessions
- **Event Logs**: ~100MB for 30 days retention

### Scaling Recommendations

- **<10K users**: Single Redis instance
- **10K-100K users**: Redis with replication
- **>100K users**: Redis Cluster or managed service (Upstash, ElastiCache)

## Security Best Practices

1. **Use HTTPS in production** - Secure cookies require HTTPS
2. **Rotate NEXTAUTH_SECRET** - Change periodically (requires re-auth)
3. **Monitor suspicious activity** - Set up alerts for security events
4. **Regular Redis backups** - Use Redis persistence (RDB or AOF)
5. **Implement IP allowlists** - For admin accounts
6. **Use managed Redis** - For automatic updates and scaling
7. **Enable Redis AUTH** - Require password authentication
8. **Use TLS for Redis** - Encrypt Redis connections in production
9. **Implement CSRF tokens** - Already handled by SameSite cookies
10. **Log security events** - Monitor for patterns and anomalies

## Future Enhancements

Potential improvements for future iterations:

1. **Geographic IP Detection**: Integrate MaxMind GeoIP for accurate locations
2. **Email Notifications**: Alert users of new session creation
3. **Device Management**: Named devices, trusted devices
4. **Session Locking**: Prevent concurrent use of same session
5. **Advanced Fingerprinting**: Canvas, WebGL, audio fingerprinting
6. **Risk-Based Authentication**: Step-up auth for high-risk actions
7. **Session Recording**: Record user actions for audit trail
8. **Machine Learning**: Anomaly detection using ML models
9. **Multi-Factor Authentication**: Require MFA for sensitive operations
10. **Session Migration**: Transfer sessions across devices

## Support

For issues or questions:
- Check logs: `redis-cli MONITOR` and application logs
- Review security events: `/api/sessions/activity`
- Test Redis: `redis-cli INFO` and `redis-cli PING`
- Documentation: This file and inline code comments

## License

This session management implementation is part of the Jarvis AI web application and follows the project's license terms.
