/**
 * Domain Agent Lifecycle Tests
 */

import { DataScientistAgent } from '../../../src/autonomous/domains/data-scientist-domain';
import { MarketingStrategistAgent } from '../../../src/autonomous/domains/marketing-strategist-domain';
import { ClearanceLevel } from '../../../src/autonomous/domains/base-domain';

describe('Domain Agent Lifecycle', () => {
  describe('State Management', () => {
    it('should track state changes through lifecycle', async () => {
      const agent = new DataScientistAgent();

      // Initial state
      expect(agent.getState().status).toBe('idle');

      // During analysis
      const analyzePromise = agent.analyze('Load and analyze data');
      // Note: State check would need agent to expose intermediate state
      
      await analyzePromise;
      expect(agent.getState().status).toBe('idle');

      // During execution
      const task = {
        id: 'lifecycle-1',
        type: 'data_analysis',
        description: 'Test task',
        priority: 5,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 5
      };

      await agent.executeTask(task);
      expect(agent.getState().status).toBe('idle');
    });

    it('should handle pause/resume cycle', async () => {
      const agent = new DataScientistAgent();

      agent.pause();
      expect(agent.getState().status).toBe('paused');

      agent.resume();
      expect(agent.getState().status).toBe('idle');

      // Should still be able to execute after resume
      const task = {
        id: 'lifecycle-2',
        type: 'data_loading',
        description: 'Test task',
        priority: 5,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 5
      };

      const result = await agent.executeTask(task);
      expect(result.success).toBe(true);
    });

    it('should clear state on stop', async () => {
      const agent = new MarketingStrategistAgent();

      // Simulate some activity
      await agent.analyze('Create marketing campaign');

      agent.stop();
      const state = agent.getState();

      expect(state.status).toBe('idle');
      expect(state.currentTask).toBeUndefined();
    });
  });

  describe('Multi-Agent Coordination', () => {
    it('should support multiple agents running independently', async () => {
      const dataAgent = new DataScientistAgent();
      const marketingAgent = new MarketingStrategistAgent();

      const dataResult = await dataAgent.analyze('Analyze customer data');
      const marketingResult = await marketingAgent.analyze('Create marketing campaign');

      expect(dataResult.tasks.length).toBeGreaterThan(0);
      expect(marketingResult.tasks.length).toBeGreaterThan(0);
      expect(dataResult.tasks[0].type).toContain('data');
      expect(marketingResult.tasks[0].type).toContain('campaign');
    });

    it('should track statistics independently', async () => {
      const agent1 = new DataScientistAgent();
      const agent2 = new DataScientistAgent();

      const task = {
        id: 'stats-1',
        type: 'data_loading',
        description: 'Test task',
        priority: 5,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 5
      };

      await agent1.executeTask(task);
      await agent1.executeTask(task);
      await agent2.executeTask(task);

      expect(agent1.getStats().tasksExecuted).toBe(2);
      expect(agent2.getStats().tasksExecuted).toBe(1);
    });
  });

  describe('Clearance Level Enforcement', () => {
    it('should respect clearance levels across different agents', async () => {
      const readOnlyData = new DataScientistAgent(ClearanceLevel.READ_ONLY);
      const fullAccessData = new DataScientistAgent(ClearanceLevel.FULL_ACCESS);

      const modifyTask = {
        id: 'clearance-1',
        type: 'data_processing',
        description: 'Process data',
        priority: 7,
        clearanceRequired: ClearanceLevel.SAFE_MODIFY,
        estimatedImpact: 7
      };

      const result1 = await readOnlyData.executeTask(modifyTask);
      const result2 = await fullAccessData.executeTask(modifyTask);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(true);
    });

    it('should allow agents with higher clearance to execute lower tasks', async () => {
      const agent = new MarketingStrategistAgent(ClearanceLevel.ADMIN);

      const readTask = {
        id: 'clearance-2',
        type: 'marketing_analytics',
        description: 'Analyze metrics',
        priority: 5,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 5
      };

      const result = await agent.executeTask(readTask);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown task types gracefully', async () => {
      const agent = new DataScientistAgent();

      const unknownTask = {
        id: 'error-1',
        type: 'unknown_type',
        description: 'Unknown task',
        priority: 5,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 5
      };

      const result = await agent.executeTask(unknownTask);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unknown task type');
    });

    it('should provide learning feedback even on failure', async () => {
      const agent = new DataScientistAgent(ClearanceLevel.READ_ONLY);

      const restrictedTask = {
        id: 'error-2',
        type: 'data_processing',
        description: 'Process data',
        priority: 7,
        clearanceRequired: ClearanceLevel.FULL_ACCESS,
        estimatedImpact: 7
      };

      const result = await agent.executeTask(restrictedTask);

      expect(result.success).toBe(false);
      expect(result.learningFeedback.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Tracking', () => {
    it('should accumulate impact scores across tasks', async () => {
      const agent = new DataScientistAgent();

      const task1 = {
        id: 'resource-1',
        type: 'data_loading',
        description: 'Load data',
        priority: 5,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 5
      };

      const task2 = {
        id: 'resource-2',
        type: 'data_analysis',
        description: 'Analyze data',
        priority: 9,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 8
      };

      await agent.executeTask(task1);
      await agent.executeTask(task2);

      const stats = agent.getStats();
      expect(stats.tasksExecuted).toBe(2);
      expect(stats.totalImpact).toBe(25 + 72); // (5*5) + (9*8)
    });

    it('should track resource usage per task', async () => {
      const agent = new MarketingStrategistAgent();

      const task = {
        id: 'resource-3',
        type: 'campaign_planning',
        description: 'Plan campaign',
        priority: 9,
        clearanceRequired: ClearanceLevel.SAFE_MODIFY,
        estimatedImpact: 9
      };

      const result = await agent.executeTask(task);

      expect(result.resourcesUsed.cpuTime).toBeGreaterThanOrEqual(0);
      expect(result.resourcesUsed.apiCalls).toBeGreaterThan(0);
      expect(result.resourcesUsed.tokens).toBeGreaterThan(0);
    });
  });
});
