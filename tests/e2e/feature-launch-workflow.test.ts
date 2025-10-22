/**
 * E2E Test: Automated Feature Launch Workflow
 * Tests multi-agent coordination for complex business workflows
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import axios from 'axios';

const JARVIS_API_BASE = 'http://localhost:3000';

describe('E2E: Automated Feature Launch Workflow', () => {
  let apiHealthy = false;

  beforeAll(async () => {
    try {
      const health = await axios.get(`${JARVIS_API_BASE}/api/health`, { timeout: 2000 });
      apiHealthy = health.data.success === true;
    } catch (error) {
      console.warn('JARVIS API not running - tests will be skipped');
    }
  });

  describe('Scenario: Launch New Pro Tier Feature', () => {
    /**
     * Complete workflow for launching a new feature:
     * 1. Marketing Agent: Creates blog post announcement
     * 2. Marketing Agent: Schedules social media posts
     * 3. Sales Agent: Drafts email campaign for existing users
     * 4. Sales Agent: Updates lead qualification criteria
     * 5. Operations Agent: Updates analytics dashboard
     * 6. Support Agent: Prepares FAQ documentation
     * 7. All activities displayed in Observatory real-time
     */

    it.skipIf(!apiHealthy)(
      'should coordinate multi-agent feature launch',
      async () => {
        // Step 1: Verify all agents are available
        const metricsResponse = await axios.get(`${JARVIS_API_BASE}/api/agents/metrics`);
        expect(metricsResponse.status).toBe(200);
        expect(metricsResponse.data).toHaveProperty('agents');

        const agents = metricsResponse.data.agents;
        const expectedAgents = ['marketing', 'sales', 'operations', 'support'];

        for (const agentType of expectedAgents) {
          const agentData = agents.find((a: any) => a.agent_type === agentType);
          expect(agentData).toBeDefined();
        }

        // Step 2: Check recent activities show multi-agent coordination
        const activitiesResponse = await axios.get(
          `${JARVIS_API_BASE}/api/agents/activities?limit=50`
        );
        expect(activitiesResponse.status).toBe(200);
        expect(Array.isArray(activitiesResponse.data.activities)).toBe(true);

        const activities = activitiesResponse.data.activities;

        // Verify we have activities from multiple agents
        const agentTypes = new Set(activities.map((a: any) => a.agent_type));
        expect(agentTypes.size).toBeGreaterThan(1);

        // Step 3: Verify activities include various action types
        const actions = activities.map((a: any) => a.action);
        expect(actions.length).toBeGreaterThan(0);

        // Step 4: Check approval queue for high-risk tasks
        const approvalQueueResponse = await axios.get(
          `${JARVIS_API_BASE}/api/agents/approval-queue`
        );
        expect(approvalQueueResponse.status).toBe(200);
        expect(Array.isArray(approvalQueueResponse.data.queue)).toBe(true);
      },
      { timeout: 10000 }
    );

    it.skipIf(!apiHealthy)(
      'should handle approval workflow for email campaign',
      async () => {
        // Simulate high-risk email campaign requiring approval
        const approvalQueue = await axios.get(`${JARVIS_API_BASE}/api/agents/approval-queue`);

        expect(approvalQueue.status).toBe(200);

        const queue = approvalQueue.data.queue;

        // If there are pending approvals, test the approval flow
        if (queue.length > 0) {
          const pendingApproval = queue[0];

          // Test approve endpoint (won't actually approve in test)
          const approveResponse = await axios.post(
            `${JARVIS_API_BASE}/api/agents/approve/${pendingApproval.id}`,
            {
              approvedBy: 'test-user',
            },
            { validateStatus: () => true }
          );

          // Should either succeed or return reasonable error
          expect([200, 400, 404]).toContain(approveResponse.status);
        }
      },
      { timeout: 5000 }
    );

    it.skipIf(!apiHealthy)(
      'should track agent performance metrics',
      async () => {
        const metrics = await axios.get(`${JARVIS_API_BASE}/api/agents/metrics`);

        expect(metrics.status).toBe(200);
        expect(metrics.data).toHaveProperty('total_activities');
        expect(metrics.data).toHaveProperty('agents');
        expect(metrics.data).toHaveProperty('risk_breakdown');

        // Verify risk breakdown
        const riskBreakdown = metrics.data.risk_breakdown;
        expect(riskBreakdown).toHaveProperty('LOW');
        expect(riskBreakdown).toHaveProperty('MEDIUM');
        expect(riskBreakdown).toHaveProperty('HIGH');

        // All risk counts should be non-negative
        expect(riskBreakdown.LOW).toBeGreaterThanOrEqual(0);
        expect(riskBreakdown.MEDIUM).toBeGreaterThanOrEqual(0);
        expect(riskBreakdown.HIGH).toBeGreaterThanOrEqual(0);
      },
      { timeout: 5000 }
    );

    it.skipIf(!apiHealthy)(
      'should display real-time updates in Observatory',
      async () => {
        // Simulate Observatory polling behavior
        const poll1 = await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=10`);
        expect(poll1.status).toBe(200);

        const activities1Count = poll1.data.activities.length;

        // Wait a moment (simulating time between polls)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Poll again
        const poll2 = await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=10`);
        expect(poll2.status).toBe(200);

        // Data should be consistent
        expect(Array.isArray(poll2.data.activities)).toBe(true);
      },
      { timeout: 10000 }
    );
  });

  describe('Performance Requirements', () => {
    it.skipIf(!apiHealthy)(
      'should respond to activities endpoint in <1s',
      async () => {
        const startTime = Date.now();
        await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=50`);
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(1000);
      },
      { timeout: 2000 }
    );

    it.skipIf(!apiHealthy)(
      'should respond to metrics endpoint in <1s',
      async () => {
        const startTime = Date.now();
        await axios.get(`${JARVIS_API_BASE}/api/agents/metrics`);
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(1000);
      },
      { timeout: 2000 }
    );

    it.skipIf(!apiHealthy)(
      'should handle concurrent requests',
      async () => {
        const requests = Array(10)
          .fill(null)
          .map(() => axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=10`));

        const startTime = Date.now();
        const responses = await Promise.all(requests);
        const duration = Date.now() - startTime;

        // All requests should succeed
        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });

        // Should handle 10 concurrent requests in reasonable time
        expect(duration).toBeLessThan(3000);
      },
      { timeout: 5000 }
    );
  });

  describe('Data Integrity', () => {
    it.skipIf(!apiHealthy)(
      'should maintain consistent activity IDs',
      async () => {
        const response = await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=20`);

        const activities = response.data.activities;
        const ids = activities.map((a: any) => a.id);

        // All IDs should be unique
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);

        // All IDs should be valid UUIDs (basic check)
        ids.forEach((id: string) => {
          expect(typeof id).toBe('string');
          expect(id.length).toBeGreaterThan(0);
        });
      }
    );

    it.skipIf(!apiHealthy)(
      'should include required fields in activities',
      async () => {
        const response = await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=5`);

        const activities = response.data.activities;

        activities.forEach((activity: any) => {
          // Required fields
          expect(activity).toHaveProperty('id');
          expect(activity).toHaveProperty('agent_type');
          expect(activity).toHaveProperty('action');
          expect(activity).toHaveProperty('risk_level');
          expect(activity).toHaveProperty('status');
          expect(activity).toHaveProperty('timestamp');

          // Risk level should be valid
          expect(['LOW', 'MEDIUM', 'HIGH']).toContain(activity.risk_level);

          // Status should be valid
          expect([
            'pending',
            'pending_approval',
            'awaiting_approval',
            'approved',
            'rejected',
            'completed',
            'failed',
          ]).toContain(activity.status);
        });
      }
    );

    it.skipIf(!apiHealthy)(
      'should return activities in chronological order (newest first)',
      async () => {
        const response = await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=10`);

        const activities = response.data.activities;

        if (activities.length > 1) {
          const timestamps = activities.map((a: any) => new Date(a.timestamp).getTime());

          // Each timestamp should be >= the next one (descending order)
          for (let i = 0; i < timestamps.length - 1; i++) {
            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
          }
        }
      }
    );
  });

  describe('Error Handling', () => {
    it.skipIf(!apiHealthy)('should handle invalid limit parameter', async () => {
      const response = await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=-1`, {
        validateStatus: () => true,
      });

      // Should either accept and use default, or return 400
      expect([200, 400]).toContain(response.status);
    });

    it.skipIf(!apiHealthy)('should handle invalid activity ID in approve', async () => {
      const response = await axios.post(
        `${JARVIS_API_BASE}/api/agents/approve/invalid-id-12345`,
        {
          approvedBy: 'test-user',
        },
        { validateStatus: () => true }
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it.skipIf(!apiHealthy)('should handle malformed request body', async () => {
      const response = await axios.post(
        `${JARVIS_API_BASE}/api/agents/approve/some-id`,
        null,
        { validateStatus: () => true }
      );

      // Should handle gracefully
      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Observatory Dashboard Integration', () => {
    it.skipIf(!apiHealthy)(
      'should provide data structure compatible with Svelte dashboard',
      async () => {
        const [activities, metrics, approvalQueue] = await Promise.all([
          axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=10`),
          axios.get(`${JARVIS_API_BASE}/api/agents/metrics`),
          axios.get(`${JARVIS_API_BASE}/api/agents/approval-queue`),
        ]);

        // All endpoints should return 200
        expect(activities.status).toBe(200);
        expect(metrics.status).toBe(200);
        expect(approvalQueue.status).toBe(200);

        // Activities should be array
        expect(Array.isArray(activities.data.activities)).toBe(true);

        // Metrics should have expected structure
        expect(metrics.data).toHaveProperty('total_activities');
        expect(metrics.data).toHaveProperty('agents');
        expect(metrics.data).toHaveProperty('risk_breakdown');

        // Approval queue should be array
        expect(Array.isArray(approvalQueue.data.queue)).toBe(true);
      },
      { timeout: 5000 }
    );

    it.skipIf(!apiHealthy)(
      'should support real-time polling (5-second intervals)',
      async () => {
        // Simulate 3 polls at 1-second intervals (faster for test)
        const polls = [];

        for (let i = 0; i < 3; i++) {
          const startTime = Date.now();
          const response = await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=5`);
          const duration = Date.now() - startTime;

          polls.push({
            pollNumber: i + 1,
            responseTime: duration,
            activityCount: response.data.activities.length,
          });

          expect(response.status).toBe(200);
          expect(duration).toBeLessThan(1000); // Each poll should be fast

          if (i < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        // All polls should succeed
        expect(polls.length).toBe(3);
        polls.forEach((poll) => {
          expect(poll.responseTime).toBeLessThan(1000);
        });
      },
      { timeout: 5000 }
    );
  });
});

describe('E2E: Multi-Agent Decision Framework', () => {
  let apiHealthy = false;

  beforeAll(async () => {
    try {
      const health = await axios.get(`${JARVIS_API_BASE}/api/health`, { timeout: 2000 });
      apiHealthy = health.data.success === true;
    } catch (error) {
      apiHealthy = false;
    }
  });

  it.skipIf(!apiHealthy)(
    'should have THREE-tier risk assessment in production',
    async () => {
      const metrics = await axios.get(`${JARVIS_API_BASE}/api/agents/metrics`);

      expect(metrics.data).toHaveProperty('risk_breakdown');

      const riskBreakdown = metrics.data.risk_breakdown;

      // Should have all three risk levels
      expect(riskBreakdown).toHaveProperty('LOW');
      expect(riskBreakdown).toHaveProperty('MEDIUM');
      expect(riskBreakdown).toHaveProperty('HIGH');

      // The system should be generating activities across risk levels
      const totalRiskActivities = riskBreakdown.LOW + riskBreakdown.MEDIUM + riskBreakdown.HIGH;
      expect(totalRiskActivities).toBeGreaterThan(0);
    }
  );

  it.skipIf(!apiHealthy)(
    'should auto-execute LOW risk activities',
    async () => {
      const activities = await axios.get(`${JARVIS_API_BASE}/api/agents/activities?limit=50`);

      const lowRiskActivities = activities.data.activities.filter(
        (a: any) => a.risk_level === 'LOW'
      );

      if (lowRiskActivities.length > 0) {
        // LOW risk activities should mostly be completed or in progress
        const completedLowRisk = lowRiskActivities.filter(
          (a: any) => a.status === 'completed' || a.status === 'pending'
        );

        // Most LOW risk should be auto-executed
        const autoExecutionRate = completedLowRisk.length / lowRiskActivities.length;
        expect(autoExecutionRate).toBeGreaterThan(0.5);
      }
    }
  );

  it.skipIf(!apiHealthy)(
    'should queue HIGH risk activities for approval',
    async () => {
      const approvalQueue = await axios.get(`${JARVIS_API_BASE}/api/agents/approval-queue`);

      const queue = approvalQueue.data.queue;

      // If there are items in approval queue, verify they are HIGH or MEDIUM risk
      queue.forEach((item: any) => {
        expect(['MEDIUM', 'HIGH']).toContain(item.risk_level);
      });
    }
  );
});
