/**
 * Environment Memory Service
 *
 * Updates Jarvis memory with current environment detection results
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../backend/utils/logger';
import { detectEnvironment, getCachedEnvironment } from '../../backend/utils/environment-detector';

const MEMORY_FILE_PATH = path.join(process.cwd(), 'memory', 'memory.json');

/**
 * Update Jarvis memory with current environment information
 */
export async function updateEnvironmentMemory(): Promise<void> {
  try {
    logger.info('Updating Jarvis memory with environment detection...');

    // Detect environment
    const env = await detectEnvironment();

    // Read current memory file
    const memoryData = await fs.readFile(MEMORY_FILE_PATH, 'utf-8');
    const memory = JSON.parse(memoryData);

    // Update environment section
    memory.environment = {
      detection: {
        enabled: true,
        lastCheck: new Date().toISOString(),
        type: env.type,
        isAWS: env.isAWS,
        region: env.region || null,
        instanceId: env.instanceId || null,
      },
      configuration: {
        storage: env.isAWS ? 's3' : 'local',
        database: env.isAWS && env.isProduction ? 'postgres' : 'sqlite',
        cache: env.isAWS ? 'elasticache' : 'redis',
        logging: env.isAWS ? 'cloudwatch' : 'console',
      },
      capabilities: {
        s3Access: env.isAWS,
        cloudWatchLogs: env.isAWS,
        distributedCache: env.isAWS,
        autoScaling: env.isAWS && env.isProduction,
      },
      notes: [
        'Environment detection runs on every server startup',
        'Configuration adapts automatically based on detected environment',
        env.isAWS
          ? `AWS environment detected: ${env.type} in ${env.region || 'unknown region'}`
          : 'Local environment uses file system, SQLite, and local Redis',
        env.isAWS
          ? 'AWS services: S3, RDS/DynamoDB, ElastiCache, CloudWatch'
          : 'Local services: File system, SQLite, Redis, Console logs',
      ],
    };

    // Write updated memory back
    await fs.writeFile(MEMORY_FILE_PATH, JSON.stringify(memory, null, 2), 'utf-8');

    logger.info('✅ Jarvis memory updated with environment information', {
      type: env.type,
      isAWS: env.isAWS,
      region: env.region,
    });
  } catch (error) {
    logger.error('Failed to update environment memory', error);
    // Non-critical error - don't throw
  }
}

/**
 * Get current environment info from memory (synchronous)
 */
export async function getEnvironmentFromMemory() {
  try {
    const memoryData = await fs.readFile(MEMORY_FILE_PATH, 'utf-8');
    const memory = JSON.parse(memoryData);
    return memory.environment || null;
  } catch (error) {
    logger.error('Failed to read environment from memory', error);
    return null;
  }
}

/**
 * Check if environment has changed since last boot
 */
export async function hasEnvironmentChanged(): Promise<boolean> {
  try {
    const memoryEnv = await getEnvironmentFromMemory();
    const currentEnv = getCachedEnvironment();

    if (!memoryEnv || !currentEnv) {
      return false;
    }

    return (
      memoryEnv.detection.type !== currentEnv.type ||
      memoryEnv.detection.isAWS !== currentEnv.isAWS ||
      memoryEnv.detection.region !== currentEnv.region
    );
  } catch (error) {
    logger.error('Failed to check environment change', error);
    return false;
  }
}
