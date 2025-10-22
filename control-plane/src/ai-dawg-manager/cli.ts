#!/usr/bin/env tsx
/**
 * AI DAWG Manager CLI
 * Command-line interface for managing AI DAWG services
 */

import { AIDawgManager } from './index';

async function main() {
  const command = process.argv[2];
  const serviceName = process.argv[3];

  if (!command) {
    printUsage();
    process.exit(1);
  }

  const manager = new AIDawgManager();

  switch (command) {
    case 'start':
      console.log('Starting AI DAWG Autonomous Manager...');
      await manager.start();

      // Keep process running
      process.on('SIGINT', async () => {
        console.log('\nReceived SIGINT, shutting down...');
        await manager.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\nReceived SIGTERM, shutting down...');
        await manager.stop();
        process.exit(0);
      });

      break;

    case 'stop':
      console.log('Stopping AI DAWG Autonomous Manager...');
      await manager.stop();
      process.exit(0);

    case 'status':
      const status = manager.getStatus();
      manager.printStatusSummary();
      process.exit(0);

    case 'restart':
      if (!serviceName) {
        console.error('Error: Service name required for restart command');
        console.log('Usage: tsx cli.ts restart <service-name>');
        process.exit(1);
      }

      console.log(`Restarting service: ${serviceName}`);
      const restartSuccess = await manager.restartService(serviceName);

      if (restartSuccess) {
        console.log(`✅ ${serviceName} restarted successfully`);
        process.exit(0);
      } else {
        console.log(`❌ Failed to restart ${serviceName}`);
        process.exit(1);
      }

    case 'recover':
      if (!serviceName) {
        console.error('Error: Service name required for recover command');
        console.log('Usage: tsx cli.ts recover <service-name>');
        process.exit(1);
      }

      console.log(`Attempting recovery for service: ${serviceName}`);
      const recoverSuccess = await manager.recoverService(serviceName);

      if (recoverSuccess) {
        console.log(`✅ ${serviceName} recovered successfully`);
        process.exit(0);
      } else {
        console.log(`❌ Failed to recover ${serviceName}`);
        process.exit(1);
      }

    case 'help':
    case '--help':
    case '-h':
      printUsage();
      process.exit(0);

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

function printUsage() {
  console.log(`
AI DAWG Autonomous Manager CLI

Usage:
  tsx cli.ts <command> [options]

Commands:
  start                    Start autonomous management (runs in foreground)
  stop                     Stop autonomous management
  status                   Show current status of all services
  restart <service>        Manually restart a specific service
  recover <service>        Attempt intelligent recovery for a service
  help                     Show this help message

Examples:
  tsx cli.ts start                    # Start autonomous management
  tsx cli.ts status                   # Check status
  tsx cli.ts restart producer         # Restart AI Producer
  tsx cli.ts recover vocal_coach      # Recover Vocal Coach

Services:
  - producer               AI Producer (port 8001)
  - vocal_coach            Vocal Coach (port 8000)
  - brain                  AI Brain (port 8003)

Press Ctrl+C to stop when running in foreground mode.
`);
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
