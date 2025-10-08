/**
 * Data Scientist Agent Tests
 */

import { DataScientistAgent } from '../../../src/autonomous/domains/data-scientist-domain';
import { ClearanceLevel } from '../../../src/autonomous/domains/base-domain';

describe('DataScientistAgent', () => {
  let agent: DataScientistAgent;

  beforeEach(() => {
    agent = new DataScientistAgent(ClearanceLevel.FULL_ACCESS);
  });

  describe('analyze()', () => {
    it('should identify data loading tasks correctly', async () => {
      const input = 'Load the CSV file with customer data';
      const result = await agent.analyze(input);

      expect(result.tasks.length).toBeGreaterThan(0);
      const loadTask = result.tasks.find(t => t.type === 'data_loading');
      expect(loadTask).toBeDefined();
      expect(loadTask?.clearanceRequired).toBe(ClearanceLevel.READ_ONLY);
      expect(result.insights).toContain('Detected data loading requirement');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should identify data processing tasks correctly', async () => {
      const input = 'Clean and transform the sales data';
      const result = await agent.analyze(input);

      expect(result.tasks.length).toBeGreaterThan(0);
      const processTask = result.tasks.find(t => t.type === 'data_processing');
      expect(processTask).toBeDefined();
      expect(processTask?.clearanceRequired).toBe(ClearanceLevel.SAFE_MODIFY);
      expect(processTask?.priority).toBe(7);
      expect(result.insights).toContain('Data processing task identified');
    });

    it('should identify analysis tasks correctly', async () => {
      const input = 'Analyze the trends and generate insights from the data';
      const result = await agent.analyze(input);

      expect(result.tasks.length).toBeGreaterThan(0);
      const analyzeTask = result.tasks.find(t => t.type === 'data_analysis');
      expect(analyzeTask).toBeDefined();
      expect(analyzeTask?.priority).toBe(9);
      expect(result.recommendedActions).toContain('Run correlation analysis');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should return high confidence for multi-task input', async () => {
      const input = 'Load CSV data, clean it, and analyze the trends';
      const result = await agent.analyze(input);

      expect(result.tasks.length).toBeGreaterThan(2);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('executeTask()', () => {
    it('should execute data loading task successfully', async () => {
      const task = {
        id: 'test-1',
        type: 'data_loading',
        description: 'Load test data',
        priority: 8,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 5
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.tasksCompleted).toBe(1);
      expect(result.errors.length).toBe(0);
      expect(result.resourcesUsed.apiCalls).toBe(1);
      expect(result.resourcesUsed.tokens).toBe(100);
      expect(result.learningFeedback.length).toBeGreaterThan(0);
    });

    it('should execute data processing task successfully', async () => {
      const task = {
        id: 'test-2',
        type: 'data_processing',
        description: 'Process test data',
        priority: 7,
        clearanceRequired: ClearanceLevel.SAFE_MODIFY,
        estimatedImpact: 7
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.tasksCompleted).toBe(1);
      expect(result.resourcesUsed.apiCalls).toBe(2);
      expect(result.resourcesUsed.tokens).toBe(500);
    });

    it('should enforce clearance levels properly', async () => {
      const limitedAgent = new DataScientistAgent(ClearanceLevel.READ_ONLY);
      const task = {
        id: 'test-3',
        type: 'data_processing',
        description: 'Process data',
        priority: 7,
        clearanceRequired: ClearanceLevel.SAFE_MODIFY,
        estimatedImpact: 7
      };

      const result = await limitedAgent.executeTask(task);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Insufficient clearance');
    });

    it('should calculate impact scores correctly', async () => {
      const task = {
        id: 'test-4',
        type: 'data_analysis',
        description: 'Analyze data',
        priority: 9,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 8
      };

      await agent.executeTask(task);
      const stats = agent.getStats();

      expect(stats.tasksExecuted).toBe(1);
      expect(stats.totalImpact).toBe(72); // priority * estimatedImpact = 9 * 8
    });

    it('should generate learning feedback', async () => {
      const task = {
        id: 'test-5',
        type: 'data_analysis',
        description: 'Analyze data',
        priority: 9,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 8
      };

      const result = await agent.executeTask(task);

      expect(result.learningFeedback.length).toBeGreaterThan(0);
      expect(result.learningFeedback[0]).toContain('Successfully completed');
    });

    it('should track resource usage', async () => {
      const task = {
        id: 'test-6',
        type: 'data_analysis',
        description: 'Analyze data',
        priority: 9,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 8
      };

      const result = await agent.executeTask(task);

      expect(result.resourcesUsed.cpuTime).toBeGreaterThanOrEqual(0);
      expect(result.resourcesUsed.apiCalls).toBe(5);
      expect(result.resourcesUsed.tokens).toBe(1500);
    });
  });

  describe('Agent Lifecycle', () => {
    it('should start in idle state', () => {
      const state = agent.getState();
      expect(state.status).toBe('idle');
    });

    it('should pause and resume correctly', () => {
      agent.pause();
      expect(agent.getState().status).toBe('paused');

      agent.resume();
      expect(agent.getState().status).toBe('idle');
    });

    it('should stop and clear current task', async () => {
      const input = 'Analyze data';
      await agent.analyze(input);

      agent.stop();
      const state = agent.getState();

      expect(state.status).toBe('idle');
      expect(state.currentTask).toBeUndefined();
    });
  });
});
