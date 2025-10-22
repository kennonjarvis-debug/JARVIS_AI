/**
 * Authentication Middleware
 * Verifies Supabase JWT tokens for protected routes
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, type User } from '@supabase/supabase-js';
import { Logger } from '@jarvis/shared';

const logger = new Logger('AuthMiddleware');

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to require authentication for routes
 * Verifies Bearer token in Authorization header
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Missing authorization token',
        message: 'Please provide a valid Bearer token in the Authorization header'
      });
      return;
    }

    const token = authHeader.substring(7);

    // Get Supabase credentials from environment
    // These are set in netlify.toml for production
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Supabase credentials not configured', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        env: process.env.NODE_ENV
      });
      res.status(500).json({
        error: 'Authentication service not configured',
        message: 'Please contact support'
      });
      return;
    }

    // Create Supabase client for this request
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid or expired token', { error: error?.message });
      res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please sign in again'
      });
      return;
    }

    // Attach user to request object
    req.user = user;
    logger.debug('User authenticated', { userId: user.id, email: user.email });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred while verifying your credentials'
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 * Useful for routes that have different behavior for authenticated vs anonymous users
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }

    const token = authHeader.substring(7);
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      next();
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = user;
      logger.debug('Optional auth: User authenticated', { userId: user.id });
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error', error);
    // Don't fail the request, just continue without user
    next();
  }
}
