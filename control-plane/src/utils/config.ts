import * as dotenv from 'dotenv';
import { secretsManager } from '../security/secrets-manager.js';

// Load environment variables from .env file
// dotenv will automatically search up the directory tree from cwd
dotenv.config();

export interface Config {
  port: number;
  aiDawgBackendUrl: string;
  aiDawgDockerUrl: string;
  vocalCoachUrl: string;
  producerUrl: string;
  aiBrainUrl: string;
  authToken: string;
  nodeEnv: string;
  logLevel: string;
  databaseUrl: string;
  redisUrl: string;
  openaiApiKey: string;
  anthropicApiKey?: string;
  googleAiApiKey?: string;
  mistralApiKey?: string;
  jwtSecret?: string;
  csrfSecret?: string;
  refreshTokenSecret?: string;
}

// Flag to track if secrets have been loaded
let secretsLoaded = false;
let configCache: Config | null = null;

/**
 * Load configuration from environment variables and AWS Secrets Manager
 */
async function loadConfig(): Promise<Config> {
  // Return cached config if already loaded
  if (secretsLoaded && configCache) {
    return configCache;
  }

  // Load secrets from AWS Secrets Manager or local .env
  let secrets: Record<string, string> = {};

  try {
    secrets = await secretsManager.getAllSecrets();
    console.log(`[Config] Loaded secrets from ${secretsManager.getMode()} mode`);
  } catch (error: any) {
    console.warn(`[Config] Failed to load secrets from Secrets Manager: ${error.message}`);
    console.warn('[Config] Falling back to environment variables only');
  }

  // Helper function to get value from secrets or env
  const getSecret = (key: string, fallback: string = ''): string => {
    return secrets[key] || process.env[key] || fallback;
  };

  const config: Config = {
    port: parseInt(process.env.DASHBOARD_PORT || process.env.JARVIS_PORT || '5001', 10),
    aiDawgBackendUrl: process.env.AI_DAWG_BACKEND_URL || 'http://localhost:3001',
    aiDawgDockerUrl: process.env.AI_DAWG_DOCKER_URL || 'http://localhost:3000',
    vocalCoachUrl: process.env.VOCAL_COACH_URL || 'http://localhost:8000',
    producerUrl: process.env.PRODUCER_URL || 'http://localhost:8001',
    aiBrainUrl: process.env.AI_BRAIN_URL || 'http://localhost:8002',
    authToken: process.env.JARVIS_AUTH_TOKEN || 'test-token',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',

    // Database configuration (from secrets)
    databaseUrl: getSecret('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/jarvis'),
    redisUrl: getSecret('REDIS_URL', 'redis://localhost:6379'),

    // AI Provider API Keys (from secrets)
    openaiApiKey: getSecret('OPENAI_API_KEY'),
    anthropicApiKey: getSecret('ANTHROPIC_API_KEY'),
    googleAiApiKey: getSecret('GOOGLE_AI_API_KEY'),
    mistralApiKey: getSecret('MISTRAL_API_KEY'),

    // Security tokens (from secrets)
    jwtSecret: getSecret('JWT_SECRET'),
    csrfSecret: getSecret('CSRF_SECRET'),
    refreshTokenSecret: getSecret('REFRESH_TOKEN_SECRET'),
  };

  secretsLoaded = true;
  configCache = config;

  return config;
}

/**
 * Synchronous config access (uses cached values)
 * For initial access, use getConfigAsync() instead
 */
export const config: Config = {
  port: parseInt(process.env.DASHBOARD_PORT || process.env.JARVIS_PORT || '5001', 10),
  aiDawgBackendUrl: process.env.AI_DAWG_BACKEND_URL || 'http://localhost:3001',
  aiDawgDockerUrl: process.env.AI_DAWG_DOCKER_URL || 'http://localhost:3000',
  vocalCoachUrl: process.env.VOCAL_COACH_URL || 'http://localhost:8000',
  producerUrl: process.env.PRODUCER_URL || 'http://localhost:8001',
  aiBrainUrl: process.env.AI_BRAIN_URL || 'http://localhost:8002',
  authToken: process.env.JARVIS_AUTH_TOKEN || 'test-token',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jarvis',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
};

/**
 * Async function to get config with secrets loaded from AWS Secrets Manager
 * Use this in your application startup
 */
export async function getConfigAsync(): Promise<Config> {
  return await loadConfig();
}

/**
 * Reload secrets and config (useful for credential rotation)
 */
export async function reloadConfig(): Promise<Config> {
  secretsManager.clearCache();
  secretsLoaded = false;
  configCache = null;
  return await loadConfig();
}

export default config;
