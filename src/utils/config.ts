import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

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
}

export const config: Config = {
  port: parseInt(process.env.JARVIS_PORT || '4000', 10),
  aiDawgBackendUrl: process.env.AI_DAWG_BACKEND_URL || 'http://localhost:3001',
  aiDawgDockerUrl: process.env.AI_DAWG_DOCKER_URL || 'http://localhost:3000',
  vocalCoachUrl: process.env.VOCAL_COACH_URL || 'http://localhost:8000',
  producerUrl: process.env.PRODUCER_URL || 'http://localhost:8001',
  aiBrainUrl: process.env.AI_BRAIN_URL || 'http://localhost:8002',
  authToken: process.env.JARVIS_AUTH_TOKEN || 'test-token',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info'
};

export default config;
