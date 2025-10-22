/**
 * ChatGPT Authentication Middleware
 *
 * Validates API keys and JWT tokens for ChatGPT Custom GPT Actions.
 * Supports multiple authentication methods:
 * - Bearer tokens (JWT)
 * - API keys (custom header)
 * - ChatGPT app keys (for ChatGPT GPT Actions)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';

// In production, these would come from environment variables or a database
const VALID_API_KEYS = new Set([
  process.env.JARVIS_AUTH_TOKEN || 'test-token',
  process.env.CHATGPT_APP_KEY || '',
]);

// Remove empty keys
VALID_API_KEYS.delete('');

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    source: 'chatgpt' | 'api' | 'web';
    apiKey?: string;
  };
}

/**
 * Main authentication middleware
 * Validates Bearer tokens or API keys from headers
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract authentication credentials
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;
    const chatgptAppKey = req.headers['x-chatgpt-app-key'] as string;

    // Check Bearer token
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (validateToken(token)) {
        (req as AuthenticatedRequest).user = {
          id: 'chatgpt-user',
          source: 'chatgpt',
          apiKey: token,
        };
        return next();
      }
    }

    // Check API key header
    if (apiKey && validateApiKey(apiKey)) {
      (req as AuthenticatedRequest).user = {
        id: 'api-user',
        source: 'api',
        apiKey,
      };
      return next();
    }

    // Check ChatGPT app key
    if (chatgptAppKey && validateApiKey(chatgptAppKey)) {
      (req as AuthenticatedRequest).user = {
        id: 'chatgpt-gpt',
        source: 'chatgpt',
        apiKey: chatgptAppKey,
      };
      return next();
    }

    // Development mode: allow unauthenticated requests
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Development mode: Allowing unauthenticated ChatGPT request');
      (req as AuthenticatedRequest).user = {
        id: 'dev-user',
        source: 'api',
      };
      return next();
    }

    // No valid authentication found
    logger.warn(`Authentication failed for ${req.method} ${req.path}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication is required. Provide a Bearer token, x-api-key, or x-chatgpt-app-key header.',
    });
  } catch (error: any) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Authentication failed due to server error.',
    });
  }
}

/**
 * Validate Bearer token (JWT or API token)
 */
function validateToken(token: string): boolean {
  if (!token || token.length < 10) {
    return false;
  }

  // Check against valid API keys
  if (VALID_API_KEYS.has(token)) {
    return true;
  }

  // TODO: Implement JWT validation
  // For now, just check if it looks like a JWT
  if (token.includes('.') && token.split('.').length === 3) {
    // In production, verify JWT signature and expiration
    logger.info('JWT token detected (validation not yet implemented)');
    return true;
  }

  return false;
}

/**
 * Validate API key
 */
function validateApiKey(apiKey: string): boolean {
  if (!apiKey || apiKey.length < 10) {
    return false;
  }

  // Check against valid API keys
  return VALID_API_KEYS.has(apiKey);
}

/**
 * Optional authentication - allows requests to proceed even without auth
 * Useful for public endpoints that benefit from knowing the user if available
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Try to authenticate, but don't fail if no credentials
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (validateToken(token)) {
        (req as AuthenticatedRequest).user = {
          id: 'chatgpt-user',
          source: 'chatgpt',
          apiKey: token,
        };
      }
    } else if (apiKey && validateApiKey(apiKey)) {
      (req as AuthenticatedRequest).user = {
        id: 'api-user',
        source: 'api',
        apiKey,
      };
    }

    // Always proceed
    next();
  } catch (error: any) {
    logger.error('Optional auth error:', error);
    // Proceed anyway
    next();
  }
}

/**
 * Require specific authentication source
 */
export function requireSource(allowedSources: Array<'chatgpt' | 'api' | 'web'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!allowedSources.includes(authReq.user.source)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This endpoint is only accessible to: ${allowedSources.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Add a new API key (for admin use)
 * In production, this would update a database
 */
export function addApiKey(apiKey: string): void {
  if (apiKey && apiKey.length >= 10) {
    VALID_API_KEYS.add(apiKey);
    logger.info(`API key added (ending in ...${apiKey.slice(-4)})`);
  }
}

/**
 * Remove an API key (for admin use)
 */
export function revokeApiKey(apiKey: string): boolean {
  const removed = VALID_API_KEYS.delete(apiKey);
  if (removed) {
    logger.info(`API key revoked (ending in ...${apiKey.slice(-4)})`);
  }
  return removed;
}
