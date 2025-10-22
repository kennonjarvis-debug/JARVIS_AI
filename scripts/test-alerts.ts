#!/usr/bin/env tsx
/**
 * Test Alert System
 * Sends test alerts through all configured channels
 */

import { getAlertDispatcher } from '../src/core/alert-dispatcher.js';
import { ServiceAlert } from '../src/core/business-operator.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAlerts() {
  console.log('🧪 Testing Jarvis Alert System\n');

  // Initialize alert dispatcher
  const dispatcher = getAlertDispatcher({
    pushover: process.env.PUSHOVER_USER_KEY && process.env.PUSHOVER_API_TOKEN ? {
      userKey: process.env.PUSHOVER_USER_KEY,
      apiToken: process.env.PUSHOVER_API_TOKEN
    } : undefined,
    ntfy: process.env.NTFY_TOPIC ? {
      topic: process.env.NTFY_TOPIC,
      server: process.env.NTFY_SERVER
    } : undefined,
    macosNotifications: {
      enabled: process.env.MACOS_NOTIFICATIONS_ENABLED !== 'false'
    },
    dashboardWebSocket: {
      enabled: false // Disable for testing
    },
    slack: process.env.SLACK_WEBHOOK_URL ? {
      enabled: true,
      webhookUrl: process.env.SLACK_WEBHOOK_URL
    } : undefined,
    chatgptWebhook: process.env.CHATGPT_WEBHOOK_URL ? {
      enabled: true,
      url: process.env.CHATGPT_WEBHOOK_URL
    } : undefined
  });

  // Print active channels
  const stats = dispatcher.getStats();
  console.log('📡 Active Channels:');
  stats.channels.forEach(channel => {
    const status = channel.enabled ? '✅ Enabled' : '❌ Disabled';
    console.log(`  ${status} - ${channel.name}`);
  });
  console.log();

  // Test alerts
  const testAlerts: ServiceAlert[] = [
    {
      service: 'test-service',
      severity: 'info',
      message: 'This is a test INFO alert',
      action: 'No action required - this is just a test',
      timestamp: new Date().toISOString()
    },
    {
      service: 'ai-dawg-backend',
      severity: 'warning',
      message: 'Service health check failed - attempting restart',
      action: 'Auto-restarting service (attempt 1/3)',
      timestamp: new Date().toISOString()
    },
    {
      service: 'postgres',
      severity: 'critical',
      message: 'Database connection failed after 3 restart attempts',
      action: 'Manual intervention required - check database logs',
      timestamp: new Date().toISOString()
    }
  ];

  for (const alert of testAlerts) {
    console.log(`📢 Sending ${alert.severity.toUpperCase()} alert...`);
    console.log(`   Service: ${alert.service}`);
    console.log(`   Message: ${alert.message}\n`);

    try {
      await dispatcher.dispatch(alert);
      console.log('   ✅ Alert dispatched successfully\n');
    } catch (error) {
      console.error('   ❌ Failed to dispatch alert:', error);
    }

    // Wait between alerts
    if (testAlerts.indexOf(alert) < testAlerts.length - 1) {
      console.log('   Waiting 3 seconds before next alert...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Print statistics
  console.log('\n📊 Alert Statistics:');
  const finalStats = dispatcher.getStats();
  console.log(`   Total Alerts: ${finalStats.total}`);
  console.log(`   Critical: ${finalStats.bySeverity.critical}`);
  console.log(`   Warning: ${finalStats.bySeverity.warning}`);
  console.log(`   Info: ${finalStats.bySeverity.info}`);
  console.log();

  console.log('✅ Alert system test complete!');
  console.log('\nCheck your:');
  console.log('  📱 iPhone (Pushover or Ntfy app)');
  console.log('  💻 macOS Notification Center');
  console.log('  💬 Slack channel (if configured)');
  console.log('  🤖 ChatGPT (if configured)');
}

// Run tests
testAlerts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
