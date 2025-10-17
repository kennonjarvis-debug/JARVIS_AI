/**
 * Integration Test: JARVIS Control Plane → AI DAWG Backend → Database
 *
 * Test Scenarios:
 * 1. User creates project - Backend saves to database - Verify data persistence
 * 2. Project update flow - Verify update propagation
 * 3. Project deletion flow - Verify cleanup
 * 4. Concurrent project operations - Verify data consistency
 * 5. Database connection failure - Verify error handling
 */

import axios from 'axios';
import { randomUUID } from 'crypto';

const JARVIS_API = 'http://localhost:4000';
const AI_DAWG_API = 'http://localhost:3001';
const AUTH_TOKEN = process.env.JARVIS_AUTH_TOKEN || 'test-token';

interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

describe('JARVIS → AI DAWG → Database Integration', () => {
  let testProjectId: string;

  beforeAll(async () => {
    console.log('\n🚀 Starting JARVIS → Database Integration Tests\n');
  });

  afterAll(() => {
    console.log('\n📊 Test Results Summary:');
    console.log('=======================');
    results.forEach(r => {
      const status = r.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${r.scenario} | ${r.duration}ms`);
      if (r.error) console.log(`   Error: ${r.error}`);
    });
    const passCount = results.filter(r => r.passed).length;
    console.log(`\nTotal: ${passCount}/${results.length} passed`);
  });

  test('Scenario 1: Create project and verify database persistence', async () => {
    const scenario = 'Create project and verify persistence';

    try {
      const { result, duration } = await measureTime(async () => {
        testProjectId = `test-project-${randomUUID()}`;

        // Step 1: Create project via JARVIS Control Plane
        const createResponse = await axios.post(
          `${JARVIS_API}/api/v1/execute`,
          {
            module: 'project',
            action: 'create',
            params: {
              id: testProjectId,
              name: 'Integration Test Project',
              description: 'Testing database persistence',
              tags: ['integration-test', 'automated']
            }
          },
          {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            timeout: 10000
          }
        );

        expect(createResponse.status).toBe(200);
        expect(createResponse.data.success).toBe(true);

        // Step 2: Verify project exists in database via AI DAWG Backend
        await new Promise(resolve => setTimeout(resolve, 1000)); // Allow DB write

        const verifyResponse = await axios.get(
          `${AI_DAWG_API}/api/v1/projects/${testProjectId}`,
          { timeout: 5000 }
        );

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.data.id).toBe(testProjectId);
        expect(verifyResponse.data.name).toBe('Integration Test Project');

        return verifyResponse.data;
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 2: Update project and verify propagation', async () => {
    const scenario = 'Update project and verify propagation';

    try {
      const { duration } = await measureTime(async () => {
        // Update project
        const updateResponse = await axios.post(
          `${JARVIS_API}/api/v1/execute`,
          {
            module: 'project',
            action: 'update',
            params: {
              id: testProjectId,
              name: 'Updated Integration Test Project',
              status: 'in_progress'
            }
          },
          {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            timeout: 10000
          }
        );

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.success).toBe(true);

        // Verify update in database
        await new Promise(resolve => setTimeout(resolve, 1000));

        const verifyResponse = await axios.get(
          `${AI_DAWG_API}/api/v1/projects/${testProjectId}`,
          { timeout: 5000 }
        );

        expect(verifyResponse.data.name).toBe('Updated Integration Test Project');
        expect(verifyResponse.data.status).toBe('in_progress');
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 3: Concurrent project operations - data consistency', async () => {
    const scenario = 'Concurrent operations - data consistency';

    try {
      const { duration } = await measureTime(async () => {
        const projectIds = Array.from({ length: 5 }, () => `test-concurrent-${randomUUID()}`);

        // Create 5 projects concurrently
        const createPromises = projectIds.map(id =>
          axios.post(
            `${JARVIS_API}/api/v1/execute`,
            {
              module: 'project',
              action: 'create',
              params: {
                id,
                name: `Concurrent Test ${id}`,
                description: 'Testing concurrent operations'
              }
            },
            {
              headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
              timeout: 10000
            }
          )
        );

        const createResults = await Promise.all(createPromises);

        // All should succeed
        createResults.forEach(res => {
          expect(res.status).toBe(200);
          expect(res.data.success).toBe(true);
        });

        // Verify all projects in database
        await new Promise(resolve => setTimeout(resolve, 2000));

        const verifyPromises = projectIds.map(id =>
          axios.get(`${AI_DAWG_API}/api/v1/projects/${id}`, { timeout: 5000 })
        );

        const verifyResults = await Promise.all(verifyPromises);

        verifyResults.forEach((res, idx) => {
          expect(res.status).toBe(200);
          expect(res.data.id).toBe(projectIds[idx]);
        });

        // Cleanup
        const deletePromises = projectIds.map(id =>
          axios.post(
            `${JARVIS_API}/api/v1/execute`,
            { module: 'project', action: 'delete', params: { id } },
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
          ).catch(() => {}) // Ignore errors
        );
        await Promise.all(deletePromises);
      });

      results.push({ scenario, passed: true, duration });
      console.log(`✅ ${scenario} - ${duration}ms`);
    } catch (error: any) {
      results.push({ scenario, passed: false, duration: 0, error: error.message });
      console.error(`❌ ${scenario} - ${error.message}`);
      throw error;
    }
  });

  test('Scenario 4: Error handling - invalid project data', async () => {
    const scenario = 'Error handling - invalid data';

    try {
      const { duration } = await measureTime(async () => {
        // Attempt to create project with invalid data
        try {
          await axios.post(
            `${JARVIS_API}/api/v1/execute`,
            {
              module: 'project',
              action: 'create',
              params: {
                // Missing required fields
                id: `test-invalid-${randomUUID()}`
                // name is missing
              }
            },
            {
              headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
              timeout: 10000
            }
          );

          // Should not reach here
          throw new Error('Expected validation error but request succeeded');
        } catch (error: any) {
          // Should get 400 Bad Request or 500 with validation error
          expect([400, 500]).toContain(error.response?.status);
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

  test('Scenario 5: Delete project and verify cleanup', async () => {
    const scenario = 'Delete project and verify cleanup';

    try {
      const { duration } = await measureTime(async () => {
        if (!testProjectId) {
          throw new Error('Test project not created');
        }

        // Delete project
        const deleteResponse = await axios.post(
          `${JARVIS_API}/api/v1/execute`,
          {
            module: 'project',
            action: 'delete',
            params: { id: testProjectId }
          },
          {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            timeout: 10000
          }
        );

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.data.success).toBe(true);

        // Verify project no longer exists
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          await axios.get(
            `${AI_DAWG_API}/api/v1/projects/${testProjectId}`,
            { timeout: 5000 }
          );

          // Should not reach here
          throw new Error('Expected 404 but project still exists');
        } catch (error: any) {
          expect(error.response?.status).toBe(404);
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
});
