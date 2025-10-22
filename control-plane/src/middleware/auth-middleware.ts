/**
 * Authentication & Authorization Middleware
 *
 * Protects routes with user authentication and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: 'USER' | 'ADMIN' | 'SUPERADMIN';
      };
    }
  }
}

/**
 * Authenticate user from API key or session
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check for API key in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7);

      const key = await prisma.apiKey.findUnique({
        where: { key: apiKey, active: true },
        include: { user: true },
      });

      if (key) {
        // Update last used timestamp
        await prisma.apiKey.update({
          where: { id: key.id },
          data: {
            lastUsedAt: new Date(),
            requestCount: { increment: 1 },
          },
        });

        req.user = {
          id: key.user.id,
          email: key.user.email,
          name: key.user.name,
          role: key.user.role,
        };

        return next();
      }
    }

    // Check for user ID in custom header (for development/testing)
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
        return next();
      }
    }

    // TODO: Integrate with NextAuth session for web requests
    // For now, return unauthorized
    res.status(401).json({
      success: false,
      error: 'Unauthorized - API key or authentication required',
    });
  } catch (error: any) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Require superadmin role
 */
export function requireSuperadmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'SUPERADMIN') {
    res.status(403).json({
      success: false,
      error: 'Superadmin access required',
    });
    return;
  }

  next();
}

/**
 * Require admin or superadmin role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (!['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
}

/**
 * Optional authentication (user not required)
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7);

      const key = await prisma.apiKey.findUnique({
        where: { key: apiKey, active: true },
        include: { user: true },
      });

      if (key) {
        req.user = {
          id: key.user.id,
          email: key.user.email,
          name: key.user.name,
          role: key.user.role,
        };
      }
    }

    next();
  } catch (error: any) {
    logger.error('Optional auth error:', error);
    next();
  }
}
