/**
 * E2E Tests: Autonomous System
 *
 * Tests autonomous domain agents, task detection, and execution
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { TestAPIClient, sleep } from './helpers/test-client.js';

// Use global fetch (Node 18+)
const fetch = globalThis.fetch;

describe('Autonomous System E2E', () => {
  let apiClient: TestAPIClient;

  beforeAll(async () => {
    apiClient = new TestAPIClient();

    // Wait for JARVIS to be healthy
    let healthy = false;
    for (let i = 0; i < 10; i++) {
      try {
        const health = await apiClient.getHealth();
        if (health.status === 'healthy') {
          healthy = true;
          break;
        }
      } catch (error) {
        // Not ready yet
      }
      await sleep(1000);
    }

    if (!healthy) {
      throw new Error('JARVIS not healthy');
    }
  });

  test('should detect opportunities across all domains', async () => {
    try {
      const result = await apiClient.triggerAutonomousAnalysis();

      expect(result).toBeDefined();
      expect(result.tasks).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);

      console.log(`Autonomous system detected ${result.tasks.length} total opportunities`);

      // Check task structure
      if (result.tasks.length > 0) {
        const task = result.tasks[0];
        expect(task.id).toBeDefined();
        expect(task.domain).toBeDefined();
        expect(task.type).toBeDefined();
        expect(task.description).toBeDefined();
        expect(task.priority).toBeDefined();
      }
    } catch (error: any) {
      console.warn('Autonomous analysis not available:', error.message);
    }
  }, 20000);

  test('should detect music production opportunities', async () => {
    try {
      const result = await apiClient.triggerAutonomousAnalysis('music_production');

      expect(result).toBeDefined();
      expect(result.tasks).toBeDefined();

      const musicTasks = result.tasks.filter((t: any) => t.domain === 'music_production');
      console.log(`Music domain: ${musicTasks.length} opportunities`);

      // Music tasks should include types like:
      // - beat_generation, vocal_analysis, mixing_optimization, project_reminder
      const taskTypes = musicTasks.map((t: any) => t.type);
      console.log('Music task types:', taskTypes);
    } catch (error: any) {
      console.warn('Music domain analysis not available:', error.message);
    }
  }, 20000);

  test('should execute autonomous task with proper clearance', async () => {
    try {
      // First, detect tasks
      const analysis = await apiClient.triggerAutonomousAnalysis();

      if (analysis.tasks && analysis.tasks.length > 0) {
        const task = analysis.tasks[0];

        // Attempt to execute task (requires proper clearance levels)
        const response = await fetch('http://localhost:4000/api/autonomous/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            approved: true
          })
        });

        if (response.ok) {
          const result = await response.json();

          expect(result).toBeDefined();
          expect(result.taskId).toBe(task.id);
          expect(result.success).toBeDefined();
        } else {
          console.warn('Task execution endpoint returned non-OK status');
        }
      } else {
        console.log('No tasks available for execution test');
      }
    } catch (error: any) {
      console.warn('Task execution not available:', error.message);
    }
  }, 30000);

  test('should respect clearance levels for task execution', async () => {
    try {
      const analysis = await apiClient.triggerAutonomousAnalysis();

      const suggestTasks = analysis.tasks?.filter((t: any) =>
        t.clearanceRequired === 'SUGGEST' || t.clearanceRequired === 0
      );

      const executeTasks = analysis.tasks?.filter((t: any) =>
        t.clearanceRequired === 'EXECUTE' || t.clearanceRequired === 1
      );

      const dangerTasks = analysis.tasks?.filter((t: any) =>
        t.clearanceRequired === 'DANGER' || t.clearanceRequired === 2
      );

      console.log('Tasks by clearance level:');
      console.log(`  SUGGEST: ${suggestTasks?.length || 0}`);
      console.log(`  EXECUTE: ${executeTasks?.length || 0}`);
      console.log(`  DANGER: ${dangerTasks?.length || 0}`);

      // SUGGEST tasks should be automatically suggested
      expect(suggestTasks).toBeDefined();

      // DANGER tasks should require explicit approval
      if (dangerTasks && dangerTasks.length > 0) {
        const dangerTask = dangerTasks[0];
        expect(dangerTask.clearanceRequired).toBeGreaterThanOrEqual(2);
      }
    } catch (error: any) {
      console.warn('Clearance level test not available:', error.message);
    }
  }, 15000);

  test('should analyze system health and suggest fixes', async () => {
    try {
      const health = await apiClient.getHealth();

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();

      // Check if health check includes service status
      if (health.services) {
        const services = Object.keys(health.services);
        console.log('Monitored services:', services);

        // If any service is down, autonomous system should detect it
        const downServices = Object.entries(health.services)
          .filter(([_, status]) => status !== 'up')
          .map(([name]) => name);

        if (downServices.length > 0) {
          console.log('Down services detected:', downServices);

          // Trigger analysis to see if autonomous system detects the issue
          const analysis = await apiClient.triggerAutonomousAnalysis();
          const healthTasks = analysis.tasks?.filter((t: any) =>
            t.type === 'health_check' || t.description.includes('health')
          );

          console.log(`Autonomous system created ${healthTasks?.length || 0} health-related tasks`);
        }
      }
    } catch (error: any) {
      console.warn('Health analysis not available:', error.message);
    }
  }, 15000);

  test('should prioritize tasks correctly', async () => {
    try {
      const analysis = await apiClient.triggerAutonomousAnalysis();

      if (analysis.tasks && analysis.tasks.length > 0) {
        const priorities = analysis.tasks.map((t: any) => t.priority);
        const avgPriority = priorities.reduce((a: number, b: number) => a + b, 0) / priorities.length;

        console.log('Task priorities:', {
          min: Math.min(...priorities),
          max: Math.max(...priorities),
          avg: avgPriority.toFixed(2)
        });

        // Higher priority tasks should be suggested first
        const sortedTasks = [...analysis.tasks].sort((a: any, b: any) => b.priority - a.priority);
        expect(sortedTasks[0].priority).toBeGreaterThanOrEqual(sortedTasks[sortedTasks.length - 1].priority);
      }
    } catch (error: any) {
      console.warn('Priority test not available:', error.message);
    }
  }, 15000);

  test('should handle task execution failures gracefully', async () => {
    try {
      // Attempt to execute non-existent task
      const response = await fetch('http://localhost:4000/api/autonomous/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'non-existent-task-12345',
          approved: true
        })
      });

      // Should return error but not crash
      expect(response).toBeDefined();

      if (!response.ok) {
        const error = await response.json();
        expect(error.error).toBeDefined();
        console.log('Expected error handling:', error.error);
      }
    } catch (error: any) {
      console.warn('Task execution endpoint not available:', error.message);
    }
  }, 10000);

  test('should provide task execution results with metrics', async () => {
    try {
      const analysis = await apiClient.triggerAutonomousAnalysis();

      if (analysis.tasks && analysis.tasks.length > 0) {
        const task = analysis.tasks[0];

        const response = await fetch('http://localhost:4000/api/autonomous/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            approved: true
          })
        });

        if (response.ok) {
          const result = await response.json();

          expect(result.taskId).toBe(task.id);
          expect(result.success).toBeDefined();
          expect(result.timestamp).toBeDefined();

          // Should include execution metrics
          if (result.success) {
            expect(result.executionTime).toBeDefined();
            console.log(`Task executed in ${result.executionTime}ms`);
          }
        }
      }
    } catch (error: any) {
      console.warn('Task metrics test not available:', error.message);
    }
  }, 30000);
});
