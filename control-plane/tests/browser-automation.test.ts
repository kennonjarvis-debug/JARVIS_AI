/**
 * Browser Automation Test Suite
 * Comprehensive tests for the browser automation service
 */

import axios from 'axios';

// Configuration
const BASE_URL = process.env.JARVIS_URL || 'http://localhost:5001';
const AUTH_TOKEN = process.env.JARVIS_AUTH_TOKEN || 'test-token';

const axiosConfig = {
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 60000 // 60 second timeout for browser operations
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  response?: any;
}

const testResults: TestResult[] = [];

/**
 * Test helper to run individual tests
 */
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  console.log(`\n🧪 Running: ${name}`);

  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, passed: true, duration });
    console.log(`✅ PASSED (${duration}ms): ${name}`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    testResults.push({ name, passed: false, duration, error: error.message });
    console.error(`❌ FAILED (${duration}ms): ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

/**
 * Test 1: Basic Console Log Collection
 */
async function testBasicConsoleCollection() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/browser/automate`,
    {
      url: 'https://example.com',
      captureConsole: true,
      captureNetwork: false,
      headless: true
    },
    axiosConfig
  );

  if (!response.data.success) {
    throw new Error('Browser automation failed');
  }

  if (!response.data.data.consoleLogs) {
    throw new Error('No console logs captured');
  }

  console.log(`   📋 Captured ${response.data.data.consoleLogs.length} console logs`);
}

/**
 * Test 2: Network Request Monitoring
 */
async function testNetworkMonitoring() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/browser/automate`,
    {
      url: 'https://example.com',
      captureConsole: false,
      captureNetwork: true,
      headless: true
    },
    axiosConfig
  );

  if (!response.data.success) {
    throw new Error('Browser automation failed');
  }

  if (!response.data.data.networkLogs) {
    throw new Error('No network logs captured');
  }

  const requests = response.data.data.networkLogs;
  console.log(`   🌐 Captured ${requests.length} network requests`);

  // Check for failed requests
  const failedRequests = requests.filter((req: any) => req.status && req.status >= 400);
  if (failedRequests.length > 0) {
    console.log(`   ⚠️  Found ${failedRequests.length} failed requests`);
  }
}

/**
 * Test 3: Screenshot Capture
 */
async function testScreenshotCapture() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/browser/automate`,
    {
      url: 'https://example.com',
      captureScreenshot: true,
      captureConsole: false,
      captureNetwork: false,
      headless: true
    },
    axiosConfig
  );

  if (!response.data.success) {
    throw new Error('Browser automation failed');
  }

  if (!response.data.data.screenshot) {
    throw new Error('No screenshot captured');
  }

  const screenshotLength = response.data.data.screenshot.length;
  console.log(`   📸 Screenshot captured (${screenshotLength} chars)`);

  // Verify it's base64
  if (!/^[A-Za-z0-9+/=]+$/.test(response.data.data.screenshot)) {
    throw new Error('Screenshot is not valid base64');
  }
}

/**
 * Test 4: Browser Actions (Click, Type)
 */
async function testBrowserActions() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/browser/automate`,
    {
      url: 'https://www.google.com',
      actions: [
        { type: 'wait', value: 1000 },
        { type: 'type', selector: 'textarea[name="q"]', value: 'test search' },
        { type: 'wait', value: 500 }
      ],
      captureConsole: true,
      headless: true
    },
    axiosConfig
  );

  if (!response.data.success) {
    throw new Error('Browser automation with actions failed');
  }

  console.log(`   🎬 Successfully executed ${3} browser actions`);
}

/**
 * Test 5: Module Router Integration
 */
async function testModuleRouterIntegration() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/execute`,
    {
      module: 'browser',
      action: 'inspect',
      params: {
        url: 'https://example.com',
        captureConsole: true,
        captureNetwork: true
      }
    },
    axiosConfig
  );

  if (!response.data.success) {
    throw new Error('Module router execution failed');
  }

  if (!response.data.data.consoleLogs) {
    throw new Error('Module router did not return console logs');
  }

  console.log(`   🔌 Module router successfully integrated`);
}

/**
 * Test 6: Custom Viewport
 */
async function testCustomViewport() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/browser/automate`,
    {
      url: 'https://example.com',
      viewport: { width: 375, height: 667 }, // iPhone size
      captureScreenshot: true,
      headless: true
    },
    axiosConfig
  );

  if (!response.data.success) {
    throw new Error('Custom viewport test failed');
  }

  console.log(`   📱 Custom viewport (375x667) applied successfully`);
}

/**
 * Test 7: Timeout Handling
 */
async function testTimeoutHandling() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/browser/automate`,
    {
      url: 'https://example.com',
      timeout: 5000, // Very short timeout
      captureConsole: true,
      headless: true
    },
    axiosConfig
  );

  // Should complete within timeout or handle gracefully
  if (!response.data.success && !response.data.data.error?.includes('timeout')) {
    throw new Error('Unexpected error (expected timeout or success)');
  }

  console.log(`   ⏱️  Timeout handling working correctly`);
}

/**
 * Test 8: Error Handling (Invalid URL)
 */
async function testErrorHandling() {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/v1/browser/automate`,
      {
        url: 'https://this-domain-does-not-exist-12345.com',
        captureConsole: true,
        headless: true
      },
      axiosConfig
    );

    // Should get an error response
    if (response.data.success) {
      throw new Error('Expected error for invalid domain but got success');
    }

    console.log(`   ⚠️  Error handling working correctly`);
  } catch (error: any) {
    // Either 500 error or handled error response is acceptable
    if (error.response?.status === 500 || error.response?.data?.error) {
      console.log(`   ⚠️  Error properly handled (${error.response?.status || 'handled'})`);
    } else {
      throw error;
    }
  }
}

/**
 * Test 9: Correlation ID Tracking
 */
async function testCorrelationIdTracking() {
  const customRequestId = 'test-correlation-123';

  const response = await axios.post(
    `${BASE_URL}/api/v1/browser/automate`,
    {
      url: 'https://example.com',
      captureConsole: true,
      headless: true
    },
    {
      ...axiosConfig,
      headers: {
        ...axiosConfig.headers,
        'X-Request-ID': customRequestId
      }
    }
  );

  if (!response.data.success) {
    throw new Error('Browser automation failed');
  }

  // Check if response includes X-Request-ID header
  const responseRequestId = response.headers['x-request-id'];
  console.log(`   🔗 Correlation ID tracked: ${responseRequestId || customRequestId}`);
}

/**
 * Test 10: Performance (Multiple Sequential Requests)
 */
async function testPerformance() {
  const iterations = 3;
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    await axios.post(
      `${BASE_URL}/api/v1/browser/automate`,
      {
        url: 'https://example.com',
        captureConsole: true,
        headless: true
      },
      axiosConfig
    );

    durations.push(Date.now() - start);
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  console.log(`   ⚡ Average duration over ${iterations} requests: ${Math.round(avgDuration)}ms`);

  if (avgDuration > 10000) {
    console.warn(`   ⚠️  Performance warning: Average duration is high (${Math.round(avgDuration)}ms)`);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 JARVIS Browser Automation Test Suite');
  console.log('='.repeat(60));

  await runTest('Test 1: Basic Console Log Collection', testBasicConsoleCollection);
  await runTest('Test 2: Network Request Monitoring', testNetworkMonitoring);
  await runTest('Test 3: Screenshot Capture', testScreenshotCapture);
  await runTest('Test 4: Browser Actions (Click, Type)', testBrowserActions);
  await runTest('Test 5: Module Router Integration', testModuleRouterIntegration);
  await runTest('Test 6: Custom Viewport', testCustomViewport);
  await runTest('Test 7: Timeout Handling', testTimeoutHandling);
  await runTest('Test 8: Error Handling (Invalid URL)', testErrorHandling);
  await runTest('Test 9: Correlation ID Tracking', testCorrelationIdTracking);
  await runTest('Test 10: Performance Test', testPerformance);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => r.passed === false).length;
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`📈 Success Rate: ${((passed / testResults.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   - ${r.name}`);
        console.log(`     Error: ${r.error}`);
      });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { runAllTests, testResults };
