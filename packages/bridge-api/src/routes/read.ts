import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ReadFileRequest, FileReadResult } from '../types';
import { config } from '../utils/config';
import { Logger } from '../utils/logger';

function isPathAllowed(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);

  // Check if path starts with any allowed path
  return config.allowedPaths.some((allowedPath) => {
    const resolvedAllowedPath = path.resolve(allowedPath);
    return resolvedPath.startsWith(resolvedAllowedPath);
  });
}

function sanitizePath(filePath: string): string {
  // Remove null bytes and other dangerous patterns
  if (filePath.includes('\0')) {
    throw new Error('Null byte detected in path');
  }

  // Resolve to absolute path to prevent directory traversal
  return path.resolve(filePath);
}

export async function readFile(req: Request, res: Response): Promise<void> {
  try {
    const { path: filePath }: ReadFileRequest = req.body;

    if (!filePath || typeof filePath !== 'string') {
      Logger.warn('Invalid read request: missing or invalid path', {
        ip: req.ip,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        error: 'Missing or invalid "path" parameter',
      });
      return;
    }

    // Sanitize path
    let sanitizedPath: string;
    try {
      sanitizedPath = sanitizePath(filePath);
    } catch (error) {
      Logger.warn('Path sanitization failed', error, {
        ip: req.ip,
        path: filePath,
      });
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Path sanitization failed',
      });
      return;
    }

    // Check if path is allowed
    if (!isPathAllowed(sanitizedPath)) {
      Logger.warn('Path not allowed', {
        ip: req.ip,
        path: sanitizedPath,
      });
      res.status(403).json({
        success: false,
        error: 'Path not allowed',
        hint: 'Only paths within ALLOWED_PATHS can be read. Check config.',
      });
      return;
    }

    Logger.info('Reading file', {
      ip: req.ip,
      path: sanitizedPath,
    });

    // Check file stats
    const stats = await fs.stat(sanitizedPath);

    if (!stats.isFile()) {
      Logger.warn('Path is not a file', {
        ip: req.ip,
        path: sanitizedPath,
      });
      res.status(400).json({
        success: false,
        error: 'Path is not a file',
      });
      return;
    }

    if (stats.size > config.maxFileSize) {
      Logger.warn('File too large', {
        ip: req.ip,
        path: sanitizedPath,
        size: stats.size,
        maxSize: config.maxFileSize,
      });
      res.status(400).json({
        success: false,
        error: `File too large. Max size: ${config.maxFileSize} bytes`,
      });
      return;
    }

    // Read file
    const content = await fs.readFile(sanitizedPath, 'utf-8');

    Logger.info('File read successfully', {
      ip: req.ip,
      path: sanitizedPath,
      size: content.length,
    });

    // Return Custom GPT compatible format
    res.status(200).json({ data: content });
  } catch (error: unknown) {
    const err = error as { code?: string; message: string };

    Logger.error('File read failed', error, {
      ip: req.ip,
      path: req.body?.path,
    });

    // Determine appropriate status code
    let statusCode = 500;
    if (err.code === 'ENOENT') {
      statusCode = 404;
    } else if (err.code === 'EACCES') {
      statusCode = 403;
    }

    // Return error in Custom GPT compatible format
    res.status(statusCode).json({
      error: err.message,
      code: err.code || 'UNKNOWN',
    });
  }
}
