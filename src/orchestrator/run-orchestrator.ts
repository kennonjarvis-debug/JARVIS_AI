/**
 * Run Agent Orchestrator
 * Standalone script to run autonomous agents
 */

import { createClient } from '@supabase/supabase-js';
import { AgentOrchestrator } from './agent-orchestrator.js';
import { Logger } from '../utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('Main');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY');
  console.error('\n📝 Please update your .env file with your Supabase credentials');
  process.exit(1);
}

if (SUPABASE_URL.includes('placeholder')) {
  console.error('❌ Supabase credentials are still placeholders');
  console.error('\n📝 To set up Supabase:');
  console.error('1. Go to https://supabase.com');
  console.error('2. Create a new project');
  console.error('3. Go to Project Settings > API');
  console.error('4. Copy the URL and service_role key to .env');
  console.error('5. Run database migration: npm run db:migrate');
  console.error('\nOr use the Observatory dashboard for a live demo with mock data!\n');
  process.exit(1);
}

async function main() {
  try {
    logger.info('🤖 Jarvis Agent Orchestrator');
    logger.info('═'.repeat(50));

    // Initialize Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    logger.info('✅ Connected to Supabase');

    // Initialize orchestrator
    const orchestrator = new AgentOrchestrator(supabase);

    // Handle shutdown gracefully
    process.on('SIGINT', () => {
      logger.info('\n👋 Shutting down...');
      orchestrator.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('\n👋 Shutting down...');
      orchestrator.stop();
      process.exit(0);
    });

    // Start orchestrator
    await orchestrator.start();

    logger.info('═'.repeat(50));
    logger.info('🎯 Orchestrator is running autonomously');
    logger.info('📊 View activity at: http://localhost:5174');
    logger.info('📡 API running at: http://localhost:3000');
    logger.info('Press Ctrl+C to stop');
    logger.info('═'.repeat(50));

    // Keep process alive
    await new Promise(() => {});
  } catch (error: any) {
    logger.error('Failed to start orchestrator', error);
    process.exit(1);
  }
}

main();
