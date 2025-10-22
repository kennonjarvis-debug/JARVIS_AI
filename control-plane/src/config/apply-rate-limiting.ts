/**
 * Apply Rate Limiting to Gateway
 *
 * Integration guide for adding rate limiting to the Express gateway
 */

import { Express } from 'express';
import { rateLimitMiddleware, extractAPIKeyScopes } from '../middleware/rate-limit-middleware.js';
import { authenticate } from '../middleware/auth-middleware.js';
import rateLimitRoutes from '../api/rate-limits/index.js';
import { logger } from '../utils/logger.js';

/**
 * Apply rate limiting to Express app
 *
 * @example
 * import { applyRateLimiting } from './config/apply-rate-limiting.js';
 * const app = express();
 * applyRateLimiting(app);
 */
export function applyRateLimiting(app: Express): void {
  logger.info('Applying rate limiting middleware...');

  // 1. Extract API key scopes (before rate limiting)
  app.use('/api', extractAPIKeyScopes);

  // 2. Apply rate limiting to all API routes
  app.use('/api', rateLimitMiddleware);

  // 3. Mount rate limit management routes
  app.use('/api/rate-limits', rateLimitRoutes);

  logger.info('Rate limiting applied successfully');
}

/**
 * Health check for rate limiting system
 */
export async function checkRateLimitingHealth(): Promise<{
  healthy: boolean;
  redis: boolean;
  message: string;
}> {
  try {
    const { rateLimiter } = await import('../middleware/rate-limiter.js');

    // Try a test operation
    const result = await rateLimiter.checkLimit({
      identifier: 'health-check',
      limit: 1,
      windowMs: 1000,
    });

    return {
      healthy: true,
      redis: true,
      message: 'Rate limiting system operational',
    };
  } catch (error: any) {
    logger.error('Rate limiting health check failed:', error);
    return {
      healthy: false,
      redis: false,
      message: `Rate limiting system degraded: ${error.message}`,
    };
  }
}

/**
 * Example usage in gateway.ts:
 *
 * ```typescript
 * import { applyRateLimiting } from './config/apply-rate-limiting.js';
 *
 * const app = express();
 *
 * // Apply security middleware
 * app.use(helmet());
 * app.use(cors());
 *
 * // Apply rate limiting (BEFORE routes)
 * applyRateLimiting(app);
 *
 * // Define routes
 * app.get('/api/data', authenticate, (req, res) => {
 *   // Rate limiting already applied
 *   res.json({ data: 'ok' });
 * });
 * ```
 */
