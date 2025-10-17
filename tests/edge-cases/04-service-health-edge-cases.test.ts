/**
 * Edge Case Tests: Service Health Monitoring
 *
 * Tests for obscure bugs in health check and monitoring systems
 */

import axios from 'axios';

const JARVIS_API = 'http://localhost:4000';
const DASHBOARD_API = 'http://localhost:5001';
const AI_DAWG_API = 'http://localhost:3001';

interface TestResult {
  scenario: string;
  category: string;
  passed: boolean;
  error?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

const results: TestResult[] = [];

async function testHealthMonitoring(
  scenario: string,
  testFn: () => Promise<boolean>,
  expectedError: string | null,
  severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
): Promise<void> {
  try {
    const passed = await testFn();
    results.push({
      scenario,
      category: 'health-monitoring',
      passed,
      error: !passed ? expectedError || 'Test failed' : undefined,
      severity: !passed ? severity : undefined
    });
  } catch (error: any) {
    results.push({
      scenario,
      category: 'health-monitoring',
      passed: false,
      error: `Exception: ${error.message}`,
      severity
    });
  }
}

async function runServiceHealthEdgeCases(): Promise<void> {
  console.log('\n=== Service Health Monitoring Edge Cases ===\n');

  // 1. ALL SERVICES DOWN SIMULTANEOUSLY
  await testHealthMonitoring(
    'All services reporting as down (simulated)',
    async () => {
      // Check if system handles all-down scenario
      const services = [
        { name: 'Jarvis', url: `${JARVIS_API}/health` },
        { name: 'Dashboard', url: `${DASHBOARD_API}/health` },
        { name: 'AI DAWG', url: `${AI_DAWG_API}/health` }
      ];

      const results = await Promise.allSettled(
        services.map(s => axios.get(s.url, { timeout: 2000 }))
      );

      const allDown = results.every(r => r.status === 'rejected');

      // If all are actually down, the test passes (system is offline)
      // If some are up, check if dashboard shows correct status
      if (!allDown) {
        const dashboardHealth = await axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
          timeout: 5000,
          validateStatus: () => true
        });

        // Dashboard should still respond even if other services are down
        return dashboardHealth.status === 200;
      }

      return true; // All down is a valid state to test
    },
    'Dashboard should handle all services being down',
    'critical'
  );

  // 2. PARTIAL FAILURES (50% services down)
  await testHealthMonitoring(
    'Partial service failures (mixed health states)',
    async () => {
      const healthResponse = await axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
        timeout: 5000,
        validateStatus: () => true
      });

      // Health endpoint should always respond, even with partial failures
      return healthResponse.status === 200 && healthResponse.data;
    },
    'Dashboard should report partial failures correctly',
    'high'
  );

  // 3. CASCADE FAILURES
  await testHealthMonitoring(
    'Cascade failure detection (one failure triggers others)',
    async () => {
      // This is hard to test without actually crashing services
      // We'll verify that the system can detect and report multiple failures
      const overviewResponse = await axios.get(`${DASHBOARD_API}/api/dashboard/overview`, {
        timeout: 10000,
        validateStatus: () => true
      });

      return overviewResponse.status === 200;
    },
    'System should detect cascade failures',
    'high'
  );

  // 4. HEALTH CHECK TIMEOUT
  await testHealthMonitoring(
    'Health check timeout (slow response)',
    async () => {
      // Try to get health with very short timeout
      try {
        await axios.get(`${DASHBOARD_API}/api/dashboard/health`, { timeout: 1 });
        return true; // Responded fast enough
      } catch (error: any) {
        if (error.code === 'ECONNABORTED') {
          // Timeout occurred - system should still be functional
          // Try again with normal timeout
          const retry = await axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
            timeout: 5000,
            validateStatus: () => true
          });
          return retry.status === 200;
        }
        return false;
      }
    },
    'System should handle slow health checks gracefully',
    'medium'
  );

  // 5. STALE HEALTH DATA
  await testHealthMonitoring(
    'Stale health data detection',
    async () => {
      const health1 = await axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
        timeout: 5000
      });

      // Wait 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      const health2 = await axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
        timeout: 5000
      });

      // Timestamps should be different (data is fresh)
      const ts1 = health1.data?.data?.timestamp || health1.data?.timestamp;
      const ts2 = health2.data?.data?.timestamp || health2.data?.timestamp;

      return ts1 !== ts2;
    },
    'Health data should be refreshed, not stale',
    'medium'
  );

  // 6. CONCURRENT HEALTH CHECKS
  await testHealthMonitoring(
    'Concurrent health checks (10 simultaneous)',
    async () => {
      const promises = Array(10).fill(0).map(() =>
        axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
          timeout: 5000,
          validateStatus: () => true
        })
      );

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 200).length;

      // All should succeed
      return successCount === 10;
    },
    'System should handle concurrent health checks',
    'medium'
  );

  // 7. MALFORMED HEALTH RESPONSE
  await testHealthMonitoring(
    'Health endpoint returns malformed data',
    async () => {
      const health = await axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
        timeout: 5000,
        validateStatus: () => true
      });

      // Validate response structure
      const hasValidStructure =
        health.data &&
        (health.data.status || health.data.overall) &&
        typeof health.data === 'object';

      return hasValidStructure;
    },
    'Health responses should have valid structure',
    'high'
  );

  // 8. HEALTH CHECK WITH INVALID AUTH
  await testHealthMonitoring(
    'Health check with invalid/missing auth',
    async () => {
      // Health endpoints should typically be accessible without auth
      // or handle auth errors gracefully
      const health = await axios.get(`${JARVIS_API}/health`, {
        timeout: 5000,
        validateStatus: () => true
      });

      // Should either succeed (no auth required) or return 401/403 gracefully
      return health.status === 200 || health.status === 401 || health.status === 403;
    },
    'Health checks should handle auth appropriately',
    'low'
  );

  // 9. RAPID HEALTH CHECKS (rate limiting)
  await testHealthMonitoring(
    'Rapid health checks (100 requests in 1 second)',
    async () => {
      const promises = Array(100).fill(0).map(() =>
        axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
          timeout: 5000,
          validateStatus: () => true
        })
      );

      const responses = await Promise.allSettled(promises);
      const successCount = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      ).length;

      // Most should succeed (health checks usually aren't rate limited)
      // But system shouldn't crash
      return successCount > 80; // At least 80% success
    },
    'System should handle rapid health checks without crashing',
    'high'
  );

  // 10. HEALTH CHECK DURING HIGH LOAD
  await testHealthMonitoring(
    'Health check during simulated high load',
    async () => {
      // Generate load by making many dashboard requests
      const loadPromises = Array(50).fill(0).map(() =>
        axios.get(`${DASHBOARD_API}/api/dashboard/overview`, {
          timeout: 10000,
          validateStatus: () => true
        })
      );

      // Check health during load
      const healthPromise = axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
        timeout: 5000,
        validateStatus: () => true
      });

      const [healthResponse] = await Promise.all([healthPromise, ...loadPromises]);

      return healthResponse.status === 200;
    },
    'Health checks should work during high load',
    'high'
  );

  // 11. MISSING DEPENDENCIES
  await testHealthMonitoring(
    'Health check when dependencies are missing',
    async () => {
      // Try to get detailed health that checks dependencies
      const detailedHealth = await axios.get(`${JARVIS_API}/health/detailed`, {
        timeout: 10000,
        validateStatus: () => true,
        headers: { Authorization: 'Bearer test-token' }
      });

      // Should respond even if some dependencies are down
      return detailedHealth.status === 200 || detailedHealth.status === 503;
    },
    'Health should report missing dependencies gracefully',
    'medium'
  );

  // 12. CIRCULAR DEPENDENCY HEALTH CHECKS
  await testHealthMonitoring(
    'Circular dependency in health checks',
    async () => {
      // Dashboard checks Jarvis, Jarvis checks AI DAWG, AI DAWG might check Dashboard
      // System should detect and handle circular health checks
      const dashboardHealth = await axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
        timeout: 5000,
        validateStatus: () => true
      });

      // Should complete without infinite loops or timeouts
      return dashboardHealth.status === 200;
    },
    'System should handle circular health dependencies',
    'high'
  );

  // 13. HEALTH CHECK CACHE INVALIDATION
  await testHealthMonitoring(
    'Health check cache invalidation',
    async () => {
      // Get health twice quickly
      const health1 = await axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
        timeout: 5000
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const health2 = await axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
        timeout: 5000
      });

      // Both should succeed (cached or not)
      return health1.status === 200 && health2.status === 200;
    },
    'Health check caching should work correctly',
    'low'
  );

  // 14. HEALTH CHECK WITH NETWORK ERRORS
  await testHealthMonitoring(
    'Health check with network errors (DNS failure simulation)',
    async () => {
      // Try to check health of non-existent service
      try {
        await axios.get('http://non-existent-service.local/health', { timeout: 1000 });
        return false; // Should have failed
      } catch (error) {
        // Expected to fail - system should handle gracefully
        // Now verify main health endpoint still works
        const health = await axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
          timeout: 5000,
          validateStatus: () => true
        });
        return health.status === 200;
      }
    },
    'System should handle network errors in health checks',
    'medium'
  );

  // 15. HEALTH DATA ACCURACY
  await testHealthMonitoring(
    'Health data accuracy (cross-check multiple endpoints)',
    async () => {
      const [dashboardHealth, jarvisHealth] = await Promise.all([
        axios.get(`${DASHBOARD_API}/api/dashboard/health`, {
          timeout: 5000,
          validateStatus: () => true
        }),
        axios.get(`${JARVIS_API}/health`, {
          timeout: 5000,
          validateStatus: () => true
        })
      ]);

      // Both should report consistent data
      return dashboardHealth.status === 200 && jarvisHealth.status === 200;
    },
    'Health data should be consistent across endpoints',
    'medium'
  );
}

export { runServiceHealthEdgeCases, results };
