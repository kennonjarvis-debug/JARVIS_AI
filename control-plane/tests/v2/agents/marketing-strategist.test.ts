/**
 * Marketing Strategist Agent Tests
 */

import { MarketingStrategistAgent } from '../../../src/autonomous/domains/marketing-strategist-domain';
import { ClearanceLevel } from '../../../src/autonomous/domains/base-domain';

describe('MarketingStrategistAgent', () => {
  let agent: MarketingStrategistAgent;

  beforeEach(() => {
    agent = new MarketingStrategistAgent(ClearanceLevel.FULL_ACCESS);
  });

  describe('analyze()', () => {
    it('should identify campaign opportunities correctly', async () => {
      const input = 'Launch a new marketing campaign for our product';
      const result = await agent.analyze(input);

      expect(result.tasks.length).toBeGreaterThan(0);
      const campaignTask = result.tasks.find(t => t.type === 'campaign_planning');
      expect(campaignTask).toBeDefined();
      expect(campaignTask?.priority).toBe(9);
      expect(campaignTask?.clearanceRequired).toBe(ClearanceLevel.SAFE_MODIFY);
      expect(result.insights).toContain('Marketing campaign opportunity identified');
      expect(result.recommendedActions).toContain('Define target audience');
    });

    it('should identify content creation tasks correctly', async () => {
      const input = 'Write blog posts about our new features';
      const result = await agent.analyze(input);

      expect(result.tasks.length).toBeGreaterThan(0);
      const contentTask = result.tasks.find(t => t.type === 'content_creation');
      expect(contentTask).toBeDefined();
      expect(contentTask?.priority).toBe(7);
      expect(result.insights).toContain('Content creation task detected');
    });

    it('should identify analytics opportunities correctly', async () => {
      const input = 'Analyze our marketing performance and metrics';
      const result = await agent.analyze(input);

      expect(result.tasks.length).toBeGreaterThan(0);
      const analyticsTask = result.tasks.find(t => t.type === 'marketing_analytics');
      expect(analyticsTask).toBeDefined();
      expect(analyticsTask?.clearanceRequired).toBe(ClearanceLevel.READ_ONLY);
      expect(result.recommendedActions).toContain('Track conversion rates');
    });

    it('should identify SEO opportunities correctly', async () => {
      const input = 'Optimize our website for search engines';
      const result = await agent.analyze(input);

      expect(result.tasks.length).toBeGreaterThan(0);
      const seoTask = result.tasks.find(t => t.type === 'seo_optimization');
      expect(seoTask).toBeDefined();
      expect(seoTask?.estimatedImpact).toBe(8);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return high confidence for multi-task input', async () => {
      const input = 'Create campaign content, optimize for SEO, and analyze performance';
      const result = await agent.analyze(input);

      expect(result.tasks.length).toBeGreaterThan(2);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('executeTask()', () => {
    it('should execute campaign planning successfully', async () => {
      const task = {
        id: 'test-1',
        type: 'campaign_planning',
        description: 'Plan marketing campaign',
        priority: 9,
        clearanceRequired: ClearanceLevel.SAFE_MODIFY,
        estimatedImpact: 9
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.tasksCompleted).toBe(1);
      expect(result.errors.length).toBe(0);
      expect(result.resourcesUsed.apiCalls).toBe(8);
      expect(result.resourcesUsed.tokens).toBe(2000);
    });

    it('should execute content creation successfully', async () => {
      const task = {
        id: 'test-2',
        type: 'content_creation',
        description: 'Create blog content',
        priority: 7,
        clearanceRequired: ClearanceLevel.SAFE_MODIFY,
        estimatedImpact: 6
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.resourcesUsed.apiCalls).toBe(3);
      expect(result.resourcesUsed.tokens).toBe(1000);
    });

    it('should enforce clearance levels properly', async () => {
      const limitedAgent = new MarketingStrategistAgent(ClearanceLevel.READ_ONLY);
      const task = {
        id: 'test-3',
        type: 'campaign_planning',
        description: 'Plan campaign',
        priority: 9,
        clearanceRequired: ClearanceLevel.SAFE_MODIFY,
        estimatedImpact: 9
      };

      const result = await limitedAgent.executeTask(task);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Insufficient clearance');
    });

    it('should calculate impact scores correctly', async () => {
      const task = {
        id: 'test-4',
        type: 'campaign_planning',
        description: 'Plan campaign',
        priority: 9,
        clearanceRequired: ClearanceLevel.SAFE_MODIFY,
        estimatedImpact: 9
      };

      await agent.executeTask(task);
      const stats = agent.getStats();

      expect(stats.tasksExecuted).toBe(1);
      expect(stats.totalImpact).toBe(81); // 9 * 9
    });

    it('should generate learning feedback', async () => {
      const task = {
        id: 'test-5',
        type: 'marketing_analytics',
        description: 'Analyze metrics',
        priority: 8,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedImpact: 7
      };

      const result = await agent.executeTask(task);

      expect(result.learningFeedback.length).toBeGreaterThan(0);
      expect(result.learningFeedback[0]).toContain('Successfully completed');
    });

    it('should track resource usage', async () => {
      const task = {
        id: 'test-6',
        type: 'seo_optimization',
        description: 'Optimize SEO',
        priority: 6,
        clearanceRequired: ClearanceLevel.SAFE_MODIFY,
        estimatedImpact: 8
      };

      const result = await agent.executeTask(task);

      expect(result.resourcesUsed.cpuTime).toBeGreaterThanOrEqual(0);
      expect(result.resourcesUsed.apiCalls).toBe(5);
      expect(result.resourcesUsed.tokens).toBe(1200);
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
      const input = 'Create marketing campaign';
      await agent.analyze(input);

      agent.stop();
      const state = agent.getState();

      expect(state.status).toBe('idle');
      expect(state.currentTask).toBeUndefined();
    });
  });
});
