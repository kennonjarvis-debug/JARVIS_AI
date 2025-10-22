import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import * as path from 'path';
import { WriteFileRequest, FileWriteResult } from '../types';
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

export async function writeFile(req: Request, res: Response): Promise<void> {
  try {
    const { path: filePath, content }: WriteFileRequest = req.body;

    if (!filePath || typeof filePath !== 'string') {
      Logger.warn('Invalid write request: missing or invalid path', {
        ip: req.ip,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        error: 'Missing or invalid "path" parameter',
      });
      return;
    }

    if (content === undefined || typeof content !== 'string') {
      Logger.warn('Invalid write request: missing or invalid content', {
        ip: req.ip,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        error: 'Missing or invalid "content" parameter',
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
        hint: 'Only paths within ALLOWED_PATHS can be written. Check config.',
      });
      return;
    }

    // Check content size
    const contentSize = Buffer.byteLength(content, 'utf-8');
    if (contentSize > config.maxFileSize) {
      Logger.warn('Content too large', {
        ip: req.ip,
        path: sanitizedPath,
        size: contentSize,
        maxSize: config.maxFileSize,
      });
      res.status(400).json({
        success: false,
        error: `Content too large. Max size: ${config.maxFileSize} bytes`,
      });
      return;
    }

    Logger.info('Writing file', {
      ip: req.ip,
      path: sanitizedPath,
      size: contentSize,
    });

    // Ensure directory exists
    const dirPath = path.dirname(sanitizedPath);
    await fs.mkdir(dirPath, { recursive: true });

    // Write file
    await fs.writeFile(sanitizedPath, content, 'utf-8');

    Logger.info('File written successfully', {
      ip: req.ip,
      path: sanitizedPath,
      size: contentSize,
    });

    // Return Custom GPT compatible format
    res.status(200).json({
      success: true,
      path: sanitizedPath,
      size: contentSize,
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message: string };

    Logger.error('File write failed', error, {
      ip: req.ip,
      path: req.body?.path,
    });

    // Determine appropriate status code
    let statusCode = 500;
    if (err.code === 'EACCES') {
      statusCode = 403;
    } else if (err.code === 'ENOSPC') {
      statusCode = 507; // Insufficient Storage
    }

    // Return error in Custom GPT compatible format
    res.status(statusCode).json({
      error: err.message,
      code: err.code || 'UNKNOWN',
    });
  }
}
