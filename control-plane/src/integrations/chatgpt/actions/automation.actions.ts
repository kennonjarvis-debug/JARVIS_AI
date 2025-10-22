import { Router, Request, Response } from 'express';
import { moduleRouter } from '../../../core/module-router.js';
import { jobManager } from '../job-manager.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

/**
 * Create and manage automation workflows
 * POST /actions/automation/workflows
 */
router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const { action, workflowId, workflow } = req.body;

    const validActions = ['create', 'update', 'delete', 'get', 'list', 'execute'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Action is required. Use one of: ${validActions.join(', ')}`,
      });
    }

    if (['update', 'delete', 'get', 'execute'].includes(action) && !workflowId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Workflow ID is required for ${action} action.`,
      });
    }

    if (['create', 'update'].includes(action) && !workflow) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Workflow definition is required for create/update actions.',
      });
    }

    // Call AI Dawg automation module
    const result = await moduleRouter.execute({
      module: 'automation',
      action: `workflow-${action}`,
      params: { workflowId, workflow },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'WorkflowError',
        message: result.error || `Failed to ${action} workflow.`,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    logger.error('Workflow management error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to manage workflow. Please try again.',
    });
  }
});

/**
 * Generate predictive forecasts
 * POST /actions/automation/forecasts
 */
router.post('/forecasts', async (req: Request, res: Response) => {
  try {
    const {
      metric,
      horizon = 30,
      includeScenarios = true,
      historicalData = [],
    } = req.body;

    if (!metric || typeof metric !== 'string') {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Metric to forecast is required (e.g., "revenue", "users", "load").',
      });
    }

    if (horizon < 1 || horizon > 365) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Forecast horizon must be between 1 and 365 days.',
      });
    }

    // Create async job for forecasting
    const jobId = await jobManager.executeJob(
      'forecasting',
      async (job) => {
        jobManager.updateProgress(job.id, 20, 10);

        // Call AI Dawg automation module
        const result = await moduleRouter.execute({
          module: 'automation',
          action: 'forecast',
          params: { metric, horizon, includeScenarios, historicalData },
        });

        jobManager.updateProgress(job.id, 90, 2);

        if (!result.success) {
          throw new Error(result.error || 'Forecasting failed');
        }

        return result.data;
      },
      { metric, horizon }
    );

    res.json({
      success: true,
      jobId,
      estimatedTime: 15,
      message: 'Forecast generation started. Check job status for results.',
    });
  } catch (error: any) {
    logger.error('Forecasting error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to generate forecast. Please try again.',
    });
  }
});

/**
 * Auto-scale resources intelligently
 * POST /actions/automation/scaling
 */
router.post('/scaling', async (req: Request, res: Response) => {
  try {
    const {
      action,
      resource,
      targetMetric,
      constraints,
    } = req.body;

    const validActions = ['get-status', 'scale-up', 'scale-down', 'auto-optimize'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Action is required. Use one of: ${validActions.join(', ')}`,
      });
    }

    // Call AI Dawg automation module
    const result = await moduleRouter.execute({
      module: 'automation',
      action: `scaling-${action}`,
      params: { resource, targetMetric, constraints },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'ScalingError',
        message: result.error || 'Failed to manage resource scaling.',
      });
    }

    res.json({
      success: true,
      data: {
        action: action,
        resource: resource || 'all',
        currentStatus: result.data.currentStatus || {},
        recommendations: result.data.recommendations || [],
        estimatedSavings: result.data.estimatedSavings || null,
        appliedChanges: result.data.appliedChanges || [],
      },
    });
  } catch (error: any) {
    logger.error('Scaling management error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to manage scaling. Please try again.',
    });
  }
});

export default router;
