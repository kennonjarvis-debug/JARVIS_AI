/**
 * API Response Compression Middleware
 *
 * Features:
 * - Gzip compression for text responses
 * - Brotli compression for modern browsers
 * - Smart compression (skip images/videos)
 * - Configurable compression levels
 * - Compression threshold
 */

import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';

export interface CompressionOptions {
  threshold?: number; // Minimum size in bytes to compress (default: 1KB)
  level?: number; // Compression level 1-9 (default: 6)
  brotli?: boolean; // Enable Brotli compression (default: true)
  filter?: (req: Request, res: Response) => boolean; // Custom filter function
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  threshold: 1024, // 1KB
  level: 6, // Balanced compression
  brotli: true,
  filter: defaultFilter,
};

/**
 * Default filter: compress text-based content types
 */
function defaultFilter(req: Request, res: Response): boolean {
  const contentType = res.getHeader('Content-Type') as string;
  if (!contentType) return true;

  // Compress these types
  const compressibleTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/x-www-form-urlencoded',
    'application/ld+json',
    'application/vnd.api+json',
  ];

  // Skip these types (already compressed or binary)
  const skipTypes = [
    'image/',
    'video/',
    'audio/',
    'application/zip',
    'application/gzip',
    'application/x-gzip',
    'application/pdf',
    'application/octet-stream',
  ];

  // Don't compress if type is in skip list
  if (skipTypes.some((type) => contentType.toLowerCase().includes(type))) {
    return false;
  }

  // Compress if type is in compressible list
  if (compressibleTypes.some((type) => contentType.toLowerCase().includes(type))) {
    return true;
  }

  // Default: don't compress
  return false;
}

/**
 * Determine which encoding to use based on Accept-Encoding header
 */
function getEncoding(req: Request, options: Required<CompressionOptions>): string | null {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Brotli (best compression, modern browsers)
  if (options.brotli && acceptEncoding.includes('br')) {
    return 'br';
  }

  // Gzip (good compression, universal support)
  if (acceptEncoding.includes('gzip')) {
    return 'gzip';
  }

  // Deflate (fallback)
  if (acceptEncoding.includes('deflate')) {
    return 'deflate';
  }

  // No compression
  return null;
}

/**
 * Create compression stream based on encoding
 */
function createCompressionStream(
  encoding: string,
  level: number
): zlib.Gzip | zlib.Deflate | zlib.BrotliCompress {
  switch (encoding) {
    case 'br':
      return zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: level,
          [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        },
      });
    case 'gzip':
      return zlib.createGzip({ level });
    case 'deflate':
      return zlib.createDeflate({ level });
    default:
      throw new Error(`Unknown encoding: ${encoding}`);
  }
}

/**
 * Compression middleware factory
 */
export function compression(options: CompressionOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip compression for HEAD requests
    if (req.method === 'HEAD') {
      return next();
    }

    // Skip if already compressed
    if (res.getHeader('Content-Encoding')) {
      return next();
    }

    // Determine encoding
    const encoding = getEncoding(req, opts);
    if (!encoding) {
      return next();
    }

    // Store original methods
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    let chunks: Buffer[] = [];
    let totalLength = 0;
    let headersSent = false;

    // Override write method
    res.write = function (chunk: any, encoding?: any, callback?: any): boolean {
      if (!headersSent) {
        chunks.push(Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined));
        totalLength += chunks[chunks.length - 1].length;

        if (typeof encoding === 'function') {
          callback = encoding;
          encoding = undefined;
        }

        if (callback) {
          callback();
        }

        return true;
      }

      return originalWrite(chunk, encoding, callback);
    } as any;

    // Override end method
    res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
      if (headersSent) {
        return originalEnd(chunk, encoding, callback);
      }

      // Add final chunk if provided
      if (chunk) {
        chunks.push(Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined));
        totalLength += chunks[chunks.length - 1].length;
      }

      // Check if we should compress
      const shouldCompress = totalLength >= opts.threshold && opts.filter(req, res);

      if (!shouldCompress) {
        // Don't compress, send as-is
        headersSent = true;
        for (const c of chunks) {
          originalWrite(c);
        }
        return originalEnd(callback);
      }

      // Compress the data
      const buffer = Buffer.concat(chunks);
      const compressionStream = createCompressionStream(encoding, opts.level);

      const compressed: Buffer[] = [];
      compressionStream.on('data', (chunk: Buffer) => {
        compressed.push(chunk);
      });

      compressionStream.on('end', () => {
        const compressedBuffer = Buffer.concat(compressed);

        // Set compression headers
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Content-Length', compressedBuffer.length);

        // Add Vary header to indicate response varies by encoding
        const vary = res.getHeader('Vary');
        if (!vary) {
          res.setHeader('Vary', 'Accept-Encoding');
        } else if (!vary.toString().includes('Accept-Encoding')) {
          res.setHeader('Vary', `${vary}, Accept-Encoding`);
        }

        headersSent = true;
        originalWrite(compressedBuffer);
        originalEnd(callback);
      });

      compressionStream.on('error', (err: Error) => {
        console.error('Compression error:', err);
        // Fall back to uncompressed
        headersSent = true;
        originalWrite(buffer);
        originalEnd(callback);
      });

      compressionStream.end(buffer);

      return res;
    } as any;

    next();
  };
}

/**
 * High compression preset (slower, better compression)
 */
export function highCompression(options: CompressionOptions = {}) {
  return compression({
    ...options,
    level: 9,
    threshold: 512, // Compress smaller files
  });
}

/**
 * Fast compression preset (faster, less compression)
 */
export function fastCompression(options: CompressionOptions = {}) {
  return compression({
    ...options,
    level: 1,
    threshold: 2048, // Only compress larger files
  });
}

/**
 * Balanced compression preset (default)
 */
export function balancedCompression(options: CompressionOptions = {}) {
  return compression({
    ...options,
    level: 6,
    threshold: 1024,
  });
}

export default compression;
