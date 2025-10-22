/**
 * Two-Factor Authentication Middleware
 *
 * Protects routes requiring 2FA verification
 * Handles 2FA bypass for API tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export interface TwoFactorConfig {
  /**
   * Routes that require 2FA verification
   * Supports wildcards: /dashboard/*
   */
  protectedRoutes: string[];

  /**
   * Routes that are excluded from 2FA checks
   * Even if a user has 2FA enabled
   */
  excludedRoutes: string[];

  /**
   * Where to redirect users who need 2FA verification
   */
  verificationPath: string;

  /**
   * API token header name for bypassing 2FA
   * (for programmatic access)
   */
  apiTokenHeader?: string;
}

const DEFAULT_CONFIG: TwoFactorConfig = {
  protectedRoutes: ['/dashboard', '/dashboard/*', '/settings', '/settings/*'],
  excludedRoutes: [
    '/api/*',
    '/auth/*',
    '/login',
    '/logout',
    '/_next/*',
    '/public/*',
  ],
  verificationPath: '/auth/2fa-prompt',
  apiTokenHeader: 'X-API-Token',
};

/**
 * Check if a path matches a pattern (supports wildcards)
 */
function matchesPattern(path: string, pattern: string): boolean {
  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\//g, '\\/');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Check if a path is excluded from 2FA checks
 */
function isExcludedPath(path: string, excludedRoutes: string[]): boolean {
  return excludedRoutes.some((pattern) => matchesPattern(path, pattern));
}

/**
 * Check if a path requires 2FA verification
 */
function isProtectedPath(path: string, protectedRoutes: string[]): boolean {
  return protectedRoutes.some((pattern) => matchesPattern(path, pattern));
}

/**
 * Verify API token for bypassing 2FA
 * This allows programmatic access without 2FA
 */
async function verifyApiToken(token: string): Promise<boolean> {
  // TODO: Implement API token verification
  // This should check against stored API tokens in database
  // For now, return false to disable API token bypass
  return false;
}

/**
 * Two-Factor Authentication Middleware
 *
 * Usage in middleware.ts:
 * ```
 * import { twoFactorMiddleware } from '@/lib/auth/two-factor-middleware';
 *
 * export async function middleware(request: NextRequest) {
 *   return twoFactorMiddleware(request);
 * }
 * ```
 */
export async function twoFactorMiddleware(
  request: NextRequest,
  config: Partial<TwoFactorConfig> = {}
): Promise<NextResponse> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { pathname } = request.nextUrl;

  // Check if path is excluded
  if (isExcludedPath(pathname, finalConfig.excludedRoutes)) {
    return NextResponse.next();
  }

  // Check if path requires protection
  if (!isProtectedPath(pathname, finalConfig.protectedRoutes)) {
    return NextResponse.next();
  }

  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated - let NextAuth handle it
  if (!token) {
    return NextResponse.next();
  }

  // Check for API token bypass
  if (finalConfig.apiTokenHeader) {
    const apiToken = request.headers.get(finalConfig.apiTokenHeader);
    if (apiToken) {
      const isValidToken = await verifyApiToken(apiToken);
      if (isValidToken) {
        // API token valid - bypass 2FA
        return NextResponse.next();
      }
    }
  }

  // Check 2FA status
  const twoFactorEnabled = token.twoFactorEnabled as boolean;
  const twoFactorVerified = token.twoFactorVerified as boolean;

  // User has 2FA enabled but hasn't verified
  if (twoFactorEnabled && !twoFactorVerified) {
    // Redirect to 2FA verification page
    const url = request.nextUrl.clone();
    url.pathname = finalConfig.verificationPath;

    // Store the original URL to redirect back after verification
    url.searchParams.set('callbackUrl', pathname);

    return NextResponse.redirect(url);
  }

  // User is authenticated and 2FA verified (or not required)
  return NextResponse.next();
}

/**
 * Helper function to require 2FA in API routes
 *
 * Usage:
 * ```
 * export async function GET(request: NextRequest) {
 *   const session = await require2FA(request);
 *   if (!session) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   // ... rest of API route
 * }
 * ```
 */
export async function require2FA(request: NextRequest): Promise<any | null> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return null;
  }

  const twoFactorEnabled = token.twoFactorEnabled as boolean;
  const twoFactorVerified = token.twoFactorVerified as boolean;

  // If 2FA is enabled but not verified, deny access
  if (twoFactorEnabled && !twoFactorVerified) {
    return null;
  }

  return token;
}

/**
 * Check if a user session has completed 2FA verification
 */
export async function is2FAVerified(request: NextRequest): Promise<boolean> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return false;
  }

  const twoFactorEnabled = token.twoFactorEnabled as boolean;
  const twoFactorVerified = token.twoFactorVerified as boolean;

  // If 2FA is not enabled, consider it "verified"
  if (!twoFactorEnabled) {
    return true;
  }

  return twoFactorVerified;
}

/**
 * Mark 2FA as verified in the session
 * Call this after successful 2FA verification
 */
export function mark2FAVerified(): { twoFactorVerified: boolean } {
  return { twoFactorVerified: true };
}
