/**
 * Cost Monitoring API
 *
 * Express routes for monitoring AI costs and usage
 * Used by dashboard and alerts
 */

import { Router, Request, Response } from 'express';
import { smartAIRouter } from './smart-ai-router.js';
import { logger } from '../utils/logger.js';

export const costMonitoringRouter = Router();

/**
 * GET /api/v1/costs/current
 * Get current usage and cost stats
 */
costMonitoringRouter.get('/current', async (req: Request, res: Response) => {
  try {
    const stats = smartAIRouter.getUsageStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get current cost stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/costs/projection
 * Get monthly cost projection
 */
costMonitoringRouter.get('/projection', async (req: Request, res: Response) => {
  try {
    const projection = await smartAIRouter.getMonthlyProjection();

    res.json({
      success: true,
      data: projection,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get cost projection:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/costs/alerts
 * Get cost alerts if any
 */
costMonitoringRouter.get('/alerts', async (req: Request, res: Response) => {
  try {
    const monthlyBudget = parseInt(process.env.AI_ROUTER_MONTHLY_BUDGET || '50', 10);
    const projection = await smartAIRouter.getMonthlyProjection();

    const alerts: string[] = [];
    let status: 'ok' | 'warning' | 'critical' = 'ok';

    const percentageOfBudget = (projection.estimatedMonthlyCost / monthlyBudget) * 100;

    if (percentageOfBudget >= 100) {
      status = 'critical';
      alerts.push(
        `CRITICAL: Projected monthly cost ($${projection.estimatedMonthlyCost.toFixed(2)}) exceeds budget ($${monthlyBudget})`
      );
    } else if (percentageOfBudget >= 80) {
      status = 'warning';
      alerts.push(
        `WARNING: Projected monthly cost ($${projection.estimatedMonthlyCost.toFixed(2)}) is at ${percentageOfBudget.toFixed(1)}% of budget`
      );
    }

    res.json({
      success: true,
      data: {
        status,
        alerts,
        budget: monthlyBudget,
        projected: projection.estimatedMonthlyCost,
        percentageUsed: percentageOfBudget,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get cost alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/costs/summary
 * Get comprehensive cost summary
 */
costMonitoringRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const stats = smartAIRouter.getUsageStats();
    const projection = await smartAIRouter.getMonthlyProjection();

    const monthlyBudget = parseInt(process.env.AI_ROUTER_MONTHLY_BUDGET || '50', 10);
    const percentageOfBudget = (projection.estimatedMonthlyCost / monthlyBudget) * 100;

    res.json({
      success: true,
      data: {
        current: stats,
        projection: {
          ...projection,
          budget: monthlyBudget,
          percentageOfBudget,
          savingsVsFullCloud: 165, // ~$165/month vs full cloud
        },
        hybridSetup: {
          strategy: 'Enhanced Hybrid',
          targetMonthlyCost: '35-50',
          actualProjectedCost: projection.estimatedMonthlyCost.toFixed(2),
          onTarget: projection.estimatedMonthlyCost <= 50,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to get cost summary:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/costs/update-strategy
 * Update routing strategy
 */
costMonitoringRouter.post('/update-strategy', async (req: Request, res: Response) => {
  try {
    const { geminiPercentage, gptMiniPercentage, claudePercentage } = req.body;

    // Validate percentages
    const total = (geminiPercentage || 0) + (gptMiniPercentage || 0) + (claudePercentage || 0);

    if (Math.abs(total - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Percentages must sum to 100',
        received: { geminiPercentage, gptMiniPercentage, claudePercentage, total },
      });
    }

    smartAIRouter.updateStrategy({
      geminiPercentage,
      gptMiniPercentage,
      claudePercentage,
    });

    res.json({
      success: true,
      message: 'Routing strategy updated',
      data: smartAIRouter.getUsageStats(),
    });
  } catch (error: any) {
    logger.error('Failed to update routing strategy:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default costMonitoringRouter;
