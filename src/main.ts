#!/usr/bin/env tsx
/**
 * Jarvis Control Plane - Main Entry Point
 *
 * Central orchestration layer for AI Dawg execution engine
 * Manages module routing, health monitoring, and external integrations
 */

import { startGateway } from './core/gateway.js';
import { logger } from './utils/logger.js';
import { config } from './utils/config.js';
import MCPServer from './integrations/claude/mcp-server.js';
import { businessOperator } from './core/business-operator.js';

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗                 ║
║     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝                 ║
║     ██║███████║██████╔╝██║   ██║██║███████╗                 ║
║██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║                 ║
║╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║                 ║
║ ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝                 ║
║                                                               ║
║         CONTROL PLANE v2.0 - AI Orchestration Layer          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;

async function main() {
  try {
    // Display banner
    console.log(banner);

    logger.info('🚀 Starting Jarvis Control Plane...');
    logger.info(`📌 Environment: ${config.nodeEnv}`);
    logger.info(`🔧 Log Level: ${config.logLevel}`);

    // Check for port conflicts
    await checkPortAvailability();

    // Start API Gateway
    logger.info('Starting API Gateway...');
    startGateway();

    // Initialize Claude MCP Server (stub for now)
    if (process.env.ENABLE_MCP === 'true') {
      logger.info('Initializing Claude MCP Server...');
      const mcpServer = new MCPServer();
      await mcpServer.start();
    }

    // Start Business Operator for autonomous management
    logger.info('Starting Business Operator...');
    await businessOperator.start();
    logger.info('✅ Business Operator monitoring AI DAWG services');

    // Start Autonomous Orchestrator (if enabled)
    const { AutonomousOrchestrator } = await import('./autonomous/orchestrator.js');
    const orchestrator = AutonomousOrchestrator.getInstance();
    await orchestrator.start();

    if (process.env.AUTONOMOUS_ENABLED === 'true') {
      logger.info('');
      logger.info('🤖 AUTONOMOUS MODE ACTIVE');
      logger.info('   AI DAWG is now self-managing with domain agents:');
      logger.info('   - Music Production (compositions, mixing, mastering)');
      logger.info('   - Marketing Strategy (promotion, user acquisition)');
      logger.info('   - User Engagement (onboarding, support)');
      logger.info('   - Workflow Automation (testing, deployment)');
      logger.info('   - Business Intelligence (analytics, insights)');
      logger.info('   - Cost Optimization (resource management)');
      logger.info('   - System Health (monitoring, recovery)');
      logger.info('');
    }

    // Log startup success
    logger.info('✅ Jarvis Control Plane started successfully');
    logger.info(`📡 Gateway: http://localhost:${config.port}`);
    logger.info(`🔗 AI Dawg Backend: ${config.aiDawgBackendUrl}`);
    logger.info('');
    logger.info('Available endpoints:');
    logger.info(`  GET  /health              - Basic health check`);
    logger.info(`  GET  /health/detailed     - Detailed service health`);
    logger.info(`  GET  /status              - Controller status`);
    logger.info(`  POST /api/v1/execute      - Execute module command`);
    logger.info('');

  } catch (error: any) {
    logger.error(`❌ Failed to start Jarvis Control Plane: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

/**
 * Check if port is available
 */
async function checkPortAvailability() {
  const net = await import('net');

  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${config.port} is already in use`);
        logger.error(`   Run: lsof -i :${config.port} to find the process`);
        process.exit(1);
      }
      reject(err);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(config.port);
  });
}

/**
 * Graceful shutdown handler
 */
function setupShutdownHandlers() {
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    // Stop Business Operator
    businessOperator.stop();

    // Give time for connections to close
    setTimeout(() => {
      logger.info('Shutdown complete');
      process.exit(0);
    }, 1000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

// Setup shutdown handlers
setupShutdownHandlers();

// Start the application
main();
