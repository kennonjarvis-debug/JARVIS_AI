/**
 * Edge Case Tests: Cost Tracking & Financial Metrics
 *
 * Tests for obscure bugs in cost tracking and financial calculations
 */

import axios from 'axios';

const JARVIS_API = 'http://localhost:4000';
const DASHBOARD_API = 'http://localhost:5001';

interface TestResult {
  scenario: string;
  category: string;
  passed: boolean;
  error?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

const results: TestResult[] = [];

async function testCostTracking(
  scenario: string,
  testFn: () => Promise<boolean>,
  expectedError: string | null,
  severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
): Promise<void> {
  try {
    const passed = await testFn();
    results.push({
      scenario,
      category: 'cost-tracking',
      passed,
      error: !passed ? expectedError || 'Test failed' : undefined,
      severity: !passed ? severity : undefined
    });
  } catch (error: any) {
    results.push({
      scenario,
      category: 'cost-tracking',
      passed: false,
      error: `Exception: ${error.message}`,
      severity
    });
  }
}

async function runCostTrackingEdgeCases(): Promise<void> {
  console.log('\n=== Cost Tracking Edge Cases ===\n');

  // 1. NEGATIVE COSTS
  await testCostTracking(
    'Negative cost values',
    async () => {
      // Check if system allows/handles negative costs
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;

      // Check for negative values
      const hasNegative = Object.values(costs || {}).some(
        v => typeof v === 'number' && v < 0
      );

      // Negative costs should either be rejected or properly handled (refunds)
      return !hasNegative || costs.burn_rate >= 0; // burn_rate should always be positive
    },
    'Negative costs detected in financial metrics',
    'high'
  );

  // 2. EXTREME VALUES - BILLIONS
  await testCostTracking(
    'Extreme cost values (billions)',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;

      // Check if values are reasonable (not overflowing to billions)
      const mrr = costs?.mrr || 0;
      const arr = costs?.arr || 0;

      // For a startup, anything over $1B ARR is unrealistic and likely a bug
      return arr < 1000000000;
    },
    'Cost values should be reasonable, not billions',
    'medium'
  );

  // 3. EXTREME DECIMALS (10+ places)
  await testCostTracking(
    'Extreme decimal precision (10+ places)',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;

      // Check decimal precision
      const checkPrecision = (value: number): boolean => {
        const str = value.toString();
        const decimalPart = str.split('.')[1];
        return !decimalPart || decimalPart.length <= 2; // Max 2 decimal places for money
      };

      const revenue = costs?.revenue_today || 0;
      const cac = costs?.cac || 0;
      const ltv = costs?.ltv || 0;

      return checkPrecision(revenue) && checkPrecision(cac) && checkPrecision(ltv);
    },
    'Financial values should have at most 2 decimal places',
    'low'
  );

  // 4. DIVISION BY ZERO IN AVERAGES
  await testCostTracking(
    'Division by zero in cost averages',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;

      // Check for NaN or Infinity in calculations
      const values = Object.values(costs || {});
      const hasInvalidValues = values.some(
        v => typeof v === 'number' && (!isFinite(v) || isNaN(v))
      );

      return !hasInvalidValues;
    },
    'Cost calculations should not produce NaN or Infinity',
    'critical'
  );

  // 5. NULL/UNDEFINED COST ENTRIES
  await testCostTracking(
    'Null or undefined cost entries',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;

      // Check for null/undefined in expected fields
      const requiredFields = ['mrr', 'arr', 'burn_rate', 'runway_months'];
      const hasNullUndefined = requiredFields.some(
        field => costs?.[field] === null || costs?.[field] === undefined
      );

      return !hasNullUndefined;
    },
    'Required cost fields should not be null/undefined',
    'high'
  );

  // 6. COST OVERFLOW (JavaScript MAX_SAFE_INTEGER)
  await testCostTracking(
    'Cost overflow (exceeds MAX_SAFE_INTEGER)',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;

      // Check if any value exceeds MAX_SAFE_INTEGER
      const values = Object.values(costs || {});
      const hasOverflow = values.some(
        v => typeof v === 'number' && Math.abs(v) > Number.MAX_SAFE_INTEGER
      );

      return !hasOverflow;
    },
    'Costs should not exceed MAX_SAFE_INTEGER',
    'medium'
  );

  // 7. COST CALCULATION CONSISTENCY
  await testCostTracking(
    'Cost calculation consistency (ARR = MRR * 12)',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;
      const mrr = costs?.mrr || 0;
      const arr = costs?.arr || 0;

      // ARR should equal MRR * 12 (with small tolerance for rounding)
      const expectedArr = mrr * 12;
      const tolerance = 1; // $1 tolerance

      return Math.abs(arr - expectedArr) <= tolerance;
    },
    'ARR should equal MRR * 12',
    'medium'
  );

  // 8. RUNWAY CALCULATION (negative or zero)
  await testCostTracking(
    'Runway calculation with zero burn rate',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;
      const burnRate = costs?.burn_rate || 0;
      const runwayMonths = costs?.runway_months || 0;

      // If burn rate is 0, runway should be Infinity or very high
      // If burn rate > 0, runway should be positive
      if (burnRate === 0) {
        return runwayMonths === Infinity || runwayMonths > 1000;
      }

      return runwayMonths > 0 && isFinite(runwayMonths);
    },
    'Runway calculation should handle zero burn rate',
    'high'
  );

  // 9. CONCURRENT COST UPDATES
  await testCostTracking(
    'Concurrent cost metric requests (10 simultaneous)',
    async () => {
      const promises = Array(10).fill(0).map(() =>
        axios.get(`${DASHBOARD_API}/api/dashboard/financial`, { timeout: 5000 })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      const allSucceeded = responses.every(r => r.status === 200);

      // Results should be consistent
      const firstMRR = responses[0].data?.data?.mrr;
      const allSameMRR = responses.every(r => r.data?.data?.mrr === firstMRR);

      return allSucceeded && allSameMRR;
    },
    'Concurrent cost requests should return consistent data',
    'medium'
  );

  // 10. COST CACHING BEHAVIOR
  await testCostTracking(
    'Cost data caching (stale data detection)',
    async () => {
      const cost1 = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      // Wait 6 seconds (longer than cache TTL)
      await new Promise(resolve => setTimeout(resolve, 6000));

      const cost2 = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      // Timestamps should be different (or data refreshed)
      const ts1 = cost1.data?.data?.last_updated;
      const ts2 = cost2.data?.data?.last_updated;

      return ts1 !== ts2 || !ts1; // Different timestamps or no timestamp
    },
    'Cost data should refresh after cache TTL',
    'low'
  );

  // 11. PERCENTAGE CALCULATIONS
  await testCostTracking(
    'Percentage calculations (0-100 range)',
    async () => {
      const overview = await axios.get(`${DASHBOARD_API}/api/dashboard/overview`, {
        timeout: 10000
      });

      const instances = overview.data?.data?.instances;
      const completionPercent = instances?.metrics?.overall_completion_percent;

      // Completion percentage should be 0-100
      return (
        completionPercent === undefined ||
        (completionPercent >= 0 && completionPercent <= 100)
      );
    },
    'Percentages should be in 0-100 range',
    'medium'
  );

  // 12. COST AGGREGATION
  await testCostTracking(
    'Cost aggregation accuracy',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;

      // Check if monthly revenue = daily revenue * 30 (approx)
      const dailyRevenue = costs?.revenue_today || 0;
      const monthlyRevenue = costs?.revenue_this_month || 0;

      if (dailyRevenue === 0) return true; // Can't check if no revenue

      const expectedMonthly = dailyRevenue * 30;
      const tolerance = dailyRevenue * 5; // 5 days tolerance

      return Math.abs(monthlyRevenue - expectedMonthly) <= tolerance;
    },
    'Monthly revenue should equal daily * 30 (approx)',
    'low'
  );

  // 13. CURRENCY FORMATTING
  await testCostTracking(
    'Currency values are valid numbers',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;

      // All cost values should be valid numbers (not strings with $)
      const costValues = [
        costs?.mrr,
        costs?.arr,
        costs?.revenue_today,
        costs?.revenue_this_month,
        costs?.cac,
        costs?.ltv,
        costs?.burn_rate
      ];

      return costValues.every(v => typeof v === 'number' || v === undefined);
    },
    'Cost values should be numbers, not formatted strings',
    'medium'
  );

  // 14. LTV/CAC RATIO
  await testCostTracking(
    'LTV/CAC ratio sanity check',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;
      const ltv = costs?.ltv || 0;
      const cac = costs?.cac || 0;

      if (cac === 0) return true; // Can't calculate ratio

      const ratio = ltv / cac;

      // Healthy ratio is 3:1 or better, but should be finite and positive
      return isFinite(ratio) && ratio > 0;
    },
    'LTV/CAC ratio should be positive and finite',
    'medium'
  );

  // 15. ZERO CUSTOMER HANDLING
  await testCostTracking(
    'Cost calculations with zero customers',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;
      const customers = costs?.customers || 0;

      if (customers === 0) {
        // With 0 customers, MRR should be 0
        const mrr = costs?.mrr || 0;
        return mrr === 0;
      }

      return true; // Has customers, calculation should work
    },
    'Zero customers should result in zero MRR',
    'high'
  );

  // 16. FINANCIAL DATA CONSISTENCY OVER TIME
  await testCostTracking(
    'Financial metrics consistency (multiple requests)',
    async () => {
      const requests = Array(5).fill(0).map(async () => {
        const response = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
          timeout: 5000
        });
        return response.data?.data;
      });

      const results = await Promise.all(requests);

      // MRR should be the same across all requests (within 1 second)
      const firstMRR = results[0]?.mrr;
      const allSame = results.every(r => r?.mrr === firstMRR);

      return allSame;
    },
    'Financial metrics should be consistent across requests',
    'low'
  );

  // 17. MISSING CALCULATION SOURCE
  await testCostTracking(
    'Financial data includes calculation source',
    async () => {
      const financial = await axios.get(`${DASHBOARD_API}/api/dashboard/financial`, {
        timeout: 5000
      });

      const costs = financial.data?.data;

      // Should indicate whether using real metrics or baseline
      return (
        costs?.calculation_source === 'real_metrics' ||
        costs?.calculation_source === 'baseline'
      );
    },
    'Financial data should include calculation source',
    'low'
  );
}

export { runCostTrackingEdgeCases, results };
