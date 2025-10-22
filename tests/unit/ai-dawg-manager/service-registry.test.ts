/**
 * AI DAWG Manager - Service Registry Tests
 * Tests for service state management and persistence
 */

import { ServiceRegistry } from '../../../src/ai-dawg-manager/service-registry';
import { ServiceState } from '../../../src/ai-dawg-manager/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;
  const testDataDir = '/tmp/test-ai-dawg-data';
  const stateFilePath = path.join(testDataDir, 'service-state.json');

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fs.existsSync to return false (no existing state)
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    // Mock fs.writeFileSync to do nothing
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    // Mock fs.readFileSync
    (fs.readFileSync as jest.Mock).mockReturnValue('[]');

    registry = new ServiceRegistry(testDataDir);
  });

  describe('Service Initialization', () => {
    it('should initialize a new service with correct default state', () => {
      registry.initService('test-service', 8001);

      const state = registry.getState('test-service');

      expect(state).toBeDefined();
      expect(state?.name).toBe('test-service');
      expect(state?.port).toBe(8001);
      expect(state?.status).toBe('unknown');
      expect(state?.restart_count).toBe(0);
      expect(state?.consecutive_failures).toBe(0);
    });

    it('should not reinitialize an existing service', () => {
      registry.initService('test-service', 8001);
      registry.updateState('test-service', { status: 'running' });

      // Try to init again
      registry.initService('test-service', 8001);

      const state = registry.getState('test-service');
      expect(state?.status).toBe('running'); // Should preserve previous state
    });

    it('should persist state when initializing service', () => {
      registry.initService('test-service', 8001);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('State Updates', () => {
    beforeEach(() => {
      registry.initService('test-service', 8001);
    });

    it('should update service state correctly', () => {
      registry.updateState('test-service', {
        status: 'running',
        pid: 12345,
        uptime: Date.now()
      });

      const state = registry.getState('test-service');
      expect(state?.status).toBe('running');
      expect(state?.pid).toBe(12345);
      expect(state?.uptime).toBeDefined();
    });

    it('should preserve existing state when updating', () => {
      registry.updateState('test-service', { status: 'running', pid: 12345 });
      registry.updateState('test-service', { restart_count: 1 });

      const state = registry.getState('test-service');
      expect(state?.status).toBe('running'); // Preserved
      expect(state?.pid).toBe(12345); // Preserved
      expect(state?.restart_count).toBe(1); // Updated
    });

    it('should persist state after each update', () => {
      registry.updateState('test-service', { status: 'running' });

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Service Status Management', () => {
    beforeEach(() => {
      registry.initService('test-service', 8001);
    });

    it('should mark service as running with PID', () => {
      const pid = 12345;
      registry.markRunning('test-service', pid);

      const state = registry.getState('test-service');
      expect(state?.status).toBe('running');
      expect(state?.pid).toBe(pid);
      expect(state?.uptime).toBeDefined();
      expect(state?.consecutive_failures).toBe(0);
    });

    it('should mark service as stopped', () => {
      registry.markRunning('test-service', 12345);
      registry.markStopped('test-service');

      const state = registry.getState('test-service');
      expect(state?.status).toBe('stopped');
      expect(state?.pid).toBeUndefined();
      expect(state?.uptime).toBeUndefined();
    });

    it('should mark service as unhealthy and increment failures', () => {
      registry.markUnhealthy('test-service');

      const state = registry.getState('test-service');
      expect(state?.status).toBe('unhealthy');
      expect(state?.consecutive_failures).toBe(1);
      expect(state?.last_health_check).toBeDefined();
    });

    it('should mark service as healthy and reset failures', () => {
      registry.markUnhealthy('test-service');
      registry.markUnhealthy('test-service');
      registry.markHealthy('test-service');

      const state = registry.getState('test-service');
      expect(state?.status).toBe('running');
      expect(state?.consecutive_failures).toBe(0);
      expect(state?.last_health_check).toBeDefined();
    });
  });

  describe('Restart Management', () => {
    beforeEach(() => {
      registry.initService('test-service', 8001);
    });

    it('should increment restart count', () => {
      registry.incrementRestartCount('test-service');

      const state = registry.getState('test-service');
      expect(state?.restart_count).toBe(1);
      expect(state?.last_restart).toBeDefined();
    });

    it('should reset restart count', () => {
      registry.incrementRestartCount('test-service');
      registry.incrementRestartCount('test-service');
      registry.resetRestartCount('test-service');

      const state = registry.getState('test-service');
      expect(state?.restart_count).toBe(0);
    });

    it('should check if service can restart within max attempts', () => {
      const maxAttempts = 3;

      expect(registry.canRestart('test-service', maxAttempts)).toBe(true);

      registry.incrementRestartCount('test-service');
      expect(registry.canRestart('test-service', maxAttempts)).toBe(true);

      registry.incrementRestartCount('test-service');
      registry.incrementRestartCount('test-service');
      expect(registry.canRestart('test-service', maxAttempts)).toBe(false);
    });
  });

  describe('Escalation Detection', () => {
    beforeEach(() => {
      registry.initService('test-service', 8001);
    });

    it('should detect when escalation is needed', () => {
      const threshold = 5;

      expect(registry.needsEscalation('test-service', threshold)).toBe(false);

      // Simulate consecutive failures
      for (let i = 0; i < 5; i++) {
        registry.markUnhealthy('test-service');
      }

      expect(registry.needsEscalation('test-service', threshold)).toBe(true);
    });
  });

  describe('Service Queries', () => {
    beforeEach(() => {
      registry.initService('service-1', 8001);
      registry.initService('service-2', 8002);
      registry.initService('service-3', 8003);

      registry.markRunning('service-1', 11111);
      registry.markStopped('service-2');
      registry.markUnhealthy('service-3');
    });

    it('should get all services', () => {
      const services = registry.getAllServices();

      expect(services).toHaveLength(3);
      expect(services.map(s => s.name)).toContain('service-1');
      expect(services.map(s => s.name)).toContain('service-2');
      expect(services.map(s => s.name)).toContain('service-3');
    });

    it('should get service summary', () => {
      const summary = registry.getSummary();

      expect(summary.total).toBe(3);
      expect(summary.running).toBe(1);
      expect(summary.stopped).toBe(1);
      expect(summary.unhealthy).toBe(1);
      expect(summary.unknown).toBe(0);
    });
  });

  describe('State Persistence', () => {
    it('should handle load errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });

      // Should not throw
      const newRegistry = new ServiceRegistry(testDataDir);
      expect(newRegistry.getAllServices()).toEqual([]);
    });

    it('should handle save errors gracefully', () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File write error');
      });

      // Should not throw
      expect(() => {
        registry.initService('test-service', 8001);
      }).not.toThrow();
    });

    it('should load existing state from file', () => {
      const existingState: [string, ServiceState][] = [
        ['service-1', {
          name: 'service-1',
          port: 8001,
          status: 'running',
          pid: 12345,
          uptime: Date.now(),
          restart_count: 0,
          consecutive_failures: 0
        }]
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(existingState));

      const newRegistry = new ServiceRegistry(testDataDir);
      const state = newRegistry.getState('service-1');

      expect(state?.name).toBe('service-1');
      expect(state?.status).toBe('running');
      expect(state?.pid).toBe(12345);
    });
  });
});
