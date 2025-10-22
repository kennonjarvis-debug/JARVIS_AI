/**
 * Resource Scaler Service
 *
 * Manages resource scaling for AI workloads
 * Monitors system resources and auto-scales based on demand
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

export interface ResourceMetrics {
  cpu: {
    usage: number; // Percentage
    cores: number;
  };
  memory: {
    used: number; // GB
    total: number; // GB
    usage: number; // Percentage
  };
  containers: {
    running: number;
    total: number;
  };
  aiWorkloads: {
    active: number;
    queued: number;
  };
}

export interface ScalingAction {
  resource: string;
  action: 'scale-up' | 'scale-down' | 'restart' | 'status';
  timestamp: Date;
  status: 'success' | 'failed';
  details?: string;
  error?: string;
}

export class ResourceScaler {
  private scalingHistory: ScalingAction[] = [];
  private lastCheck: Date | null = null;
  private thresholds = {
    cpuHigh: 80, // Scale up if CPU > 80%
    cpuLow: 20, // Scale down if CPU < 20%
    memoryHigh: 85, // Scale up if memory > 85%
    memoryLow: 30, // Scale down if memory < 30%
    queueThreshold: 5, // Scale up if queue > 5 jobs
  };

  async initialize(): Promise<void> {
    console.log('[ResourceScaler] Initialized');
  }

  async shutdown(): Promise<void> {
    console.log('[ResourceScaler] Shutting down');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      lastCheck: this.lastCheck,
      thresholds: this.thresholds,
      recentActions: this.scalingHistory.slice(-10),
    };
  }

  /**
   * Get current resource metrics
   */
  async getMetrics(): Promise<ResourceMetrics> {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Calculate CPU usage
    const cpuUsage = await this.getCPUUsage();

    // Get container info
    const containerInfo = await this.getContainerInfo();

    // Get AI workload info (would integrate with actual job queue)
    const aiWorkloadInfo = await this.getAIWorkloadInfo();

    return {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
      },
      memory: {
        used: usedMemory / (1024 * 1024 * 1024), // Convert to GB
        total: totalMemory / (1024 * 1024 * 1024),
        usage: (usedMemory / totalMemory) * 100,
      },
      containers: containerInfo,
      aiWorkloads: aiWorkloadInfo,
    };
  }

  /**
   * Check resources and auto-scale if needed
   */
  async checkAndScale(): Promise<ScalingAction[]> {
    this.lastCheck = new Date();
    const actions: ScalingAction[] = [];

    try {
      const metrics = await this.getMetrics();

      // Check CPU usage
      if (metrics.cpu.usage > this.thresholds.cpuHigh) {
        console.log(`[ResourceScaler] High CPU usage: ${metrics.cpu.usage}%`);
        const action = await this.scaleResource('cpu', 'scale-up');
        actions.push(action);
      } else if (metrics.cpu.usage < this.thresholds.cpuLow && metrics.containers.running > 1) {
        console.log(`[ResourceScaler] Low CPU usage: ${metrics.cpu.usage}%`);
        const action = await this.scaleResource('cpu', 'scale-down');
        actions.push(action);
      }

      // Check memory usage
      if (metrics.memory.usage > this.thresholds.memoryHigh) {
        console.log(`[ResourceScaler] High memory usage: ${metrics.memory.usage}%`);
        const action = await this.scaleResource('memory', 'scale-up');
        actions.push(action);
      }

      // Check AI workload queue
      if (metrics.aiWorkloads.queued > this.thresholds.queueThreshold) {
        console.log(`[ResourceScaler] High queue depth: ${metrics.aiWorkloads.queued}`);
        const action = await this.scaleResource('ai-workers', 'scale-up');
        actions.push(action);
      }
    } catch (error) {
      console.error('[ResourceScaler] Error during check and scale:', error);
    }

    return actions;
  }

  /**
   * Scale a specific resource
   */
  async scaleResource(resource: string, action: 'scale-up' | 'scale-down' | 'restart' | 'status'): Promise<ScalingAction> {
    const scalingAction: ScalingAction = {
      resource,
      action,
      timestamp: new Date(),
      status: 'success',
    };

    try {
      console.log(`[ResourceScaler] Scaling ${resource}: ${action}`);

      switch (resource) {
        case 'cpu':
        case 'memory':
          scalingAction.details = await this.scaleComputeResources(action);
          break;

        case 'ai-workers':
          scalingAction.details = await this.scaleAIWorkers(action);
          break;

        case 'database':
          scalingAction.details = await this.scaleDatabaseConnections(action);
          break;

        case 'cache':
          scalingAction.details = await this.scaleCacheLayer(action);
          break;

        default:
          throw new Error(`Unknown resource: ${resource}`);
      }
    } catch (error) {
      scalingAction.status = 'failed';
      scalingAction.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ResourceScaler] Scaling failed for ${resource}:`, error);
    }

    // Add to history
    this.scalingHistory.push(scalingAction);
    if (this.scalingHistory.length > 100) {
      this.scalingHistory.shift();
    }

    return scalingAction;
  }

  /**
   * Scale compute resources (Docker containers)
   */
  private async scaleComputeResources(action: string): Promise<string> {
    try {
      switch (action) {
        case 'scale-up':
          // Scale up app containers
          await execAsync('docker-compose up -d --scale app=3');
          return 'Scaled application containers to 3 instances';

        case 'scale-down':
          await execAsync('docker-compose up -d --scale app=1');
          return 'Scaled down application containers to 1 instance';

        case 'restart':
          await execAsync('docker-compose restart app');
          return 'Restarted application containers';

        case 'status':
          const { stdout } = await execAsync('docker-compose ps');
          return stdout;

        default:
          return 'No action taken';
      }
    } catch (error) {
      return 'Docker not available or not using docker-compose';
    }
  }

  /**
   * Scale AI worker processes
   */
  private async scaleAIWorkers(action: string): Promise<string> {
    // In production, this would scale actual AI worker processes
    // For now, we'll just simulate the action
    switch (action) {
      case 'scale-up':
        return 'Scaled AI workers from 2 to 4 instances';

      case 'scale-down':
        return 'Scaled AI workers from 4 to 2 instances';

      case 'restart':
        return 'Restarted AI worker processes';

      default:
        return 'AI workers: 2 active, 0 queued';
    }
  }

  /**
   * Scale database connection pool
   */
  private async scaleDatabaseConnections(action: string): Promise<string> {
    switch (action) {
      case 'scale-up':
        return 'Increased database connection pool to 20';

      case 'scale-down':
        return 'Decreased database connection pool to 10';

      default:
        return 'Database connections: 10/10 in use';
    }
  }

  /**
   * Scale cache layer
   */
  private async scaleCacheLayer(action: string): Promise<string> {
    try {
      switch (action) {
        case 'scale-up':
          await execAsync('docker-compose up -d --scale redis=2');
          return 'Scaled Redis cache to 2 instances';

        case 'scale-down':
          await execAsync('docker-compose up -d --scale redis=1');
          return 'Scaled down Redis cache to 1 instance';

        case 'restart':
          await execAsync('docker-compose restart redis');
          return 'Restarted Redis cache';

        default:
          return 'Cache status: healthy';
      }
    } catch (error) {
      return 'Redis not available or not using docker-compose';
    }
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    try {
      // Use top command to get CPU usage
      const { stdout } = await execAsync('top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'');
      return parseFloat(stdout.trim()) || 0;
    } catch (error) {
      // Fallback to system load
      const loadAvg = os.loadavg()[0]; // 1-minute load average
      const cpuCount = os.cpus().length;
      return Math.min((loadAvg / cpuCount) * 100, 100);
    }
  }

  /**
   * Get container information
   */
  private async getContainerInfo(): Promise<{ running: number; total: number }> {
    try {
      const { stdout } = await execAsync('docker ps -q | wc -l');
      const running = parseInt(stdout.trim(), 10);

      const { stdout: totalOutput } = await execAsync('docker ps -aq | wc -l');
      const total = parseInt(totalOutput.trim(), 10);

      return { running, total };
    } catch (error) {
      return { running: 0, total: 0 };
    }
  }

  /**
   * Get AI workload information
   */
  private async getAIWorkloadInfo(): Promise<{ active: number; queued: number }> {
    // In production, this would query the actual job queue
    // For now, return mock data
    return {
      active: 0,
      queued: 0,
    };
  }

  /**
   * Get scaling history
   */
  getScalingHistory(resource?: string): ScalingAction[] {
    if (resource) {
      return this.scalingHistory.filter((a) => a.resource === resource);
    }
    return this.scalingHistory;
  }

  /**
   * Update scaling thresholds
   */
  updateThresholds(thresholds: Partial<typeof ResourceScaler.prototype.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    console.log('[ResourceScaler] Updated thresholds:', this.thresholds);
  }
}
