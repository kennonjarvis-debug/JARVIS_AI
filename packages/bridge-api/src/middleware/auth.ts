import { Request, Response, NextFunction } from 'express';
import { config } from '../utils/config';
import { Logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    Logger.warn('Authentication failed: No authorization header', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing authorization header',
    });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer') {
    Logger.warn('Authentication failed: Invalid auth scheme', {
      ip: req.ip,
      path: req.path,
      scheme,
    });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication scheme. Expected "Bearer"',
    });
    return;
  }

  if (!token) {
    Logger.warn('Authentication failed: Missing token', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing bearer token',
    });
    return;
  }

  if (token !== config.bearerToken) {
    Logger.warn('Authentication failed: Invalid token', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid bearer token',
    });
    return;
  }

  // Token is valid, attach to request
  (req as AuthenticatedRequest).token = token;
  Logger.debug('Authentication successful', {
    ip: req.ip,
    path: req.path,
  });

  next();
}
