/**
 * Unit Tests: Authentication Middleware
 *
 * Tests for authentication and authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin, requireSuperadmin, optionalAuth } from '../../src/middleware/auth-middleware.js';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    apiKey: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let prisma: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Initialize mock request and response
    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();

    // Get Prisma mock instance
    prisma = new PrismaClient();
  });

  describe('authenticate()', () => {
    it('should authenticate user with valid API key', async () => {
      const mockApiKey = {
        id: 'key-123',
        key: 'test-api-key',
        active: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
      };

      mockRequest.headers = {
        authorization: 'Bearer test-api-key',
      };

      prisma.apiKey.findUnique.mockResolvedValue(mockApiKey);
      prisma.apiKey.update.mockResolvedValue(mockApiKey);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { key: 'test-api-key', active: true },
        include: { user: true },
      });

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: {
          lastUsedAt: expect.any(Date),
          requestCount: { increment: 1 },
        },
      });

      expect(mockRequest.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      });

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should authenticate user with x-user-id header', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'dev@example.com',
        name: 'Dev User',
        role: 'ADMIN',
      };

      mockRequest.headers = {
        'x-user-id': 'user-456',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-456' },
      });

      expect(mockRequest.user).toEqual({
        id: 'user-456',
        email: 'dev@example.com',
        name: 'Dev User',
        role: 'ADMIN',
      });

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 for invalid API key', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-key',
      };

      prisma.apiKey.findUnique.mockResolvedValue(null);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized - API key or authentication required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when no authentication provided', async () => {
      mockRequest.headers = {};

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.headers = {
        authorization: 'Bearer test-key',
      };

      prisma.apiKey.findUnique.mockRejectedValue(new Error('Database error'));

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed',
      });
    });
  });

  describe('requireSuperadmin()', () => {
    it('should allow superadmin users', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        name: 'Super Admin',
        role: 'SUPERADMIN',
      };

      requireSuperadmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny non-superadmin users', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'USER',
      };

      requireSuperadmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Superadmin access required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated requests', () => {
      mockRequest.user = undefined;

      requireSuperadmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin()', () => {
    it('should allow admin users', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
      };

      requireAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow superadmin users', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: 'SUPERADMIN',
      };

      requireAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny regular users', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'User',
        role: 'USER',
      };

      requireAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth()', () => {
    it('should authenticate valid users', async () => {
      const mockApiKey = {
        id: 'key-123',
        key: 'test-key',
        active: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
      };

      mockRequest.headers = {
        authorization: 'Bearer test-key',
      };

      prisma.apiKey.findUnique.mockResolvedValue(mockApiKey);

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without authentication', async () => {
      mockRequest.headers = {};

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue on authentication errors', async () => {
      mockRequest.headers = {
        authorization: 'Bearer test-key',
      };

      prisma.apiKey.findUnique.mockRejectedValue(new Error('DB error'));

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
