/**
 * AI DAWG Manager - Health Monitor Tests
 * Tests for continuous service health monitoring
 */

import { HealthMonitor } from '../../../src/ai-dawg-manager/health-monitor';
import { ServiceRegistry } from '../../../src/ai-dawg-manager/service-registry';
import { AutomonyConfig, ServiceConfig, HealthCheckResult } from '../../../src/ai-dawg-manager/types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock ServiceRegistry
jest.mock('../../../src/ai-dawg-manager/service-registry');

describe('HealthMonitor', () => {
  let monitor: HealthMonitor;
  let mockRegistry: jest.Mocked<ServiceRegistry>;
  let config: AutomonyConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock config
    config = {
      enabled: true,
      ai_dawg: {
        root_path: '/test/path',
        services: {
          'test-service': {
            port: 8001,
            name: 'Test Service',
            start_command: 'test-command',
            health_endpoint: 'http://localhost:8001/health',
            log_file: '/test/log.log',
            enabled: true
          },
          'disabled-service': {
            port: 8002,
            name: 'Disabled Service',
            start_command: 'test-command',
            health_endpoint: 'http://localhost:8002/health',
            log_file: '/test/log.log',
            enabled: false
          }
        }
      },
      monitoring: {
        health_check_interval_seconds: 10,
        health_check_timeout_seconds: 5,
        max_restart_attempts: 3,
        restart_cooldown_seconds: 60,
        alert_on_failure: true
      },
      testing: {
        enabled: true,
        interval_hours: 1,
        endpoints_to_test: []
      },
      safety: {
        emergency_kill_switch: false,
        require_approval_for_destructive_ops: true,
        max_consecutive_failures_before_escalation: 5,
        audit_all_commands: true
      },
      notifications: {
        enabled: false,
        methods: ['console']
      }
    };

    // Create mock registry
    mockRegistry = new ServiceRegistry() as jest.Mocked<ServiceRegistry>;
    mockRegistry.markHealthy = jest.fn();
    mockRegistry.markUnhealthy = jest.fn();

    monitor = new HealthMonitor(mockRegistry, config);
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('Health Check - Success Cases', () => {
    it('should return healthy status for 200 response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'ok' }
      });

      const serviceConfig: ServiceConfig = config.ai_dawg.services['test-service'];
      const result = await monitor.checkServiceHealth('test-service', serviceConfig);

      expect(result.healthy).toBe(true);
      expect(result.status_code).toBe(200);
      expect(result.service).toBe('test-service');
      expect(result.response_time_ms).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should accept 2xx and 3xx status codes as healthy', async () => {
      const healthyCodes = [200, 201, 204, 301, 302];

      for (const code of healthyCodes) {
        mockedAxios.get.mockResolvedValueOnce({ status: code, data: {} });

        const serviceConfig: ServiceConfig = config.ai_dawg.services['test-service'];
        const result = await monitor.checkServiceHealth('test-service', serviceConfig);

        expect(result.healthy).toBe(true);
        expect(result.status_code).toBe(code);
      }
    });
  });

  describe('Health Check - Failure Cases', () => {
    it('should return unhealthy for 4xx responses', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 404,
        data: {}
      });

      const serviceConfig: ServiceConfig = config.ai_dawg.services['test-service'];
      const result = await monitor.checkServiceHealth('test-service', serviceConfig);

      expect(result.healthy).toBe(false);
      expect(result.status_code).toBe(404);
    });

    it('should return unhealthy for 5xx responses', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 500,
        data: {}
      });

      const serviceConfig: ServiceConfig = config.ai_dawg.services['test-service'];
      const result = await monitor.checkServiceHealth('test-service', serviceConfig);

      expect(result.healthy).toBe(false);
      expect(result.status_code).toBe(500);
    });

    it('should handle connection refused errors', async () => {
      const error = new Error('connect ECONNREFUSED');
      (error as any).code = 'ECONNREFUSED';
      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const serviceConfig: ServiceConfig = config.ai_dawg.services['test-service'];
      const result = await monitor.checkServiceHealth('test-service', serviceConfig);

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('ECONNREFUSED');
    });

    it('should handle timeout errors', async () => {
      const error = new Error('timeout of 5000ms exceeded');
      (error as any).code = 'ETIMEDOUT';
      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const serviceConfig: ServiceConfig = config.ai_dawg.services['test-service'];
      const result = await monitor.checkServiceHealth('test-service', serviceConfig);

      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should respect timeout configuration', async () => {
      const serviceConfig: ServiceConfig = config.ai_dawg.services['test-service'];

      mockedAxios.get.mockResolvedValueOnce({ status: 200, data: {} });

      await monitor.checkServiceHealth('test-service', serviceConfig);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        serviceConfig.health_endpoint,
        expect.objectContaining({
          timeout: config.monitoring.health_check_timeout_seconds * 1000
        })
      );
    });
  });

  describe('Monitoring Lifecycle', () => {
    it('should start monitoring with correct interval', () => {
      jest.useFakeTimers();

      const callback = jest.fn();
      monitor.start(callback);

      // Should not call immediately (waits for first interval)
      expect(mockedAxios.get).toHaveBeenCalled();

      jest.advanceTimersByTime(config.monitoring.health_check_interval_seconds * 1000);

      expect(mockedAxios.get).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should not start if already running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      monitor.start();
      monitor.start(); // Try to start again

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already running'));

      consoleSpy.mockRestore();
    });

    it('should stop monitoring', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      monitor.start();
      monitor.stop();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('stopped'));

      consoleSpy.mockRestore();
    });

    it('should skip disabled services during monitoring', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      monitor.start();

      // Wait a bit for monitoring to run
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not check disabled service
      const calls = mockedAxios.get.mock.calls;
      const disabledServiceCalls = calls.filter(call =>
        call[0]?.includes('localhost:8002')
      );

      expect(disabledServiceCalls).toHaveLength(0);
    });
  });

  describe('Registry Integration', () => {
    it('should mark service as healthy in registry on success', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 200, data: {} });

      const serviceConfig: ServiceConfig = config.ai_dawg.services['test-service'];
      await monitor.checkServiceHealth('test-service', serviceConfig);

      monitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockRegistry.markHealthy).toHaveBeenCalled();
    });

    it('should mark service as unhealthy in registry on failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection failed'));
      mockedAxios.isAxiosError.mockReturnValue(true);

      const serviceConfig: ServiceConfig = config.ai_dawg.services['test-service'];
      await monitor.checkServiceHealth('test-service', serviceConfig);

      monitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockRegistry.markUnhealthy).toHaveBeenCalled();
    });

    it('should trigger callback on unhealthy service', async () => {
      const callback = jest.fn();

      mockedAxios.get.mockRejectedValueOnce(new Error('Connection failed'));
      mockedAxios.isAxiosError.mockReturnValue(true);

      monitor.start(callback);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Health Status Queries', () => {
    it('should get health status for all services', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const status = await monitor.getHealthStatus();

      expect(status).toHaveProperty('test-service');
      expect(status['test-service'].healthy).toBe(true);
    });

    it('should check if all services are healthy', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const allHealthy = await monitor.areAllServicesHealthy();

      expect(allHealthy).toBe(true);
    });

    it('should return false if any service is unhealthy', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Failed'));
      mockedAxios.isAxiosError.mockReturnValue(true);

      const allHealthy = await monitor.areAllServicesHealthy();

      expect(allHealthy).toBe(false);
    });

    it('should get list of unhealthy services', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200, data: {} }) // test-service healthy
        .mockRejectedValueOnce(new Error('Failed')); // another service unhealthy

      const unhealthy = await monitor.getUnhealthyServices();

      expect(Array.isArray(unhealthy)).toBe(true);
    });
  });

  describe('Response Time Tracking', () => {
    it('should track response time correctly', async () => {
      mockedAxios.get.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ status: 200, data: {} }), 100)
        )
      );

      const serviceConfig: ServiceConfig = config.ai_dawg.services['test-service'];
      const result = await monitor.checkServiceHealth('test-service', serviceConfig);

      expect(result.response_time_ms).toBeGreaterThanOrEqual(90);
      expect(result.response_time_ms).toBeLessThan(200);
    });
  });
});
