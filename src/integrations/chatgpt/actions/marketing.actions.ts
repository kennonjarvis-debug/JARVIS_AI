import { Router, Request, Response } from 'express';
import { moduleRouter } from '../../../core/module-router.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

/**
 * Get marketing performance metrics
 * POST /actions/marketing/metrics
 */
router.post('/metrics', async (req: Request, res: Response) => {
  try {
    const {
      timeRange = 'month',
      startDate,
      endDate,
      campaigns,
    } = req.body;

    const validRanges = ['today', 'week', 'month', 'quarter', 'year', 'custom'];
    if (!validRanges.includes(timeRange)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Invalid time range. Use one of: ${validRanges.join(', ')}`,
      });
    }

    // Call AI Dawg marketing module
    const result = await moduleRouter.execute({
      module: 'marketing',
      action: 'get-metrics',
      params: { timeRange, startDate, endDate, campaigns },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'MetricsError',
        message: result.error || 'Failed to retrieve marketing metrics.',
      });
    }

    res.json({
      success: true,
      data: {
        impressions: result.data.impressions || 0,
        clicks: result.data.clicks || 0,
        conversions: result.data.conversions || 0,
        ctr: result.data.ctr || 0,
        roi: result.data.roi || 0,
        costPerAcquisition: result.data.costPerAcquisition || 0,
        revenue: result.data.revenue || 0,
        spend: result.data.spend || 0,
      },
    });
  } catch (error: any) {
    logger.error('Marketing metrics error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to retrieve metrics. Please try again.',
    });
  }
});

/**
 * Create or manage marketing campaigns
 * POST /actions/marketing/campaigns
 */
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const {
      action,
      campaignId,
      name,
      budget,
      targetAudience,
      schedule,
    } = req.body;

    const validActions = ['create', 'update', 'get', 'list'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Action is required. Use one of: ${validActions.join(', ')}`,
      });
    }

    if (['update', 'get'].includes(action) && !campaignId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Campaign ID is required for ${action} action.`,
      });
    }

    // Call AI Dawg marketing module
    const result = await moduleRouter.execute({
      module: 'marketing',
      action: `campaign-${action}`,
      params: { campaignId, name, budget, targetAudience, schedule },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'CampaignError',
        message: result.error || `Failed to ${action} campaign.`,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    logger.error('Campaign management error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to manage campaign. Please try again.',
    });
  }
});

/**
 * Analyze growth trends and opportunities
 * POST /actions/marketing/growth-analysis
 */
router.post('/growth-analysis', async (req: Request, res: Response) => {
  try {
    const {
      includeCompetitors = true,
      forecastMonths = 3,
    } = req.body;

    if (forecastMonths < 1 || forecastMonths > 12) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Forecast months must be between 1 and 12.',
      });
    }

    // Call AI Dawg marketing module
    const result = await moduleRouter.execute({
      module: 'marketing',
      action: 'growth-analysis',
      params: { includeCompetitors, forecastMonths },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'AnalysisError',
        message: result.error || 'Failed to analyze growth trends.',
      });
    }

    res.json({
      success: true,
      data: {
        currentGrowthRate: result.data.currentGrowthRate || 0,
        projectedGrowth: result.data.projectedGrowth || [],
        opportunities: result.data.opportunities || [],
        recommendations: result.data.recommendations || [],
        competitorInsights: includeCompetitors ? result.data.competitorInsights : undefined,
      },
    });
  } catch (error: any) {
    logger.error('Growth analysis error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to analyze growth. Please try again.',
    });
  }
});

export default router;
