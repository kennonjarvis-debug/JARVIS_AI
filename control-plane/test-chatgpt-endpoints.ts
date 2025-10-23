#!/usr/bin/env tsx
/**
 * ChatGPT Integration Endpoint Tests
 * Tests all endpoints that ChatGPT would use to communicate with JARVIS
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001';
const AUTH_TOKEN = 'test-token';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function printHeader(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70) + '\n');
}

function printResult(result: TestResult) {
  const icon = result.success ? '✅' : '❌';
  console.log(`${icon} ${result.name} (${result.duration}ms)`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  if (result.details && !result.error) {
    console.log(`   Details: ${JSON.stringify(result.details, null, 2).substring(0, 200)}...`);
  }
  console.log('');
}

async function runTest(name: string, testFn: () => Promise<any>): Promise<void> {
  const startTime = Date.now();
  console.log(`🧪 Running: ${name}...`);

  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, success: true, duration, details: result });
    printResult(results[results.length - 1]);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      name,
      success: false,
      duration,
      error: error.response?.data?.error || error.message
    });
    printResult(results[results.length - 1]);
  }
}

/**
 * Test 1: Health Check (No Auth)
 */
async function testHealthNoAuth() {
  const response = await axios.get(`${BASE_URL}/health`);
  return {
    status: response.status,
    healthy: response.data.healthy || response.data.status === 'ok'
  };
}

/**
 * Test 2: Health Check (With Auth)
 */
async function testHealthWithAuth() {
  const response = await axios.get(`${BASE_URL}/health`, {
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
  });
  return {
    status: response.status,
    healthy: response.data.healthy || response.data.status === 'ok'
  };
}

/**
 * Test 3: Module Router - Browser Automation (Console Collection)
 */
async function testBrowserModuleConsole() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/execute`,
    {
      module: 'browser',
      action: 'inspect',
      params: {
        url: 'https://example.com',
        captureConsole: true,
        captureNetwork: false,
        headless: true,
        timeout: 30000
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Request-ID': 'test-chatgpt-001'
      },
      timeout: 45000
    }
  );

  return {
    success: response.data.success,
    consoleLogs: response.data.data?.consoleLogs?.length || 0,
    hasCorrelationId: !!response.headers['x-request-id']
  };
}

/**
 * Test 4: Module Router - Browser Automation (Network Monitoring)
 */
async function testBrowserModuleNetwork() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/execute`,
    {
      module: 'browser',
      action: 'automate',
      params: {
        url: 'https://example.com',
        captureConsole: false,
        captureNetwork: true,
        headless: true,
        timeout: 30000
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Request-ID': 'test-chatgpt-002'
      },
      timeout: 45000
    }
  );

  return {
    success: response.data.success,
    networkLogs: response.data.data?.networkLogs?.length || 0,
    hasCorrelationId: !!response.headers['x-request-id']
  };
}

/**
 * Test 5: Direct Browser Endpoint (Screenshot)
 */
async function testDirectBrowserEndpoint() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/browser/automate`,
    {
      url: 'https://example.com',
      captureScreenshot: true,
      captureConsole: false,
      captureNetwork: false,
      headless: true,
      timeout: 30000
    },
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Request-ID': 'test-chatgpt-003'
      },
      timeout: 45000
    }
  );

  return {
    success: response.data.success,
    hasScreenshot: !!response.data.data?.screenshot,
    screenshotLength: response.data.data?.screenshot?.length || 0,
    hasCorrelationId: !!response.headers['x-request-id']
  };
}

/**
 * Test 6: Browser Actions (Type & Click)
 */
async function testBrowserActions() {
  const response = await axios.post(
    `${BASE_URL}/api/v1/browser/automate`,
    {
      url: 'https://www.google.com',
      actions: [
        { type: 'wait', value: 1000 },
        { type: 'type', selector: 'textarea[name="q"]', value: 'JARVIS AI test' },
        { type: 'wait', value: 500 }
      ],
      captureConsole: true,
      headless: true,
      timeout: 30000
    },
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Request-ID': 'test-chatgpt-004'
      },
      timeout: 45000
    }
  );

  return {
    success: response.data.success,
    actionsExecuted: 3,
    consoleLogs: response.data.data?.consoleLogs?.length || 0
  };
}

/**
 * Test 7: Authentication Failure
 */
async function testAuthFailure() {
  try {
    await axios.post(
      `${BASE_URL}/api/v1/execute`,
      {
        module: 'browser',
        action: 'inspect',
        params: { url: 'https://example.com' }
      },
      {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        }
      }
    );
    throw new Error('Should have failed with invalid token');
  } catch (error: any) {
    if (error.response?.status === 403 || error.response?.status === 401) {
      return {
        correctlyRejected: true,
        status: error.response.status,
        error: error.response.data.error
      };
    }
    throw error;
  }
}

/**
 * Test 8: Correlation ID Tracking
 */
async function testCorrelationIdTracking() {
  const customRequestId = 'test-correlation-chatgpt-123';

  const response = await axios.post(
    `${BASE_URL}/api/v1/browser/automate`,
    {
      url: 'https://example.com',
      captureConsole: true,
      headless: true,
      timeout: 30000
    },
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Request-ID': customRequestId
      },
      timeout: 45000
    }
  );

  const returnedRequestId = response.headers['x-request-id'];

  return {
    success: response.data.success,
    correlationIdMatches: returnedRequestId === customRequestId,
    sentRequestId: customRequestId,
    receivedRequestId: returnedRequestId
  };
}

/**
 * Main test runner
 */
async function runAllTests() {
  printHeader('🚀 JARVIS ChatGPT Integration Endpoint Tests');

  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log(`🔐 Auth Token: ${AUTH_TOKEN}`);
  console.log('');

  await runTest('Test 1: Health Check (No Auth)', testHealthNoAuth);
  await runTest('Test 2: Health Check (With Auth)', testHealthWithAuth);
  await runTest('Test 3: Browser Module - Console Collection', testBrowserModuleConsole);
  await runTest('Test 4: Browser Module - Network Monitoring', testBrowserModuleNetwork);
  await runTest('Test 5: Direct Browser Endpoint - Screenshot', testDirectBrowserEndpoint);
  await runTest('Test 6: Browser Actions (Type & Click)', testBrowserActions);
  await runTest('Test 7: Authentication Failure Test', testAuthFailure);
  await runTest('Test 8: Correlation ID Tracking', testCorrelationIdTracking);

  // Print summary
  printHeader('📊 Test Results Summary');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.name}`);
        console.log(`     Error: ${r.error}`);
      });
  }

  console.log('\n' + '='.repeat(70) + '\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

export { results };
