/**
 * @deprecated This file is deprecated. Use the new unified store instead:
 *
 * ```typescript
 * // Old way (deprecated)
 * import { conversationStorePG } from './core/conversation-store-pg';
 *
 * // New way (recommended)
 * import { getConversationStore } from './core/conversation-store';
 * const store = await getConversationStore({ backend: 'postgresql' });
 * ```
 *
 * This file is kept for backwards compatibility and will be removed in v3.0.0
 */

import { PostgreSQLConversationStore } from './conversation-store/pg-store.js';
import { logger } from '../utils/logger.js';

// Re-export types
export * from './conversation-store/types.js';

// Log deprecation warning
logger.warn(
  '⚠️  conversation-store-pg.ts is deprecated. Use getConversationStore() from conversation-store/index.js instead'
);

/**
 * @deprecated Use getConversationStore({ backend: 'postgresql' }) instead
 */
export const conversationStorePG = new PostgreSQLConversationStore();

// Export the recommended way
export { getConversationStore } from './conversation-store/index.js';
export { PostgreSQLConversationStore } from './conversation-store/pg-store.js';
