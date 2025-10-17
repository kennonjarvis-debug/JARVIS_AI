/**
 * AI DAWG Manager - Auto-Recovery Tests
 * Tests for intelligent service recovery and escalation
 */

import { AutoRecovery } from '../../../src/ai-dawg-manager/auto-recovery';
import { ServiceRegistry } from '../../../src/ai-dawg-manager/service-registry';
import { ServiceController } from '../../../src/ai-dawg-manager/service-controller';
import { AutomonyConfig, HealthCheckResult, ServiceState } from '../../../src/ai-dawg-manager/types';

// Mock dependencies
jest.mock('../../../src/ai-dawg-manager/service-registry');
jest.mock('../../../src/ai-dawg-manager/service-controller');

describe('AutoRecovery', () => {
  let autoRecovery: AutoRecovery;
  let mockRegistry: jest.Mocked<ServiceRegistry>;
  let mockController: jest.Mocked<ServiceController>;
  let config: AutomonyConfig;

  beforeEach(() => {
    jest.clearAllMocks();

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
            log_file: '/test/log.log'
          }
        }
      },
      monitoring: {
        health_check_interval_seconds: 30,
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

    mockRegistry = new ServiceRegistry() as jest.Mocked<ServiceRegistry>;
    mockController = new ServiceController(mockRegistry) as jest.Mocked<ServiceController>;

    autoRecovery = new AutoRecovery(mockRegistry, mockController, config);
  });

  describe('Recovery Eligibility', () => {
    it('should not recover if already in progress', async () => {
      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'Connection failed',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(true);
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'unhealthy',
        restart_count: 0,
        consecutive_failures: 1
      });

      // Start first recovery
      const firstRecovery = autoRecovery.recoverService('test-service', healthResult);

      // Try to start second recovery while first is in progress
      const secondRecovery = await autoRecovery.recoverService('test-service', healthResult);

      expect(secondRecovery).toBe(false);

      await firstRecovery;
    });

    it('should respect restart cooldown period', async () => {
      jest.useFakeTimers();

      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'Connection failed',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(true);
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'unhealthy',
        restart_count: 1,
        consecutive_failures: 1
      });

      mockController.restartService.mockResolvedValue({
        service: 'test-service',
        operation: 'restart',
        success: true,
        timestamp: new Date(),
        duration_ms: 1000
      });

      // First recovery
      await autoRecovery.recoverService('test-service', healthResult);

      // Immediately try again (within cooldown)
      const result = await autoRecovery.recoverService('test-service', healthResult);

      expect(result).toBe(false);

      // Advance time past cooldown
      jest.advanceTimersByTime(config.monitoring.restart_cooldown_seconds * 1000 + 1000);

      // Should allow recovery now
      const resultAfterCooldown = await autoRecovery.recoverService('test-service', healthResult);

      expect(mockController.restartService).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should not recover if max restart attempts reached', async () => {
      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'Connection failed',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(false); // Max attempts reached
      mockRegistry.needsEscalation.mockReturnValue(false);

      const result = await autoRecovery.recoverService('test-service', healthResult);

      expect(result).toBe(false);
      expect(mockController.restartService).not.toHaveBeenCalled();
    });
  });

  describe('Service Recovery', () => {
    it('should successfully recover unhealthy service', async () => {
      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'Connection failed',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(true);
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'unhealthy',
        restart_count: 0,
        consecutive_failures: 1
      });

      mockController.restartService.mockResolvedValue({
        service: 'test-service',
        operation: 'restart',
        success: true,
        timestamp: new Date(),
        duration_ms: 2000
      });

      const result = await autoRecovery.recoverService('test-service', healthResult);

      expect(result).toBe(true);
      expect(mockController.restartService).toHaveBeenCalledWith(
        'test-service',
        config.ai_dawg.services['test-service']
      );
    });

    it('should return false if restart fails', async () => {
      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'Connection failed',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(true);
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'unhealthy',
        restart_count: 0,
        consecutive_failures: 1
      });

      mockController.restartService.mockResolvedValue({
        service: 'test-service',
        operation: 'restart',
        success: false,
        error: 'Failed to start',
        timestamp: new Date(),
        duration_ms: 1000
      });

      const result = await autoRecovery.recoverService('test-service', healthResult);

      expect(result).toBe(false);
    });

    it('should handle service config not found', async () => {
      const healthResult: HealthCheckResult = {
        service: 'non-existent-service',
        healthy: false,
        error: 'Connection failed',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(true);

      const result = await autoRecovery.recoverService('non-existent-service', healthResult);

      expect(result).toBe(false);
      expect(mockController.restartService).not.toHaveBeenCalled();
    });

    it('should wait for service to stabilize after recovery', async () => {
      jest.useFakeTimers();

      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'Connection failed',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(true);
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'unhealthy',
        restart_count: 0,
        consecutive_failures: 1
      });

      mockController.restartService.mockResolvedValue({
        service: 'test-service',
        operation: 'restart',
        success: true,
        timestamp: new Date(),
        duration_ms: 1000
      });

      const recoveryPromise = autoRecovery.recoverService('test-service', healthResult);

      // Advance timers to complete sleep
      jest.advanceTimersByTime(5000);

      await recoveryPromise;

      jest.useRealTimers();
    });
  });

  describe('Escalation', () => {
    it('should escalate to human when max attempts reached and consecutive failures high', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'Persistent failure',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(false); // Max attempts reached
      mockRegistry.needsEscalation.mockReturnValue(true); // Needs escalation
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'unhealthy',
        restart_count: 3,
        consecutive_failures: 5
      });

      await autoRecovery.recoverService('test-service', healthResult);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ESCALATION REQUIRED'));

      consoleSpy.mockRestore();
    });

    it('should send notifications if enabled', async () => {
      config.notifications.enabled = true;

      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'Persistent failure',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(false);
      mockRegistry.needsEscalation.mockReturnValue(true);
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'unhealthy',
        restart_count: 3,
        consecutive_failures: 5
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await autoRecovery.recoverService('test-service', healthResult);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Notification'));

      consoleSpy.mockRestore();
    });
  });

  describe('Intelligent Recovery', () => {
    it('should detect port conflict errors', async () => {
      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'EADDRINUSE: address already in use',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(true);
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'unhealthy',
        restart_count: 0,
        consecutive_failures: 1
      });

      mockController.restartService.mockResolvedValue({
        service: 'test-service',
        operation: 'restart',
        success: true,
        timestamp: new Date(),
        duration_ms: 1000
      });

      await autoRecovery.performIntelligentRecovery('test-service', healthResult);

      expect(mockController.restartService).toHaveBeenCalled();
    });

    it('should handle timeout errors with extended wait', async () => {
      jest.useFakeTimers();

      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'ETIMEDOUT: connection timeout',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(true);
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'unhealthy',
        restart_count: 0,
        consecutive_failures: 1
      });

      mockController.restartService.mockResolvedValue({
        service: 'test-service',
        operation: 'restart',
        success: true,
        timestamp: new Date(),
        duration_ms: 1000
      });

      const recoveryPromise = autoRecovery.performIntelligentRecovery('test-service', healthResult);

      jest.advanceTimersByTime(10000); // Extended wait

      await recoveryPromise;

      jest.useRealTimers();
    });

    it('should detect connection refused errors', async () => {
      const healthResult: HealthCheckResult = {
        service: 'test-service',
        healthy: false,
        error: 'ECONNREFUSED: connection refused',
        timestamp: new Date()
      };

      mockRegistry.canRestart.mockReturnValue(true);
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'unhealthy',
        restart_count: 0,
        consecutive_failures: 1
      });

      mockController.restartService.mockResolvedValue({
        service: 'test-service',
        operation: 'restart',
        success: true,
        timestamp: new Date(),
        duration_ms: 1000
      });

      await autoRecovery.performIntelligentRecovery('test-service', healthResult);

      expect(mockController.restartService).toHaveBeenCalled();
    });
  });

  describe('Stability Tracking', () => {
    it('should reset counters for stable services', async () => {
      const now = Date.now();
      const stableUptime = now - (config.monitoring.restart_cooldown_seconds * 2000 + 1000);

      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'running',
        uptime: stableUptime,
        restart_count: 2,
        consecutive_failures: 0
      });

      await autoRecovery.resetCountersIfStable('test-service');

      expect(mockRegistry.resetRestartCount).toHaveBeenCalledWith('test-service');
    });

    it('should not reset counters for recently restarted services', async () => {
      const recentUptime = Date.now() - 10000; // Only 10 seconds

      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'running',
        uptime: recentUptime,
        restart_count: 2,
        consecutive_failures: 0
      });

      await autoRecovery.resetCountersIfStable('test-service');

      expect(mockRegistry.resetRestartCount).not.toHaveBeenCalled();
    });

    it('should not reset counters for non-running services', async () => {
      mockRegistry.getState.mockReturnValue({
        name: 'test-service',
        port: 8001,
        status: 'stopped',
        restart_count: 2,
        consecutive_failures: 0
      });

      await autoRecovery.resetCountersIfStable('test-service');

      expect(mockRegistry.resetRestartCount).not.toHaveBeenCalled();
    });
  });

  describe('Batch Recovery', () => {
    it('should check and recover all unhealthy services', async () => {
      config.ai_dawg.services = {
        'service-1': {
          port: 8001,
          name: 'Service 1',
          start_command: 'cmd1',
          health_endpoint: 'http://localhost:8001/health',
          log_file: '/test/log1.log'
        },
        'service-2': {
          port: 8002,
          name: 'Service 2',
          start_command: 'cmd2',
          health_endpoint: 'http://localhost:8002/health',
          log_file: '/test/log2.log'
        }
      };

      autoRecovery = new AutoRecovery(mockRegistry, mockController, config);

      mockRegistry.getState
        .mockReturnValueOnce({
          name: 'service-1',
          port: 8001,
          status: 'unhealthy',
          restart_count: 0,
          consecutive_failures: 1
        })
        .mockReturnValueOnce({
          name: 'service-2',
          port: 8002,
          status: 'running',
          restart_count: 0,
          consecutive_failures: 0
        });

      mockRegistry.canRestart.mockReturnValue(true);

      mockController.restartService.mockResolvedValue({
        service: 'service-1',
        operation: 'restart',
        success: true,
        timestamp: new Date(),
        duration_ms: 1000
      });

      await autoRecovery.checkAndRecoverAll();

      expect(mockController.restartService).toHaveBeenCalledTimes(1);
      expect(mockController.restartService).toHaveBeenCalledWith(
        'service-1',
        config.ai_dawg.services['service-1']
      );
    });
  });
});
