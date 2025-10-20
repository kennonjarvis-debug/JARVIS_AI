/**
 * Domain Agent Manager - "Claude B"
 *
 * Central management system for spawning, coordinating, and monitoring
 * specialized domain agents. Each agent is an autonomous expert in a
 * specific domain (music, chat, code, system, etc.).
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { logger } from '../../../utils/logger.js';
import { BaseDomainAgent } from './base-domain.js';
import { ClearanceLevel } from '../types.js';
import type {
  DomainType,
  AutonomousTask,
  TaskResult,
  AgentStatus,
  SystemContext
} from '../types.js';

// Import domain agents
import { SystemHealthDomain } from './system-health-domain.js';
import { CodeOptimizationDomain } from './code-optimization-domain.js';
import { CostOptimizationDomain } from './cost-optimization-domain.js';
import { DataScientistDomain } from './data-scientist-domain.js';
import { MarketingStrategistDomain } from './marketing-strategist-domain.js';

export interface AgentInstance {
  id: string;
  agent: BaseDomainAgent;
  domain: DomainType;
  status: 'idle' | 'busy' | 'error' | 'paused';
  currentTask?: AutonomousTask;
  tasksCompleted: number;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface AgentManagerConfig {
  maxAgentsPerDomain: number;
  maxConcurrentTasks: number;
  autoSpawnAgents: boolean;
  defaultClearance: ClearanceLevel;
  heartbeatInterval: number; // milliseconds
}

export class AgentManager extends EventEmitter {
  private static instance: AgentManager;
  private agents: Map<string, AgentInstance> = new Map();
  private taskQueue: AutonomousTask[] = [];
  private config: AgentManagerConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  private constructor() {
    super();

    this.config = {
      maxAgentsPerDomain: 3,
      maxConcurrentTasks: 10,
      autoSpawnAgents: true,
      defaultClearance: ClearanceLevel.SUGGEST,
      heartbeatInterval: 30000 // 30 seconds
    };

    this.initialize();
  }

  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  /**
   * Initialize agent manager
   */
  private initialize(): void {
    // Spawn initial agents
    if (this.config.autoSpawnAgents) {
      this.spawnAgent('system-health' as DomainType);
      this.spawnAgent('code-optimization' as DomainType);
      this.spawnAgent('cost-optimization' as DomainType);
    }

    // Start heartbeat monitoring
    this.startHeartbeat();

    logger.info('🤖 Agent Manager (Claude B) initialized');
    this.emit('initialized');
  }

  /**
   * Spawn a new domain agent
   */
  public spawnAgent(domain: DomainType, clearance?: ClearanceLevel): string | null {
    try {
      // Check domain limits
      const existingAgents = this.getAgentsByDomain(domain);
      if (existingAgents.length >= this.config.maxAgentsPerDomain) {
        logger.warn(`Cannot spawn agent: max agents for domain ${domain} reached`);
        return null;
      }

      // Create agent based on domain
      const agent = this.createDomainAgent(domain, clearance || this.config.defaultClearance);
      if (!agent) {
        logger.error(`Failed to create agent for domain: ${domain}`);
        return null;
      }

      // Register agent
      const agentId = randomUUID();
      const instance: AgentInstance = {
        id: agentId,
        agent,
        domain,
        status: 'idle',
        tasksCompleted: 0,
        createdAt: new Date(),
        lastActiveAt: new Date()
      };

      this.agents.set(agentId, instance);

      // Set up agent event listeners
      this.setupAgentListeners(agentId, agent);

      logger.info(`✨ Spawned ${agent.name} agent (${agentId.slice(0, 8)})`);
      this.emit('agent-spawned', { agentId, domain, agent: agent.name });

      return agentId;
    } catch (error) {
      logger.error('Failed to spawn agent:', error);
      return null;
    }
  }

  /**
   * Create domain-specific agent
   */
  private createDomainAgent(domain: DomainType, clearance: ClearanceLevel): BaseDomainAgent | null {
    switch (domain) {
      case 'system-health':
        return new SystemHealthDomain(clearance);

      case 'code-optimization':
        return new CodeOptimizationDomain(clearance);

      case 'cost-optimization':
        return new CostOptimizationDomain(clearance);

      case 'data-science':
        return new DataScientistDomain(clearance);

      case 'marketing':
        return new MarketingStrategistDomain(clearance);

      // Add more domain agents here as they're implemented
      // case 'music_production':
      //   return new MusicProductionDomain(clearance);

      // case 'chat':
      //   return new ChatDomain(clearance);

      default:
        logger.warn(`No agent implementation for domain: ${domain}`);
        return null;
    }
  }

  /**
   * Assign task to appropriate agent
   */
  public async assignTask(task: AutonomousTask): Promise<TaskResult> {
    try {
      // Find available agent for domain
      const agent = this.findAvailableAgent(task.domain);

      if (!agent) {
        // Try to spawn new agent if auto-spawn is enabled
        if (this.config.autoSpawnAgents) {
          const agentId = this.spawnAgent(task.domain);
          if (agentId) {
            const newAgent = this.agents.get(agentId);
            if (newAgent) {
              return await this.executeTask(newAgent, task);
            }
          }
        }

        // Queue task if no agent available
        this.taskQueue.push(task);
        logger.info(`Task queued: ${task.id} (no available agent)`);

        return {
          taskId: task.id,
          success: false,
          message: 'Task queued - no available agent',
          output: null,
          metrics: {
            duration: 0,
            resourcesUsed: {
              apiCalls: 0,
              tokensUsed: 0,
              costIncurred: 0,
              filesModified: 0,
              cpuTime: 0,
              memoryPeak: 0
            },
            impactScore: 0
          },
          logs: [{
            timestamp: new Date(),
            level: 'info',
            message: 'Task queued - no available agent'
          }],
          timestamp: new Date()
        };
      }

      return await this.executeTask(agent, task);
    } catch (error: any) {
      logger.error('Failed to assign task:', error);
      return {
        taskId: task.id,
        success: false,
        message: `Task assignment failed: ${error.message}`,
        output: null,
        metrics: {
          duration: 0,
          resourcesUsed: {
            apiCalls: 0,
            tokensUsed: 0,
            costIncurred: 0,
            filesModified: 0,
            cpuTime: 0,
            memoryPeak: 0
          },
          impactScore: 0
        },
        logs: [{
          timestamp: new Date(),
          level: 'error',
          message: `Task assignment failed: ${error.message}`
        }],
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute task on agent
   */
  private async executeTask(agentInstance: AgentInstance, task: AutonomousTask): Promise<TaskResult> {
    agentInstance.status = 'busy';
    agentInstance.currentTask = task;
    agentInstance.lastActiveAt = new Date();

    this.emit('task-started', {
      agentId: agentInstance.id,
      taskId: task.id,
      domain: task.domain
    });

    try {
      const result = await agentInstance.agent.execute(task);

      agentInstance.status = 'idle';
      agentInstance.currentTask = undefined;
      agentInstance.tasksCompleted++;
      agentInstance.lastActiveAt = new Date();

      this.emit('task-completed', {
        agentId: agentInstance.id,
        taskId: task.id,
        success: result.success
      });

      // Process next queued task if available
      this.processQueue();

      return result;
    } catch (error: any) {
      agentInstance.status = 'error';
      agentInstance.currentTask = undefined;

      logger.error(`Agent ${agentInstance.id} task failed:`, error);

      this.emit('task-failed', {
        agentId: agentInstance.id,
        taskId: task.id,
        error: error.message
      });

      return {
        taskId: task.id,
        success: false,
        message: `Task execution failed: ${error.message}`,
        output: null,
        metrics: {
          duration: 0,
          resourcesUsed: {
            apiCalls: 0,
            tokensUsed: 0,
            costIncurred: 0,
            filesModified: 0,
            cpuTime: 0,
            memoryPeak: 0
          },
          impactScore: 0
        },
        logs: [{
          timestamp: new Date(),
          level: 'error',
          message: `Task execution failed: ${error.message}`
        }],
        timestamp: new Date()
      };
    }
  }

  /**
   * Find available agent for domain
   */
  private findAvailableAgent(domain: DomainType): AgentInstance | null {
    const domainAgents = this.getAgentsByDomain(domain);
    return domainAgents.find(a => a.status === 'idle') || null;
  }

  /**
   * Get all agents for a domain
   */
  private getAgentsByDomain(domain: DomainType): AgentInstance[] {
    return Array.from(this.agents.values()).filter(a => a.domain === domain);
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    // Get idle agents
    const idleAgents = Array.from(this.agents.values()).filter(a => a.status === 'idle');

    while (this.taskQueue.length > 0 && idleAgents.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) break;

      const agent = idleAgents.find(a => a.domain === task.domain);
      if (agent) {
        this.executeTask(agent, task);
        idleAgents.splice(idleAgents.indexOf(agent), 1);
      } else {
        // Re-queue if no matching agent
        this.taskQueue.unshift(task);
        break;
      }
    }
  }

  /**
   * Set up agent event listeners
   */
  private setupAgentListeners(agentId: string, agent: BaseDomainAgent): void {
    agent.on('task-completed', (data) => {
      this.emit('agent-task-completed', { agentId, ...data });
    });

    agent.on('task-failed', (data) => {
      this.emit('agent-task-failed', { agentId, ...data });
    });

    agent.on('learning-feedback', (data) => {
      this.emit('agent-learned', { agentId, ...data });
    });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkAgentHealth();
    }, this.config.heartbeatInterval);
  }

  /**
   * Check health of all agents
   */
  private checkAgentHealth(): void {
    const now = Date.now();

    for (const [agentId, instance] of this.agents) {
      const timeSinceActive = now - instance.lastActiveAt.getTime();

      // Check for stuck agents (busy for more than 5 minutes)
      if (instance.status === 'busy' && timeSinceActive > 300000) {
        logger.warn(`Agent ${agentId} appears stuck, resetting to idle`);
        instance.status = 'idle';
        instance.currentTask = undefined;
        this.emit('agent-reset', { agentId });
      }
    }
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  public getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent statistics
   */
  public getStats(): {
    totalAgents: number;
    byDomain: Record<string, number>;
    byStatus: Record<string, number>;
    queuedTasks: number;
    totalTasksCompleted: number;
  } {
    const byDomain: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalTasksCompleted = 0;

    for (const instance of this.agents.values()) {
      byDomain[instance.domain] = (byDomain[instance.domain] || 0) + 1;
      byStatus[instance.status] = (byStatus[instance.status] || 0) + 1;
      totalTasksCompleted += instance.tasksCompleted;
    }

    return {
      totalAgents: this.agents.size,
      byDomain,
      byStatus,
      queuedTasks: this.taskQueue.length,
      totalTasksCompleted
    };
  }

  /**
   * Pause agent
   */
  public pauseAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    if (agent.status === 'busy') {
      logger.warn(`Cannot pause agent ${agentId}: currently busy`);
      return false;
    }

    agent.status = 'paused';
    logger.info(`Agent ${agentId} paused`);
    this.emit('agent-paused', { agentId });
    return true;
  }

  /**
   * Resume agent
   */
  public resumeAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    if (agent.status !== 'paused') {
      logger.warn(`Cannot resume agent ${agentId}: not paused`);
      return false;
    }

    agent.status = 'idle';
    logger.info(`Agent ${agentId} resumed`);
    this.emit('agent-resumed', { agentId });

    // Process queue in case there are pending tasks
    this.processQueue();

    return true;
  }

  /**
   * Terminate agent
   */
  public terminateAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    if (agent.status === 'busy' && agent.currentTask) {
      logger.warn(`Terminating busy agent ${agentId}, task ${agent.currentTask.id} will fail`);
    }

    this.agents.delete(agentId);
    logger.info(`Agent ${agentId} terminated`);
    this.emit('agent-terminated', { agentId });

    return true;
  }

  /**
   * Shutdown agent manager
   */
  public async shutdown(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // Wait for busy agents to complete
    const busyAgents = Array.from(this.agents.values()).filter(a => a.status === 'busy');
    if (busyAgents.length > 0) {
      logger.info(`Waiting for ${busyAgents.length} busy agents to complete...`);

      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const stillBusy = Array.from(this.agents.values()).filter(a => a.status === 'busy');
          if (stillBusy.length === 0) {
            clearInterval(checkInterval);
            resolve(null);
          }
        }, 1000);

        // Force shutdown after 30 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(null);
        }, 30000);
      });
    }

    this.agents.clear();
    this.taskQueue = [];

    logger.info('🛑 Agent Manager shutdown complete');
  }
}

// Export singleton
export const agentManager = AgentManager.getInstance();
