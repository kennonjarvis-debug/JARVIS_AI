/**
 * Auto-Recovery Engine
 * Automatically recovers failed services with intelligent retry logic
 */

import { ServiceConfig, HealthCheckResult, AutomonyConfig } from './types';
import { ServiceRegistry } from './service-registry';
import { ServiceController } from './service-controller';

export class AutoRecovery {
  private registry: ServiceRegistry;
  private controller: ServiceController;
  private config: AutomonyConfig;
  private recoveryInProgress: Set<string>;
  private lastRestartAttempt: Map<string, number>;

  constructor(
    registry: ServiceRegistry,
    controller: ServiceController,
    config: AutomonyConfig
  ) {
    this.registry = registry;
    this.controller = controller;
    this.config = config;
    this.recoveryInProgress = new Set();
    this.lastRestartAttempt = new Map();
  }

  /**
   * Attempt to recover an unhealthy service
   */
  async recoverService(
    serviceName: string,
    healthResult: HealthCheckResult
  ): Promise<boolean> {
    // Check if already recovering
    if (this.recoveryInProgress.has(serviceName)) {
      console.log(`⏳ Recovery already in progress for ${serviceName}`);
      return false;
    }

    // Check if within cooldown period
    if (!this.canAttemptRestart(serviceName)) {
      console.log(`⏸️  ${serviceName} in cooldown period, skipping recovery`);
      return false;
    }

    // Check if max restart attempts reached
    if (!this.registry.canRestart(serviceName, this.config.monitoring.max_restart_attempts)) {
      console.log(`🚨 ${serviceName} has reached max restart attempts (${this.config.monitoring.max_restart_attempts})`);

      // Check if escalation needed
      if (this.registry.needsEscalation(serviceName, this.config.safety.max_consecutive_failures_before_escalation)) {
        await this.escalateToHuman(serviceName, healthResult);
      }

      return false;
    }

    try {
      this.recoveryInProgress.add(serviceName);
      console.log(`🔧 Attempting auto-recovery for ${serviceName}...`);

      // Get service config
      const serviceConfig = this.config.ai_dawg.services[serviceName];
      if (!serviceConfig) {
        console.error(`❌ No configuration found for ${serviceName}`);
        return false;
      }

      // Attempt restart
      const result = await this.controller.restartService(serviceName, serviceConfig);

      // Record restart attempt
      this.lastRestartAttempt.set(serviceName, Date.now());

      if (result.success) {
        console.log(`✅ Successfully recovered ${serviceName}`);

        // Wait a bit for service to stabilize
        await this.sleep(5000);

        return true;
      } else {
        console.log(`❌ Recovery failed for ${serviceName}: ${result.error}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Recovery error for ${serviceName}:`, error);
      return false;
    } finally {
      this.recoveryInProgress.delete(serviceName);
    }
  }

  /**
   * Check if service can attempt restart (respects cooldown)
   */
  private canAttemptRestart(serviceName: string): boolean {
    const lastAttempt = this.lastRestartAttempt.get(serviceName);
    if (!lastAttempt) {
      return true; // Never attempted, can restart
    }

    const cooldownMs = this.config.monitoring.restart_cooldown_seconds * 1000;
    const timeSinceLastAttempt = Date.now() - lastAttempt;

    return timeSinceLastAttempt >= cooldownMs;
  }

  /**
   * Escalate to human when recovery fails repeatedly
   */
  private async escalateToHuman(
    serviceName: string,
    healthResult: HealthCheckResult
  ): Promise<void> {
    const state = this.registry.getState(serviceName);

    console.log('\n🚨 ========================== ESCALATION REQUIRED ==========================');
    console.log(`Service: ${serviceName}`);
    console.log(`Status: CRITICAL - Repeated failures detected`);
    console.log(`Consecutive Failures: ${state?.consecutive_failures}`);
    console.log(`Restart Attempts: ${state?.restart_count}`);
    console.log(`Last Error: ${healthResult.error}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('==========================================================================\n');

    // Send notifications if configured
    if (this.config.notifications.enabled) {
      await this.sendNotification(serviceName, state, healthResult);
    }

    // Log to escalation file
    this.logEscalation(serviceName, state, healthResult);
  }

  /**
   * Send notification through configured channels
   */
  private async sendNotification(
    serviceName: string,
    state: any,
    healthResult: HealthCheckResult
  ): Promise<void> {
    // TODO: Implement email/Slack notifications
    console.log(`📧 Notification would be sent here (not implemented yet)`);
  }

  /**
   * Log escalation to file
   */
  private logEscalation(
    serviceName: string,
    state: any,
    healthResult: HealthCheckResult
  ): void {
    const escalationLog = '/Users/benkennon/Jarvis/data/escalations.log';
    const entry = {
      timestamp: new Date().toISOString(),
      service: serviceName,
      consecutive_failures: state?.consecutive_failures,
      restart_count: state?.restart_count,
      last_error: healthResult.error,
      requires_human_intervention: true
    };

    try {
      const fs = require('fs');
      fs.appendFileSync(escalationLog, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Failed to log escalation:', error);
    }
  }

  /**
   * Reset restart counters after successful recovery period
   */
  async resetCountersIfStable(serviceName: string): Promise<void> {
    const state = this.registry.getState(serviceName);

    if (state?.status === 'running' && state.uptime) {
      const uptimeMs = Date.now() - state.uptime;
      const stableThresholdMs = this.config.monitoring.restart_cooldown_seconds * 1000 * 2;

      // If service has been stable for 2x cooldown period, reset counters
      if (uptimeMs >= stableThresholdMs && state.restart_count > 0) {
        console.log(`✅ ${serviceName} has been stable, resetting restart counter`);
        this.registry.resetRestartCount(serviceName);
      }
    }
  }

  /**
   * Perform intelligent recovery based on error type
   */
  async performIntelligentRecovery(
    serviceName: string,
    healthResult: HealthCheckResult
  ): Promise<boolean> {
    // Analyze error and determine recovery strategy
    const errorType = this.categorizeError(healthResult);

    console.log(`🔍 Error type detected: ${errorType}`);

    switch (errorType) {
      case 'port_conflict':
        console.log('💡 Attempting to kill conflicting process...');
        const config = this.config.ai_dawg.services[serviceName];
        if (config) {
          // Kill process on port first, then restart
          await this.killPortProcess(config.port);
          await this.sleep(2000);
        }
        return this.recoverService(serviceName, healthResult);

      case 'timeout':
        console.log('💡 Service timeout detected, may need more time to start...');
        await this.sleep(5000); // Give more time
        return this.recoverService(serviceName, healthResult);

      case 'dependency_failure':
        console.log('💡 Dependency failure detected, checking prerequisites...');
        // TODO: Check if Python venv exists, dependencies installed, etc.
        return this.recoverService(serviceName, healthResult);

      default:
        // Standard recovery
        return this.recoverService(serviceName, healthResult);
    }
  }

  /**
   * Categorize error type for intelligent recovery
   */
  private categorizeError(healthResult: HealthCheckResult): string {
    if (!healthResult.error) {
      return 'unknown';
    }

    const error = healthResult.error.toLowerCase();

    if (error.includes('eaddrinuse') || error.includes('port') || error.includes('address already in use')) {
      return 'port_conflict';
    }

    if (error.includes('timeout') || error.includes('etimedout')) {
      return 'timeout';
    }

    if (error.includes('econnrefused') || error.includes('connection refused')) {
      return 'connection_refused';
    }

    if (error.includes('module') || error.includes('import') || error.includes('dependency')) {
      return 'dependency_failure';
    }

    return 'unknown';
  }

  /**
   * Kill process on a specific port
   */
  private async killPortProcess(port: number): Promise<void> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if any service needs recovery
   */
  async checkAndRecoverAll(): Promise<void> {
    const services = Object.keys(this.config.ai_dawg.services);

    for (const serviceName of services) {
      const state = this.registry.getState(serviceName);

      if (state?.status === 'unhealthy') {
        console.log(`🔧 Unhealthy service detected: ${serviceName}`);

        // Create a health result from state
        const healthResult: HealthCheckResult = {
          service: serviceName,
          healthy: false,
          error: `Service marked as unhealthy (${state.consecutive_failures} consecutive failures)`,
          timestamp: new Date()
        };

        await this.performIntelligentRecovery(serviceName, healthResult);
      }

      // Reset counters if stable
      await this.resetCountersIfStable(serviceName);
    }
  }
}
