/**
 * Rate Limiting Configuration
 *
 * Defines rate limit tiers, endpoint-specific limits, and whitelisting rules
 * for the Jarvis AI platform's comprehensive rate limiting system.
 */

import { PlanTier } from '@prisma/client';

// ============================================================================
// RATE LIMIT TIERS
// ============================================================================

export interface RateLimitQuota {
  // AI-specific limits
  aiRequestsPerDay: number;

  // API limits
  apiCallsPerHour: number;
  apiCallsPerMinute: number;

  // Burst allowance (20% over limit for 1 minute)
  burstMultiplier: number;

  // Nice to have features
  concurrentRequests?: number;
}

export const RATE_LIMIT_TIERS: Record<PlanTier, RateLimitQuota> = {
  [PlanTier.FREE_TRIAL]: {
    aiRequestsPerDay: 10,
    apiCallsPerHour: 100,
    apiCallsPerMinute: 10,
    burstMultiplier: 1.2,
    concurrentRequests: 2,
  },
  [PlanTier.STARTER]: {
    aiRequestsPerDay: 50,
    apiCallsPerHour: 500,
    apiCallsPerMinute: 50,
    burstMultiplier: 1.2,
    concurrentRequests: 5,
  },
  [PlanTier.PROFESSIONAL]: {
    aiRequestsPerDay: 200,
    apiCallsPerHour: 2000,
    apiCallsPerMinute: 200,
    burstMultiplier: 1.2,
    concurrentRequests: 10,
  },
  [PlanTier.ENTERPRISE]: {
    aiRequestsPerDay: -1, // unlimited
    apiCallsPerHour: -1, // unlimited
    apiCallsPerMinute: 1000, // soft limit for DDoS protection
    burstMultiplier: 1.5,
    concurrentRequests: 50,
  },
};

// Anonymous/unauthenticated users
export const ANONYMOUS_LIMITS: RateLimitQuota = {
  aiRequestsPerDay: 0,
  apiCallsPerHour: 10,
  apiCallsPerMinute: 2,
  burstMultiplier: 1.0,
  concurrentRequests: 1,
};

// ============================================================================
// ENDPOINT-SPECIFIC OVERRIDES
// ============================================================================

export interface EndpointRateLimit {
  maxRequests: number;
  windowMs: number; // in milliseconds
  message?: string;
  skipAuth?: boolean; // Skip rate limiting for authenticated users
}

/**
 * Endpoint-specific rate limits that override tier-based limits
 * These are stricter limits for security-sensitive endpoints
 */
export const ENDPOINT_RATE_LIMITS: Record<string, EndpointRateLimit> = {
  // Auth endpoints - very strict
  'POST /api/auth/login': {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  'POST /api/auth/signup': {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many signup attempts. Please try again later.',
  },
  'POST /api/auth/2fa/validate': {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many 2FA attempts. Please try again in 15 minutes.',
  },
  'POST /api/auth/password-reset': {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many password reset requests. Please try again later.',
  },
  'POST /api/auth/verify-email': {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many verification attempts. Please check your email.',
  },

  // Privacy endpoints
  'POST /api/privacy/export-data': {
    maxRequests: 1,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    message: 'You can only request a data export once per day.',
  },
  'DELETE /api/privacy/delete-account': {
    maxRequests: 1,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    message: 'Account deletion can only be requested once per day.',
  },

  // AI generation endpoints - counts against AI quota
  'POST /api/ai/generate': {
    maxRequests: -1, // Use tier-based limits
    windowMs: 0,
  },
  'POST /api/ai/chat': {
    maxRequests: -1, // Use tier-based limits
    windowMs: 0,
  },

  // Integration endpoints - moderate limits
  'GET /api/integrations/:provider/auth': {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many integration authorization attempts.',
  },
  'POST /api/integrations/:provider/webhook': {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Webhook rate limit exceeded.',
    skipAuth: true, // Webhooks come from external services
  },

  // Admin endpoints - moderate limits
  'POST /api/admin/rate-limits/reset': {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many admin operations.',
  },
};

// ============================================================================
// WHITELISTING
// ============================================================================

/**
 * IP addresses that bypass rate limiting
 * Use cautiously - primarily for development and trusted services
 */
export const WHITELISTED_IPS: string[] = [
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  // Add production trusted IPs here if needed
];

/**
 * API keys that bypass rate limiting
 * These are for trusted internal services and monitoring tools
 */
export const WHITELISTED_API_KEY_SCOPES: string[] = [
  'system:internal',
  'monitoring:health-check',
  'admin:superadmin',
];

/**
 * URL patterns that bypass rate limiting
 * Primarily for health checks and static assets
 */
export const BYPASS_PATTERNS: RegExp[] = [
  /^\/health/,
  /^\/health\/detailed/,
  /^\/api\/health/,
  /^\/status$/,
  /^\/favicon\.ico$/,
  /^\/public\//,
  /^\/static\//,
  /^\/_next\//,
  /^\/api\/_next\//,
];

// ============================================================================
// REDIS CONFIGURATION
// ============================================================================

export const REDIS_RATE_LIMIT_CONFIG = {
  keyPrefix: 'jarvis:ratelimit:',

  // Key patterns
  keys: {
    user: (userId: string, window: string) => `user:${userId}:${window}`,
    ip: (ip: string, window: string) => `ip:${ip}:${window}`,
    endpoint: (endpoint: string, identifier: string, window: string) =>
      `endpoint:${endpoint}:${identifier}:${window}`,
    apiKey: (apiKeyId: string, window: string) => `apikey:${apiKeyId}:${window}`,
    violation: (identifier: string) => `violations:${identifier}`,
    history: (userId: string) => `history:${userId}`,
  },

  // TTL settings
  ttl: {
    minute: 60,
    hour: 60 * 60,
    day: 24 * 60 * 60,
    week: 7 * 24 * 60 * 60,
  },
};

// ============================================================================
// RESPONSE HEADERS
// ============================================================================

export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
  // Custom headers
  TIER: 'X-RateLimit-Tier',
  QUOTA_TYPE: 'X-RateLimit-Quota-Type',
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const RATE_LIMIT_MESSAGES = {
  QUOTA_EXCEEDED: (tier: string, resetTime: string) =>
    `Rate limit exceeded for ${tier} tier. Resets at ${resetTime}. Upgrade your plan for higher limits.`,

  ENDPOINT_LIMIT: (endpoint: string, resetTime: string) =>
    `Rate limit exceeded for ${endpoint}. Try again at ${resetTime}.`,

  AI_QUOTA_EXCEEDED: (tier: string, limit: number, resetTime: string) =>
    `AI request quota exceeded. ${tier} tier allows ${limit} requests per day. Resets at ${resetTime}. Upgrade for more requests.`,

  UPGRADE_SUGGESTION: (currentTier: string, nextTier: string) =>
    `You're on the ${currentTier} plan. Upgrade to ${nextTier} for higher rate limits.`,

  TEMPORARY_BAN: (until: string) =>
    `Too many rate limit violations. Access temporarily restricted until ${until}.`,
};

// ============================================================================
// VIOLATION TRACKING
// ============================================================================

export const VIOLATION_CONFIG = {
  // How many violations before temporary ban
  maxViolationsBeforeBan: 10,

  // Violation window (violations older than this are ignored)
  violationWindowMs: 60 * 60 * 1000, // 1 hour

  // Ban duration after too many violations
  banDurationMs: 24 * 60 * 60 * 1000, // 24 hours

  // How long to keep violation history
  historyRetentionDays: 30,
};

// ============================================================================
// GRACEFUL DEGRADATION
// ============================================================================

export const FALLBACK_CONFIG = {
  // If Redis is unavailable, use in-memory fallback with these limits
  fallbackLimits: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
  },

  // Log warning if Redis unavailable
  logRedisErrors: true,

  // Still allow requests if Redis down (vs blocking all traffic)
  allowOnRedisFailure: true,
};

// ============================================================================
// MONITORING & ALERTS
// ============================================================================

export const MONITORING_CONFIG = {
  // Alert if user hits X% of their limit
  warningThresholds: [0.8, 0.9, 0.95],

  // Log rate limit events
  logViolations: true,
  logWarnings: true,

  // Track metrics
  trackMetrics: true,
};

// Export helper function
export function getRateLimitForTier(tier: PlanTier): RateLimitQuota {
  return RATE_LIMIT_TIERS[tier] || ANONYMOUS_LIMITS;
}

export function getEndpointLimit(method: string, path: string): EndpointRateLimit | null {
  const key = `${method} ${path}`;
  return ENDPOINT_RATE_LIMITS[key] || null;
}

export function isWhitelistedIP(ip: string): boolean {
  return WHITELISTED_IPS.includes(ip);
}

export function shouldBypassRateLimit(path: string): boolean {
  return BYPASS_PATTERNS.some(pattern => pattern.test(path));
}
