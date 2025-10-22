/**
 * Jarvis Autonomous Agent System - Main Entry Point
 * @module index
 */

// ESM imports
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Core systems
import { EnhancedOrchestrator } from './core/enhanced-orchestrator';
import { MemorySystem } from './core/memory';
import { ApprovalQueue } from './core/approval-queue';
import { DecisionEngine } from './core/decision-engine';

// Agents
import { MarketingAgent } from './agents/marketing-agent';
import { SalesAgent } from './agents/sales-agent';
import { SupportAgent } from './agents/support-agent';
import { OperationsAgent } from './agents/operations-agent';

// Configuration
import { CONFIG, validateConfig } from './config/tools';
import { initializeScheduler } from './scheduler';
import { Logger } from './utils/logger';

dotenv.config();

const logger = new Logger('Main');

/**
 * Load decision rules from config
 */
function loadDecisionRules() {
  const rulesPath = join(process.cwd(), 'config', 'decision-rules.json');
  const rulesData = readFileSync(rulesPath, 'utf-8');
  const { rules } = JSON.parse(rulesData);
  return rules;
}

/**
 * Initialize Jarvis autonomous system
 */
export async function initializeJarvis() {
  logger.info('🤖 Initializing Jarvis...');

  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    throw new Error(`Config errors: ${validation.errors.join(', ')}`);
  }

  // Initialize Anthropic
  const anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Initialize Supabase
  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);

  // Initialize core systems
  logger.info('Initializing core systems...');
  const memory = new MemorySystem(supabase);
  const approvalQueue = new ApprovalQueue(supabase, null);

  // Load decision rules and initialize DecisionEngine
  logger.info('Loading decision rules...');
  const decisionRules = loadDecisionRules();
  const decisionEngine = new DecisionEngine(
    decisionRules,
    anthropicClient,
    memory,
    approvalQueue
  );
  logger.info(`Loaded ${decisionRules.length} decision rules`);

  // Initialize all agents
  logger.info('Initializing agents...');

  const marketingAgent = new MarketingAgent({
    anthropicClient,
    memory,
    integrations: { supabase },
    id: 'marketing-agent',
    name: 'Marketing Agent',
    decisionEngine,
    approvalQueue,
  });

  const salesAgent = new SalesAgent({
    anthropicClient,
    memory,
    integrations: { supabase },
    id: 'sales-agent',
    name: 'Sales Agent',
    decisionEngine,
    approvalQueue,
  });

  const supportAgent = new SupportAgent({
    anthropicClient,
    memory,
    integrations: { supabase },
    id: 'support-agent',
    name: 'Support Agent',
    decisionEngine,
    approvalQueue,
  });

  const operationsAgent = new OperationsAgent({
    anthropicClient,
    memory,
    integrations: { supabase },
    id: 'operations-agent',
    name: 'Operations Agent',
    decisionEngine,
    approvalQueue,
  });

  logger.info('✅ All 4 agents initialized');

  // Initialize enhanced orchestrator with LangGraph support
  logger.info('Initializing enhanced orchestrator with LangGraph...');
  const orchestrator = new EnhancedOrchestrator({
    agents: [marketingAgent, salesAgent, supportAgent, operationsAgent],
    integrations: { supabase },
    decisionEngine,
    approvalQueue,
    memory,
    useLangGraph: true,
    langGraphThreshold: 'complex', // Use LangGraph for complex multi-agent tasks
  });

  await orchestrator.initialize();
  logger.info('✅ Enhanced orchestrator with LangGraph initialized');

  // Initialize scheduler
  logger.info('Initializing scheduler...');
  initializeScheduler(orchestrator, approvalQueue, operationsAgent);
  logger.info('✅ Scheduler initialized');

  logger.info('✅ Jarvis fully initialized and ready!');

  return {
    orchestrator,
    agents: { marketingAgent, salesAgent, supportAgent, operationsAgent },
    decisionEngine,
    memory,
    approvalQueue,
  };
}

async function main() {
  try {
    const { orchestrator } = await initializeJarvis();

    process.on('SIGINT', async () => {
      await orchestrator.shutdown();
      process.exit(0);
    });

    logger.info('🤖 Jarvis is running!');
  } catch (error) {
    logger.error('Failed to initialize', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;
