/**
 * Rate Limiting Integration Examples
 *
 * Complete examples showing how to integrate rate limiting
 * into your Express API and Next.js application
 */

// ============================================================================
// EXAMPLE 1: Express Gateway Integration
// ============================================================================

/**
 * In src/core/gateway.ts
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { applyRateLimiting } from '../config/apply-rate-limiting.js';
import { authenticate } from '../middleware/auth-middleware.js';

const app = express();

// 1. Security middleware (BEFORE rate limiting)
app.use(helmet());
app.use(cors());
app.use(express.json());

// 2. Apply rate limiting (BEFORE routes)
applyRateLimiting(app);

// 3. Define routes (rate limiting already applied)
app.get('/api/data', authenticate, (req, res) => {
  // Request has already passed rate limit checks
  // Access rate limit context if needed
  const tier = req.rateLimitContext?.tier;
  const remaining = req.rateLimitContext?.quotas.apiCallsPerHour;

  res.json({
    data: 'ok',
    tier,
    remaining,
  });
});

// Start server
app.listen(4000, () => {
  console.log('Server started with rate limiting enabled');
});

// ============================================================================
// EXAMPLE 2: Custom Endpoint Limits
// ============================================================================

/**
 * Add custom endpoint-specific limits in src/config/rate-limits.ts
 */

export const ENDPOINT_RATE_LIMITS: Record<string, EndpointRateLimit> = {
  // Your custom endpoint
  'POST /api/expensive-operation': {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'This operation is resource intensive. Please try again later.',
  },

  // AI generation endpoint
  'POST /api/ai/generate-image': {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Image generation limit reached. Upgrade for more capacity.',
  },
};

// ============================================================================
// EXAMPLE 3: Next.js API Route (App Router)
// ============================================================================

/**
 * In app/api/data/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const identifier = getRateLimitIdentifier(request);
  const result = await applyRateLimit(request, {
    identifier,
    limit: 100,
    windowSeconds: 60,
    message: 'Too many requests to this endpoint',
  });

  if (!result.success) {
    // Rate limit exceeded - response already prepared
    return result.response;
  }

  // Your API logic here
  const data = { message: 'Hello World' };

  // Include rate limit headers in successful response
  return NextResponse.json(data, {
    headers: result.headers,
  });
}

// ============================================================================
// EXAMPLE 4: Next.js API Route (Pages Router)
// ============================================================================

/**
 * In pages/api/data.ts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Your API logic
  res.json({ message: 'Hello World' });
}

// Wrap with rate limiting
export default withRateLimit(handler, {
  ...RATE_LIMIT_PRESETS.standard, // 60 req/min
  message: 'Too many requests',
});

// ============================================================================
// EXAMPLE 5: React Dashboard Component
// ============================================================================

/**
 * In app/dashboard/page.tsx
 */

import RateLimitStatus from '@/components/RateLimitStatus';

export default function DashboardPage() {
  return (
    <div className="container">
      <h1>Dashboard</h1>

      {/* Show rate limit status */}
      <div className="card">
        <RateLimitStatus
          showDetails={true}
          refreshInterval={30000} // Refresh every 30s
        />
      </div>

      {/* Compact version in header */}
      <div className="header">
        <RateLimitStatus compact={true} />
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Admin Operations
// ============================================================================

/**
 * Admin utilities for managing rate limits
 */

import { resetUserRateLimits } from '../middleware/subscription-rate-limits.js';
import {
  grantTemporaryBypass,
  addWhitelistedIP,
} from '../middleware/rate-limit-bypass.js';
import { rateLimiter } from '../middleware/rate-limiter.js';

// Reset a user's rate limits
async function resetUserLimits(userId: string, adminId: string) {
  await resetUserRateLimits(userId);
  console.log(`Limits reset for ${userId} by ${adminId}`);
}

// Grant temporary bypass for debugging
async function grantDebugBypass(userId: string, adminId: string) {
  await grantTemporaryBypass(
    userId,
    60, // 60 minutes
    'Debugging production issue with customer support',
    adminId
  );
  console.log(`Temporary bypass granted to ${userId}`);
}

// Whitelist office IP
function whitelistOfficeIP(adminId: string) {
  addWhitelistedIP('203.0.113.50', adminId);
  console.log('Office IP whitelisted');
}

// Remove ban from user
async function unbanUser(userId: string) {
  await rateLimiter.removeBan(userId);
  console.log(`Ban removed from ${userId}`);
}

// Check user's violation history
async function checkViolations(userId: string) {
  const violations = await rateLimiter.getViolationHistory(userId, 50);

  console.log(`${violations.length} violations found for ${userId}`);
  violations.slice(0, 5).forEach(v => {
    console.log(`- ${v.timestamp}: ${v.endpoint} (${v.attempted}/${v.limit})`);
  });
}

// ============================================================================
// EXAMPLE 7: Client-Side Handling
// ============================================================================

/**
 * In your frontend code
 */

async function fetchWithRateLimitHandling(url: string, options = {}) {
  const response = await fetch(url, options);

  // Handle rate limiting
  if (response.status === 429) {
    const data = await response.json();
    const resetAt = new Date(data.details.resetAt);
    const retryAfter = data.details.retryAfter;

    // Show user-friendly message
    alert(`Rate limit exceeded. Try again at ${resetAt.toLocaleTimeString()}`);

    // Show upgrade CTA if available
    if (data.upgrade) {
      showUpgradeModal(data.upgrade.message, data.upgrade.url);
    }

    // Implement retry logic
    if (retryAfter) {
      console.log(`Retrying after ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return fetchWithRateLimitHandling(url, options); // Retry
    }

    throw new Error('Rate limit exceeded');
  }

  return response;
}

// Track rate limit headers
function trackRateLimits(response: Response) {
  const limit = response.headers.get('X-RateLimit-Limit');
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');

  console.log(`Rate limit: ${remaining}/${limit} (resets at ${reset})`);

  // Warn user when approaching limit
  if (remaining && limit) {
    const percentage = (parseInt(remaining) / parseInt(limit)) * 100;
    if (percentage < 10) {
      showWarning('You\'re approaching your rate limit. Consider upgrading.');
    }
  }
}

// ============================================================================
// EXAMPLE 8: Testing Rate Limits
// ============================================================================

/**
 * In your test suite
 */

import request from 'supertest';
import app from '../src/core/gateway.js';

describe('Rate Limiting', () => {
  it('should enforce rate limits', async () => {
    const apiKey = 'test-api-key';

    // Make requests up to limit
    for (let i = 0; i < 100; i++) {
      const res = await request(app)
        .get('/api/data')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
    }

    // 101st request should be rate limited
    const res = await request(app)
      .get('/api/data')
      .set('Authorization', `Bearer ${apiKey}`);

    expect(res.status).toBe(429);
    expect(res.headers['x-ratelimit-remaining']).toBe('0');
    expect(res.body.error).toBe('Rate limit exceeded');
  });

  it('should bypass rate limits for whitelisted IPs', async () => {
    // Request from localhost (whitelisted)
    for (let i = 0; i < 200; i++) {
      const res = await request(app)
        .get('/api/data')
        .set('X-Forwarded-For', '127.0.0.1');

      expect(res.status).toBe(200);
    }
  });

  it('should enforce endpoint-specific limits', async () => {
    // Auth endpoint has stricter limit (5 in 15 min)
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      // May fail auth, but shouldn't hit rate limit yet
      expect(res.status).not.toBe(429);
    }

    // 6th attempt should be rate limited
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    expect(res.status).toBe(429);
  });
});

// ============================================================================
// EXAMPLE 9: Monitoring & Alerts
// ============================================================================

/**
 * Set up monitoring for rate limiting
 */

import { rateLimiter } from '../middleware/rate-limiter.js';
import { logger } from '../utils/logger.js';

// Check rate limiting health
async function monitorRateLimiting() {
  try {
    // Test Redis connection
    const testResult = await rateLimiter.checkLimit({
      identifier: 'health-check',
      limit: 1,
      windowMs: 1000,
    });

    if (!testResult.allowed) {
      logger.warn('Rate limiting health check: Redis is working');
    }

    return { healthy: true, redis: true };
  } catch (error) {
    logger.error('Rate limiting health check failed:', error);
    return { healthy: false, redis: false };
  }
}

// Run health check every 5 minutes
setInterval(monitorRateLimiting, 5 * 60 * 1000);

// Alert on high violation rate
async function checkViolationRate() {
  // This would query your database for recent violations
  // and alert if rate is too high
  // Placeholder for example
}

// ============================================================================
// EXAMPLE 10: Custom Rate Limiting Logic
// ============================================================================

/**
 * Implement custom rate limiting for specific use cases
 */

import { rateLimiter } from '../middleware/rate-limiter.js';

// Rate limit file uploads (different limits based on file size)
async function rateLimitUpload(userId: string, fileSizeBytes: number) {
  const isLargeFile = fileSizeBytes > 10 * 1024 * 1024; // 10MB

  const result = await rateLimiter.checkLimit({
    identifier: `user:${userId}:upload:${isLargeFile ? 'large' : 'small'}`,
    limit: isLargeFile ? 5 : 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  });

  return result.allowed;
}

// Rate limit based on cost
async function rateLimitByCredit(userId: string, creditCost: number) {
  // Track credits used instead of request count
  // This would require custom implementation
  const key = `credits:${userId}:day`;
  // ... custom logic
}

// Rate limit webhooks from external services
async function rateLimitWebhook(provider: string, eventType: string) {
  const result = await rateLimiter.checkLimit({
    identifier: `webhook:${provider}:${eventType}`,
    limit: 1000,
    windowMs: 60 * 60 * 1000, // 1000 per hour
  });

  return result.allowed;
}

export {
  resetUserLimits,
  grantDebugBypass,
  whitelistOfficeIP,
  unbanUser,
  checkViolations,
  monitorRateLimiting,
  rateLimitUpload,
};
