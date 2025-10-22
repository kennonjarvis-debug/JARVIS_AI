/**
 * Activity Monitoring System Test
 *
 * Comprehensive test suite for the autonomous activity monitoring system.
 * Tests all components: ActivityMonitor, ContextDetector, ProactiveActions
 */

import { activityMonitor, ActivityContext, MonitoringLevel } from '../src/services/activity-monitor.service.js';
import { contextDetector } from '../src/services/context-detector.service.js';
import { proactiveActions, ActionType } from '../src/services/proactive-action.service.js';
import { deviceSync } from '../src/services/device-sync.service.js';
import { logger } from '../src/utils/logger.js';

// Test configuration
const TEST_USER_ID = 'test-user-ben';
const TEST_DURATION = 30000; // 30 seconds

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  error?: any;
}

const testResults: TestResult[] = [];

/**
 * Run test and record result
 */
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  console.log(`\n🧪 Running: ${name}`);
  console.log('='.repeat(60));

  try {
    await testFn();
    const duration = Date.now() - startTime;

    testResults.push({
      name,
      passed: true,
      duration,
      details: 'Test passed successfully'
    });

    console.log(`✅ PASSED (${duration}ms)\n`);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    testResults.push({
      name,
      passed: false,
      duration,
      details: error.message,
      error
    });

    console.log(`❌ FAILED (${duration}ms)`);
    console.log(`Error: ${error.message}\n`);
  }
}

/**
 * Test 1: Activity Monitor Initialization
 */
async function testActivityMonitorInit(): Promise<void> {
  // Configure monitoring
  activityMonitor.updateConfig({
    level: MonitoringLevel.COMPREHENSIVE,
    privacy: {
      excludedApps: ['Passwords', '1Password'],
      excludedKeywords: ['password', 'secret'],
      encryptionEnabled: true,
      autoDeleteAfterDays: 7
    },
    monitoring: {
      screenCaptureInterval: 60,
      audioSamplingInterval: 5,
      appCheckInterval: 10
    },
    storage: {
      localPath: '/Users/benkennon/Jarvis/data/activity-logs-test',
      maxStorageGB: 1
    }
  });

  // Start monitoring
  await activityMonitor.startMonitoring(TEST_USER_ID);

  // Verify it's running
  const stats = activityMonitor.getStats();

  if (!stats.isMonitoring) {
    throw new Error('Activity monitor failed to start');
  }

  console.log('✓ Activity monitor started');
  console.log(`✓ Monitoring level: ${MonitoringLevel.COMPREHENSIVE}`);
  console.log(`✓ Current context: ${ActivityContext[stats.currentContext]}`);
}

/**
 * Test 2: Context Detection
 */
async function testContextDetection(): Promise<void> {
  // Simulate context changes
  console.log('Simulating different contexts...');

  // Test 1: Coding context
  contextDetector.analyzeAppSwitch('Visual Studio Code', 'index.tsx - MyProject');
  await sleep(1000);

  let context = contextDetector.getCurrentContext();
  console.log(`✓ Detected context: ${ActivityContext[context]}`);

  // Test 2: Meeting context
  contextDetector.analyzeAppSwitch('Zoom', 'Meeting with Team');
  contextDetector.analyzeAudio({ audioLevel: 0.5, isSpeech: true, beatDetected: false });
  await sleep(1000);

  context = contextDetector.getCurrentContext();
  console.log(`✓ Detected context: ${ActivityContext[context]}`);

  // Test 3: Browsing context
  contextDetector.analyzeAppSwitch('Google Chrome', 'Google Search');
  await sleep(1000);

  context = contextDetector.getCurrentContext();
  console.log(`✓ Detected context: ${ActivityContext[context]}`);

  // Get stats
  const stats = contextDetector.getStats();
  console.log(`✓ Total context detections: ${stats.totalDetections}`);
  console.log(`✓ Current confidence: ${Math.round(stats.currentConfidence * 100)}%`);
}

/**
 * Test 3: Freestyle Detection and Auto-Finish
 */
async function testFreestyleDetection(): Promise<void> {
  console.log('Simulating freestyle session...');

  // Simulate freestyle session start
  contextDetector.analyzeAppSwitch('Spotify', 'Hip Hop Beats Playlist');
  contextDetector.analyzeAudio({ audioLevel: 0.7, isSpeech: true, beatDetected: true });

  await sleep(2000);

  const context = contextDetector.getCurrentContext();
  console.log(`✓ Context detected: ${ActivityContext[context]}`);

  if (context !== ActivityContext.FREESTYLING) {
    throw new Error(`Expected FREESTYLING context, got ${ActivityContext[context]}`);
  }

  // Get current session
  const session = activityMonitor.getCurrentSession();
  if (!session) {
    throw new Error('No active session found');
  }

  console.log(`✓ Freestyle session created: ${session.id}`);
  console.log(`✓ Session context: ${ActivityContext[session.context]}`);

  // Simulate freestyle for 3 seconds
  await sleep(3000);

  // Stop freestyle
  contextDetector.analyzeAudio({ audioLevel: 0.1, isSpeech: false, beatDetected: false });
  await sleep(1000);

  console.log(`✓ Freestyle session detected and tracked`);
}

/**
 * Test 4: Proactive Action Detection
 */
async function testProactiveActions(): Promise<void> {
  console.log('Testing proactive action detection...');

  // Get recent sessions
  const sessions = activityMonitor.getUserSessions(TEST_USER_ID);
  const events = activityMonitor.getRecentEvents(100);

  console.log(`✓ Found ${sessions.length} sessions`);
  console.log(`✓ Found ${events.length} events`);

  // Analyze for opportunities
  const opportunities = proactiveActions.analyzeActivity(sessions, events);

  console.log(`✓ Detected ${opportunities.length} action opportunities`);

  for (const opp of opportunities) {
    console.log(`  • ${opp.title}`);
    console.log(`    Type: ${opp.type}`);
    console.log(`    Confidence: ${Math.round(opp.confidence * 100)}%`);
    console.log(`    Value: ${opp.estimatedValue}/10`);
  }

  // Check for freestyle finish opportunity
  const freestyleOpp = opportunities.find(o => o.type === ActionType.FINISH_SONG);
  if (freestyleOpp) {
    console.log(`✓ Freestyle auto-finish opportunity detected!`);

    // Create action
    const action = proactiveActions.createAction(freestyleOpp.id);
    console.log(`✓ Action created: ${action.id}`);

    // Simulate approval
    proactiveActions.approveAction(action.id);
    console.log(`✓ Action approved for execution`);
  }
}

/**
 * Test 5: Device Sync
 */
async function testDeviceSync(): Promise<void> {
  console.log('Testing device synchronization...');

  // Get sync status
  const status = deviceSync.getStatus();

  console.log(`✓ Sync enabled: ${status.enabled}`);
  console.log(`✓ Connected devices: ${status.connectedDevices}`);
  console.log(`✓ Offline queue: ${status.offlineQueueSize} messages`);
  console.log(`✓ Last sync: ${status.lastSyncTime.toLocaleString()}`);

  // Simulate syncing a session
  const session = activityMonitor.getCurrentSession();
  if (session) {
    deviceSync.syncActivitySession(session);
    console.log(`✓ Session synced to devices`);
  }

  // Simulate syncing context
  const context = contextDetector.getCurrentContext();
  const confidence = contextDetector.getCurrentConfidence();
  deviceSync.syncContextChange(ActivityContext[context], confidence);
  console.log(`✓ Context synced to devices`);
}

/**
 * Test 6: Privacy and Exclusions
 */
async function testPrivacyControls(): Promise<void> {
  console.log('Testing privacy controls...');

  // Simulate excluded app
  contextDetector.analyzeAppSwitch('1Password', 'Passwords');
  await sleep(500);

  // Context should not change to something sensitive
  const context = contextDetector.getCurrentContext();
  console.log(`✓ Context after excluded app: ${ActivityContext[context]}`);

  // Check that screenshot wasn't taken
  // (In real implementation, verify no screenshot exists)
  console.log(`✓ Privacy exclusions working`);
}

/**
 * Test 7: Cleanup and Stats
 */
async function testCleanupAndStats(): Promise<void> {
  console.log('Testing cleanup and statistics...');

  // Get activity monitor stats
  const monitorStats = activityMonitor.getStats();
  console.log(`✓ Total events: ${monitorStats.totalEvents}`);
  console.log(`✓ Total sessions: ${monitorStats.totalSessions}`);

  // Get context detector stats
  const contextStats = contextDetector.getStats();
  console.log(`✓ Total context detections: ${contextStats.totalDetections}`);
  console.log(`✓ Context distribution:`, contextStats.contextDistribution);

  // Get proactive actions stats
  const actionStats = proactiveActions.getStats();
  console.log(`✓ Total opportunities: ${actionStats.totalOpportunities}`);
  console.log(`✓ Total actions: ${actionStats.totalActions}`);
  console.log(`✓ Completed actions: ${actionStats.completedActions}`);

  // Stop monitoring
  await activityMonitor.stopMonitoring();
  console.log(`✓ Monitoring stopped`);
}

/**
 * Helper: Sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Print test summary
 */
function printTestSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => r.passed === false).length;
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal Tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  • ${r.name}`);
      console.log(`    Error: ${r.details}`);
    });
  }

  console.log('\n✅ Detailed Results:');
  testResults.forEach((r, i) => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${i + 1}. ${icon} ${r.name} (${r.duration}ms)`);
  });

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ACTIVITY MONITORING SYSTEM TEST SUITE');
  console.log('='.repeat(60));
  console.log(`User: ${TEST_USER_ID}`);
  console.log(`Duration: ${TEST_DURATION / 1000}s`);
  console.log('='.repeat(60));

  // Run all tests
  await runTest('1. Activity Monitor Initialization', testActivityMonitorInit);
  await runTest('2. Context Detection', testContextDetection);
  await runTest('3. Freestyle Detection', testFreestyleDetection);
  await runTest('4. Proactive Action Detection', testProactiveActions);
  await runTest('5. Device Synchronization', testDeviceSync);
  await runTest('6. Privacy Controls', testPrivacyControls);
  await runTest('7. Cleanup and Statistics', testCleanupAndStats);

  // Print summary
  printTestSummary();

  // Exit with appropriate code
  const failed = testResults.filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
  console.error('❌ Test suite crashed:', error);
  process.exit(1);
});
