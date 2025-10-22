/**
 * Enhanced Orchestrator with LangGraph Integration
 *
 * Extends the basic orchestrator with intelligent multi-agent coordination
 * using LangGraph for complex workflows while maintaining backward compatibility
 * for simple single-agent tasks.
 *
 * @module core/enhanced-orchestrator
 */

import { Orchestrator, OrchestratorConfig } from './orchestrator.js';
import { LangGraphOrchestrator } from './langgraph-orchestrator.js';
import { Logger } from '../utils/logger.js';
import type { TaskRequest, TaskResult } from '../types/tasks.js';
import type { BaseAgent } from '../agents/base-agent.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EnhancedOrchestratorConfig extends OrchestratorConfig {
  useLangGraph?: boolean;
  langGraphThreshold?: 'always' | 'complex' | 'never';
}

// ============================================================================
// ENHANCED ORCHESTRATOR
// ============================================================================

/**
 * Enhanced orchestrator that combines traditional routing with LangGraph
 * for intelligent multi-agent coordination.
 */
export class EnhancedOrchestrator extends Orchestrator {
  private langGraph: LangGraphOrchestrator;
  private logger: Logger;
  private langGraphThreshold: 'always' | 'complex' | 'never';

  constructor(config: EnhancedOrchestratorConfig) {
    super(config);
    this.logger = new Logger('EnhancedOrchestrator');
    this.langGraph = new LangGraphOrchestrator(config.memory);
    this.langGraphThreshold = config.langGraphThreshold || 'complex';

    // Register agents with LangGraph
    for (const agent of config.agents) {
      const agentName = this.getAgentCategory(agent);
      this.langGraph.registerAgent(agentName, agent);
    }

    this.logger.info('Enhanced Orchestrator initialized', {
      langGraphMode: this.langGraphThreshold,
      agentCount: config.agents.length,
    });
  }

  /**
   * Override submitTask to add LangGraph routing intelligence
   */
  async submitTask(task: TaskRequest): Promise<string> {
    // Determine if this task should use LangGraph
    const shouldUseLangGraph = this.shouldUseLangGraph(task);

    if (shouldUseLangGraph) {
      this.logger.info('Using LangGraph for task', {
        taskId: task.id,
        taskType: task.type,
        reason: 'Complex multi-agent workflow detected',
      });

      // Store task in database first (for tracking)
      await this.storeTaskInDB(task);

      // Execute via LangGraph asynchronously
      this.executeLangGraphTask(task).catch((error) => {
        this.logger.error('LangGraph task execution failed', error as Error, {
          taskId: task.id,
        });
        this.emit('task:failed', task.id, error);
      });

      return task.id;
    }

    // Fall back to standard orchestrator
    this.logger.debug('Using standard orchestrator for task', {
      taskId: task.id,
      taskType: task.type,
    });

    return super.submitTask(task);
  }

  /**
   * Execute task via LangGraph
   */
  private async executeLangGraphTask(task: TaskRequest): Promise<void> {
    try {
      const result = await this.langGraph.executeTask(task, {
        orchestratorMode: 'langgraph',
        originalTask: task,
      });

      // Convert LangGraph result to TaskResult format
      const taskResult: TaskResult = {
        taskId: task.id,
        success: result.success || false,
        status: result.success ? 'completed' : 'failed',
        data: result,
        timestamp: new Date(),
        executedBy: 'langgraph-orchestrator',
        message: result.summary || 'Multi-agent workflow completed',
      };

      // Emit completion event
      this.emit('task:completed', taskResult);

      this.logger.info('LangGraph task completed', {
        taskId: task.id,
        success: taskResult.success,
      });
    } catch (error) {
      this.logger.error('LangGraph task failed', error as Error, {
        taskId: task.id,
      });
      throw error;
    }
  }

  /**
   * Determine if task should use LangGraph
   */
  private shouldUseLangGraph(task: TaskRequest): boolean {
    // Check global threshold setting
    if (this.langGraphThreshold === 'never') {
      return false;
    }

    if (this.langGraphThreshold === 'always') {
      return true;
    }

    // For 'complex' mode, analyze task characteristics
    const indicators = {
      hasWorkflow: task.metadata?.workflow !== undefined,
      requiresCollaboration: task.metadata?.requiresCollaboration === true,
      hasMultipleActions:
        Array.isArray(task.data.actions) && task.data.actions.length > 3,
      isContentCreate: task.type === 'marketing.content.create',
      isEmailCampaign: task.type === 'marketing.email.campaign',
      isMultiAgent: task.data.multiAgent === true,
    };

    // Use LangGraph if any complexity indicator is present
    const shouldUse = Object.values(indicators).some((v) => v === true);

    if (shouldUse) {
      this.logger.debug('Task complexity analysis', {
        taskId: task.id,
        indicators,
        decision: 'use_langgraph',
      });
    }

    return shouldUse;
  }

  /**
   * Get agent category from agent instance
   */
  private getAgentCategory(agent: BaseAgent): string {
    const name = agent.getName().toLowerCase();

    if (name.includes('marketing')) return 'marketing';
    if (name.includes('sales')) return 'sales';
    if (name.includes('operations')) return 'operations';
    if (name.includes('support')) return 'support';

    // Fallback: use agent ID
    return agent.getId();
  }

  /**
   * Store task in database (helper for LangGraph tasks)
   */
  private async storeTaskInDB(task: TaskRequest): Promise<void> {
    try {
      await (this as any).supabase.from('tasks').insert({
        id: task.id,
        type: task.type,
        priority: task.priority,
        data: task.data,
        requested_by: task.requestedBy,
        status: 'pending',
        created_at: task.timestamp.toISOString(),
        metadata: {
          ...task.metadata,
          orchestratorMode: 'langgraph',
        },
      });

      // Create task status in memory
      (this as any).tasks.set(task.id, {
        taskId: task.id,
        status: 'pending',
      });
    } catch (error) {
      this.logger.error('Failed to store task in database', error as Error, {
        taskId: task.id,
      });
    }
  }

  /**
   * Get LangGraph orchestrator instance (for advanced use cases)
   */
  public getLangGraph(): LangGraphOrchestrator {
    return this.langGraph;
  }

  /**
   * Configure LangGraph usage threshold
   */
  public setLangGraphThreshold(threshold: 'always' | 'complex' | 'never'): void {
    this.logger.info('LangGraph threshold updated', {
      from: this.langGraphThreshold,
      to: threshold,
    });
    this.langGraphThreshold = threshold;
  }
}
