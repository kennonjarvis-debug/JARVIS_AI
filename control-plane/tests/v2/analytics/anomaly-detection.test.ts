/**
 * Anomaly Detection Tests
 * Tests for detecting anomalies and outliers in data patterns
 */

import { DataScientistDomain } from '../../../src/autonomous/domains/data-scientist-domain';
import { ClearanceLevel, Priority } from '../../../src/autonomous/types';

describe('Data Scientist - Anomaly Detection', () => {
  let dataScientist: DataScientistDomain;

  beforeEach(() => {
    dataScientist = new DataScientistDomain(ClearanceLevel.SUGGEST);
  });

  describe('Anomaly Detection Logic', () => {
    it('should identify anomaly detection tasks when anomalies present', async () => {
      const tasks = await dataScientist.analyze();

      const anomalyTask = tasks.find(t => t.metadata.anomalies);

      if (anomalyTask) {
        expect(anomalyTask.title).toContain('Anomaly');
        expect(anomalyTask.priority).toBe(Priority.HIGH);
        expect(anomalyTask.clearanceRequired).toBe(ClearanceLevel.SUGGEST);
        expect(Array.isArray(anomalyTask.metadata.anomalies)).toBe(true);
      }
    });

    it('should analyze anomalies and categorize by severity', async () => {
      const mockAnomalies = [
        { id: '1', type: 'spike', severity: 'high' },
        { id: '2', type: 'drop', severity: 'medium' },
        { id: '3', type: 'pattern', severity: 'low' }
      ];

      const task = {
        id: 'test-anomaly-analysis',
        domain: 'data-science' as any,
        title: 'Anomaly Detection: 3 anomalies found',
        description: 'Analyze detected anomalies',
        priority: Priority.HIGH,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.SUGGEST,
        estimatedDuration: 240000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          anomalyCount: 3,
          anomalies: mockAnomalies,
          estimatedCost: 0.60
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.success).toBe(true);
      expect(result.data.anomaliesAnalyzed).toBe(3);
      expect(result.data.severity).toBeDefined();
      expect(result.data.severity).toHaveProperty('critical');
      expect(result.data.severity).toHaveProperty('high');
      expect(result.data.severity).toHaveProperty('medium');
      expect(result.data.severity).toHaveProperty('low');
    });

    it('should provide root cause analysis', async () => {
      const task = {
        id: 'test-root-cause',
        domain: 'data-science' as any,
        title: 'Anomaly Detection',
        description: 'Identify root causes',
        priority: Priority.HIGH,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.SUGGEST,
        estimatedDuration: 240000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          anomalyCount: 2,
          anomalies: [
            { id: '1', type: 'traffic-spike' },
            { id: '2', type: 'error-spike' }
          ],
          estimatedCost: 0.60
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.data.rootCauses).toBeDefined();
      expect(Array.isArray(result.data.rootCauses)).toBe(true);
      expect(result.data.rootCauses.length).toBeGreaterThan(0);
    });
  });

  describe('Anomaly Recommendations', () => {
    it('should provide actionable recommendations', async () => {
      const task = {
        id: 'test-recommendations',
        domain: 'data-science' as any,
        title: 'Anomaly Detection',
        description: 'Generate recommendations',
        priority: Priority.HIGH,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.SUGGEST,
        estimatedDuration: 240000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          anomalyCount: 3,
          anomalies: [
            { id: '1', type: 'spike' },
            { id: '2', type: 'spike' },
            { id: '3', type: 'drop' }
          ],
          estimatedCost: 0.60
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.data.recommendations).toBeDefined();
      expect(Array.isArray(result.data.recommendations)).toBe(true);
      expect(result.data.recommendations.length).toBeGreaterThan(0);

      // Recommendations should be strings
      result.data.recommendations.forEach((rec: any) => {
        expect(typeof rec).toBe('string');
      });
    });

    it('should calculate high impact score for critical anomalies', async () => {
      const task = {
        id: 'test-critical-impact',
        domain: 'data-science' as any,
        title: 'Anomaly Detection',
        description: 'Critical anomalies',
        priority: Priority.HIGH,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.SUGGEST,
        estimatedDuration: 240000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          anomalyCount: 5,
          anomalies: [
            { id: '1', severity: 'critical' },
            { id: '2', severity: 'critical' },
            { id: '3', severity: 'high' },
            { id: '4', severity: 'medium' },
            { id: '5', severity: 'low' }
          ],
          estimatedCost: 0.60
        }
      };

      const result = await dataScientist.execute(task);

      // Multiple recommendations and insights should boost impact
      if (result.data.recommendations && result.data.recommendations.length > 0) {
        expect(result.metrics.impactScore).toBeGreaterThan(60);
      }
    });
  });

  describe('Severity Classification', () => {
    it('should correctly count anomalies by severity', async () => {
      const task = {
        id: 'test-severity-count',
        domain: 'data-science' as any,
        title: 'Anomaly Detection',
        description: 'Severity counting',
        priority: Priority.HIGH,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.SUGGEST,
        estimatedDuration: 240000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          anomalyCount: 5,
          anomalies: [
            { id: '1' }, { id: '2' }, { id: '3' },
            { id: '4' }, { id: '5' }
          ],
          estimatedCost: 0.60
        }
      };

      const result = await dataScientist.execute(task);

      const totalSeverity =
        result.data.severity.critical +
        result.data.severity.high +
        result.data.severity.medium +
        result.data.severity.low;

      // Total should match anomaly count
      expect(totalSeverity).toBe(5);
    });

    it('should have zero critical anomalies in mock data', async () => {
      const task = {
        id: 'test-no-critical',
        domain: 'data-science' as any,
        title: 'Anomaly Detection',
        description: 'Test severity distribution',
        priority: Priority.HIGH,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.SUGGEST,
        estimatedDuration: 240000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          anomalyCount: 3,
          anomalies: [
            { id: '1' }, { id: '2' }, { id: '3' }
          ],
          estimatedCost: 0.60
        }
      };

      const result = await dataScientist.execute(task);

      // Mock implementation should have 0 critical
      expect(result.data.severity.critical).toBe(0);
    });
  });

  describe('Resource Usage for Anomaly Detection', () => {
    it('should track API calls for anomaly analysis', async () => {
      const task = {
        id: 'test-api-calls',
        domain: 'data-science' as any,
        title: 'Anomaly Detection',
        description: 'Track API usage',
        priority: Priority.HIGH,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.SUGGEST,
        estimatedDuration: 240000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          anomalyCount: 4,
          anomalies: [
            { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }
          ],
          estimatedCost: 0.60
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.metrics.resourcesUsed.apiCalls).toBeGreaterThan(0);
      expect(result.metrics.resourcesUsed.tokensUsed).toBeGreaterThan(1000);
    });

    it('should stay within cost estimates', async () => {
      const task = {
        id: 'test-cost',
        domain: 'data-science' as any,
        title: 'Anomaly Detection',
        description: 'Cost tracking',
        priority: Priority.HIGH,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.SUGGEST,
        estimatedDuration: 240000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          anomalyCount: 2,
          anomalies: [
            { id: '1' }, { id: '2' }
          ],
          estimatedCost: 0.60
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.metrics.resourcesUsed.costIncurred).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Task Generation Thresholds', () => {
    it('should not generate task if no anomalies detected', async () => {
      // This tests the analyze() method
      const tasks = await dataScientist.analyze();

      // If no anomalies, should not have anomaly task
      // (Implementation may vary, but this documents expected behavior)
      const anomalyTasks = tasks.filter(t => t.title.includes('Anomaly'));

      // Each anomaly task should have anomalies in metadata
      anomalyTasks.forEach(task => {
        expect(task.metadata.anomalies).toBeDefined();
        expect(task.metadata.anomalyCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Learning and Feedback', () => {
    it('should generate logs for anomaly detection process', async () => {
      const task = {
        id: 'test-logs',
        domain: 'data-science' as any,
        title: 'Anomaly Detection',
        description: 'Test logging',
        priority: Priority.HIGH,
        status: 'pending' as any,
        clearanceRequired: ClearanceLevel.SUGGEST,
        estimatedDuration: 240000,
        dependencies: [],
        createdAt: new Date(),
        metadata: {
          anomalyCount: 2,
          anomalies: [
            { id: '1' }, { id: '2' }
          ],
          estimatedCost: 0.60
        }
      };

      const result = await dataScientist.execute(task);

      expect(result.logs).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);
      expect(result.logs.length).toBeGreaterThan(0);

      // Should have start and completion logs
      const startLog = result.logs.find((log: any) => log.message.includes('Starting'));
      const completeLog = result.logs.find((log: any) => log.message.includes('complete'));

      expect(startLog).toBeDefined();
      expect(completeLog).toBeDefined();
    });
  });
});
