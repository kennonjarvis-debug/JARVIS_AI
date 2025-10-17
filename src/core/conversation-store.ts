/**
 * @deprecated This file is deprecated. Use the new unified store instead:
 *
 * ```typescript
 * // Old way (deprecated)
 * import { conversationStore } from './core/conversation-store';
 *
 * // New way (recommended)
 * import { getConversationStore } from './core/conversation-store';
 * const store = await getConversationStore();
 * ```
 *
 * This file is kept for backwards compatibility and will be removed in v3.0.0
 */

import { getConversationStore } from './conversation-store/index.js';
import { logger } from '../utils/logger.js';

// Export all types for backwards compatibility
export * from './conversation-store/types.js';

// Legacy sync singleton - initializes async store in background
let legacyStorePromise: Promise<any> | null = null;

function getLegacyStore() {
  if (!legacyStorePromise) {
    legacyStorePromise = getConversationStore();
  }
  return legacyStorePromise;
}

/**
 * @deprecated Use getConversationStore() instead
 *
 * Legacy export for backwards compatibility
 * Warning: This initializes the store asynchronously in the background
 */
export const conversationStore = new Proxy({} as any, {
  get(target, prop) {
    // Log deprecation warning once
    if (!target._warningShown) {
      logger.warn(
        '⚠️  conversation-store.ts is deprecated. Use getConversationStore() from conversation-store/index.js instead'
      );
      target._warningShown = true;
    }

    // Return async methods that wait for store to initialize
    return async (...args: any[]) => {
      const store = await getLegacyStore();
      const method = (store as any)[prop];

      if (typeof method === 'function') {
        return method.apply(store, args);
      }

      return method;
    };
  },
});

// Export the recommended way to use the store
export { getConversationStore, resetConversationStore } from './conversation-store/index.js';
