/**
 * AI DAWG Autonomous Manager
 * Main entry point for autonomous AI DAWG service management
 */

import * as fs from 'fs';
import * as path from 'path';
import { AutomonyConfig } from './types';
import { ServiceRegistry } from './service-registry';
import { ServiceController } from './service-controller';
import { HealthMonitor } from './health-monitor';
import { AutoRecovery } from './auto-recovery';

export class AIDawgManager {
  private config: AutomonyConfig;
  private registry: ServiceRegistry;
  private controller: ServiceController;
  private healthMonitor: HealthMonitor;
  private autoRecovery: AutoRecovery;
  private running: boolean = false;

  constructor(configPath: string = '/Users/benkennon/Jarvis/config/autonomy.json') {
    // Load configuration
    this.config = this.loadConfig(configPath);

    // Initialize components
    this.registry = new ServiceRegistry();
    this.controller = new ServiceController(this.registry);
    this.healthMonitor = new HealthMonitor(this.registry, this.config);
    this.autoRecovery = new AutoRecovery(this.registry, this.controller, this.config);

    // Initialize registry for all services
    for (const [serviceName, serviceConfig] of Object.entries(this.config.ai_dawg.services)) {
      if (serviceConfig.enabled !== false) {
        this.registry.initService(serviceName, serviceConfig.port);
      }
    }
  }

  /**
   * Load configuration from file
   */
  private loadConfig(configPath: string): AutomonyConfig {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error);
      throw error;
    }
  }

  /**
   * Start autonomous management
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('⚠️  Autonomous management is disabled in config');
      return;
    }

    if (this.config.safety.emergency_kill_switch) {
      console.log('🚨 Emergency kill switch is ACTIVE - autonomous management disabled');
      return;
    }

    if (this.running) {
      console.log('⚠️  Manager already running');
      return;
    }

    console.log('\n🚀 ========== AI DAWG Autonomous Manager Starting ==========');
    console.log(`Config: ${this.config.ai_dawg.root_path}`);
    console.log(`Services: ${Object.keys(this.config.ai_dawg.services).length}`);
    console.log(`Health Check Interval: ${this.config.monitoring.health_check_interval_seconds}s`);
    console.log(`Max Restart Attempts: ${this.config.monitoring.max_restart_attempts}`);
    console.log('===========================================================\n');

    this.running = true;

    // Start all enabled services
    await this.startAllServices();

    // Wait for services to initialize
    await this.sleep(5000);

    // Start health monitoring with auto-recovery callback
    this.healthMonitor.start(async (serviceName, healthResult) => {
      console.log(`⚠️  ${serviceName} is unhealthy, triggering auto-recovery...`);
      await this.autoRecovery.performIntelligentRecovery(serviceName, healthResult);
    });

    console.log('✅ Autonomous management started successfully\n');

    // Start periodic maintenance
    this.startPeriodicMaintenance();
  }

  /**
   * Stop autonomous management
   */
  async stop(): Promise<void> {
    if (!this.running) {
      console.log('⚠️  Manager not running');
      return;
    }

    console.log('\n🛑 Stopping AI DAWG Autonomous Manager...');

    this.running = false;

    // Stop health monitoring
    this.healthMonitor.stop();

    // Optionally stop all services
    if (this.config.safety.require_approval_for_destructive_ops) {
      console.log('⚠️  Services left running (destructive ops require approval)');
    } else {
      await this.stopAllServices();
    }

    console.log('✅ Autonomous management stopped\n');
  }

  /**
   * Start all enabled services
   */
  private async startAllServices(): Promise<void> {
    console.log('🚀 Starting all services...\n');

    for (const [serviceName, serviceConfig] of Object.entries(this.config.ai_dawg.services)) {
      if (serviceConfig.enabled === false) {
        console.log(`⏭️  Skipping ${serviceConfig.name} (disabled)`);
        continue;
      }

      await this.controller.startService(serviceName, serviceConfig);
      await this.sleep(2000); // Wait between starts
    }
  }

  /**
   * Stop all services
   */
  private async stopAllServices(): Promise<void> {
    console.log('🛑 Stopping all services...\n');

    for (const [serviceName, serviceConfig] of Object.entries(this.config.ai_dawg.services)) {
      if (serviceConfig.enabled === false) {
        continue;
      }

      await this.controller.stopService(serviceName, serviceConfig);
    }
  }

  /**
   * Start periodic maintenance tasks
   */
  private startPeriodicMaintenance(): void {
    // Run maintenance every 5 minutes
    setInterval(async () => {
      if (!this.running) return;

      console.log('\n🔧 Running periodic maintenance...');

      // Check and recover any unhealthy services
      await this.autoRecovery.checkAndRecoverAll();

      // Print status summary
      this.printStatusSummary();

    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Get current status
   */
  getStatus(): {
    running: boolean;
    services: any[];
    summary: any;
  } {
    return {
      running: this.running,
      services: this.registry.getAllServices(),
      summary: this.registry.getSummary()
    };
  }

  /**
   * Print status summary
   */
  printStatusSummary(): void {
    const summary = this.registry.getSummary();
    const services = this.registry.getAllServices();

    console.log('\n📊 ==================== Status Summary ====================');
    console.log(`Total Services: ${summary.total}`);
    console.log(`✅ Running: ${summary.running}`);
    console.log(`🛑 Stopped: ${summary.stopped}`);
    console.log(`⚠️  Unhealthy: ${summary.unhealthy}`);
    console.log(`❓ Unknown: ${summary.unknown}`);
    console.log('\n📋 Service Details:');

    for (const service of services) {
      const statusIcon = this.getStatusIcon(service.status);
      const uptimeStr = service.uptime
        ? `Uptime: ${this.formatUptime(Date.now() - service.uptime)}`
        : '';
      const restartInfo = service.restart_count > 0
        ? ` | Restarts: ${service.restart_count}`
        : '';

      console.log(`${statusIcon} ${service.name} (port ${service.port}): ${service.status.toUpperCase()} ${uptimeStr}${restartInfo}`);
    }

    console.log('==========================================================\n');
  }

  /**
   * Get status icon for service state
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'running': return '✅';
      case 'stopped': return '🛑';
      case 'unhealthy': return '⚠️ ';
      case 'starting': return '🔄';
      case 'stopping': return '⏹️ ';
      default: return '❓';
    }
  }

  /**
   * Format uptime duration
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manual recovery trigger
   */
  async recoverService(serviceName: string): Promise<boolean> {
    const serviceConfig = this.config.ai_dawg.services[serviceName];
    if (!serviceConfig) {
      console.error(`Service ${serviceName} not found in config`);
      return false;
    }

    const healthResult = await this.healthMonitor.checkServiceHealth(serviceName, serviceConfig);
    return this.autoRecovery.performIntelligentRecovery(serviceName, healthResult);
  }

  /**
   * Manual service restart
   */
  async restartService(serviceName: string): Promise<boolean> {
    const serviceConfig = this.config.ai_dawg.services[serviceName];
    if (!serviceConfig) {
      console.error(`Service ${serviceName} not found in config`);
      return false;
    }

    const result = await this.controller.restartService(serviceName, serviceConfig);
    return result.success;
  }
}

// Export for direct usage
export * from './types';
export { ServiceRegistry } from './service-registry';
export { ServiceController } from './service-controller';
export { HealthMonitor } from './health-monitor';
export { AutoRecovery } from './auto-recovery';
