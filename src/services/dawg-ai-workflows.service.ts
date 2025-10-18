/**
 * DAWG AI Workflows Service
 *
 * Manages workflow automation, templates, and execution.
 *
 * @module services/dawg-ai-workflows.service
 */

import { logger } from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';
import { getDawgAIService } from './dawg-ai.service.js';

const prisma = new PrismaClient();

export interface Workflow {
  id: string;
  userId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  config: any;
  status: string;
  lastRun: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  type: string;
  action: string;
  parameters: any;
  condition?: any;
  nextStepId?: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  projectId?: string;
  steps: WorkflowStep[];
  trigger: {
    type: 'manual' | 'schedule' | 'event';
    config?: any;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  logs: any[];
}

/**
 * DAWG AI Workflows Service
 */
export class DawgAIWorkflowsService {
  private dawgAIService = getDawgAIService();

  /**
   * List workflows for user
   */
  async listWorkflows(userId: string, filters?: {
    projectId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ workflows: Workflow[]; total: number }> {
    try {
      const where: any = { userId };

      if (filters?.projectId) {
        where.projectId = filters.projectId;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      const [workflows, total] = await Promise.all([
        prisma.dawgAIWorkflow.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: filters?.offset || 0,
          take: filters?.limit || 50,
        }),
        prisma.dawgAIWorkflow.count({ where }),
      ]);

      return { workflows, total };
    } catch (error: any) {
      logger.error('Failed to list DAWG AI workflows:', error);
      throw new Error(`Failed to list workflows: ${error.message}`);
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(userId: string, workflowId: string): Promise<Workflow | null> {
    try {
      const workflow = await prisma.dawgAIWorkflow.findFirst({
        where: {
          id: workflowId,
          userId,
        },
      });

      return workflow;
    } catch (error: any) {
      logger.error('Failed to get DAWG AI workflow:', error);
      throw new Error(`Failed to get workflow: ${error.message}`);
    }
  }

  /**
   * Create workflow
   */
  async createWorkflow(userId: string, input: CreateWorkflowInput): Promise<Workflow> {
    try {
      const config = {
        steps: input.steps,
        trigger: input.trigger,
      };

      const workflow = await prisma.dawgAIWorkflow.create({
        data: {
          userId,
          projectId: input.projectId || null,
          name: input.name,
          description: input.description || null,
          config,
          status: 'active',
        },
      });

      // Register workflow with DAWG AI API
      try {
        await this.dawgAIService.makeRequest(userId, '/workflows', {
          method: 'POST',
          body: JSON.stringify({
            id: workflow.id,
            name: input.name,
            config,
          }),
        });
      } catch (apiError) {
        logger.warn('Failed to register workflow with DAWG AI API:', apiError);
        // Continue even if API registration fails
      }

      logger.info(`DAWG AI workflow created: ${workflow.id}`);
      return workflow;
    } catch (error: any) {
      logger.error('Failed to create DAWG AI workflow:', error);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    userId: string,
    workflowId: string,
    input: Partial<CreateWorkflowInput>
  ): Promise<Workflow> {
    try {
      const existing = await this.getWorkflow(userId, workflowId);
      if (!existing) {
        throw new Error('Workflow not found');
      }

      const updates: any = {};
      if (input.name) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.steps || input.trigger) {
        updates.config = {
          steps: input.steps || existing.config.steps,
          trigger: input.trigger || existing.config.trigger,
        };
      }
      updates.updatedAt = new Date();

      const workflow = await prisma.dawgAIWorkflow.update({
        where: { id: workflowId },
        data: updates,
      });

      logger.info(`DAWG AI workflow updated: ${workflowId}`);
      return workflow;
    } catch (error: any) {
      logger.error('Failed to update DAWG AI workflow:', error);
      throw new Error(`Failed to update workflow: ${error.message}`);
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(userId: string, workflowId: string): Promise<void> {
    try {
      const workflow = await this.getWorkflow(userId, workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      await prisma.dawgAIWorkflow.delete({
        where: { id: workflowId },
      });

      logger.info(`DAWG AI workflow deleted: ${workflowId}`);
    } catch (error: any) {
      logger.error('Failed to delete DAWG AI workflow:', error);
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(userId: string, workflowId: string, context?: any): Promise<WorkflowExecution> {
    try {
      const workflow = await this.getWorkflow(userId, workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (workflow.status !== 'active') {
        throw new Error('Workflow is not active');
      }

      // Create execution record
      const execution = await prisma.dawgAIWorkflowExecution.create({
        data: {
          workflowId,
          userId,
          status: 'running',
          context: context || {},
          logs: [],
        },
      });

      // Update workflow last run time
      await prisma.dawgAIWorkflow.update({
        where: { id: workflowId },
        data: { lastRun: new Date() },
      });

      // Execute workflow steps asynchronously
      this.runWorkflowSteps(execution.id, workflow, context).catch((error) => {
        logger.error('Workflow execution failed:', error);
      });

      logger.info(`DAWG AI workflow execution started: ${execution.id}`);
      return execution as any;
    } catch (error: any) {
      logger.error('Failed to execute DAWG AI workflow:', error);
      throw new Error(`Failed to execute workflow: ${error.message}`);
    }
  }

  /**
   * Run workflow steps
   */
  private async runWorkflowSteps(
    executionId: string,
    workflow: Workflow,
    context: any
  ): Promise<void> {
    const logs: any[] = [];

    try {
      const steps = workflow.config.steps as WorkflowStep[];

      for (const step of steps) {
        logs.push({
          timestamp: new Date().toISOString(),
          step: step.id,
          message: `Executing step: ${step.action}`,
        });

        // Check condition if present
        if (step.condition && !this.evaluateCondition(step.condition, context)) {
          logs.push({
            timestamp: new Date().toISOString(),
            step: step.id,
            message: 'Condition not met, skipping step',
          });
          continue;
        }

        // Execute step action
        await this.executeStepAction(step, context);

        logs.push({
          timestamp: new Date().toISOString(),
          step: step.id,
          message: 'Step completed successfully',
        });
      }

      // Mark execution as completed
      await prisma.dawgAIWorkflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          logs,
        },
      });

      logger.info(`Workflow execution completed: ${executionId}`);
    } catch (error: any) {
      logs.push({
        timestamp: new Date().toISOString(),
        message: `Execution failed: ${error.message}`,
        error: true,
      });

      await prisma.dawgAIWorkflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error.message,
          logs,
        },
      });

      logger.error(`Workflow execution failed: ${executionId}`, error);
    }
  }

  /**
   * Execute a single workflow step action
   */
  private async executeStepAction(step: WorkflowStep, context: any): Promise<void> {
    // This is where you would implement specific workflow actions
    // For now, just log the action
    logger.info(`Executing workflow action: ${step.action}`, {
      type: step.type,
      parameters: step.parameters,
    });

    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Evaluate workflow condition
   */
  private evaluateCondition(condition: any, context: any): boolean {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    try {
      const { field, operator, value } = condition;
      const fieldValue = context[field];

      switch (operator) {
        case 'equals':
          return fieldValue === value;
        case 'not_equals':
          return fieldValue !== value;
        case 'greater_than':
          return fieldValue > value;
        case 'less_than':
          return fieldValue < value;
        case 'contains':
          return String(fieldValue).includes(value);
        default:
          return true;
      }
    } catch (error) {
      logger.error('Failed to evaluate condition:', error);
      return true; // Continue execution on condition error
    }
  }

  /**
   * Get workflow execution status
   */
  async getWorkflowExecution(userId: string, executionId: string): Promise<WorkflowExecution | null> {
    try {
      const execution = await prisma.dawgAIWorkflowExecution.findFirst({
        where: {
          id: executionId,
          userId,
        },
      });

      return execution as any;
    } catch (error: any) {
      logger.error('Failed to get workflow execution:', error);
      throw new Error(`Failed to get execution: ${error.message}`);
    }
  }

  /**
   * List workflow executions
   */
  async listWorkflowExecutions(
    userId: string,
    workflowId: string,
    limit: number = 20
  ): Promise<WorkflowExecution[]> {
    try {
      const executions = await prisma.dawgAIWorkflowExecution.findMany({
        where: {
          userId,
          workflowId,
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
      });

      return executions as any;
    } catch (error: any) {
      logger.error('Failed to list workflow executions:', error);
      throw new Error(`Failed to list executions: ${error.message}`);
    }
  }

  /**
   * Get workflow templates
   */
  async getWorkflowTemplates(): Promise<any[]> {
    return [
      {
        id: 'auto-mix',
        name: 'Automatic Mixing',
        description: 'Automatically mix and master tracks',
        steps: [
          {
            id: '1',
            type: 'audio',
            action: 'normalize_levels',
            parameters: { target: -14 },
          },
          {
            id: '2',
            type: 'audio',
            action: 'apply_eq',
            parameters: { preset: 'balanced' },
          },
          {
            id: '3',
            type: 'audio',
            action: 'apply_compression',
            parameters: { ratio: 4, threshold: -20 },
          },
        ],
      },
      {
        id: 'export-stems',
        name: 'Export Stems',
        description: 'Export individual tracks as stems',
        steps: [
          {
            id: '1',
            type: 'export',
            action: 'export_stems',
            parameters: { format: 'wav', bitrate: '24bit' },
          },
        ],
      },
      {
        id: 'collab-notify',
        name: 'Collaboration Notification',
        description: 'Notify collaborators of project updates',
        steps: [
          {
            id: '1',
            type: 'notification',
            action: 'send_notification',
            parameters: { channel: 'email' },
          },
        ],
      },
    ];
  }
}

export default DawgAIWorkflowsService;
