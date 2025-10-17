/**
 * System Health Domain Agent
 *
 * Autonomous agent specializing in system monitoring,
 * health checks, and proactive issue detection.
 *
 * Capabilities:
 * - Monitor all services (Jarvis, AI DAWG, databases)
 * - Detect performance degradation
 * - Auto-restart failed services
 * - Generate health reports
 * - Predictive failure detection
 */

import { BaseDomainAgent } from './base-domain.js';
import { logger } from '../../utils/logger.js';
import { ClearanceLevel, Priority } from '../types.js';
import type {
  DomainType,
  AutonomousTask,
  TaskResult,
  DomainCapability,
  TaskStatus,
  ResourceUsage,
  Artifact,
} from '../types.js';
import axios from 'axios';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  uptime?: number;
  lastCheck: Date;
  consecutiveFailures: number;
}

export class SystemHealthDomain extends BaseDomainAgent {
  domain: DomainType = 'system-health' as DomainType;
  name = 'SystemHealthMonitor';
  description = 'Autonomous system health and reliability agent';

  constructor(clearanceLevel?: ClearanceLevel) {
    super('SystemHealthMonitor', 'system-health', clearanceLevel);
  }

  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private checkInterval: number = 60000; // 1 minute
  private alertThreshold: number = 3; // consecutive failures before alert

  capabilities: DomainCapability[] = [
    {
      name: 'monitor-services',
      description: 'Continuously monitor all system services',
      clearanceRequired: ClearanceLevel.READ_ONLY,
      resourceRequirements: {
        networkAccess: ['localhost:*'],
        maxCost: 0,
      },
      examples: [
        'Check Jarvis Control Plane health',
        'Check AI DAWG Backend status',
        'Monitor database connections',
        'Track service latencies',
      ],
    },
    {
      name: 'detect-degradation',
      description: 'Detect performance degradation before failure',
      clearanceRequired: ClearanceLevel.READ_ONLY,
      resourceRequirements: {
        maxCost: 0,
      },
      examples: [
        'Rising response times',
        'Increasing error rates',
        'Memory pressure',
        'CPU saturation',
      ],
    },
    {
      name: 'restart-services',
      description: 'Automatically restart failed services',
      clearanceRequired: ClearanceLevel.MODIFY_PRODUCTION,
      resourceRequirements: {
        networkAccess: ['localhost:*'],
        maxCost: 0,
      },
      examples: [
        'Restart crashed services',
        'Reload configurations',
        'Clear stuck processes',
      ],
    },
    {
      name: 'generate-health-report',
      description: 'Generate comprehensive system health reports',
      clearanceRequired: ClearanceLevel.READ_ONLY,
      resourceRequirements: {
        maxCost: 0,
      },
      examples: [
        'Daily health summary',
        'SLA compliance report',
        'Incident timeline',
      ],
    },
  ];

  /**
   * Analyze system health and identify issues
   */
  async analyze(): Promise<AutonomousTask[]> {
    logger.info('SystemHealthDomain: Starting analysis');

    const tasks: AutonomousTask[] = [];

    try {
      // Check all critical services
      await this.checkAllServices();

      // 1. Check for service failures
      for (const [name, health] of this.serviceHealth.entries()) {
        if (health.status === 'down' && health.consecutiveFailures >= this.alertThreshold) {
          tasks.push(this.createTask(
            'restart-services',
            `CRITICAL: ${name} is down`,
            `Service ${name} has failed ${health.consecutiveFailures} consecutive health checks. ` +
            `Automatic restart required.`,
            Priority.CRITICAL,
            ClearanceLevel.MODIFY_PRODUCTION,
            {
              service: name,
              failures: health.consecutiveFailures,
              lastCheck: health.lastCheck,
            }
          ));
        } else if (health.status === 'degraded') {
          tasks.push(this.createTask(
            'detect-degradation',
            `WARNING: ${name} performance degraded`,
            `Service ${name} is experiencing performance issues. ` +
            `Latency: ${health.latency}ms, Status: degraded`,
            Priority.HIGH,
            ClearanceLevel.READ_ONLY,
            {
              service: name,
              latency: health.latency,
            }
          ));
        }
      }

      // 2. Always generate periodic health report
      tasks.push(this.createTask(
        'generate-health-report',
        'Daily system health report',
        'Generate comprehensive health status for all services',
        Priority.LOW,
        ClearanceLevel.READ_ONLY,
        { routine: true }
      ));

      // 3. Monitor for patterns (if sufficient data)
      if (this.serviceHealth.size > 0) {
        tasks.push(this.createTask(
          'monitor-services',
          'Continuous service monitoring',
          'Monitor all services and detect early warning signs',
          Priority.MEDIUM,
          ClearanceLevel.READ_ONLY,
          { routine: true }
        ));
      }

      logger.info(`SystemHealthDomain: Analysis complete, found ${tasks.length} opportunities`);

      return tasks;

    } catch (error: any) {
      logger.error('SystemHealthDomain: Analysis failed', { error: error.message });
      return [];
    }
  }

  /**
   * Execute system health task
   */
  protected async executeTask(task: AutonomousTask): Promise<TaskResult> {
    const logs = [this.log('info', `Starting task: ${task.title}`)];
    const artifacts: Artifact[] = [];
    const startTime = Date.now();
    let resourcesUsed: ResourceUsage = {
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      filesModified: 0,
      cpuTime: 0,
      memoryPeak: 0,
    };

    try {
      switch (task.metadata.capability) {
        case 'monitor-services':
          const monitorResult = await this.monitorServices(task);
          logs.push(...monitorResult.logs);
          artifacts.push(...monitorResult.artifacts);
          resourcesUsed.apiCalls = monitorResult.resourcesUsed.apiCalls;
          break;

        case 'detect-degradation':
          const degradationResult = await this.detectDegradation(task);
          logs.push(...degradationResult.logs);
          artifacts.push(...degradationResult.artifacts);
          break;

        case 'restart-services':
          const restartResult = await this.restartServices(task);
          logs.push(...restartResult.logs);
          artifacts.push(...restartResult.artifacts);
          resourcesUsed.filesModified = restartResult.resourcesUsed.filesModified;
          break;

        case 'generate-health-report':
          const reportResult = await this.generateHealthReport(task);
          logs.push(...reportResult.logs);
          artifacts.push(...reportResult.artifacts);
          break;

        default:
          throw new Error(`Unknown capability: ${task.metadata.capability}`);
      }

      const duration = Date.now() - startTime;
      logs.push(this.log('info', `Task completed successfully in ${duration}ms`));

      return {
        success: true,
        data: { action: task.metadata.capability },
        metrics: {
          duration,
          resourcesUsed,
          impactScore: this.calculateImpact(task, artifacts),
        },
        artifacts,
        logs,
      };

    } catch (error: any) {
      logs.push(this.log('error', `Task failed: ${error.message}`));

      return {
        success: false,
        error: error.message,
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed,
          impactScore: 0,
        },
        logs,
      };
    }
  }

  /**
   * Monitor all services
   */
  private async monitorServices(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];
    const resourcesUsed = this.emptyResourceUsage();

    logs.push(this.log('info', 'Checking all services'));

    await this.checkAllServices();
    resourcesUsed.apiCalls = this.serviceHealth.size;

    // Count statuses
    const healthy = Array.from(this.serviceHealth.values()).filter(h => h.status === 'healthy').length;
    const degraded = Array.from(this.serviceHealth.values()).filter(h => h.status === 'degraded').length;
    const down = Array.from(this.serviceHealth.values()).filter(h => h.status === 'down').length;

    logs.push(this.log('info', `Health check complete: ${healthy} healthy, ${degraded} degraded, ${down} down`));

    return { logs, artifacts, resourcesUsed };
  }

  /**
   * Detect performance degradation
   */
  private async detectDegradation(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];

    const serviceName = task.metadata.service;
    const health = this.serviceHealth.get(serviceName);

    logs.push(this.log('warn', `Performance degradation detected for ${serviceName}`));

    if (health) {
      logs.push(this.log('info', `Current latency: ${health.latency}ms`));
      logs.push(this.log('info', `Status: ${health.status}`));

      artifacts.push({
        type: 'report',
        content: `# Performance Degradation Alert\n\n` +
                 `**Service:** ${serviceName}\n` +
                 `**Status:** ${health.status}\n` +
                 `**Latency:** ${health.latency}ms\n` +
                 `**Last Check:** ${health.lastCheck.toISOString()}\n\n` +
                 `**Recommended Actions:**\n` +
                 `1. Check service logs for errors\n` +
                 `2. Monitor resource usage (CPU, memory)\n` +
                 `3. Consider scaling if load is high\n`,
        metadata: { service: serviceName, latency: health.latency },
      });
    }

    return { logs, artifacts, resourcesUsed: this.emptyResourceUsage() };
  }

  /**
   * Restart failed services
   */
  private async restartServices(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];
    const resourcesUsed = this.emptyResourceUsage();

    const serviceName = task.metadata.service;

    logs.push(this.log('warn', `Attempting to restart ${serviceName}`));

    // In a real implementation, would execute restart commands
    // For now, just log the action
    logs.push(this.log('info', `Restart command would be executed here`));
    logs.push(this.log('info', `Recommended: ./launch-hybrid-services.sh restart`));

    artifacts.push({
      type: 'code',
      content: `#!/bin/bash\n\n` +
               `# Automatic service restart - Generated by SystemHealthDomain\n\n` +
               `echo "Restarting ${serviceName}..."\n` +
               `./launch-hybrid-services.sh restart\n` +
               `sleep 5\n` +
               `curl -f http://localhost:4000/health\n`,
      metadata: { service: serviceName, generated: new Date().toISOString() },
    });

    resourcesUsed.filesModified = 1;

    return { logs, artifacts, resourcesUsed };
  }

  /**
   * Generate comprehensive health report
   */
  private async generateHealthReport(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];

    logs.push(this.log('info', 'Generating health report'));

    await this.checkAllServices();

    const report = this.buildHealthReport();
    artifacts.push({
      type: 'report',
      content: report,
      metadata: { timestamp: new Date().toISOString() },
    });

    logs.push(this.log('info', 'Health report generated successfully'));

    return { logs, artifacts, resourcesUsed: this.emptyResourceUsage() };
  }

  /**
   * Check all critical services
   */
  private async checkAllServices(): Promise<void> {
    const services = [
      { name: 'Jarvis Control Plane', url: 'http://localhost:4000/health' },
      { name: 'AI DAWG Backend', url: 'http://localhost:3001/api/v1/health' },
      { name: 'Dashboard', url: 'http://localhost:3002/health' },
    ];

    for (const service of services) {
      await this.checkService(service.name, service.url);
    }
  }

  /**
   * Check individual service
   */
  private async checkService(name: string, url: string): Promise<void> {
    const startTime = Date.now();

    try {
      const response = await axios.get(url, { timeout: 5000 });
      const latency = Date.now() - startTime;

      const status = latency > 2000 ? 'degraded' : 'healthy';

      this.serviceHealth.set(name, {
        name,
        status,
        latency,
        lastCheck: new Date(),
        consecutiveFailures: 0,
      });

    } catch (error: any) {
      const existing = this.serviceHealth.get(name);
      const consecutiveFailures = (existing?.consecutiveFailures || 0) + 1;

      this.serviceHealth.set(name, {
        name,
        status: 'down',
        lastCheck: new Date(),
        consecutiveFailures,
      });

      logger.warn(`Health check failed for ${name}`, {
        error: error.message,
        consecutiveFailures,
      });
    }
  }

  /**
   * Build health report
   */
  private buildHealthReport(): string {
    let report = `# System Health Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    // Overall status
    const allHealthy = Array.from(this.serviceHealth.values()).every(h => h.status === 'healthy');
    const anyDown = Array.from(this.serviceHealth.values()).some(h => h.status === 'down');

    report += `## Overall Status: ${anyDown ? '🔴 CRITICAL' : allHealthy ? '🟢 HEALTHY' : '🟡 DEGRADED'}\n\n`;

    // Service details
    report += `## Service Status\n\n`;
    report += `| Service | Status | Latency | Last Check | Failures |\n`;
    report += `|---------|--------|---------|------------|----------|\n`;

    for (const [name, health] of this.serviceHealth.entries()) {
      const statusIcon = health.status === 'healthy' ? '🟢' :
                        health.status === 'degraded' ? '🟡' : '🔴';
      const latency = health.latency ? `${health.latency}ms` : 'N/A';
      const lastCheck = health.lastCheck.toISOString().split('T')[1].split('.')[0];

      report += `| ${name} | ${statusIcon} ${health.status} | ${latency} | ${lastCheck} | ${health.consecutiveFailures} |\n`;
    }

    report += `\n## Recommendations\n\n`;

    // Add recommendations based on status
    const degraded = Array.from(this.serviceHealth.entries())
      .filter(([, h]) => h.status === 'degraded');

    const down = Array.from(this.serviceHealth.entries())
      .filter(([, h]) => h.status === 'down');

    if (down.length > 0) {
      report += `### Critical Actions Required\n\n`;
      down.forEach(([name]) => {
        report += `- ⚠️ **${name}** is down - immediate restart required\n`;
      });
      report += `\n`;
    }

    if (degraded.length > 0) {
      report += `### Performance Concerns\n\n`;
      degraded.forEach(([name, health]) => {
        report += `- ⚡ **${name}** is experiencing high latency (${health.latency}ms) - monitor closely\n`;
      });
      report += `\n`;
    }

    if (allHealthy) {
      report += `✅ All services operating normally\n`;
    }

    return report;
  }

  /**
   * Create autonomous task
   */
  private createTask(
    capability: string,
    title: string,
    description: string,
    priority: Priority,
    clearanceRequired: ClearanceLevel,
    metadata: Record<string, any>
  ): AutonomousTask {
    return {
      id: `health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      domain: this.domain,
      title,
      description,
      priority,
      status: 'pending' as TaskStatus,
      clearanceRequired,
      estimatedDuration: 10000, // 10 seconds
      dependencies: [],
      createdAt: new Date(),
      metadata: { ...metadata, capability },
    };
  }

  /**
   * Calculate impact score
   */
  protected calculateImpact(task: AutonomousTask, artifacts: Artifact[]): number {
    let score = 0;

    // Base score from priority
    score += task.priority * 10;

    // High impact for service restarts
    if (task.metadata.capability === 'restart-services') {
      score += 50;
    }

    // Medium impact for degradation detection
    if (task.metadata.capability === 'detect-degradation') {
      score += 30;
    }

    return Math.min(100, score);
  }

  /**
   * Empty resource usage
   */
  private emptyResourceUsage(): ResourceUsage {
    return {
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      filesModified: 0,
      cpuTime: 0,
      memoryPeak: 0,
    };
  }
}

export default SystemHealthDomain;
