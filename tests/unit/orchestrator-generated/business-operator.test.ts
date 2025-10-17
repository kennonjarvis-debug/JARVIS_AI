/**
 * Unit Tests for BusinessOperator
 * Tests autonomous management, health monitoring, auto-restart, and metrics collection
 */

import { BusinessOperator, ServiceAlert, BusinessMetrics } from '../../../src/core/business-operator';
import { HealthAggregator } from '../../../src/core/health-aggregator';
import { businessIntelligence } from '../../../src/core/business-intelligence';
import { exec } from 'child_process';
import { promisify } from 'util';

jest.mock('../../../src/core/health-aggregator');
jest.mock('../../../src/core/business-intelligence');
jest.mock('child_process');
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn()
}));

const MockedHealthAggregator = HealthAggregator as jest.MockedClass<typeof HealthAggregator>;
const mockedExec = exec as jest.MockedFunction<typeof exec>;
const mockedPromisify = promisify as jest.MockedFunction<typeof promisify>;
const mockedBusinessIntelligence = businessIntelligence as jest.Mocked<typeof businessIntelligence>;

describe('BusinessOperator', () => {
  let businessOperator: BusinessOperator;
  let mockHealthAggregator: jest.Mocked<HealthAggregator>;
  let mockExecAsync: jest.Mock;

  const createMockHealthStatus = (overrides = {}) => ({
    overall: 'healthy' as const,
    services: {
      aiDawgBackend: { status: 'healthy' as const },
      aiDawgDocker: { status: 'healthy' as const },
      vocalCoach: { status: 'healthy' as const },
      producer: { status: 'healthy' as const },
      aiBrain: { status: 'healthy' as const },
      postgres: { status: 'healthy' as const },
      redis: { status: 'healthy' as const }
    },
    timestamp: new Date().toISOString(),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockExecAsync = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    mockedPromisify.mockReturnValue(mockExecAsync);

    mockHealthAggregator = {
      checkAll: jest.fn().mockResolvedValue(createMockHealthStatus())
    } as any;

    MockedHealthAggregator.mockImplementation(() => mockHealthAggregator);

    mockedBusinessIntelligence.getSnapshot = jest.fn().mockReturnValue({
      aiUsage: {
        totalCalls: 100,
        totalCost: 5.50,
        byModel: {
          openai: { calls: 50, cost: 2.50, tokens: 10000 },
          anthropic: { calls: 30, cost: 2.00, tokens: 8000 },
          gemini: { calls: 20, cost: 1.00, tokens: 5000 }
        }
      },
      users: {
        totalSessions: 10,
        activeSessions: 5,
        activeUsers: 3,
        newUsers: 1,
        bySource: { desktop: 5, web: 3, chatgpt: 2, iphone: 0 }
      },
      requests: {
        total: 500,
        requestsPerMinute: 8.33,
        errorRate: 0.02,
        avgResponseTime: 150
      },
      timestamp: new Date()
    });

    businessOperator = new BusinessOperator();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    businessOperator.stop();
    jest.useRealTimers();
  });

  describe('start', () => {
    it('should start monitoring with correct intervals', async () => {
      await businessOperator.start();

      expect(mockHealthAggregator.checkAll).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting autonomous management system')
      );
    });

    it('should perform initial health check', async () => {
      await businessOperator.start();

      expect(mockHealthAggregator.checkAll).toHaveBeenCalled();
    });

    it('should emit health-update event on start', async () => {
      const healthUpdateListener = jest.fn();
      businessOperator.on('health-update', healthUpdateListener);

      await businessOperator.start();

      // Wait for initial check
      await jest.runOnlyPendingTimersAsync();

      expect(healthUpdateListener).toHaveBeenCalled();
    });

    it('should schedule health checks at correct interval', async () => {
      await businessOperator.start();

      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(mockHealthAggregator.checkAll).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during initial health check', async () => {
      mockHealthAggregator.checkAll.mockRejectedValueOnce(new Error('Health check failed'));

      await businessOperator.start();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Health check failed'),
        expect.any(Error)
      );
    });
  });

  describe('stop', () => {
    it('should stop all monitoring intervals', async () => {
      await businessOperator.start();
      businessOperator.stop();

      const initialCallCount = mockHealthAggregator.checkAll.mock.calls.length;

      jest.advanceTimersByTime(60000);
      await jest.runOnlyPendingTimersAsync();

      expect(mockHealthAggregator.checkAll).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should log stopping message', async () => {
      await businessOperator.start();
      businessOperator.stop();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Stopping monitoring')
      );
    });

    it('should handle stop without start', () => {
      expect(() => businessOperator.stop()).not.toThrow();
    });

    it('should handle multiple stop calls', async () => {
      await businessOperator.start();
      businessOperator.stop();
      businessOperator.stop();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Stopped')
      );
    });
  });

  describe('handleUnhealthyService', () => {
    it('should attempt restart on unhealthy service', async () => {
      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            vocalCoach: { status: 'unhealthy', message: 'Not responding' }
          }
        })
      );

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(mockExecAsync).toHaveBeenCalledWith('docker restart ai-dawg-vocal-coach');
    });

    it('should track restart attempts', async () => {
      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            vocalCoach: { status: 'unhealthy', message: 'Not responding' }
          }
        })
      );

      await businessOperator.start();

      // First attempt
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      // Second attempt
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(mockExecAsync).toHaveBeenCalledTimes(2);
    });

    it('should stop restarting after max attempts', async () => {
      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            vocalCoach: { status: 'unhealthy', message: 'Not responding' }
          }
        })
      );

      await businessOperator.start();

      // Attempt 1, 2, 3
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(30000);
        await jest.runOnlyPendingTimersAsync();
      }

      // 4th attempt should not restart
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(mockExecAsync).toHaveBeenCalledTimes(3);
    });

    it('should emit critical alert after max restart attempts', async () => {
      const alertListener = jest.fn();
      businessOperator.on('alert', alertListener);

      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            vocalCoach: { status: 'unhealthy', message: 'Not responding' }
          }
        })
      );

      await businessOperator.start();

      // Exceed max attempts
      for (let i = 0; i < 4; i++) {
        jest.advanceTimersByTime(30000);
        await jest.runOnlyPendingTimersAsync();
      }

      const criticalAlerts = alertListener.mock.calls
        .map(call => call[0])
        .filter((alert: ServiceAlert) => alert.severity === 'critical');

      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    it('should handle degraded services with info alert', async () => {
      const alertListener = jest.fn();
      businessOperator.on('alert', alertListener);

      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            vocalCoach: { status: 'degraded', message: 'Slow response' }
          }
        })
      );

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(mockExecAsync).not.toHaveBeenCalled();
      expect(alertListener).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'info',
          service: 'vocalCoach'
        })
      );
    });

    it('should reset restart attempts when service becomes healthy', async () => {
      // First unhealthy
      mockHealthAggregator.checkAll.mockResolvedValueOnce(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            vocalCoach: { status: 'unhealthy', message: 'Not responding' }
          }
        })
      );

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      // Then healthy
      mockHealthAggregator.checkAll.mockResolvedValue(createMockHealthStatus());

      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      // Then unhealthy again - should restart from attempt 1
      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            vocalCoach: { status: 'unhealthy', message: 'Not responding' }
          }
        })
      );

      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(mockExecAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('restartService', () => {
    it('should execute docker restart command', async () => {
      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            producer: { status: 'unhealthy', message: 'Down' }
          }
        })
      );

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(mockExecAsync).toHaveBeenCalledWith('docker restart ai-dawg-producer');
    });

    it('should handle restart failure', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Docker command failed'));

      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            producer: { status: 'unhealthy', message: 'Down' }
          }
        })
      );

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restart'),
        expect.any(Error)
      );
    });

    it('should handle unknown service name', async () => {
      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            aiDawgDocker: { status: 'unhealthy', message: 'Down' }
          }
        })
      );

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      // aiDawgDocker not in dockerContainerMap, should be skipped
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Unknown service')
      );
    });
  });

  describe('getCurrentMetrics', () => {
    it('should return fresh metrics on first call', async () => {
      const metrics = await businessOperator.getCurrentMetrics();

      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('costs');
      expect(metrics).toHaveProperty('users');
      expect(metrics.timestamp).toBeDefined();
    });

    it('should return cached metrics within TTL', async () => {
      const metrics1 = await businessOperator.getCurrentMetrics();

      jest.advanceTimersByTime(5000); // Within 10s TTL

      const metrics2 = await businessOperator.getCurrentMetrics();

      expect(metrics1.timestamp).toBe(metrics2.timestamp);
      expect(mockHealthAggregator.checkAll).toHaveBeenCalledTimes(1);
    });

    it('should fetch fresh metrics after TTL expires', async () => {
      await businessOperator.getCurrentMetrics();

      jest.advanceTimersByTime(11000); // Beyond 10s TTL

      await businessOperator.getCurrentMetrics();

      expect(mockHealthAggregator.checkAll).toHaveBeenCalledTimes(2);
    });

    it('should handle health check timeout', async () => {
      mockHealthAggregator.checkAll.mockImplementation(
        () => new Promise<any>(() => {}) // Never resolves
      );

      const metricsPromise = businessOperator.getCurrentMetrics();

      jest.advanceTimersByTime(3001);

      const metrics = await metricsPromise;

      expect(metrics).toHaveProperty('uptime');
    });

    it('should return default metrics on error', async () => {
      mockHealthAggregator.checkAll.mockRejectedValue(new Error('Health check failed'));

      const metrics = await businessOperator.getCurrentMetrics();

      expect(metrics.uptime.overall).toBe(0);
      expect(metrics.costs.total).toBe(0);
      expect(metrics.users.active).toBe(0);
    });

    it('should return cached metrics on timeout', async () => {
      const metrics1 = await businessOperator.getCurrentMetrics();

      mockHealthAggregator.checkAll.mockImplementation(
        () => new Promise<any>(() => {}) // Never resolves
      );

      jest.advanceTimersByTime(11000);

      const metricsPromise = businessOperator.getCurrentMetrics();
      jest.advanceTimersByTime(3001);
      const metrics2 = await metricsPromise;

      expect(metrics2.timestamp).toBe(metrics1.timestamp);
    });
  });

  describe('getAlerts', () => {
    it('should return empty array initially', () => {
      const alerts = businessOperator.getAlerts();

      expect(alerts).toEqual([]);
    });

    it('should return recent alerts', async () => {
      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            vocalCoach: { status: 'unhealthy', message: 'Down' }
          }
        })
      );

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      const alerts = businessOperator.getAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0]).toHaveProperty('service');
      expect(alerts[0]).toHaveProperty('severity');
      expect(alerts[0]).toHaveProperty('message');
    });

    it('should limit alerts to specified count', async () => {
      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            vocalCoach: { status: 'unhealthy', message: 'Down' }
          }
        })
      );

      await businessOperator.start();

      // Generate multiple alerts
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(30000);
        await jest.runOnlyPendingTimersAsync();
      }

      const alerts = businessOperator.getAlerts(2);

      expect(alerts.length).toBeLessThanOrEqual(2);
    });

    it('should handle zero limit', () => {
      const alerts = businessOperator.getAlerts(0);

      expect(alerts).toEqual([]);
    });

    it('should handle negative limit', () => {
      const alerts = businessOperator.getAlerts(-5);

      expect(alerts).toEqual([]);
    });
  });

  describe('getCurrentHealth', () => {
    it('should return current health status', async () => {
      const health = await businessOperator.getCurrentHealth();

      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('timestamp');
    });

    it('should call health aggregator', async () => {
      await businessOperator.getCurrentHealth();

      expect(mockHealthAggregator.checkAll).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockHealthAggregator.checkAll.mockRejectedValue(new Error('Failed'));

      await expect(businessOperator.getCurrentHealth()).rejects.toThrow('Failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null service health', async () => {
      mockHealthAggregator.checkAll.mockResolvedValue({
        overall: 'healthy',
        services: {
          aiDawgBackend: null as any,
          aiDawgDocker: { status: 'healthy' },
          vocalCoach: { status: 'healthy' },
          producer: { status: 'healthy' },
          aiBrain: { status: 'healthy' },
          postgres: { status: 'healthy' },
          redis: { status: 'healthy' }
        },
        timestamp: new Date().toISOString()
      });

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(console.error).not.toHaveBeenCalled();
    });

    it('should handle undefined service health', async () => {
      mockHealthAggregator.checkAll.mockResolvedValue({
        overall: 'healthy',
        services: {
          aiDawgBackend: undefined as any,
          aiDawgDocker: { status: 'healthy' },
          vocalCoach: { status: 'healthy' },
          producer: { status: 'healthy' },
          aiBrain: { status: 'healthy' },
          postgres: { status: 'healthy' },
          redis: { status: 'healthy' }
        },
        timestamp: new Date().toISOString()
      });

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(console.error).not.toHaveBeenCalled();
    });

    it('should handle NaN in metrics', async () => {
      mockedBusinessIntelligence.getSnapshot.mockReturnValue({
        aiUsage: {
          totalCalls: NaN,
          totalCost: NaN,
          byModel: {
            openai: { calls: NaN, cost: NaN, tokens: NaN },
            anthropic: { calls: 0, cost: 0, tokens: 0 },
            gemini: { calls: 0, cost: 0, tokens: 0 }
          }
        },
        users: {
          totalSessions: NaN,
          activeSessions: NaN,
          activeUsers: NaN,
          newUsers: NaN,
          bySource: { desktop: NaN, web: NaN, chatgpt: NaN, iphone: NaN }
        },
        requests: {
          total: NaN,
          requestsPerMinute: NaN,
          errorRate: NaN,
          avgResponseTime: NaN
        },
        timestamp: new Date()
      });

      const metrics = await businessOperator.getCurrentMetrics();

      expect(metrics).toBeDefined();
    });

    it('should handle Infinity in metrics', async () => {
      mockedBusinessIntelligence.getSnapshot.mockReturnValue({
        aiUsage: {
          totalCalls: Infinity,
          totalCost: Infinity,
          byModel: {
            openai: { calls: Infinity, cost: Infinity, tokens: Infinity },
            anthropic: { calls: 0, cost: 0, tokens: 0 },
            gemini: { calls: 0, cost: 0, tokens: 0 }
          }
        },
        users: {
          totalSessions: 10,
          activeSessions: 5,
          activeUsers: 3,
          newUsers: 1,
          bySource: { desktop: 5, web: 3, chatgpt: 2, iphone: 0 }
        },
        requests: {
          total: 500,
          requestsPerMinute: 8.33,
          errorRate: 0.02,
          avgResponseTime: 150
        },
        timestamp: new Date()
      });

      const metrics = await businessOperator.getCurrentMetrics();

      expect(metrics).toBeDefined();
    });
  });

  describe('Event Emitters', () => {
    it('should emit health-update events', async () => {
      const listener = jest.fn();
      businessOperator.on('health-update', listener);

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(listener).toHaveBeenCalled();
    });

    it('should emit alert events', async () => {
      const listener = jest.fn();
      businessOperator.on('alert', listener);

      mockHealthAggregator.checkAll.mockResolvedValue(
        createMockHealthStatus({
          services: {
            ...createMockHealthStatus().services,
            vocalCoach: { status: 'degraded', message: 'Slow' }
          }
        })
      );

      await businessOperator.start();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();

      expect(listener).toHaveBeenCalled();
    });

    it('should emit metrics-update events', async () => {
      const listener = jest.fn();
      businessOperator.on('metrics-update', listener);

      await businessOperator.start();
      jest.advanceTimersByTime(300000); // 5 minutes
      await jest.runOnlyPendingTimersAsync();

      expect(listener).toHaveBeenCalled();
    });
  });
});
