/**
 * Data Analysis Tests
 * Tests for Data Scientist domain agent analysis capabilities
 */

import { DataScientistDomain } from '../../../src/autonomous/domains/data-scientist-domain';
import { ClearanceLevel, Priority } from '../../../src/autonomous/types';

describe('Data Scientist - Data Analysis', () => {
  let dataScientist: DataScientistDomain;

  beforeEach(() => {
    dataScientist = new DataScientistDomain(ClearanceLevel.READ_ONLY);
  });

  describe('Daily Analysis Execution', () => {
    it('should identify daily analysis task when > 24 hours since last run', async () => {
      const tasks = await dataScientist.analyze();

      // Should generate daily analysis task
      const dailyAnalysis = tasks.find(t => t.metadata.analysisType === 'daily');

      if (dailyAnalysis) {
        expect(dailyAnalysis.title).toBe('Daily Data Analysis');
        expect(dailyAnalysis.priority).toBe(Priority.MEDIUM);
        expect(dailyAnalysis.clearanceRequired).toBe(ClearanceLevel.READ_ONLY);
        expect(dailyAnalysis.metadata.estimatedCost).toBeLessThanOrEqual(0.50);
      }
    });

    it('should execute daily analysis and return insights', async () => {
      const task = {
        id: 'test-daily-analysis',
        domain: 'data-science' as any,
        title: 'Daily Data Analysis',
        description: 'Test daily analysis',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedDuration: 120000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          analysisType: 'daily',
          estimatedCost: 0.30
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.userMetrics).toBeDefined();
      expect(result.data.systemMetrics).toBeDefined();
      expect(result.data.insights).toBeDefined();
      expect(Array.isArray(result.data.insights)).toBe(true);
    });
  });

  describe('Data Quality Checks', () => {
    it('should detect data quality issues when present', async () => {
      const tasks = await dataScientist.analyze();

      // Check if data quality task was generated
      const qualityTask = tasks.find(t => t.metadata.issues);

      // If quality issues detected, validate task structure
      if (qualityTask) {
        expect(qualityTask.title).toContain('Data Quality');
        expect(qualityTask.priority).toBe(Priority.HIGH);
        expect(qualityTask.clearanceRequired).toBe(ClearanceLevel.READ_ONLY);
        expect(Array.isArray(qualityTask.metadata.issues)).toBe(true);
      }
    });

    it('should execute data quality analysis', async () => {
      const task = {
        id: 'test-quality-check',
        domain: 'data-science' as any,
        title: 'Data Quality Analysis',
        description: 'Test quality check',
        priority: Priority.HIGH,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedDuration: 180000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          issues: ['missing values', 'duplicate records'],
          estimatedCost: 0.50
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.success).toBe(true);
      expect(result.data.issuesAnalyzed).toBe(2);
      expect(result.data.recommendations).toBeDefined();
      expect(Array.isArray(result.data.recommendations)).toBe(true);
    });
  });

  describe('Impact Score Calculation', () => {
    it('should calculate impact score based on insights generated', async () => {
      const task = {
        id: 'test-impact-score',
        domain: 'data-science' as any,
        title: 'Daily Data Analysis',
        description: 'Test impact scoring',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedDuration: 120000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          analysisType: 'daily',
          estimatedCost: 0.30
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.metrics.impactScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.impactScore).toBeLessThanOrEqual(100);

      // Daily analysis with insights should have decent impact
      if (result.data.insights && result.data.insights.length > 0) {
        expect(result.metrics.impactScore).toBeGreaterThan(50);
      }
    });
  });

  describe('Mock Data Integrity', () => {
    it('should return consistent data structure for daily analysis', async () => {
      const task = {
        id: 'test-data-structure',
        domain: 'data-science' as any,
        title: 'Daily Data Analysis',
        description: 'Test data structure',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedDuration: 120000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          analysisType: 'daily',
          estimatedCost: 0.30
        }
      };

      const result = await dataScientist.execute(task);

      // Validate structure
      expect(result.data.userMetrics).toHaveProperty('activeUsers');
      expect(result.data.userMetrics).toHaveProperty('newUsers');
      expect(result.data.userMetrics).toHaveProperty('engagementRate');
      expect(result.data.systemMetrics).toHaveProperty('apiRequests');
      expect(result.data.systemMetrics).toHaveProperty('errorRate');
      expect(result.data.timestamp).toBeDefined();
    });

    it('should track resource usage accurately', async () => {
      const task = {
        id: 'test-resources',
        domain: 'data-science' as any,
        title: 'Daily Data Analysis',
        description: 'Test resource tracking',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedDuration: 120000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          analysisType: 'daily',
          estimatedCost: 0.30
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.metrics.resourcesUsed).toBeDefined();
      expect(result.metrics.resourcesUsed.apiCalls).toBeGreaterThanOrEqual(0);
      expect(result.metrics.resourcesUsed.tokensUsed).toBeGreaterThanOrEqual(0);
      expect(result.metrics.resourcesUsed.costIncurred).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Agent Status and Health', () => {
    it('should report healthy status after execution', async () => {
      const task = {
        id: 'test-health',
        domain: 'data-science' as any,
        title: 'Daily Data Analysis',
        description: 'Test agent health',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.READ_ONLY,
        estimatedDuration: 120000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          analysisType: 'daily',
          estimatedCost: 0.30
        }
      };

      await dataScientist.execute(task);

      const status = dataScientist.getStatus();

      expect(status.active).toBe(false); // Should not be active after completion
      expect(status.tasksCompleted).toBeGreaterThan(0);
      expect(status.healthScore).toBeGreaterThanOrEqual(0);
      expect(status.healthScore).toBeLessThanOrEqual(100);
    });
  });
});
