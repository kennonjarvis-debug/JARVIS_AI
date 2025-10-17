/**
 * PostgreSQL Connection Pool
 *
 * Manages database connections for JARVIS conversation storage
 */

import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger.js';

// Parse DATABASE_URL or use individual connection params
function getDatabaseConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if no connection available
    };
  }

  // Fallback to individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'jarvis',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

// Create connection pool
export const pool = new Pool(getDatabaseConfig());

// Handle pool errors
pool.on('error', (err, client) => {
  logger.error('Unexpected database pool error:', err);
});

// Handle connection acquisition
pool.on('connect', (client) => {
  logger.debug('New database connection established');
});

// Handle connection removal
pool.on('remove', (client) => {
  logger.debug('Database connection removed from pool');
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    logger.info('✅ Database connection successful');
    logger.debug(`Database time: ${result.rows[0].now}`);

    return true;
  } catch (error: any) {
    logger.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Initialize database schema
 */
export async function initializeSchema(): Promise<void> {
  try {
    const client = await pool.connect();

    // Check if tables exist
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'conversations'
    `);

    if (parseInt(result.rows[0].count) === 0) {
      logger.info('📊 Database schema not found, initializing...');

      // Read and execute schema file
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const schemaPath = path.join(__dirname, 'schema.sql');

      const schema = await fs.readFile(schemaPath, 'utf8');
      await client.query(schema);

      logger.info('✅ Database schema initialized successfully');
    } else {
      logger.info('✅ Database schema already exists');
    }

    client.release();
  } catch (error: any) {
    logger.error('❌ Failed to initialize database schema:', error.message);
    throw error;
  }
}

/**
 * Close all connections in the pool
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('🔌 Database connection pool closed');
  } catch (error: any) {
    logger.error('Error closing database pool:', error.message);
    throw error;
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

export default pool;
