/**
 * Unified Conversation Store
 *
 * Provides a single interface for conversation storage with pluggable backends:
 * - File-based storage (development/testing)
 * - PostgreSQL storage (production)
 *
 * Usage:
 * ```typescript
 * import { getConversationStore } from './core/conversation-store';
 *
 * const store = await getConversationStore();
 * await store.addMessage(message);
 * ```
 */

import { logger } from '../../utils/logger.js';
import { IConversationStore } from './types.js';
import { FileConversationStore } from './file-store.js';
import { PostgreSQLConversationStore } from './pg-store.js';

export * from './types.js';

/**
 * Storage backend configuration
 */
export type StorageBackend = 'file' | 'postgresql' | 'auto';

/**
 * Configuration for conversation store
 */
export interface ConversationStoreConfig {
  backend?: StorageBackend;
  fileStorePath?: string;
  postgresUrl?: string;
}

let storeInstance: IConversationStore | null = null;

/**
 * Get or create conversation store instance
 *
 * Automatically selects backend based on:
 * 1. Explicit config.backend parameter
 * 2. DATABASE_URL environment variable (PostgreSQL)
 * 3. Falls back to file-based storage
 */
export async function getConversationStore(
  config: ConversationStoreConfig = {}
): Promise<IConversationStore> {
  if (storeInstance) {
    return storeInstance;
  }

  const backend = config.backend || 'auto';

  // Auto-detect backend
  let selectedBackend: 'file' | 'postgresql';

  if (backend === 'auto') {
    // Use PostgreSQL if DATABASE_URL is set, otherwise use file storage
    const databaseUrl = config.postgresUrl || process.env.DATABASE_URL;
    selectedBackend = databaseUrl ? 'postgresql' : 'file';

    logger.info(
      `🔍 Auto-detected conversation store backend: ${selectedBackend}`
    );
  } else {
    selectedBackend = backend;
  }

  // Create appropriate store instance
  try {
    if (selectedBackend === 'postgresql') {
      logger.info('📚 Initializing PostgreSQL conversation store...');
      const pgStore = new PostgreSQLConversationStore();
      await pgStore.initialize();
      storeInstance = pgStore;
      logger.info('✅ PostgreSQL conversation store ready');
    } else {
      logger.info('📚 Initializing file-based conversation store...');
      const fileStore = new FileConversationStore(config.fileStorePath);
      await fileStore.initialize();
      storeInstance = fileStore;
      logger.info('✅ File-based conversation store ready');
    }

    return storeInstance;
  } catch (error) {
    logger.error('Failed to initialize conversation store:', error);

    // Fallback to file storage if PostgreSQL fails
    if (selectedBackend === 'postgresql') {
      logger.warn('⚠️  Falling back to file-based storage');
      const fileStore = new FileConversationStore(config.fileStorePath);
      await fileStore.initialize();
      storeInstance = fileStore;
      return storeInstance;
    }

    throw error;
  }
}

/**
 * Reset store instance (for testing)
 */
export function resetConversationStore(): void {
  storeInstance = null;
}

// Export stores for direct use if needed
export { FileConversationStore } from './file-store.js';
export { PostgreSQLConversationStore } from './pg-store.js';
