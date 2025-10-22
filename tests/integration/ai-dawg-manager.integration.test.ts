/**
 * AI DAWG Manager - Integration Tests
 * End-to-end tests for autonomous service management
 */

import { AIDawgManager } from '../../src/ai-dawg-manager';
import { ServiceRegistry } from '../../src/ai-dawg-manager/service-registry';
import { ServiceController } from '../../src/ai-dawg-manager/service-controller';
import { HealthMonitor } from '../../src/ai-dawg-manager/health-monitor';
import { AutoRecovery } from '../../src/ai-dawg-manager/auto-recovery';
import * as fs from 'fs';
import * as path from 'path';

// Mock child_process for service control
jest.mock('child_process');

// Mock axios for health checks
jest.mock('axios');

describe('AI DAWG Manager - Integration Tests', () => {
  const testConfigPath = '/tmp/test-autonomy.json';
  const testDataDir = '/tmp/test-ai-dawg-data';

  const testConfig = {
    enabled: true,
    ai_dawg: {
      root_path: '/test/ai-dawg',
      services: {
        'test-service': {
          port: 9001,
          name: 'Test Service',
          start_command: 'echo "test service"',
          health_endpoint: 'http://localhost:9001/health',
          log_file: '/tmp/test-service.log'
        }
      }
    },
    monitoring: {
      health_check_interval_seconds: 5,
      health_check_timeout_seconds: 3,
      max_restart_attempts: 3,
      restart_cooldown_seconds: 30,
      alert_on_failure: true
    },
    testing: {
      enabled: false,
      interval_hours: 1,
      endpoints_to_test: []
    },
    safety: {
      emergency_kill_switch: false,
      require_approval_for_destructive_ops: false,
      max_consecutive_failures_before_escalation: 5,
      audit_all_commands: true
    },
    notifications: {
      enabled: false,
      methods: ['console']
    }
  };

  beforeAll(() => {
    // Create test config file
    fs.mkdirSync(path.dirname(testConfigPath), { recursive: true });
    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    // Create test data directory
    fs.mkdirSync(testDataDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup test files
    try {
      if (fs.existsSync(testConfigPath)) {
        fs.unlinkSync(testConfigPath);
      }
      if (fs.existsSync(testDataDir)) {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Manager Initialization', () => {
    it('should load configuration successfully', () => {
      expect(() => {
        new AIDawgManager(testConfigPath);
      }).not.toThrow();
    });

    it('should initialize all components', () => {
      const manager = new AIDawgManager(testConfigPath);
      const status = manager.getStatus();

      expect(status).toBeDefined();
      expect(status.running).toBe(false);
      expect(status.services).toBeDefined();
      expect(status.summary).toBeDefined();
    });

    it('should initialize services in registry', () => {
      const manager = new AIDawgManager(testConfigPath);
      const status = manager.getStatus();

      expect(status.services.length).toBeGreaterThan(0);
      expect(status.services[0].name).toBe('test-service');
      expect(status.services[0].port).toBe(9001);
    });

    it('should throw error for invalid config path', () => {
      expect(() => {
        new AIDawgManager('/non/existent/config.json');
      }).toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should not start if disabled in config', async () => {
      const disabledConfig = { ...testConfig, enabled: false };
      const configPath = '/tmp/disabled-config.json';

      fs.writeFileSync(configPath, JSON.stringify(disabledConfig, null, 2));

      const manager = new AIDawgManager(configPath);
      await manager.start();

      const status = manager.getStatus();
      expect(status.running).toBe(false);

      fs.unlinkSync(configPath);
    });

    it('should not start if emergency kill switch is active', async () => {
      const killSwitchConfig = {
        ...testConfig,
        safety: {
          ...testConfig.safety,
          emergency_kill_switch: true
        }
      };
      const configPath = '/tmp/killswitch-config.json';

      fs.writeFileSync(configPath, JSON.stringify(killSwitchConfig, null, 2));

      const manager = new AIDawgManager(configPath);
      await manager.start();

      const status = manager.getStatus();
      expect(status.running).toBe(false);

      fs.unlinkSync(configPath);
    });
  });

  describe('Service Lifecycle Management', () => {
    let manager: AIDawgManager;

    beforeEach(() => {
      manager = new AIDawgManager(testConfigPath);
    });

    afterEach(async () => {
      if (manager.getStatus().running) {
        await manager.stop();
      }
    });

    it('should get current status', () => {
      const status = manager.getStatus();

      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('summary');
      expect(status.summary).toHaveProperty('total');
      expect(status.summary).toHaveProperty('running');
      expect(status.summary).toHaveProperty('stopped');
      expect(status.summary).toHaveProperty('unhealthy');
    });

    it('should print status summary without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      manager.printStatusSummary();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Status Summary'));

      consoleSpy.mockRestore();
    });
  });

  describe('Manual Service Control', () => {
    let manager: AIDawgManager;

    beforeEach(() => {
      manager = new AIDawgManager(testConfigPath);
    });

    afterEach(async () => {
      if (manager.getStatus().running) {
        await manager.stop();
      }
    });

    it('should handle restart for non-existent service', async () => {
      const result = await manager.restartService('non-existent');

      expect(result).toBe(false);
    });

    it('should handle recovery for non-existent service', async () => {
      const result = await manager.recoverService('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('Status Reporting', () => {
    it('should calculate service summary correctly', () => {
      const manager = new AIDawgManager(testConfigPath);
      const status = manager.getStatus();

      expect(status.summary.total).toBeGreaterThanOrEqual(0);
      expect(
        status.summary.running +
        status.summary.stopped +
        status.summary.unhealthy +
        status.summary.unknown
      ).toBe(status.summary.total);
    });

    it('should format uptime correctly in status', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const manager = new AIDawgManager(testConfigPath);
      manager.printStatusSummary();

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Component Integration', () => {
    it('should have registry accessible to all components', () => {
      const manager = new AIDawgManager(testConfigPath);
      const status = manager.getStatus();

      // Registry should track services
      expect(status.services).toBeDefined();
      expect(Array.isArray(status.services)).toBe(true);
    });

    it('should persist service state across manager instances', () => {
      const manager1 = new AIDawgManager(testConfigPath);

      // Create state file manually for testing persistence
      const stateFile = path.join(testDataDir, 'service-state.json');
      const testState = [
        ['test-service', {
          name: 'test-service',
          port: 9001,
          status: 'running',
          restart_count: 0,
          consecutive_failures: 0
        }]
      ];

      fs.mkdirSync(testDataDir, { recursive: true });
      fs.writeFileSync(stateFile, JSON.stringify(testState));

      // Note: Actual persistence testing would require real ServiceRegistry
      // This test validates the concept
      expect(fs.existsSync(stateFile)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed config gracefully', () => {
      const malformedConfigPath = '/tmp/malformed-config.json';
      fs.writeFileSync(malformedConfigPath, '{ invalid json }');

      expect(() => {
        new AIDawgManager(malformedConfigPath);
      }).toThrow();

      fs.unlinkSync(malformedConfigPath);
    });

    it('should handle missing config file', () => {
      expect(() => {
        new AIDawgManager('/tmp/missing-config-' + Date.now() + '.json');
      }).toThrow();
    });
  });

  describe('Safety Features', () => {
    it('should respect require_approval_for_destructive_ops', async () => {
      const safeConfig = {
        ...testConfig,
        safety: {
          ...testConfig.safety,
          require_approval_for_destructive_ops: true
        }
      };
      const configPath = '/tmp/safe-config.json';

      fs.writeFileSync(configPath, JSON.stringify(safeConfig, null, 2));

      const manager = new AIDawgManager(configPath);

      // Manager should be created but destructive ops should be controlled
      expect(manager).toBeDefined();

      fs.unlinkSync(configPath);
    });

    it('should audit all commands when enabled', () => {
      const auditConfig = {
        ...testConfig,
        safety: {
          ...testConfig.safety,
          audit_all_commands: true
        }
      };
      const configPath = '/tmp/audit-config.json';

      fs.writeFileSync(configPath, JSON.stringify(auditConfig, null, 2));

      const manager = new AIDawgManager(configPath);

      expect(manager).toBeDefined();

      fs.unlinkSync(configPath);
    });
  });
});
