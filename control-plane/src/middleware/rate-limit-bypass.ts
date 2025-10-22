/**
 * Rate Limit Bypass Middleware
 *
 * Allows bypassing rate limits for:
 * - Whitelisted IPs (localhost, admin IPs)
 * - Trusted API keys (monitoring, internal services)
 * - Specific endpoints (health checks, static assets)
 * - Temporary bypass tokens (for debugging)
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import {
  isWhitelistedIP,
  shouldBypassRateLimit,
  WHITELISTED_API_KEY_SCOPES,
} from '../config/rate-limits.js';

const prisma = new PrismaClient();

// ============================================================================
// BYPASS REASONS
// ============================================================================

export enum BypassReason {
  WHITELISTED_IP = 'whitelisted_ip',
  TRUSTED_API_KEY = 'trusted_api_key',
  BYPASS_ENDPOINT = 'bypass_endpoint',
  ADMIN_OVERRIDE = 'admin_override',
  TEMPORARY_TOKEN = 'temporary_token',
  SUPERADMIN = 'superadmin',
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      rateLimitBypass?: {
        enabled: boolean;
        reason: BypassReason;
        details?: string;
      };
    }
  }
}

// ============================================================================
// MAIN BYPASS CHECKER
// ============================================================================

/**
 * Check if request should bypass rate limiting
 * Should be applied BEFORE rate limit middleware
 */
export function checkRateLimitBypass(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check multiple bypass conditions
  const bypass =
    checkWhitelistedIP(req) ||
    checkBypassEndpoint(req) ||
    checkTrustedAPIKey(req) ||
    checkSuperadmin(req) ||
    checkTemporaryBypass(req);

  if (bypass) {
    req.rateLimitBypass = bypass;

    // Log bypass (for audit trail)
    logger.debug(`Rate limit bypassed: ${bypass.reason} - ${req.method} ${req.path}`, {
      reason: bypass.reason,
      details: bypass.details,
      ip: getClientIP(req),
      userId: req.user?.id,
    });

    // Set custom header to indicate bypass (useful for debugging)
    res.setHeader('X-RateLimit-Bypass', bypass.reason);
  }

  next();
}

// ============================================================================
// BYPASS CHECKS
// ============================================================================

/**
 * Check if request is from whitelisted IP
 */
function checkWhitelistedIP(req: Request): { enabled: boolean; reason: BypassReason; details?: string } | null {
  const ip = getClientIP(req);

  if (isWhitelistedIP(ip)) {
    return {
      enabled: true,
      reason: BypassReason.WHITELISTED_IP,
      details: `IP: ${ip}`,
    };
  }

  return null;
}

/**
 * Check if endpoint should bypass rate limiting
 */
function checkBypassEndpoint(req: Request): { enabled: boolean; reason: BypassReason; details?: string } | null {
  if (shouldBypassRateLimit(req.path)) {
    return {
      enabled: true,
      reason: BypassReason.BYPASS_ENDPOINT,
      details: `Endpoint: ${req.path}`,
    };
  }

  return null;
}

/**
 * Check if request uses trusted API key
 */
function checkTrustedAPIKey(req: Request): { enabled: boolean; reason: BypassReason; details?: string } | null {
  // This requires the auth middleware to have already run
  if (!req.user) return null;

  // Check if user's API key has bypass scopes
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  // We'd need to store the API key info in the request
  // For now, check if API key is in a special bypass list
  // This would be populated by the auth middleware

  // Example: Check if API key has system:internal scope
  // In a real implementation, auth middleware would populate this
  const apiKeyScopes = (req as any).apiKeyScopes || [];

  const hasBypassScope = apiKeyScopes.some((scope: string) =>
    WHITELISTED_API_KEY_SCOPES.includes(scope)
  );

  if (hasBypassScope) {
    return {
      enabled: true,
      reason: BypassReason.TRUSTED_API_KEY,
      details: `Scopes: ${apiKeyScopes.join(', ')}`,
    };
  }

  return null;
}

/**
 * Check if user is superadmin
 */
function checkSuperadmin(req: Request): { enabled: boolean; reason: BypassReason; details?: string } | null {
  if (req.user?.role === 'SUPERADMIN') {
    return {
      enabled: true,
      reason: BypassReason.SUPERADMIN,
      details: `User: ${req.user.email}`,
    };
  }

  return null;
}

/**
 * Check for temporary bypass token (for debugging)
 */
function checkTemporaryBypass(req: Request): { enabled: boolean; reason: BypassReason; details?: string } | null {
  const bypassToken = req.headers['x-rate-limit-bypass-token'] as string;

  if (!bypassToken) return null;

  // Verify temporary bypass token
  // In production, these would be stored in Redis with expiry
  const validToken = process.env.RATE_LIMIT_BYPASS_TOKEN;

  if (validToken && bypassToken === validToken) {
    return {
      enabled: true,
      reason: BypassReason.TEMPORARY_TOKEN,
      details: 'Temporary bypass token',
    };
  }

  return null;
}

// ============================================================================
// ADMIN BYPASS MANAGEMENT
// ============================================================================

/**
 * Temporary bypass storage (in production, use Redis)
 */
const temporaryBypasses = new Map<
  string,
  {
    userId: string;
    reason: string;
    expiresAt: Date;
    createdBy: string;
  }
>();

/**
 * Grant temporary rate limit bypass to user (admin function)
 */
export async function grantTemporaryBypass(
  userId: string,
  durationMinutes: number,
  reason: string,
  adminId: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  temporaryBypasses.set(userId, {
    userId,
    reason,
    expiresAt,
    createdBy: adminId,
  });

  logger.info(`Temporary bypass granted: ${userId} for ${durationMinutes} minutes by ${adminId}`, {
    userId,
    reason,
    expiresAt,
    adminId,
  });

  // In production, store in Redis:
  // await redis.set(
  //   `rate-limit:bypass:${userId}`,
  //   JSON.stringify({ reason, createdBy: adminId }),
  //   'EX',
  //   durationMinutes * 60
  // );
}

/**
 * Revoke temporary bypass
 */
export function revokeTemporaryBypass(userId: string): void {
  temporaryBypasses.delete(userId);
  logger.info(`Temporary bypass revoked: ${userId}`);

  // In production:
  // await redis.del(`rate-limit:bypass:${userId}`);
}

/**
 * Check if user has temporary bypass
 */
export function hasTemporaryBypass(userId: string): boolean {
  const bypass = temporaryBypasses.get(userId);

  if (!bypass) return false;

  // Check if expired
  if (bypass.expiresAt < new Date()) {
    temporaryBypasses.delete(userId);
    return false;
  }

  return true;
}

/**
 * List all active bypasses (admin function)
 */
export function listActiveBypass(): Array<{
  userId: string;
  reason: string;
  expiresAt: Date;
  createdBy: string;
}> {
  const now = new Date();
  const active: Array<{
    userId: string;
    reason: string;
    expiresAt: Date;
    createdBy: string;
  }> = [];

  for (const [userId, bypass] of temporaryBypasses.entries()) {
    if (bypass.expiresAt > now) {
      active.push(bypass);
    } else {
      // Cleanup expired
      temporaryBypasses.delete(userId);
    }
  }

  return active;
}

// ============================================================================
// IP WHITELIST MANAGEMENT
// ============================================================================

/**
 * Runtime IP whitelist (supplements config)
 */
const runtimeWhitelist = new Set<string>();

/**
 * Add IP to runtime whitelist (admin function)
 */
export function addWhitelistedIP(ip: string, adminId: string): void {
  runtimeWhitelist.add(ip);
  logger.info(`IP whitelisted: ${ip} by ${adminId}`);

  // In production, persist to database:
  // await prisma.whitelistedIP.create({
  //   data: { ip, addedBy: adminId }
  // });
}

/**
 * Remove IP from runtime whitelist
 */
export function removeWhitelistedIP(ip: string, adminId: string): void {
  runtimeWhitelist.delete(ip);
  logger.info(`IP removed from whitelist: ${ip} by ${adminId}`);

  // In production:
  // await prisma.whitelistedIP.delete({ where: { ip } });
}

/**
 * Check if IP is in runtime whitelist
 */
export function isRuntimeWhitelisted(ip: string): boolean {
  return runtimeWhitelist.has(ip);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get client IP from request
 * Handles proxies and load balancers
 */
function getClientIP(req: Request): string {
  // Check X-Forwarded-For header (set by proxies)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  // Fallback to connection remote address
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Middleware to extract and store API key scopes (extends auth middleware)
 */
export async function extractAPIKeyScopes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7);

      const key = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        select: { scopes: true },
      });

      if (key) {
        (req as any).apiKeyScopes = key.scopes;
      }
    }
  } catch (error: any) {
    logger.error('Failed to extract API key scopes:', error);
  }

  next();
}
