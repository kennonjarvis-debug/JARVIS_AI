#!/usr/bin/env ts-node
/**
 * QA Lock System
 * Prevents resource conflicts when multiple Claude instances run tests in parallel
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

interface LockConfig {
  lockDirectory: string;
  lockTimeoutMs: number;
  retryIntervalMs: number;
  maxRetries: number;
}

interface LockMetadata {
  instanceId: string;
  resourceType: string;
  resourceId: string;
  acquiredAt: number;
  pid: number;
  hostname: string;
}

export class QALock {
  private config: LockConfig;

  constructor(config?: Partial<LockConfig>) {
    this.config = {
      lockDirectory: config?.lockDirectory || '/Users/benkennon/Jarvis/.qa-locks',
      lockTimeoutMs: config?.lockTimeoutMs || 30000,
      retryIntervalMs: config?.retryIntervalMs || 1000,
      maxRetries: config?.maxRetries || 30,
    };
  }

  /**
   * Initialize lock directory
   */
  async initialize(): Promise<void> {
    try {
      await mkdir(this.config.lockDirectory, { recursive: true });
      console.log(`[QALock] Lock directory initialized: ${this.config.lockDirectory}`);
    } catch (error) {
      throw new Error(`Failed to initialize lock directory: ${error}`);
    }
  }

  /**
   * Acquire a lock for a resource
   */
  async acquire(
    instanceId: string,
    resourceType: 'database' | 'port' | 'redis' | 'branch',
    resourceId: string
  ): Promise<boolean> {
    const lockFile = this.getLockFilePath(resourceType, resourceId);

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Check if lock file exists
        const exists = await this.lockExists(lockFile);

        if (!exists) {
          // Create lock
          await this.createLock(lockFile, instanceId, resourceType, resourceId);
          console.log(`[QALock] ✅ Lock acquired: ${instanceId} -> ${resourceType}:${resourceId}`);
          return true;
        }

        // Check if lock is stale
        const isStale = await this.isLockStale(lockFile);
        if (isStale) {
          console.log(`[QALock] ⚠️ Stale lock detected, removing: ${lockFile}`);
          await this.release(resourceType, resourceId);
          continue; // Retry acquisition
        }

        // Wait and retry
        console.log(
          `[QALock] ⏳ Waiting for lock (attempt ${attempt + 1}/${this.config.maxRetries}): ${resourceType}:${resourceId}`
        );
        await this.sleep(this.config.retryIntervalMs);
      } catch (error) {
        console.error(`[QALock] Error acquiring lock:`, error);
      }
    }

    throw new Error(
      `Failed to acquire lock after ${this.config.maxRetries} attempts: ${resourceType}:${resourceId}`
    );
  }

  /**
   * Release a lock
   */
  async release(resourceType: string, resourceId: string): Promise<void> {
    const lockFile = this.getLockFilePath(resourceType, resourceId);

    try {
      await unlink(lockFile);
      console.log(`[QALock] 🔓 Lock released: ${resourceType}:${resourceId}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`[QALock] Error releasing lock:`, error);
      }
    }
  }

  /**
   * Check if a lock exists
   */
  private async lockExists(lockFile: string): Promise<boolean> {
    try {
      await stat(lockFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a lock is stale (older than timeout)
   */
  private async isLockStale(lockFile: string): Promise<boolean> {
    try {
      const content = await readFile(lockFile, 'utf-8');
      const metadata: LockMetadata = JSON.parse(content);

      const age = Date.now() - metadata.acquiredAt;
      return age > this.config.lockTimeoutMs;
    } catch {
      return true; // If we can't read the lock, consider it stale
    }
  }

  /**
   * Create a lock file
   */
  private async createLock(
    lockFile: string,
    instanceId: string,
    resourceType: string,
    resourceId: string
  ): Promise<void> {
    const metadata: LockMetadata = {
      instanceId,
      resourceType,
      resourceId,
      acquiredAt: Date.now(),
      pid: process.pid,
      hostname: os.hostname(),
    };

    await writeFile(lockFile, JSON.stringify(metadata, null, 2), { flag: 'wx' });
  }

  /**
   * Get lock file path
   */
  private getLockFilePath(resourceType: string, resourceId: string): string {
    // Sanitize resourceId to replace slashes with dashes
    const sanitizedResourceId = resourceId.replace(/\//g, '-');
    const fileName = `${resourceType}_${sanitizedResourceId}.lock`;
    return path.join(this.config.lockDirectory, fileName);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup all locks for an instance
   */
  async cleanupInstance(instanceId: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.config.lockDirectory);

      for (const file of files) {
        if (!file.endsWith('.lock')) continue;

        const lockFile = path.join(this.config.lockDirectory, file);
        try {
          const content = await readFile(lockFile, 'utf-8');
          const metadata: LockMetadata = JSON.parse(content);

          if (metadata.instanceId === instanceId) {
            await unlink(lockFile);
            console.log(`[QALock] 🧹 Cleaned up lock: ${file}`);
          }
        } catch (error) {
          // Ignore errors for individual files
        }
      }

      console.log(`[QALock] ✅ Cleanup complete for instance: ${instanceId}`);
    } catch (error) {
      console.error(`[QALock] Error during cleanup:`, error);
    }
  }
}

// CLI Usage
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const args = process.argv.slice(2);
  const command = args[0];

  const lock = new QALock();

  (async () => {
    await lock.initialize();

    switch (command) {
      case 'acquire':
        const [instanceId, resourceType, resourceId] = args.slice(1);
        await lock.acquire(instanceId, resourceType as any, resourceId);
        break;

      case 'release':
        const [releaseType, releaseId] = args.slice(1);
        await lock.release(releaseType, releaseId);
        break;

      case 'cleanup':
        const [cleanupInstanceId] = args.slice(1);
        await lock.cleanupInstance(cleanupInstanceId);
        break;

      default:
        console.log(`
Usage:
  ./qa-lock.ts acquire <instanceId> <resourceType> <resourceId>
  ./qa-lock.ts release <resourceType> <resourceId>
  ./qa-lock.ts cleanup <instanceId>

Examples:
  ./qa-lock.ts acquire claude_a database jarvis_test_security
  ./qa-lock.ts release database jarvis_test_security
  ./qa-lock.ts cleanup claude_a
        `);
    }
  })();
}

export default QALock;
