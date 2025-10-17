/**
 * Rate Limiter for ChatGPT Webhook
 *
 * Prevents abuse and ensures fair usage of JARVIS API
 *
 * Limits:
 * - 60 requests per minute per API key
 * - 1000 requests per hour per API key
 * - Custom limits for specific endpoints
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Standard rate limiter for ChatGPT webhook
 * 60 requests per minute
 */
export const chatgptRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '1 minute',
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  // Key generator - use API key if present
  keyGenerator: (req: Request) => {
    return (req.headers['x-chatgpt-app-key'] as string) || req.ip || 'unknown';
  },
  // Skip successful requests from counting (optional)
  skip: (req: Request) => {
    // Don't count GET requests (verification endpoint)
    return req.method === 'GET';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Maximum 60 requests per minute allowed.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Strict rate limiter for resource-intensive actions
 * 10 requests per minute
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded for this action. Please try again later.',
    retryAfter: '1 minute',
  },
  keyGenerator: (req: Request) => {
    const action = req.body?.action || 'unknown';
    const apiKey = (req.headers['x-chatgpt-app-key'] as string) || req.ip;
    return `${apiKey}:${action}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: `Rate limit exceeded for action '${req.body?.action}'. Maximum 10 requests per minute allowed.`,
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Hourly rate limiter
 * 1000 requests per hour
 */
export const hourlyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  message: {
    success: false,
    error: 'Hourly limit exceeded',
    message: 'Hourly rate limit exceeded. Please try again later.',
    retryAfter: '1 hour',
  },
  keyGenerator: (req: Request) => {
    return (req.headers['x-chatgpt-app-key'] as string) || req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: 'Hourly rate limit exceeded. Maximum 1000 requests per hour allowed.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

export default {
  chatgptRateLimiter,
  strictRateLimiter,
  hourlyRateLimiter,
};
