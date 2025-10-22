/**
 * TLS/HTTPS Enforcement Middleware for Jarvis AI
 *
 * Security Features:
 * - Force HTTPS redirects in production
 * - HSTS header enforcement
 * - Secure cookie configuration
 * - X-Forwarded-Proto header validation
 * - Development mode support (allows HTTP on localhost)
 *
 * @module middleware/tls-enforcement
 */

import { Request, Response, NextFunction } from 'express';

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const TRUST_PROXY = process.env.TRUST_PROXY !== 'false'; // Default to true

/**
 * Configuration for TLS enforcement
 */
interface TLSConfig {
  /**
   * Enable HTTPS enforcement (redirects)
   * @default true in production, false in development
   */
  enforceHTTPS: boolean;

  /**
   * Enable HSTS (HTTP Strict Transport Security)
   * @default true in production, false in development
   */
  enableHSTS: boolean;

  /**
   * HSTS max-age in seconds
   * @default 31536000 (1 year)
   */
  hstsMaxAge: number;

  /**
   * Include subdomains in HSTS
   * @default true
   */
  hstsIncludeSubDomains: boolean;

  /**
   * Enable HSTS preload
   * @default true
   */
  hstsPreload: boolean;

  /**
   * Paths to exclude from HTTPS enforcement (e.g., health checks)
   * @default ['/health', '/.well-known/']
   */
  excludePaths: string[];

  /**
   * Trust proxy headers (X-Forwarded-Proto)
   * Required when behind nginx/load balancer
   * @default true
   */
  trustProxy: boolean;
}

/**
 * Default TLS configuration
 */
const DEFAULT_CONFIG: TLSConfig = {
  enforceHTTPS: IS_PRODUCTION,
  enableHSTS: IS_PRODUCTION,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubDomains: true,
  hstsPreload: true,
  excludePaths: ['/health', '/.well-known/'],
  trustProxy: TRUST_PROXY,
};

/**
 * Check if the request is secure (HTTPS)
 * Takes into account proxy headers when behind nginx/load balancer
 */
function isSecureRequest(req: Request, config: TLSConfig): boolean {
  // Check if we're in development and on localhost
  if (!IS_PRODUCTION && (req.hostname === 'localhost' || req.hostname === '127.0.0.1')) {
    return true; // Allow HTTP in local development
  }

  // Check X-Forwarded-Proto header (set by nginx)
  if (config.trustProxy) {
    const forwardedProto = req.get('X-Forwarded-Proto');
    if (forwardedProto) {
      return forwardedProto === 'https';
    }
  }

  // Check direct connection security
  return req.secure || req.protocol === 'https';
}

/**
 * Check if a path should be excluded from HTTPS enforcement
 */
function isExcludedPath(path: string, excludePaths: string[]): boolean {
  return excludePaths.some(excluded => path.startsWith(excluded));
}

/**
 * TLS Enforcement Middleware Factory
 *
 * @param customConfig - Optional custom configuration
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import { tlsEnforcement } from './middleware/tls-enforcement';
 *
 * // Use with default config
 * app.use(tlsEnforcement());
 *
 * // Use with custom config
 * app.use(tlsEnforcement({
 *   enforceHTTPS: true,
 *   excludePaths: ['/health', '/metrics']
 * }));
 * ```
 */
export function tlsEnforcement(customConfig?: Partial<TLSConfig>) {
  const config: TLSConfig = {
    ...DEFAULT_CONFIG,
    ...customConfig,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip excluded paths
    if (isExcludedPath(req.path, config.excludePaths)) {
      return next();
    }

    // Check if request is secure
    const isSecure = isSecureRequest(req, config);

    // Enforce HTTPS if enabled and not secure
    if (config.enforceHTTPS && !isSecure) {
      // Build redirect URL
      const redirectUrl = `https://${req.hostname}${req.url}`;

      // Log redirect for monitoring
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(`[TLS] Redirecting HTTP to HTTPS: ${req.url} -> ${redirectUrl}`);
      }

      // Perform 301 permanent redirect
      return void res.redirect(301, redirectUrl);
    }

    // Add HSTS header if enabled and request is secure
    if (config.enableHSTS && isSecure) {
      let hstsValue = `max-age=${config.hstsMaxAge}`;

      if (config.hstsIncludeSubDomains) {
        hstsValue += '; includeSubDomains';
      }

      if (config.hstsPreload) {
        hstsValue += '; preload';
      }

      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    next();
  };
}

/**
 * Secure Cookie Configuration Middleware
 *
 * Ensures cookies are set with secure flags in production:
 * - Secure: Only sent over HTTPS
 * - HttpOnly: Not accessible via JavaScript
 * - SameSite: CSRF protection
 *
 * @example
 * ```typescript
 * import { secureCookies } from './middleware/tls-enforcement';
 *
 * app.use(secureCookies());
 * ```
 */
export function secureCookies() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Override res.cookie to add secure flags
    const originalCookie = res.cookie.bind(res);

    res.cookie = (name: string, value: any, options?: any): Response => {
      const secureOptions = {
        ...options,
        secure: IS_PRODUCTION ? true : (options?.secure ?? false),
        httpOnly: options?.httpOnly ?? true,
        sameSite: options?.sameSite ?? 'strict',
      };

      return originalCookie(name, value, secureOptions);
    };

    next();
  };
}

/**
 * Security Headers Middleware
 *
 * Adds additional security headers beyond what nginx provides
 * This is a defense-in-depth approach
 *
 * @example
 * ```typescript
 * import { securityHeaders } from './middleware/tls-enforcement';
 *
 * app.use(securityHeaders());
 * ```
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only set these headers if they're not already set by nginx
    if (!res.getHeader('X-Content-Type-Options')) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    if (!res.getHeader('X-Frame-Options')) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    if (!res.getHeader('X-XSS-Protection')) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    if (!res.getHeader('Referrer-Policy')) {
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // Remove server identification header
    res.removeHeader('X-Powered-By');

    next();
  };
}

/**
 * Complete TLS Security Stack
 *
 * Combines all TLS/security middleware into a single function
 *
 * @param config - Optional TLS configuration
 * @returns Array of middleware functions
 *
 * @example
 * ```typescript
 * import { tlsSecurityStack } from './middleware/tls-enforcement';
 *
 * app.use(tlsSecurityStack());
 * ```
 */
export function tlsSecurityStack(config?: Partial<TLSConfig>) {
  return [
    tlsEnforcement(config),
    secureCookies(),
    securityHeaders(),
  ];
}

/**
 * Validate TLS configuration
 * Checks if TLS is properly configured in production
 *
 * @returns Validation result
 */
export function validateTLSConfig(): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check production configuration
  if (IS_PRODUCTION) {
    if (!TRUST_PROXY) {
      warnings.push('TRUST_PROXY is disabled in production. X-Forwarded-Proto headers will be ignored.');
    }

    // Check if behind a reverse proxy
    if (!process.env.BEHIND_PROXY) {
      warnings.push('BEHIND_PROXY environment variable not set. Ensure you are using nginx or a load balancer.');
    }

    // Check JWT secret
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET is not set or too short. Use a strong secret (32+ characters).');
    }

    // Check CSRF secret
    if (!process.env.CSRF_SECRET) {
      errors.push('CSRF_SECRET is not set.');
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Log TLS configuration on startup
 */
export function logTLSConfig(): void {
  const validation = validateTLSConfig();

  console.log('\n=== TLS/HTTPS Configuration ===');
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`HTTPS Enforcement: ${IS_PRODUCTION ? 'ENABLED' : 'DISABLED'}`);
  console.log(`HSTS: ${IS_PRODUCTION ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Trust Proxy: ${TRUST_PROXY ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Secure Cookies: ${IS_PRODUCTION ? 'ENABLED' : 'DISABLED'}`);

  if (validation.warnings.length > 0) {
    console.log('\nWarnings:');
    validation.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  if (validation.errors.length > 0) {
    console.log('\nErrors:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (!validation.valid) {
    console.log('\n⚠️  TLS configuration has errors. Please fix them before deploying to production.');
  } else {
    console.log('\n✅ TLS configuration is valid');
  }

  console.log('================================\n');
}

// Default export
export default {
  tlsEnforcement,
  secureCookies,
  securityHeaders,
  tlsSecurityStack,
  validateTLSConfig,
  logTLSConfig,
};
