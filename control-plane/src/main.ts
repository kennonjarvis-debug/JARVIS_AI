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

    // Start Business Operator for autonomous management (skip in ECS)
    if (process.env.ENABLE_BUSINESS_OPERATOR !== 'false') {
      logger.info('Starting Business Operator...');
      await businessOperator.start();
      logger.info('✅ Business Operator monitoring AI DAWG services');
    } else {
      logger.info('⏭️  Business Operator disabled (ENABLE_BUSINESS_OPERATOR=false)');
    }

    // Start Autonomous Orchestrator (if enabled)
    try {
      const { AutonomousOrchestrator } = await import('./autonomous/orchestrator.js');
      const orchestrator = AutonomousOrchestrator.getInstance();
      await orchestrator.start();
      logger.info('✅ Autonomous Orchestrator started successfully');
    } catch (error: any) {
      logger.error(`❌ Failed to start Autonomous Orchestrator: ${error.message}`);
      logger.error(error.stack);
      logger.warn('⚠️  Continuing without autonomous mode');
    }

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

    // Start Activity Monitoring System (if enabled)
    if (process.env.ACTIVITY_MONITORING_ENABLED === 'true') {
      logger.info('🔍 Starting Activity Monitoring System...');

      const { activityMonitor, MonitoringLevel } = await import('./services/activity-monitor.service.js');
      const { proactiveActions, ActionType } = await import('./services/proactive-action.service.js');
      const { deviceSync } = await import('./services/device-sync.service.js');
      const { musicGenerator } = await import('./services/music-generator.js');

      // Configure activity monitoring
      activityMonitor.updateConfig({
        level: MonitoringLevel.COMPREHENSIVE,
        privacy: {
          excludedApps: ['Passwords', '1Password', 'KeyChain Access', 'Banking'],
          excludedKeywords: ['password', 'secret', 'api key', 'ssn', 'credit card'],
          encryptionEnabled: true,
          autoDeleteAfterDays: 7
        },
        monitoring: {
          screenCaptureInterval: 60,
          audioSamplingInterval: 5,
          appCheckInterval: 10
        },
        storage: {
          localPath: '/Users/benkennon/Jarvis/data/activity-logs',
          maxStorageGB: 10
        }
      });

      // Start monitoring for current user
      const userId = process.env.USER || 'ben';
      await activityMonitor.startMonitoring(userId);

      // Setup event listeners for proactive actions
      activityMonitor.on('session:ended', async (session) => {
        // Analyze for opportunities
        const sessions = activityMonitor.getUserSessions(userId);
        const events = activityMonitor.getRecentEvents(100);
        const opportunities = proactiveActions.analyzeActivity(sessions, events);

        // Log detected opportunities
        for (const opp of opportunities) {
          logger.info(`💡 Opportunity detected: ${opp.title} (${Math.round(opp.confidence * 100)}% confidence)`);

          // Auto-create action
          const action = proactiveActions.createAction(opp.id);

          // Auto-approve and EXECUTE low-risk actions
          if (opp.clearanceRequired <= 2) { // MODIFY_SAFE or lower
            proactiveActions.approveAction(action.id);
            logger.info(`✅ Action auto-approved: ${action.id}`);

            // EXECUTE THE ACTION
            if (opp.type === ActionType.FINISH_SONG) {
              logger.info(`🎵 Executing FINISH_SONG action...`);

              try {
                // Generate music using custom MusicGen
                const result = await musicGenerator.generateBeat({
                  genre: 'hip-hop', // Could be extracted from session metadata
                  bpm: 120,
                  mood: 'energetic',
                  duration: 30
                });

                logger.info(`✅ Music generated: ${result.localPath}`);

                // Mark action as completed
                proactiveActions.completeAction(action.id, {
                  audioPath: result.localPath,
                  audioUrl: result.audioUrl,
                  metadata: result.metadata
                });

                // Notify user (via device sync if enabled)
                if (deviceSync.getStatus().enabled) {
                  await deviceSync.sendNotification(userId, {
                    title: '🎵 Your freestyle is ready!',
                    body: `Generated a ${result.metadata.genre} beat from your freestyle session`,
                    data: { audioPath: result.localPath }
                  });
                }
              } catch (error: any) {
                logger.error(`❌ Failed to execute FINISH_SONG action: ${error.message}`);
                proactiveActions.failAction(action.id, error.message);
              }
            }
          }
        }
      });

      logger.info('');
      logger.info('👁️  ACTIVITY MONITORING ACTIVE');
      logger.info('   Jarvis is now watching your work and will proactively:');
      logger.info('   - Detect freestyle sessions → Auto-finish songs');
      logger.info('   - Track app usage → Create shortcuts');
      logger.info('   - Analyze coding patterns → Generate templates');
      logger.info('   - Monitor work sessions → Suggest breaks');
      logger.info('   - Sync to iPhone → Real-time notifications');
      logger.info('');
      logger.info(`   Current Context: Monitoring started for ${userId}`);
      logger.info(`   Privacy: ${activityMonitor.getStats().isMonitoring ? 'Active with exclusions' : 'Disabled'}`);
      logger.info(`   Device Sync: ${deviceSync.getStatus().enabled ? 'Enabled' : 'Disabled'}`);
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
