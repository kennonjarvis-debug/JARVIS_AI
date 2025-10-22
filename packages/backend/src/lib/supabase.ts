/**
 * Shared Supabase Client
 * Provides a singleton Supabase client instance using lazy initialization
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '@jarvis/shared';

const logger = new Logger('SupabaseClient');

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the shared Supabase client instance
 * Creates the client on first access using lazy initialization
 * @returns Supabase client instance
 * @throws Error if SUPABASE_URL or SUPABASE_SERVICE_KEY are not configured
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!url) {
      const error = new Error('SUPABASE_URL environment variable is not set');
      logger.error('Missing Supabase URL', { configured: false });
      throw error;
    }

    if (!serviceKey) {
      const error = new Error('SUPABASE_SERVICE_KEY environment variable is not set');
      logger.error('Missing Supabase service key', { configured: false });
      throw error;
    }

    supabaseInstance = createClient(url, serviceKey);
    logger.info('Supabase client initialized', { url });
  }

  return supabaseInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 * @internal
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
  logger.debug('Supabase client instance reset');
}
