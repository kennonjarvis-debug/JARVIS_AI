/**
 * DAWG AI Workflows API
 *
 * API endpoints for workflow management and execution.
 *
 * @module api/dawg-ai/workflows
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger.js';
import DawgAIWorkflowsService from '../../services/dawg-ai-workflows.service.js';

const router = Router();
const workflowsService = new DawgAIWorkflowsService();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * GET /api/dawg-ai/workflows
 * List workflows
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const filters = {
      projectId: req.query.projectId as string | undefined,
      status: req.query.status as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await workflowsService.listWorkflows(userId, filters);

    res.json({
      success: true,
      data: result.workflows,
      total: result.total,
    });
  } catch (error: any) {
    logger.error('Failed to list workflows:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/workflows/templates
 * Get workflow templates
 */
router.get('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const templates = await workflowsService.getWorkflowTemplates();

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    logger.error('Failed to get workflow templates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/workflows/:id
 * Get workflow by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workflow = await workflowsService.getWorkflow(userId, req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    logger.error('Failed to get workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/dawg-ai/workflows
 * Create workflow
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, projectId, steps, trigger } = req.body;

    if (!name || !steps || !trigger) {
      return res.status(400).json({
        success: false,
        error: 'Name, steps, and trigger are required',
      });
    }

    const workflow = await workflowsService.createWorkflow(userId, {
      name,
      description,
      projectId,
      steps,
      trigger,
    });

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    logger.error('Failed to create workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/dawg-ai/workflows/:id
 * Update workflow
 */
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updates = req.body;
    const workflow = await workflowsService.updateWorkflow(userId, req.params.id, updates);

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    logger.error('Failed to update workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/dawg-ai/workflows/:id
 * Delete workflow
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await workflowsService.deleteWorkflow(userId, req.params.id);

    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/dawg-ai/workflows/:id/execute
 * Execute workflow
 */
router.post('/:id/execute', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const context = req.body.context || {};
    const execution = await workflowsService.executeWorkflow(userId, req.params.id, context);

    res.json({
      success: true,
      data: execution,
    });
  } catch (error: any) {
    logger.error('Failed to execute workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/workflows/:id/executions
 * List workflow executions
 */
router.get('/:id/executions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const executions = await workflowsService.listWorkflowExecutions(
      userId,
      req.params.id,
      limit
    );

    res.json({
      success: true,
      data: executions,
    });
  } catch (error: any) {
    logger.error('Failed to list workflow executions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dawg-ai/workflows/executions/:executionId
 * Get workflow execution status
 */
router.get('/executions/:executionId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const execution = await workflowsService.getWorkflowExecution(
      userId,
      req.params.executionId
    );

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
      });
    }

    res.json({
      success: true,
      data: execution,
    });
  } catch (error: any) {
    logger.error('Failed to get workflow execution:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
