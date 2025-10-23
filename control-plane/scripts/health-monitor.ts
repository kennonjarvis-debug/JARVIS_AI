#!/usr/bin/env tsx
/**
 * Browser Automation Health Monitor
 * Automated health checking for browser automation service
 * Runs every 30 minutes and sends alerts if issues detected
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  baseUrl: process.env.JARVIS_URL || 'http://localhost:5001',
  authToken: process.env.JARVIS_AUTH_TOKEN || 'test-token',
  checkInterval: 30 * 60 * 1000, // 30 minutes
  testUrl: 'https://example.com',
  logFile: path.join(__dirname, '../logs/health-monitor.log'),
  alertThreshold: 3, // Number of consecutive failures before alerting
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  pushoverToken: process.env.PUSHOVER_API_TOKEN,
  pushoverUser: process.env.PUSHOVER_USER_KEY
};

interface HealthCheckResult {
  timestamp: string;
  success: boolean;
  duration: number;
  error?: string;
  consoleLogs?: number;
  networkLogs?: number;
  metrics: {
    responseTime: number;
    memoryUsage?: number;
  };
}

let consecutiveFailures = 0;
const healthHistory: HealthCheckResult[] = [];

/**
 * Log message to file and console
 */
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  console.log(logMessage);

  // Ensure log directory exists
  const logDir = path.dirname(CONFIG.logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

/**
 * Perform health check
 */
async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    log('Starting health check...');

    const response = await axios.post(
      `${CONFIG.baseUrl}/api/v1/browser/automate`,
      {
        url: CONFIG.testUrl,
        captureConsole: true,
        captureNetwork: true,
        headless: true,
        timeout: 30000
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000 // 45 second request timeout
      }
    );

    const duration = Date.now() - startTime;

    if (!response.data.success) {
      throw new Error(response.data.error || 'Browser automation failed');
    }

    const result: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      success: true,
      duration,
      consoleLogs: response.data.data.consoleLogs?.length || 0,
      networkLogs: response.data.data.networkLogs?.length || 0,
      metrics: {
        responseTime: duration
      }
    };

    log(`✅ Health check passed in ${duration}ms`);
    log(`   Console logs: ${result.consoleLogs}, Network logs: ${result.networkLogs}`);

    consecutiveFailures = 0; // Reset failure counter

    return result;

  } catch (error: any) {
    const duration = Date.now() - startTime;

    const result: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      success: false,
      duration,
      error: error.message,
      metrics: {
        responseTime: duration
      }
    };

    consecutiveFailures++;

    log(`❌ Health check failed: ${error.message}`, 'ERROR');
    log(`   Consecutive failures: ${consecutiveFailures}`, 'WARN');

    return result;
  }
}

/**
 * Send alert via Slack
 */
async function sendSlackAlert(result: HealthCheckResult): Promise<void> {
  if (!CONFIG.slackWebhook) return;

  try {
    await axios.post(CONFIG.slackWebhook, {
      text: '🚨 *JARVIS Browser Automation Alert*',
      attachments: [{
        color: 'danger',
        fields: [
          {
            title: 'Status',
            value: 'Health Check Failed',
            short: true
          },
          {
            title: 'Consecutive Failures',
            value: consecutiveFailures.toString(),
            short: true
          },
          {
            title: 'Error',
            value: result.error || 'Unknown error',
            short: false
          },
          {
            title: 'Timestamp',
            value: result.timestamp,
            short: false
          }
        ]
      }]
    });

    log('Slack alert sent successfully');
  } catch (error: any) {
    log(`Failed to send Slack alert: ${error.message}`, 'ERROR');
  }
}

/**
 * Send alert via Pushover (iPhone notification)
 */
async function sendPushoverAlert(result: HealthCheckResult): Promise<void> {
  if (!CONFIG.pushoverToken || !CONFIG.pushoverUser) return;

  try {
    await axios.post('https://api.pushover.net/1/messages.json', {
      token: CONFIG.pushoverToken,
      user: CONFIG.pushoverUser,
      title: '🚨 JARVIS Browser Automation Alert',
      message: `Health check failed (${consecutiveFailures} consecutive failures)\n\nError: ${result.error}`,
      priority: consecutiveFailures >= CONFIG.alertThreshold ? 1 : 0,
      sound: 'siren'
    });

    log('Pushover alert sent successfully');
  } catch (error: any) {
    log(`Failed to send Pushover alert: ${error.message}`, 'ERROR');
  }
}

/**
 * Send alerts if threshold reached
 */
async function checkAndSendAlerts(result: HealthCheckResult): Promise<void> {
  if (consecutiveFailures >= CONFIG.alertThreshold) {
    log(`⚠️  Alert threshold reached (${consecutiveFailures} failures)`, 'WARN');

    await Promise.all([
      sendSlackAlert(result),
      sendPushoverAlert(result)
    ]);
  }
}

/**
 * Generate health report
 */
function generateHealthReport(): void {
  const totalChecks = healthHistory.length;
  const successfulChecks = healthHistory.filter(h => h.success).length;
  const failedChecks = totalChecks - successfulChecks;
  const successRate = totalChecks > 0 ? (successfulChecks / totalChecks * 100).toFixed(2) : '0.00';

  const avgResponseTime = totalChecks > 0
    ? Math.round(healthHistory.reduce((sum, h) => sum + h.duration, 0) / totalChecks)
    : 0;

  log('\n' + '='.repeat(60));
  log('📊 Health Monitor Report');
  log('='.repeat(60));
  log(`Total Checks: ${totalChecks}`);
  log(`Successful: ${successfulChecks}`);
  log(`Failed: ${failedChecks}`);
  log(`Success Rate: ${successRate}%`);
  log(`Avg Response Time: ${avgResponseTime}ms`);
  log(`Current Consecutive Failures: ${consecutiveFailures}`);
  log('='.repeat(60) + '\n');
}

/**
 * Main monitoring loop
 */
async function startMonitoring(): Promise<void> {
  log('🔍 Starting Browser Automation Health Monitor');
  log(`   Check interval: ${CONFIG.checkInterval / 1000}s`);
  log(`   Alert threshold: ${CONFIG.alertThreshold} consecutive failures`);
  log(`   Log file: ${CONFIG.logFile}`);

  // Perform initial check
  const initialResult = await performHealthCheck();
  healthHistory.push(initialResult);

  if (!initialResult.success) {
    await checkAndSendAlerts(initialResult);
  }

  // Schedule periodic checks
  setInterval(async () => {
    const result = await performHealthCheck();
    healthHistory.push(result);

    // Keep only last 100 results
    if (healthHistory.length > 100) {
      healthHistory.shift();
    }

    // Send alerts if needed
    if (!result.success) {
      await checkAndSendAlerts(result);
    }

    // Generate report every 10 checks
    if (healthHistory.length % 10 === 0) {
      generateHealthReport();
    }
  }, CONFIG.checkInterval);

  // Generate initial report after 1 minute
  setTimeout(() => {
    generateHealthReport();
  }, 60000);
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully...');
  generateHealthReport();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully...');
  generateHealthReport();
  process.exit(0);
});

// Start monitoring
startMonitoring().catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  process.exit(1);
});
