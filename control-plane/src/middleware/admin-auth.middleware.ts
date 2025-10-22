/**
 * Admin Authentication Middleware
 *
 * Protects admin-only routes from unauthorized access
 * Checks if the authenticated user has admin privileges
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export interface AdminRequest extends Request {
  userId?: string;
  userRole?: string;
  isAdmin?: boolean;
}

/**
 * Middleware to require admin authentication
 *
 * Prerequisites:
 * - User must be authenticated (userId should be set by auth middleware)
 * - User must have admin role in database
 *
 * Usage:
 * ```typescript
 * router.delete('/api/backups/:id', requireAdmin, async (req, res) => {
 *   // Only admins can access this route
 * });
 * ```
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminReq = req as AdminRequest;
    const userId = adminReq.userId;

    // Check if user is authenticated
    if (!userId) {
      logger.warn('Admin route accessed without authentication', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Please log in.'
      });
      return;
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      logger.warn('Admin route accessed by non-existent user', {
        userId,
        path: req.path
      });

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not found'
      });
      return;
    }

    // Check if user has admin role
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      logger.warn('Non-admin user attempted to access admin route', {
        userId: user.id,
        email: user.email,
        role: user.role,
        path: req.path,
        method: req.method
      });

      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Admin privileges required to access this resource'
      });
      return;
    }

    // User is admin - attach role info and continue
    adminReq.userRole = user.role;
    adminReq.isAdmin = true;

    logger.debug('Admin access granted', {
      userId: user.id,
      role: user.role,
      path: req.path
    });

    next();
  } catch (error: any) {
    logger.error('Admin authentication error', {
      error: error.message,
      stack: error.stack,
      path: req.path
    });

    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to verify admin privileges'
    });
  }
}

/**
 * Middleware to require super admin authentication
 * More restrictive than requireAdmin - only super admins can access
 */
export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminReq = req as AdminRequest;
    const userId = adminReq.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (!user || user.role !== 'SUPERADMIN') {
      logger.warn('Non-superadmin attempted to access superadmin route', {
        userId,
        role: user?.role,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Super admin privileges required'
      });
      return;
    }

    adminReq.userRole = user.role;
    adminReq.isAdmin = true;

    next();
  } catch (error: any) {
    logger.error('Super admin authentication error', {
      error: error.message,
      path: req.path
    });

    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to verify super admin privileges'
    });
  }
}

/**
 * Optional admin check - sets isAdmin flag but doesn't block access
 * Useful for routes that have different behavior for admins vs regular users
 */
export async function checkAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminReq = req as AdminRequest;
    const userId = adminReq.userId;

    if (!userId) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true
      }
    });

    if (user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN')) {
      adminReq.isAdmin = true;
      adminReq.userRole = user.role;
    }

    next();
  } catch (error: any) {
    logger.error('Check admin error', { error: error.message });
    // Don't block the request on error
    next();
  }
}

export default {
  requireAdmin,
  requireSuperAdmin,
  checkAdmin
};
