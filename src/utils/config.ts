import dotenv from 'dotenv';

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
}

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
  openaiApiKey: process.env.OPENAI_API_KEY || ''
};

export default config;
