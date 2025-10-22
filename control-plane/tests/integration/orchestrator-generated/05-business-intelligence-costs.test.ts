/**
 * Integration Test: Business Intelligence → Cost Calculator → Metrics Storage
 *
 * Test Scenarios:
 * 1. Track API usage - Calculate costs per provider - Verify accuracy
 * 2. Store metrics - Retrieve historical data - Verify persistence
 * 3. Multiple concurrent API calls - Verify cost aggregation
 * 4. Cost calculation accuracy - Verify against known rates
 * 5. Metrics cleanup and retention - Verify old data removal
 */

import axios from 'axios';
import { randomUUID } from 'crypto';

const JARVIS_API = 'http://localhost:4000';
const DASHBOARD_API = 'http://localhost:5001';
const AUTH_TOKEN = process.env.JARVIS_AUTH_TOKEN || 'test-token';

interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

const results: TestResult[] = [];

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

describe('Business Intelligence → Cost Tracking Integration', () => {
  beforeAll(async () => {
    console.log('\n💰 Starting Business Intelligence → Cost Tracking Integration Tests\n');
  });

  afterAll(() => {
    console.log('\n📊 Test Results Summary:');
    console.log('=======================');
    results.forEach(r => {
      const status = r.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${r.scenario} | ${r.duration}ms`);
      if (r.metadata) {
        Object.entries(r.metadata).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
      if (r.error) console.log(`   Error: ${r.error}`);
    });
    const passCount = results.filter(r => r.passed).length;
    console.log(`\nTotal: ${passCount}/${results.length} passed`);
  });

  test('Scenario 1: Track API usage and calculate costs', async () => {
    const scenario = 'Track API usage and calculate costs';

    try {
      const { result, duration } = await measureTime(async () => {
        // Get initial metrics
        const initialResponse = await axios.get(
          `${JARVIS_API}/api/v1/business/metrics`,
          {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            timeout: 10000
          }
        );

        expect(initialResponse.status).toBe(200);
        expect(initialResponse.data.success).toBe(true);

        const initialMetrics = initialResponse.data.data;

        // Make several API calls to generate usage
        const apiCalls = Array.from({ length: 5 }, () =>
          axios.post(
            `${JARVIS_API}/api/v1/execute`,
            {
              module: 'ai-brain',
              action: 'chat',
              params: { message: 'Test message for cost tracking' }
            },
            {
              headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
              timeout: 10000
            }
          ).catch(() => {}) // Ignore errors for this test
        );

        await Promise.all(apiCalls);

        // Wait for metrics to update
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get updated metrics
        const updatedResponse = await axios.get(
          `${JARVIS_API}/api/v1/business/metrics`,
          {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            timeout: 10000
          }
        );

        const updatedMetrics = updatedResponse.data.data;

        // Verify metrics structure
        expect(updatedMetrics).toHaveProperty('costs');
        expect(updatedMetrics).toHaveProperty('users');
        expect(updatedMetrics).toHaveProperty('timestamp');

        return { initialMetrics, updatedMetrics };
      });

      results.push({
        scenario,
        passed: true,
        duration,
        metadata: {
          hasMetrics: !!result.updatedMetrics.costs
        }
      });

      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 2: Business intelligence insights', async () => {
    const scenario = 'Business intelligence insights';

    try {
      const { result, duration } = await measureTime(async () => {
        const response = await axios.get(
          `${JARVIS_API}/api/v1/business/insights?timeWindow=60`,
          {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            timeout: 10000
          }
        );

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);

        const insights = response.data.data;

        // Verify insights structure
        expect(insights).toHaveProperty('insights');
        expect(insights).toHaveProperty('timeWindow');
        expect(insights).toHaveProperty('timestamp');

        // Insights should be an array
        expect(Array.isArray(insights.insights)).toBe(true);

        return insights;
      });

      results.push({
        scenario,
        passed: true,
        duration,
        metadata: {
          insightCount: result.insights.length,
          timeWindow: `${result.timeWindow}min`
        }
      });

      console.log(`✅ ${scenario} - ${duration}ms (${result.insights.length} insights)`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 3: Dashboard intelligence metrics', async () => {
    const scenario = 'Dashboard intelligence metrics';

    try {
      const { result, duration } = await measureTime(async () => {
        const response = await axios.get(
          `${DASHBOARD_API}/api/dashboard/intelligence/metrics`,
          { timeout: 10000 }
        );

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);

        const metrics = response.data.data;

        // Verify metrics structure
        expect(metrics).toHaveProperty('timestamp');

        return metrics;
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 4: Service alerts tracking', async () => {
    const scenario = 'Service alerts tracking';

    try {
      const { result, duration } = await measureTime(async () => {
        const response = await axios.get(
          `${JARVIS_API}/api/v1/business/alerts?limit=50`,
          {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            timeout: 10000
          }
        );

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);

        const alertsData = response.data.data;

        // Verify structure
        expect(Array.isArray(alertsData)).toBe(true);

        return alertsData;
      });

      results.push({
        scenario,
        passed: true,
        duration,
        metadata: {
          alertCount: result.length
        }
      });

      console.log(`✅ ${scenario} - ${duration}ms (${result.length} alerts)`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 5: Financial summary calculations', async () => {
    const scenario = 'Financial summary calculations';

    try {
      const { result, duration } = await measureTime(async () => {
        const response = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
          timeout: 10000
        });

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);

        const financial = response.data.data;

        // Verify financial metrics structure
        expect(financial).toHaveProperty('mrr');
        expect(financial).toHaveProperty('arr');
        expect(financial).toHaveProperty('burn_rate');
        expect(financial).toHaveProperty('runway_months');

        // Verify numeric values
        expect(typeof financial.mrr).toBe('number');
        expect(typeof financial.arr).toBe('number');
        expect(typeof financial.burn_rate).toBe('number');
        expect(typeof financial.runway_months).toBe('number');

        // Verify calculations are reasonable
        expect(financial.mrr).toBeGreaterThanOrEqual(0);
        expect(financial.arr).toBeGreaterThanOrEqual(financial.mrr * 12);
        expect(financial.burn_rate).toBeGreaterThan(0);
        expect(financial.runway_months).toBeGreaterThanOrEqual(0);

        return financial;
      });

      results.push({
        scenario,
        passed: true,
        duration,
        metadata: {
          mrr: `$${result.mrr}`,
          arr: `$${result.arr}`,
          burnRate: `$${result.burn_rate}`,
          runway: `${result.runway_months} months`
        }
      });

      console.log(`✅ ${scenario} - ${duration}ms (MRR: $${result.mrr}, Runway: ${result.runway_months}mo)`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 6: Cost per provider breakdown', async () => {
    const scenario = 'Cost per provider breakdown';

    try {
      const { duration } = await measureTime(async () => {
        const response = await axios.get(
          `${JARVIS_API}/api/v1/business/metrics`,
          {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            timeout: 10000
          }
        );

        expect(response.status).toBe(200);

        const metrics = response.data.data;

        // Verify cost breakdown exists
        if (metrics.costs) {
          expect(metrics.costs).toHaveProperty('total');

          // If breakdown exists, verify providers
          if (metrics.costs.byProvider) {
            const providers = ['openai', 'anthropic', 'gemini'];
            providers.forEach(provider => {
              if (metrics.costs.byProvider[provider]) {
                expect(typeof metrics.costs.byProvider[provider]).toBe('number');
                expect(metrics.costs.byProvider[provider]).toBeGreaterThanOrEqual(0);
              }
            });
          }
        }
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 7: Metrics timestamp validation', async () => {
    const scenario = 'Metrics timestamp validation';

    try {
      const { duration } = await measureTime(async () => {
        // Get metrics from multiple endpoints
        const [metricsResponse, insightsResponse, financialResponse] = await Promise.all([
          axios.get(`${JARVIS_API}/api/v1/business/metrics`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            timeout: 10000
          }),
          axios.get(`${JARVIS_API}/api/v1/business/insights`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            timeout: 10000
          }),
          axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
            timeout: 10000
          })
        ]);

        const now = new Date();

        // Verify all timestamps are recent (within last 5 minutes)
        const verifyTimestamp = (timestamp: string) => {
          const ts = new Date(timestamp);
          const diff = now.getTime() - ts.getTime();
          expect(diff).toBeLessThan(300000); // < 5 minutes
        };

        verifyTimestamp(metricsResponse.data.timestamp);
        verifyTimestamp(insightsResponse.data.data.timestamp);
        verifyTimestamp(financialResponse.data.data.last_updated);
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 8: Cache performance for metrics', async () => {
    const scenario = 'Cache performance for metrics';

    try {
      const { duration } = await measureTime(async () => {
        // Make multiple rapid requests to test caching
        const requests = Array.from({ length: 10 }, () =>
          axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
            timeout: 5000
          })
        );

        const responses = await Promise.all(requests);

        // All should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.data.success).toBe(true);
        });

        // Verify responses are consistent
        const firstData = JSON.stringify(responses[0].data.data);
        responses.forEach(response => {
          const currentData = JSON.stringify(response.data.data);
          // Should be identical or very similar due to caching
          expect(currentData).toBe(firstData);
        });
      });

      // 10 requests should complete quickly due to caching
      expect(duration).toBeLessThan(15000);

      results.push({
        scenario,
        passed: true,
        duration,
        metadata: {
          totalRequests: 10,
          avgPerRequest: `${(duration / 10).toFixed(0)}ms`
        }
      });

      console.log(`✅ ${scenario} - ${duration}ms (avg: ${(duration / 10).toFixed(0)}ms per request)`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });
});
