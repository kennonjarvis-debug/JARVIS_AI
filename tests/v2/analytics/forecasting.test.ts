/**
 * Forecasting Tests
 * Tests for predictive modeling and forecasting capabilities
 */

import { DataScientistDomain } from '../../../src/autonomous/domains/data-scientist-domain';
import { ClearanceLevel, Priority } from '../../../src/autonomous/types';

describe('Data Scientist - Forecasting', () => {
  let dataScientist: DataScientistDomain;

  beforeEach(() => {
    dataScientist = new DataScientistDomain(ClearanceLevel.MODIFY_SAFE);
  });

  describe('Forecast Model Building', () => {
    it('should identify forecast update tasks when model needs refresh', async () => {
      const tasks = await dataScientist.analyze();

      const forecastTask = tasks.find(t => t.metadata.modelType);

      if (forecastTask) {
        expect(forecastTask.title).toContain('Forecast');
        expect(forecastTask.priority).toBe(Priority.MEDIUM);
        expect(forecastTask.clearanceRequired).toBe(ClearanceLevel.MODIFY_SAFE);
        expect(forecastTask.metadata.estimatedCost).toBeGreaterThan(0);
      }
    });

    it('should build forecast model successfully (mocked)', async () => {
      const task = {
        id: 'test-forecast-build',
        domain: 'data-science' as any,
        title: 'Update Forecast Models',
        description: 'Build time-series forecast',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.MODIFY_SAFE,
        estimatedDuration: 300000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          modelType: 'time-series',
          estimatedCost: 1.50
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.success).toBe(true);
      expect(result.data.modelType).toBe('time-series');
      expect(result.data.modelAccuracy).toBeDefined();
      expect(result.data.forecastHorizon).toBeDefined();
      expect(result.data.predictions).toBeDefined();
    });

    it('should generate predictions for multiple time horizons', async () => {
      const task = {
        id: 'test-predictions',
        domain: 'data-science' as any,
        title: 'Update Forecast Models',
        description: 'Generate predictions',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.MODIFY_SAFE,
        estimatedDuration: 300000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          modelType: 'time-series',
          estimatedCost: 1.50
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.data.predictions).toBeDefined();
      expect(result.data.predictions.nextWeek).toBeDefined();
      expect(result.data.predictions.nextMonth).toBeDefined();

      // Validate prediction structure
      expect(result.data.predictions.nextWeek).toHaveProperty('userGrowth');
      expect(result.data.predictions.nextWeek).toHaveProperty('revenue');
    });
  });

  describe('Model Accuracy Validation', () => {
    it('should report model accuracy metrics', async () => {
      const task = {
        id: 'test-accuracy',
        domain: 'data-science' as any,
        title: 'Update Forecast Models',
        description: 'Validate model accuracy',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.MODIFY_SAFE,
        estimatedDuration: 300000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          modelType: 'time-series',
          estimatedCost: 1.50
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.data.modelAccuracy).toBeGreaterThan(0);
      expect(result.data.modelAccuracy).toBeLessThanOrEqual(1);

      // Reasonable accuracy expected
      expect(result.data.modelAccuracy).toBeGreaterThan(0.70);
    });

    it('should calculate higher impact score for accurate models', async () => {
      const task = {
        id: 'test-impact-accuracy',
        domain: 'data-science' as any,
        title: 'Update Forecast Models',
        description: 'Test impact scoring',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.MODIFY_SAFE,
        estimatedDuration: 300000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          modelType: 'time-series',
          estimatedCost: 1.50
        }
      };

      const result = await dataScientist.execute(task);

      // Model accuracy contributes to impact score
      if (result.data.modelAccuracy && result.data.modelAccuracy > 0.8) {
        expect(result.metrics.impactScore).toBeGreaterThan(60);
      }
    });
  });

  describe('Forecast Horizon Validation', () => {
    it('should specify appropriate forecast horizon', async () => {
      const task = {
        id: 'test-horizon',
        domain: 'data-science' as any,
        title: 'Update Forecast Models',
        description: 'Test forecast horizon',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.MODIFY_SAFE,
        estimatedDuration: 300000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          modelType: 'time-series',
          estimatedCost: 1.50
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.data.forecastHorizon).toBeDefined();
      expect(typeof result.data.forecastHorizon).toBe('number');
      expect(result.data.forecastHorizon).toBeGreaterThan(0);

      // Reasonable horizon (e.g., 30-365 days)
      expect(result.data.forecastHorizon).toBeGreaterThanOrEqual(7);
      expect(result.data.forecastHorizon).toBeLessThanOrEqual(365);
    });
  });

  describe('Resource Usage for Model Building', () => {
    it('should track higher resource usage for model building', async () => {
      const task = {
        id: 'test-resources',
        domain: 'data-science' as any,
        title: 'Update Forecast Models',
        description: 'Test resource tracking',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.MODIFY_SAFE,
        estimatedDuration: 300000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          modelType: 'time-series',
          estimatedCost: 1.50
        }
      };

      const result = await dataScientist.execute(task);

      // Model building should use more resources than simple analysis
      expect(result.metrics.resourcesUsed.apiCalls).toBeGreaterThan(0);
      expect(result.metrics.resourcesUsed.tokensUsed).toBeGreaterThan(1000);
      expect(result.metrics.resourcesUsed.costIncurred).toBeGreaterThan(0.50);
    });

    it('should respect estimated cost limits', async () => {
      const task = {
        id: 'test-cost-limit',
        domain: 'data-science' as any,
        title: 'Update Forecast Models',
        description: 'Test cost limits',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.MODIFY_SAFE,
        estimatedDuration: 300000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          modelType: 'time-series',
          estimatedCost: 1.50
        }
      };

      const result = await dataScientist.execute(task);

      // Should stay within estimated cost
      expect(result.metrics.resourcesUsed.costIncurred).toBeLessThanOrEqual(2.0);
    });
  });

  describe('Clearance Level Enforcement', () => {
    it('should require MODIFY_SAFE clearance for model building', async () => {
      const readOnlyAgent = new DataScientistDomain(ClearanceLevel.READ_ONLY);

      const task = {
        id: 'test-clearance',
        domain: 'data-science' as any,
        title: 'Update Forecast Models',
        description: 'Test clearance enforcement',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.MODIFY_SAFE,
        estimatedDuration: 300000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          modelType: 'time-series',
          estimatedCost: 1.50
        }
      };

      const canExecute = readOnlyAgent.canExecute(task);
      expect(canExecute).toBe(false);
    });

    it('should allow execution with sufficient clearance', async () => {
      const task = {
        id: 'test-clearance-ok',
        domain: 'data-science' as any,
        title: 'Update Forecast Models',
        description: 'Test clearance sufficient',
        priority: Priority.MEDIUM,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.MODIFY_SAFE,
        estimatedDuration: 300000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          modelType: 'time-series',
          estimatedCost: 1.50
        }
      };

      const canExecute = dataScientist.canExecute(task);
      expect(canExecute).toBe(true);
    });
  });
});
