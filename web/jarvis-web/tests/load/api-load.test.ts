import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

/**
 * API Load Testing with k6
 * Tests API endpoints under various load conditions
 * Target: 10,000 requests/second, 5,000 concurrent users
 */

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const requestCounter = new Counter('requests_total');

// Test configuration
export const options = {
  stages: [
    // Warm up
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '3m', target: 500 },    // Ramp up to 500 users
    { duration: '5m', target: 1000 },   // Ramp up to 1,000 users

    // Steady state
    { duration: '10m', target: 2000 },  // Maintain 2,000 users
    { duration: '10m', target: 5000 },  // Peak load: 5,000 users

    // Stress test
    { duration: '5m', target: 7500 },   // Beyond target: 7,500 users
    { duration: '3m', target: 10000 },  // Maximum stress: 10,000 users

    // Cool down
    { duration: '3m', target: 1000 },   // Ramp down
    { duration: '2m', target: 0 },      // Complete shutdown
  ],

  thresholds: {
    // HTTP errors should be less than 1%
    'errors': ['rate<0.01'],

    // 95% of requests should be below 500ms
    'http_req_duration': ['p(95)<500'],

    // 99% of requests should be below 1000ms
    'http_req_duration': ['p(99)<1000'],

    // Average response time should be below 200ms
    'http_req_duration': ['avg<200'],

    // Request rate should exceed 10,000/s at peak
    'http_reqs': ['rate>10000'],
  },

  ext: {
    loadimpact: {
      projectID: parseInt(__ENV.K6_PROJECT_ID || '0'),
      name: 'Jarvis API Load Test'
    }
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Test data
const testUsers = JSON.parse(open('./test-data/users.json') || '[]');
const testObservatories = JSON.parse(open('./test-data/observatories.json') || '[]');

export function setup() {
  console.log('🚀 Starting API load test...');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Peak Users: 10,000`);
  console.log(`   Target RPS: 10,000`);

  // Authenticate and get token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'loadtest@example.com',
    password: 'LoadTest123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  return {
    token: loginRes.json('token') || API_TOKEN,
    baseUrl: BASE_URL
  };
}

export default function(data) {
  const { token, baseUrl } = data;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  group('Authentication Endpoints', () => {
    // Login
    const loginRes = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
      email: `user-${__VU}@example.com`,
      password: 'TestPassword123!'
    }), { headers: { 'Content-Type': 'application/json' } });

    check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login response time < 200ms': (r) => r.timings.duration < 200,
    });

    apiDuration.add(loginRes.timings.duration);
    requestCounter.add(1);
    errorRate.add(loginRes.status !== 200);

    sleep(1);
  });

  group('Observatory Endpoints', () => {
    // List observatories
    const listRes = http.get(`${baseUrl}/api/observatories`, { headers });

    check(listRes, {
      'list status is 200': (r) => r.status === 200,
      'list has data': (r) => r.json('data') !== null,
      'list response time < 300ms': (r) => r.timings.duration < 300,
    });

    apiDuration.add(listRes.timings.duration);
    requestCounter.add(1);
    errorRate.add(listRes.status !== 200);

    sleep(0.5);

    // Get observatory details
    if (listRes.json('data.length') > 0) {
      const observatoryId = listRes.json('data.0.id');
      const detailRes = http.get(`${baseUrl}/api/observatories/${observatoryId}`, { headers });

      check(detailRes, {
        'detail status is 200': (r) => r.status === 200,
        'detail has metrics': (r) => r.json('metrics') !== null,
        'detail response time < 200ms': (r) => r.timings.duration < 200,
      });

      apiDuration.add(detailRes.timings.duration);
      requestCounter.add(1);
      errorRate.add(detailRes.status !== 200);
    }

    sleep(1);
  });

  group('Metrics Endpoints', () => {
    // Get metrics
    const metricsRes = http.get(`${baseUrl}/api/metrics?timeRange=1h`, { headers });

    check(metricsRes, {
      'metrics status is 200': (r) => r.status === 200,
      'metrics has data points': (r) => r.json('dataPoints.length') > 0,
      'metrics response time < 400ms': (r) => r.timings.duration < 400,
    });

    apiDuration.add(metricsRes.timings.duration);
    requestCounter.add(1);
    errorRate.add(metricsRes.status !== 200);

    sleep(0.5);

    // Post metric data
    const postMetricRes = http.post(`${baseUrl}/api/metrics`, JSON.stringify({
      observatoryId: 'test-observatory',
      metricName: 'cpu_usage',
      value: Math.random() * 100,
      timestamp: Date.now()
    }), { headers });

    check(postMetricRes, {
      'post metric status is 201': (r) => r.status === 201,
      'post metric response time < 150ms': (r) => r.timings.duration < 150,
    });

    apiDuration.add(postMetricRes.timings.duration);
    requestCounter.add(1);
    errorRate.add(postMetricRes.status !== 201);

    sleep(1);
  });

  group('AI Endpoints', () => {
    // AI chat
    const chatRes = http.post(`${baseUrl}/api/ai/chat`, JSON.stringify({
      message: 'What are my top metrics?',
      conversationId: `conv-${__VU}`
    }), { headers });

    check(chatRes, {
      'chat status is 200': (r) => r.status === 200,
      'chat has response': (r) => r.json('response') !== null,
      'chat response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    apiDuration.add(chatRes.timings.duration);
    requestCounter.add(1);
    errorRate.add(chatRes.status !== 200);

    sleep(2);

    // AI insights
    const insightsRes = http.get(`${baseUrl}/api/ai/insights?observatoryId=test`, { headers });

    check(insightsRes, {
      'insights status is 200': (r) => r.status === 200,
      'insights response time < 1500ms': (r) => r.timings.duration < 1500,
    });

    apiDuration.add(insightsRes.timings.duration);
    requestCounter.add(1);
    errorRate.add(insightsRes.status !== 200);

    sleep(1);
  });

  group('Integration Endpoints', () => {
    // List integrations
    const integrationsRes = http.get(`${baseUrl}/api/integrations`, { headers });

    check(integrationsRes, {
      'integrations status is 200': (r) => r.status === 200,
      'integrations response time < 300ms': (r) => r.timings.duration < 300,
    });

    apiDuration.add(integrationsRes.timings.duration);
    requestCounter.add(1);
    errorRate.add(integrationsRes.status !== 200);

    sleep(0.5);
  });

  group('Billing Endpoints', () => {
    // Get subscription
    const subscriptionRes = http.get(`${baseUrl}/api/billing/subscription`, { headers });

    check(subscriptionRes, {
      'subscription status is 200': (r) => r.status === 200,
      'subscription response time < 200ms': (r) => r.timings.duration < 200,
    });

    apiDuration.add(subscriptionRes.timings.duration);
    requestCounter.add(1);
    errorRate.add(subscriptionRes.status !== 200);

    sleep(0.5);

    // Get usage
    const usageRes = http.get(`${baseUrl}/api/billing/usage`, { headers });

    check(usageRes, {
      'usage status is 200': (r) => r.status === 200,
      'usage response time < 250ms': (r) => r.timings.duration < 250,
    });

    apiDuration.add(usageRes.timings.duration);
    requestCounter.add(1);
    errorRate.add(usageRes.status !== 200);

    sleep(1);
  });

  group('Search Endpoints', () => {
    // Search
    const searchRes = http.get(`${baseUrl}/api/search?q=metrics`, { headers });

    check(searchRes, {
      'search status is 200': (r) => r.status === 200,
      'search has results': (r) => r.json('results') !== null,
      'search response time < 500ms': (r) => r.timings.duration < 500,
    });

    apiDuration.add(searchRes.timings.duration);
    requestCounter.add(1);
    errorRate.add(searchRes.status !== 200);

    sleep(1);
  });

  // Random think time between iterations
  sleep(Math.random() * 3);
}

export function teardown(data) {
  console.log('✅ API load test complete');
}

export function handleSummary(data) {
  return {
    'api-load-test-summary.html': htmlReport(data),
    'api-load-test-summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;

  let summary = '\n';
  summary += `${indent}📊 Load Test Summary\n`;
  summary += `${indent}${'='.repeat(50)}\n`;
  summary += `${indent}Total Requests: ${data.metrics.requests_total.values.count}\n`;
  summary += `${indent}Failed Requests: ${data.metrics.http_req_failed.values.passes}\n`;
  summary += `${indent}Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `${indent}${'='.repeat(50)}\n`;

  return summary;
}
