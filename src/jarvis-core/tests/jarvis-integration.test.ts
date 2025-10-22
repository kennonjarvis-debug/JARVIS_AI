/**
 * Jarvis Integration Tests
 * Tests full Jarvis system integration
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { moduleRegistry } from '../core/module-registry';
import { JarvisController } from '../core/jarvis.controller';
import { jarvisScheduler } from '../core/jarvis.scheduler';
import { jarvisMonitor } from '../core/jarvis.monitor';
import { loadAllModules } from '../core/load-modules';

describe('Jarvis Integration', () => {
  let jarvisController: JarvisController;

  beforeAll(async () => {
    // Load all modules
    await loadAllModules();

    // Initialize controller
    jarvisController = JarvisController.getInstance();
    await jarvisController.initialize();

    // Initialize scheduler
    await jarvisScheduler.initialize();

    // Start monitoring
    jarvisMonitor.start(60000); // 1 minute intervals for tests
  });

  afterAll(async () => {
    // Cleanup
    await jarvisController.shutdown();
    jarvisMonitor.shutdown();
    await jarvisScheduler.shutdown();
    moduleRegistry.reset();
  });

  describe('Module Registration', () => {
    it('should register all 4 modules', () => {
      const stats = moduleRegistry.getStats();
      expect(stats.totalModules).toBe(4);
    });

    it('should have music module registered', () => {
      expect(moduleRegistry.hasModule('music')).toBe(true);
    });

    it('should have marketing module registered', () => {
      expect(moduleRegistry.hasModule('marketing')).toBe(true);
    });

    it('should have engagement module registered', () => {
      expect(moduleRegistry.hasModule('engagement')).toBe(true);
    });

    it('should have automation module registered', () => {
      expect(moduleRegistry.hasModule('automation')).toBe(true);
    });

    it('should have all modules enabled', () => {
      const stats = moduleRegistry.getStats();
      expect(stats.enabledModules).toBe(4);
    });
  });

  describe('Module Initialization', () => {
    it('should initialize all modules', () => {
      const stats = moduleRegistry.getStats();
      expect(stats.initializedModules).toBe(4);
    });

    it('should initialize modules in priority order', () => {
      const order = moduleRegistry.getInitializationOrder();
      expect(order).toContain('music');
      expect(order).toContain('marketing');
      expect(order).toContain('engagement');
      expect(order).toContain('automation');
      expect(order.indexOf('music')).toBeLessThan(order.indexOf('marketing'));
    });
  });

  describe('Controller Integration', () => {
    it('should have controller initialized', () => {
      expect(jarvisController.isInitialized()).toBe(true);
    });

    it('should provide controller statistics', () => {
      const stats = jarvisController.getStats();
      expect(stats.initialized).toBe(true);
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should execute command on music module', async () => {
      const result = await jarvisController.executeCommand({
        id: 'test-1',
        module: 'music',
        action: 'get-models',
        parameters: {},
        timestamp: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.metadata.module).toBe('music');
      expect(result.metadata.executionTime).toBeGreaterThan(0);
    });

    it('should execute command on marketing module', async () => {
      const result = await jarvisController.executeCommand({
        id: 'test-2',
        module: 'marketing',
        action: 'get-campaigns',
        parameters: {},
        timestamp: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.metadata.module).toBe('marketing');
    });

    it('should handle invalid module gracefully', async () => {
      const result = await jarvisController.executeCommand({
        id: 'test-invalid',
        module: 'invalid-module',
        action: 'test',
        parameters: {},
        timestamp: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Scheduler Integration', () => {
    it('should register scheduled jobs', () => {
      const stats = jarvisScheduler.getStats();
      expect(stats.totalJobs).toBeGreaterThan(0);
    });

    it('should have jobs from all modules', () => {
      const stats = jarvisScheduler.getStats();
      expect(Object.keys(stats.jobsByModule).length).toBeGreaterThan(0);
    });

    it('should provide job statistics', () => {
      const stats = jarvisScheduler.getStats();
      expect(stats.totalJobs).toBeGreaterThan(0);
      expect(stats.activeJobs).toBeGreaterThanOrEqual(0);
    });

    it('should list registered jobs', () => {
      const jobs = jarvisScheduler.getRegisteredJobs();
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0]).toHaveProperty('jobKey');
      expect(jobs[0]).toHaveProperty('moduleName');
      expect(jobs[0]).toHaveProperty('jobId');
    });
  });

  describe('Health Monitoring', () => {
    it('should perform health check', async () => {
      const health = await jarvisMonitor.performHealthCheck();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should provide module health status', async () => {
      const health = await jarvisMonitor.performHealthCheck();
      expect(health.modules).toBeDefined();
      expect(Object.keys(health.modules).length).toBe(4);
    });

    it('should provide system metrics', async () => {
      const health = await jarvisMonitor.performHealthCheck();
      expect(health.metrics.totalModules).toBe(4);
      expect(health.metrics.healthyModules).toBeGreaterThanOrEqual(0);
    });

    it('should track health history', () => {
      const history = jarvisMonitor.getHealthHistory(10);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should provide monitor statistics', () => {
      const stats = jarvisMonitor.getStats();
      expect(stats.isRunning).toBe(true);
      expect(stats.currentSystemStatus).toBeDefined();
    });
  });

  describe('System Health', () => {
    it('should have healthy system status', async () => {
      const health = await jarvisController.getSystemHealth();
      expect(health.status).toBeDefined();
      expect(health.metrics.totalModules).toBe(4);
    });

    it('should aggregate module health', async () => {
      const health = await jarvisController.getSystemHealth();
      const healthyCount = health.metrics.healthyModules;
      const degradedCount = health.metrics.degradedModules;
      const unhealthyCount = health.metrics.unhealthyModules;

      expect(healthyCount + degradedCount + unhealthyCount).toBe(4);
    });
  });

  describe('Module Configuration', () => {
    it('should have correct module priorities', () => {
      const stats = moduleRegistry.getStats();
      const musicModule = stats.moduleList.find(m => m.name === 'music');
      const marketingModule = stats.moduleList.find(m => m.name === 'marketing');

      expect(musicModule).toBeDefined();
      expect(marketingModule).toBeDefined();
      expect(musicModule!.priority).toBeLessThan(marketingModule!.priority);
    });

    it('should have module versions', () => {
      const stats = moduleRegistry.getStats();
      stats.moduleList.forEach(module => {
        expect(module.version).toBeDefined();
        expect(module.version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle module not found', async () => {
      const result = await jarvisController.executeCommand({
        id: 'test-error-1',
        module: 'nonexistent',
        action: 'test',
        parameters: {},
        timestamp: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle invalid action', async () => {
      const result = await jarvisController.executeCommand({
        id: 'test-error-2',
        module: 'music',
        action: 'nonexistent-action',
        parameters: {},
        timestamp: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should provide error metadata', async () => {
      const result = await jarvisController.executeCommand({
        id: 'test-error-3',
        module: 'invalid',
        action: 'test',
        parameters: {},
        timestamp: new Date(),
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toBeInstanceOf(Date);
    });
  });
});
